"use client";

import { useState } from "react";

export interface ShoppingData {
  style: string;          // 穿搭风格名，如"保暖时尚"
  season: string;         // 季节
  keywords: {             // 搜索关键词组
    label: string;
    query: string;
    tags: string[];
  }[];
  outfits: {              // 风格方案
    name: string;
    pieces: string[];     // 单品列表
    vibe: string;         // 风格描述
    color: string;        // 主色调
  }[];
  tips: string[];         // 购买贴士（简短）
}

const PALETTE: string[] = [
  "from-rose-400 to-pink-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
];

export function ShoppingCard(props: ShoppingData) {
  const { style, season, keywords, outfits, tips } = props;
  const [activeOutfit, setActiveOutfit] = useState(0);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const copyQuery = (query: string) => {
    navigator.clipboard.writeText(query).catch(() => {});
    setCopiedQuery(query);
    setTimeout(() => setCopiedQuery(null), 1500);
  };

  const current = outfits[activeOutfit];

  return (
    <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-700/50 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-zinc-800 to-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-400 tracking-widest uppercase mb-1">{season} · 穿搭推荐</p>
            <h2 className="text-xl font-semibold tracking-tight">{style}</h2>
          </div>
          <span className="text-3xl">🛍️</span>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">

        {/* ── 风格方案切换 ──────────────────────────────────────── */}
        <div>
          <p className="text-xs text-zinc-400 mb-2">风格方案</p>
          {/* Tab 切换 */}
          <div className="flex gap-1.5 mb-3">
            {outfits.map((o, i) => (
              <button
                key={i}
                onClick={() => setActiveOutfit(i)}
                className={`flex-1 text-xs py-1.5 rounded-xl transition-all duration-200 font-medium
                  ${activeOutfit === i
                    ? "bg-white text-zinc-900 shadow"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                {o.name}
              </button>
            ))}
          </div>

          {/* 当前风格详情 */}
          <div className={`rounded-2xl p-4 bg-gradient-to-br ${PALETTE[activeOutfit % PALETTE.length]} bg-opacity-10`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-white/80" />
              <span className="text-xs font-medium opacity-90">{current.vibe}</span>
              <span className="ml-auto text-xs opacity-60">{current.color}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {current.pieces.map((piece, i) => (
                <span key={i} className="text-xs bg-black/20 rounded-lg px-2.5 py-1 border border-white/20">
                  {piece}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 淘宝搜索关键词 ────────────────────────────────────── */}
        <div>
          <p className="text-xs text-zinc-400 mb-2">🔍 淘宝搜索关键词（点击复制）</p>
          <div className="space-y-2">
            {keywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => copyQuery(kw.query)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-98
                  border group
                  ${copiedQuery === kw.query
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-500 hover:bg-zinc-800"
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{kw.label}</span>
                  <span className="text-xs opacity-40 group-hover:opacity-70 transition-opacity">
                    {copiedQuery === kw.query ? "✓ 已复制" : "复制"}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-mono">{kw.query}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {kw.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-zinc-700/60 rounded-md px-1.5 py-0.5 text-zinc-400">
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 购买贴士 ──────────────────────────────────────────── */}
        <div className="bg-zinc-800/50 rounded-2xl px-4 py-3 border border-zinc-700/30">
          <p className="text-xs text-zinc-400 mb-2">💡 购物贴士</p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-300">
                <span className="text-zinc-500 mt-px">·</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}