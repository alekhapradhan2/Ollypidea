import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes bp-pulse { 0%,100%{opacity:1} 50%{opacity:.28} }

.bp-root { min-height:100vh; background:#0f0f0f; padding-top:58px; color:#f1f1f1; }

/* Hero banner */
.bp-banner {
  position:relative; width:100%; max-height:420px; overflow:hidden;
  display:flex; align-items:flex-end;
}
.bp-banner-img { width:100%; height:420px; object-fit:cover; filter:brightness(.45); }
.bp-banner-overlay {
  position:absolute; inset:0;
  background:linear-gradient(0deg,rgba(15,15,15,1) 0%,rgba(15,15,15,.5) 50%,rgba(15,15,15,.1) 100%);
}
.bp-banner-content {
  position:absolute; bottom:0; left:0; right:0;
  padding:24px clamp(16px,4vw,56px) 32px;
  max-width:860px;
}

/* No banner fallback */
.bp-nobanner {
  background:linear-gradient(180deg,rgba(201,151,58,.07) 0%,transparent 100%);
  border-bottom:1px solid rgba(255,255,255,.07);
  padding:40px clamp(16px,4vw,56px) 32px;
  max-width:860px; margin:0 auto;
}

.bp-cat {
  display:inline-flex; align-items:center; gap:5px;
  background:rgba(201,151,58,.15); color:#c9973a;
  border:1px solid rgba(201,151,58,.3); border-radius:20px;
  padding:3px 11px; font-size:.7rem; font-weight:700;
  margin-bottom:12px; cursor:pointer; transition:background .15s;
}
.bp-cat:hover { background:rgba(201,151,58,.25); }

.bp-title {
  font-size:clamp(1.3rem,3.5vw,2rem); font-weight:900;
  color:#fff; line-height:1.3; margin:0 0 12px;
}

.bp-meta {
  display:flex; flex-wrap:wrap; gap:12px; align-items:center;
  font-size:.75rem; color:rgba(255,255,255,.45);
}
.bp-meta-dot { opacity:.35; }

/* Layout */
.bp-layout {
  max-width:1100px; margin:0 auto;
  display:grid; grid-template-columns:1fr;
  gap:32px; padding:32px 16px 80px;
}
@media(min-width:600px){ .bp-layout { padding:36px 24px 80px; } }
@media(min-width:960px){
  .bp-layout { grid-template-columns:1fr 320px; padding:40px 32px 80px; }
}

/* Article body */
.bp-article {
  font-size:.95rem; color:rgba(255,255,255,.82);
  line-height:1.85; white-space:pre-wrap;
  word-break:break-word;
}
.bp-article p { margin:0 0 1.2em; }

/* Tags */
.bp-tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:28px; }
.bp-tag {
  padding:4px 12px; border-radius:16px; font-size:.72rem; font-weight:600;
  background:#1e1e1e; border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.55); cursor:pointer; transition:all .15s;
}
.bp-tag:hover { border-color:rgba(201,151,58,.4); color:#c9973a; }

/* Divider */
.bp-divider { border:none; border-top:1px solid rgba(255,255,255,.08); margin:32px 0; }

/* Rating & Review section */
.bp-reviews-head {
  font-size:1rem; font-weight:800; color:#f1f1f1; margin:0 0 18px;
  display:flex; align-items:center; gap:8px;
}
.bp-rating-row {
  display:flex; align-items:center; gap:10px; margin-bottom:24px;
  flex-wrap:wrap;
}
.bp-stars { display:flex; gap:4px; }
.bp-star {
  font-size:1.6rem; cursor:pointer; transition:transform .12s;
  line-height:1; user-select:none;
}
.bp-star:hover { transform:scale(1.18); }
.bp-rating-label { font-size:.82rem; color:rgba(255,255,255,.45); }

/* Review form */
.bp-form { display:flex; flex-direction:column; gap:12px; }
.bp-input {
  padding:10px 14px; background:#1e1e1e; border:1.5px solid rgba(255,255,255,.1);
  border-radius:8px; color:#f1f1f1; font-size:.85rem; outline:none;
  transition:border-color .18s; font-family:inherit;
}
.bp-input:focus { border-color:rgba(201,151,58,.5); }
.bp-input::placeholder { color:rgba(255,255,255,.28); }
.bp-textarea { resize:vertical; min-height:90px; }
.bp-submit {
  padding:10px 22px; background:#c9973a; border:none; border-radius:8px;
  color:#000; font-weight:700; font-size:.85rem; cursor:pointer;
  transition:background .15s; align-self:flex-start;
}
.bp-submit:hover { background:#e0aa44; }
.bp-submit:disabled { background:#555; color:#888; cursor:not-allowed; }

/* Review cards */
.bp-review-card {
  background:#1a1a1a; border:1px solid rgba(255,255,255,.07);
  border-radius:10px; padding:16px; margin-bottom:14px;
}
.bp-rv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:6px; }
.bp-rv-name { font-weight:700; font-size:.88rem; color:#f1f1f1; }
.bp-rv-stars { color:#c9973a; font-size:.85rem; }
.bp-rv-date { font-size:.7rem; color:rgba(255,255,255,.3); }
.bp-rv-text { font-size:.83rem; color:rgba(255,255,255,.65); line-height:1.65; }
.bp-rv-actions { display:flex; gap:14px; margin-top:10px; align-items:center; }
.bp-rv-like {
  background:none; border:none; color:rgba(255,255,255,.4);
  font-size:.75rem; cursor:pointer; padding:0; transition:color .15s;
  display:flex; align-items:center; gap:4px;
}
.bp-rv-like:hover { color:#c9973a; }
.bp-rv-reply-btn {
  background:none; border:none; color:rgba(255,255,255,.4);
  font-size:.75rem; cursor:pointer; padding:0; transition:color .15s;
}
.bp-rv-reply-btn:hover { color:#f1f1f1; }

/* Replies */
.bp-replies { margin-top:12px; padding-left:16px; border-left:2px solid rgba(255,255,255,.07); }
.bp-reply { padding:8px 0; font-size:.78rem; color:rgba(255,255,255,.55); line-height:1.55; }
.bp-reply-name { font-weight:700; color:rgba(255,255,255,.75); margin-right:6px; }
.bp-reply-form { display:flex; gap:8px; margin-top:8px; }
.bp-reply-input {
  flex:1; padding:7px 12px; background:#252525;
  border:1px solid rgba(255,255,255,.1); border-radius:6px;
  color:#f1f1f1; font-size:.78rem; outline:none; font-family:inherit;
}
.bp-reply-input:focus { border-color:rgba(201,151,58,.4); }
.bp-reply-submit {
  padding:7px 14px; background:rgba(201,151,58,.2); border:1px solid rgba(201,151,58,.3);
  border-radius:6px; color:#c9973a; font-size:.75rem; font-weight:700; cursor:pointer;
  transition:background .15s;
}
.bp-reply-submit:hover { background:rgba(201,151,58,.35); }

/* Sidebar */
.bp-sidebar { display:flex; flex-direction:column; gap:20px; }
.bp-sidebar-box {
  background:#1a1a1a; border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:18px; overflow:hidden;
}
.bp-sidebar-title { font-size:.82rem; font-weight:800; color:#c9973a; text-transform:uppercase; letter-spacing:.07em; margin:0 0 14px; }
.bp-rel-item {
  display:flex; gap:10px; align-items:flex-start; padding:9px 0;
  border-bottom:1px solid rgba(255,255,255,.06); cursor:pointer;
  transition:opacity .15s;
}
.bp-rel-item:last-child { border-bottom:none; padding-bottom:0; }
.bp-rel-item:hover { opacity:.75; }
.bp-rel-thumb { width:52px; height:34px; object-fit:cover; border-radius:5px; background:#252525; flex-shrink:0; }
.bp-rel-title { font-size:.78rem; font-weight:600; color:#f1f1f1; line-height:1.4; }
.bp-rel-meta { font-size:.68rem; color:rgba(255,255,255,.3); margin-top:3px; }

/* Skeleton */
.bp-skel-banner { width:100%; height:320px; background:#1a1a1a; animation:bp-pulse 1.4s ease infinite; }
.bp-skel-line { height:14px; border-radius:7px; background:#1e1e1e; animation:bp-pulse 1.4s ease infinite; margin-bottom:12px; }

/* Back btn */
.bp-back {
  display:inline-flex; align-items:center; gap:6px;
  background:none; border:none; color:rgba(255,255,255,.5);
  font-size:.8rem; cursor:pointer; padding:0;
  transition:color .15s; margin-bottom:16px;
}
.bp-back:hover { color:#f1f1f1; }

/* Overall rating badge */
.bp-overall {
  display:inline-flex; align-items:center; gap:8px;
  background:rgba(201,151,58,.12); border:1px solid rgba(201,151,58,.3);
  border-radius:10px; padding:8px 16px; margin-bottom:20px;
}
.bp-overall-num { font-size:1.5rem; font-weight:900; color:#c9973a; }
.bp-overall-label { font-size:.75rem; color:rgba(255,255,255,.45); line-height:1.4; }
`;

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="bp-stars">
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          className="bp-star"
          style={{ color: s <= (hover || value) ? "#c9973a" : "rgba(255,255,255,.2)" }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >★</span>
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

function averageRating(reviews) {
  if (!reviews?.length) return 0;
  const valid = reviews.filter(r => r.rating > 0);
  if (!valid.length) return 0;
  return (valid.reduce((s, r) => s + r.rating, 0) / valid.length).toFixed(1);
}

export default function BlogPost() {
  const { slug }    = useParams();
  const navigate    = useNavigate();

  const [post, setPost]         = useState(null);
  const [related, setRelated]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Review form state
  const [reviewName, setReviewName]   = useState("");
  const [reviewText, setReviewText]   = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // Reply state: { [reviewIdx]: { open, text, name } }
  const [replies, setReplies] = useState({});

  const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

  // ── Fetch post ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPost(null);
      setNotFound(false);
      try {
        const res = await fetch(`${API_BASE}/api/blog/${slug}`);
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const data = await res.json();
        if (!cancelled) setPost(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Fetch related posts ─────────────────────────────────────────
  useEffect(() => {
    if (!post) return;
    (async () => {
      try {
        const cat = post.category || "";
        const res = await fetch(`${API_BASE}/api/blog?limit=5${cat ? `&category=${encodeURIComponent(cat)}` : ""}`);
        const data = await res.json();
        const list = (data.posts || data || []).filter(p => p.slug !== slug).slice(0, 4);
        setRelated(list);
      } catch { setRelated([]); }
    })();
  }, [post]);

  // ── Submit review ───────────────────────────────────────────────
  const submitReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/blog/${post._id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: reviewName.trim(), text: reviewText.trim(), rating: reviewRating }),
      });
      if (res.ok) {
        setSubmitted(true);
        setReviewName("");
        setReviewText("");
        setReviewRating(5);
        const updated = await fetch(`${API_BASE}/api/blog/${slug}`);
        if (updated.ok) setPost(await updated.json());
      }
    } catch {}
    setSubmitting(false);
  };

  // ── Like a review ───────────────────────────────────────────────
  const likeReview = async (idx) => {
    try {
      const res = await fetch(`${API_BASE}/api/blog/${post._id}/reviews/${idx}/like`, { method: "POST" });
      if (res.ok) {
        const { likes } = await res.json();
        setPost(p => {
          const reviews = [...(p.reviews || [])];
          reviews[idx] = { ...reviews[idx], likes };
          return { ...p, reviews };
        });
      }
    } catch {}
  };

  // ── Submit reply ────────────────────────────────────────────────
  const submitReply = async (idx) => {
    const r = replies[idx] || {};
    if (!r.text?.trim() || !r.name?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/blog/${post._id}/reviews/${idx}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: r.name.trim(), text: r.text.trim(), date: new Date().toISOString().split("T")[0] }),
      });
      if (res.ok) {
        const replyList = await res.json();
        setPost(p => {
          const reviews = [...(p.reviews || [])];
          reviews[idx] = { ...reviews[idx], replies: replyList };
          return { ...p, reviews };
        });
        setReplies(prev => ({ ...prev, [idx]: { ...prev[idx], text: "", open: false } }));
      }
    } catch {}
  };

  const toggleReply = (idx) =>
    setReplies(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), open: !(prev[idx]?.open) } }));

  const avg = averageRating(post?.reviews);
  const reviewCount = (post?.reviews || []).length;

  // ── Render ──────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="bp-root">
        <div className="bp-skel-banner" />
        <div style={{ maxWidth: 860, margin: "32px auto", padding: "0 20px" }}>
          {[90, 70, 100, 60, 85, 50].map((w, i) => (
            <div key={i} className="bp-skel-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <style>{CSS}</style>
      <div className="bp-root" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ fontSize: "3rem" }}>📭</div>
        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.5)" }}>Article not found.</div>
        <button
          onClick={() => navigate("/blog")}
          style={{ padding: "9px 22px", background: "#c9973a", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer" }}
        >← Back to Blog</button>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <Helmet>
        <title>{post.seoTitle || post.title} | OllyPedia Blog</title>
        <meta name="description" content={post.seoDesc || post.excerpt} />
        <meta property="og:title" content={post.seoTitle || post.title} />
        <meta property="og:description" content={post.seoDesc || post.excerpt} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
      </Helmet>

      <div className="bp-root">
        {/* Banner or plain header */}
        {post.coverImage ? (
          <div className="bp-banner">
            <img src={post.coverImage} alt={post.title} className="bp-banner-img" onError={e => e.target.style.display="none"} />
            <div className="bp-banner-overlay" />
            <div className="bp-banner-content">
              <button className="bp-back" onClick={() => navigate("/blog")}>← Back to Blog</button>
              <button className="bp-cat" onClick={() => navigate(`/blog?cat=${encodeURIComponent(post.category || "")}`)}>
                {post.category || "Article"}
              </button>
              <h1 className="bp-title">{post.title}</h1>
              <div className="bp-meta">
                {post.author && <span>✍️ {post.author}</span>}
                <span className="bp-meta-dot">·</span>
                <span>📅 {formatDate(post.createdAt)}</span>
                {post.readTime && <><span className="bp-meta-dot">·</span><span>⏱ {post.readTime} min read</span></>}
                {post.views > 0 && <><span className="bp-meta-dot">·</span><span>👁 {post.views.toLocaleString()} views</span></>}
                {avg > 0 && <><span className="bp-meta-dot">·</span><span>⭐ {avg} ({reviewCount} reviews)</span></>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bp-nobanner">
            <button className="bp-back" onClick={() => navigate("/blog")}>← Back to Blog</button>
            <button className="bp-cat" onClick={() => navigate(`/blog?cat=${encodeURIComponent(post.category || "")}`)}>
              {post.category || "Article"}
            </button>
            <h1 className="bp-title">{post.title}</h1>
            <div className="bp-meta">
              {post.author && <span>✍️ {post.author}</span>}
              <span className="bp-meta-dot">·</span>
              <span>📅 {formatDate(post.createdAt)}</span>
              {post.readTime && <><span className="bp-meta-dot">·</span><span>⏱ {post.readTime} min read</span></>}
              {post.views > 0 && <><span className="bp-meta-dot">·</span><span>👁 {post.views.toLocaleString()} views</span></>}
            </div>
          </div>
        )}

        {/* Layout */}
        <div className="bp-layout">
          {/* Main column */}
          <div>
            {/* Article text */}
            <div className="bp-article">
              {(post.content || "").split(/\n\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="bp-tags">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="bp-tag"
                    onClick={() => navigate(`/blog?q=${encodeURIComponent(tag)}`)}
                  >#{tag}</span>
                ))}
              </div>
            )}

            <hr className="bp-divider" />

            {/* Reviews section */}
            <div>
              <div className="bp-reviews-head">
                ⭐ Reviews & Ratings
                {reviewCount > 0 && <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)", fontWeight: 400 }}>({reviewCount})</span>}
              </div>

              {/* Overall rating */}
              {avg > 0 && (
                <div className="bp-overall">
                  <div className="bp-overall-num">{avg}</div>
                  <div>
                    <div style={{ color: "#c9973a", fontSize: ".9rem" }}>{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</div>
                    <div className="bp-overall-label">avg from {reviewCount} review{reviewCount !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              )}

              {/* Existing reviews */}
              {(post.reviews || []).map((rv, idx) => (
                <div key={idx} className="bp-review-card">
                  <div className="bp-rv-header">
                    <div>
                      <div className="bp-rv-name">👤 {rv.user || "Anonymous"}</div>
                      {rv.rating > 0 && (
                        <div className="bp-rv-stars">
                          {"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}
                          <span style={{ color: "rgba(255,255,255,.35)", fontSize: ".7rem", marginLeft: 5 }}>({rv.rating}/5)</span>
                        </div>
                      )}
                    </div>
                    <div className="bp-rv-date">{rv.date || ""}</div>
                  </div>
                  <div className="bp-rv-text">{rv.text}</div>
                  <div className="bp-rv-actions">
                    <button className="bp-rv-like" onClick={() => likeReview(idx)}>
                      👍 {rv.likes > 0 ? rv.likes : "Like"}
                    </button>
                    <button className="bp-rv-reply-btn" onClick={() => toggleReply(idx)}>
                      💬 Reply
                    </button>
                  </div>

                  {/* Replies */}
                  {rv.replies?.length > 0 && (
                    <div className="bp-replies">
                      {rv.replies.map((rep, ri) => (
                        <div key={ri} className="bp-reply">
                          <span className="bp-reply-name">{rep.user || "Anonymous"}:</span>
                          {rep.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {replies[idx]?.open && (
                    <div className="bp-reply-form" style={{ marginTop: 10 }}>
                      <input
                        className="bp-reply-input"
                        placeholder="Your name"
                        style={{ maxWidth: 110 }}
                        value={replies[idx]?.name || ""}
                        onChange={e => setReplies(p => ({ ...p, [idx]: { ...p[idx], name: e.target.value } }))}
                      />
                      <input
                        className="bp-reply-input"
                        placeholder="Write a reply…"
                        value={replies[idx]?.text || ""}
                        onChange={e => setReplies(p => ({ ...p, [idx]: { ...p[idx], text: e.target.value } }))}
                        onKeyDown={e => e.key === "Enter" && submitReply(idx)}
                      />
                      <button className="bp-reply-submit" onClick={() => submitReply(idx)}>Send</button>
                    </div>
                  )}
                </div>
              ))}

              {/* Review form */}
              <hr className="bp-divider" />
              <div style={{ marginBottom: 12, fontWeight: 700, fontSize: ".88rem", color: "#f1f1f1" }}>
                ✏️ Write a Review
              </div>
              {submitted ? (
                <div style={{ padding: "16px", background: "rgba(40,160,80,.1)", border: "1px solid rgba(40,160,80,.3)", borderRadius: 8, color: "#5de08a", fontSize: ".85rem" }}>
                  ✅ Thanks for your review! It's been submitted.
                </div>
              ) : (
                <div className="bp-form">
                  <div className="bp-rating-row">
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                    <span className="bp-rating-label">
                      {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                    </span>
                  </div>
                  <input
                    className="bp-input"
                    placeholder="Your name"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                  />
                  <textarea
                    className="bp-input bp-textarea"
                    placeholder="Share your thoughts about this movie…"
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                  />
                  <button
                    className="bp-submit"
                    onClick={submitReview}
                    disabled={submitting || !reviewName.trim() || !reviewText.trim()}
                  >
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="bp-sidebar">
            {/* Share box */}
            <div className="bp-sidebar-box">
              <div className="bp-sidebar-title">Share</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  ["🐦 Twitter", `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`],
                  ["📘 Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`],
                  ["🔗 Copy Link", null],
                ].map(([label, url]) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (url) window.open(url, "_blank");
                      else navigator.clipboard.writeText(window.location.href);
                    }}
                    style={{
                      padding: "6px 13px", background: "#252525", border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 7, color: "rgba(255,255,255,.7)", fontSize: ".74rem", fontWeight: 600,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Stats box */}
            <div className="bp-sidebar-box">
              <div className="bp-sidebar-title">Article Info</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["📅 Published", formatDate(post.createdAt)],
                  ["✍️ Author", post.author || "OllyPedia Editorial"],
                  ["🏷 Category", post.category || "General"],
                  ["⏱ Read Time", `${post.readTime || 3} min`],
                  ["👁 Views", (post.views || 0).toLocaleString()],
                  avg > 0 ? ["⭐ Rating", `${avg}/5`] : null,
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem" }}>
                    <span style={{ color: "rgba(255,255,255,.4)" }}>{k}</span>
                    <span style={{ color: "#f1f1f1", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <div className="bp-sidebar-box">
                <div className="bp-sidebar-title">Related Articles</div>
                {related.map(rel => (
                  <div key={rel._id} className="bp-rel-item" onClick={() => navigate(`/blog/${rel.slug}`)}>
                    {rel.coverImage ? (
                      <img src={rel.coverImage} alt={rel.title} className="bp-rel-thumb" onError={e => e.target.style.display="none"} />
                    ) : (
                      <div className="bp-rel-thumb" style={{ display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem" }}>🎬</div>
                    )}
                    <div>
                      <div className="bp-rel-title">{rel.title}</div>
                      <div className="bp-rel-meta">{formatDate(rel.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}