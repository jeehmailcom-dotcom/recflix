"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";
import MovieCard from "@/components/movie/MovieCard";
import type { MovieDetail, Movie } from "@/types";

interface MovieDetailContentProps {
  movie: MovieDetail;
  similar: Movie[];
  overview: string | null;
  userRating: number;
  isAuthenticated: boolean;
  onRatingClick: (score: number) => void;
}

export default function MovieDetailContent({
  movie,
  similar,
  overview,
  userRating,
  isAuthenticated,
  onRatingClick,
}: MovieDetailContentProps) {
  const [ratingHover, setRatingHover] = useState(0);
  const displayRating = ratingHover || userRating;

  return (
    <div className="lg:col-span-2 space-y-8">
      {/* User Rating */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">내 평점</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => onRatingClick(score)}
                onMouseEnter={() => setRatingHover(score)}
                onMouseLeave={() => setRatingHover(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    score <= displayRating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-foreground/20"
                  }`}
                />
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <span className="text-2xl font-bold text-yellow-400">
              {userRating.toFixed(1)}
            </span>
          )}
          {!isAuthenticated && (
            <Link href="/login" className="text-primary-500 text-sm hover:underline">
              로그인하고 평점 남기기
            </Link>
          )}
        </div>
      </motion.section>

      {/* Overview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">줄거리</h2>
        <p className="text-foreground/80 leading-relaxed text-lg">
          {overview || "줄거리 정보가 없습니다."}
        </p>
      </motion.section>

      {/* Cast */}
      {movie.cast_members && movie.cast_members.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>출연진</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {movie.cast_members.slice(0, 8).map((person) => (
              <Link
                key={person.id}
                href={`/movies?query=${encodeURIComponent(person.name)}`}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-100 hover:bg-gray-50 rounded-lg transition shadow-sm"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-foreground/30" />
                </div>
                <span className="text-foreground/80 text-sm truncate">{person.name}</span>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Similar Movies */}
      {similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">비슷한 영화</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {similar.slice(0, 6).map((m, i) => (
              <MovieCard key={m.id} movie={m} index={i} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
