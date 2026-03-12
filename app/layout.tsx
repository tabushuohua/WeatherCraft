import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generative UI Chat",
  description: "AI 回答即交互组件",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}