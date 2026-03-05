"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

interface UseMbtiReturn {
  selectedMbti: string | null;
  setManualMbti: (mbti: string | null) => void;
}

export function useMbti(): UseMbtiReturn {
  const { user, isAuthenticated } = useAuthStore();
  const [isManual, setIsManual] = useState(false);

  const [selectedMbti, setSelectedMbti] = useState<string | null>(() => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.user?.mbti) return state.user.mbti;
    if (!state.isAuthenticated) return "ENFP";
    return null; // 로그인했지만 MBTI 미설정
  });

  // 로그인/user 변경 시 자동 동기화 (수동 선택 없을 때만)
  useEffect(() => {
    if (isManual) return;
    if (isAuthenticated && user?.mbti) {
      setSelectedMbti(user.mbti);
    } else if (!isAuthenticated) {
      setSelectedMbti("ENFP");
    } else {
      setSelectedMbti(null);
    }
  }, [isAuthenticated, user?.mbti, isManual]);

  const setManualMbti = useCallback((mbti: string | null) => {
    setSelectedMbti(mbti);
    setIsManual(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("recflix-mbti-change", { detail: mbti }));
    }
  }, []);

  // 다른 useMbti 인스턴스 이벤트 수신하여 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const mbti = (e as CustomEvent<string | null>).detail;
      setSelectedMbti(mbti);
      setIsManual(true);
    };
    window.addEventListener("recflix-mbti-change", handler);
    return () => window.removeEventListener("recflix-mbti-change", handler);
  }, []);

  return { selectedMbti, setManualMbti };
}
