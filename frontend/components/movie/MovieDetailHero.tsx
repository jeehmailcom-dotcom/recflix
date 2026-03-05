"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, Clock, Calendar, ArrowLeft } from "lucide-react";
import { getImageUrl, formatRuntime, formatDate } from "@/lib/utils";
import { useWeather } from "@/hooks/useWeather";
import type { MovieDetail, WeatherType, MoodType } from "@/types";

const WEATHER_OPTIONS: { value: WeatherType; label: string }[] = [
  { value: "sunny",  label: "☀️맑음" },
  { value: "rainy",  label: "🌧비" },
  { value: "cloudy", label: "☁️흐림" },
  { value: "snowy",  label: "🌨눈" },
];

const MOOD_OPTIONS: { value: MoodType; label: string }[] = [
  { value: "comfortable", label: "😌편안한" },
  { value: "tense",       label: "😨긴장감" },
  { value: "exciting",    label: "😆신나는" },
  { value: "emotional",   label: "❤️감성적" },
  { value: "fantasy",     label: "🚀상상에빠지고싶은" },
  { value: "light",       label: "😄가볍게" },
];

interface MovieDetailHeroProps {
  movie: MovieDetail;
  displayTitle: string;
  catchphrase: string | null;
  catchphraseLoading: boolean;
  isFavorited: boolean;
  onFavoriteClick: () => void;
  userRating: number;
  isAuthenticated: boolean;
  onRatingClick: (score: number, weatherContext?: string) => void;
}

export default function MovieDetailHero({
  movie,
  displayTitle,
  catchphrase,
  catchphraseLoading,
  isFavorited,
  onFavoriteClick,
  userRating,
  isAuthenticated,
  onRatingClick,
}: MovieDetailHeroProps) {
  const router = useRouter();
  const [ratingHover, setRatingHover] = useState(0);
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>("sunny");
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);

  const { weather } = useWeather({ autoFetch: true });

  const displayRating = ratingHover || pendingScore || userRating;

  const handleStarClick = (score: number) => {
    if (!isAuthenticated) {
      onRatingClick(score);
      return;
    }
    setPendingScore(score);
    setSelectedWeather(weather?.condition ?? "sunny");
    setSelectedMood(null);
    setContextOpen(true);
  };

  const handleSave = () => {
    if (pendingScore === null) return;
    const context = selectedMood
      ? `${selectedWeather}:${selectedMood}`
      : selectedWeather;
    onRatingClick(pendingScore, context);
    setContextOpen(false);
    setPendingScore(null);
  };

  const handleSkip = () => {
    if (pendingScore === null) return;
    onRatingClick(pendingScore);
    setContextOpen(false);
    setPendingScore(null);
  };

  return (
    <div className="relative h-[60vh] md:h-[70vh]">
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        {movie.poster_path ? (
          <Image
            src={getImageUrl(movie.poster_path, "original")}
            alt={displayTitle}
            fill
            className="object-cover object-top"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="absolute top-4 left-4 md:left-8 z-10 flex items-center space-x-2 px-3 py-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="hidden sm:inline text-sm">뒤로</span>
      </motion.button>

      {/* Hero Content */}
      <div className="absolute bottom-0 left-0 right-0 py-4 md:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Mobile Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden flex-shrink-0 w-28 sm:w-32"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
              {movie.poster_path ? (
                <Image
                  src={getImageUrl(movie.poster_path, "w342")}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Desktop Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:block flex-shrink-0 w-64 lg:w-72"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
              {movie.poster_path ? (
                <Image
                  src={getImageUrl(movie.poster_path, "w500")}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-6xl">🎬</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-1 md:mb-2 line-clamp-2">
              {displayTitle}
            </h1>

            {movie.title_ko && movie.title !== movie.title_ko && (
              <p className="text-foreground/60 text-sm md:text-lg mb-2 md:mb-4 truncate">{movie.title}</p>
            )}

            {/* Catchphrase */}
            <div className="mb-3 sm:mb-4">
              {catchphraseLoading ? (
                <div className="h-6 sm:h-7 w-48 sm:w-64 bg-foreground/10 animate-pulse rounded" />
              ) : (catchphrase || movie.tagline) && (
                <p className="text-foreground/80 italic text-sm sm:text-base md:text-lg line-clamp-2">
                  &quot;{catchphrase || movie.tagline}&quot;
                </p>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs sm:text-sm md:text-base text-foreground/70 mb-4 md:mb-6">
              <div className="flex items-center space-x-1 text-yellow-500">
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
                <span className="text-foreground/50 hidden sm:inline">({movie.vote_count.toLocaleString()})</span>
              </div>
              {movie.release_date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{formatDate(movie.release_date)}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
              )}
              {movie.certification && (
                <span className="px-1.5 md:px-2 py-0.5 border border-foreground/30 rounded text-xs">
                  {movie.certification}
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
              {movie.genres.slice(0, 4).map((genre, index) => {
                const genreName = typeof genre === "string"
                  ? genre
                  : (genre as { name_ko?: string; name: string }).name_ko
                    ?? (genre as { name: string }).name;
                return (
                  <Link
                    key={genreName || index}
                    href={`/movies?genre=${encodeURIComponent(genreName)}`}
                    className="px-2 md:px-3 py-1 bg-[#DA7756] hover:bg-[#c4654a] rounded-full text-xs md:text-sm text-white transition"
                  >
                    {genreName}
                  </Link>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-start gap-2 md:gap-3">
              <button
                onClick={onFavoriteClick}
                className={`flex items-center space-x-1.5 md:space-x-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition text-sm md:text-base ${
                  isFavorited
                    ? "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white"
                    : "bg-foreground/10 hover:bg-foreground/20 active:bg-foreground/30 text-foreground"
                }`}
              >
                <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorited ? "fill-current" : ""}`} />
                <span>{isFavorited ? "찜 완료" : "찜하기"}</span>
              </button>

              {/* Star Rating */}
              <div className="flex items-center gap-1 px-4 md:px-6 py-2.5 md:py-3 bg-foreground/10 hover:bg-foreground/20 rounded-lg transition text-sm md:text-base">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleStarClick(score)}
                    onMouseEnter={() => setRatingHover(score)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${
                        score <= displayRating
                          ? "text-[#DA7756] fill-[#DA7756]"
                          : "text-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && !contextOpen && (
                  <span className="ml-2 font-medium text-[#DA7756]">
                    {userRating.toFixed(1)}
                  </span>
                )}
                {!isAuthenticated && (
                  <Link href="/login" className="ml-2 text-foreground/60 text-sm hover:text-foreground">
                    로그인
                  </Link>
                )}
              </div>
            </div>

            {/* Context Panel */}
            <AnimatePresence>
              {contextOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-foreground/20 space-y-3">
                    <p className="text-sm text-foreground/60">이 영화를 본 날의 날씨와 기분을 기록해보세요</p>
                    <div>
                      <p className="text-xs font-medium text-foreground/50 mb-2">날씨</p>
                      <div className="flex gap-2 flex-wrap">
                        {WEATHER_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setSelectedWeather(value)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                              selectedWeather === value
                                ? "bg-primary-500 border-primary-500 text-white"
                                : "bg-foreground/10 border-foreground/20 text-foreground/70 hover:border-primary-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/50 mb-2">기분</p>
                      <div className="flex gap-2 flex-wrap">
                        {MOOD_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setSelectedMood(value)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                              selectedMood === value
                                ? "bg-secondary-500 border-secondary-500 text-white"
                                : "bg-foreground/10 border-foreground/20 text-foreground/70 hover:border-secondary-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition"
                      >
                        저장하기
                      </button>
                      <button
                        onClick={handleSkip}
                        className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground/60 text-sm rounded-lg transition"
                      >
                        건너뛰기
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
