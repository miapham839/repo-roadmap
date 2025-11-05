// Google Gemini API integration for embeddings and LLM calls

import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(key);
    this.model = model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  async createEmbedding(text: string): Promise<number[]> {
    // Gemini uses embedding-001 model for embeddings
    const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });

    const result = await embeddingModel.embedContent(text.slice(0, 8000));
    return result.embedding.values;
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });

    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await embeddingModel.embedContent(text.slice(0, 8000));
      embeddings.push(result.embedding.values);
    }
    return embeddings;
  }

  async chat(messages: Array<{ role: string; content: string }>, maxTokens = 2000): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.model });

    // Convert messages to Gemini format
    const prompt = messages.map(m => m.content).join('\n\n');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // LLM Functions for the agent

  async summarizeRepo(readmeText: string, treeSummary: string): Promise<string> {
    const prompt = `You are a helpful assistant that explains code repositories in plain English for newcomers.

Summarize this repository structure in 2-3 paragraphs for a developer who wants to contribute:

README:
${readmeText.slice(0, 3000)}

Project structure:
${treeSummary}

Focus on: What does this project do? What's the tech stack? How is the code organized (frontend/backend/tests)?`;

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async explainIssue(
    issueTitle: string,
    issueBody: string,
    labels: string[],
    skillLevel: string,
    track: string
  ): Promise<string> {
    const prompt = `You are explaining a GitHub issue to a ${skillLevel} ${track} developer. Use plain English and break down technical terms.

Explain this issue in 2-3 sentences:

Title: ${issueTitle}
Labels: ${labels.join(", ")}
Body: ${issueBody?.slice(0, 1000) || "No description provided"}

What needs to be done? Why does it matter?`;

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
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

    const prompt = `You are creating a personalized onboarding roadmap for an open-source contributor.

Create a 3-5 step onboarding roadmap for this contributor:

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
  }
]

Make sure:
- Step 1 is always setup/installation
- Steps 2-3 are exploration/understanding the codebase
- Steps 4-5 involve picking and working on an issue
- Use plain English and be specific
- Include time estimates in minutes
- Return ONLY valid JSON, no markdown code blocks`;

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, responseText];
      const jsonText = jsonMatch[1] || responseText;
      return JSON.parse(jsonText.trim());
    } catch (error) {
      console.error("Failed to parse roadmap JSON:", error);
      console.error("Response text:", responseText);
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
