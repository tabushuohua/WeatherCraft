"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { SparklesIcon } from "lucide-react";

export default function Home() {
  // transport 必须用 useMemo 稳定引用，避免每次渲染重新创建
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "streaming" || status === "submitted";

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="min-h-screen bg-white text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <SparklesIcon size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-black">Generative UI Chat</h1>
            <p className="text-xs text-zinc-500">AI 回答 = 交互式组件</p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-xl shadow-teal-500/20">
                <SparklesIcon size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2 text-zinc-900">你好！我是生成式 UI 助手</h2>
                <p className="text-zinc-500 text-sm max-w-sm">
                  不同于普通聊天，我的回答可以是
                  <span className="text-teal-400">交互式卡片组件</span>。
                  <br />
                  试着问我某个城市的天气吧。
                </p>
              </div>
            </div>
          )}

          <ChatMessages messages={messages} isLoading={isLoading} onSend={handleSend} />
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-zinc-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <ChatInput
            input={input}
            isLoading={isLoading}
            onChange={setInput}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}