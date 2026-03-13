"use client";

import type { UIMessage } from "ai";
import { WeatherCard } from "@/components/tools/WeatherCard";
import { ShoppingCard } from "@/components/tools/ShoppingCard";
import { BotIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tool → Component 映射表 ────────────────────────────────────────────────
// 要添加新工具时，只需在这里注册即可
const TOOL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  getWeather: WeatherCard,
  getShopping: ShoppingCard,
  // getFlights: FlightCard,   // 未来扩展
};

// ─── 单条消息渲染 ───────────────────────────────────────────────────────────
function ChatMessage({ message, onSend }: { message: UIMessage; onSend?: (text: string) => void }) {
  const isUser = message.role === "user";
  if (!isUser) console.log("🤖 assistant parts:", JSON.stringify(message.parts, null, 2));

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
        isUser
          ? "bg-violet-600 text-white"
          : "bg-gradient-to-br from-teal-400 to-cyan-600 text-white"
      )}>
        {isUser ? <UserIcon size={14} /> : <BotIcon size={14} />}
      </div>

      {/* Message body */}
      <div className={cn("flex flex-col gap-2 max-w-[80%]", isUser && "items-end")}>
        {message.parts?.map((part, i) => {
          // ① 文本部分 → 气泡
          if (part.type === "text" && part.text.trim()) {
            const displayText = part.text.replace(/^\[(纯文字回复|购物工具)\]\s*/, "");
            if (!displayText.trim()) return null;
            return (
              <div key={i} className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                isUser
                  ? "bg-violet-600 text-white rounded-tr-sm"
                  : "bg-zinc-800 text-zinc-100 rounded-tl-sm"
              )}>
                {displayText}
              </div>
            );
          }

          // ② tool-{toolName} 部分 → v5/v6 每个工具有独立 part type
          // 例如 getWeather 工具对应 part.type === "tool-getWeather"
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.slice(5); // 去掉 "tool-" 前缀
            const Component = TOOL_COMPONENTS[toolName];
            const toolPart = part as any;
            // v6 tool part 状态: "input-available" | "output-available" | "output-error"
            const hasOutput = toolPart.state === "output-available";

            // 调用中 → 骨架屏
            if (!hasOutput) {
              return (
                <div key={i} className="rounded-2xl bg-zinc-800 p-4 w-72 animate-pulse">
                  <div className="h-4 bg-zinc-700 rounded w-1/2 mb-3" />
                  <div className="h-16 bg-zinc-700 rounded mb-3" />
                  <div className="h-4 bg-zinc-700 rounded w-3/4" />
                </div>
              );
            }

            // 有对应组件 → 渲染生成式 UI
            if (Component) {
              return <Component key={i} {...toolPart.output} onSend={onSend} />;
            }

            // 无对应组件 → JSON fallback
            return (
              <pre key={i} className="text-xs bg-zinc-900 text-zinc-400 p-3 rounded-xl overflow-auto max-w-xs">
                {JSON.stringify(toolPart.output, null, 2)}
              </pre>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ─── 消息列表 ───────────────────────────────────────────────────────────────
interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSend?: (text: string) => void;
}

export function ChatMessages({ messages, isLoading, onSend }: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-6 py-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} onSend={onSend} />
      ))}

      {/* AI thinking indicator */}
      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
            <BotIcon size={14} className="text-white" />
          </div>
          <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}