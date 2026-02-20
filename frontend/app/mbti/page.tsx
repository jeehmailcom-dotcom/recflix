"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MovieRow from "@/components/movie/MovieRow";
import HybridMovieRow from "@/components/movie/HybridMovieRow";
import { MovieRowSkeleton } from "@/components/ui/Skeleton";
import { getHomeRecommendations } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { getMBTIColor } from "@/lib/utils";
import { useWeather } from "@/hooks/useWeather";
import type { HomeRecommendations, MBTIType } from "@/types";

const MBTI_TYPES: MBTIType[] = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const MBTI_DESCRIPTIONS: Partial<Record<MBTIType, string>> = {
  INTJ: "전략적 사색가",   INTP: "논리적 탐구자",
  ENTJ: "대담한 리더",     ENTP: "창의적 토론자",
  INFJ: "통찰력 있는 이상주의자", INFP: "열정적인 중재자",
  ENFJ: "카리스마 있는 리더", ENFP: "자유로운 영혼",
  ISTJ: "청렴결백한 논리주의자", ISFJ: "용감한 수호자",
  ESTJ: "엄격한 관리자",   ESFJ: "사교적인 외교관",
  ISTP: "만능 재주꾼",     ISFP: "호기심 많은 예술가",
  ESTP: "모험을 즐기는 사업가", ESFP: "자유로운 연예인",
};

export default function MBTIPage() {
  const { isAuthenticated, user, updateMBTI } = useAuthStore();
  const { weather } = useWeather({ autoFetch: true });
  const weatherCondition = weather?.condition ?? "sunny";

  // 로그인 시 유저 MBTI, 비로그인 시 임시 선택
  const [selectedMBTI, setSelectedMBTI] = useState<MBTIType | null>(null);
  const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 로그인 유저의 MBTI 초기값 적용
  useEffect(() => {
    if (user?.mbti) {
      setSelectedMBTI(user.mbti as MBTIType);
    }
  }, [user?.mbti]);

  // 추천 로드 (MBTI 선택 시 서버가 토큰에서 MBTI를 읽으므로 파라미터 불필요)
  useEffect(() => {
    if (!selectedMBTI) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getHomeRecommendations(weatherCondition);
        setRecommendations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [selectedMBTI, weatherCondition, isAuthenticated]);

  const handleMBTISelect = async (mbti: MBTIType) => {
    setSelectedMBTI(mbti);
    setRecommendations(null);

    // 로그인 상태면 서버에 저장
    if (isAuthenticated) {
      setSaving(true);
      try {
        await updateMBTI(mbti);
      } catch (err) {
        console.error("MBTI 저장 실패:", err);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          당신의 MBTI는 무엇인가요?
        </h1>
        <p className="text-white/60">
          MBTI 성격 유형에 딱 맞는 영화를 추천해 드릴게요
        </p>
      </div>

      {/* Non-logged-in notice */}
      {!isAuthenticated && (
        <div className="mx-4 md:mx-8 lg:mx-12 mb-6 px-4 py-3 bg-primary-600/20 border border-primary-500/40 rounded-xl text-sm text-primary-300 flex items-center gap-2">
          <span>💡</span>
          <span>
            지금은 임시 선택이에요.{" "}
            <Link href="/login" className="underline hover:text-white transition">
              로그인
            </Link>
            하면 MBTI가 저장되고 더 정확한 추천을 받을 수 있어요.
          </span>
        </div>
      )}

      {/* MBTI Grid */}
      <div className="px-4 md:px-8 lg:px-12 mb-10">
        <div className="grid grid-cols-4 gap-2 max-w-xl">
          {MBTI_TYPES.map((mbti) => {
            const isSelected = selectedMBTI === mbti;
            return (
              <button
                key={mbti}
                onClick={() => handleMBTISelect(mbti)}
                disabled={saving}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? `${getMBTIColor(mbti)} border-transparent text-white scale-105 shadow-lg`
                    : "bg-dark-100/60 border-white/10 hover:border-white/30 hover:bg-dark-100 text-white/70"
                }`}
              >
                <span className="text-sm font-bold">{mbti}</span>
                <span className="text-[10px] leading-snug text-center opacity-70 hidden sm:block">
                  {MBTI_DESCRIPTIONS[mbti]}
                </span>
              </button>
            );
          })}
        </div>

        {saving && (
          <p className="text-primary-400 text-sm mt-3">저장 중...</p>
        )}
        {isAuthenticated && selectedMBTI && !saving && (
          <p className="text-green-400 text-sm mt-3">
            ✓ {selectedMBTI} 저장됨
          </p>
        )}
      </div>

      {/* Results */}
      <div className="space-y-8 px-4 md:px-8 lg:px-12">
        {loading && (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        )}

        {!loading && selectedMBTI && recommendations && (
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

        {!selectedMBTI && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="text-6xl mb-4">🧠</span>
            <p className="text-lg">MBTI를 선택하면 추천이 시작됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
