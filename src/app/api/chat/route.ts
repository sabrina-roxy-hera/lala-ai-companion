import { NextRequest } from "next/server";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const CHOICES_INSTRUCTION = `

## 回复格式要求
在你的回复内容之后，换一行写"---"，然后在接下来的三行各写一个【用户（也就是和你聊天的那个人）】可能会回复你的话作为对话选项。注意：这些选项是站在用户的角度写的，不是你说的话。这三个选项应该代表用户不同的回应方向（比如：调皮地撩你/认真追问/试探你的态度）。选项要简短自然，像真人会打的字，不超过15个字。

示例格式：
你的回复内容在这里
---
选项1
选项2
选项3`;

async function callOpenRouter(requestBody: string, headers: Record<string, string>) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl) {
    try {
      const { HttpsProxyAgent } = await import("https-proxy-agent");
      const nodeFetch = (await import("node-fetch")).default;
      const agent = new HttpsProxyAgent(proxyUrl);
      const res = await nodeFetch(OPENROUTER_API_URL, {
        method: "POST",
        headers,
        body: requestBody,
        agent,
      });
      return { ok: res.ok, status: res.status, json: () => res.json(), text: () => res.text() };
    } catch {
      // fallback to native fetch if proxy modules unavailable
    }
  }

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: requestBody,
  });
  return { ok: res.ok, status: res.status, json: () => res.json(), text: () => res.text() };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, character = "shenmo", mood, context } = await req.json();

    const profile = CHARACTER_PROFILES[character as CharacterKey];
    if (!profile) {
      return Response.json({ error: "Unknown character" }, { status: 400 });
    }

    let systemPrompt = profile.system + CHOICES_INSTRUCTION;

    if (context) {
      systemPrompt += `\n\n## 场景背景\n${context}`;
    }

    if (mood) {
      systemPrompt += `\n\n## 当前状态\n她刚告诉你她现在的心情是"${mood}"。根据她的情绪调整你的语气和回应。`;
    }

    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      systemPrompt += `\n\n现在是深夜/凌晨。语气要更柔软、更亲密——像两个在乎彼此的人的深夜对话。`;
    } else if (hour >= 6 && hour < 9) {
      systemPrompt += `\n\n现在是早上。可以问问她睡得怎么样，今天有什么安排。`;
    }

    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await callOpenRouter(
      JSON.stringify({
        model: process.env.AI_MODEL || "google/gemini-2.5-flash",
        messages: openRouterMessages,
        max_tokens: 200,
      }),
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Heartbeat Mailbox",
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", response.status, err);
      return Response.json({ error: "AI service error", detail: err, status: response.status }, { status: 502 });
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const rawText = data.choices?.[0]?.message?.content || "";

    let message = rawText;
    let choices: string[] = [];

    const separatorIndex = rawText.lastIndexOf("---");
    if (separatorIndex !== -1) {
      message = rawText.substring(0, separatorIndex).trim();
      const choicesText = rawText.substring(separatorIndex + 3).trim();
      choices = choicesText
        .split("\n")
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0 && c.length < 30)
        .slice(0, 3);
    }

    return Response.json({ message, choices });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
