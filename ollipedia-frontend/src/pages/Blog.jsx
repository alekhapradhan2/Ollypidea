import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes bl-pulse { 0%,100%{opacity:1} 50%{opacity:.28} }

.bl-root { min-height:100vh; background:#0f0f0f; padding-top:58px; color:#f1f1f1; }

/* Hero */
.bl-hero {
  padding:52px 20px 36px;
  text-align:center;
  background:linear-gradient(180deg,rgba(201,151,58,.08) 0%,transparent 100%);
  border-bottom:1px solid rgba(255,255,255,.07);
}
.bl-hero-title {
  font-family:'Cinzel',serif;
  font-size:clamp(1.6rem,4vw,2.6rem);
  font-weight:900;
  color:#c9973a;
  letter-spacing:.06em;
  margin:0 0 10px;
}
.bl-hero-sub {
  font-size:.92rem;
  color:rgba(255,255,255,.45);
  max-width:520px;
  margin:0 auto 22px;
  line-height:1.6;
}

/* Search */
.bl-sbox {
  display:flex; align-items:center; max-width:480px; margin:0 auto;
  background:#1e1e1e; border:1.5px solid rgba(255,255,255,.1);
  border-radius:24px; padding:0 16px; gap:8px; transition:border-color .18s;
}
.bl-sbox:focus-within { border-color:rgba(201,151,58,.6); }
.bl-sbox input { flex:1; background:none; border:none; outline:none; color:#f1f1f1; font-size:.86rem; padding:10px 0; }
.bl-sbox input::placeholder { color:rgba(255,255,255,.28); }

/* Category chips */
.bl-cats {
  display:flex; gap:8px; flex-wrap:wrap; justify-content:center;
  padding:18px 20px 0;
}
.bl-cat {
  padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,.13);
  background:#1e1e1e; color:rgba(255,255,255,.65); font-size:.75rem;
  font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap;
}
.bl-cat:hover { background:#2a2a2a; color:#fff; }
.bl-cat.on { background:rgba(201,151,58,.15); color:#c9973a; border-color:rgba(201,151,58,.4); }

/* Content area */
.bl-content { max-width:1200px; margin:0 auto; padding:32px 16px 80px; }
@media(min-width:600px){ .bl-content { padding:32px 24px 80px; } }
@media(min-width:960px){ .bl-content { padding:36px 32px 80px; } }

/* Featured card */
.bl-featured {
  display:grid; grid-template-columns:1fr;
  background:#1a1a1a; border-radius:14px; overflow:hidden;
  border:1px solid rgba(255,255,255,.09); margin-bottom:36px;
  cursor:pointer; transition:border-color .2s, transform .2s;
}
@media(min-width:700px){
  .bl-featured { grid-template-columns:1.4fr 1fr; }
}
.bl-featured:hover { border-color:rgba(201,151,58,.4); transform:translateY(-2px); }
.bl-feat-img {
  width:100%; aspect-ratio:16/9; object-fit:cover;
  background:#252525;
}
@media(min-width:700px){ .bl-feat-img { aspect-ratio:auto; min-height:260px; } }
.bl-feat-body { padding:24px 22px; display:flex; flex-direction:column; justify-content:center; gap:10px; }
.bl-feat-badge {
  display:inline-flex; align-items:center; gap:6px;
  background:rgba(201,151,58,.14); color:#c9973a;
  border:1px solid rgba(201,151,58,.3); border-radius:20px;
  padding:3px 10px; font-size:.7rem; font-weight:700;
  width:fit-content;
}
.bl-feat-title { font-size:clamp(1rem,2.5vw,1.35rem); font-weight:800; color:#fff; line-height:1.4; margin:0; }
.bl-feat-excerpt { font-size:.83rem; color:rgba(255,255,255,.55); line-height:1.65; margin:0; }
.bl-feat-meta { font-size:.73rem; color:rgba(255,255,255,.35); display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

/* Grid */
.bl-grid {
  display:grid; gap:20px;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
}

/* Card */
.bl-card {
  background:#1a1a1a; border-radius:12px; overflow:hidden;
  border:1px solid rgba(255,255,255,.08); cursor:pointer;
  transition:border-color .2s, transform .2s; display:flex; flex-direction:column;
}
.bl-card:hover { border-color:rgba(201,151,58,.35); transform:translateY(-3px); }
.bl-card-img { width:100%; aspect-ratio:16/9; object-fit:cover; background:#252525; flex-shrink:0; }
.bl-card-body { padding:16px; display:flex; flex-direction:column; gap:8px; flex:1; }
.bl-card-cat {
  font-size:.68rem; font-weight:700; color:#c9973a;
  text-transform:uppercase; letter-spacing:.06em;
}
.bl-card-title { font-size:.92rem; font-weight:700; color:#f1f1f1; line-height:1.4; margin:0; }
.bl-card-excerpt { font-size:.78rem; color:rgba(255,255,255,.48); line-height:1.6; margin:0; flex:1; }
.bl-card-meta { font-size:.7rem; color:rgba(255,255,255,.3); display:flex; gap:8px; align-items:center; margin-top:auto; padding-top:8px; border-top:1px solid rgba(255,255,255,.06); }

/* Skeleton */
.bl-skel { background:#1a1a1a; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,.07); }
.bl-skel-img { width:100%; aspect-ratio:16/9; background:#252525; animation:bl-pulse 1.4s ease infinite; }
.bl-skel-body { padding:16px; display:flex; flex-direction:column; gap:10px; }
.bl-skel-line { height:12px; border-radius:6px; background:#252525; animation:bl-pulse 1.4s ease infinite; }

/* Empty */
.bl-empty { text-align:center; padding:80px 20px; color:rgba(255,255,255,.3); }
.bl-empty-icon { font-size:2.8rem; margin-bottom:12px; }
.bl-empty-text { font-size:.9rem; }

/* Load more */
.bl-more {
  display:block; margin:36px auto 0; padding:11px 32px;
  background:transparent; border:1.5px solid rgba(201,151,58,.4);
  border-radius:24px; color:#c9973a; font-size:.85rem; font-weight:700;
  cursor:pointer; transition:all .2s;
}
.bl-more:hover { background:rgba(201,151,58,.1); border-color:#c9973a; }
`;

const CATEGORIES = ["All", "Movie Review", "Top 10", "Actor Spotlight", "News", "Upcoming", "General"];

function Skeleton() {
  return (
    <div className="bl-skel">
      <div className="bl-skel-img" />
      <div className="bl-skel-body">
        <div className="bl-skel-line" style={{ width: "40%" }} />
        <div className="bl-skel-line" style={{ width: "90%" }} />
        <div className="bl-skel-line" style={{ width: "75%" }} />
        <div className="bl-skel-line" style={{ width: "30%", marginTop: 4 }} />
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function Blog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch]   = useState(searchParams.get("q") || "");
  const [cat, setCat]         = useState(searchParams.get("cat") || "All");

  const PER_PAGE = 12;

  const fetchPosts = useCallback(async (pg = 1, reset = true) => {
    if (reset) { setLoading(true); setPosts([]); }
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: PER_PAGE });
      if (search.trim()) params.set("q", search.trim());
      if (cat && cat !== "All") params.set("category", cat);
      const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
      const res = await fetch(
        `${apiBase}/api/blog?${params}`
      );
      const data = await res.json();
      const list = data.posts || data || [];
      setPosts(p => reset ? list : [...p, ...list]);
      setTotal(data.total || list.length);
      setPage(pg);
    } catch {
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, cat]);

  useEffect(() => { fetchPosts(1, true); }, [fetchPosts]);

  useEffect(() => {
    const p = {};
    if (search) p.q = search;
    if (cat && cat !== "All") p.cat = cat;
    setSearchParams(p, { replace: true });
  }, [search, cat]);

  const handleSearch = (e) => {
    if (e.key === "Enter") fetchPosts(1, true);
  };

  const featured = posts[0];
  const rest     = posts.slice(1);
  const hasMore  = posts.length < total;

  return (
    <>
      <style>{CSS}</style>
      <Helmet>
        <title>Ollywood Blog – Odia Movie Articles, Reviews & News | OllyPedia</title>
        <meta name="description" content="Explore Odia movie reviews, top 10 lists, actor spotlights, and the latest Ollywood news on OllyPedia's blog." />
      </Helmet>

      <div className="bl-root">
        {/* Hero */}
        <div className="bl-hero">
          <h1 className="bl-hero-title">✍️ Ollywood Blog</h1>
          <p className="bl-hero-sub">
            Movie reviews, top lists, actor spotlights, and the latest from Odia cinema.
          </p>
          <div className="bl-sbox">
            <span style={{ color: "rgba(255,255,255,.35)", fontSize: ".9rem" }}>🔍</span>
            <input
              placeholder="Search articles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: ".85rem" }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="bl-cats">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`bl-cat${cat === c ? " on" : ""}`}
              onClick={() => setCat(c)}
            >{c}</button>
          ))}
        </div>

        {/* Content */}
        <div className="bl-content">
          {loading ? (
            <div className="bl-grid">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="bl-empty">
              <div className="bl-empty-icon">📭</div>
              <div className="bl-empty-text">No articles found. Check back soon!</div>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && page === 1 && !search && cat === "All" && (
                <div
                  className="bl-featured"
                  onClick={() => navigate(`/blog/${featured.slug}`)}
                >
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={featured.title}
                      className="bl-feat-img"
                      onError={e => e.target.style.display = "none"}
                    />
                  ) : (
                    <div className="bl-feat-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>🎬</div>
                  )}
                  <div className="bl-feat-body">
                    <span className="bl-feat-badge">⭐ Featured</span>
                    <h2 className="bl-feat-title">{featured.title}</h2>
                    <p className="bl-feat-excerpt">{featured.excerpt}</p>
                    <div className="bl-feat-meta">
                      <span>📅 {formatDate(featured.createdAt)}</span>
                      {featured.readTime && <span>⏱ {featured.readTime} min read</span>}
                      {featured.views > 0 && <span>👁 {featured.views.toLocaleString()} views</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Grid */}
              <div className="bl-grid">
                {(featured && page === 1 && !search && cat === "All" ? rest : posts).map(post => (
                  <div
                    key={post._id}
                    className="bl-card"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="bl-card-img"
                        loading="lazy"
                        onError={e => e.target.style.display = "none"}
                      />
                    ) : (
                      <div className="bl-card-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem" }}>🎬</div>
                    )}
                    <div className="bl-card-body">
                      <div className="bl-card-cat">{post.category || "Article"}</div>
                      <h3 className="bl-card-title">{post.title}</h3>
                      <p className="bl-card-excerpt">{post.excerpt}</p>
                      <div className="bl-card-meta">
                        <span>📅 {formatDate(post.createdAt)}</span>
                        {post.readTime && <span>⏱ {post.readTime} min</span>}
                        {post.views > 0 && <span>👁 {post.views.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <button
                  className="bl-more"
                  onClick={() => fetchPosts(page + 1, false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : `Load More Articles (${total - posts.length} remaining)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}