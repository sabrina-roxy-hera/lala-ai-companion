"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

interface Episode1Props {
  onComplete: (chosen: CharacterKey) => void;
  onBack: () => void;
}

type Phase =
  | "narration"      // 主持人旁白
  | "entrance"       // 嘉宾入场
  | "first-pick"     // 第一印象选择
  | "chat"           // 1v1破冰聊天
  | "ending";        // 章节结算

const NARRATION_LINES = [
  "欢迎来到「心跳信箱」",
  "在这里，每一封信都可能改变一段关系的走向",
  "今晚，三位嘉宾即将登场",
  "她们各自带着自己的故事，和一些……不愿说出口的秘密",
  "而你，是唯一能打开这些秘密的人",
  "准备好了吗？",
];

function getTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Episode1({ onComplete, onBack }: Episode1Props) {
  const [phase, setPhase] = useState<Phase>("narration");
  const [narrationIndex, setNarrationIndex] = useState(0);
  const [entranceIndex, setEntranceIndex] = useState(-1);
  const [chosenChar, setChosenChar] = useState<CharacterKey | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; timestamp: string; choices?: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatRound, setChatRound] = useState(0);
  const [heartLevel, setHeartLevel] = useState(0);
  const [revealedSecret, setRevealedSecret] = useState("");

  const keys = Object.keys(CHARACTER_PROFILES) as CharacterKey[];
  const MAX_ROUNDS = 5;

  // Narration auto-advance
  useEffect(() => {
    if (phase !== "narration") return;
    if (narrationIndex >= NARRATION_LINES.length) {
      setTimeout(() => setPhase("entrance"), 800);
      return;
    }
    const timer = setTimeout(() => setNarrationIndex((i) => i + 1), 2000);
    return () => clearTimeout(timer);
  }, [phase, narrationIndex]);

  // Entrance animation
  useEffect(() => {
    if (phase !== "entrance") return;
    if (entranceIndex >= keys.length - 1) return;
    const timer = setTimeout(() => setEntranceIndex((i) => i + 1), 600);
    return () => clearTimeout(timer);
  }, [phase, entranceIndex, keys.length]);

  // Start chat after picking
  useEffect(() => {
    if (phase === "chat" && chosenChar && messages.length === 0) {
      const profile = CHARACTER_PROFILES[chosenChar];
      setMessages([
        {
          role: "assistant",
          content: profile.greeting,
          timestamp: getTime(),
        },
      ]);
    }
  }, [phase, chosenChar, messages.length]);

  const handlePick = (key: CharacterKey) => {
    setChosenChar(key);
    setPhase("chat");
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chosenChar) return;
      const userMsg = { role: "user" as const, content: text, timestamp: getTime() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setLoading(true);
      const newRound = chatRound + 1;
      setChatRound(newRound);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            character: chosenChar,
            context: `这是恋综「心跳信箱」第1期"初见"的1v1破冰环节。这是你们第${newRound}轮对话（共${MAX_ROUNDS}轮）。${newRound >= MAX_ROUNDS - 1 ? "这是最后的对话机会了，可以稍微让气氛升温。" : ""}`,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message, timestamp: getTime(), choices: data.choices },
        ]);
        setHeartLevel((h) => Math.min(h + Math.floor(Math.random() * 15) + 10, 100));

        // End chat after MAX_ROUNDS
        if (newRound >= MAX_ROUNDS) {
          setTimeout(() => {
            // Reveal first secret
            const profile = CHARACTER_PROFILES[chosenChar];
            const firstSecret = profile.bio.lines[0];
            setRevealedSecret(`${firstSecret.label}：${firstSecret.value.replace(/█+/g, "???")}`);
            setPhase("ending");
          }, 2000);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "嗯...网络好像出了点问题", timestamp: getTime() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, chosenChar, chatRound]
  );

  // ==================== RENDER ====================

  // Phase: Narration
  if (phase === "narration") {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center px-8">
        <div className="space-y-4 max-w-sm">
          {NARRATION_LINES.slice(0, narrationIndex).map((line, i) => (
            <p
              key={i}
              className={`text-center transition-all duration-700 ${
                i === narrationIndex - 1
                  ? "text-white text-lg opacity-100"
                  : "text-gray-500 text-sm opacity-60"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
        <button
          onClick={() => { setNarrationIndex(NARRATION_LINES.length); }}
          className="absolute bottom-12 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          跳过 →
        </button>
      </div>
    );
  }

  // Phase: Entrance + First Pick
  if (phase === "entrance" || phase === "first-pick") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col overflow-y-auto">
        <div className="pt-[calc(2rem+env(safe-area-inset-top))] px-6 pb-2">
          <button onClick={onBack} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← 返回
          </button>
        </div>

        <div className="text-center px-6 py-4">
          <p className="text-violet-300/60 text-xs mb-1">第1期</p>
          <h2 className="text-xl font-bold text-white">初见</h2>
          <p className="text-gray-400 text-sm mt-2">
            {phase === "entrance" ? "嘉宾入场中..." : "选择你想要1v1破冰聊天的嘉宾"}
          </p>
        </div>

        {/* Guest cards */}
        <div className="flex-1 px-5 py-4 space-y-4 max-w-lg mx-auto w-full">
          {keys.map((key, i) => {
            const char = CHARACTER_PROFILES[key];
            const bio = char.bio;
            const visible = i <= entranceIndex;

            if (!visible) return <div key={key} className="h-48" />;

            return (
              <div
                key={key}
                className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur overflow-hidden animate-fade-slide-up"
              >
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-1 ring-white/20">
                    <Image src={char.heroImage} alt={char.name} width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-base">{char.name}</span>
                      <span className="text-xs text-gray-400">{bio.age}岁 · {bio.city}</span>
                    </div>
                    <div className="text-xs text-violet-300/70 mt-0.5">{bio.job}</div>
                    <div className="text-xs text-gray-400/80 mt-2 italic">&ldquo;{bio.quote}&rdquo;</div>
                  </div>
                </div>

                {/* Censored info */}
                <div className="px-4 pb-3 space-y-1.5">
                  {bio.lines.map((line: { label: string; value: string }, li: number) => (
                    <div key={li} className="flex items-start gap-2 text-xs">
                      <span className="text-gray-500 w-18 flex-shrink-0">{line.label}</span>
                      <span className="text-gray-300/80">{line.value}</span>
                    </div>
                  ))}
                </div>

                {/* Pick button */}
                {phase === "first-pick" || entranceIndex >= keys.length - 1 ? (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handlePick(key)}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] bg-gradient-to-r ${char.color} text-white hover:shadow-lg`}
                    >
                      选她聊聊
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Trigger first-pick phase after all entered */}
        {phase === "entrance" && entranceIndex >= keys.length - 1 && (
          <div className="text-center pb-6">
            <button
              onClick={() => setPhase("first-pick")}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors animate-pulse"
            >
              全部就位，开始选择 ↓
            </button>
          </div>
        )}
      </div>
    );
  }

  // Phase: Chat
  if (phase === "chat" && chosenChar) {
    const profile = CHARACTER_PROFILES[chosenChar];
    return (
      <div className={`flex flex-col h-[100dvh] bg-gradient-to-b ${profile.bgColor}`}>
        {/* Chat header with episode progress */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden shadow-md ring-2 ring-white">
                <Image src={profile.avatar} alt={profile.name} width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-800">{profile.name}</h1>
                <p className="text-[11px] text-violet-500">第1期 · 初见 · 破冰聊天</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">{chatRound}/{MAX_ROUNDS}轮</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-rose-400">♥</span>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${heartLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${(chatRound / MAX_ROUNDS) * 100}%` }}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="flex justify-center mb-4">
            <span className="text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">
              破冰聊天开始
            </span>
          </div>

          {messages.map((msg, i) => (
            <div key={i}>
              <ChatBubble
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                avatar={profile.avatar}
                accentColor={profile.accentColor}
              />
              {msg.role === "assistant" &&
                msg.choices &&
                i === messages.length - 1 &&
                !loading &&
                chatRound < MAX_ROUNDS && (
                  <div className="flex flex-wrap gap-2 ml-11 mt-2 mb-2 animate-fade-slide-up">
                    {msg.choices.map((choice, ci) => (
                      <button
                        key={ci}
                        onClick={() => sendMessage(choice)}
                        className="text-[13px] px-3.5 py-2 rounded-full bg-white/90 border border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 active:scale-95 transition-all shadow-sm"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {loading && <TypingIndicator avatar={profile.avatar} />}
        </div>

        {/* Input - disabled after max rounds */}
        {chatRound < MAX_ROUNDS && (
          <ChatInput onSend={sendMessage} disabled={loading} />
        )}
      </div>
    );
  }

  // Phase: Ending
  if (phase === "ending" && chosenChar) {
    const profile = CHARACTER_PROFILES[chosenChar];
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6 animate-fade-slide-up">
          {/* Episode complete */}
          <div className="text-violet-300/50 text-xs">第1期 · 初见</div>
          <h2 className="text-2xl font-bold text-white">破冰结束</h2>

          {/* Heart result */}
          <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-white/20 mx-auto mb-3">
              <Image src={profile.heroImage} alt={profile.name} width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div className="text-white font-semibold">{profile.name}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-rose-400">♥</span>
              <span className="text-rose-300 text-lg font-bold">{heartLevel}%</span>
              <span className="text-gray-500 text-sm">好感度</span>
            </div>
          </div>

          {/* Unlocked secret */}
          <div className="bg-violet-500/10 rounded-2xl p-4 border border-violet-500/20">
            <div className="text-xs text-violet-400 mb-2">🔓 解锁了一条信息</div>
            <div className="text-sm text-violet-200">{revealedSecret}</div>
          </div>

          {/* Next episode preview */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-xs text-gray-500 mb-1">下期预告</div>
            <div className="text-sm text-gray-300">第2期「心动信号」—— 开发中，敬请期待</div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => onComplete(chosenChar)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg active:scale-[0.98] transition-all"
            >
              继续和{profile.name}自由聊天
            </button>
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
