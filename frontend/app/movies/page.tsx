"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMovies, getGenres, getPopularMovies } from "@/lib/api";
import type { Movie, Genre } from "@/types";
import MovieModal from "@/components/movie/MovieModal";
import { MovieGridSkeleton } from "@/components/ui/Skeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import MovieSearchFilters from "@/components/movie/MovieSearchFilters";
import MovieGrid from "@/components/movie/MovieGrid";

function MoviesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [useInfiniteMode, setUseInfiniteMode] = useState(false);

  const query = searchParams.get("query") || "";
  const selectedGenre = searchParams.get("genre") || "";
  const sortBy = searchParams.get("sort") || "popularity";
  const hasMore = currentPage < totalPages;

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value.toString());
        }
      });
      router.push(`/movies?${params.toString()}`);
    },
    [searchParams, router]
  );

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await getGenres();
        setGenres(data);
      } catch (error) {
        console.error("Failed to fetch genres:", error);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setCurrentPage(1);
      try {
        const data = await getMovies({
          query: query || undefined,
          genres: selectedGenre || undefined,
          page: 1,
          page_size: 24,
          sort_by: sortBy,
        });
        setMovies(data.items);
        setTotalPages(data.total_pages);

        if (data.items.length === 0 && query) {
          const popular = await getPopularMovies(12);
          setRecommendedMovies(popular);
        } else {
          setRecommendedMovies([]);
        }
      } catch (error) {
        console.error("Failed to fetch movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [query, selectedGenre, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await getMovies({
        query: query || undefined,
        genres: selectedGenre || undefined,
        page: nextPage,
        page_size: 24,
        sort_by: sortBy,
      });
      setMovies((prev) => [...prev, ...data.items]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Failed to load more movies:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore, query, selectedGenre, sortBy]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loadingMore,
    enabled: useInfiniteMode,
  });

  const handleMovieSelect = (movieId: number) => {
    const movie = movies.find((m) => m.id === movieId);
    if (movie) setSelectedMovie(movie);
  };

  const handlePageChange = useCallback(
    async (page: number) => {
      setLoading(true);
      setCurrentPage(page);
      try {
        const data = await getMovies({
          query: query || undefined,
          genres: selectedGenre || undefined,
          page,
          page_size: 24,
          sort_by: sortBy,
        });
        setMovies(data.items);
      } catch (error) {
        console.error("Failed to fetch page:", error);
      } finally {
        setLoading(false);
      }
    },
    [query, selectedGenre, sortBy]
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <MovieSearchFilters
          query={query}
          selectedGenre={selectedGenre}
          sortBy={sortBy}
          genres={genres}
          useInfiniteMode={useInfiniteMode}
          onMovieSelect={handleMovieSelect}
          onParamUpdate={updateParams}
          onClearFilters={() => router.push("/movies")}
          onToggleInfiniteMode={() => setUseInfiniteMode(!useInfiniteMode)}
        />
        <MovieGrid
          movies={movies}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          useInfiniteMode={useInfiniteMode}
          recommendedMovies={recommendedMovies}
          query={query}
          loadMoreRef={loadMoreRef}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}

function MoviesPageLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse mb-6" />
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
        <MovieGridSkeleton count={24} />
      </div>
    </div>
  );
}
export default function MoviesPage() {
  return <Suspense fallback={<MoviesPageLoading />}><MoviesPageContent /></Suspense>;
}
