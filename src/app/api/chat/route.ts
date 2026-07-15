import { NextRequest } from "next/server";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { messages, character = "luna", mood } = await req.json();

    const profile = CHARACTER_PROFILES[character as CharacterKey];
    if (!profile) {
      return Response.json({ error: "Unknown character" }, { status: 400 });
    }

    let systemPrompt = profile.system;

    // Inject mood context
    if (mood) {
      systemPrompt += `\n\n## Current context\nShe just told you she's feeling "${mood}" right now. Adjust your tone and response accordingly.`;
    }

    // Add time awareness
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      systemPrompt += `\n\nIt's late night / early morning. Be softer, more intimate — like a late-night conversation between two people who care about each other.`;
    } else if (hour >= 6 && hour < 9) {
      systemPrompt += `\n\nIt's morning. Maybe ask how she slept, what's on her agenda today.`;
    }

    // Build OpenRouter messages format
    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456",
        "X-Title": "Lala AI Companion",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "anthropic/claude-sonnet-4-20250514",
        messages: openRouterMessages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return Response.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return Response.json({ message: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
