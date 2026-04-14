import { streamText, generateText, convertToModelMessages, UIMessage, tool, stepCountIs } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { fetchWeather } from "@/lib/weather";
import { retrieveFashionContext } from "@/lib/rag/retrieve";

export const maxDuration = 30;

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// 调用 AI 生成购物卡片 JSON
async function generateShoppingData(style: string, season: string, query: string, knowledgeContext = "") {
  const { text } = await generateText({
    model: deepseek("deepseek-chat"),
    prompt: `你是穿搭顾问。根据以下信息生成购物推荐数据，只返回 JSON，不要任何额外文字。

风格: ${style}
季节: ${season}
搜索意图: ${query}

参考知识库上下文:
${knowledgeContext || "无"}

返回格式（严格遵守，不要加 markdown 代码块）:
{
  "style": "${style}",
  "season": "${season}",
  "keywords": [
    { "label": "精准搜索", "query": "淘宝搜索词1", "tags": ["标签1", "标签2"] },
    { "label": "热门款式", "query": "淘宝搜索词2", "tags": ["标签1", "标签2"] },
    { "label": "套装搭配", "query": "淘宝搜索词3", "tags": ["标签1", "标签2"] }
  ],
  "outfits": [
    { "name": "方案A", "pieces": ["单品1", "单品2", "单品3"], "vibe": "风格描述", "color": "主色调" },
    { "name": "方案B", "pieces": ["单品1", "单品2", "单品3"], "vibe": "风格描述", "color": "主色调" },
    { "name": "方案C", "pieces": ["单品1", "单品2", "单品3"], "vibe": "风格描述", "color": "主色调" }
  ],
  "tips": ["贴士1（15字内）", "贴士2（15字内）", "贴士3（15字内）"]
}`,
  });

  // 清理可能的 markdown 代码块
  const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(clean);
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const latestUserText = latestUserMessage?.parts
    ?.filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim() ?? "";

  const rag = latestUserText ? await retrieveFashionContext(latestUserText, 4) : null;
  const ragContext = rag?.context?.trim()
    ? `\n\n[穿搭知识库检索结果]\n${rag.context}\n\n回答要求：\n- 优先使用上面的知识片段进行回答，避免编造面料、版型、场景和搭配规则。\n- 如果知识片段不足，可以基于常识补充，但要明确区分“知识库内容”和“推断建议”。\n- 当用户明显在问穿搭原则、面料知识、场景建议时，优先直接回答，不要无必要调用购物工具。`
    : "";

  const baseSystem = `你是一个智能助手，能够以交互式卡片的形式展示信息。
当用户询问天气时，立即调用 getWeather 工具。unit 参数始终传 "celsius"，除非用户明确说要华氏度。
当用户消息开头是「[购物工具]」时，必须调用 getShopping 工具。当用户消息开头是「[纯文字回复]」时，必须用纯文字直接回复，禁止调用任何工具。
如果用户在问穿搭搭配、面料、版型、场景建议、颜色搭配等内容，请优先结合知识库检索结果进行回答。
如果用户明确要“买什么、搜什么、淘宝关键词、具体穿搭方案”，再调用 getShopping 工具。
工具调用完成后用一句话简短说明，不要用 Markdown 标题或列表。`;

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: `${baseSystem}${ragContext}`,
    messages: modelMessages,
    tools: {
      getWeather: tool({
        description: "获取指定城市的实时天气信息。",
        inputSchema: z.object({
          city: z.string().describe("城市名称"),
          unit: z.enum(["celsius", "fahrenheit"]).optional(),
        }),
        execute: async ({ city, unit }) => fetchWeather(city, unit ?? "celsius"),
      }),

      getShopping: tool({
        description: "根据穿搭风格生成淘宝购物推荐卡片，包含搜索关键词、风格方案和购物贴士。",
        inputSchema: z.object({
          style:  z.string().describe("穿搭风格，如：保暖时尚、清凉休闲"),
          season: z.string().describe("季节，如：春秋、冬季、夏季"),
          query:  z.string().describe("搜索意图，如：秋冬保暖时尚穿搭 毛衣围巾"),
        }),
        execute: async ({ style, season, query }) => {
          return await generateShoppingData(style, season, query, rag?.context ?? "");
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}