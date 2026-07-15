"use client";

interface MoodTrackerProps {
  onSelect: (mood: string) => void;
  visible: boolean;
}

const MOODS = [
  { emoji: "😊", label: "开心", color: "from-yellow-400 to-orange-400" },
  { emoji: "😌", label: "平静", color: "from-green-400 to-teal-400" },
  { emoji: "😔", label: "低落", color: "from-blue-400 to-indigo-400" },
  { emoji: "😤", label: "烦躁", color: "from-red-400 to-pink-400" },
  { emoji: "🥱", label: "无聊", color: "from-gray-400 to-slate-400" },
  { emoji: "🥰", label: "想你了", color: "from-pink-400 to-rose-400" },
];

export default function MoodTracker({ onSelect, visible }: MoodTrackerProps) {
  if (!visible) return null;

  return (
    <div className="px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-center text-sm text-gray-500 mb-3">
        现在心情怎么样？
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            onClick={() => onSelect(mood.label)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/80 border border-gray-100 hover:shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-xs text-gray-600">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
