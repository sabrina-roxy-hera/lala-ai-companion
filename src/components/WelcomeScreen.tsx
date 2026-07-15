"use client";

import { useState } from "react";
import Image from "next/image";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

interface WelcomeScreenProps {
  onStart: (character: CharacterKey) => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [expanded, setExpanded] = useState<CharacterKey | null>(null);
  const keys = Object.keys(CHARACTER_PROFILES) as CharacterKey[];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-violet-50 via-white to-fuchsia-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="text-center pt-[calc(2rem+env(safe-area-inset-top))] pb-2 px-6">
        <span className="text-4xl font-bold text-shimmer">心跳信箱</span>
        <p className="text-gray-500 text-sm mt-2">选一个她，开始你们的故事</p>
      </div>

      {/* Character cards */}
      <div className="flex-1 px-5 py-6 space-y-5 max-w-lg mx-auto w-full">
        {keys.map((key) => {
          const char = CHARACTER_PROFILES[key];
          const bio = char.bio;
          const isExpanded = expanded === key;

          return (
            <div
              key={key}
              className="rounded-2xl bg-white/90 backdrop-blur border border-gray-100 shadow-sm overflow-hidden transition-all"
            >
              {/* 卡片头部：头像 + 基本信息 */}
              <button
                onClick={() => setExpanded(isExpanded ? null : key)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0 ring-2 ring-white">
                  <Image
                    src={char.heroImage}
                    alt={char.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-base">{char.name}</span>
                    <span className="text-xs text-gray-400">{bio.age}岁</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{bio.city}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{bio.job}</div>
                  <div className="text-xs text-gray-400 mt-1 italic truncate">
                    &ldquo;{bio.quote}&rdquo;
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 展开的详细资料 */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-slide-up">
                  <div className="border-t border-gray-100 pt-3 space-y-2.5">
                    {/* 打码信息行 */}
                    {bio.lines.map((line: { label: string; value: string }, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5 text-right">{line.label}</span>
                        <span className="text-xs text-gray-700 flex-1">{line.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* tagline */}
                  <div className="mt-3 text-center">
                    <span className="text-[11px] text-violet-500 bg-violet-50 px-2.5 py-1 rounded-full">
                      {char.tagline}
                    </span>
                  </div>

                  {/* 开始按钮 */}
                  <button
                    onClick={() => onStart(key)}
                    className={`w-full mt-4 py-3 rounded-xl text-white text-sm font-medium bg-gradient-to-r ${char.color} hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all`}
                  >
                    选她，开始聊天
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="text-center py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-gray-400">
          一个安全的空间，做真实的自己
        </p>
      </div>
    </div>
  );
}
