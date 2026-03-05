"""
Fetch YouTube trailer keys from TMDB API and store in movies.trailer_key

Usage:
  cd backend
  TMDB_API_KEY=your_key ./venv/Scripts/python.exe scripts/fetch_trailers.py
"""
import sys
import os
import time
import io
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

from sqlalchemy.orm import Session
from app.database import engine
from app.models.movie import Movie

TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
TMDB_VIDEOS_URL = "https://api.themoviedb.org/3/movie/{tmdb_id}/videos"
DELAY = 0.25


def fetch_trailer_key(tmdb_id: int, session: requests.Session) -> str | None:
    url = TMDB_VIDEOS_URL.format(tmdb_id=tmdb_id)
    resp = session.get(url, params={"api_key": TMDB_API_KEY}, timeout=10)
    if resp.status_code != 200:
        return None
    for video in resp.json().get("results", []):
        if video.get("type") == "Trailer" and video.get("site") == "YouTube":
            return video.get("key")
    return None


def main():
    if not TMDB_API_KEY:
        print("ERROR: TMDB_API_KEY 환경변수가 설정되지 않았습니다.")
        sys.exit(1)

    http = requests.Session()
    http.headers.update({"accept": "application/json"})

    with Session(engine) as db:
        movie_ids = [row[0] for row in db.query(Movie.id).filter(Movie.trailer_key.is_(None)).all()]
        total = len(movie_ids)
        print(f"trailer_key가 없는 영화: {total}편\n")

        success = skipped = failed = 0

        for i, movie_id in enumerate(movie_ids, 1):
            try:
                key = fetch_trailer_key(movie_id, http)
                if key:
                    db.query(Movie).filter(Movie.id == movie_id).update({"trailer_key": key})
                    db.commit()
                    success += 1
                else:
                    skipped += 1
            except Exception as e:
                failed += 1
                print(f"  [오류] id={movie_id}: {e}")

            if i % 100 == 0 or i == total:
                print(f"[{i}/{total}] 성공={success} 스킵={skipped} 실패={failed}")

            time.sleep(DELAY)

        print(f"\n완료 — 성공: {success} | 스킵: {skipped} | 실패: {failed} | 합계: {total}")


if __name__ == "__main__":
    main()
