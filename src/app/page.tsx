"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import MoodTracker from "@/components/MoodTracker";
import CharacterPicker from "@/components/CharacterPicker";
import WelcomeScreen from "@/components/WelcomeScreen";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function getTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [character, setCharacter] = useState<CharacterKey>("luna");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMood, setShowMood] = useState(true);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const profile = CHARACTER_PROFILES[character];

  // Init greeting when character changes
  useEffect(() => {
    if (started) {
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
  }, [character, started, profile.greeting]);

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

  const handleStart = (key: CharacterKey) => {
    setCharacter(key);
    setStarted(true);
  };

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMood(false);
    sendMessage(`我现在心情${mood}`);
  };

  const handleCharacterSwitch = (key: CharacterKey) => {
    setCharacter(key);
  };

  // Welcome screen
  if (!started) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return (
    <div className={`flex flex-col h-[100dvh] bg-gradient-to-b ${profile.bgColor}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setShowMood(!showMood)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors active:scale-90"
            title="Mood"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {/* Date separator */}
        <div className="flex justify-center mb-4">
          <span className="text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">
            今天
          </span>
        </div>

        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            avatar={profile.avatar}
            accentColor={profile.accentColor}
          />
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
    </div>
  );
}
