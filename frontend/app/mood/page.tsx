"use client";

import { useState, useEffect } from "react";
import MovieRow from "@/components/movie/MovieRow";
import HybridMovieRow from "@/components/movie/HybridMovieRow";
import { MovieRowSkeleton } from "@/components/ui/Skeleton";
import { getMoodPageRecommendations, getHomeRecommendations } from "@/lib/api";
import { useWeather } from "@/hooks/useWeather";
import { useMood } from "@/hooks/useMood";
import { useAuthStore } from "@/stores/authStore";
import type { HomeRecommendations, MoodType } from "@/types";

const moodConfig: Record<MoodType, { emoji: string; label: string; desc: string; color: string }> = {
  comfortable: { emoji: "😌", label: "편안한",       desc: "마음이 차분하게 가라앉을 때",      color: "bg-green-500/15 border-green-500/40 text-green-700" },
  tense:       { emoji: "😰", label: "긴장감",       desc: "손에 땀을 쥐는 긴장감 원할 때",    color: "bg-yellow-500/15 border-yellow-500/40 text-yellow-700" },
  exciting:    { emoji: "😆", label: "신나는",       desc: "에너지가 넘쳐흐를 때",             color: "bg-orange-500/15 border-orange-500/40 text-orange-700" },
  emotional:   { emoji: "💕", label: "감성적",       desc: "감정에 젖어들고 싶을 때",          color: "bg-pink-500/15 border-pink-500/40 text-pink-700" },
  fantasy:     { emoji: "🔮", label: "상상에빠지고싶은", desc: "상상의 세계로 빠져들고 싶을 때",color: "bg-secondary-500/15 border-secondary-500/40 text-secondary-700" },
  light:       { emoji: "😄", label: "가볍게",       desc: "부담 없이 즐기고 싶을 때",         color: "bg-cyan-500/15 border-cyan-500/40 text-cyan-700" },
};

const moodRow1: MoodType[] = ["comfortable", "tense", "exciting"];
const moodRow2: MoodType[] = ["emotional", "fantasy", "light"];

export default function MoodPage() {
  const { selectedMood, setManualMood } = useMood();
  const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { weather } = useWeather({ autoFetch: true });
  const weatherCondition = weather?.condition ?? "sunny";

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getMoodPageRecommendations(selectedMood || "tense", weatherCondition, isAuthenticated ? undefined : "ENFP");
        // 비로그인 시 hybrid_row 없으면 getHomeRecommendations에서 가져옴
        let finalData = data;
        if (!isAuthenticated && !data.hybrid_row) {
          try {
            const homeData = await getHomeRecommendations(weatherCondition, selectedMood || "tense", "ENFP");
            if (homeData.hybrid_row) {
              finalData = { ...data, hybrid_row: homeData.hybrid_row };
            }
          } catch {
            // fallback 실패 시 그냥 진행
          }
        }
        if (!cancelled) setRecommendations(finalData);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [selectedMood, weatherCondition, isAuthenticated]);

  const handleMoodSelect = (mood: MoodType) => {
    setManualMood(selectedMood === mood ? null : mood);
    if (selectedMood !== mood) setRecommendations(null);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
          지금 기분이 어떠세요?
        </h1>
        <p className="text-foreground/60">
          현재 기분을 선택하면 딱 맞는 영화를 추천해 드릴게요
        </p>
      </div>

      {/* Mood Grid */}
      <div className="px-4 md:px-8 lg:px-12 mb-10 flex justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl w-full">
          {[...moodRow1, ...moodRow2].map((mood) => {
            const cfg = moodConfig[mood];
            const isSelected = selectedMood === mood || (selectedMood === null && mood === "tense");
            return (
              <button
                key={mood}
                onClick={() => handleMoodSelect(mood)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-500 text-white border-emerald-500 scale-105 shadow-lg shadow-emerald-500/30"
                    : "bg-foreground/5 border-foreground/10 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                }`}
              >
                <span className="text-3xl">{cfg.emoji}</span>
                <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-foreground/80"}`}>
                  {cfg.label}
                </span>
                <span className={`text-xs text-center leading-snug hidden sm:block ${isSelected ? "text-white/80" : "text-foreground/40"}`}>
                  {cfg.desc}
                </span>
              </button>
            );
          })}
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
              ? recommendations.rows
                  .filter(row =>
                    !row.title.startsWith("🎭") && !row.title.startsWith("💫") && !row.title.startsWith("🌤️")
                  )
                  .map((row, i) =>
                    i === 0
                      ? { ...row, title: "🎬 지금 기분 추천", description: "지금 기분에 딱 맞는 영화를 골랐어요" }
                      : row
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
