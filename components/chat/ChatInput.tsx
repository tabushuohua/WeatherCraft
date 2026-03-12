"use client";

import { SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "北京今天天气怎么样？",
  "上海的气温如何？",
  "广州的天气，华氏度",
  "深圳今天热吗？",
];

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSend: (text: string) => void;  // v5: 统一用 onSend
}

export function ChatInput({ input, isLoading, onChange, onSend }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div className="border-t border-zinc-800 pt-4 space-y-3">
      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            disabled={isLoading}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border border-zinc-700",
              "text-gray-500 hover:text-black hover:border-teal-500 hover:bg-teal-500/10",
              "transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="试着问：北京今天天气怎么样？"
          disabled={isLoading}
          className={cn(
            "flex-1 bg-white text-black placeholder:text-gray-500",
            "rounded-2xl px-4 py-3 text-sm outline-none",
            "border border-gray-300 focus:border-teal-500",
            "transition-colors duration-200 disabled:opacity-50 shadow-2xl"
          )}
        />
        <button
          onClick={() => onSend(input)}
          disabled={isLoading || !input.trim()}
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
            "bg-teal-500 text-white hover:bg-teal-400",
            "disabled:bg-white disabled:text-gray-500 disabled:cursor-not-allowed",
            "transition-all duration-200 hover:scale-105 active:scale-95"
          )}
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
}