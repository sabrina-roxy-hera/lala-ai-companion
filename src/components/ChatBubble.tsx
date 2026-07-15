"use client";

import Image from "next/image";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  avatar?: string;
  accentColor?: string;
}

export default function ChatBubble({
  role,
  content,
  timestamp,
  avatar,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && avatar && (
        <div className="w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1 shadow-sm">
          <Image
            src={avatar}
            alt="avatar"
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-br-md"
              : "bg-white/90 text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
          }`}
        >
          {content}
        </div>
        {timestamp && (
          <div
            className={`text-[11px] text-gray-400 mt-1 ${
              isUser ? "text-right mr-1" : "ml-1"
            }`}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
