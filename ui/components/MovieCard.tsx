"use client";
import { useRouter } from "next/navigation";

interface Movie {
  _id: string;
  title: string;
  director?: string;
  releaseDate?: string;
  posterUrl?: string;
  verdict?: string;
}

interface MovieCardProps {
  movie: Movie;
}

const verdictClass = (v?: string) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (l === "hit" || l === "super hit" || l === "blockbuster") return "verdict-hit";
  if (l === "flop" || l === "disaster") return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};

export default function MovieCard({ movie }: MovieCardProps) {
  const router = useRouter();

  return (
    <div className="movie-card" onClick={() => router.push(`/movie/${movie._id}`)}>
      <div className="movie-card-poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} />
        ) : (
          <span className="movie-card-poster-placeholder">🎬</span>
        )}
        <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`}>
          {movie.verdict || "Upcoming"}
        </span>
      </div>
      <div className="movie-card-body">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-meta">
          {movie.director && <span>{movie.director}</span>}
          {movie.releaseDate && <span> · {movie.releaseDate}</span>}
        </div>
      </div>
    </div>
  );
}