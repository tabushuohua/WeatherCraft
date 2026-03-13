import { streamText, generateText, convertToModelMessages, UIMessage, tool, stepCountIs } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { fetchWeather } from "@/lib/weather";

export const maxDuration = 30;

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// 调用 AI 生成购物卡片 JSON
async function generateShoppingData(style: string, season: string, query: string) {
  const { text } = await generateText({
    model: deepseek("deepseek-chat"),
    prompt: `你是穿搭顾问。根据以下信息生成购物推荐数据，只返回 JSON，不要任何额外文字。

风格: ${style}
季节: ${season}
搜索意图: ${query}

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

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: `你是一个智能助手，能够以交互式卡片的形式展示信息。
当用户询问天气时，立即调用 getWeather 工具。unit 参数始终传 "celsius"，除非用户明确说要华氏度。
当用户消息开头是「[购物工具]」时，必须调用 getShopping 工具。当用户消息开头是「[纯文字回复]」时，必须用纯文字直接回复，禁止调用任何工具。
工具调用完成后用一句话简短说明，不要用 Markdown 标题或列表。`,
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
          return await generateShoppingData(style, season, query);
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}