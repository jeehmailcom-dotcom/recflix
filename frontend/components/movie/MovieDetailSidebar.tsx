"use client";

import { motion } from "framer-motion";
import { Globe, Tag } from "lucide-react";
import type { MovieDetail } from "@/types";

interface MovieDetailSidebarProps {
  movie: MovieDetail;
}

export default function MovieDetailSidebar({ movie }: MovieDetailSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      {/* Movie Info Card */}
      <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-foreground">영화 정보</h3>

        {movie.countries && movie.countries.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 text-foreground/50 text-sm mb-1">
              <Globe className="w-4 h-4" />
              <span>제작 국가</span>
            </div>
            <p className="text-foreground/80">{movie.countries.join(", ")}</p>
          </div>
        )}

        {movie.keywords && movie.keywords.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 text-foreground/50 text-sm mb-2">
              <Tag className="w-4 h-4" />
              <span>키워드</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {movie.keywords.slice(0, 10).map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-1 bg-gray-100 rounded text-xs text-foreground/60"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-foreground/50 text-sm mb-1">인기도</p>
          <p className="text-foreground/80">{movie.popularity.toFixed(1)}</p>
        </div>
      </div>

      {/* MBTI Scores */}
      {movie.mbti_scores && Object.keys(movie.mbti_scores).length > 0 && (
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">MBTI 추천 점수</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(movie.mbti_scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([mbti, score]) => (
                <div
                  key={mbti}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-foreground/80 font-medium">{mbti}</span>
                  <span className="text-primary-500">
                    {(Number(score) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Weather Scores */}
      {movie.weather_scores && Object.keys(movie.weather_scores).length > 0 && (
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">날씨별 추천</h3>
          <div className="space-y-2">
            {Object.entries(movie.weather_scores)
              .sort(([, a], [, b]) => b - a)
              .map(([weather, score]) => {
                const weatherEmoji: Record<string, string> = {
                  sunny: "☀️",
                  rainy: "🌧️",
                  cloudy: "☁️",
                  snowy: "❄️",
                };
                const weatherLabel: Record<string, string> = {
                  sunny: "맑은 날",
                  rainy: "비 오는 날",
                  cloudy: "흐린 날",
                  snowy: "눈 오는 날",
                };
                return (
                  <div
                    key={weather}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-foreground/80">
                      {weatherEmoji[weather]} {weatherLabel[weather]}
                    </span>
                    <span className="text-secondary-500">
                      {(Number(score) * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.aside>
  );
}
