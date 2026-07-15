"use client";

import Image from "next/image";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

interface WelcomeScreenProps {
  onStart: (character: CharacterKey) => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-violet-50 via-white to-fuchsia-50 flex flex-col">
      {/* Top area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)]">
        <div className="mb-2">
          <span className="text-4xl font-bold text-shimmer">Lala</span>
        </div>
        <p className="text-gray-500 text-sm mb-10">
          选一个她，开始你们的故事
        </p>

        {/* Character cards */}
        <div className="w-full max-w-sm space-y-4">
          {(Object.keys(CHARACTER_PROFILES) as CharacterKey[]).map((key) => {
            const char = CHARACTER_PROFILES[key];
            return (
              <button
                key={key}
                onClick={() => onStart(key)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-100 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                  <Image
                    src={char.heroImage}
                    alt={char.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-800 text-base">
                    {char.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {char.tagline}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 italic truncate">
                    &ldquo;{char.greeting}&rdquo;
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-300 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div className="text-center py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-gray-400">
          一个安全的空间，做真实的自己
        </p>
      </div>
    </div>
  );
}
