"use client";
import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API, getToken } from "../../../lib/api";

interface Movie {
  _id: string;
  title: string;
  category?: string;
  language?: string;
  director?: string;
  producer?: string;
  releaseDate?: string;
  releaseTBA?: boolean;
  budget?: string;
  synopsis?: string;
  posterUrl?: string;
  verdict?: string;
  genre?: string[];
  cast?: CastMember[];
  media?: {
    trailer?: { ytId: string };
    songs?: Song[];
  };
  boxOffice?: {
    opening?: string;
    firstWeek?: string;
    total?: string;
  };
  news?: NewsItem[];
  reviews?: Review[];
}

interface CastMember {
  castId?: string;
  name: string;
  role?: string;
  type?: string;
  photo?: string;
}

interface Song {
  title: string;
  singer?: string;
  ytId?: string;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
}

interface Review {
  user: string;
  rating: number;
  text: string;
  date?: string;
}

const verdictClass = (v?: string) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (l === "hit" || l === "super hit" || l === "blockbuster") return "verdict-hit";
  if (l === "flop" || l === "disaster") return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};

const stars = (n: number) => "★".repeat(Math.round(n || 0)) + "☆".repeat(5 - Math.round(n || 0));

export default function MovieDetails() {
  const params = useParams();
  const id = params?.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review form
  const [reviewUser, setReviewUser] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    API.getMovie(id)
      .then(setMovie)
      .catch((e: any) => setError(typeof e === "string" ? e : "Failed to load movie"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { 
    load(); 
  }, [load]);

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewUser.trim() || !reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const reviews = await API.postReview(id, { 
        user: reviewUser, 
        rating: reviewRating, 
        text: reviewText 
      });
      setMovie(prev => prev ? ({ ...prev, reviews }) : null);
      setReviewUser(""); 
      setReviewText(""); 
      setReviewRating(5);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="page">
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 48 }}>
        <div className="skeleton" style={{ aspectRatio: "2/3" }} />
        <div>
          <div className="skeleton" style={{ height: 20, width: "40%", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 48, width: "70%", marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: "80%" }} />
        </div>
      </div>
    </div>
  );

  if (error || !movie) return (
    <div className="page empty-state">
      <h3>Movie not found</h3>
      <p>{error}</p>
      <Link href="/movies" className="btn btn-outline" style={{ marginTop: 16 }}>← Back to Movies</Link>
    </div>
  );

  const avgRating = movie.reviews?.length
    ? (movie.reviews.reduce((s, r) => s + r.rating, 0) / movie.reviews.length).toFixed(1)
    : null;

  return (
    <div className="page">
      <Link href="/movies" className="btn btn-ghost btn-sm" style={{ marginBottom: 24, display: "inline-flex" }}>
        ← All Films
      </Link>

      <div className="movie-hero">
        <div className="movie-hero-poster">
          {movie.posterUrl
            ? <img src={movie.posterUrl} alt={movie.title} />
            : <span className="movie-hero-poster-placeholder">🎬</span>
          }
        </div>

        <div className="movie-hero-content">
          <div className="movie-category">{movie.category || "Feature Film"} · {movie.language || "Odia"}</div>
          <h1 className="movie-title">{movie.title}</h1>

          {avgRating && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "1.4rem" }}>
                {avgRating}
              </span>
              <span style={{ color: "var(--gold)", fontSize: "0.85rem", marginLeft: 6 }}>
                {stars(parseFloat(avgRating))}
              </span>
              <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: 6 }}>
                ({movie.reviews?.length} reviews)
              </span>
            </div>
          )}

          <div className="movie-badges">
            {movie.genre?.map(g => <span key={g} className="badge">{g}</span>)}
            <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`} style={{ borderRadius: 3, padding: "4px 12px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {movie.verdict || "Upcoming"}
            </span>
          </div>

          <div className="movie-meta-grid">
            {movie.director && (
              <div className="movie-meta-item">
                <label>Director</label><span>{movie.director}</span>
              </div>
            )}
            {movie.producer && (
              <div className="movie-meta-item">
                <label>Producer</label><span>{movie.producer}</span>
              </div>
            )}
            {movie.releaseDate && (
              <div className="movie-meta-item">
                <label>Release</label><span>{movie.releaseTBA ? "TBA" : movie.releaseDate}</span>
              </div>
            )}
            {movie.budget && (
              <div className="movie-meta-item">
                <label>Budget</label><span>{movie.budget}</span>
              </div>
            )}
          </div>

          {movie.synopsis && <p className="movie-synopsis">{movie.synopsis}</p>}
        </div>
      </div>

      <div className="tabs">
        {["overview", "cast", "media", "boxoffice", "news", "reviews"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "boxoffice" ? "Box Office" : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "reviews" && movie.reviews?.length ? ` (${movie.reviews.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="section">
          {movie.synopsis ? (
            <p style={{ color: "#b0a898", lineHeight: 1.8, fontSize: "0.95rem", maxWidth: 720 }}>{movie.synopsis}</p>
          ) : (
            <p style={{ color: "var(--muted)" }}>No synopsis available.</p>
          )}
          {movie.media?.trailer?.ytId && (
            <>
              <hr className="divider" />
              <h3 style={{ marginBottom: 16, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Trailer</h3>
              <div className="trailer-embed" style={{ maxWidth: 640 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title="Trailer"
                />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "cast" && (
        <div className="section">
          {movie.cast?.length ? (
            <div className="cast-grid">
              {movie.cast.map((c, i) => (
                <div key={c.castId || i} className="cast-card">
                  <div className="cast-card-photo">
                    {c.photo ? <img src={c.photo} alt={c.name} /> : <span className="cast-card-photo-placeholder">👤</span>}
                  </div>
                  <div className="cast-card-body">
                    <div className="cast-card-name">{c.name}</div>
                    {c.role && <div className="cast-card-role">{c.role}</div>}
                    {c.type && <div className="cast-card-role" style={{ color: "var(--gold)", fontSize: "0.65rem" }}>{c.type}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: "var(--muted)" }}>No cast information available.</p>}
        </div>
      )}

      {tab === "media" && (
        <div className="section">
          {movie.media?.trailer?.ytId && (
            <>
              <h3 style={{ marginBottom: 16, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Trailer</h3>
              <div className="trailer-embed" style={{ maxWidth: 640, marginBottom: 32 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title="Trailer"
                />
              </div>
            </>
          )}
          {movie.media?.songs && movie.media.songs.length > 0 && (
            <>
              <h3 style={{ marginBottom: 16, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                Songs ({movie.media.songs.length})
              </h3>
              <div className="song-list">
                {movie.media.songs.map((s, i) => (
                  <div key={i} className="song-item">
                    <span className="song-num">{i + 1}</span>
                    <div className="song-info">
                      <div className="song-title">{s.title}</div>
                      {s.singer && <div className="song-singer">{s.singer}</div>}
                    </div>
                    {s.ytId && (
                      <a href={`https://www.youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer">
                        <button className="song-play">▶</button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {!movie.media?.trailer?.ytId && !movie.media?.songs?.length && (
            <p style={{ color: "var(--muted)" }}>No media available yet.</p>
          )}
        </div>
      )}

      {tab === "boxoffice" && (
        <div className="section">
          <div className="boxoffice-grid" style={{ marginBottom: 24 }}>
            <div className="boxoffice-card">
              <div className="boxoffice-label">Opening Weekend</div>
              <div className="boxoffice-value">{movie.boxOffice?.opening || "TBA"}</div>
            </div>
            <div className="boxoffice-card">
              <div className="boxoffice-label">First Week</div>
              <div className="boxoffice-value">{movie.boxOffice?.firstWeek || "TBA"}</div>
            </div>
            <div className="boxoffice-card">
              <div className="boxoffice-label">Total Collection</div>
              <div className="boxoffice-value">{movie.boxOffice?.total || "TBA"}</div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`} style={{ display: "inline-block", padding: "6px 20px", fontSize: "0.85rem", fontWeight: 700, borderRadius: 4 }}>
              Verdict: {movie.verdict || "Upcoming"}
            </span>
          </div>
        </div>
      )}

      {tab === "news" && (
        <div className="section">
          {movie.news?.length ? (
            <div className="news-grid">
              {movie.news.map(n => (
                <div key={n._id} className="news-card">
                  {n.imageUrl && <div className="news-card-img"><img src={n.imageUrl} alt={n.title} /></div>}
                  <div className="news-card-body">
                    <div className="news-card-category">{n.category || "Update"}</div>
                    <div className="news-card-title">{n.title}</div>
                    <div className="news-card-content">{n.content}</div>
                    <div className="news-card-meta">{new Date(n.createdAt).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: "var(--muted)" }}>No news articles for this film.</p>}
        </div>
      )}

      {tab === "reviews" && (
        <div className="section">
          <div className="review-form">
            <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Write a Review</h3>
            <form onSubmit={submitReview}>
              <div className="form-grid" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Name</label>
                  <input 
                    className="form-input" 
                    required 
                    value={reviewUser} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setReviewUser(e.target.value)} 
                    placeholder="Name" 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rating (1–5)</label>
                  <select 
                    className="form-select" 
                    value={reviewRating} 
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setReviewRating(Number(e.target.value))}
                  >
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} — {["","Poor","Below Average","Average","Good","Excellent"][n]}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Review</label>
                <textarea 
                  className="form-textarea" 
                  required 
                  value={reviewText} 
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReviewText(e.target.value)} 
                  placeholder="Share your thoughts…" 
                />
              </div>
              <button className="btn btn-gold btn-sm" type="submit" disabled={submittingReview}>
                {submittingReview ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          </div>

          {movie.reviews?.length ? (
            <div className="review-list">
              {[...movie.reviews].reverse().map((r, i) => (
                <div key={i} className="review-item">
                  <div className="review-header">
                    <span className="review-user">{r.user}</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="review-stars">{stars(r.rating)}</span>
                      {r.date && <span className="review-date">{r.date}</span>}
                    </div>
                  </div>
                  <p className="review-text">{r.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>No reviews yet. Be the first!</p>
          )}
        </div>
      )}
    </div>
  );
}