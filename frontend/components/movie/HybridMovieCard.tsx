"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Eye } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import MovieModal from "./MovieModal";
import type { HybridMovie, RecommendationTag } from "@/types";

interface HybridMovieCardProps {
  movie: HybridMovie;
  index?: number;
  showQuickView?: boolean;
}

function RecommendationTagBadge({ tag }: { tag: RecommendationTag }) {
  console.log("[TagBadge] tag.type:", tag.type, "| tag.label:", tag.label);
  const colorClass =
    tag.type === "mbti"     ? "bg-primary-500 text-white" :
    tag.type === "weather"  ? "bg-secondary-500 text-white" :
    tag.type === "mood"     ? "bg-emerald-100 text-emerald-700" :
    tag.type === "personal" ? "bg-secondary-400 text-white" :
    tag.type === "rating"   ? "bg-yellow-500 text-white" :
    tag.type === "popular"  ? "bg-orange-500 text-white" :
                              "bg-gray-400 text-white";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide shadow-sm ${colorClass}`}
    >
      {tag.label}
    </span>
  );
}

export default function HybridMovieCard({ movie, index = 0, showQuickView = true }: HybridMovieCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const displayTitle = movie.title_ko || movie.title;
  const year = movie.release_date?.split("-")[0];

  // Show top 3 tags (mbti + weather + mood)
  const displayTags = movie.recommendation_tags.slice(0, 3);

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="flex-shrink-0 w-[160px] sm:w-[180px] group"
      >
        <Link href={`/movies/${movie.id}`}>
          {/* Poster Container */}
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 ring-2 ring-primary-500/30 transition-all duration-300 cursor-pointer">
            {movie.poster_path && !imageError ? (
              <Image
                src={getImageUrl(movie.poster_path, "w342")}
                alt={displayTitle}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
                sizes="(max-width: 640px) 160px, 180px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-foreground/30 text-4xl">🎬</span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {/* Rating */}
                <div className="flex items-center justify-center space-x-1 text-sm mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-medium">
                    {movie.vote_average.toFixed(1)}
                  </span>
                </div>

                <p className="text-sm text-white/80 text-center mb-2">상세보기</p>

                {/* Quick View Button */}
                {showQuickView && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleQuickView}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs text-white transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>미리보기</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hybrid Score Badge */}
            {movie.hybrid_score > 0 && (
              <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {Math.round(movie.hybrid_score * 100)}%
              </div>
            )}
          </div>

          {/* Info - 중앙 정렬 */}
          <div className="mt-2 space-y-1 text-center">
            <h3 className="text-foreground font-medium text-sm truncate group-hover:text-primary-400 transition">
              {displayTitle}
            </h3>

            <div className="flex items-center justify-center gap-1.5 text-xs text-foreground/50">
              {year && <span>{year}</span>}
              {movie.genres.length > 0 && (
                <>
                  <span>·</span>
                  <span className="truncate">{typeof movie.genres[0] === 'string' ? movie.genres[0] : (movie.genres[0] as any)?.name_ko || (movie.genres[0] as any)?.name}</span>
                </>
              )}
            </div>

            {/* Recommendation Tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                {displayTags.map((tag, i) => (
                  <RecommendationTagBadge key={`${tag.type}-${i}`} tag={tag} />
                ))}
              </div>
            )}
          </div>
        </Link>
      </motion.div>

      {/* Movie Modal */}
      {isModalOpen && (
        <MovieModal movie={movie} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
