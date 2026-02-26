"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import type { Genre } from "@/types";

const SORT_OPTIONS = [
  { value: "popularity", label: "인기순" },
  { value: "vote_average", label: "평점순" },
  { value: "release_date", label: "최신순" },
];

interface MovieSearchFiltersProps {
  query: string;
  selectedGenre: string;
  sortBy: string;
  genres: Genre[];
  useInfiniteMode: boolean;
  onMovieSelect: (movieId: number) => void;
  onParamUpdate: (updates: Record<string, string | number | null>) => void;
  onClearFilters: () => void;
  onToggleInfiniteMode: () => void;
}

export default function MovieSearchFilters({
  query,
  selectedGenre,
  sortBy,
  genres,
  useInfiniteMode,
  onMovieSelect,
  onParamUpdate,
  onClearFilters,
  onToggleInfiniteMode,
}: MovieSearchFiltersProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">영화 검색</h1>

      <div className="mb-6">
        <SearchAutocomplete
          onMovieSelect={onMovieSelect}
          placeholder="영화 제목, 배우, 감독을 검색하세요..."
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={selectedGenre}
          onChange={(e) => onParamUpdate({ genre: e.target.value })}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-foreground focus:outline-none focus:border-primary-500 transition"
        >
          <option value="">모든 장르</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.name_ko || genre.name}>
              {genre.name_ko || genre.name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onParamUpdate({ sort: e.target.value })}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-foreground focus:outline-none focus:border-primary-500 transition"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={onToggleInfiniteMode}
          className={`px-4 py-2.5 rounded-lg transition flex items-center space-x-2 ${
            useInfiniteMode
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-foreground/60 hover:bg-gray-200"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>무한 스크롤</span>
        </button>

        {(query || selectedGenre) && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-foreground rounded-lg transition"
          >
            필터 초기화
          </button>
        )}
      </div>

      {query && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center space-x-2"
        >
          <span className="text-foreground/60">검색어:</span>
          <span className="px-3 py-1 bg-primary-600/20 text-primary-600 rounded-full text-sm">
            &quot;{query}&quot;
          </span>
        </motion.div>
      )}
    </div>
  );
}
