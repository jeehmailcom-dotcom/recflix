"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, Heart, Star, User, LogOut, Home, Brain, Cloud, Smile, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useWeather } from "@/hooks/useWeather";
import type { WeatherType, MoodType } from "@/types";

const weatherConfig: Record<WeatherType, { emoji: string; label: string }> = {
  sunny:  { emoji: "☀️",  label: "맑음" },
  rainy:  { emoji: "🌧️", label: "비"   },
  cloudy: { emoji: "☁️",  label: "흐림" },
  snowy:  { emoji: "❄️",  label: "눈"   },
};

const moodConfig: Record<MoodType, { emoji: string; label: string }> = {
  comfortable: { emoji: "😌", label: "편안한" },
  tense:       { emoji: "😰", label: "긴장된" },
  exciting:    { emoji: "😆", label: "활기찬" },
  emotional:   { emoji: "💕", label: "감성적" },
  fantasy:     { emoji: "🔮", label: "상상에빠진" },
  light:       { emoji: "😄", label: "유쾌한" },
};

const MOOD_ORDER: MoodType[] = ["comfortable", "tense", "exciting", "emotional", "fantasy", "light"];

const MBTI_LIST = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();

  useEffect(() => {
    console.log("[Header] isAuthenticated:", isAuthenticated, "| user:", user, "| user.mbti:", user?.mbti);
  }, [isAuthenticated, user]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [weatherDropdownOpen, setWeatherDropdownOpen] = useState(false);
  const weatherDropdownRef = useRef<HTMLDivElement>(null);
  const [moodDropdownOpen, setMoodDropdownOpen] = useState(false);
  const moodDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>("tense");
  const [mbtiDropdownOpen, setMbtiDropdownOpen] = useState(false);
  const mbtiDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMbti, setSelectedMbti] = useState<string | null>(() => {
    const state = useAuthStore.getState();
    return state.isAuthenticated && state.user?.mbti ? state.user.mbti : "ENFP";
  });

  const { weather, setManualWeather, resetToRealWeather } = useWeather({ autoFetch: true });
  const [geoGranted, setGeoGranted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Check geolocation permission
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setGeoGranted(result.state === "granted");
      result.onchange = () => setGeoGranted(result.state === "granted");
    }).catch(() => {});
  }, []);

  // Close weather dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (weatherDropdownRef.current && !weatherDropdownRef.current.contains(e.target as Node)) {
        setWeatherDropdownOpen(false);
      }
    };
    if (weatherDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [weatherDropdownOpen]);

  // Close mood dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(e.target as Node)) {
        setMoodDropdownOpen(false);
      }
    };
    if (moodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moodDropdownOpen]);

  // Close MBTI dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mbtiDropdownRef.current && !mbtiDropdownRef.current.contains(e.target as Node)) {
        setMbtiDropdownOpen(false);
      }
    };
    if (mbtiDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mbtiDropdownOpen]);

  const handleMbtiSelect = (mbti: string | null) => {
    setSelectedMbti(mbti);
    setMbtiDropdownOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("recflix-mbti-change", { detail: mbti }));
    }
  };

  const handleMoodSelect = (mood: MoodType | null) => {
    setSelectedMood(mood);
    setMoodDropdownOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("recflix-mood-change", { detail: mood }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/movies?query=${encodeURIComponent(searchQuery)}`;
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/mbti", label: "MBTI", icon: Brain },
    { href: "/weather", label: "날씨", icon: Cloud },
    { href: "/mood", label: "무드", icon: Smile },
    { href: "/profile", label: "MY페이지", icon: User },
  ];

  const authNavItems = [
    { href: "/favorites", label: "찜 목록", icon: Heart },
    { href: "/ratings", label: "내 평점", icon: Star },
  ];

  const isActivePath = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#E8D5CC] shadow-sm ${
          scrolled || mobileMenuOpen
            ? "bg-[#F5EDE8]/95 backdrop-blur-sm"
            : "bg-[#F5EDE8]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 z-10">
              <span className="text-xl md:text-2xl font-serif font-bold text-primary-500">RecFlix</span>
            </Link>

            {/* Desktop Navigation - Center */}
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                      isActivePath(item.href)
                        ? "text-primary-500 font-medium bg-primary-500/10"
                        : "text-foreground/60 hover:text-foreground hover:bg-black/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* MBTI Selector - Desktop only */}
              <div ref={mbtiDropdownRef} className="relative hidden lg:block">
                <button
                  onClick={() => setMbtiDropdownOpen(!mbtiDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-primary-200 hover:border-primary-400 text-sm transition"
                >
                  <span>🧠</span>
                  <span className="font-medium text-amber-500">
                    {selectedMbti ?? (isAuthenticated && user?.mbti ? user.mbti : "ENFP")}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-foreground/40 transition-transform duration-200 ${mbtiDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {mbtiDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 right-0 bg-white rounded-xl border border-gray-200 shadow-lg p-2 z-50"
                    >
                      <div className="grid grid-cols-4 gap-1 w-[200px]">
                        {MBTI_LIST.map((mbti) => (
                          <button
                            key={mbti}
                            onClick={() => handleMbtiSelect(mbti)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                              (selectedMbti ?? (isAuthenticated && user?.mbti ? user.mbti : "ENFP")) === mbti
                                ? "bg-amber-500/10 text-amber-600 font-semibold"
                                : "text-foreground/70 hover:bg-gray-50"
                            }`}
                          >
                            {mbti}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 mt-2 pt-1">
                        <button
                          onClick={() => handleMbtiSelect(isAuthenticated && user?.mbti ? user.mbti : "ENFP")}
                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition text-foreground/70 hover:bg-gray-50"
                        >
                          <span>👤</span>
                          <span>내 MBTI로 돌아가기</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Weather Selector - Desktop only */}
              {weather && (
                <div ref={weatherDropdownRef} className="relative hidden lg:block">
                  <button
                    onClick={() => setWeatherDropdownOpen(!weatherDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-primary-200 hover:border-primary-400 text-sm transition"
                  >
                    <span>{weatherConfig[weather.condition].emoji}</span>
                    <span className="text-foreground/70">{weather.temperature}°C</span>
                    <ChevronDown className={`w-3 h-3 text-foreground/40 transition-transform duration-200 ${weatherDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {weatherDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 right-0 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 w-32 z-50"
                      >
                        {(["sunny", "rainy", "cloudy", "snowy"] as WeatherType[]).map((w) => (
                          <button
                            key={w}
                            onClick={() => { setManualWeather(w); setWeatherDropdownOpen(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                              weather.condition === w
                                ? "bg-secondary-500/10 text-secondary-600 font-medium"
                                : "text-foreground/70 hover:bg-gray-50"
                            }`}
                          >
                            <span>{weatherConfig[w].emoji}</span>
                            <span>{weatherConfig[w].label}</span>
                          </button>
                        ))}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => {
                            if (geoGranted) { resetToRealWeather(); } else { setManualWeather("sunny"); }
                            setWeatherDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition text-foreground/70 hover:bg-gray-50"
                        >
                          <span>📍</span>
                          <span>현재 위치 날씨</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mood Selector - Desktop only */}
              <div ref={moodDropdownRef} className="relative hidden lg:block">
                <button
                  onClick={() => setMoodDropdownOpen(!moodDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-primary-200 hover:border-primary-400 text-sm transition"
                >
                  <span>{moodConfig[selectedMood ?? "tense"].emoji}</span>
                  <span className="text-foreground/70">{moodConfig[selectedMood ?? "tense"].label}</span>
                  <ChevronDown className={`w-3 h-3 text-foreground/40 transition-transform duration-200 ${moodDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {moodDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 right-0 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 w-40 z-50"
                    >
                      {MOOD_ORDER.map((m) => (
                        <button
                          key={m}
                          onClick={() => handleMoodSelect(m)}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                            (selectedMood ?? "tense") === m
                              ? "bg-emerald-500/10 text-emerald-700 font-medium"
                              : "text-foreground/70 hover:bg-gray-50"
                          }`}
                        >
                          <span>{moodConfig[m].emoji}</span>
                          <span>{moodConfig[m].label}</span>
                        </button>
                      ))}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleMoodSelect(isAuthenticated && selectedMood ? selectedMood : "tense")}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition text-foreground/70 hover:bg-gray-50"
                      >
                        <span>😊</span>
                        <span>기분 초기화</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Button - Mobile */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 text-foreground/60 hover:text-foreground transition"
                aria-label="검색"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Search - Desktop */}
              <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
                <button
                  type="button"
                  onClick={() => window.location.href = "/movies"}
                  className="absolute left-3 text-foreground/40 hover:text-foreground transition"
                >
                  <Search className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="영화 검색..."
                  className="bg-white border border-primary-200 rounded-full pl-9 pr-4 py-1.5 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-all w-48"
                />
              </form>

              {/* Auth - Desktop */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center space-x-3">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 text-foreground/70 hover:text-foreground transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-500 ring-2 ring-primary-500 ring-offset-1 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.nickname?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-foreground/50 hover:text-foreground transition"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:block bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition"
                >
                  로그인
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-foreground/60 hover:text-foreground transition z-10"
                aria-label="메뉴"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden overflow-hidden"
              >
                <form onSubmit={handleSearch} className="pb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="영화 제목, 배우, 감독 검색..."
                    className="w-full bg-white border border-primary-200 rounded-lg px-4 py-3 text-foreground placeholder-gray-400 focus:outline-none focus:border-primary-500 transition"
                    autoFocus
                  />
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#F5EDE8] z-50 md:hidden shadow-2xl"
            >
              <div className="flex flex-col h-full pt-16">
                {/* Weather */}
                {weather && (
                  <div className="px-4 py-3 border-b border-[#E8D5CC]">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {weather.condition === "sunny" && "☀️"}
                        {weather.condition === "rainy" && "🌧️"}
                        {weather.condition === "cloudy" && "☁️"}
                        {weather.condition === "snowy" && "❄️"}
                      </span>
                      <div>
                        <p className="text-foreground font-medium">{weather.temperature}°C</p>
                        <p className="text-foreground/50 text-sm">{weather.city}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                          isActivePath(item.href)
                            ? "bg-primary-50 text-primary-500"
                            : "text-foreground/70 hover:bg-[#EDE0D8]"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  {isAuthenticated && (
                    <>
                      <div className="h-px bg-[#E8D5CC] my-2" />
                      {authNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                              isActivePath(item.href)
                                ? "bg-primary-50 text-primary-500"
                                : "text-foreground/70 hover:bg-[#EDE0D8]"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </>
                  )}
                </nav>

                {/* User Section */}
                <div className="px-4 py-4 border-t border-gray-100">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-[#EDE0D8] transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-500 ring-2 ring-primary-500 ring-offset-1 flex items-center justify-center">
                          <span className="font-medium text-white">
                            {user?.nickname?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{user?.nickname}</p>
                          <p className="text-foreground/50 text-sm">{user?.mbti || "MBTI 미설정"}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-left text-foreground/50 hover:text-foreground hover:bg-[#EDE0D8] rounded-lg transition"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>로그아웃</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href="/login"
                        className="block w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white text-center font-medium rounded-lg transition"
                      >
                        로그인
                      </Link>
                      <Link
                        href="/signup"
                        className="block w-full px-4 py-3 bg-[#EDE0D8] hover:bg-[#E8D5CC] text-foreground text-center rounded-lg transition"
                      >
                        회원가입
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
