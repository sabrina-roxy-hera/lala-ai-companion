"use client";

import Image from "next/image";

interface TypingIndicatorProps {
  avatar?: string;
}

export default function TypingIndicator({ avatar }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mb-3">
      {avatar && (
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
      <div className="bg-white/90 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
