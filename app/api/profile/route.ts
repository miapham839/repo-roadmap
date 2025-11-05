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
    const { skill_level, track, preferences } = body;

    if (!skill_level || !track || !preferences) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get or create user
    const userId = session.user.email; // Using email as user ID for simplicity

    // Check if user exists
    const existingUsers = await query<any[]>(
      "SELECT id FROM users WHERE email = ?",
      [userId]
    );

    if (existingUsers.length === 0) {
      // Create user
      await query(
        "INSERT INTO users (id, email, name, github_id) VALUES (?, ?, ?, ?)",
        [userId, userId, session.user.name || "", userId]
      );
    }

    // Create profile text for embedding
    const profileText = createProfileText({ skill_level, track, preferences });

    // Generate embedding for the profile
    const gemini = new GeminiClient();
    const embedding = await gemini.createEmbedding(profileText);

    // Check if profile exists
    const existingProfiles = await query<any[]>(
      "SELECT id FROM user_profiles WHERE user_id = ?",
      [userId]
    );

    if (existingProfiles.length > 0) {
      // Update existing profile
      await query(
        `UPDATE user_profiles
         SET skill_level = ?, track = ?, preferences = ?, profile_text = ?
         WHERE user_id = ?`,
        [skill_level, track, JSON.stringify(preferences), profileText, userId]
      );

      // Update embedding
      await query(
        `UPDATE embeddings
         SET vector = ?, snippet = ?
         WHERE entity_type = 'profile' AND entity_id = ?`,
        [JSON.stringify(embedding), profileText, existingProfiles[0].id]
      );
    } else {
      // Insert new profile
      const result = await query<any>(
        `INSERT INTO user_profiles (user_id, skill_level, track, preferences, profile_text)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, skill_level, track, JSON.stringify(preferences), profileText]
      );

      const profileId = result.insertId;

      // Insert embedding
      await query(
        `INSERT INTO embeddings (entity_type, entity_id, vector, snippet)
         VALUES ('profile', ?, ?, ?)`,
        [profileId, JSON.stringify(embedding), profileText]
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Profile creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create profile" },
      { status: 500 }
    );
  }
}
