import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { g as getAdminToken, I as ImageUploadInput } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const _API_ROOT = "http://localhost:4000".replace(/\/$/, "");
const API_BASE = _API_ROOT.endsWith("/api") ? _API_ROOT : _API_ROOT + "/api";
const ARTICLE_TYPES = [
  { id: "review", label: "🎬 Movie Review", color: "#c9973a" },
  { id: "ott-release", label: "📺 OTT Release Feature", color: "#7ec8e3" },
  { id: "ott-streaming", label: "🔴 Now Streaming on OTT", color: "#4ade80" },
  { id: "movie-details", label: "📄 Full Movie Details", color: "#e8c87a" },
  { id: "song-details", label: "🎵 Song Feature", color: "#b388ff" },
  { id: "story", label: "📖 Story & Plot", color: "#7aaae8" },
  { id: "cast", label: "👥 Cast Spotlight", color: "#a78be8" },
  { id: "music", label: "🎵 Music & Songs", color: "#4caf82" },
  { id: "analysis", label: "🔍 Deep Dive", color: "#e8c87a" },
  { id: "trivia", label: "💡 Trivia & Facts", color: "#e5799a" },
  { id: "custom", label: "✏️ Custom Prompt", color: "#a0c4a0" }
  // free-form
];
const BLOG_CATEGORIES = [
  "Movie Review",
  "Actor Spotlight",
  "Top 10",
  "General",
  "Behind the Scenes",
  "Music",
  "Industry News",
  "Opinion",
  "Movie Update",
  "OTT Release",
  "Song Updates"
];
function slugify(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function wordCount(txt) {
  return txt.split(/\s+/).filter(Boolean).length;
}
function readTime(txt) {
  return Math.max(1, Math.ceil(wordCount(txt) / 200));
}
function buildMoviePrompt(movie, type) {
  var _a, _b, _c;
  const cast = (movie.cast || []).slice(0, 5).map((c) => `${c.name}${c.role ? ` as ${c.role}` : ""}`).join(", ");
  const songs = (((_a = movie.media) == null ? void 0 : _a.songs) || []).slice(0, 3).map((s) => s.title).filter(Boolean).join(", ");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "upcoming";
  const genre = (movie.genre || []).join(", ") || "Odia";
  const platform = movie.streamingOn || ((_b = movie.ott) == null ? void 0 : _b.platform) || "OTT Platform";
  const ottDate = movie.ottReleaseDate || ((_c = movie.ott) == null ? void 0 : _c.releaseDate) || "TBA";
  const ctx = `Movie: "${movie.title}" (${year}) | Genre: ${genre} | Director: ${movie.director || "N/A"} | Cast: ${cast || "N/A"} | OTT Platform: ${platform} | OTT Date: ${ottDate} | Songs: ${songs || "N/A"} | Synopsis: ${movie.synopsis || "N/A"} | Verdict: ${movie.verdict || "Upcoming"}`;
  const htmlRules = `
OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML. No markdown. No plain text. No code blocks.
- Wrap everything in <article>
- Use <h2> for section headings (NOT <h1> — the page already has a title)
- Use <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each, short and readable)
- Use <ul><li> for bullet point lists
- Use <ol><li> for numbered lists
- Use <strong> for emphasis on key terms
- Use <table> for any data/comparison (with <thead><tbody><tfoot>)
- Include a Movie & OTT Details Table (Movie Title, OTT Platform, OTT Release Date, Theatrical Release, Genre, Director, Lead Cast) using <table>
- End with a <section class="faq-section"><h2>Frequently Asked Questions</h2> block with 4–5 <details><summary> FAQ items
- 800–1200 words total
- SEO-friendly: include the movie name naturally in the first 100 words
- Short paragraphs, subheading every 150–200 words
- Do NOT use inline styles
- Do NOT output any text outside the <article> tag`;
  const map = {
    "ott-release": `You are an expert SEO content writer for Ollypedia. Write a dual-language (English + Odia translation) OTT Release article for "${movie.title}" releasing on ${platform}.

Sections to include:
1. Engaging introduction (mention "${movie.title}" OTT premiere on ${platform})
2. OTT & Movie Details Table (Movie Title, OTT Platform, OTT Release Date, Language, Genre, Director, Lead Cast)
3. Story & Plot Overview
4. Director's Vision & Production Value
5. Star Performances & Cast Highlights
6. Platform & Viewing Guide for ${platform}
7. Conclusion & Countdown
8. FAQ section

${ctx}
${htmlRules}`,
    "ott-streaming": `You are an expert SEO content writer for Ollypedia. Write an excited, dual-language (English + Odia translation) "NOW STREAMING ON OTT" article for "${movie.title}" streaming live NOW on ${platform}.

Sections to include:
1. Breaking-news introduction (announcing "${movie.title}" is NOW LIVE on ${platform})
2. OTT & Movie Details Table (Movie Title, OTT Platform, Release Status: Streaming, Genre, Director, Lead Cast)
3. Story & Emotional Hook
4. Lead Performances & Character Highlights
5. How to Watch on ${platform} Today
6. Verdict & Final Recommendation
7. FAQ section

${ctx}
${htmlRules}`,
    "movie-details": `You are an expert SEO content writer for Ollypedia. Write a comprehensive Movie Details article for "${movie.title}" (${year}).

Sections to include:
1. Complete Introduction to "${movie.title}"
2. Movie & OTT Details Table (Movie Title, Release Date, Language, Genre, Director, Producer, Starring Cast, Music Director)
3. Full Storyline & Plot Breakdown
4. Lead Cast & Character Profiles
5. Music, Songs & Soundtrack Highlights
6. Theatrical & Digital Release Status
7. FAQ section

${ctx}
${htmlRules}`,
    "song-details": `You are an expert SEO content writer for Ollypedia. Write a Song Release & Soundtrack Feature article for "${movie.title}".

Sections to include:
1. Song Release Introduction
2. Track Details Table (Song Title, Movie, Singer, Music Director, Lyricist, Platform)
3. Musical Style & Composition Breakdown
4. Vocal Performance & Lyrics Significance
5. Music Video & Visual Highlights
6. FAQ section

${ctx}
${htmlRules}`,
    review: `You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured, AdSense-friendly HTML movie review for the Odia film "${movie.title}" (${year}).

Sections to include:
1. Engaging introduction (mention "${movie.title}" in first sentence)
2. Movie & OTT Details Table
3. Story & Plot Overview
4. Performances & Cast
5. Direction & Screenplay
6. Music & Soundtrack
7. Verdict & Final Thoughts
8. Key Highlights (as <ul>)
9. FAQ section

${ctx}
${htmlRules}`,
    story: `You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured HTML story and plot breakdown article for "${movie.title}" (${year}).

Sections to include:
1. Introduction — what the film is about
2. Movie & OTT Details Table
3. Story Overview
4. Key Plot Points & Narrative Arc
5. Emotional Beats & Themes
6. What Makes the Story Stand Out (as <ul>)
7. Comparison Table — "${movie.title}" vs similar Odia films (themes, tone, style)
8. FAQ section

${ctx}
${htmlRules}`,
    cast: `You are an expert SEO content writer for Ollypedia. Write a fully structured HTML cast spotlight article for "${movie.title}" (${year}).

Sections to include:
1. Introduction
2. Lead Cast — profile each major actor/actress (use <h3> per person)
3. Supporting Cast Highlights
4. Director & Key Crew
5. Cast Performance Table (Name | Role | Highlights) using <table>
6. FAQ section

${ctx}
${htmlRules}`,
    music: `You are an expert SEO content writer for Ollypedia. Write a fully structured HTML music review for "${movie.title}" (${year}).

Sections to include:
1. Introduction — overall feel of the soundtrack
2. Music Director's Style
3. Song-by-Song Breakdown (use <h3> per song, short paragraph each)
4. Songs Table (Song Title | Singer | Mood | Rating) using <table>
5. Background Score
6. Verdict on Soundtrack
7. FAQ section

${ctx}
${htmlRules}`,
    analysis: `You are an expert SEO content writer for Ollypedia. Write a fully structured HTML deep-dive analysis for "${movie.title}" (${year}).

Sections to include:
1. Introduction
2. Themes & Symbolism
3. Cinematography & Visual Style
4. Direction & Screenplay Analysis
5. Cultural & Social Significance
6. Key Strengths & Weaknesses (as two <ul> lists)
7. Comparison Table — "${movie.title}" vs recent Odia films
8. FAQ section

${ctx}
${htmlRules}`,
    trivia: `You are an expert SEO content writer for Ollypedia. Write a fully structured HTML trivia & facts article for "${movie.title}" (${year}).

Sections to include:
1. Introduction
2. Behind the Scenes Facts (as <ul>)
3. Casting & Production Challenges
4. Interesting On-Set Stories
5. Box Office & Reception
6. Fun Facts Table (Fact | Detail) using <table>
7. FAQ section

${ctx}
${htmlRules}`
  };
  return map[type] || map.review;
}
function autoTitle(movie, type) {
  var _a;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const genre = (movie.genre || []).join(", ") || "Odia Film";
  const platform = movie.streamingOn || ((_a = movie.ott) == null ? void 0 : _a.platform) || "OTT";
  return {
    "ott-release": `${movie.title} OTT Release Date Announced: Premieres on ${platform} (${movie.title} ଓଟିଟି ରିଲିଜ୍)`,
    "ott-streaming": `${movie.title} Is Now Streaming on ${platform}: Watch Online Today (${movie.title} ବର୍ତ୍ତମାନ ଷ୍ଟ୍ରିମିଂ)`,
    "movie-details": `${movie.title}${year ? ` (${year})` : ""} Movie Details, Cast, Story & Release Date`,
    "song-details": `${movie.title} Song Release: Music, Lyrics & Video Breakdown`,
    review: `${movie.title}${year ? ` (${year})` : ""} – ${genre} Odia Movie Review & Story`,
    story: `${movie.title} – Full Story, Plot & Narrative Breakdown`,
    cast: `${movie.title} – Cast Spotlight: Meet the Actors & Characters`,
    music: `${movie.title} – Music Review: Songs, Score & Soundtrack`,
    analysis: `${movie.title} – Deep Dive Analysis & Themes`,
    trivia: `${movie.title} – Interesting Trivia, Facts & Behind the Scenes`,
    custom: `${movie.title} – Article`
  }[type] || `${movie.title} – Article`;
}
function autoCategory(type) {
  return {
    "ott-release": "OTT Release",
    "ott-streaming": "OTT Release",
    "movie-details": "Movie Update",
    "song-details": "Song Updates",
    review: "Movie Review",
    story: "Movie Review",
    cast: "Actor Spotlight",
    music: "Music",
    analysis: "General",
    trivia: "General"
  }[type] || "General";
}
function buildCastPrompt(castMember, type) {
  const movies = (castMember.movies || []).slice(0, 5).map((m) => typeof m === "string" ? m : m.title || "").filter(Boolean).join(", ");
  const ctx = `Name: ${castMember.name} | Type: ${castMember.type || "Actor"} | Known for: ${movies || "Ollywood films"} | Bio: ${castMember.bio || "N/A"}`;
  const htmlRules = `
OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML wrapped in <article>. No markdown. No plain text.
- Use <h2> for section headings (NOT <h1>)
- Use <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each)
- Use <ul><li> for bullet lists
- Use <strong> for emphasis
- Use <table> for any data (with <thead><tbody>)
- End with <section class="faq-section"><h2>Frequently Asked Questions</h2> with 4–5 <details><summary> FAQ items
- 800–1200 words total. SEO-friendly.
- Do NOT use inline styles. Do NOT output anything outside <article>.`;
  const map = {
    profile: `You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured HTML profile/biography article for ${castMember.type || "actor"} "${castMember.name}".

Sections:
1. Introduction — who they are and why they matter in Ollywood
2. Early Life & Background
3. Career Journey & Breakthrough
4. Notable Works (as <ul>)
5. Awards & Recognition
6. Personal Life
7. Legacy & Impact
8. FAQ section

${ctx}
${htmlRules}`,
    interview: `You are an expert SEO content writer for Ollypedia. Write a creative HTML Q&A-style interview feature with ${castMember.name} (${castMember.type || "actor"}) about their career in Odia cinema.

Sections:
1. Introduction
2. 6–8 interview Q&A pairs (use <h3> for each question, <p> for the answer)
3. Career Highlights Table (Film | Year | Role/Contribution) using <table>
4. FAQ section

${ctx}
${htmlRules}`,
    spotlight: `You are an expert SEO content writer for Ollypedia. Write a fully structured HTML spotlight/feature article on ${castMember.name} (${castMember.type || "actor"}) for fans of Odia cinema.

Sections:
1. Introduction
2. Career Milestones (as <ul>)
3. Why Fans Love Them
4. Best Performances / Works
5. What Sets Them Apart
6. Quick Facts Table using <table>
7. FAQ section

${ctx}
${htmlRules}`
  };
  return map[type] || map.profile;
}
function autoCastTitle(castMember, type) {
  return {
    profile: `${castMember.name} – Biography, Career & Films | Odia Cinema`,
    interview: `${castMember.name} – Exclusive Interview | Ollywood`,
    spotlight: `${castMember.name} – Actor Spotlight | Odia Cinema`,
    custom: `${castMember.name} – Article`
  }[type] || `${castMember.name} – Article`;
}
const CAST_ARTICLE_TYPES = [
  { id: "profile", label: "👤 Biography", color: "#a78be8" },
  { id: "interview", label: "🎤 Interview", color: "#7aaae8" },
  { id: "spotlight", label: "⭐ Spotlight", color: "#e8c87a" },
  { id: "custom", label: "✏️ Custom Prompt", color: "#a0c4a0" }
];
let _blogCache = null;
let _blogCacheProm = null;
async function getAllBlogs() {
  if (_blogCache !== null) return _blogCache;
  if (_blogCacheProm) return _blogCacheProm;
  _blogCacheProm = (async () => {
    const token = getAdminToken();
    const res = await fetch(`${API_BASE}/admin/blog`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = res.ok ? await res.json() : [];
    _blogCache = data;
    _blogCacheProm = null;
    return data;
  })();
  return _blogCacheProm;
}
function invalidateBlogCache() {
  _blogCache = null;
  _blogCacheProm = null;
}
async function fetchMovieBlogs(movieTitle) {
  const all = await getAllBlogs();
  return all.filter((p) => p.movieTitle === movieTitle);
}
async function fetchCastBlogs(castName) {
  const all = await getAllBlogs();
  return all.filter((p) => p.castName === castName);
}
async function fetchUncategorizedBlogs() {
  const all = await getAllBlogs();
  return all.filter((p) => !p.movieTitle && !p.castName);
}
async function callGenerateAPI(prompt) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6e4);
  try {
    const res = await fetch(`${API_BASE}/admin/generate-article`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Server error (${res.status})`);
    }
    const data = await res.json();
    const text = (data.text || "").trim();
    if (!text) throw new Error("AI returned an empty response. Please try again.");
    return text;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out after 60 s. Please retry.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
async function generateArticle(movie, type) {
  return callGenerateAPI(buildMoviePrompt(movie, type));
}
async function publishArticle(movie, article, type, youtubeVideoId = "") {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");
  const title = autoTitle(movie, type);
  const slug = slugify(`${movie.title}-${type}-${Date.now().toString(36)}`);
  const excerpt = article.slice(0, 200).trim() + "…";
  const res = await fetch(`${API_BASE}/admin/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title,
      slug,
      content: article,
      excerpt,
      category: autoCategory(type),
      tags: [movie.title, "Ollywood", "Odia Movie", ...movie.genre || []],
      coverImage: movie.posterUrl || movie.thumbnailUrl || "",
      movieTitle: movie.title,
      movieId: movie._id,
      author: "OllyPedia Editorial",
      readTime: readTime(article),
      seoTitle: title,
      seoDesc: excerpt,
      published: true,
      ...youtubeVideoId.trim() ? { youtubeVideoId: youtubeVideoId.trim() } : {}
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Publish failed (${res.status})`);
  }
  const post = await res.json();
  invalidateBlogCache();
  return post;
}
async function publishBlogPost({ title, content, category, tags, coverImage, movie, castMember, published, youtubeVideoId }) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");
  const slug = slugify(`${title}-${Date.now().toString(36)}`);
  const excerpt = content.slice(0, 200).trim() + "…";
  const res = await fetch(`${API_BASE}/admin/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: title.trim(),
      slug,
      content: content.trim(),
      excerpt,
      category: category || "General",
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      coverImage: coverImage || (castMember ? castMember.photo || "" : movie ? movie.posterUrl || movie.thumbnailUrl || "" : ""),
      movieTitle: (movie == null ? void 0 : movie.title) || "",
      movieId: (movie == null ? void 0 : movie._id) || null,
      castName: (castMember == null ? void 0 : castMember.name) || "",
      castId: (castMember == null ? void 0 : castMember._id) || null,
      author: "OllyPedia Editorial",
      readTime: readTime(content),
      seoTitle: title.trim(),
      seoDesc: excerpt,
      published: published !== false,
      ...(youtubeVideoId == null ? void 0 : youtubeVideoId.trim()) ? { youtubeVideoId: youtubeVideoId.trim() } : {}
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Publish failed (${res.status})`);
  }
  const post = await res.json();
  invalidateBlogCache();
  return post;
}
async function deleteArticle(id) {
  const token = getAdminToken();
  await fetch(`${API_BASE}/admin/blog/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  invalidateBlogCache();
}
async function updateArticle(id, body) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/blog/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Update failed");
  }
  invalidateBlogCache();
  return res.json();
}
const CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.bg-wrap { padding:24px 28px; }
.bg-header { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.bg-title  { font-size:1.1rem; font-weight:800; color:var(--gold); flex:1; min-width:160px; }
.bg-stats  { display:flex; gap:18px; font-size:.82rem; color:var(--muted); }
.bg-search { padding:7px 12px; border-radius:7px; border:1px solid var(--border); background:var(--bg2); color:var(--text); font-size:.85rem; width:190px; outline:none; }
.bg-new-btn  { padding:7px 15px; border-radius:7px; border:1.5px solid #90caf9; font-size:.82rem; font-weight:700; cursor:pointer; background:transparent; color:#90caf9; transition:all .15s; white-space:nowrap; }
.bg-new-btn:hover { background:rgba(144,202,249,.13); }
.bg-bulk-btn { padding:7px 15px; border-radius:7px; border:none; font-size:.82rem; font-weight:700; cursor:pointer; background:var(--gold); color:#000; white-space:nowrap; }
.bg-bulk-btn:disabled { opacity:.5; cursor:not-allowed; }
.bg-progress { margin-bottom:14px; padding:10px 14px; background:rgba(201,151,58,.1); border-radius:8px; border:1px solid rgba(201,151,58,.3); font-size:.84rem; color:var(--gold); font-weight:600; }
.bg-progress-bar  { margin-top:8px; height:6px; background:var(--bg3); border-radius:4px; overflow:hidden; }
.bg-progress-fill { height:100%; border-radius:4px; background:var(--gold); transition:width .4s; }
.bg-tip  { margin-bottom:14px; padding:8px 14px; border-radius:7px; background:rgba(255,255,255,.03); border:1px solid var(--border); font-size:.74rem; color:var(--muted); line-height:1.7; }
.bg-list { background:var(--bg2); border-radius:10px; border:1px solid var(--border); overflow:hidden; }
.bg-empty{ padding:40px; text-align:center; color:var(--muted); font-size:.9rem; }

.bg-movie-row { border-bottom:1px solid var(--border); }
.bg-movie-row:last-child { border-bottom:none; }
.bg-movie-header { display:flex; align-items:flex-start; gap:14px; padding:14px 18px; cursor:pointer; transition:background .15s; user-select:none; }
.bg-movie-header:hover { background:rgba(255,255,255,.03); }
.bg-poster    { width:38px; height:54px; object-fit:cover; border-radius:4px; flex-shrink:0; border:1px solid var(--border); background:var(--bg3); }
.bg-poster-ph { width:38px; height:54px; border-radius:4px; flex-shrink:0; border:1px solid var(--border); background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:1.2rem; }
.bg-minfo  { flex:1; min-width:0; }
.bg-mtitle { font-weight:700; font-size:.93rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bg-msub   { font-size:.75rem; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.bg-mcount { font-size:.68rem; font-weight:700; padding:1px 7px; border-radius:10px; background:rgba(201,151,58,.15); color:#c9973a; border:1px solid rgba(201,151,58,.3); }
.bg-chevron{ font-size:.8rem; color:var(--muted); margin-top:3px; transition:transform .2s; }

.bg-panel { padding:0 18px 18px 70px; }
.bg-section-label { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); margin-bottom:8px; }

.bg-articles  { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.bg-art-item  { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; }
.bg-art-dot   { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:5px; }
.bg-art-body  { flex:1; min-width:0; }
.bg-art-title { font-size:.8rem; font-weight:700; color:var(--text); line-height:1.35; margin-bottom:3px; }
.bg-art-meta  { font-size:.67rem; color:var(--muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.bg-art-actions { display:flex; gap:5px; flex-shrink:0; }
.bg-art-btn   { padding:3px 9px; border-radius:5px; border:1px solid var(--border); background:var(--bg2); color:var(--text); font-size:.67rem; cursor:pointer; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; transition:all .15s; }
.bg-art-btn:hover     { border-color:var(--gold); color:var(--gold); }
.bg-art-btn.del:hover { border-color:#e57373; color:#e57373; }

.bg-types    { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px; }
.bg-type-chip{ padding:4px 12px; border-radius:18px; border:1.5px solid; font-size:.73rem; font-weight:700; cursor:pointer; transition:all .15s; background:transparent; }
.bg-type-chip.active { filter:brightness(1.1); }

.bg-gen-box   { padding:10px 12px; background:rgba(201,151,58,.05); border:1px dashed rgba(201,151,58,.25); border-radius:8px; }
.bg-gen-row   { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.bg-gen-label { font-size:.75rem; font-weight:700; flex:1; }
.bg-gen-preview { margin-top:10px; padding:10px 12px; background:var(--bg3); border-radius:6px; font-size:.76rem; color:var(--text); line-height:1.75; white-space:pre-wrap; max-height:200px; overflow-y:auto; border:1px solid var(--border); }

.bg-btn          { padding:5px 12px; border-radius:6px; border:none; cursor:pointer; font-size:.75rem; font-weight:600; transition:opacity .15s; display:inline-flex; align-items:center; gap:6px; }
.bg-btn:disabled { opacity:.45; cursor:not-allowed; }
.bg-btn-gold  { background:var(--gold); color:#000; }
.bg-btn-green { background:#28a050; color:#fff; }
.bg-btn-red   { background:#a02828; color:#fff; }
.bg-btn-ghost { background:var(--bg3); color:var(--text); border:1px solid var(--border); }
.bg-btn-blue  { background:#1976d2; color:#fff; }

.bg-spinner { width:12px; height:12px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }

/* Modals */
.bg-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.bg-modal   { background:var(--bg2); border:1px solid var(--border); border-radius:14px; width:100%; max-width:720px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; }
.bg-modal-head  { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }
.bg-modal-title { font-size:.95rem; font-weight:800; color:var(--gold); }
.bg-modal-close { background:none; border:none; color:var(--muted); font-size:1.3rem; cursor:pointer; line-height:1; }
.bg-modal-body  { flex:1; overflow-y:auto; padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
.bg-modal-foot  { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }

.bg-field-label    { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:5px; display:flex; align-items:center; justify-content:space-between; }
.bg-field-input    { padding:9px 12px; border-radius:7px; border:1px solid var(--border); background:var(--bg3); color:var(--text); font-size:.84rem; outline:none; font-family:inherit; width:100%; box-sizing:border-box; }
.bg-field-input:focus  { border-color:rgba(201,151,58,.5); }
.bg-field-textarea { min-height:120px; resize:vertical; }
.bg-field-textarea.tall { min-height:220px; }

/* Mode toggle */
.nb-mode-row    { display:flex; border:1px solid var(--border); border-radius:9px; overflow:hidden; }
.nb-mode-btn    { flex:1; padding:10px 0; border:none; cursor:pointer; font-size:.84rem; font-weight:700; background:transparent; color:var(--muted); transition:all .15s; }
.nb-mode-btn.active { background:rgba(201,151,58,.14); color:var(--gold); }

/* Movie search dropdown */
.bg-movie-dd      { position:absolute; top:100%; left:0; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:6px; z-index:60; max-height:180px; overflow-y:auto; margin-top:2px; box-shadow:0 4px 16px rgba(0,0,0,.35); }
.bg-movie-dd-item { padding:8px 12px; cursor:pointer; font-size:.84rem; }
.bg-movie-dd-item:hover { background:var(--bg3); }

/* Prompt preview box */
.bg-prompt-box { background:rgba(144,202,249,.06); border:1px solid rgba(144,202,249,.2); border-radius:8px; padding:10px 12px; font-size:.73rem; color:#aad4f5; line-height:1.7; font-family:monospace; white-space:pre-wrap; max-height:110px; overflow-y:auto; }

/* Error / timeout banner */
.nb-err { font-size:.76rem; color:#f88; background:rgba(220,50,50,.1); border:1px solid rgba(220,50,50,.3); border-radius:7px; padding:8px 12px; }

.nb-divider { border:none; border-top:1px solid var(--border); margin:2px 0; }

/* Cast & Crew rows */
.bg-cast-row { border-bottom:1px solid var(--border); }
.bg-cast-row:last-child { border-bottom:none; }
.bg-cast-header { display:flex; align-items:center; gap:14px; padding:12px 18px; cursor:pointer; transition:background .15s; user-select:none; }
.bg-cast-header:hover { background:rgba(255,255,255,.03); }
.bg-cast-photo { width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--border); background:var(--bg3); flex-shrink:0; }
.bg-cast-photo-ph { width:38px; height:38px; border-radius:50%; flex-shrink:0; border:1px solid var(--border); background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:1rem; }

/* Main tabs inside BlogGenerator */
.bg-main-tabs { display:flex; gap:0; border-bottom:1px solid var(--border); margin-bottom:0; }
.bg-main-tab  { padding:9px 20px; border:none; cursor:pointer; font-size:.82rem; font-weight:600; background:transparent; color:var(--muted); border-bottom:2px solid transparent; transition:all .15s; }
.bg-main-tab.active { color:var(--gold); border-bottom-color:var(--gold); }
.bg-main-tab:hover:not(.active) { color:var(--text); }

/* Uncategorized blogs list */
.bg-uncat-list { display:flex; flex-direction:column; gap:6px; padding:14px 18px; }

/* Blog Editor Inserted Image Layouts */
.blog-image-row { display: flex; gap: 10px; margin: 15px 0; }
.blog-image-row figure { flex: 1; min-width: 0; margin: 0; }
.blog-image-row figure img { width: 100%; height: auto; border-radius: 6px; }
.blog-image-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 15px 0; }
.blog-image-grid figure { margin: 0; }
.blog-image-grid figure img { width: 100%; height: auto; border-radius: 6px; }
.article-inline-img { margin: 15px 0; text-align: center; }
.article-inline-img img { max-width: 100%; height: auto; border-radius: 6px; }
`;
const Spin = () => /* @__PURE__ */ jsx("span", { className: "bg-spinner" });
function DragDropImageGrid({ textareaRef, content, onChange, onToast }) {
  const fileRef = useRef(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [layout, setLayout] = useState("auto");
  const [imgSize, setImgSize] = useState("100%");
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = getAdminToken();
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`${API_BASE}/admin/upload-blog-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed (${res.status})`);
        }
        const { url } = await res.json();
        const caption = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        newImages.push({ url, caption });
      }
      setImages((prev) => [...prev, ...newImages]);
      if (newImages.length > 0) {
        onToast(`📷 ${newImages.length} photo(s) uploaded! Choose a layout and insert.`, "success");
      }
    } catch (err) {
      onToast("❌ " + err.message, "error");
    }
    setUploading(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };
  const moveImage = (index, dir) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    const newImages = [...images];
    [newImages[index], newImages[newIdx]] = [newImages[newIdx], newImages[index]];
    setImages(newImages);
  };
  const insertHtml = () => {
    if (images.length === 0) return;
    let html = "";
    let finalLayout = layout;
    if (finalLayout === "auto") {
      if (images.length === 1) finalLayout = "single";
      else if (images.length === 2) finalLayout = "row";
      else finalLayout = "grid";
    }
    if (finalLayout === "single") {
      html = images.map((img) => `
<figure style="margin: 15px auto; text-align: center; max-width: ${imgSize};">
  <img src="${img.url}" alt="${img.caption}" style="max-width: 100%; height: auto; border-radius: 6px;" />
</figure>
`).join("");
    } else if (finalLayout === "row") {
      html = `
<div style="display: flex; gap: 10px; margin: 15px auto; max-width: ${imgSize};">
` + images.map((img) => `  <figure style="flex: 1; min-width: 0; margin: 0; text-align: center;">
    <img src="${img.url}" alt="${img.caption}" style="width: 100%; height: auto; border-radius: 6px;" />
  </figure>`).join("\n") + `
</div>
`;
    } else {
      html = `
<div style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 15px auto; max-width: ${imgSize};">
` + images.map((img) => `  <figure style="margin: 0; text-align: center;">
    <img src="${img.url}" alt="${img.caption}" style="width: 100%; height: auto; border-radius: 6px;" />
  </figure>`).join("\n") + `
</div>
`;
    }
    const ta = textareaRef == null ? void 0 : textareaRef.current;
    let newContent;
    if (ta) {
      const start = ta.selectionStart ?? content.length;
      const end = ta.selectionEnd ?? content.length;
      newContent = content.slice(0, start) + html + content.slice(end);
    } else {
      newContent = content + html;
    }
    onChange(newContent);
    onToast("✅ Image block inserted into article!", "success");
    setImages([]);
  };
  return /* @__PURE__ */ jsx("div", { style: { marginTop: 8, marginBottom: 12, borderRadius: 8, background: "rgba(144,202,249,.06)", border: "1px dashed rgba(144,202,249,.35)" }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onClick: () => {
        var _a;
        return images.length === 0 && ((_a = fileRef.current) == null ? void 0 : _a.click());
      },
      style: { padding: images.length > 0 ? "8px" : "15px", textAlign: "center", cursor: images.length === 0 ? "pointer" : "default", border: images.length === 0 ? "1px dashed transparent" : "none" },
      children: [
        /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: (e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        } }),
        images.length === 0 ? /* @__PURE__ */ jsx("div", { style: { color: "#90caf9", fontSize: ".75rem", fontWeight: 600 }, children: uploading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Spin, {}),
          " Uploading…"
        ] }) : "📥 Drag & Drop Photos Here (or click to browse)" }) : /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }, children: [
            images.map((img, i) => /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: 65, height: 65 }, children: [
              /* @__PURE__ */ jsx("img", { src: img.url, style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, background: "var(--bg3)", padding: 2, borderRadius: 10, border: "1px solid var(--border)", zIndex: 10 }, children: [
                /* @__PURE__ */ jsx("button", { onClick: () => moveImage(i, -1), disabled: i === 0, style: { background: "none", border: "none", color: i === 0 ? "var(--muted)" : "var(--text)", cursor: i === 0 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }, children: "◀" }),
                /* @__PURE__ */ jsx("button", { onClick: () => moveImage(i, 1), disabled: i === images.length - 1, style: { background: "none", border: "none", color: i === images.length - 1 ? "var(--muted)" : "var(--text)", cursor: i === images.length - 1 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }, children: "▶" })
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: () => setImages(images.filter((_, idx) => idx !== i)), style: { position: "absolute", top: -5, right: -5, background: "#f88", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }, children: "✕" })
            ] }, i)),
            /* @__PURE__ */ jsx(
              "div",
              {
                onClick: () => {
                  var _a;
                  return (_a = fileRef.current) == null ? void 0 : _a.click();
                },
                style: { width: 65, height: 65, borderRadius: 4, border: "1px dashed #90caf9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#90caf9", fontSize: 20 },
                title: "Add more photos",
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "8px 12px", background: "rgba(0,0,0,.2)", borderRadius: 6 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)", fontWeight: 700 }, children: "LAYOUT:" }),
                /* @__PURE__ */ jsxs("select", { className: "bg-field-input", style: { padding: "4px 8px", fontSize: ".75rem", width: "auto" }, value: layout, onChange: (e) => setLayout(e.target.value), children: [
                  /* @__PURE__ */ jsx("option", { value: "auto", children: "Auto (Depends on count)" }),
                  /* @__PURE__ */ jsx("option", { value: "single", children: "Single (Stack)" }),
                  /* @__PURE__ */ jsx("option", { value: "row", children: "Row (Side-by-side)" }),
                  /* @__PURE__ */ jsx("option", { value: "grid", children: "Grid (Masonry)" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)", fontWeight: 700 }, children: "SIZE:" }),
                /* @__PURE__ */ jsxs("select", { className: "bg-field-input", style: { padding: "4px 8px", fontSize: ".75rem", width: "auto" }, value: imgSize, onChange: (e) => setImgSize(e.target.value), children: [
                  /* @__PURE__ */ jsx("option", { value: "100%", children: "100% (Full Width)" }),
                  /* @__PURE__ */ jsx("option", { value: "75%", children: "75% (Large)" }),
                  /* @__PURE__ */ jsx("option", { value: "50%", children: "50% (Medium)" }),
                  /* @__PURE__ */ jsx("option", { value: "25%", children: "25% (Small)" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-blue", onClick: insertHtml, disabled: uploading, style: { padding: "6px 12px", fontSize: ".75rem" }, children: uploading ? /* @__PURE__ */ jsx(Spin, {}) : "⬇️ Insert HTML" })
          ] })
        ] })
      ]
    }
  ) });
}
function parseYtId(input) {
  const s = String(input || "").trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return "";
}
function YoutubePicker({ value, onChange }) {
  const cleanId = parseYtId(value);
  const valid = cleanId.length === 11;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
      "🎬 YouTube Video",
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none", fontSize: ".65rem", color: "var(--muted)" }, children: "optional — full URL or video ID" })
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "bg-field-input",
        placeholder: "https://youtube.com/watch?v=… or just the ID",
        value,
        onChange: (e) => onChange(e.target.value)
      }
    ),
    value && valid && /* @__PURE__ */ jsxs("div", { style: { marginTop: 8, display: "flex", alignItems: "flex-start", gap: 10 }, children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: `https://img.youtube.com/vi/${cleanId}/mqdefault.jpg`,
          alt: "YouTube thumbnail",
          style: { width: 160, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", flexShrink: 0 },
          onError: (e) => e.target.style.display = "none"
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: ".69rem", lineHeight: 1.7 }, children: [
        /* @__PURE__ */ jsxs("span", { style: { color: "#4acf82" }, children: [
          "✅ Video ID: ",
          /* @__PURE__ */ jsx("b", { style: { color: "var(--text)" }, children: cleanId })
        ] }),
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)" }, children: "This video will be embedded on the blog post." })
      ] })
    ] }),
    value && !valid && /* @__PURE__ */ jsx("div", { style: { marginTop: 5, fontSize: ".69rem", color: "#f88" }, children: "⚠️ Could not detect a valid YouTube ID — paste the full URL or the 11-character ID." })
  ] });
}
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function makeFuzzyRegex(name) {
  const trimmed = name.trim();
  if (trimmed.length < 5) {
    return new RegExp(`(^|[\\s\\W])(${escapeRegex(trimmed)})(?=[\\s\\W]|$)`, "gi");
  }
  const words = trimmed.split(/\s+/);
  const fuzzyWords = words.map((word) => {
    if (word.length <= 3) return escapeRegex(word);
    let pattern = "";
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (/[a-zA-Z0-9]/.test(char)) {
        if (i === 0) {
          pattern += char;
        } else if (/[aeiouyAEIOUY]/.test(char)) {
          pattern += "[aeiouyAEIOUY]*";
        } else {
          pattern += char + "[aeiouyAEIOUY]*";
        }
      } else {
        pattern += "\\" + char;
      }
    }
    return pattern.replace(/(\[aeiouyAEIOUY\]\*)+/g, "[aeiouyAEIOUY]*");
  });
  return new RegExp(`(^|[\\s\\W])(${fuzzyWords.join("\\s+")})(?=[\\s\\W]|$)`, "gi");
}
function applyEntityLink(content, name, url) {
  if (!content || !name || !url) return content;
  const regex = new RegExp(`(^|[\\s\\W])(${escapeRegex(name)})(?=[\\s\\W]|$)`, "i");
  const parts = content.split(/(<[^>]*>)/g);
  const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
  const excludedTags = ["a", "h1", "h2", "h3", "h4", "h5", "h6", "title", "script", "style", "figure", "figcaption", "summary"];
  const normUrl = url.trim().toLowerCase();
  let tagStack = [];
  let alreadyLinkedInBody = false;
  let alreadyLinkedInTable = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("</")) {
      const match = part.match(/^<\/\s*([a-z0-9]+)/i);
      if (match) {
        const tagName = match[1].toLowerCase();
        const idx = tagStack.lastIndexOf(tagName);
        if (idx !== -1) tagStack.splice(idx, 1);
      }
    } else if (part.startsWith("<")) {
      const match = part.match(/^<\s*([a-z0-9]+)/i);
      if (match) {
        const tagName = match[1].toLowerCase();
        if (tagName === "a") {
          const hrefMatch = part.match(/href=["']([^"']+)["']/i);
          if (hrefMatch && hrefMatch[1] && hrefMatch[1].trim().toLowerCase() === normUrl) {
            const inTableOrList = tagStack.some((t) => ["table", "thead", "tbody", "tfoot", "tr", "td", "th", "dl", "dd", "dt"].includes(t.toLowerCase()));
            if (inTableOrList) alreadyLinkedInTable = true;
            else alreadyLinkedInBody = true;
          }
        }
        if (!voidElements.includes(tagName) && !part.endsWith("/>")) {
          tagStack.push(tagName);
        }
      }
    }
  }
  tagStack = [];
  let hasLinkedInBody = alreadyLinkedInBody;
  let hasLinkedInTable = alreadyLinkedInTable;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("</")) {
      const match = part.match(/^<\/\s*([a-z0-9]+)/i);
      if (match) {
        const tagName = match[1].toLowerCase();
        const idx = tagStack.lastIndexOf(tagName);
        if (idx !== -1) tagStack.splice(idx, 1);
      }
    } else if (part.startsWith("<")) {
      const match = part.match(/^<\s*([a-z0-9]+)/i);
      if (match) {
        const tagName = match[1].toLowerCase();
        if (!voidElements.includes(tagName) && !part.endsWith("/>")) {
          tagStack.push(tagName);
        }
      }
    } else if (part.trim().length > 0) {
      const isExcluded = tagStack.some((t) => excludedTags.includes(t.toLowerCase()));
      const inTableOrList = tagStack.some((t) => ["table", "thead", "tbody", "tfoot", "tr", "td", "th", "dl", "dd", "dt"].includes(t.toLowerCase()));
      if (!isExcluded) {
        if (inTableOrList && !hasLinkedInTable) {
          if (regex.test(part)) {
            parts[i] = part.replace(regex, (fullMatch, prefix, matchStr) => {
              if (!hasLinkedInTable) {
                hasLinkedInTable = true;
                return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #7ec8e3; font-weight: 600; text-decoration: none; white-space: nowrap;">${matchStr}</a>`;
              }
              return fullMatch;
            });
          }
        } else if (!inTableOrList && !hasLinkedInBody) {
          if (regex.test(part)) {
            parts[i] = part.replace(regex, (fullMatch, prefix, matchStr) => {
              if (!hasLinkedInBody) {
                hasLinkedInBody = true;
                return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #7ec8e3; font-weight: 600; text-decoration: none; white-space: nowrap;">${matchStr}</a>`;
              }
              return fullMatch;
            });
          }
        }
      }
    }
    if (hasLinkedInBody && hasLinkedInTable) break;
  }
  return parts.join("");
}
function EntityLinkerUI({ content, movies = [], cast = [], onChange }) {
  const [detected, setDetected] = useState([]);
  const [linked, setLinked] = useState([]);
  const [verifyingEntity, setVerifyingEntity] = useState(null);
  const [ignored, setIgnored] = useState([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!content) {
        setDetected([]);
        setLinked([]);
        return;
      }
      const linkRegex = /<a[^>]*href="([^"]*?(?:\/movie\/|\/cast\/)[^"]*)"[^>]*>(.*?)<\/a>/gi;
      const newLinked = [];
      let m;
      while ((m = linkRegex.exec(content)) !== null) {
        if (!newLinked.some((l) => l.fullTag === m[0])) {
          newLinked.push({ fullTag: m[0], href: m[1], text: m[2], id: m[1] + m[2] });
        }
      }
      setLinked(newLinked);
      const unlinkedText = content.replace(/<a[^>]*>.*?<\/a>/gi, " ");
      const newDetected = [];
      const checkEntity = (name, item, type) => {
        if (ignored.includes(item._id)) return;
        if (!name || name.trim().length < 3) return;
        const regex = makeFuzzyRegex(name);
        let match;
        while ((match = regex.exec(unlinkedText)) !== null) {
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          const matchedText = match[2];
          const maxDiff = Math.max(1, Math.floor(name.trim().length * 0.2));
          if (matchedText && Math.abs(matchedText.length - name.trim().length) <= maxDiff) {
            const urlPart = type === "movie" ? `/movie/${item.slug || slugify(item.title)}` : `/cast/${item._id}`;
            const dryRun = applyEntityLink(content, matchedText, urlPart);
            if (dryRun !== content) {
              if (!newDetected.some((d) => d._id === item._id)) {
                newDetected.push({ ...item, type, linkUrl: urlPart, displayName: matchedText });
              }
            }
            break;
          }
        }
      };
      movies.forEach((m2) => checkEntity(m2.title, m2, "movie"));
      cast.forEach((c) => checkEntity(c.name, c, "cast"));
      setDetected(newDetected);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, movies, cast]);
  const handleLink = (entity) => {
    onChange(applyEntityLink(content, entity.displayName, entity.linkUrl));
    if (verifyingEntity && verifyingEntity._id === entity._id) {
      setVerifyingEntity(null);
    }
  };
  const handleLinkAll = () => {
    if (!window.confirm(`Auto-link all ${detected.length} detected mentions?`)) return;
    let newContent = content;
    detected.forEach((entity) => {
      newContent = applyEntityLink(newContent, entity.displayName, entity.linkUrl);
    });
    onChange(newContent);
  };
  const handleUnlink = (linkItem) => {
    onChange(content.replace(linkItem.fullTag, linkItem.text));
  };
  const getContextSnippet = (entity) => {
    const plainText = content.replace(/<[^>]*>/g, " ");
    const idx = plainText.toLowerCase().indexOf(entity.displayName.toLowerCase());
    if (idx === -1) return null;
    const start = Math.max(0, idx - 45);
    const end = Math.min(plainText.length, idx + entity.displayName.length + 45);
    const snippet = "..." + plainText.substring(start, end).replace(/\s+/g, " ") + "...";
    const parts = snippet.split(new RegExp(`(${escapeRegex(entity.displayName)})`, "i"));
    return /* @__PURE__ */ jsx("div", { style: { fontSize: ".75rem", fontStyle: "italic", color: "var(--muted)", background: "rgba(255,255,255,0.05)", padding: 8, borderRadius: 4, marginTop: 12 }, children: parts.map((p, i) => p.toLowerCase() === entity.displayName.toLowerCase() ? /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: p }, i) : p) });
  };
  if (detected.length === 0 && linked.length === 0) return null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    (detected.length > 0 || linked.length > 0) && /* @__PURE__ */ jsxs("div", { style: { marginTop: 10, padding: 12, background: "rgba(126,200,227,.04)", border: "1px solid rgba(126,200,227,.15)", borderRadius: 8 }, children: [
      detected.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: linked.length > 0 ? 16 : 0 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: ".75rem", fontWeight: 700, color: "#7ec8e3" }, children: "✨ Detected Mentions (Not Linked Yet)" }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-blue", style: { fontSize: ".7rem", padding: "4px 8px" }, onClick: handleLinkAll, children: "🔗 Link All" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", maxHeight: 160, overflowY: "auto", paddingBottom: 6, paddingRight: 4 }, children: detected.map((d) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "var(--bg3)", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(126,200,227,.3)", width: "max-content" }, children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: d.type === "movie" ? d.posterUrl || d.thumbnailUrl : d.photo,
              alt: d.displayName,
              style: { width: 24, height: 24, borderRadius: d.type === "cast" ? "50%" : 4, objectFit: "cover" },
              onError: (e) => e.target.style.display = "none"
            }
          ),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".75rem", fontWeight: 700, color: "var(--text)" }, children: d.displayName }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".65rem", color: "var(--muted)" }, children: d.type === "movie" ? "Movie" : "Cast/Crew" })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".65rem", padding: "3px 8px", marginLeft: 4 }, onClick: () => setVerifyingEntity(d), children: "Verify" }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".65rem", padding: "3px 6px", color: "#e57373" }, onClick: () => setIgnored([...ignored, d._id]), title: "Ignore", children: "✕" })
        ] }, d._id)) })
      ] }),
      linked.length > 0 && /* @__PURE__ */ jsxs("div", { style: { borderTop: detected.length > 0 ? "1px solid rgba(255,255,255,.05)" : "none", paddingTop: detected.length > 0 ? 10 : 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", marginBottom: 8 }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: ".75rem", fontWeight: 700, color: "var(--muted)" }, children: "✅ Already Linked" }) }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 120, overflowY: "auto", paddingBottom: 4, paddingRight: 4 }, children: linked.map((l) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.03)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,.08)", width: "max-content" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: ".72rem", color: "var(--text)" }, children: l.text }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".6rem", padding: "2px 6px", color: "#e57373" }, onClick: () => handleUnlink(l), children: "✕ Unlink" })
        ] }, l.id)) })
      ] })
    ] }),
    verifyingEntity && /* @__PURE__ */ jsx("div", { className: "bg-overlay", onClick: (e) => e.target === e.currentTarget && setVerifyingEntity(null), style: { zIndex: 1e5 }, children: /* @__PURE__ */ jsxs("div", { className: "bg-modal", style: { maxWidth: 500 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-modal-head", children: [
        /* @__PURE__ */ jsx("span", { className: "bg-modal-title", children: "🔍 Verify Entity Link" }),
        /* @__PURE__ */ jsx("button", { className: "bg-modal-close", onClick: () => setVerifyingEntity(null), children: "×" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-modal-body", style: { display: "flex", gap: 16 }, children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: verifyingEntity.type === "movie" ? verifyingEntity.posterUrl || verifyingEntity.thumbnailUrl : verifyingEntity.photo,
            alt: verifyingEntity.displayName,
            style: { width: 120, height: verifyingEntity.type === "movie" ? 170 : 120, borderRadius: verifyingEntity.type === "cast" ? "50%" : 8, objectFit: "cover", border: "1px solid var(--border)" },
            onError: (e) => e.target.style.display = "none"
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("h3", { style: { margin: "0 0 4px 0", fontSize: "1.2rem", color: "var(--text)" }, children: verifyingEntity.displayName }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: ".8rem", color: "var(--gold)", fontWeight: 600, marginBottom: 12 }, children: verifyingEntity.type === "movie" ? "🎬 Movie" : `🎭 ${verifyingEntity.type || "Cast/Crew"}` }),
          getContextSnippet(verifyingEntity),
          verifyingEntity.type === "movie" ? /* @__PURE__ */ jsxs(Fragment, { children: [
            verifyingEntity.releaseDate && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".75rem", marginBottom: 4, color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("strong", { children: "Released:" }),
              " ",
              new Date(verifyingEntity.releaseDate).getFullYear()
            ] }),
            verifyingEntity.director && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".75rem", marginBottom: 8, color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("strong", { children: "Director:" }),
              " ",
              verifyingEntity.director
            ] }),
            verifyingEntity.synopsis ? /* @__PURE__ */ jsx("div", { style: { fontSize: ".8rem", color: "var(--text)", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", marginTop: 12 }, children: verifyingEntity.synopsis }) : /* @__PURE__ */ jsx("div", { style: { fontSize: ".8rem", color: "var(--muted)", fontStyle: "italic", marginTop: 12 }, children: "No synopsis available." }),
            verifyingEntity.cast && verifyingEntity.cast.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, fontSize: ".75rem", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("strong", { children: "Cast:" }),
              " ",
              verifyingEntity.cast.slice(0, 4).map((c) => c.name).join(", "),
              verifyingEntity.cast.length > 4 ? "..." : ""
            ] })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            verifyingEntity.bio ? /* @__PURE__ */ jsx("div", { style: { fontSize: ".8rem", color: "var(--text)", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", marginTop: 12 }, children: verifyingEntity.bio }) : /* @__PURE__ */ jsx("div", { style: { fontSize: ".8rem", color: "var(--muted)", fontStyle: "italic", marginTop: 12 }, children: "No bio available." }),
            /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, fontSize: ".75rem", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("strong", { children: "Roles:" }),
              " ",
              verifyingEntity.roles && verifyingEntity.roles.length > 0 ? verifyingEntity.roles.join(", ") : verifyingEntity.type || "Cast/Crew"
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, fontSize: ".75rem", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("strong", { children: "Filmography:" }),
              " ",
              movies.filter((m) => m.cast && m.cast.some((c) => c.castId === verifyingEntity._id || c.name === verifyingEntity.name)).slice(0, 8).map((m) => m.title).join(", ") || "No known movies in database."
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-modal-foot", children: [
        /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", onClick: () => setVerifyingEntity(null), children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-blue", onClick: () => handleLink(verifyingEntity), children: "✅ Approve & Link" })
      ] })
    ] }) })
  ] });
}
function EditModal({ article, movies = [], cast = [], onClose, onSaved, onToast }) {
  const [title, setTitle] = useState(article.title || "");
  const [content, setContent] = useState(article.content || "");
  const [excerpt, setExcerpt] = useState(article.excerpt || "");
  const [blogCategory, setBlogCategory] = useState(article.category || BLOG_CATEGORIES[0]);
  const [blogTags, setBlogTags] = useState(Array.isArray(article.tags) ? article.tags.join(", ") : article.tags || "");
  const [coverImage, setCoverImage] = useState(article.coverImage || "");
  const [pub, setPub] = useState(article.published !== false);
  const [youtubeVideoId, setYoutubeVideoId] = useState(article.youtubeVideoId || "");
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(null);
  React.useEffect(() => {
    if ((article == null ? void 0 : article.slug) && !article.content) {
      import("../entry-server.js").then((n) => n.a).then(({ API }) => {
        API.getBlogPost(article.slug).then((full) => {
          if (full) {
            setContent(full.content || "");
            if (full.excerpt && !article.excerpt) setExcerpt(full.excerpt);
            if (full.tags && !article.tags) setBlogTags(Array.isArray(full.tags) ? full.tags.join(", ") : full.tags);
          }
        }).catch((err) => console.error("Failed to fetch full blog:", err));
      });
    }
  }, [article]);
  const initLinkType = article.castId || article.castName ? "cast" : article.movieId || article.movieTitle ? "movie" : "none";
  const [linkType, setLinkType] = useState(initLinkType);
  const [linkedMovie, setLinkedMovie] = useState(
    article.movieId || article.movieTitle ? { _id: article.movieId, title: article.movieTitle, posterUrl: article.coverImage } : null
  );
  const [movieQuery, setMovieQuery] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const movieTimer = useRef(null);
  const [linkedCast, setLinkedCast] = useState(
    article.castId || article.castName ? { _id: article.castId, name: article.castName, type: "", photo: "" } : null
  );
  const [castQuery, setCastQuery] = useState("");
  const [castResults, setCastResults] = useState([]);
  const castTimer = useRef(null);
  useEffect(() => {
    const q = movieQuery.trim().toLowerCase();
    if (!q) {
      setMovieResults([]);
      return;
    }
    clearTimeout(movieTimer.current);
    movieTimer.current = setTimeout(() => {
      setMovieResults(movies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(movieTimer.current);
  }, [movieQuery, movies]);
  useEffect(() => {
    const q = castQuery.trim().toLowerCase();
    if (!q) {
      setCastResults([]);
      return;
    }
    clearTimeout(castTimer.current);
    castTimer.current = setTimeout(() => {
      setCastResults(cast.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(castTimer.current);
  }, [castQuery, cast]);
  const selectMovie = (m) => {
    setLinkedMovie(m);
    setMovieQuery("");
    setMovieResults([]);
  };
  const clearMovie = () => {
    setLinkedMovie(null);
    setMovieQuery("");
    setMovieResults([]);
  };
  const selectCast = (c) => {
    setLinkedCast(c);
    setCastQuery("");
    setCastResults([]);
  };
  const clearCast = () => {
    setLinkedCast(null);
    setCastQuery("");
    setCastResults([]);
  };
  const save = async () => {
    setSaving(true);
    try {
      const cleanId = parseYtId(youtubeVideoId);
      const updated = await updateArticle(article._id, {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.slice(0, 200).trim() + "…",
        category: blogCategory,
        tags: typeof blogTags === "string" ? blogTags.split(",").map((t) => t.trim()).filter(Boolean) : blogTags,
        coverImage,
        published: pub,
        youtubeVideoId: cleanId,
        // Cast link
        castId: linkType === "cast" && (linkedCast == null ? void 0 : linkedCast._id) ? linkedCast._id : null,
        castName: linkType === "cast" && (linkedCast == null ? void 0 : linkedCast.name) ? linkedCast.name : "",
        // Movie link
        movieId: linkType === "movie" && (linkedMovie == null ? void 0 : linkedMovie._id) ? linkedMovie._id : null,
        movieTitle: linkType === "movie" && (linkedMovie == null ? void 0 : linkedMovie.title) ? linkedMovie.title : ""
      });
      onSaved(updated);
      onToast("✅ Article updated!", "success");
      onClose();
    } catch (err) {
      onToast("❌ " + err.message, "error");
    }
    setSaving(false);
  };
  return /* @__PURE__ */ jsx("div", { className: "bg-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "bg-modal", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-head", children: [
      /* @__PURE__ */ jsx("span", { className: "bg-modal-title", children: "✏️ Edit Article" }),
      /* @__PURE__ */ jsx("button", { className: "bg-modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-body", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Title" }),
        /* @__PURE__ */ jsx("input", { className: "bg-field-input", value: title, onChange: (e) => setTitle(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Excerpt" }),
        /* @__PURE__ */ jsx("input", { className: "bg-field-input", value: excerpt, onChange: (e) => setExcerpt(e.target.value), placeholder: "Short teaser shown on blog cards…" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Category / Type" }),
          /* @__PURE__ */ jsx("select", { className: "bg-field-input", value: blogCategory, onChange: (e) => setBlogCategory(e.target.value), style: { appearance: "auto" }, children: BLOG_CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            "Tags ",
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none" }, children: "(comma-separated)" })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "bg-field-input",
              placeholder: "Ollywood, Drama…",
              value: blogTags,
              onChange: (e) => setBlogTags(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 10 }, children: [
        /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Cover Image URL" }),
        /* @__PURE__ */ jsx(ImageUploadInput, { value: coverImage, onChange: setCoverImage, placeholder: "https://…" }),
        coverImage && /* @__PURE__ */ jsx(
          "img",
          {
            src: coverImage,
            alt: "cover",
            style: { marginTop: 6, maxHeight: 80, borderRadius: 5, border: "1px solid var(--border)", display: "block" },
            onError: (e) => e.target.style.display = "none"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("label", { className: "bg-field-label", style: { marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { children: "Content" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "bg-btn bg-btn-blue",
              style: { padding: "3px 8px", fontSize: ".7rem" },
              onClick: async () => {
                if (!content.trim()) return;
                try {
                  const token = getAdminToken();
                  const res = await fetch(`${API_BASE}/admin/blog/auto-link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ content, movieId: (linkedMovie == null ? void 0 : linkedMovie._id) || article.movieId })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.content) {
                      setContent(data.content);
                      onToast("⚡ Auto-linked all movie & cast names in your pasted article!", "success");
                    }
                  }
                } catch (e) {
                  onToast("❌ Auto-link error: " + e.message, "error");
                }
              },
              children: "⚡ Auto-Link Movies & Cast"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          DragDropImageGrid,
          {
            textareaRef: contentRef,
            content,
            onChange: setContent,
            onToast
          }
        ),
        /* @__PURE__ */ jsx("textarea", { ref: contentRef, className: "bg-field-input bg-field-textarea tall", value: content, onChange: (e) => setContent(e.target.value) }),
        /* @__PURE__ */ jsx(EntityLinkerUI, { content, movies, cast, onChange: setContent })
      ] }),
      /* @__PURE__ */ jsx(YoutubePicker, { value: youtubeVideoId, onChange: setYoutubeVideoId }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("label", { className: "bg-field-label", style: { marginBottom: 8 }, children: [
          "Link to",
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none", fontSize: ".65rem", color: "var(--muted)" }, children: " optional" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, marginBottom: 10 }, children: [["none", "📝 Standalone"], ["movie", "🎬 Movie"], ["cast", "🎭 Cast / Crew"]].map(([v, label]) => /* @__PURE__ */ jsx(
          "button",
          {
            className: "bg-btn bg-btn-ghost",
            style: {
              flex: 1,
              justifyContent: "center",
              fontSize: ".78rem",
              background: linkType === v ? "rgba(201,151,58,.15)" : "var(--bg3)",
              borderColor: linkType === v ? "var(--gold)" : "var(--border)",
              color: linkType === v ? "var(--gold)" : "var(--muted)",
              fontWeight: linkType === v ? 700 : 500
            },
            onClick: () => {
              setLinkType(v);
              if (v !== "movie") clearMovie();
              if (v !== "cast") clearCast();
            },
            children: label
          },
          v
        )) }),
        linkType === "movie" && (linkedMovie ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(201,151,58,.08)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 8 }, children: [
          linkedMovie.posterUrl && /* @__PURE__ */ jsx(
            "img",
            {
              src: linkedMovie.posterUrl,
              alt: linkedMovie.title,
              style: { width: 26, height: 38, objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)" },
              onError: (e) => e.target.style.display = "none"
            }
          ),
          /* @__PURE__ */ jsxs("span", { style: { flex: 1, fontWeight: 700, fontSize: ".84rem", color: "var(--gold)" }, children: [
            "🎬 ",
            linkedMovie.title
          ] }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".68rem", padding: "3px 8px" }, onClick: clearMovie, children: "✕ Remove" })
        ] }) : /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "bg-field-input",
              placeholder: "Search movie to link…",
              value: movieQuery,
              onChange: (e) => setMovieQuery(e.target.value)
            }
          ),
          movieResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-movie-dd", children: movieResults.map((m) => /* @__PURE__ */ jsxs("div", { className: "bg-movie-dd-item", onClick: () => selectMovie(m), children: [
            "🎬 ",
            m.title,
            /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)", marginLeft: 8 }, children: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "" })
          ] }, m._id)) })
        ] })),
        linkType === "cast" && (linkedCast ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(167,139,232,.08)", border: "1px solid rgba(167,139,232,.3)", borderRadius: 8 }, children: [
          linkedCast.photo && /* @__PURE__ */ jsx(
            "img",
            {
              src: linkedCast.photo,
              alt: linkedCast.name,
              style: { width: 34, height: 34, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" },
              onError: (e) => e.target.style.display = "none"
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { fontWeight: 700, fontSize: ".84rem", color: "#a78be8" }, children: [
              "🎭 ",
              linkedCast.name
            ] }),
            linkedCast.type && /* @__PURE__ */ jsx("div", { style: { fontSize: ".68rem", color: "var(--muted)" }, children: linkedCast.type })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".68rem", padding: "3px 8px" }, onClick: clearCast, children: "✕ Remove" })
        ] }) : /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "bg-field-input",
              placeholder: "Search cast/crew member…",
              value: castQuery,
              onChange: (e) => setCastQuery(e.target.value)
            }
          ),
          castResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-movie-dd", children: castResults.map((c) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "bg-movie-dd-item",
              onClick: () => selectCast(c),
              style: { display: "flex", alignItems: "center", gap: 8 },
              children: [
                c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("span", { style: { fontSize: "1rem" }, children: "👤" }),
                /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: c.name }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)" }, children: c.type })
              ]
            },
            c._id
          )) })
        ] }))
      ] }),
      /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".84rem", color: "var(--text)" }, children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: pub, onChange: (e) => setPub(e.target.checked) }),
        "Published (visible on public blog)"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-foot", children: [
      /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", onClick: onClose, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-gold", onClick: save, disabled: saving || !title.trim() || !content.trim(), children: saving ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Spin, {}),
        " Saving…"
      ] }) : "💾 Save Changes" })
    ] })
  ] }) });
}
function NewBlogModal({ movies = [], cast = [], onClose, onPublished, onToast }) {
  const [mode, setMode] = useState("ai");
  const [step, setStep] = useState(1);
  const [movieQuery, setMovieQuery] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [linkedMovie, setLinkedMovie] = useState(null);
  const movieTimer = useRef(null);
  const [castQuery, setCastQuery] = useState("");
  const [castResults, setCastResults] = useState([]);
  const [linkedCast, setLinkedCast] = useState(null);
  const castTimer = useRef(null);
  const [linkType, setLinkType] = useState("movie");
  const [articleType, setArticleType] = useState("review");
  const [castArticleType, setCastArticleType] = useState("profile");
  const [userPrompt, setUserPrompt] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogCategory, setBlogCategory] = useState("General");
  const [blogTags, setBlogTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const contentRef = useRef(null);
  useEffect(() => {
    const q = movieQuery.trim().toLowerCase();
    if (!q) {
      setMovieResults([]);
      return;
    }
    clearTimeout(movieTimer.current);
    movieTimer.current = setTimeout(() => {
      setMovieResults(movies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(movieTimer.current);
  }, [movieQuery, movies]);
  useEffect(() => {
    const q = castQuery.trim().toLowerCase();
    if (!q) {
      setCastResults([]);
      return;
    }
    clearTimeout(castTimer.current);
    castTimer.current = setTimeout(() => {
      setCastResults(cast.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(castTimer.current);
  }, [castQuery, cast]);
  const selectMovie = (m) => {
    setLinkedMovie(m);
    setLinkedCast(null);
    setMovieQuery("");
    setMovieResults([]);
    if (!blogTitle) setBlogTitle(autoTitle(m, articleType));
    if (!coverImage && (m.posterUrl || m.thumbnailUrl)) setCoverImage(m.posterUrl || m.thumbnailUrl || "");
    setBlogCategory(autoCategory(articleType));
  };
  const clearMovie = () => {
    setLinkedMovie(null);
    setMovieQuery("");
    setMovieResults([]);
  };
  const selectCast = (c) => {
    setLinkedCast(c);
    setLinkedMovie(null);
    setCastQuery("");
    setCastResults([]);
    if (!blogTitle) setBlogTitle(autoCastTitle(c, castArticleType));
    if (!coverImage && c.photo) setCoverImage(c.photo || "");
    setBlogCategory("Actor Spotlight");
  };
  const clearCast = () => {
    setLinkedCast(null);
    setCastQuery("");
    setCastResults([]);
  };
  useEffect(() => {
    if (linkedMovie) {
      setBlogTitle(autoTitle(linkedMovie, articleType));
      setBlogCategory(autoCategory(articleType));
    }
  }, [articleType]);
  useEffect(() => {
    if (linkedCast) {
      setBlogTitle(autoCastTitle(linkedCast, castArticleType));
      setBlogCategory("Actor Spotlight");
    }
  }, [castArticleType]);
  const switchMode = (m) => {
    setMode(m);
    setStep(1);
    setErrMsg("");
    setBlogContent("");
  };
  const buildPrompt = useCallback(() => {
    const htmlRules = `

OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML wrapped in <article>. No markdown. No plain text outside tags.
- Use <h2> for section headings, <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each)
- Use <ul><li> for bullet lists, <ol><li> for numbered lists
- Use <strong> for emphasis, <table> for data
- End with a FAQ section: <section class="faq-section"><h2>Frequently Asked Questions</h2> with 4 <details><summary> items
- Do NOT use inline styles. Do NOT output anything outside <article>.`;
    if (linkedCast && linkType === "cast") {
      const base = buildCastPrompt(linkedCast, castArticleType);
      return userPrompt.trim() ? `${base}

Editor notes: ${userPrompt.trim()}` : base;
    }
    if (articleType === "custom") {
      const base = userPrompt.trim() || "Write an engaging 1000+ word blog article about Ollywood cinema.";
      if (linkedMovie) {
        const cast2 = (linkedMovie.cast || []).slice(0, 5).map((c) => `${c.name}${c.role ? ` as ${c.role}` : ""}`).join(", ");
        const year = linkedMovie.releaseDate ? new Date(linkedMovie.releaseDate).getFullYear() : "upcoming";
        const ctx = `

[Movie context: "${linkedMovie.title}" (${year}), Director: ${linkedMovie.director || "N/A"}, Cast: ${cast2 || "N/A"}, Synopsis: ${linkedMovie.synopsis || "N/A"}]`;
        return `${base}${ctx}${htmlRules}`;
      }
      return `${base}${htmlRules}`;
    }
    if (linkedMovie) {
      const base = buildMoviePrompt(linkedMovie, articleType);
      return userPrompt.trim() ? `${base}

Editor notes: ${userPrompt.trim()}` : base;
    }
    const topic = userPrompt.trim() || "Write an engaging 1000+ word blog article about Ollywood cinema.";
    return `You are an expert SEO blog writer for Ollypedia, an Odia cinema website.

Instructions: ${topic}

${htmlRules}

IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no backticks, no extra text) in this exact format:
{"title": "Your Blog Title Here", "content": "<article>...full HTML content here...</article>"}`;
  }, [linkedMovie, linkedCast, linkType, articleType, castArticleType, userPrompt]);
  const handleGenerate = async () => {
    var _a, _b, _c;
    if (articleType === "custom" && !linkedCast && !userPrompt.trim()) {
      setErrMsg("Please write your custom prompt before generating.");
      return;
    }
    setErrMsg("");
    setGenerating(true);
    setBlogContent("");
    try {
      const text = await callGenerateAPI(buildPrompt());
      const isCastMode = linkType === "cast" && linkedCast;
      const isMovieLinked = !!linkedMovie && articleType !== "custom";
      if (isCastMode) {
        setBlogContent(text);
        if (!blogTitle) setBlogTitle(autoCastTitle(linkedCast, castArticleType));
      } else if (isMovieLinked) {
        setBlogContent(text);
        if (!blogTitle) setBlogTitle(autoTitle(linkedMovie, articleType));
      } else {
        let parsed = null;
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          parsed = JSON.parse(clean);
        } catch {
          const lines = text.split("\n").filter(Boolean);
          parsed = { title: ((_a = lines[0]) == null ? void 0 : _a.slice(0, 100)) || "New Blog Post", content: lines.slice(1).join("\n").trim() || text };
        }
        setBlogTitle(((_b = parsed.title) == null ? void 0 : _b.trim()) || "New Blog Post");
        setBlogContent(((_c = parsed.content) == null ? void 0 : _c.trim()) || text);
      }
      setStep(2);
    } catch (err) {
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
    setGenerating(false);
  };
  const handlePublish = async () => {
    if (!blogTitle.trim() || !blogContent.trim()) return;
    setErrMsg("");
    setPublishing(true);
    try {
      const post = await publishBlogPost({
        title: blogTitle,
        content: blogContent,
        category: blogCategory,
        tags: blogTags,
        coverImage,
        movie: linkType === "movie" ? linkedMovie : null,
        castMember: linkType === "cast" ? linkedCast : null,
        published: publishNow,
        youtubeVideoId: parseYtId(youtubeVideoId)
      });
      onPublished(post);
      onClose();
    } catch (err) {
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
    setPublishing(false);
  };
  const LinkTypePicker = /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("label", { className: "bg-field-label", style: { marginBottom: 8 }, children: [
      "Link to",
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none", fontSize: ".65rem", color: "var(--muted)" }, children: "optional" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, marginBottom: 10 }, children: [["none", "📝 Standalone"], ["movie", "🎬 Movie"], ["cast", "🎭 Cast / Crew"]].map(([v, label]) => /* @__PURE__ */ jsx(
      "button",
      {
        className: "bg-btn bg-btn-ghost",
        style: {
          flex: 1,
          justifyContent: "center",
          fontSize: ".78rem",
          background: linkType === v ? "rgba(201,151,58,.15)" : "var(--bg3)",
          borderColor: linkType === v ? "var(--gold)" : "var(--border)",
          color: linkType === v ? "var(--gold)" : "var(--muted)",
          fontWeight: linkType === v ? 700 : 500
        },
        onClick: () => {
          setLinkType(v);
          if (v !== "movie") clearMovie();
          if (v !== "cast") clearCast();
        },
        children: label
      },
      v
    )) }),
    linkType === "movie" && (linkedMovie ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(201,151,58,.08)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 8 }, children: [
      (linkedMovie.posterUrl || linkedMovie.thumbnailUrl) && /* @__PURE__ */ jsx(
        "img",
        {
          src: linkedMovie.posterUrl || linkedMovie.thumbnailUrl,
          alt: linkedMovie.title,
          style: { width: 26, height: 38, objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)" },
          onError: (e) => e.target.style.display = "none"
        }
      ),
      /* @__PURE__ */ jsxs("span", { style: { flex: 1, fontWeight: 700, fontSize: ".84rem", color: "var(--gold)" }, children: [
        "🎬 ",
        linkedMovie.title
      ] }),
      /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".68rem", padding: "3px 8px" }, onClick: clearMovie, children: "✕ Remove" })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "bg-field-input",
          placeholder: "Search movie to link…",
          value: movieQuery,
          onChange: (e) => setMovieQuery(e.target.value)
        }
      ),
      movieResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-movie-dd", children: movieResults.map((m) => /* @__PURE__ */ jsxs("div", { className: "bg-movie-dd-item", onClick: () => selectMovie(m), children: [
        "🎬 ",
        m.title,
        /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)", marginLeft: 8 }, children: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "" })
      ] }, m._id)) })
    ] })),
    linkType === "cast" && (linkedCast ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(167,139,232,.08)", border: "1px solid rgba(167,139,232,.3)", borderRadius: 8 }, children: [
      linkedCast.photo && /* @__PURE__ */ jsx(
        "img",
        {
          src: linkedCast.photo,
          alt: linkedCast.name,
          style: { width: 34, height: 34, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" },
          onError: (e) => e.target.style.display = "none"
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontWeight: 700, fontSize: ".84rem", color: "#a78be8" }, children: [
          "🎭 ",
          linkedCast.name
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: ".68rem", color: "var(--muted)" }, children: linkedCast.type })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", style: { fontSize: ".68rem", padding: "3px 8px" }, onClick: clearCast, children: "✕ Remove" })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "bg-field-input",
          placeholder: "Search cast/crew member…",
          value: castQuery,
          onChange: (e) => setCastQuery(e.target.value)
        }
      ),
      castResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-movie-dd", children: castResults.map((c) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "bg-movie-dd-item",
          onClick: () => selectCast(c),
          style: { display: "flex", alignItems: "center", gap: 8 },
          children: [
            c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("span", { style: { fontSize: "1rem" }, children: "👤" }),
            /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: c.name }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--muted)" }, children: c.type })
          ]
        },
        c._id
      )) })
    ] }))
  ] });
  const MetaFields = /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Category" }),
        /* @__PURE__ */ jsx("select", { className: "bg-field-input", value: blogCategory, onChange: (e) => setBlogCategory(e.target.value), style: { appearance: "auto" }, children: BLOG_CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
          "Tags ",
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none" }, children: "(comma-separated)" })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "bg-field-input",
            placeholder: "Ollywood, Drama, 2025…",
            value: blogTags,
            onChange: (e) => setBlogTags(e.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
        "Cover Image URL ",
        /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none" }, children: "(optional)" })
      ] }),
      /* @__PURE__ */ jsx(ImageUploadInput, { value: coverImage, onChange: setCoverImage, placeholder: "https://…" }),
      coverImage && /* @__PURE__ */ jsx(
        "img",
        {
          src: coverImage,
          alt: "cover",
          style: { marginTop: 6, maxHeight: 80, borderRadius: 5, border: "1px solid var(--border)", display: "block" },
          onError: (e) => e.target.style.display = "none"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(YoutubePicker, { value: youtubeVideoId, onChange: setYoutubeVideoId }),
    linkedMovie && linkType === "movie" && /* @__PURE__ */ jsxs("div", { style: { padding: "7px 12px", background: "rgba(201,151,58,.06)", border: "1px solid rgba(201,151,58,.22)", borderRadius: 7, fontSize: ".76rem", color: "var(--gold)" }, children: [
      "🎬 Linked to movie: ",
      /* @__PURE__ */ jsx("b", { children: linkedMovie.title })
    ] }),
    linkedCast && linkType === "cast" && /* @__PURE__ */ jsxs("div", { style: { padding: "7px 12px", background: "rgba(167,139,232,.06)", border: "1px solid rgba(167,139,232,.22)", borderRadius: 7, fontSize: ".76rem", color: "#a78be8" }, children: [
      "🎭 Linked to cast: ",
      /* @__PURE__ */ jsx("b", { children: linkedCast.name }),
      " (",
      linkedCast.type,
      ")"
    ] }),
    /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".84rem", color: "var(--text)" }, children: [
      /* @__PURE__ */ jsx("input", { type: "checkbox", checked: publishNow, onChange: (e) => setPublishNow(e.target.checked) }),
      "Publish immediately (visible on public blog)"
    ] })
  ] });
  return /* @__PURE__ */ jsx("div", { className: "bg-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "bg-modal", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-head", children: [
      /* @__PURE__ */ jsxs("span", { className: "bg-modal-title", children: [
        "✍️ New Blog Post",
        mode === "ai" && step === 2 && /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", fontWeight: 500, color: "var(--muted)", marginLeft: 10 }, children: "— Review & Publish" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "bg-modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-body", children: [
      step === 1 && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "bg-field-label", style: { marginBottom: 8 }, children: "How do you want to write this blog?" }),
        /* @__PURE__ */ jsxs("div", { className: "nb-mode-row", children: [
          /* @__PURE__ */ jsx("button", { className: `nb-mode-btn${mode === "ai" ? " active" : ""}`, onClick: () => switchMode("ai"), children: "✨ AI Generate" }),
          /* @__PURE__ */ jsx("button", { className: `nb-mode-btn${mode === "manual" ? " active" : ""}`, onClick: () => switchMode("manual"), children: "✏️ Write Manually" })
        ] })
      ] }),
      mode === "ai" && step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        LinkTypePicker,
        linkType === "cast" && linkedCast && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Article Type" }),
          /* @__PURE__ */ jsx("div", { className: "bg-types", style: { marginBottom: 8 }, children: CAST_ARTICLE_TYPES.map((t) => /* @__PURE__ */ jsx(
            "button",
            {
              className: `bg-type-chip${castArticleType === t.id ? " active" : ""}`,
              style: {
                borderColor: t.color,
                color: castArticleType === t.id ? "#fff" : t.color,
                background: castArticleType === t.id ? t.color : "transparent",
                borderStyle: t.id === "custom" ? "dashed" : "solid"
              },
              onClick: () => setCastArticleType(t.id),
              children: t.label
            },
            t.id
          )) })
        ] }),
        linkType !== "cast" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Article Type" }),
          /* @__PURE__ */ jsx("div", { className: "bg-types", style: { marginBottom: articleType === "custom" ? 8 : 0 }, children: ARTICLE_TYPES.map((t) => /* @__PURE__ */ jsx(
            "button",
            {
              className: `bg-type-chip${articleType === t.id ? " active" : ""}`,
              style: {
                borderColor: t.color,
                color: articleType === t.id ? t.id === "review" ? "#000" : "#fff" : t.color,
                background: articleType === t.id ? t.color : "transparent",
                borderStyle: t.id === "custom" ? "dashed" : "solid"
              },
              onClick: () => setArticleType((p) => p === t.id ? linkedMovie ? "review" : null : t.id),
              children: t.label
            },
            t.id
          )) }),
          articleType === "custom" && /* @__PURE__ */ jsxs("div", { style: { padding: "8px 12px", background: "rgba(160,196,160,.08)", border: "1px solid rgba(160,196,160,.2)", borderRadius: 7, fontSize: ".72rem", color: "#a0c4a0", lineHeight: 1.65 }, children: [
            "✏️ ",
            /* @__PURE__ */ jsx("strong", { children: "Custom mode" }),
            " — write any prompt you like below.",
            linkedMovie && " Movie data is available as optional context."
          ] })
        ] }),
        /* @__PURE__ */ jsx("hr", { className: "nb-divider" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            linkType === "cast" && castArticleType === "custom" || linkType !== "cast" && articleType === "custom" ? "Your Custom Prompt" : linkedMovie || linkedCast ? "Extra Notes for AI" : "What should the blog be about?",
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none", fontSize: ".65rem", color: "var(--muted)" }, children: linkType === "cast" && castArticleType === "custom" || linkType !== "cast" && articleType === "custom" ? "required" : linkedMovie || linkedCast ? "optional" : "required" })
          ] }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: "bg-field-input bg-field-textarea",
              placeholder: linkedCast && linkType === "cast" ? `e.g. "Focus on their most emotional performances" or "Highlight their contribution to Odia cinema"` : linkedMovie ? `e.g. "Focus on the emotional climax" or "Highlight the music score"…` : `Describe your blog topic, tone, key points and audience.`,
              value: userPrompt,
              onChange: (e) => setUserPrompt(e.target.value),
              style: { minHeight: 100 }
            }
          )
        ] }),
        /* @__PURE__ */ jsx("hr", { className: "nb-divider" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            "Blog Title",
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, textTransform: "none", fontSize: ".65rem", color: "var(--muted)" }, children: linkedMovie || linkedCast ? "auto-filled" : "auto-generated by AI" })
          ] }),
          linkedMovie || linkedCast ? /* @__PURE__ */ jsx(
            "input",
            {
              className: "bg-field-input",
              placeholder: "Leave blank to auto-fill…",
              value: blogTitle,
              onChange: (e) => setBlogTitle(e.target.value)
            }
          ) : /* @__PURE__ */ jsx("div", { style: { padding: "9px 12px", borderRadius: 7, border: "1px dashed var(--border)", background: "rgba(255,255,255,.02)", fontSize: ".82rem", color: "var(--muted)", fontStyle: "italic" }, children: "✨ AI will generate the title from your prompt" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Category" }),
            /* @__PURE__ */ jsx("select", { className: "bg-field-input", value: blogCategory, onChange: (e) => setBlogCategory(e.target.value), style: { appearance: "auto" }, children: BLOG_CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Tags" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "bg-field-input",
                placeholder: "Ollywood, Drama…",
                value: blogTags,
                onChange: (e) => setBlogTags(e.target.value)
              }
            )
          ] })
        ] }),
        errMsg && /* @__PURE__ */ jsxs("div", { className: "nb-err", children: [
          "⚠️ ",
          errMsg
        ] })
      ] }),
      mode === "ai" && step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "bg-field-label", children: "Blog Title" }),
          /* @__PURE__ */ jsx("input", { className: "bg-field-input", value: blogTitle, onChange: (e) => setBlogTitle(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            "Generated Content — review & edit before publishing",
            /* @__PURE__ */ jsxs("span", { style: { fontWeight: 400, textTransform: "none", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ jsxs("span", { children: [
                wordCount(blogContent),
                " words · ~",
                readTime(blogContent),
                " min"
              ] }),
              /* @__PURE__ */ jsx(
                DragDropImageGrid,
                {
                  textareaRef: contentRef,
                  content: blogContent,
                  onChange: setBlogContent,
                  onToast
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              ref: contentRef,
              className: "bg-field-input bg-field-textarea tall",
              style: { minHeight: 240, resize: "vertical" },
              value: blogContent,
              onChange: (e) => setBlogContent(e.target.value)
            }
          ),
          /* @__PURE__ */ jsx(EntityLinkerUI, { content: blogContent, movies, cast, onChange: setBlogContent })
        ] }),
        MetaFields,
        errMsg && /* @__PURE__ */ jsxs("div", { className: "nb-err", children: [
          "⚠️ ",
          errMsg
        ] })
      ] }),
      mode === "manual" && /* @__PURE__ */ jsxs(Fragment, { children: [
        LinkTypePicker,
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            "Blog Title ",
            /* @__PURE__ */ jsx("span", { style: { color: "#e57373" }, children: "*" })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "bg-field-input",
              placeholder: "Enter your blog title…",
              value: blogTitle,
              onChange: (e) => setBlogTitle(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "bg-field-label", children: [
            "Content ",
            /* @__PURE__ */ jsx("span", { style: { color: "#e57373" }, children: "*" }),
            /* @__PURE__ */ jsxs("span", { style: { fontWeight: 400, textTransform: "none", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsxs("span", { children: [
                wordCount(blogContent),
                " words · ~",
                readTime(blogContent),
                " min"
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: "bg-btn bg-btn-blue",
                  style: { padding: "4px 10px", fontSize: ".72rem" },
                  onClick: async () => {
                    if (!blogContent.trim()) return;
                    try {
                      const token = getAdminToken();
                      const res = await fetch(`${API_BASE}/admin/blog/auto-link`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ content: blogContent, movieId: linkedMovie == null ? void 0 : linkedMovie._id })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.content) {
                          setBlogContent(data.content);
                          onToast("⚡ Auto-linked all movie & cast names in your pasted article!", "success");
                        }
                      }
                    } catch (e) {
                      onToast("❌ Auto-link error: " + e.message, "error");
                    }
                  },
                  children: "⚡ Auto-Link Movies & Cast (SEO Safe)"
                }
              ),
              /* @__PURE__ */ jsx(
                DragDropImageGrid,
                {
                  textareaRef: contentRef,
                  content: blogContent,
                  onChange: setBlogContent,
                  onToast
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              ref: contentRef,
              className: "bg-field-input bg-field-textarea tall",
              style: { minHeight: 260, resize: "vertical" },
              value: blogContent,
              onChange: (e) => setBlogContent(e.target.value),
              placeholder: "Paste or write your full blog content here…"
            }
          ),
          /* @__PURE__ */ jsx(EntityLinkerUI, { content: blogContent, movies, cast, onChange: setBlogContent })
        ] }),
        MetaFields,
        errMsg && /* @__PURE__ */ jsxs("div", { className: "nb-err", children: [
          "⚠️ ",
          errMsg
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-modal-foot", children: [
      mode === "ai" && step === 2 && /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", onClick: () => {
        setStep(1);
        setErrMsg("");
      }, children: "← Back & Re-generate" }),
      /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", onClick: onClose, children: "Cancel" }),
      mode === "ai" && step === 1 && /* @__PURE__ */ jsx(
        "button",
        {
          className: "bg-btn bg-btn-blue",
          onClick: handleGenerate,
          disabled: generating || articleType === "custom" && !userPrompt.trim(),
          children: generating ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Spin, {}),
            " Generating… (up to 60 s)"
          ] }) : articleType === "custom" && !userPrompt.trim() ? "✏️ Enter your prompt first" : "✨ Generate Blog"
        }
      ),
      (mode === "manual" || mode === "ai" && step === 2) && /* @__PURE__ */ jsx(
        "button",
        {
          className: "bg-btn bg-btn-green",
          onClick: handlePublish,
          disabled: publishing || !blogTitle.trim() || !blogContent.trim(),
          children: publishing ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Spin, {}),
            " Saving…"
          ] }) : publishNow ? "🚀 Publish Blog" : "💾 Save as Draft"
        }
      )
    ] })
  ] }) });
}
function GenPanel({ movie, type, onPublished, onToast }) {
  const [status, setStatus] = useState("idle");
  const [article, setArticle] = useState("");
  const [preview, setPreview] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const busy = status === "generating" || status === "publishing";
  const typeInfo = ARTICLE_TYPES.find((t) => t.id === type);
  const handleGenerate = async () => {
    if (type === "custom" && !customPrompt.trim()) {
      setErrMsg("Please enter your custom prompt first.");
      return;
    }
    setStatus("generating");
    setArticle("");
    setErrMsg("");
    setPreview(false);
    try {
      let text;
      if (type === "custom") {
        const cast = (movie.cast || []).slice(0, 5).map((c) => `${c.name}${c.role ? ` as ${c.role}` : ""}`).join(", ");
        const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "upcoming";
        const ctx = `

[Movie context: "${movie.title}" (${year}), Director: ${movie.director || "N/A"}, Cast: ${cast || "N/A"}, Synopsis: ${movie.synopsis || "N/A"}]`;
        const prompt = `${customPrompt.trim()}${ctx}

IMPORTANT: Return ONLY the article text. No labels.`;
        text = await callGenerateAPI(prompt);
      } else {
        text = await generateArticle(movie, type);
      }
      setArticle(text);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };
  const handlePublish = async () => {
    if (!article.trim()) return;
    setStatus("publishing");
    setErrMsg("");
    try {
      const post = await publishArticle(movie, article, type === "custom" ? "review" : type, youtubeVideoId);
      onPublished(post);
      onToast(`✅ Published: "${typeInfo == null ? void 0 : typeInfo.label}" for ${movie.title}`, "success");
      setStatus("idle");
      setArticle("");
      setPreview(false);
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "bg-gen-box", children: [
    type === "custom" && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 10 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: ".68rem", fontWeight: 700, color: "#a0c4a0", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }, children: "✏️ Your Custom Prompt" }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "bg-field-input bg-field-textarea",
          style: { minHeight: 100, marginBottom: 0 },
          placeholder: `Write any prompt for this movie.
e.g. "Write a 1000-word article about the visual storytelling in ${movie.title}"
e.g. "Write a comparison between ${movie.title} and similar Bollywood films"`,
          value: customPrompt,
          onChange: (e) => setCustomPrompt(e.target.value)
        }
      ),
      errMsg && /* @__PURE__ */ jsxs("div", { className: "nb-err", style: { marginTop: 6 }, children: [
        "⚠️ ",
        errMsg
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-gen-row", children: [
      /* @__PURE__ */ jsx("span", { className: "bg-gen-label", style: { color: typeInfo == null ? void 0 : typeInfo.color }, children: typeInfo == null ? void 0 : typeInfo.label }),
      errMsg && type !== "custom" && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".69rem", color: "#f77" }, children: [
        "⚠️ ",
        errMsg
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "bg-btn bg-btn-gold",
          onClick: handleGenerate,
          disabled: busy || type === "custom" && !customPrompt.trim(),
          children: status === "generating" ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Spin, {}),
            "Generating…"
          ] }) : article ? "🔄 Regenerate" : "✨ Generate"
        }
      ),
      article && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-ghost", onClick: () => setPreview((p) => !p), disabled: busy, children: preview ? "Hide" : "Preview" }),
        /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-green", onClick: handlePublish, disabled: busy, children: status === "publishing" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Spin, {}),
          "Publishing…"
        ] }) : "🚀 Publish" })
      ] }),
      status === "error" && type !== "custom" && /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-red", onClick: handleGenerate, children: "🔁 Retry" })
    ] }),
    article && preview && /* @__PURE__ */ jsx("div", { className: "bg-gen-preview", children: article }),
    article && /* @__PURE__ */ jsx("div", { style: { marginTop: 10 }, children: /* @__PURE__ */ jsx(YoutubePicker, { value: youtubeVideoId, onChange: setYoutubeVideoId }) })
  ] });
}
function MoviePanel({ movie, movies = [], cast = [], onToast }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  useEffect(() => {
    setLoading(true);
    fetchMovieBlogs(movie.title).then((posts) => setArticles(posts)).catch(() => {
    }).finally(() => setLoading(false));
  }, [movie.title]);
  const handlePublished = (post) => {
    setArticles((prev) => [post, ...prev]);
    setActiveType(null);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a._id !== id));
      onToast("🗑 Article deleted", "success");
    } catch {
      onToast("❌ Delete failed", "error");
    }
  };
  const handleSaved = (updated) => setArticles((prev) => prev.map((a) => a._id === updated._id ? updated : a));
  return /* @__PURE__ */ jsxs("div", { className: "bg-panel", children: [
    loading ? /* @__PURE__ */ jsx("div", { style: { fontSize: ".77rem", color: "var(--muted)", padding: "6px 0 10px" }, children: "Loading articles…" }) : articles.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-section-label", children: [
        "📄 Published Articles (",
        articles.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-articles", children: articles.map((art) => /* @__PURE__ */ jsxs("div", { className: "bg-art-item", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-art-dot", style: { background: art.published ? "#4caf82" : "#666" } }),
        /* @__PURE__ */ jsxs("div", { className: "bg-art-body", children: [
          /* @__PURE__ */ jsx("div", { className: "bg-art-title", children: art.title }),
          /* @__PURE__ */ jsxs("div", { className: "bg-art-meta", children: [
            /* @__PURE__ */ jsx("span", { style: { color: art.published ? "#4caf82" : "#888", fontWeight: 700 }, children: art.published ? "● Live" : "○ Draft" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "📅 ",
              formatDate(art.createdAt)
            ] }),
            art.readTime && /* @__PURE__ */ jsxs("span", { children: [
              "⏱ ",
              art.readTime,
              " min"
            ] }),
            art.views > 0 && /* @__PURE__ */ jsxs("span", { children: [
              "👁 ",
              art.views
            ] }),
            /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,.25)" }, children: art.category })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-art-actions", children: [
          /* @__PURE__ */ jsx("a", { href: `/blog/${art.slug}`, target: "_blank", rel: "noreferrer", className: "bg-art-btn", children: "🔗 View" }),
          /* @__PURE__ */ jsx("button", { className: "bg-art-btn", onClick: () => setEditTarget(art), children: "✏️" }),
          /* @__PURE__ */ jsx("button", { className: "bg-art-btn del", onClick: () => handleDelete(art._id), children: "🗑" })
        ] })
      ] }, art._id)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-section-label", children: "✨ Generate New Article — Choose Type" }),
    /* @__PURE__ */ jsx("div", { className: "bg-types", children: ARTICLE_TYPES.map((t) => /* @__PURE__ */ jsx(
      "button",
      {
        className: `bg-type-chip${activeType === t.id ? " active" : ""}`,
        style: {
          borderColor: t.color,
          color: activeType === t.id ? t.id === "review" ? "#000" : "#fff" : t.color,
          background: activeType === t.id ? t.color : "transparent"
        },
        onClick: () => setActiveType((p) => p === t.id ? null : t.id),
        children: t.label
      },
      t.id
    )) }),
    activeType && /* @__PURE__ */ jsx(GenPanel, { movie, type: activeType, onPublished: handlePublished, onToast }, activeType),
    editTarget && /* @__PURE__ */ jsx(EditModal, { article: editTarget, movies, cast, onClose: () => setEditTarget(null), onSaved: handleSaved, onToast }, editTarget._id || "new")
  ] });
}
function CastPanel({ castMember, movies = [], cast = [], onToast }) {
  var _a, _b;
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genContent, setGenContent] = useState("");
  const [genErr, setGenErr] = useState("");
  const [ytId, setYtId] = useState("");
  useEffect(() => {
    setLoading(true);
    fetchCastBlogs(castMember.name).then(setArticles).catch(() => {
    }).finally(() => setLoading(false));
  }, [castMember.name]);
  const handlePublish = async () => {
    if (!genContent.trim() || !activeType) return;
    try {
      const title = autoCastTitle(castMember, activeType);
      const slug = slugify(`${castMember.name}-${activeType}-${Date.now().toString(36)}`);
      const excerpt = genContent.slice(0, 200).trim() + "…";
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/admin/blog`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          slug,
          content: genContent,
          excerpt,
          category: "Actor Spotlight",
          tags: [castMember.name, castMember.type || "Actor", "Ollywood"],
          coverImage: castMember.photo || "",
          castName: castMember.name,
          castId: castMember._id,
          movieTitle: "",
          movieId: null,
          author: "OllyPedia Editorial",
          readTime: readTime(genContent),
          seoTitle: title,
          seoDesc: excerpt,
          published: true,
          ...ytId.trim() ? { youtubeVideoId: parseYtId(ytId) } : {}
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Publish failed");
      }
      const post = await res.json();
      invalidateBlogCache();
      setArticles((prev) => [post, ...prev]);
      setActiveType(null);
      setGenContent("");
      setYtId("");
      onToast(`✅ Published: "${title}"`, "success");
    } catch (err) {
      onToast("❌ " + err.message, "error");
    }
  };
  const handleGenerate = async (type) => {
    setGenerating(true);
    setGenContent("");
    setGenErr("");
    try {
      const text = await callGenerateAPI(buildCastPrompt(castMember, type));
      setGenContent(text);
    } catch (err) {
      setGenErr(err.message);
      onToast("❌ " + err.message, "error");
    }
    setGenerating(false);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a._id !== id));
      onToast("🗑 Deleted", "success");
    } catch {
      onToast("❌ Delete failed", "error");
    }
  };
  const handleSaved = (updated) => setArticles((prev) => prev.map((a) => a._id === updated._id ? updated : a));
  return /* @__PURE__ */ jsxs("div", { className: "bg-panel", children: [
    loading ? /* @__PURE__ */ jsx("div", { style: { fontSize: ".77rem", color: "var(--muted)", padding: "6px 0 10px" }, children: "Loading articles…" }) : articles.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-section-label", children: [
        "📄 Published Articles (",
        articles.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-articles", children: articles.map((art) => /* @__PURE__ */ jsxs("div", { className: "bg-art-item", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-art-dot", style: { background: art.published ? "#4caf82" : "#666" } }),
        /* @__PURE__ */ jsxs("div", { className: "bg-art-body", children: [
          /* @__PURE__ */ jsx("div", { className: "bg-art-title", children: art.title }),
          /* @__PURE__ */ jsxs("div", { className: "bg-art-meta", children: [
            /* @__PURE__ */ jsx("span", { style: { color: art.published ? "#4caf82" : "#888", fontWeight: 700 }, children: art.published ? "● Live" : "○ Draft" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "📅 ",
              formatDate(art.createdAt)
            ] }),
            art.readTime && /* @__PURE__ */ jsxs("span", { children: [
              "⏱ ",
              art.readTime,
              " min"
            ] }),
            art.views > 0 && /* @__PURE__ */ jsxs("span", { children: [
              "👁 ",
              art.views
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-art-actions", children: [
          /* @__PURE__ */ jsx("a", { href: `/blog/${art.slug}`, target: "_blank", rel: "noreferrer", className: "bg-art-btn", children: "🔗 View" }),
          /* @__PURE__ */ jsx("button", { className: "bg-art-btn", onClick: () => setEditTarget(art), children: "✏️" }),
          /* @__PURE__ */ jsx("button", { className: "bg-art-btn del", onClick: () => handleDelete(art._id), children: "🗑" })
        ] })
      ] }, art._id)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-section-label", children: "✨ Generate New Article — Choose Type" }),
    /* @__PURE__ */ jsx("div", { className: "bg-types", children: CAST_ARTICLE_TYPES.map((t) => /* @__PURE__ */ jsx(
      "button",
      {
        className: `bg-type-chip${activeType === t.id ? " active" : ""}`,
        style: {
          borderColor: t.color,
          color: activeType === t.id ? "#fff" : t.color,
          background: activeType === t.id ? t.color : "transparent"
        },
        onClick: () => {
          setActiveType((p) => p === t.id ? null : t.id);
          setGenContent("");
          setGenErr("");
        },
        children: t.label
      },
      t.id
    )) }),
    activeType && /* @__PURE__ */ jsxs("div", { className: "bg-gen-box", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-gen-row", children: [
        /* @__PURE__ */ jsx("span", { className: "bg-gen-label", style: { color: (_a = CAST_ARTICLE_TYPES.find((t) => t.id === activeType)) == null ? void 0 : _a.color }, children: (_b = CAST_ARTICLE_TYPES.find((t) => t.id === activeType)) == null ? void 0 : _b.label }),
        genErr && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".69rem", color: "#f77" }, children: [
          "⚠️ ",
          genErr
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "bg-btn bg-btn-gold",
            onClick: () => handleGenerate(activeType),
            disabled: generating,
            children: generating ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Spin, {}),
              "Generating…"
            ] }) : genContent ? "🔄 Regenerate" : "✨ Generate"
          }
        ),
        genContent && /* @__PURE__ */ jsx("button", { className: "bg-btn bg-btn-green", onClick: handlePublish, disabled: generating, children: "🚀 Publish" })
      ] }),
      genContent && /* @__PURE__ */ jsx("div", { style: { marginTop: 10 }, children: /* @__PURE__ */ jsx(YoutubePicker, { value: ytId, onChange: setYtId }) })
    ] }),
    editTarget && /* @__PURE__ */ jsx(EditModal, { article: editTarget, movies, cast, onClose: () => setEditTarget(null), onSaved: handleSaved, onToast }, editTarget._id || "new")
  ] });
}
function CastRow({ castMember, artCount, onToast, movies = [], cast = [] }) {
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "bg-cast-row", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-cast-header", onClick: () => setOpen((o) => !o), children: [
      castMember.photo ? /* @__PURE__ */ jsx("img", { src: castMember.photo, alt: castMember.name, className: "bg-cast-photo", onError: (e) => e.target.style.opacity = "0" }) : /* @__PURE__ */ jsx("div", { className: "bg-cast-photo-ph", children: "👤" }),
      /* @__PURE__ */ jsxs("div", { className: "bg-minfo", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-mtitle", children: castMember.name }),
        /* @__PURE__ */ jsxs("div", { className: "bg-msub", children: [
          /* @__PURE__ */ jsx("span", { style: { color: "#a78be8" }, children: castMember.type || "Cast" }),
          artCount > 0 ? /* @__PURE__ */ jsxs("span", { className: "bg-mcount", children: [
            artCount,
            " article",
            artCount !== 1 ? "s" : ""
          ] }) : /* @__PURE__ */ jsx("span", { className: "bg-mcount", style: { background: "rgba(255,255,255,.06)", color: "var(--muted)", borderColor: "var(--border)" }, children: "No articles" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-chevron", style: { transform: open ? "rotate(90deg)" : "none" }, children: "▶" })
    ] }),
    open && /* @__PURE__ */ jsx(CastPanel, { castMember, movies, cast, onToast })
  ] });
}
function CastBlogSection({ cast, movies = [], search, castCountMap, onToast, onCountChange }) {
  const filtered = cast.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  if (!cast.length) return /* @__PURE__ */ jsx("div", { className: "bg-empty", children: "No cast members found. Add cast first." });
  if (!filtered.length) return /* @__PURE__ */ jsx("div", { className: "bg-empty", children: "No cast members match your search." });
  return /* @__PURE__ */ jsx(Fragment, { children: filtered.map((c) => /* @__PURE__ */ jsx(
    CastRow,
    {
      castMember: c,
      artCount: castCountMap[c.name] ?? 0,
      movies,
      cast,
      onToast
    },
    c._id
  )) });
}
function UncategorizedSection({ onToast, count, onCountChange, movies = [], cast = [] }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  useEffect(() => {
    setLoading(true);
    fetchUncategorizedBlogs().then(setArticles).catch(() => {
    }).finally(() => setLoading(false));
  }, []);
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a._id !== id));
      onCountChange(-1);
      onToast("🗑 Article deleted", "success");
    } catch {
      onToast("❌ Delete failed", "error");
    }
  };
  const handleSaved = (updated) => setArticles((prev) => prev.map((a) => a._id === updated._id ? updated : a));
  if (loading) return /* @__PURE__ */ jsx("div", { className: "bg-empty", style: { padding: 24 }, children: "Loading…" });
  if (!articles.length) return /* @__PURE__ */ jsxs("div", { className: "bg-empty", children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "1.5rem", marginBottom: 8 }, children: "📝" }),
    "No standalone blogs found.",
    /* @__PURE__ */ jsx("br", {}),
    /* @__PURE__ */ jsx("span", { style: { fontSize: ".76rem", color: "var(--muted)" }, children: "Blogs created without a movie or cast link will appear here." })
  ] });
  return /* @__PURE__ */ jsxs("div", { className: "bg-uncat-list", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-section-label", style: { marginBottom: 10 }, children: [
      "📝 Standalone Blogs — ",
      articles.length,
      " article",
      articles.length !== 1 ? "s" : ""
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-articles", children: articles.map((art) => /* @__PURE__ */ jsxs("div", { className: "bg-art-item", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-art-dot", style: { background: art.published ? "#4caf82" : "#666" } }),
      /* @__PURE__ */ jsxs("div", { className: "bg-art-body", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-art-title", children: art.title }),
        /* @__PURE__ */ jsxs("div", { className: "bg-art-meta", children: [
          /* @__PURE__ */ jsx("span", { style: { color: art.published ? "#4caf82" : "#888", fontWeight: 700 }, children: art.published ? "● Live" : "○ Draft" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "📅 ",
            formatDate(art.createdAt)
          ] }),
          art.readTime && /* @__PURE__ */ jsxs("span", { children: [
            "⏱ ",
            art.readTime,
            " min"
          ] }),
          art.views > 0 && /* @__PURE__ */ jsxs("span", { children: [
            "👁 ",
            art.views
          ] }),
          /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,.25)" }, children: art.category })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-art-actions", children: [
        /* @__PURE__ */ jsx("a", { href: `/blog/${art.slug}`, target: "_blank", rel: "noreferrer", className: "bg-art-btn", children: "🔗 View" }),
        /* @__PURE__ */ jsx("button", { className: "bg-art-btn", onClick: () => setEditTarget(art), children: "✏️" }),
        /* @__PURE__ */ jsx("button", { className: "bg-art-btn del", onClick: () => handleDelete(art._id), children: "🗑" })
      ] })
    ] }, art._id)) }),
    editTarget && /* @__PURE__ */ jsx(EditModal, { article: editTarget, movies, cast, onClose: () => setEditTarget(null), onSaved: handleSaved, onToast }, editTarget._id || "new")
  ] });
}
function MovieRow({ movie, artCount, onToast, movies = [], cast = [] }) {
  const [open, setOpen] = useState(false);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "TBA";
  return /* @__PURE__ */ jsxs("div", { className: "bg-movie-row", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-movie-header", onClick: () => setOpen((o) => !o), children: [
      movie.posterUrl || movie.thumbnailUrl ? /* @__PURE__ */ jsx(
        "img",
        {
          src: movie.posterUrl || movie.thumbnailUrl,
          alt: movie.title,
          className: "bg-poster",
          onError: (e) => e.target.style.opacity = "0"
        }
      ) : /* @__PURE__ */ jsx("div", { className: "bg-poster-ph", children: "🎬" }),
      /* @__PURE__ */ jsxs("div", { className: "bg-minfo", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-mtitle", children: movie.title }),
        /* @__PURE__ */ jsxs("div", { className: "bg-msub", children: [
          /* @__PURE__ */ jsx("span", { children: year }),
          /* @__PURE__ */ jsx("span", { children: "·" }),
          /* @__PURE__ */ jsx("span", { children: (movie.genre || []).join(", ") || "Odia" }),
          /* @__PURE__ */ jsx("span", { children: "·" }),
          /* @__PURE__ */ jsx("span", { children: movie.verdict || "Upcoming" }),
          artCount > 0 && /* @__PURE__ */ jsxs("span", { className: "bg-mcount", children: [
            artCount,
            " article",
            artCount !== 1 ? "s" : ""
          ] }),
          artCount === 0 && /* @__PURE__ */ jsx("span", { className: "bg-mcount", style: { background: "rgba(255,255,255,.06)", color: "var(--muted)", borderColor: "var(--border)" }, children: "No articles" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-chevron", style: { transform: open ? "rotate(90deg)" : "none" }, children: "▶" })
    ] }),
    open && /* @__PURE__ */ jsx(MoviePanel, { movie, movies, cast, onToast })
  ] });
}
function BlogGenerator({ movies = [], cast = [], onToast }) {
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mainTab, setMainTab] = useState("movies");
  const [artCountMap, setArtCountMap] = useState({});
  const [castCountMap, setCastCountMap] = useState({});
  const [uncatCount, setUncatCount] = useState(0);
  const [countsLoaded, setCountsLoaded] = useState(false);
  useEffect(() => {
    getAllBlogs().then((all) => {
      const map = {};
      const castMap = {};
      let uncat = 0;
      all.forEach((p) => {
        if (p.movieTitle) map[p.movieTitle] = (map[p.movieTitle] || 0) + 1;
        if (p.castName) castMap[p.castName] = (castMap[p.castName] || 0) + 1;
        if (!p.movieTitle && !p.castName) uncat++;
      });
      setArtCountMap(map);
      setCastCountMap(castMap);
      setUncatCount(uncat);
    }).catch(() => {
    }).finally(() => setCountsLoaded(true));
  }, []);
  const filtered = movies.filter(
    (m) => m.title.toLowerCase().includes(search.toLowerCase())
  );
  const bulkGenerate = async () => {
    if (!window.confirm(`Generate review articles for all ${movies.length} movies? This may take several minutes.`)) return;
    setGenerating(true);
    setBulkProgress({ done: 0, total: movies.length });
    for (let i = 0; i < movies.length; i++) {
      try {
        const text = await generateArticle(movies[i], "review");
        await publishArticle(movies[i], text, "review");
      } catch {
      }
      setBulkProgress({ done: i + 1, total: movies.length });
      await new Promise((r) => setTimeout(r, 1200));
    }
    setGenerating(false);
    setBulkProgress(null);
    onToast("✅ Bulk generation complete!", "success");
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: CSS }),
    /* @__PURE__ */ jsxs("div", { className: "bg-wrap", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-header", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-title", children: [
          "✨ AI Blog Generator",
          /* @__PURE__ */ jsx("span", { style: { fontSize: ".63rem", fontWeight: 500, marginLeft: 10, color: "var(--muted)", fontFamily: "monospace" }, children: API_BASE })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-stats", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "🎬 ",
            /* @__PURE__ */ jsx("b", { style: { color: "var(--text)" }, children: movies.length }),
            " movies"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "📝 ",
            /* @__PURE__ */ jsx("b", { style: { color: "var(--gold)" }, children: "6" }),
            " article types each"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "bg-search",
            placeholder: "Search movies…",
            value: search,
            onChange: (e) => setSearch(e.target.value)
          }
        ),
        /* @__PURE__ */ jsx("button", { className: "bg-new-btn", onClick: () => setShowNewModal(true), children: "✍️ New Blog" }),
        /* @__PURE__ */ jsx("button", { className: "bg-bulk-btn", onClick: bulkGenerate, disabled: generating, children: generating ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Spin, {}),
          " Generating…"
        ] }) : "🚀 Bulk Generate Reviews" })
      ] }),
      bulkProgress && /* @__PURE__ */ jsxs("div", { className: "bg-progress", children: [
        "⏳ ",
        bulkProgress.done,
        " / ",
        bulkProgress.total,
        " complete",
        /* @__PURE__ */ jsx("div", { className: "bg-progress-bar", children: /* @__PURE__ */ jsx("div", { className: "bg-progress-fill", style: { width: `${bulkProgress.done / bulkProgress.total * 100}%` } }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-tip", children: [
        "💡 ",
        /* @__PURE__ */ jsx("b", { style: { color: "var(--text)" }, children: "Two ways to create:" }),
        " ",
        "Click ",
        /* @__PURE__ */ jsx("b", { style: { color: "#90caf9" }, children: "✍️ New Blog" }),
        " then choose ",
        /* @__PURE__ */ jsx("b", { style: { color: "#90caf9" }, children: "✨ AI Generate" }),
        " or ",
        /* @__PURE__ */ jsx("b", { style: { color: "#90caf9" }, children: "✏️ Write Manually" }),
        " — with or without linking a movie. Or expand any movie below and pick an article type for quick AI generation."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-list", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-main-tabs", children: [
          /* @__PURE__ */ jsxs("button", { className: `bg-main-tab${mainTab === "movies" ? " active" : ""}`, onClick: () => setMainTab("movies"), children: [
            "🎬 Movies ",
            Object.keys(artCountMap).length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".68rem", marginLeft: 4, color: "var(--muted)" }, children: [
              "(",
              Object.values(artCountMap).reduce((a, b) => a + b, 0),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: `bg-main-tab${mainTab === "cast" ? " active" : ""}`, onClick: () => setMainTab("cast"), children: [
            "🎭 Cast & Crew ",
            Object.keys(castCountMap).length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".68rem", marginLeft: 4, color: "var(--muted)" }, children: [
              "(",
              Object.values(castCountMap).reduce((a, b) => a + b, 0),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: `bg-main-tab${mainTab === "uncat" ? " active" : ""}`, onClick: () => setMainTab("uncat"), children: [
            "📝 Other Blogs ",
            uncatCount > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".68rem", marginLeft: 4, color: "var(--muted)" }, children: [
              "(",
              uncatCount,
              ")"
            ] })
          ] })
        ] }),
        !countsLoaded ? /* @__PURE__ */ jsx("div", { className: "bg-empty", style: { padding: 20, fontSize: ".85rem" }, children: "Loading blog counts…" }) : mainTab === "movies" ? filtered.length === 0 ? /* @__PURE__ */ jsx("div", { className: "bg-empty", children: search ? "No movies match your search." : "No movies found." }) : filtered.map((movie) => /* @__PURE__ */ jsx(
          MovieRow,
          {
            movie,
            artCount: artCountMap[movie.title] ?? 0,
            movies,
            cast,
            onToast
          },
          movie._id
        )) : mainTab === "cast" ? /* @__PURE__ */ jsx(
          CastBlogSection,
          {
            cast,
            movies,
            search,
            castCountMap,
            onToast,
            onCountChange: (name, delta) => setCastCountMap((prev) => ({ ...prev, [name]: Math.max(0, (prev[name] || 0) + delta) }))
          }
        ) : /* @__PURE__ */ jsx(
          UncategorizedSection,
          {
            onToast,
            count: uncatCount,
            movies,
            cast,
            onCountChange: (delta) => setUncatCount((p) => Math.max(0, p + delta))
          }
        )
      ] })
    ] }),
    showNewModal && /* @__PURE__ */ jsx(
      NewBlogModal,
      {
        movies,
        cast,
        onClose: () => setShowNewModal(false),
        onPublished: (post) => {
          onToast(`✅ Blog published: "${post.title}"`, "success");
          setShowNewModal(false);
          if (post.movieTitle) {
            setArtCountMap((prev) => ({ ...prev, [post.movieTitle]: (prev[post.movieTitle] || 0) + 1 }));
          } else if (post.castName) {
            setCastCountMap((prev) => ({ ...prev, [post.castName]: (prev[post.castName] || 0) + 1 }));
          } else {
            setUncatCount((p) => p + 1);
          }
        },
        onToast
      }
    )
  ] });
}
export {
  BlogGenerator as default
};
