"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoodType } from "@/types";

interface UseMoodReturn {
  selectedMood: MoodType;
  setManualMood: (mood: MoodType | null) => void;
}

const DEFAULT_MOOD: MoodType = "tense";

export function useMood(): UseMoodReturn {
  const [selectedMood, setSelectedMood] = useState<MoodType>(DEFAULT_MOOD);

  const setManualMood = useCallback((mood: MoodType | null) => {
    const effective = mood ?? DEFAULT_MOOD;
    setSelectedMood(effective);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("recflix-mood-change", { detail: effective }));
    }
  }, []);

  // 다른 useMood 인스턴스 이벤트 수신하여 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const mood = (e as CustomEvent<MoodType>).detail;
      setSelectedMood(mood ?? DEFAULT_MOOD);
    };
    window.addEventListener("recflix-mood-change", handler);
    return () => window.removeEventListener("recflix-mood-change", handler);
  }, []);

  return { selectedMood, setManualMood };
}
