// GitHub API integration

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  topics: string[];
  default_branch: string;
  language: string | null;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  labels: Array<{
    name: string;
    color: string;
    description: string | null;
  }>;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
}

interface GitHubTree {
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
  }>;
  truncated: boolean;
}

interface GitHubContent {
  name: string;
  path: string;
  content?: string;
  encoding?: string;
  type: "file" | "dir";
}

export class GitHubClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || "";
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRepo(owner: string, name: string): Promise<GitHubRepo> {
    return this.fetch<GitHubRepo>(`/repos/${owner}/${name}`);
  }

  async getIssues(owner: string, name: string, state: "open" | "closed" | "all" = "open"): Promise<GitHubIssue[]> {
    // Fetch first 100 issues (paginate if needed)
    return this.fetch<GitHubIssue[]>(`/repos/${owner}/${name}/issues?state=${state}&per_page=100`);
  }

  async getReadme(owner: string, name: string): Promise<string> {
    try {
      const data = await this.fetch<GitHubContent>(`/repos/${owner}/${name}/readme`);
      if (data.content && data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return "";
    } catch (error) {
      console.warn("README not found:", error);
      return "";
    }
  }

  async getTree(owner: string, name: string, branch = "main"): Promise<GitHubTree> {
    try {
      return await this.fetch<GitHubTree>(`/repos/${owner}/${name}/git/trees/${branch}?recursive=1`);
    } catch (error) {
      // Try 'master' if 'main' fails
      return await this.fetch<GitHubTree>(`/repos/${owner}/${name}/git/trees/master?recursive=1`);
    }
  }

  async getFileContent(owner: string, name: string, path: string): Promise<string> {
    try {
      const data = await this.fetch<GitHubContent>(`/repos/${owner}/${name}/contents/${path}`);
      if (data.content && data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return "";
    } catch (error) {
      console.warn(`Failed to fetch ${path}:`, error);
      return "";
    }
  }
}

// Helper function to parse GitHub URL
export function parseGitHubUrl(url: string): { owner: string; name: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, owner, name] = match;
  return {
    owner,
    name: name.replace(/\.git$/, ""), // Remove .git suffix if present
  };
}

// Helper to identify important files for context
export function getImportantPaths(tree: GitHubTree): string[] {
  const important: string[] = [];

  for (const item of tree.tree) {
    if (item.type !== "blob") continue;

    const path = item.path.toLowerCase();

    // Documentation files
    if (
      path === "readme.md" ||
      path === "contributing.md" ||
      path === "code_of_conduct.md" ||
      path.includes("docs/") && path.endsWith(".md")
    ) {
      important.push(item.path);
    }

    // Config files that reveal architecture
    if (
      path === "package.json" ||
      path === "cargo.toml" ||
      path === "go.mod" ||
      path === "requirements.txt" ||
      path === "pom.xml"
    ) {
      important.push(item.path);
    }
  }

  return important.slice(0, 10); // Limit to 10 files
}
