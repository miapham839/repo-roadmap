"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RoadmapStep {
  id: number;
  step_no: number;
  title: string;
  details: string;
  linked_issue_id?: number;
  linked_issue_url?: string;
  est_minutes: number;
  status: "pending" | "in_progress" | "completed";
}

interface Roadmap {
  id: number;
  repo_name: string;
  repo_url: string;
  summary: string;
  steps: RoadmapStep[];
}

export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchRoadmap();
    }
  }, [status]);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch(`/api/roadmap/${params.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch roadmap");
      }
      const data = await res.json();
      setRoadmap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const syncToCalendar = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/action/calendar/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmapId: params.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to sync to calendar");
      }

      alert("Successfully synced to Google Calendar!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Roadmap not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Start Over
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMinutes = roadmap.steps.reduce((sum, step) => sum + step.est_minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/onboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Start New Roadmap
            </Link>
          </Button>

          <h1 className="text-4xl font-bold mb-2">Your Onboarding Roadmap</h1>
          <div className="flex items-center gap-4 text-slate-600">
            <a
              href={roadmap.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600"
            >
              {roadmap.repo_name}
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {hours > 0 && `${hours}h `}
              {minutes}min total
            </span>
          </div>
        </div>

        {/* Repository Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{roadmap.summary}</p>
          </CardContent>
        </Card>

        {/* Sync to Calendar Button */}
        <div className="mb-8">
          <Button
            onClick={syncToCalendar}
            disabled={isSyncing}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Sync to Google Calendar
              </>
            )}
          </Button>
          <p className="text-sm text-slate-500 mt-2">
            Add these steps as calendar events to stay on track
          </p>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-6">
          {roadmap.steps.map((step, index) => (
            <Card key={step.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {step.step_no}
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {step.est_minutes} min
                      </span>
                      {step.status === "completed" && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 mb-4 whitespace-pre-wrap">{step.details}</p>

                {step.linked_issue_url && (
                  <a
                    href={step.linked_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View related issue
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500">
          <p>Good luck on your open source journey!</p>
        </div>
      </div>
    </div>
  );
}
