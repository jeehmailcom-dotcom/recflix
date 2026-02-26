"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, Heart, Star, User, LogOut, Home, Brain, Cloud, Smile } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WeatherIndicator } from "@/components/weather/WeatherBanner";
import type { Weather } from "@/types";

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);

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

  // Load cached weather from localStorage
  useEffect(() => {
    const loadWeather = () => {
      try {
        const cached = localStorage.getItem("recflix_weather");
        if (cached) {
          const { data } = JSON.parse(cached);
          setWeather(data);
        }
      } catch {
        // Ignore errors
      }
    };

    loadWeather();
    window.addEventListener("storage", loadWeather);
    const interval = setInterval(loadWeather, 5000);

    return () => {
      window.removeEventListener("storage", loadWeather);
      clearInterval(interval);
    };
  }, []);

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
              {/* Weather - Desktop only */}
              {weather && (
                <div className="hidden lg:block">
                  <WeatherIndicator weather={weather} />
                </div>
              )}

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
