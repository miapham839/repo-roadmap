import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db/tidb";
import { GeminiClient, createProfileText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { repoId } = body;

    if (!repoId) {
      return NextResponse.json({ error: "Missing repo ID" }, { status: 400 });
    }

    const userId = session.user.email;

    // Get user profile
    const profiles = await query<any[]>(
      `SELECT * FROM user_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (profiles.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = profiles[0];
    const profileText = createProfileText({
      skill_level: profile.skill_level,
      track: profile.track,
      preferences: typeof profile.preferences === 'string'
        ? JSON.parse(profile.preferences)
        : profile.preferences,
    });

    // Get repository data
    const repos = await query<any[]>("SELECT * FROM repos WHERE id = ?", [repoId]);
    if (repos.length === 0) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const repo = repos[0];

    // Get README
    const readmes = await query<any[]>(
      `SELECT content FROM code_units WHERE repo_id = ? AND kind = 'readme' LIMIT 1`,
      [repoId]
    );
    const readmeText = readmes.length > 0 ? readmes[0].content : "";

    // Get profile embedding for similarity search
    const profileEmbeddings = await query<any[]>(
      `SELECT vector FROM embeddings WHERE entity_type = 'profile' AND entity_id = ?`,
      [profile.id]
    );

    let rankedIssues: any[] = [];

    if (profileEmbeddings.length > 0) {
      const profileVector = JSON.parse(profileEmbeddings[0].vector);

      // Vector similarity search for issues
      // Note: This is a simplified version. TiDB's VEC_COSINE_DISTANCE function would be more efficient
      const issueEmbeddings = await query<any[]>(
        `SELECT e.entity_id, e.vector, e.snippet, i.title, i.body, i.labels, i.html_url
         FROM embeddings e
         JOIN issues i ON i.id = e.entity_id
         WHERE e.entity_type = 'issue' AND i.repo_id = ? AND i.state = 'open'
         LIMIT 50`,
        [repoId]
      );

      // Calculate cosine similarity in application (for demo purposes)
      const scored = issueEmbeddings.map((item) => {
        const issueVector = JSON.parse(item.vector);
        const similarity = cosineSimilarity(profileVector, issueVector);

        // Boost based on labels and track
        let boost = 0;
        const labels = typeof item.labels === 'string'
          ? JSON.parse(item.labels || "[]")
          : (item.labels || []);
        const labelNames = labels.map((l: any) => l.name.toLowerCase());

        if (labelNames.includes("good first issue") || labelNames.includes("help wanted")) {
          boost += 0.15;
        }

        if (profile.skill_level === "beginner" && labelNames.includes("good first issue")) {
          boost += 0.1;
        }

        if (profile.track === "frontend" && labelNames.some((l: string) => ["ui", "css", "react", "component"].includes(l))) {
          boost += 0.1;
        }

        if (profile.track === "backend" && labelNames.some((l: string) => ["api", "database", "server"].includes(l))) {
          boost += 0.1;
        }

        return {
          ...item,
          score: similarity + boost,
        };
      });

      rankedIssues = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    } else {
      // Fallback: just get some open issues
      rankedIssues = await query<any[]>(
        `SELECT title, body, labels, html_url FROM issues WHERE repo_id = ? AND state = 'open' LIMIT 5`,
        [repoId]
      );
    }

    // Generate repository summary
    const gemini = new GeminiClient();
    const treeSummary = `Main language: ${repo.language || "Unknown"}`;
    const repoSummary = await gemini.summarizeRepo(readmeText, treeSummary);

    // Generate roadmap
    const roadmapSteps = await gemini.makeRoadmap(
      profileText,
      repoSummary,
      rankedIssues.map((issue) => ({
        title: issue.title,
        body: issue.body || "",
        labels: (typeof issue.labels === 'string'
          ? JSON.parse(issue.labels || "[]")
          : (issue.labels || [])).map((l: any) => l.name),
        html_url: issue.html_url,
      }))
    );

    // Save roadmap
    const roadmapResult = await query<any>(
      `INSERT INTO roadmaps (user_id, repo_id, summary) VALUES (?, ?, ?)`,
      [userId, repoId, repoSummary]
    );

    const roadmapId = roadmapResult.insertId;

    // Save roadmap steps
    for (const step of roadmapSteps) {
      // Find linked issue if URL is provided
      let linkedIssueId = null;
      if (step.linked_issue_url) {
        const linkedIssues = await query<any[]>(
          `SELECT id FROM issues WHERE html_url = ?`,
          [step.linked_issue_url]
        );
        if (linkedIssues.length > 0) {
          linkedIssueId = linkedIssues[0].id;
        }
      }

      await query(
        `INSERT INTO roadmap_steps (roadmap_id, step_no, title, details, linked_issue_id, est_minutes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [roadmapId, step.step_no, step.title, step.details, linkedIssueId, step.est_minutes || 60]
      );
    }

    return NextResponse.json({
      success: true,
      roadmapId,
      summary: repoSummary,
      steps: roadmapSteps,
    });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
