// OpenAI API integration for embeddings and LLM calls

const OPENAI_API_BASE = "https://api.openai.com/v1";

export class OpenAIClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${OPENAI_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Limit input length
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${OPENAI_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts.map(t => t.slice(0, 8000)),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  async chat(messages: Array<{ role: string; content: string }>, maxTokens = 2000): Promise<string> {
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // LLM Functions for the agent

  async summarizeRepo(readmeText: string, treeSummary: string): Promise<string> {
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant that explains code repositories in plain English for newcomers.",
      },
      {
        role: "user",
        content: `Summarize this repository structure in 2-3 paragraphs for a developer who wants to contribute:

README:
${readmeText.slice(0, 3000)}

Project structure:
${treeSummary}

Focus on: What does this project do? What's the tech stack? How is the code organized (frontend/backend/tests)?`,
      },
    ];

    return this.chat(messages, 500);
  }

  async explainIssue(
    issueTitle: string,
    issueBody: string,
    labels: string[],
    skillLevel: string,
    track: string
  ): Promise<string> {
    const messages = [
      {
        role: "system",
        content: `You are explaining a GitHub issue to a ${skillLevel} ${track} developer. Use plain English and break down technical terms.`,
      },
      {
        role: "user",
        content: `Explain this issue in 2-3 sentences:

Title: ${issueTitle}
Labels: ${labels.join(", ")}
Body: ${issueBody?.slice(0, 1000) || "No description provided"}

What needs to be done? Why does it matter?`,
      },
    ];

    return this.chat(messages, 300);
  }

  async makeRoadmap(
    profileText: string,
    repoSummary: string,
    rankedIssues: Array<{ title: string; body: string; labels: string[]; html_url: string }>
  ): Promise<Array<{ step_no: number; title: string; details: string; linked_issue_url?: string; est_minutes: number }>> {
    const issuesText = rankedIssues
      .slice(0, 5)
      .map((issue, i) => `${i + 1}. [${issue.labels.join(", ")}] ${issue.title}\n   ${issue.body?.slice(0, 200) || ""}`)
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content: "You are creating a personalized onboarding roadmap for an open-source contributor.",
      },
      {
        role: "user",
        content: `Create a 3-5 step onboarding roadmap for this contributor:

Contributor profile: ${profileText}

Repository: ${repoSummary}

Relevant issues:
${issuesText}

Return a JSON array of steps with this format:
[
  {
    "step_no": 1,
    "title": "Set up the project locally",
    "details": "Clone the repo, install dependencies with npm install, and run the dev server...",
    "linked_issue_url": null,
    "est_minutes": 30
  },
  ...
]

Make sure:
- Step 1 is always setup/installation
- Steps 2-3 are exploration/understanding the codebase
- Steps 4-5 involve picking and working on an issue
- Use plain English and be specific
- Include time estimates in minutes`,
      },
    ];

    const response = await this.chat(messages, 1500);

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, response];
      const jsonText = jsonMatch[1] || response;
      return JSON.parse(jsonText.trim());
    } catch (error) {
      console.error("Failed to parse roadmap JSON:", error);
      // Fallback roadmap
      return [
        {
          step_no: 1,
          title: "Set up the project locally",
          details: "Clone the repository, install dependencies, and verify the project runs.",
          est_minutes: 30,
        },
        {
          step_no: 2,
          title: "Explore the codebase structure",
          details: "Review the README and main folders to understand the architecture.",
          est_minutes: 45,
        },
        {
          step_no: 3,
          title: "Find a beginner-friendly issue",
          details: "Look for issues labeled 'good first issue' or 'help wanted'.",
          est_minutes: 15,
        },
      ];
    }
  }
}

// Helper to create profile text for embedding
export function createProfileText(profile: {
  skill_level: string;
  track: string;
  preferences: { prefer: string; stack: string[] };
}): string {
  return `${profile.skill_level} ${profile.track} developer; prefers ${profile.preferences.prefer}; stack: ${profile.preferences.stack.join(", ")}`;
}
