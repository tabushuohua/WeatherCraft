"use client";

import { useState } from "react";
import type { WeatherData } from "@/lib/weather";

const ICON_MAP: Record<string, { emoji: string; bg: string }> = {
  sunny: { emoji: "☀️", bg: "from-amber-400 via-orange-400 to-orange-500" },
  cloudy: { emoji: "☁️", bg: "from-slate-400 via-slate-500 to-slate-600" },
  "partly-cloudy": { emoji: "⛅", bg: "from-sky-400 via-blue-400 to-blue-500" },
  rainy: { emoji: "🌧️", bg: "from-blue-500 via-blue-600 to-indigo-700" },
  snowy: { emoji: "❄️", bg: "from-sky-200 via-blue-300 to-blue-400" },
  stormy: { emoji: "⛈️", bg: "from-gray-600 via-gray-700 to-gray-900" },
};

export function WeatherCard(props: WeatherData) {
  const { city, temperature, feelsLike, condition, humidity, windSpeed,
    high, low, icon, forecast } = props;

  // ── 交互状态 ──────────────────────────────────────────────────
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">(props.unit ?? "celsius");
  const [showForecast, setShowForecast] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── 单位换算 ──────────────────────────────────────────────────
  const toF = (c: number) => Math.round(c * 1.8 + 32);
  const toC = (f: number) => Math.round((f - 32) / 1.8);
  const convert = (val: number) => {
    if (unit === props.unit) return val;
    if (props.unit === "celsius" && unit === "fahrenheit") return toF(val);
    return toC(val);
  };
  const deg = unit === "celsius" ? "°C" : "°F";

  const { emoji, bg } = ICON_MAP[icon] ?? ICON_MAP["sunny"];

  return (
    <div className={`
      relative overflow-hidden rounded-3xl bg-gradient-to-br ${bg}
      text-white shadow-2xl w-full max-w-sm select-none
      animate-in fade-in slide-in-from-bottom-4 duration-500
    `}>
      {/* 背景光晕 */}
      <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative p-6">

        {/* ── 顶部操作栏 ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          {/* 城市收藏按钮 */}
          <button
            onClick={() => setSaved(v => !v)}
            title={saved ? "取消收藏" : "收藏城市"}
            className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30
                       active:scale-95 rounded-full px-3 py-1 transition-all duration-200"
          >
            <span className="text-sm">{saved ? "⭐" : "☆"}</span>
            <span>{saved ? "已收藏" : "收藏"}</span>
          </button>

          {/* 单位切换 */}
          <div className="flex bg-black/20 rounded-full p-0.5 text-xs font-medium">
            {(["celsius", "fahrenheit"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1 rounded-full transition-all duration-200 ${unit === u
                    ? "bg-white text-gray-800 shadow"
                    : "text-white/70 hover:text-white"
                  }`}
              >
                {u === "celsius" ? "°C" : "°F"}
              </button>
            ))}
          </div>
        </div>

        {/* ── 主温度区 ────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase opacity-80 mb-1">
              {city}
            </p>
            {/* 温度数字带切换动画 */}
            <div className="flex items-end gap-1">
              <span
                key={unit}   // key 变化触发重渲染动画
                className="text-7xl font-thin leading-none animate-in fade-in duration-300"
              >
                {convert(temperature)}
              </span>
              <span className="text-2xl font-light mb-2 opacity-80">{deg}</span>
            </div>
            <p className="text-base opacity-90 mt-1">{condition}</p>
          </div>
          <span className="text-6xl mt-1 drop-shadow-lg">{emoji}</span>
        </div>

        {/* ── 详细数据行 ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "体感", value: `${convert(feelsLike)}${deg}`, icon: "🌡️" },
            { label: "湿度", value: `${humidity}%`, icon: "💧" },
            { label: "风速", value: windSpeed, icon: "🌬️" },
            { label: "最高/低", value: `${convert(high)}/${convert(low)}${deg}`, icon: "↕️" },
          ].map(({ label, value, icon }) => (
            <div key={label}
              className="flex items-center gap-2 bg-black/15 rounded-2xl px-3 py-2 text-xs">
              <span>{icon}</span>
              <div>
                <p className="opacity-60 leading-none mb-0.5">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 5日预报（可折叠） ────────────────────────────────── */}
        <button
          onClick={() => setShowForecast(v => !v)}
          className="w-full flex items-center justify-between
                     border-t border-white/20 pt-3 text-xs opacity-80
                     hover:opacity-100 transition-opacity duration-200"
        >
          <span>7 日预报</span>
          <span className={`transition-transform duration-300 ${showForecast ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {showForecast && (
          <div className="mt-3 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
            {forecast.map((f) => {
              const fi = ICON_MAP[f.icon] ?? ICON_MAP["sunny"];
              return (
                <div key={f.day}
                  className="flex flex-col items-center gap-1 bg-black/15
                             rounded-2xl py-2 text-xs">
                  <span className="opacity-70">{f.day}</span>
                  <span className="text-lg">{fi.emoji}</span>
                  <span className="font-medium">{convert(f.temp)}{deg}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}