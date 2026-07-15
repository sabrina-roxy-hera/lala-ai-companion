import { NextRequest } from "next/server";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";
import { HttpsProxyAgent } from "https-proxy-agent";

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
      systemPrompt += `\n\n## 当前状态\n她刚告诉你她现在的心情是"${mood}"。根据她的情绪调整你的语气和回应。`;
    }

    // Add time awareness
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      systemPrompt += `\n\n现在是深夜/凌晨。语气要更柔软、更亲密——像两个在乎彼此的人的深夜对话。`;
    } else if (hour >= 6 && hour < 9) {
      systemPrompt += `\n\n现在是早上。可以问问她睡得怎么样，今天有什么安排。`;
    }

    // Build OpenRouter messages format
    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Use proxy for regions where models are restricted
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const fetchOptions: RequestInit & { agent?: HttpsProxyAgent<string> } = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Lala AI Companion",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "anthropic/claude-sonnet-4",
        messages: openRouterMessages,
        max_tokens: 300,
      }),
    };

    if (proxyUrl) {
      fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
    }

    // Use node-fetch style with agent support
    const nodeFetch = (await import("node-fetch")).default;
    const response = await nodeFetch(OPENROUTER_API_URL, fetchOptions as Parameters<typeof nodeFetch>[1]);

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return Response.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
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
