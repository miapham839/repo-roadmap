import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db/tidb";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roadmapId = params.id;

    // Get roadmap
    const roadmaps = await query<any[]>(
      `SELECT r.*, repos.name as repo_name, repos.url as repo_url, repos.full_name
       FROM roadmaps r
       JOIN repos ON r.repo_id = repos.id
       WHERE r.id = ? AND r.user_id = ?`,
      [roadmapId, session.user.email]
    );

    if (roadmaps.length === 0) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const roadmap = roadmaps[0];

    // Get steps
    const steps = await query<any[]>(
      `SELECT rs.*, i.html_url as linked_issue_url
       FROM roadmap_steps rs
       LEFT JOIN issues i ON rs.linked_issue_id = i.id
       WHERE rs.roadmap_id = ?
       ORDER BY rs.step_no`,
      [roadmapId]
    );

    return NextResponse.json({
      id: roadmap.id,
      repo_name: roadmap.full_name,
      repo_url: roadmap.repo_url,
      summary: roadmap.summary,
      steps: steps,
    });
  } catch (error) {
    console.error("Roadmap fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}
