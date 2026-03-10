import React, { useEffect, useState } from "react";
import { API } from "../api/api";
import MovieCard from "../components/MovieCard";

const GENRES = ["All", "Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical"];
const VERDICTS = ["All", "Upcoming", "Hit", "Flop", "Average", "Super Hit", "Blockbuster"];

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [verdict, setVerdict] = useState("All");

  useEffect(() => {
    API.getMovies()
      .then(setMovies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = movies.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.title?.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q);
    const matchGenre = genre === "All" || m.genre?.includes(genre);
    const matchVerdict = verdict === "All" || (m.verdict || "Upcoming").toLowerCase() === verdict.toLowerCase();
    return matchSearch && matchGenre && matchVerdict;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Films</h1>
        <p>{movies.length} films in the database</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <input
          className="form-input" style={{ flex: "1", minWidth: 200, maxWidth: 320 }}
          placeholder="Search by title or director…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ width: "auto" }} value={genre} onChange={e => setGenre(e.target.value)}>
          {GENRES.map(g => <option key={g}>{g}</option>)}
        </select>
        <select className="form-select" style={{ width: "auto" }} value={verdict} onChange={e => setVerdict(e.target.value)}>
          {VERDICTS.map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No results found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="movie-grid">
          {filtered.map(m => <MovieCard key={m._id} movie={m} />)}
        </div>
      )}
    </div>
  );
}