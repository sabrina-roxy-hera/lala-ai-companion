"use client";

import Image from "next/image";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";

interface CharacterPickerProps {
  current: CharacterKey;
  onSelect: (key: CharacterKey) => void;
  visible: boolean;
  onClose: () => void;
}

export default function CharacterPicker({
  current,
  onSelect,
  visible,
  onClose,
}: CharacterPickerProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 sm:mx-4 animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5 sm:hidden" />
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-5">
          切换陪伴
        </h2>
        <div className="space-y-3">
          {(Object.keys(CHARACTER_PROFILES) as CharacterKey[]).map((key) => {
            const char = CHARACTER_PROFILES[key];
            const isActive = key === current;
            return (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  isActive
                    ? "border-violet-400 bg-violet-50/50 shadow-md"
                    : "border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/30"
                }`}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden shadow-md flex-shrink-0">
                  <Image
                    src={char.heroImage}
                    alt={char.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-[15px]">
                    {char.name}
                  </div>
                  <div className="text-sm text-gray-500">{char.tagline}</div>
                </div>
                {isActive && (
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
