"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import {
  GitBranch,
  Calendar,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Code2,
  BookOpen,
  Users
} from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Open Source Onboarding
          </div>

          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            From Lost to Contributing in Minutes
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Stop drowning in unfamiliar codebases. Get a personalized roadmap that guides you from
            README to your first pull request—synced to your calendar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {session ? (
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/onboard">
                  <GitBranch className="w-5 h-5 mr-2" />
                  Start Your Roadmap
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => signIn("github")}
                size="lg"
                className="text-lg px-8"
              >
                <GitBranch className="w-5 h-5 mr-2" />
                Sign in with GitHub
              </Button>
            )}

            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="#how-it-works">
                Learn More
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Built for students & new contributors</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Free & open source</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-slate-600 mb-16 text-lg">
            Three simple steps to start contributing with confidence
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">1. Share Your Profile</h3>
              <p className="text-slate-600 mb-4">
                Tell us your skill level, tech stack, and learning preferences.
                Takes less than 30 seconds.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Beginner, Intermediate, or Advanced</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Frontend, Backend, or Full-stack</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Preferred learning path</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">2. Pick a Repository</h3>
              <p className="text-slate-600 mb-4">
                Paste any GitHub repo URL. Our AI analyzes the codebase, issues,
                and documentation instantly.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Understand project structure</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Find beginner-friendly issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Match to your skill set</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">3. Get Your Roadmap</h3>
              <p className="text-slate-600 mb-4">
                Receive a personalized 3-5 step plan with calendar events.
                No more guessing where to start.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Plain-English explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Time estimates for each step</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Auto-sync to Google Calendar</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-4xl font-bold mb-4">
            Ready to Make Your First Contribution?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join students and aspiring developers who are confidently contributing to open source.
          </p>
          {session ? (
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link href="/onboard">
                Start Your Roadmap
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          ) : (
            <Button
              onClick={() => signIn("github")}
              size="lg"
              variant="secondary"
              className="text-lg px-8"
            >
              Sign in with GitHub
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>Built for hackathons, powered by TiDB, OpenAI, and Next.js</p>
        </div>
      </footer>
    </div>
  );
}
