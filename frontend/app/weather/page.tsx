"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sun, CloudRain, Cloud, CloudSnow, RotateCcw } from "lucide-react";
import MovieRow from "@/components/movie/MovieRow";
import HybridMovieRow from "@/components/movie/HybridMovieRow";
import { MovieRowSkeleton } from "@/components/ui/Skeleton";
import { getWeatherPageRecommendations } from "@/lib/api";
import { useWeather } from "@/hooks/useWeather";
import { useAuthStore } from "@/stores/authStore";
import type { HomeRecommendations, WeatherType } from "@/types";

const weatherConfig: Record<WeatherType, { icon: ReactNode; label: string; desc: string; color: string; bg: string }> = {
  sunny: {
    icon: <Sun className="w-8 h-8" />,
    label: "맑음",
    desc: "화창한 날엔 활기찬 영화",
    color: "text-yellow-500",
    bg: "bg-yellow-500/15 border-yellow-500/40",
  },
  rainy: {
    icon: <CloudRain className="w-8 h-8" />,
    label: "비",
    desc: "빗소리와 함께하는 감성 영화",
    color: "text-blue-500",
    bg: "bg-blue-500/15 border-blue-500/40",
  },
  cloudy: {
    icon: <Cloud className="w-8 h-8" />,
    label: "흐림",
    desc: "잔잔하고 깊이 있는 영화",
    color: "text-gray-500",
    bg: "bg-gray-500/15 border-gray-500/40",
  },
  snowy: {
    icon: <CloudSnow className="w-8 h-8" />,
    label: "눈",
    desc: "겨울 감성 가득한 영화",
    color: "text-cyan-500",
    bg: "bg-cyan-500/15 border-cyan-500/40",
  },
};

const WEATHER_TYPES: WeatherType[] = ["sunny", "rainy", "cloudy", "snowy"];

export default function WeatherPage() {
  const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const {
    weather,
    isManual,
    setManualWeather,
    resetToRealWeather,
  } = useWeather({ autoFetch: true });

  const selectedWeather = weather?.condition ?? "sunny";

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getWeatherPageRecommendations(selectedWeather, null, !isAuthenticated ? "ENFP" : undefined);
        if (!cancelled) setRecommendations(data);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [selectedWeather, isAuthenticated]);

  const cfg = weatherConfig[selectedWeather];

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
          오늘 날씨엔 어떤 영화가 좋을까요?
        </h1>
        <p className="text-foreground/60">
          날씨에 따라 달라지는 영화 추천 — 실시간 날씨가 자동으로 반영돼요
        </p>
      </div>

      {/* Weather Selector */}
      <div className="px-4 md:px-8 lg:px-12 mb-10 flex flex-col items-center">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full">
          {WEATHER_TYPES.map((w) => {
            const c = weatherConfig[w];
            const isSelected = selectedWeather === w;
            return (
              <button
                key={w}
                onClick={() => setManualWeather(w)}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? "bg-secondary-500 text-white border-secondary-500 scale-105 shadow-lg shadow-secondary-500/30"
                    : "bg-foreground/5 border-foreground/10 hover:border-secondary-400/50 hover:bg-secondary-500/10 text-foreground/70"
                }`}
              >
                {c.icon}
                <span className="text-sm font-semibold">{c.label}</span>
                <span className="text-xs text-center leading-snug opacity-70 hidden sm:block">
                  {c.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current weather info + reset */}
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-foreground/50">
          {weather?.temperature != null && (
            <span className={`font-medium ${cfg.color}`}>
              {cfg.icon && <span className="inline-block mr-1 align-middle scale-75">{cfg.icon}</span>}
              현재 {weather.temperature}°C · {cfg.label}
            </span>
          )}
          {isManual && (
            <button
              onClick={resetToRealWeather}
              className="flex items-center gap-1 hover:text-foreground transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              실시간 날씨로 복귀
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8 px-4 md:px-8 lg:px-12">
        {loading && (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        )}

        {!loading && recommendations && (
          <>
            {recommendations.hybrid_row && (
              <HybridMovieRow
                title={recommendations.hybrid_row.title}
                description={recommendations.hybrid_row.description}
                movies={recommendations.hybrid_row.movies}
              />
            )}
            {(!isAuthenticated
              ? recommendations.rows.filter(row =>
                  !row.title.startsWith("🎭") && !row.title.startsWith("💫")
                )
              : recommendations.rows
            ).map((row, i) => (
              <MovieRow
                key={`${row.title}-${i}`}
                title={row.title}
                description={row.description}
                movies={row.movies}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
