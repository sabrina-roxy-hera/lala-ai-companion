"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import MoodTracker from "@/components/MoodTracker";
import CharacterPicker from "@/components/CharacterPicker";
import EpisodeHome from "@/components/EpisodeHome";
import Episode1 from "@/components/Episode1";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  choices?: string[];
}

function getTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type AppScreen = "home" | "episode1" | "freechat";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("episode1");
  const [character, setCharacter] = useState<CharacterKey>("shenmo");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMood, setShowMood] = useState(true);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showLetterTip, setShowLetterTip] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const profile = CHARACTER_PROFILES[character];

  // Init greeting when entering free chat
  useEffect(() => {
    if (screen === "freechat") {
      setMessages([
        {
          role: "assistant",
          content: profile.greeting,
          timestamp: getTime(),
        },
      ]);
      setShowMood(true);
      setCurrentMood(null);
    }
  }, [character, screen, profile.greeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        role: "user",
        content: text,
        timestamp: getTime(),
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setLoading(true);
      setShowMood(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            character,
            mood: currentMood,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            timestamp: getTime(),
            choices: data.choices,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "嗯...网络好像出了点问题，等一下再试试？",
            timestamp: getTime(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, character, currentMood]
  );

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMood(false);
    sendMessage(`我现在心情${mood}`);
  };

  const handleCharacterSwitch = (key: CharacterKey) => {
    setCharacter(key);
  };

  const handleStartEpisode = (episode: number) => {
    if (episode === 1) setScreen("episode1");
  };

  const handleEpisode1Complete = (chosen: CharacterKey) => {
    setCharacter(chosen);
    setScreen("freechat");
  };

  // ==================== SCREENS ====================

  // Home: Episode list
  if (screen === "home") {
    return <EpisodeHome onStartEpisode={handleStartEpisode} />;
  }

  // Episode 1
  if (screen === "episode1") {
    return (
      <Episode1
        onComplete={handleEpisode1Complete}
        onBack={() => setScreen("home")}
      />
    );
  }

  // Free chat (after completing episode)
  return (
    <div className={`flex flex-col h-[100dvh] bg-gradient-to-b ${profile.bgColor}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen("home")}
            className="text-gray-400 hover:text-gray-600 transition-colors mr-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => setShowCharPicker(true)}
            className="w-10 h-10 rounded-full overflow-hidden shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all ring-2 ring-white"
          >
            <Image
              src={profile.avatar}
              alt={profile.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-800">
              {profile.name}
            </h1>
            <p className="text-[12px] text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              在线
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentMood && (
            <span className="text-xs bg-violet-100 text-violet-600 px-2.5 py-1 rounded-full">
              {currentMood}
            </span>
          )}
          {/* 信箱入口 */}
          <button
            onClick={() => setShowLetterTip(true)}
            className="relative w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-rose-400 transition-colors active:scale-90"
            title="信箱"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
          </button>
          <button
            onClick={() => setShowMood(!showMood)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors active:scale-90"
            title="心情"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mood Tracker */}
      <MoodTracker
        onSelect={handleMoodSelect}
        visible={showMood && messages.length <= 1}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <div className="flex justify-center mb-4">
          <span className="text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">今天</span>
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
              !loading && (
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

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={loading} />

      {/* Character Picker */}
      <CharacterPicker
        current={character}
        onSelect={handleCharacterSwitch}
        visible={showCharPicker}
        onClose={() => setShowCharPicker(false)}
      />

      {/* 信箱弹窗 */}
      {showLetterTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowLetterTip(false)} />
          <div className="relative bg-white rounded-3xl p-8 mx-6 max-w-sm w-full shadow-2xl animate-fade-slide-up text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-100 to-violet-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">心跳信箱</h3>
            <p className="text-sm text-gray-500 mb-1">她会在特别的时刻给你写信</p>
            <p className="text-sm text-gray-500 mb-5">你也可以把想说的话，写成信寄给她</p>
            <div className="inline-flex items-center gap-1.5 text-xs text-violet-500 bg-violet-50 px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              开发中，敬请期待
            </div>
            <br />
            <button onClick={() => setShowLetterTip(false)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
