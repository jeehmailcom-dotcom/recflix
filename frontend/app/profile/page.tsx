"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { getMBTIColor, getImageUrl } from "@/lib/utils";
import { getFavorites, getMyRatings } from "@/lib/api";
import type { MBTIType, Movie, RatingWithMovie } from "@/types";

const MBTI_TYPES: MBTIType[] = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser, updateMBTI, logout } = useAuthStore();
  const [selectedMBTI, setSelectedMBTI] = useState("");
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [ratedMovies, setRatedMovies] = useState<RatingWithMovie[]>([]);
  const [ratedLoading, setRatedLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchUser();
  }, [isAuthenticated, router, fetchUser]);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const data = await getFavorites(1, 8);
      setFavorites(data);
    } catch {
      setFavorites([]);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  const loadRatedMovies = useCallback(async () => {
    setRatedLoading(true);
    try {
      const data = await getMyRatings(1, 8);
      setRatedMovies(data);
    } catch {
      setRatedMovies([]);
    } finally {
      setRatedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
      loadRatedMovies();
    }
  }, [isAuthenticated, loadFavorites, loadRatedMovies]);

  useEffect(() => {
    if (user?.mbti) {
      setSelectedMBTI(user.mbti);
    }
  }, [user]);

  const handleMBTIChange = async (mbti: string) => {
    setSelectedMBTI(mbti);
    setSaving(true);
    try {
      await updateMBTI(mbti);
    } catch (error) {
      console.error("Failed to update MBTI:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white border border-gray-100 rounded-lg p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{user.nickname}</h1>
                <p className="text-foreground/60">{user.email}</p>
                {user.mbti && (
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm text-white ${getMBTIColor(user.mbti)}`}>
                    {user.mbti}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* MBTI Selection */}
        <div className="bg-white border border-gray-100 rounded-lg p-8 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-4">MBTI 설정</h2>
          <p className="text-foreground/60 mb-6">
            MBTI를 설정하면 성격에 맞는 영화를 추천받을 수 있어요.
          </p>

          <div className="grid grid-cols-4 gap-3">
            {MBTI_TYPES.map((mbti) => (
              <button
                key={mbti}
                onClick={() => handleMBTIChange(mbti)}
                disabled={saving}
                className={`py-3 px-2 rounded-xl border font-medium transition-all duration-200 ${
                  selectedMBTI === mbti
                    ? "bg-primary-500 border-primary-500 text-white scale-105 shadow-lg"
                    : "bg-white border-gray-200 hover:border-secondary-300 hover:bg-secondary-50 text-foreground/70"
                }`}
              >
                {mbti}
              </button>
            ))}
          </div>

          {saving && (
            <p className="text-primary-500 text-sm mt-4">저장 중...</p>
          )}
        </div>

        {/* 찜한 영화 */}
        <div className="bg-white border border-gray-100 rounded-lg p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground">찜한 영화</h2>
            <Link
              href="/favorites"
              className="text-sm text-primary-500 hover:text-primary-600 transition"
            >
              전체보기 →
            </Link>
          </div>

          {favoritesLoading ? (
            <div className="flex space-x-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24">
                  <div className="w-24 h-36 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-foreground/40">
              <span className="text-4xl mb-3">🎬</span>
              <p className="text-sm">아직 찜한 영화가 없어요</p>
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto hide-scrollbar pb-1">
              {favorites.map((movie) => {
                const title = movie.title_ko || movie.title;
                return (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.id}`}
                    className="flex-shrink-0 w-24 group"
                  >
                    <div className="relative w-24 h-36 rounded-lg overflow-hidden bg-gray-100">
                      {movie.poster_path ? (
                        <Image
                          src={getImageUrl(movie.poster_path, "w185")}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl text-foreground/20">🎬</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-foreground/70 truncate group-hover:text-primary-500 transition">
                      {title}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 내가 평점 준 영화 */}
        <div className="bg-white border border-gray-100 rounded-lg p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground">내가 평점 준 영화</h2>
            <Link
              href="/ratings"
              className="text-sm text-primary-500 hover:text-primary-600 transition"
            >
              전체보기 →
            </Link>
          </div>

          {ratedLoading ? (
            <div className="flex space-x-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24">
                  <div className="w-24 h-36 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : ratedMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-foreground/40">
              <span className="text-4xl mb-3">⭐</span>
              <p className="text-sm">아직 평점을 준 영화가 없어요</p>
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto hide-scrollbar pb-1">
              {ratedMovies.map((rating) => {
                const movie = rating.movie;
                const title = movie.title_ko || movie.title;
                return (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.id}`}
                    className="flex-shrink-0 w-24 group"
                  >
                    <div className="relative w-24 h-36 rounded-lg overflow-hidden bg-gray-100">
                      {movie.poster_path ? (
                        <Image
                          src={getImageUrl(movie.poster_path, "w185")}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl text-foreground/20">🎬</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-foreground/70 truncate group-hover:text-primary-500 transition">
                      {title}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
