"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Play, X } from "lucide-react";
import type { MovieDetail } from "@/types";

function AccordionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#DA7756] text-xs text-white"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MovieDetailSidebarProps {
  movie: MovieDetail;
}

export default function MovieDetailSidebar({ movie }: MovieDetailSidebarProps) {
  const [directorOpen, setDirectorOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [popularityOpen, setPopularityOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleWatchClick = () => {
    if (movie.trailer_key) {
      setTrailerOpen(true);
    } else {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    }
  };

  return (
    <>
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      {/* 시청하기 Card */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
        <button
          onClick={handleWatchClick}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-lg transition"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>예고편</span>
        </button>
      </div>

      {/* Director Accordion */}
      {(movie.director_ko || movie.director) && (
        <AccordionCard title="🎬 감독" open={directorOpen} onToggle={() => setDirectorOpen(!directorOpen)}>
          <Link
            href={`/movies?query=${encodeURIComponent(movie.director_ko || movie.director || "")}`}
            className="inline-flex items-center space-x-3 p-3 bg-white border border-gray-100 hover:bg-gray-50 rounded-lg transition shadow-sm"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-foreground/30" />
            </div>
            <span className="text-foreground/80 text-sm">{movie.director_ko || movie.director}</span>
          </Link>
        </AccordionCard>
      )}

      {/* Cast Accordion */}
      {movie.cast_members && movie.cast_members.length > 0 && (
        <AccordionCard title="👥 출연진" open={castOpen} onToggle={() => setCastOpen(!castOpen)}>
          <div className="space-y-2">
            {movie.cast_members.slice(0, 8).map((person) => (
              <Link
                key={person.id}
                href={`/movies?query=${encodeURIComponent(person.name)}`}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-100 hover:bg-gray-50 rounded-lg transition shadow-sm"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-foreground/30" />
                </div>
                <span className="text-foreground/80 text-sm truncate">{person.name}</span>
              </Link>
            ))}
          </div>
        </AccordionCard>
      )}

      {/* 제작 국가 Accordion */}
      {movie.countries && movie.countries.length > 0 && (
        <AccordionCard title="🌍 제작 국가" open={countriesOpen} onToggle={() => setCountriesOpen(!countriesOpen)}>
          <div className="space-y-2">
            {movie.countries.flatMap((c) => c.split(",").map((s) => s.trim())).filter(Boolean).map((country) => (
              <div key={country} className="flex items-center space-x-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-foreground/30" />
                </div>
                <span className="text-foreground/80 text-sm">{country}</span>
              </div>
            ))}
          </div>
        </AccordionCard>
      )}

      {/* 키워드 Accordion */}
      {movie.keywords && movie.keywords.length > 0 && (
        <AccordionCard title="🏷️ 키워드" open={keywordsOpen} onToggle={() => setKeywordsOpen(!keywordsOpen)}>
          <div className="flex flex-wrap gap-2">
            {movie.keywords.slice(0, 10).map((keyword) => (
              <span key={keyword} className="px-2 py-1 bg-gray-100 rounded text-xs text-foreground/60">
                {keyword}
              </span>
            ))}
          </div>
        </AccordionCard>
      )}

      {/* 인기도 Accordion */}
      <AccordionCard title="🔥 인기도" open={popularityOpen} onToggle={() => setPopularityOpen(!popularityOpen)}>
        <p className="text-foreground/80 text-sm">{movie.popularity.toFixed(1)}</p>
      </AccordionCard>

    </motion.aside>

      {/* Trailer Modal */}
      <AnimatePresence>
        {trailerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-[800px] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setTrailerOpen(false)}
                className="absolute -top-10 right-0 text-white hover:text-white/70 transition"
              >
                <X className="w-8 h-8" />
              </button>
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1`}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-800 text-white rounded-lg shadow-lg text-sm whitespace-nowrap"
          >
            예고편이 준비되지 않았습니다.
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
