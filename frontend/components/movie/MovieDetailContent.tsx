"use client";

import { motion } from "framer-motion";
import MovieCard from "@/components/movie/MovieCard";
import type { MovieDetail, Movie } from "@/types";

interface MovieDetailContentProps {
  movie: MovieDetail;
  similar: Movie[];
  overview: string | null;
}

export default function MovieDetailContent({
  movie,
  similar,
  overview,
}: MovieDetailContentProps) {
  return (
    <div className="lg:col-span-2 space-y-8">
      {/* Overview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">줄거리</h2>
        <p className="text-foreground/80 leading-relaxed text-lg">
          {overview || "줄거리 정보가 없습니다."}
        </p>
      </motion.section>

      {/* MBTI Scores */}
      {movie.mbti_scores && Object.keys(movie.mbti_scores).length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">MBTI 추천 점수</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(movie.mbti_scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([mbti, score]) => (
                <div key={mbti} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-foreground/80 font-medium">{mbti}</span>
                  <span className="text-amber-400">{(Number(score) * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </motion.section>
      )}

      {/* Weather Scores */}
      {movie.weather_scores && Object.keys(movie.weather_scores).length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">날씨별 추천</h2>
          <div className="space-y-2">
            {Object.entries(movie.weather_scores)
              .sort(([, a], [, b]) => b - a)
              .map(([weather, score]) => {
                const weatherEmoji: Record<string, string> = { sunny: "☀️", rainy: "🌧️", cloudy: "☁️", snowy: "❄️" };
                const weatherLabel: Record<string, string> = { sunny: "맑은 날", rainy: "비 오는 날", cloudy: "흐린 날", snowy: "눈 오는 날" };
                return (
                  <div key={weather} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-foreground/80">{weatherEmoji[weather]} {weatherLabel[weather]}</span>
                    <span className="text-secondary-500">{(Number(score) * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
        </motion.section>
      )}

      {/* Mood Scores */}
      {movie.emotion_tags && Object.keys(movie.emotion_tags).length > 0 && (() => {
        const et = movie.emotion_tags!;
        const moods = [
          { label: "😌 편안한",          score: et.healing ?? 0 },
          { label: "😨 긴장감",          score: et.tension ?? 0 },
          { label: "😆 신나는",          score: et.energy ?? 0 },
          { label: "❤️ 감성적",         score: ((et.romance ?? 0) + (et.melancholy ?? 0)) / 2 },
          { label: "🚀 상상에빠지고싶은", score: et.fantasy ?? 0 },
          { label: "😄 가볍게",          score: et.light ?? 0 },
        ].sort((a, b) => b.score - a.score);
        return (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">기분별 추천</h2>
            <div className="space-y-2">
              {moods.map(({ label, score }) => (
                <div key={label} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-foreground/80">{label}</span>
                  <span className="text-emerald-500">{(score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </motion.section>
        );
      })()}

      {/* Similar Movies */}
      {similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">비슷한 영화</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {similar.slice(0, 6).map((m, i) => (
              <MovieCard key={m.id} movie={m} index={i} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
