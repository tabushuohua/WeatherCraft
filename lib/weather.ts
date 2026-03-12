export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: string;
  high: number;
  low: number;
  icon: string;
  forecast: { day: string; icon: string; temp: number }[];
  unit: "celsius" | "fahrenheit";
}

function mapIcon(iconCode: string): string {
  const code = parseInt(iconCode);
  if ([100, 150].includes(code)) return "sunny";
  if ([101, 102, 103, 151, 152, 153].includes(code)) return "partly-cloudy";
  if ([104, 154].includes(code)) return "cloudy";
  if (code >= 300 && code < 400) return "rainy";
  if (code >= 400 && code < 500) return "snowy";
  if ([302, 303, 304].includes(code)) return "stormy";
  return "partly-cloudy";
}

function dayLabel(offsetDays: number): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  if (offsetDays === 0) return "今天";
  if (offsetDays === 1) return "明天";
  if (offsetDays === 2) return "后天";
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return days[d.getDay()];
}

const toF = (c: number) => Math.round(c * 1.8 + 32);

async function fetchJson(url: string, label: string): Promise<any> {
  const res = await fetch(url);
  const text = await res.text();
  console.log(`📡 ${label} status:`, res.status, "body:", text.slice(0, 200));
  if (!text) throw new Error(`${label} 返回空响应`);
  return JSON.parse(text);
}

export async function fetchWeather(
  city: string,
  unit: "celsius" | "fahrenheit" = "celsius"
): Promise<WeatherData> {
  const apiKey = process.env.QWEATHER_API_KEY;
  const apiHost = process.env.QWEATHER_HOST;
  if (!apiKey) throw new Error("QWEATHER_API_KEY 未配置");
  if (!apiHost) throw new Error("QWEATHER_HOST 未配置");
  console.log("🌤 fetchWeather:", city, unit);

  // ── Step 1: GeoAPI ──────────────────────────────────────────
  const geoUrl = `${apiHost}/geo/v2/city/lookup?location=${encodeURIComponent(city)}&key=${apiKey}`;
  const geoData = await fetchJson(geoUrl, "GeoAPI");

  if (geoData.code !== "200" || !geoData.location?.length) {
    throw new Error(`城市"${city}"未找到，code: ${geoData.code}`);
  }

  const { id: locationId, name: cityName } = geoData.location[0];

  // ── Step 2: 实况天气 ────────────────────────────────────────
  const nowUrl = `${apiHost}/v7/weather/now?location=${locationId}&key=${apiKey}`;
  const nowData = await fetchJson(nowUrl, "NowAPI");

  if (nowData.code !== "200") {
    throw new Error(`实况天气查询失败，code: ${nowData.code}`);
  }

  const now = nowData.now;
  const tempC = parseInt(now.temp);
  const feelsC = parseInt(now.feelsLike);

  // ── Step 3: 7日预报 ─────────────────────────────────────────
  const forecastUrl = `${apiHost}/v7/weather/7d?location=${locationId}&key=${apiKey}`;
  const forecastData = await fetchJson(forecastUrl, "ForecastAPI");

  const forecast = (forecastData.daily ?? []).slice(0, 7).map(
    (d: any, i: number) => ({
      day: dayLabel(i),
      icon: mapIcon(d.iconDay),
      temp: unit === "fahrenheit" ? toF(parseInt(d.tempMax)) : parseInt(d.tempMax),
    })
  );

  const todayForecast = forecastData.daily?.[0];
  const highC = todayForecast ? parseInt(todayForecast.tempMax) : tempC + 3;
  const lowC  = todayForecast ? parseInt(todayForecast.tempMin) : tempC - 3;
  const convert = (c: number) => unit === "fahrenheit" ? toF(c) : c;

  console.log("✅ 天气数据组装完成:", cityName, convert(tempC), unit);

  return {
    city: cityName,
    temperature: convert(tempC),
    feelsLike: convert(feelsC),
    condition: now.text,
    humidity: parseInt(now.humidity),
    windSpeed: `${now.windDir} ${now.windScale}级`,
    high: convert(highC),
    low: convert(lowC),
    icon: mapIcon(now.icon),
    forecast,
    unit,
  };
}