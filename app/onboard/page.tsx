"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Loader2, GitBranch } from "lucide-react";

type SkillLevel = "beginner" | "intermediate" | "advanced";
type Track = "frontend" | "backend" | "fullstack";
type Preference = "code" | "docs" | "tests";

const techStack = [
  "React",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "Java",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "Kubernetes",
];

export default function OnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Profile data
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [track, setTrack] = useState<Track>("fullstack");
  const [preference, setPreference] = useState<Preference>("code");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);

  // Step 2: Repository data
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  const toggleStack = (tech: string) => {
    setSelectedStack((prev) =>
      prev.includes(tech)
        ? prev.filter((t) => t !== tech)
        : [...prev, tech]
    );
  };

  const handleProfileSubmit = async () => {
    if (selectedStack.length === 0) {
      setError("Please select at least one technology from your stack");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate GitHub URL
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubPattern.test(repoUrl)) {
      setError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)");
      return;
    }

    setIsLoading(true);

    try {
      // Save profile first
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_level: skillLevel,
          track,
          preferences: {
            prefer: preference,
            stack: selectedStack,
          },
        }),
      });

      if (!profileRes.ok) {
        throw new Error("Failed to save profile");
      }

      // Then ingest repository
      const ingestRes = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!ingestRes.ok) {
        throw new Error("Failed to ingest repository");
      }

      const { repoId } = await ingestRes.json();

      // Generate roadmap
      const roadmapRes = await fetch("/api/agent/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });

      if (!roadmapRes.ok) {
        throw new Error("Failed to generate roadmap");
      }

      const { roadmapId } = await roadmapRes.json();

      // Redirect to roadmap view
      router.push(`/roadmap/${roadmapId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Let's Get You Started</h1>
          <p className="text-slate-600">
            Step {step} of 2: {step === 1 ? "Tell us about yourself" : "Choose a repository"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Skill Profile</CardTitle>
              <CardDescription>
                Help us personalize your onboarding experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skill Level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Skill Level</Label>
                <RadioGroup value={skillLevel} onValueChange={(v) => setSkillLevel(v as SkillLevel)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner" className="font-normal cursor-pointer">
                      Beginner - New to open source and learning the basics
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate" className="font-normal cursor-pointer">
                      Intermediate - Comfortable with code and some contributions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced" className="font-normal cursor-pointer">
                      Advanced - Experienced developer looking for specific tasks
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Track */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Development Track</Label>
                <RadioGroup value={track} onValueChange={(v) => setTrack(v as Track)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="frontend" id="frontend" />
                    <Label htmlFor="frontend" className="font-normal cursor-pointer">
                      Frontend - UI, components, styling
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="backend" id="backend" />
                    <Label htmlFor="backend" className="font-normal cursor-pointer">
                      Backend - APIs, databases, servers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fullstack" id="fullstack" />
                    <Label htmlFor="fullstack" className="font-normal cursor-pointer">
                      Full-stack - Comfortable with both
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Preference */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Learning Preference</Label>
                <RadioGroup value={preference} onValueChange={(v) => setPreference(v as Preference)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="code" id="code" />
                    <Label htmlFor="code" className="font-normal cursor-pointer">
                      Code - I learn best by reading and writing code
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="docs" id="docs" />
                    <Label htmlFor="docs" className="font-normal cursor-pointer">
                      Documentation - I prefer reading guides and docs first
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tests" id="tests" />
                    <Label htmlFor="tests" className="font-normal cursor-pointer">
                      Tests - I like understanding through test cases
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tech Stack */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Your Tech Stack <span className="text-sm font-normal text-slate-500">(select all that apply)</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {techStack.map((tech) => (
                    <div key={tech} className="flex items-center space-x-2">
                      <Checkbox
                        id={tech}
                        checked={selectedStack.includes(tech)}
                        onCheckedChange={() => toggleStack(tech)}
                      />
                      <Label htmlFor={tech} className="font-normal cursor-pointer">
                        {tech}
                      </Label>
                    </div>
                  ))}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <Button onClick={handleProfileSubmit} className="w-full" size="lg">
                Next: Choose Repository
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Repository */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to get your personalized roadmap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRepoSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                  <div className="flex gap-2">
                    <GitBranch className="w-10 h-10 text-slate-400 mt-1" />
                    <Input
                      id="repoUrl"
                      type="url"
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    Example: https://github.com/facebook/react
                  </p>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Roadmap...
                      </>
                    ) : (
                      <>
                        Generate My Roadmap
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
