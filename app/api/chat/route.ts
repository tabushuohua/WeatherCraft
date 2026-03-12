import { streamText, convertToModelMessages, UIMessage, tool, stepCountIs } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { fetchWeather } from "@/lib/weather";

export const maxDuration = 30;

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: `你是一个智能助手，能够以交互式卡片的形式展示信息。
当用户询问天气时，必须调用 getWeather 工具，不要直接用文字回答天气。
工具调用完成后用一句话说明结果。`,
    messages: modelMessages,
    tools: {
      getWeather: tool({
        description: "获取指定城市的实时天气信息",
        inputSchema: z.object({
          city: z.string().describe("城市名称，如：北京、上海、广州"),
          unit: z.enum(["celsius", "fahrenheit"]).optional().describe("温度单位，默认 celsius"),
        }),
        execute: async ({ city, unit }) => {
          return await fetchWeather(city, unit ?? "celsius");
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}