"use client";

import { useState, useEffect } from "react";
import MovieRow from "@/components/movie/MovieRow";
import HybridMovieRow from "@/components/movie/HybridMovieRow";
import { MovieRowSkeleton } from "@/components/ui/Skeleton";
import { getHomeRecommendations } from "@/lib/api";
import { useWeather } from "@/hooks/useWeather";
import { useAuthStore } from "@/stores/authStore";
import type { HomeRecommendations, MoodType } from "@/types";

const moodConfig: Record<MoodType, { emoji: string; label: string; desc: string; color: string }> = {
  calm:     { emoji: "🙂", label: "평온한",     desc: "마음이 차분하게 가라앉을 때",  color: "bg-green-500/20 border-green-500/50 text-green-300" },
  energetic:{ emoji: "😄", label: "활기찬",     desc: "에너지가 넘쳐흐를 때",         color: "bg-orange-500/20 border-orange-500/50 text-orange-300" },
  gloomy:   { emoji: "😢", label: "울적한",     desc: "감정에 젖어들고 싶을 때",      color: "bg-blue-500/20 border-blue-500/50 text-blue-300" },
  stifled:  { emoji: "😤", label: "답답한",     desc: "속이 뻥 뚫리는 영화가 필요할 때", color: "bg-red-500/20 border-red-500/50 text-red-300" },
  soft:     { emoji: "💕", label: "몽글몽글한", desc: "설레는 감정을 채우고 싶을 때", color: "bg-pink-500/20 border-pink-500/50 text-pink-300" },
  tense:    { emoji: "😬", label: "긴장된",     desc: "손에 땀을 쥐는 긴장감 원할 때", color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" },
  empty:    { emoji: "😶", label: "공허한",     desc: "마음 한켠이 비어있을 때",      color: "bg-purple-500/20 border-purple-500/50 text-purple-300" },
  joyful:   { emoji: "🤣", label: "유쾌한",     desc: "웃음이 터지는 영화가 보고 싶을 때", color: "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" },
};

const moodRow1: MoodType[] = ["calm", "energetic", "gloomy", "stifled"];
const moodRow2: MoodType[] = ["soft", "tense", "empty", "joyful"];

export default function MoodPage() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { weather } = useWeather({ autoFetch: true });
  const weatherCondition = weather?.condition ?? "sunny";

  useEffect(() => {
    if (!selectedMood) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getHomeRecommendations(weatherCondition, selectedMood);
        setRecommendations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [selectedMood, weatherCondition, isAuthenticated]);

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood((prev) => (prev === mood ? null : mood));
    if (selectedMood !== mood) setRecommendations(null);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          지금 기분이 어떠세요?
        </h1>
        <p className="text-white/60">
          현재 기분을 선택하면 딱 맞는 영화를 추천해 드릴게요
        </p>
      </div>

      {/* Mood Grid */}
      <div className="px-4 md:px-8 lg:px-12 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {[...moodRow1, ...moodRow2].map((mood) => {
            const cfg = moodConfig[mood];
            const isSelected = selectedMood === mood;
            return (
              <button
                key={mood}
                onClick={() => handleMoodSelect(mood)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? `${cfg.color} scale-105 shadow-lg`
                    : "bg-dark-100/60 border-white/10 hover:border-white/30 hover:bg-dark-100"
                }`}
              >
                <span className="text-3xl">{cfg.emoji}</span>
                <span className={`text-sm font-semibold ${isSelected ? "" : "text-white"}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-white/50 text-center leading-snug hidden sm:block">
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

        {!loading && selectedMood && recommendations && (
          <>
            {recommendations.hybrid_row && (
              <HybridMovieRow
                title={recommendations.hybrid_row.title}
                description={recommendations.hybrid_row.description}
                movies={recommendations.hybrid_row.movies}
              />
            )}
            {recommendations.rows.map((row, i) => (
              <MovieRow
                key={`${row.title}-${i}`}
                title={row.title}
                description={row.description}
                movies={row.movies}
              />
            ))}
          </>
        )}

        {!selectedMood && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="text-6xl mb-4">🎬</span>
            <p className="text-lg">기분을 선택하면 추천이 시작됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
