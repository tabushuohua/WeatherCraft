## 01  项目简介
WeatherCraft是一款基于 AI 的生成式 UI 对话应用，核心理念是将 AI 的回复从纯文字升级为可交互的 UI 组件。用户与 AI 对话时，AI 能够根据上下文主动调用工具、获取实时数据，并以富交互卡片的形式呈现结果，实现了 Agent 的预测与推理能力的可视化表达

## 02  技术栈
# 前端
Next.js 16：App Router 架构，Server Components + Client Components 混合渲染
AI SDK v6：@ai-sdk/react@3，useChat Hook 管理流式对话状态
TypeScript：全量类型覆盖，UIMessage / WeatherData 等核心接口严格定义
Tailwind CSS v4：原子化样式，animate-in / fade-in 动效，响应式布局

# 后端 & AI
DeepSeek Chat：主对话模型，支持 Tool Calling，处理意图识别与工具路由
AI SDK streamText：流式响应 + 多步工具调用，stopWhen: stepCountIs(5) 防循环
嵌套 AI 调用：getShopping tool 内部二次调用 generateText，生成结构化 JSON 数据
Zod v4：工具参数 inputSchema 校验，运行时类型安全

# 数据源
和风天气 API	GeoAPI 城市查询 + 实况天气 + 5日预报，专属域名接入
结构化 AI 生成	购物推荐数据由 AI 实时生成，带重试机制与 JSON 容错解析

## 03  核心功能

# 3.1  流式对话 & 生成式 UI
▸AI 响应以流式方式逐字渲染，tool 调用中显示骨架屏动画，结果就绪后切换为真实组件
▸part.type 路由机制：解析 UIMessage.parts，将 tool-getWeather / tool-getShopping 映射到对应 React 组件
▸TOOL_COMPONENTS 注册表：一行代码扩展新工具组件，无需修改渲染逻辑

# 3.2  天气卡片（WeatherCard）
▸实时天气数据：城市名 → GeoAPI 解析 ID → 实况天气 + 5日预报，全链路获取
▸°C / °F 单位切换：感知 props.unit 原始单位，正向/反向换算，避免二次换算错误
▸城市收藏、5日预报折叠展开，带动画过渡
▸情境操作按钮（Contextual Actions）：根据天气条件动态生成，雨天显示打车/带伞，高温显示防晒/消暑
▸穿搭推荐横向滑动：根据气温自动匹配 4 档穿搭方案，点击直接触发 AI 购物推荐

# 3.3  购物推荐卡片（ShoppingCard）
▸点击穿搭方案 → AI 调用 getShopping tool → 内部二次 AI 调用生成结构化 JSON → ShoppingCard 渲染
▸风格方案 Tab 切换：3套穿搭方案，渐变色块展示单品组合
▸淘宝关键词一键复制：点击复制到剪贴板，✓ 动效反馈，可直接粘贴到搜索框
▸JSON 容错解析：extractJSON 提取首个合法对象，失败自动重试一次

# 3.4  工具路由防误触发
▸消息前缀标签系统：[购物工具] / [纯文字回复] 精确控制工具调用，替代模糊语义判断
▸System prompt 基于前缀标签路由，彻底解决情境按钮误触发 getShopping 问题

## 04  工程亮点

# Generative UI 架构
将 AI Tool Calling 与 React 组件树深度整合。后端每个 tool 对应一个前端组件，AI 决策触发哪个工具，前端自动渲染对应 UI，实现了 AI 驱动的界面生成。

# 多步工具链（Multi-step Agent）
支持 AI 在单次对话中连续调用多个工具、根据上一步结果决策下一步行动，stopWhen: stepCountIs(5) 防止无限循环，兼顾灵活性与安全性。

# 嵌套 AI 调用生成结构化数据
getShopping execute 函数内部再次调用 DeepSeek，专门生成符合 ShoppingData 接口的 JSON。两层 AI 协作：外层负责意图识别，内层负责数据生成，职责分离。

# 流式状态管理
基于 AI SDK v6 的 UIMessage.parts 流式更新机制，实现「工具调用中」骨架屏 → 「数据就绪」组件切换的无缝过渡，无闪烁、无重排。
## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
