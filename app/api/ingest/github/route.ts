import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db/tidb";
import { GitHubClient, parseGitHubUrl, getImportantPaths } from "@/lib/github";
import { GeminiClient } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repo URL" }, { status: 400 });
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const { owner, name } = parsed;

    const github = new GitHubClient();
    const gemini = new GeminiClient();

    // Fetch repository data
    const repo = await github.getRepo(owner, name);
    const readme = await github.getReadme(owner, name);
    const issues = await github.getIssues(owner, name, "open");
    const tree = await github.getTree(owner, name, repo.default_branch);

    // Check if repo already exists
    const existingRepos = await query<any[]>(
      "SELECT id FROM repos WHERE owner = ? AND name = ?",
      [owner, name]
    );

    let repoId: number;

    if (existingRepos.length > 0) {
      repoId = existingRepos[0].id;

      // Update existing repo
      await query(
        `UPDATE repos
         SET description = ?, url = ?, stars = ?, topics = ?,
             default_branch = ?, language = ?, last_synced_at = NOW()
         WHERE id = ?`,
        [
          repo.description,
          repo.html_url,
          repo.stargazers_count,
          JSON.stringify(repo.topics),
          repo.default_branch,
          repo.language,
          repoId,
        ]
      );

      // Delete old issues and code units (we'll re-ingest)
      await query("DELETE FROM issues WHERE repo_id = ?", [repoId]);
      await query("DELETE FROM code_units WHERE repo_id = ?", [repoId]);
    } else {
      // Insert new repo
      const result = await query<any>(
        `INSERT INTO repos (owner, name, full_name, description, url, stars, topics, default_branch, language, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          owner,
          name,
          repo.full_name,
          repo.description,
          repo.html_url,
          repo.stargazers_count,
          JSON.stringify(repo.topics),
          repo.default_branch,
          repo.language,
        ]
      );
      repoId = result.insertId;
    }

    // Insert README as code unit
    if (readme) {
      const readmeResult = await query<any>(
        `INSERT INTO code_units (repo_id, path, kind, content)
         VALUES (?, 'README.md', 'readme', ?)`,
        [repoId, readme]
      );

      // Create embedding for README
      const readmeEmbedding = await gemini.createEmbedding(readme.slice(0, 8000));
      await query(
        `INSERT INTO embeddings (entity_type, entity_id, vector, snippet)
         VALUES ('code_unit', ?, ?, ?)`,
        [readmeResult.insertId, JSON.stringify(readmeEmbedding), readme.slice(0, 500)]
      );
    }

    // Insert issues and create embeddings
    const issueBatch: Array<{ title: string; body: string; issueId: number }> = [];

    for (const issue of issues.slice(0, 100)) {
      // Limit to 100 issues
      const issueResult = await query<any>(
        `INSERT INTO issues (repo_id, gh_issue_id, number, title, body, labels, state, html_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          repoId,
          issue.id,
          issue.number,
          issue.title,
          issue.body,
          JSON.stringify(issue.labels),
          issue.state,
          issue.html_url,
        ]
      );

      issueBatch.push({
        title: issue.title,
        body: issue.body || "",
        issueId: issueResult.insertId,
      });
    }

    // Create embeddings for issues in batches
    const batchSize = 20;
    for (let i = 0; i < issueBatch.length; i += batchSize) {
      const batch = issueBatch.slice(i, i + batchSize);
      const texts = batch.map((item) => `${item.title}\n${item.body}`.slice(0, 8000));

      const embeddings = await gemini.createEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        await query(
          `INSERT INTO embeddings (entity_type, entity_id, vector, snippet)
           VALUES ('issue', ?, ?, ?)`,
          [item.issueId, JSON.stringify(embedding), `${item.title}\n${item.body}`.slice(0, 500)]
        );
      }
    }

    // Fetch and store important documentation files
    const importantPaths = getImportantPaths(tree);
    for (const path of importantPaths.slice(0, 5)) {
      // Limit to 5 docs
      const content = await github.getFileContent(owner, name, path);
      if (content) {
        await query(
          `INSERT INTO code_units (repo_id, path, kind, content)
           VALUES (?, ?, 'doc', ?)`,
          [repoId, path, content.slice(0, 10000)]
        );
      }
    }

    return NextResponse.json({
      success: true,
      repoId,
      stats: {
        issues: issueBatch.length,
        docs: importantPaths.length,
      },
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ingest repository" },
      { status: 500 }
    );
  }
}
