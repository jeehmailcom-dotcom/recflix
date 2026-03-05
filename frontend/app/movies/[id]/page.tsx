"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMovie, getSimilarMovies, getCatchphrase } from "@/lib/api";
import { useInteractionStore } from "@/stores/interactionStore";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/Skeleton";
import MovieDetailHero from "@/components/movie/MovieDetailHero";
import MovieDetailContent from "@/components/movie/MovieDetailContent";
import MovieDetailSidebar from "@/components/movie/MovieDetailSidebar";
import type { MovieDetail, Movie } from "@/types";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = Number(params.id);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catchphrase, setCatchphrase] = useState<string | null>(null);
  const [catchphraseLoading, setCatchphraseLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { interactions, fetchInteraction, toggleFavorite, setRating } = useInteractionStore();
  const interaction = interactions[movieId];

  useEffect(() => {
    const fetchData = async () => {
      if (!movieId || isNaN(movieId)) {
        setError("Invalid movie ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setCatchphrase(null);
      try {
        const [movieData, similarData] = await Promise.all([
          getMovie(movieId),
          getSimilarMovies(movieId, 12),
        ]);
        setMovie(movieData);
        setSimilar(similarData);

        setCatchphraseLoading(true);
        getCatchphrase(movieId)
          .then((res) => setCatchphrase(res.catchphrase))
          .catch(() => setCatchphrase(movieData.tagline || null))
          .finally(() => setCatchphraseLoading(false));

        if (isAuthenticated) {
          await fetchInteraction(movieId);
        }
      } catch (err) {
        console.error("Failed to fetch movie:", err);
        setError("영화 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [movieId, isAuthenticated, fetchInteraction]);

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    try {
      await toggleFavorite(movieId);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleRatingClick = async (score: number, weatherContext?: string) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    try {
      await setRating(movieId, score, weatherContext);
    } catch (error) {
      console.error("Failed to set rating:", error);
    }
  };

  if (loading) return <MovieDetailSkeleton />;

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-500 text-lg mb-4">{error || "영화를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = movie.title_ko || movie.title;
  const overview = movie.overview_ko || movie.overview;

  return (
    <div className="min-h-screen bg-background">
      <MovieDetailHero
        movie={movie}
        displayTitle={displayTitle}
        catchphrase={catchphrase}
        catchphraseLoading={catchphraseLoading}
        isFavorited={interaction?.is_favorited ?? false}
        onFavoriteClick={handleFavoriteClick}
        userRating={interaction?.rating ?? 0}
        isAuthenticated={isAuthenticated}
        onRatingClick={handleRatingClick}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <MovieDetailContent
            movie={movie}
            similar={similar}
            overview={overview}
          />
          <MovieDetailSidebar movie={movie} />
        </div>
      </div>
    </div>
  );
}

function MovieDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] md:h-[70vh]">
        <Skeleton className="absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="hidden md:block w-64 lg:w-72">
              <Skeleton className="aspect-[2/3] rounded-lg" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-12 w-32 rounded-lg" />
                <Skeleton className="h-12 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-32 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
