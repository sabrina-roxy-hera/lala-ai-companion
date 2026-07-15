"use client";

import { CharacterKey } from "@/lib/prompts";

interface EpisodeHomeProps {
  onStartEpisode: (episode: number) => void;
}

const EPISODES = [
  {
    number: 1,
    title: "初见",
    subtitle: "三位嘉宾即将登场，你会对谁心动？",
    status: "available" as const,
    tag: "NEW",
  },
  {
    number: 2,
    title: "心动信号",
    subtitle: "第一次1v1约会，她会展现怎样的一面？",
    status: "locked" as const,
  },
  {
    number: 3,
    title: "秘密揭晓",
    subtitle: "打码信息首次公开，你还会坚持选择吗？",
    status: "locked" as const,
  },
  {
    number: 4,
    title: "心动夜话",
    subtitle: "深夜告白环节，谁会先说出口？",
    status: "locked" as const,
  },
];

export default function EpisodeHome({ onStartEpisode }: EpisodeHomeProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="pt-[calc(3rem+env(safe-area-inset-top))] px-6 pb-6">
        <span className="text-3xl font-bold text-white">心跳信箱</span>
        <p className="text-violet-300/70 text-sm mt-1">她在等你的回信</p>
      </div>

      {/* Season banner */}
      <div className="mx-5 mb-6 p-5 rounded-2xl bg-gradient-to-r from-violet-600/30 to-rose-600/30 border border-violet-500/20 backdrop-blur">
        <div className="text-xs text-violet-300/60 mb-1">SEASON 1</div>
        <div className="text-lg font-semibold text-white">三个她的故事</div>
        <div className="text-sm text-violet-200/60 mt-1">每一期解锁新的秘密，每一次选择改变结局</div>
      </div>

      {/* Episode list */}
      <div className="flex-1 px-5 space-y-3">
        {EPISODES.map((ep) => {
          const isAvailable = ep.status === "available";
          return (
            <button
              key={ep.number}
              onClick={() => isAvailable && onStartEpisode(ep.number)}
              disabled={!isAvailable}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                isAvailable
                  ? "bg-white/10 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98]"
                  : "bg-white/5 border border-white/5 opacity-50"
              }`}
            >
              {/* Episode number */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold ${
                  isAvailable
                    ? "bg-gradient-to-br from-violet-500 to-rose-500 text-white"
                    : "bg-gray-800 text-gray-600"
                }`}
              >
                {isAvailable ? ep.number : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-[15px] ${isAvailable ? "text-white" : "text-gray-500"}`}>
                    第{ep.number}期：{ep.title}
                  </span>
                  {ep.tag && (
                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                      {ep.tag}
                    </span>
                  )}
                </div>
                <div className={`text-xs mt-0.5 ${isAvailable ? "text-gray-400" : "text-gray-600"}`}>
                  {ep.subtitle}
                </div>
              </div>

              {isAvailable && (
                <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="text-center py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-gray-600">一个安全的空间，做真实的自己</p>
      </div>
    </div>
  );
}
