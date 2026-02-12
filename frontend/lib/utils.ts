import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 클래스 병합 유틸리티
 * clsx로 조건부 클래스 처리 후 tailwind-merge로 충돌 해결
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * TMDB 이미지 URL 생성
 * @param path - TMDB 이미지 경로 (poster_path, backdrop_path 등)
 * @param size - 이미지 크기 (w185, w200, w300, w342, w500, w780, original)
 * @returns 완성된 TMDB 이미지 URL 또는 대체 이미지 경로
 */
export function getImageUrl(
  path: string | null | undefined,
  size: "w92" | "w154" | "w185" | "w200" | "w300" | "w342" | "w500" | "w780" | "original" = "w500"
): string {
  if (!path) {
    return "/images/no-poster.png";
  }

  const baseUrl = "https://image.tmdb.org/t/p";
  return `${baseUrl}/${size}${path}`;
}

/**
 * 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷
 * @param date - ISO 날짜 문자열 또는 Date 객체
 * @returns 포맷된 날짜 문자열 또는 "미정"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return "미정";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "미정";
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}년 ${month}월 ${day}일`;
}

/**
 * 분 단위의 런타임을 "Xh Ym" 형식으로 포맷
 * @param minutes - 분 단위 런타임
 * @returns 포맷된 런타임 문자열 또는 "정보 없음"
 */
export function formatRuntime(
  minutes: number | null | undefined
): string {
  if (!minutes || minutes <= 0) {
    return "정보 없음";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * MBTI 타입별 색상 반환
 * @param mbti - 16개 MBTI 타입 중 하나
 * @returns Tailwind 색상 클래스명 또는 기본 색상
 */
export function getMBTIColor(mbti: string | null | undefined): string {
  const mbtiColorMap: Record<string, string> = {
    // Extrovert - warm colors
    ENFP: "purple",
    ENFJ: "pink",
    ENTJ: "red",
    ENTP: "orange",

    // Extrovert - cool colors
    ESFJ: "blue",
    ESFP: "cyan",
    ESTJ: "slate",
    ESTP: "amber",

    // Introvert - warm colors
    INFP: "indigo",
    INFJ: "violet",
    INTJ: "blue",
    INTP: "emerald",

    // Introvert - cool colors
    ISFJ: "teal",
    ISFP: "green",
    ISTJ: "cyan",
    ISTP: "gray",
  };

  return mbtiColorMap[mbti?.toUpperCase() || ""] || "gray";
}
