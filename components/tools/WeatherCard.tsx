"use client";

import { useState } from "react";
import type { WeatherData } from "@/lib/weather";

const ICON_MAP: Record<string, { emoji: string; bg: string }> = {
  sunny:           { emoji: "☀️",  bg: "from-amber-400 via-orange-400 to-orange-500" },
  cloudy:          { emoji: "☁️",  bg: "from-slate-400 via-slate-500 to-slate-600" },
  "partly-cloudy": { emoji: "⛅",  bg: "from-sky-400 via-blue-400 to-blue-500" },
  rainy:           { emoji: "🌧️", bg: "from-blue-500 via-blue-600 to-indigo-700" },
  snowy:           { emoji: "❄️",  bg: "from-sky-200 via-blue-300 to-blue-400" },
  stormy:          { emoji: "⛈️", bg: "from-gray-600 via-gray-700 to-gray-900" },
};

// ── 根据天气数据推导情境动作 ─────────────────────────────────────────────────
interface ContextAction {
  emoji: string;
  label: string;
  message: string;
}

function getContextActions(data: WeatherData): ContextAction[] {
  const actions: ContextAction[] = [];
  const tempC = data.unit === "fahrenheit"
    ? Math.round((data.temperature - 32) / 1.8)
    : data.temperature;
  const isRainy  = ["rainy", "stormy"].includes(data.icon);
  const isSnowy  = data.icon === "snowy";
  const isHot    = tempC >= 30;
  const isCold   = tempC <= 8;
  const isComfy  = !isRainy && !isSnowy && tempC >= 18 && tempC <= 26;

  if (isRainy || isSnowy) {
    actions.push({
      emoji: "🌂",
      label: "提醒带伞",
      message: `[纯文字回复] 现在${data.city}${data.condition}，帮我设置一个出门前带伞的提醒，并给我一些雨天出行建议。`,
    });
    actions.push({
      emoji: "🚗",
      label: "打车建议",
      message: `[纯文字回复] ${data.city}今天${data.condition}，帮我推荐几个打网约车的小技巧，以及如何在雨天快速叫到车。`,
    });
  }

  if (isHot) {
    actions.push({
      emoji: "🧴",
      label: "防晒攻略",
      message: `[纯文字回复] ${data.city}今天气温${data.temperature}${data.unit === "celsius" ? "°C" : "°F"}，天气炎热，给我一份详细的防晒和防暑攻略。`,
    });
    actions.push({
      emoji: "🍦",
      label: "消暑推荐",
      message: `[纯文字回复] ${data.city}高温天气，帮我推荐一些消暑的饮品、食物和活动。`,
    });
  }

  if (isCold || isSnowy) {
    actions.push({
      emoji: "🧥",
      label: "保暖建议",
      message: `[纯文字回复]${data.city}今天${data.condition}，气温较低，给我一些保暖穿搭和防寒建议。`,
    });
  }

  if (isComfy) {
    actions.push({
      emoji: "🏃",
      label: "户外活动",
      message: `[纯文字回复] ${data.city}今天天气不错，${data.condition}，帮我推荐一些适合今天的户外活动或运动项目。`,
    });
  }

  // 通用：穿搭（始终有）
  actions.push({
    emoji: "👔",
    label: "穿搭建议",
    message: `[购物工具] ${data.city}今天${data.condition}，气温${data.temperature}${data.unit === "celsius" ? "°C" : "°F"}，帮我推荐今天适合的穿搭风格。`,
  });

  return actions.slice(0, 4); // 最多展示 4 个
}

// ── 穿搭方案（根据温度动态生成） ─────────────────────────────────────────────
interface Outfit {
  emoji: string;
  style: string;
  desc: string;
  query: string;
}

function getOutfits(data: WeatherData): Outfit[] {
  const tempC = data.unit === "fahrenheit"
    ? Math.round((data.temperature - 32) / 1.8)
    : data.temperature;

  if (tempC >= 28) return [
    { emoji: "👕", style: "清凉休闲", desc: "短袖+短裤",    query: "夏季清凉休闲穿搭 短袖短裤" },
    { emoji: "👗", style: "度假风",   desc: "连衣裙+凉鞋",  query: "夏季度假风连衣裙穿搭" },
    { emoji: "🩱", style: "运动风",   desc: "速干T+运动裤", query: "夏季运动风穿搭 速干" },
  ];
  if (tempC >= 18) return [
    { emoji: "👖", style: "简约日常", desc: "衬衫+牛仔裤",  query: "春秋简约日常穿搭 衬衫牛仔裤" },
    { emoji: "🧥", style: "文艺通勤", desc: "风衣+阔腿裤",  query: "春秋文艺风衣穿搭" },
    { emoji: "🎽", style: "运动休闲", desc: "卫衣+运动裤",  query: "春秋运动休闲卫衣穿搭" },
  ];
  if (tempC >= 8) return [
    { emoji: "🧣", style: "保暖时尚", desc: "毛衣+围巾",    query: "秋冬保暖时尚穿搭 毛衣围巾" },
    { emoji: "🧥", style: "休闲外套", desc: "夹克+厚裤",    query: "秋冬夹克休闲穿搭" },
    { emoji: "👔", style: "商务保暖", desc: "西装+打底",     query: "秋冬商务保暖西装穿搭" },
  ];
  return [
    { emoji: "🧥", style: "厚实保暖", desc: "羽绒服+厚裤",  query: "冬季羽绒服保暖穿搭" },
    { emoji: "🧣", style: "叠穿风",   desc: "毛绒外套叠穿", query: "冬季叠穿穿搭风格" },
    { emoji: "🏔️", style: "户外防寒", desc: "冲锋衣+抓绒", query: "冬季户外防寒冲锋衣穿搭" },
  ];
}

// ── 主组件 ───────────────────────────────────────────────────────────────────
interface WeatherCardProps extends WeatherData {
  onSend?: (text: string) => void;
}

export function WeatherCard(props: WeatherCardProps) {
  const { city, temperature, feelsLike, condition, humidity, windSpeed,
          high, low, icon, forecast, onSend } = props;

  const [unit, setUnit]               = useState<"celsius" | "fahrenheit">(props.unit ?? "celsius");
  const [showForecast, setShowForecast] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [sentAction, setSentAction]   = useState<string | null>(null);

  // 单位换算
  const toF = (c: number) => Math.round(c * 1.8 + 32);
  const toC = (f: number) => Math.round((f - 32) / 1.8);
  const convert = (val: number) => {
    if (unit === props.unit) return val;
    if (props.unit === "celsius" && unit === "fahrenheit") return toF(val);
    return toC(val);
  };
  const deg = unit === "celsius" ? "°C" : "°F";

  const { emoji, bg } = ICON_MAP[icon] ?? ICON_MAP["partly-cloudy"];
  const contextActions = getContextActions(props);
  const outfits        = getOutfits(props);

  const handleAction = (action: ContextAction) => {
    if (!onSend) return;
    setSentAction(action.label);
    onSend(action.message);
    setTimeout(() => setSentAction(null), 2000);
  };

  const handleOutfit = (outfit: Outfit) => {
    if (!onSend) return;
    setSentAction(outfit.style);
    onSend(`请调用购物工具，为我推荐"${outfit.style}"风格的穿搭，季节对应的搜索关键词是：${outfit.query}`);
    setTimeout(() => setSentAction(null), 2000);
  };

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
          <button
            onClick={() => setSaved(v => !v)}
            title={saved ? "取消收藏" : "收藏城市"}
            className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30
                       active:scale-95 rounded-full px-3 py-1 transition-all duration-200"
          >
            <span className="text-sm">{saved ? "⭐" : "☆"}</span>
            <span>{saved ? "已收藏" : "收藏"}</span>
          </button>

          <div className="flex bg-black/20 rounded-full p-0.5 text-xs font-medium">
            {(["celsius", "fahrenheit"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1 rounded-full transition-all duration-200 ${
                  unit === u
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
            <p className="text-2xl font-medium tracking-widest uppercase opacity-80 mb-1">{city}</p>
            <div className="flex items-end gap-1">
              <span key={unit} className="text-7xl font-thin leading-none animate-in fade-in duration-300">
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
            { label: "湿度", value: `${humidity}%`,                 icon: "💧" },
            { label: "风速", value: windSpeed,                       icon: "🌬️" },
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

        {/* ── 穿搭推荐横向滑动 ─────────────────────────────────── */}
        {onSend && (
          <div className="mb-4">
            <p className="text-xs opacity-60 mb-2">👔 今日穿搭推荐（点击发送到对话）</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {outfits.map((o) => (
                <button
                  key={o.style}
                  onClick={() => handleOutfit(o)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl px-3 py-2
                    text-xs transition-all duration-200 active:scale-95 border
                    ${sentAction === o.style
                      ? "bg-white text-gray-800 border-white scale-95"
                      : "bg-black/20 hover:bg-black/30 border-white/20 hover:border-white/40"
                    }`}
                >
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="font-medium">{o.style}</span>
                  <span className="opacity-70">{o.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── AI 智能情境操作按钮 ──────────────────────────────── */}
        {onSend && contextActions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs opacity-60 mb-2">✨ AI 建议操作</p>
            <div className="flex flex-wrap gap-2">
              {contextActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleAction(action)}
                  className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5
                    border transition-all duration-200 active:scale-95
                    ${sentAction === action.label
                      ? "bg-white text-gray-800 border-white"
                      : "bg-black/20 hover:bg-black/35 border-white/30 hover:border-white/50"
                    }`}
                >
                  <span>{action.emoji}</span>
                  <span>{action.label}</span>
                  {sentAction === action.label && <span className="ml-0.5">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 5日预报（可折叠） ────────────────────────────────── */}
        <button
          onClick={() => setShowForecast(v => !v)}
          className="w-full flex items-center justify-between
                     border-t border-white/20 pt-3 text-xs opacity-80
                     hover:opacity-100 transition-opacity duration-200"
        >
          <span>7 日预报</span>
          <span className={`transition-transform duration-300 ${showForecast ? "rotate-180" : ""}`}>▼</span>
        </button>

        {showForecast && (
          <div className="mt-3 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
            {forecast.map((f) => {
              const fi = ICON_MAP[f.icon] ?? ICON_MAP["partly-cloudy"];
              return (
                <div key={f.day}
                  className="flex flex-col items-center gap-1 bg-black/15 rounded-2xl py-2 text-xs">
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