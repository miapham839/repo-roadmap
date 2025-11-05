import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db/tidb";

// Note: This is a placeholder for Google Calendar integration
// You'll need to implement OAuth2 flow for Google Calendar API
// For now, this saves the action intent to the database

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roadmapId } = body;

    if (!roadmapId) {
      return NextResponse.json({ error: "Missing roadmap ID" }, { status: 400 });
    }

    const userId = session.user.email;

    // Get roadmap steps
    const steps = await query<any[]>(
      `SELECT * FROM roadmap_steps WHERE roadmap_id = ? ORDER BY step_no`,
      [roadmapId]
    );

    if (steps.length === 0) {
      return NextResponse.json({ error: "No steps found" }, { status: 404 });
    }

    // For demonstration purposes, we'll create action records
    // In production, you would:
    // 1. Use Google Calendar API to create events
    // 2. Store the event IDs in the payload
    // 3. Handle OAuth2 authentication

    const createdActions = [];

    for (const step of steps) {
      // Mock calendar event payload
      const payload = {
        summary: step.title,
        description: step.details,
        duration_minutes: step.est_minutes,
        // In production: event_id from Google Calendar
        mock: true,
      };

      const result = await query<any>(
        `INSERT INTO actions (user_id, roadmap_id, step_id, type, payload, status)
         VALUES (?, ?, ?, 'calendar', ?, 'created')`,
        [userId, roadmapId, step.id, JSON.stringify(payload)]
      );

      createdActions.push({
        step_id: step.id,
        action_id: result.insertId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Calendar sync initiated (mock mode - set up Google OAuth for real sync)",
      created: createdActions,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
