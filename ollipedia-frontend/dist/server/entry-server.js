import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.mjs";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useLocation, useNavigate, Link, useParams, Routes, Route, useNavigationType } from "react-router-dom";
const BASE = "http://localhost:4000/api";
let _token = (() => {
  try {
    return localStorage.getItem("op_token");
  } catch {
    return null;
  }
})();
const setToken = (t) => {
  _token = t;
  try {
    t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token");
  } catch {
  }
};
const getToken = () => _token;
let _castToken = (() => {
  try {
    return localStorage.getItem("cm_token");
  } catch {
    return null;
  }
})();
const setCastToken = (t) => {
  _castToken = t;
  try {
    t ? localStorage.setItem("cm_token", t) : localStorage.removeItem("cm_token");
  } catch {
  }
};
const getCastToken = () => _castToken;
let _adminToken = (() => {
  try {
    return localStorage.getItem("admin_token");
  } catch {
    return null;
  }
})();
const setAdminToken = (t) => {
  _adminToken = t;
  try {
    t ? localStorage.setItem("admin_token", t) : localStorage.removeItem("admin_token");
  } catch {
  }
};
const getAdminToken = () => _adminToken;
const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};
const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: body !== void 0 ? JSON.stringify(body) : void 0
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};
const get = (path, token) => req("GET", path, void 0, token);
const post = (path, body, token) => req("POST", path, body, token);
const patch = (path, body, token) => req("PATCH", path, body, token);
const del = (path, token) => req("DELETE", path, void 0, token);
const API = {
  // ── Public
  getMovies: () => get("/movies"),
  getMovie: (id) => get(`/movies/${id}`),
  getCast: () => get("/cast"),
  searchCast: (q) => get(`/cast/search/${encodeURIComponent(q)}`),
  searchCastByType: (type, q) => get(`/cast/search-type/${encodeURIComponent(type)}/${encodeURIComponent(q)}`),
  getCastMember: (id) => get(`/cast/${id}`),
  getNews: () => get("/news"),
  getNewsItem: (id) => get(`/news/${id}`),
  getSongs: () => get("/songs"),
  postReview: (id, body) => post(`/movies/${id}/reviews`, body),
  getInterested: (id) => get(`/movies/${id}/interested`),
  postInterested: (id, vote) => post(`/movies/${id}/interested`, { vote }),
  getProductions: () => get("/productions"),
  getProduction: (id) => get(`/productions/${id}`),
  searchProductions: (q) => get(`/productions/search/${encodeURIComponent(q)}`),
  getProductionMovies: (id) => get(`/productions/${id}/movies`),
  // ── Production auth
  register: (body) => post("/auth/register", body),
  login: (email, pw) => post("/auth/login", { email, password: pw }),
  updateProfile: (body) => patch("/productions/me", body, _token),
  // ── Cast member auth
  castRegister: (body) => post("/cast-auth/register", body),
  castLogin: (email, pw) => post("/cast-auth/login", { email, password: pw }),
  castGetMe: () => get("/cast-auth/me", _castToken),
  castUpdateMe: (body) => patch("/cast-auth/me", body, _castToken),
  // ── Movie management (production token)
  createMovie: (body) => post("/movies", body, _token),
  updateMovie: (id, body) => patch(`/movies/${id}`, body, _token),
  updateBoxOffice: (id, body) => patch(`/movies/${id}/boxoffice`, body, _token),
  addCastToMovie: (id, data) => post(`/movies/${id}/cast`, data, _token),
  removeCastFromMovie: (id, castId) => del(`/movies/${id}/cast/${castId}`, _token),
  addSong: (id, song) => post(`/movies/${id}/songs`, song, _token),
  removeSong: (id, idx) => del(`/movies/${id}/songs/${idx}`, _token),
  updateTrailer: (id, data) => patch(`/movies/${id}/trailer`, data, _token),
  addCollaborator: (id, pid) => post(`/movies/${id}/collaborators`, { productionId: pid }, _token),
  addNews: (id, body) => post(`/movies/${id}/news`, body, _token),
  editNews: (nid, body) => patch(`/news/${nid}`, body, _token),
  deleteNews: (nid) => del(`/news/${nid}`, _token),
  // ── Admin auth
  adminSetupStatus: () => get("/admin/setup-status"),
  adminRegister: (username, email, password, adminSecret) => post("/admin/register", { username, email, password, adminSecret }),
  adminLogin: (username, password) => post("/admin/login", { username, password }),
  adminChangePassword: (cur, newPw) => post("/admin/change-password", { currentPassword: cur, newPassword: newPw }, _adminToken),
  // ── Admin — movies
  adminCreateMovie: (body) => post("/admin/movies", body, _adminToken),
  adminUpdateMovie: (id, body) => patch(`/admin/movies/${id}`, body, _adminToken),
  adminDeleteMovie: (id) => del(`/admin/movies/${id}`, _adminToken),
  adminAddCastToMovie: (id, entry) => post(`/admin/movies/${id}/cast`, entry, _adminToken),
  adminRemoveCastFromMovie: (id, castId) => del(`/admin/movies/${id}/cast/${castId}`, _adminToken),
  adminAddSong: (id, song) => post(`/admin/movies/${id}/songs`, song, _adminToken),
  adminUpdateSong: (id, idx, song) => patch(`/admin/movies/${id}/songs/${idx}`, song, _adminToken),
  adminAddNewsToMovie: (id, body) => post(`/admin/movies/${id}/news`, body, _adminToken),
  // ── Admin — cast
  createCast: (body) => post("/admin/cast", body, _adminToken),
  updateCast: (id, body) => patch(`/admin/cast/${id}`, body, _adminToken),
  deleteCast: (id) => del(`/admin/cast/${id}`, _adminToken),
  // ── Admin — productions
  createProduction: (body) => post("/admin/productions", body, _adminToken),
  updateProduction: (id, body) => patch(`/admin/productions/${id}`, body, _adminToken),
  deleteProduction: (id) => del(`/admin/productions/${id}`, _adminToken),
  // ── Admin — news
  adminGetAllNews: () => get("/admin/news", _adminToken),
  createNews: (body) => post("/admin/news", body, _adminToken),
  updateNews: (id, body) => patch(`/admin/news/${id}`, body, _adminToken),
  adminDeleteNews: (id) => del(`/admin/news/${id}`, _adminToken),
  // ── Admin — songs
  deleteSong: (movieId, idx) => del(`/admin/movies/${movieId}/songs/${idx}`, _adminToken),
  // ── Admin stats
  adminStats: () => get("/admin/stats", _adminToken),
  // ── Contact / Enquiries
  submitContact: (body) => post("/contact", body),
  adminGetEnquiries: () => get("/admin/enquiries", _adminToken),
  adminUnreadCount: () => get("/admin/enquiries/unread-count", _adminToken),
  adminMarkEnquiryRead: (id) => req("PATCH", `/admin/enquiries/${id}/read`, void 0, _adminToken),
  adminDeleteEnquiry: (id) => del(`/admin/enquiries/${id}`, _adminToken)
};
const isOid$2 = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());
function slugify(text = "") {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
function moviePath(movie) {
  if (!movie) return "/movies";
  if (movie.slug) return `/movie/${movie.slug}`;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const base = slugify(movie.title || "movie");
  const slug = year ? `${base}-${year}` : base;
  return `/movie/${slug}`;
}
function extractMovieParam(param = "") {
  if (!param) return "";
  if (isOid$2(param)) return param;
  return param.replace(/-[a-f0-9]{24}$/i, "");
}
const extractId = extractMovieParam;
function castPath(person) {
  if (!person) return "/cast";
  const id = person._id ? String(person._id) : "";
  const name = slugify(person.name || "");
  if (name) return `/cast/${id}/${name}`;
  return `/cast/${id}`;
}
function songPath(movie, songIndex, song) {
  const movieSlug = (movie == null ? void 0 : movie.slug) || (() => {
    const year = (movie == null ? void 0 : movie.releaseDate) ? new Date(movie.releaseDate).getFullYear() : "";
    const base = slugify((movie == null ? void 0 : movie.title) || "movie");
    return year ? `${base}-${year}` : base;
  })();
  const idx = songIndex ?? 0;
  const songSlug = (song == null ? void 0 : song.title) ? `-${slugify(song.title)}` : "";
  return `/song/${movieSlug}/${idx}${songSlug}`;
}
const _cache$1 = { movies: null, cast: null, songs: null };
function fuzzyMatch(text, query) {
  if (!text || !query) return false;
  const t = text.toLowerCase().replace(/\s+/g, "");
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (text.toLowerCase().includes(query.toLowerCase())) return true;
  if (t.includes(q)) return true;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => text.toLowerCase().includes(w))) return true;
  let ti = 0, qi = 0;
  const tl = t, ql = q;
  while (ti < tl.length && qi < ql.length) {
    if (tl[ti] === ql[qi]) qi++;
    ti++;
  }
  if (qi === ql.length && ql.length >= 3) return true;
  const dedup = (s) => s.replace(/(.)\1+/g, "$1");
  if (dedup(t).includes(dedup(q)) && q.length >= 3) return true;
  return false;
}
function matchScore(text, query) {
  if (!text) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;
  if (t.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) return 70;
  return 50;
}
function NavSearch({ onClose }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ movies: [], cast: [], songs: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    const h = (e) => {
      var _a;
      if (!((_a = wrapRef.current) == null ? void 0 : _a.contains(e.target))) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!query.trim()) {
      setResults({ movies: [], cast: [], songs: [] });
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (!_cache$1.movies) {
          const [movies, cast] = await Promise.all([API.getMovies(), API.getCast()]);
          _cache$1.movies = movies;
          _cache$1.cast = cast;
          _cache$1.songs = [];
          movies.forEach((m) => {
            var _a;
            return (((_a = m.media) == null ? void 0 : _a.songs) || []).forEach((s, idx) => {
              _cache$1.songs.push({
                ...s,
                songIndex: idx,
                movieTitle: m.title,
                movieId: String(m._id),
                _movie: m
                // full movie object for songPath()
              });
            });
          });
        }
        const q = query.trim();
        const sortByScore = (arr, getText) => arr.filter((x) => fuzzyMatch(getText(x), q)).map((x) => ({ x, score: matchScore(getText(x), q) })).sort((a, b) => b.score - a.score).map(({ x }) => x);
        setResults({
          movies: sortByScore(_cache$1.movies, (m) => m.title || "").slice(0, 5),
          cast: sortByScore(_cache$1.cast, (c) => c.name || "").slice(0, 4),
          songs: sortByScore(_cache$1.songs, (s) => s.title || "").slice(0, 5)
        });
      } catch {
        setResults({ movies: [], cast: [], songs: [] });
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);
  const total = results.movies.length + results.cast.length + results.songs.length;
  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    onClose == null ? void 0 : onClose();
  };
  return /* @__PURE__ */ jsxs("div", { className: "ns-wrap", ref: wrapRef, children: [
    open ? /* @__PURE__ */ jsxs("div", { className: "ns-box", children: [
      /* @__PURE__ */ jsx("span", { className: "ns-ico", children: "🔍" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          ref: inputRef,
          className: "ns-input",
          placeholder: "Search movies, cast, songs…",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true
        }
      ),
      query && /* @__PURE__ */ jsx("button", { className: "ns-btn", onClick: () => {
        var _a;
        setQuery("");
        (_a = inputRef.current) == null ? void 0 : _a.focus();
      }, children: "✕" }),
      /* @__PURE__ */ jsx("button", { className: "ns-btn", onClick: () => setOpen(false), children: "✕" })
    ] }) : /* @__PURE__ */ jsx("button", { className: "ns-trigger", "aria-label": "Search", onClick: () => setOpen(true), children: "🔍" }),
    open && query.trim() && /* @__PURE__ */ jsxs("div", { className: "ns-drop", children: [
      loading && /* @__PURE__ */ jsx("div", { className: "ns-msg", children: "Searching…" }),
      !loading && total === 0 && /* @__PURE__ */ jsxs("div", { className: "ns-msg", children: [
        'No results for "',
        query,
        '"'
      ] }),
      results.movies.length > 0 && /* @__PURE__ */ jsxs("div", { className: "ns-group", children: [
        /* @__PURE__ */ jsx("div", { className: "ns-glabel", children: "🎬 Movies" }),
        results.movies.map((m) => /* @__PURE__ */ jsxs("div", { className: "ns-item", onClick: () => go(moviePath(m)), children: [
          m.posterUrl && /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: m.title, className: "ns-thumb" }),
          /* @__PURE__ */ jsxs("div", { className: "ns-info", children: [
            /* @__PURE__ */ jsx("span", { className: "ns-ititle", children: m.title }),
            /* @__PURE__ */ jsxs("span", { className: "ns-isub", children: [
              m.category,
              " · ",
              m.language
            ] })
          ] })
        ] }, m._id))
      ] }),
      results.cast.length > 0 && /* @__PURE__ */ jsxs("div", { className: "ns-group", children: [
        /* @__PURE__ */ jsx("div", { className: "ns-glabel", children: "👤 Cast & Crew" }),
        results.cast.map((c) => /* @__PURE__ */ jsxs("div", { className: "ns-item", onClick: () => go(castPath(c)), children: [
          c.photo && /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, className: "ns-thumb ns-round" }),
          /* @__PURE__ */ jsxs("div", { className: "ns-info", children: [
            /* @__PURE__ */ jsx("span", { className: "ns-ititle", children: c.name }),
            /* @__PURE__ */ jsx("span", { className: "ns-isub", children: c.type })
          ] })
        ] }, c._id))
      ] }),
      results.songs.length > 0 && /* @__PURE__ */ jsxs("div", { className: "ns-group", children: [
        /* @__PURE__ */ jsx("div", { className: "ns-glabel", children: "🎵 Songs" }),
        results.songs.map((s, i) => {
          const path = s._movie ? songPath(s._movie, s.songIndex) : `/song/${s.movieId}/${s.songIndex}`;
          const thumb = s.thumbnailUrl || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : null);
          return /* @__PURE__ */ jsxs("div", { className: "ns-item", onClick: () => go(path), children: [
            thumb && /* @__PURE__ */ jsx("img", { src: thumb, alt: s.title, className: "ns-thumb" }),
            /* @__PURE__ */ jsxs("div", { className: "ns-info", children: [
              /* @__PURE__ */ jsx("span", { className: "ns-ititle", children: s.title }),
              /* @__PURE__ */ jsxs("span", { className: "ns-isub", children: [
                s.singer && `🎤 ${s.singer} · `,
                s.movieTitle
              ] })
            ] })
          ] }, i);
        })
      ] })
    ] })
  ] });
}
const CSS$8 = `
/* ── Shell ── */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  height: 58px;
  background: rgba(10,10,10,.96);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255,255,255,.07);
  display: flex;
  align-items: center;
  padding: 0 16px;
}
@media(min-width:768px){ .navbar { padding: 0 24px; } }

/* Brand — LEFT edge */
.nb-brand {
  font-family: 'Playfair Display', serif;
  font-size: 1.18rem; font-weight: 900; letter-spacing: -.01em;
  color: var(--gold, #c9973a); text-decoration: none; flex-shrink: 0;
}
.nb-brand span { color: var(--text, #f1f1f1); }

/* Flex spacer — pushes all remaining items to the RIGHT */
.nb-space { flex: 1; }

/* Nav links — desktop, RIGHT side */
.nb-links { display: none; align-items: center; gap: 2px; margin-right: 6px; }
@media(min-width:768px){ .nb-links { display: flex; } }
.nb-link {
  padding: 6px 11px; border-radius: 6px;
  font-weight: 600; font-size: .79rem;
  color: rgba(255,255,255,.58); text-decoration: none;
  white-space: nowrap; transition: color .16s, background .16s;
}
.nb-link:hover  { color: var(--text, #f1f1f1); background: rgba(255,255,255,.07); }
.nb-link.active { color: var(--gold, #c9973a); background: rgba(201,151,58,.1); }

/* ── Search ── */
.ns-wrap { position: relative; flex-shrink: 0; margin-right: 6px; }
.ns-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
  border-radius: 22px; padding: 5px 12px; width: 220px;
}
@media(min-width:480px){ .ns-box { width: 260px; } }
@media(min-width:768px){ .ns-box { width: 300px; } }
.ns-ico   { font-size: .82rem; color: rgba(255,255,255,.32); flex-shrink: 0; }
.ns-input { flex: 1; background: none; border: none; outline: none; color: var(--text,#f1f1f1); font-size: .8rem; min-width: 0; }
.ns-input::placeholder { color: rgba(255,255,255,.28); }
.ns-btn { background: none; border: none; color: rgba(255,255,255,.38); cursor: pointer; font-size: .8rem; padding: 1px 2px; }
.ns-btn:hover { color: #fff; }
.ns-trigger {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12);
  border-radius: 50%; width: 34px; height: 34px; font-size: .9rem; cursor: pointer;
  color: var(--text,#f1f1f1); display: flex; align-items: center; justify-content: center;
  transition: background .18s; flex-shrink: 0;
}
.ns-trigger:hover { background: rgba(255,255,255,.13); }
.ns-drop {
  position: absolute; top: calc(100% + 8px); right: 0;
  background: #1c1c1c; border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px; width: 320px; max-height: 420px; overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0,0,0,.75); z-index: 999;
}
@media(max-width:420px){ .ns-drop { width: calc(100vw - 20px); right: -6px; } }
.ns-msg   { padding: 14px 16px; font-size: .8rem; color: rgba(255,255,255,.4); text-align: center; }
.ns-group { padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.ns-group:last-child { border-bottom: none; }
.ns-glabel { padding: 6px 14px 3px; font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .09em; color: rgba(255,255,255,.36); }
.ns-item  { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background .14s; }
.ns-item:hover { background: rgba(255,255,255,.06); }
.ns-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 5px; flex-shrink: 0; }
.ns-round { border-radius: 50%; }
.ns-info  { flex: 1; min-width: 0; }
.ns-ititle { display: block; font-size: .8rem; font-weight: 600; color: var(--text,#f1f1f1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ns-isub  { display: block; font-size: .68rem; color: rgba(255,255,255,.38); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Admin actions ── */
.nb-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.nb-pname { font-size: .73rem; font-weight: 700; color: var(--gold,#c9973a); display: none; }
@media(min-width:640px){ .nb-pname { display: block; } }

/* ── Hamburger (mobile only) ── */
.nb-ham {
  display: flex; flex-direction: column; justify-content: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  padding: 6px; margin-left: 4px; flex-shrink: 0;
}
@media(min-width:768px){ .nb-ham { display: none; } }
.nb-ham span { display: block; width: 20px; height: 2px; background: var(--text,#f1f1f1); border-radius: 2px; transition: all .2s; }
.nb-ham.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.nb-ham.open span:nth-child(2) { opacity: 0; }
.nb-ham.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* ── Mobile drawer ── */
.nb-drawer {
  position: fixed; top: 58px; left: 0; right: 0; bottom: 0; z-index: 999;
  background: rgba(8,8,8,.98); backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  padding: 16px 20px 40px;
  transform: translateX(-100%);
  transition: transform .24s cubic-bezier(.4,0,.2,1);
  overflow-y: auto;
}
.nb-drawer.open { transform: translateX(0); }
@media(min-width:768px){ .nb-drawer { display: none !important; } }
.nb-dl {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 4px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: .94rem; font-weight: 700;
  color: rgba(255,255,255,.72); text-decoration: none;
  transition: color .16s;
  background: none; border-left: none; border-right: none; border-top: none;
  cursor: pointer; width: 100%; text-align: left;
}
.nb-dl:hover, .nb-dl.active { color: var(--gold,#c9973a); }
.nb-dl .ico { font-size: 1.1rem; width: 28px; flex-shrink: 0; }
.nb-div { border: none; border-top: 1px solid rgba(255,255,255,.08); margin: 8px 0; }
`;
const LINKS = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/movies", label: "Movies", icon: "🎬" },
  { to: "/cast", label: "Cast", icon: "👥" },
  { to: "/news", label: "News", icon: "📰" },
  { to: "/songs", label: "Songs", icon: "🎵" }
];
function Navbar({ admin, onAdminLogout }) {
  const location = useLocation();
  useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const lnk = (p) => location.pathname === p ? "nb-link active" : "nb-link";
  const dlnk = (p) => location.pathname === p ? "nb-dl active" : "nb-dl";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: CSS$8 }),
    /* @__PURE__ */ jsxs("nav", { className: "navbar", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "nb-brand", children: [
        "OLLY",
        /* @__PURE__ */ jsx("span", { children: "PEDIA" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "nb-space" }),
      /* @__PURE__ */ jsx("div", { className: "nb-links", children: LINKS.map((l) => /* @__PURE__ */ jsx(Link, { to: l.to, className: lnk(l.to), children: l.label }, l.to)) }),
      /* @__PURE__ */ jsx(NavSearch, { onClose: () => setOpen(false) }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: `nb-ham${open ? " open" : ""}`,
          "aria-label": "Menu",
          onClick: () => setOpen((o) => !o),
          children: [
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {})
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `nb-drawer${open ? " open" : ""}`,
        onClick: (e) => e.target === e.currentTarget && setOpen(false),
        children: [
          LINKS.map((l) => /* @__PURE__ */ jsxs(Link, { to: l.to, className: dlnk(l.to), children: [
            /* @__PURE__ */ jsx("span", { className: "ico", children: l.icon }),
            l.label
          ] }, l.to)),
          /* @__PURE__ */ jsx("hr", { className: "nb-div" }),
          /* @__PURE__ */ jsxs(Link, { to: "/about", className: "nb-dl", children: [
            /* @__PURE__ */ jsx("span", { className: "ico", children: "ℹ️" }),
            "About Us"
          ] }),
          /* @__PURE__ */ jsxs(Link, { to: "/privacy-policy", className: "nb-dl", children: [
            /* @__PURE__ */ jsx("span", { className: "ico", children: "📋" }),
            "Privacy Policy"
          ] }),
          /* @__PURE__ */ jsxs(Link, { to: "/contact", className: "nb-dl", children: [
            /* @__PURE__ */ jsx("span", { className: "ico", children: "✉️" }),
            "Contact Us"
          ] })
        ]
      }
    )
  ] });
}
function LoginModal({ onClose, onSuccess, onCastSuccess }) {
  const [tab, setTab] = useState("production");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "production") {
        const { token, production } = await API.login(email, password);
        setToken(token);
        onSuccess(production, token);
      } else {
        const { token, castMember } = await API.castLogin(email, password);
        setCastToken(token);
        onCastSuccess(castMember, token);
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "modal", children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsx("span", { className: "modal-title", children: "Login to Ollipedia" }),
      /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }, children: [["production", "🎬 Production House"], ["artist", "🎭 Artist / Crew"]].map(([key, label]) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => {
          setTab(key);
          setError("");
        },
        style: {
          flex: 1,
          padding: "10px 8px",
          border: "none",
          cursor: "pointer",
          background: tab === key ? "var(--gold)" : "var(--bg3)",
          color: tab === key ? "#000" : "var(--muted)",
          fontWeight: tab === key ? 700 : 400,
          fontSize: "0.83rem",
          fontFamily: "inherit",
          transition: "all 0.15s"
        },
        children: label
      },
      key
    )) }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "email",
            required: true,
            value: email,
            onChange: (e) => setEmail(e.target.value),
            placeholder: "your@email.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "password",
            required: true,
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "••••••••"
          }
        )
      ] }),
      error && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.85rem", marginBottom: 12 }, children: error }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold", style: { width: "100%" }, type: "submit", disabled: loading, children: loading ? "Logging in…" : `Login as ${tab === "production" ? "Production" : "Artist"}` })
    ] }),
    /* @__PURE__ */ jsx("p", { style: { marginTop: 16, fontSize: "0.78rem", color: "var(--muted)", textAlign: "center" }, children: tab === "production" ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/register", style: { color: "var(--gold)" }, onClick: onClose, children: "Register a Production House" }) }) : /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/cast-register", style: { color: "var(--gold)" }, onClick: onClose, children: "Register as Artist / Crew" }) }) })
  ] }) });
}
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return /* @__PURE__ */ jsxs("div", { className: `toast ${type}`, children: [
    type === "success" ? "✓ " : "✕ ",
    message
  ] });
}
function SafeImg$3({ src, alt, className, style, fallback }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return fallback || null;
  return /* @__PURE__ */ jsx("img", { src, alt, className, style, onError: () => setBroken(true) });
}
function verdictClass(v) {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit", "super hit", "blockbuster"].includes(l)) return "verdict-hit";
  if (["flop", "disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
}
function MovieCard$3({ movie, portalMode }) {
  var _a;
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs("div", { className: "movie-card", onClick: () => navigate(portalMode ? `/portal/movie/${movie._id}` : `/movie/${movie._id}`), children: [
    /* @__PURE__ */ jsxs("div", { className: "movie-card-poster", children: [
      /* @__PURE__ */ jsx(
        SafeImg$3,
        {
          src: movie.posterUrl,
          alt: movie.title,
          fallback: /* @__PURE__ */ jsx("span", { className: "movie-card-poster-placeholder", children: "🎬" })
        }
      ),
      /* @__PURE__ */ jsx("span", { className: `movie-card-verdict ${verdictClass(movie.verdict)}`, children: movie.verdict || "Upcoming" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "movie-card-body", children: [
      /* @__PURE__ */ jsx("div", { className: "movie-card-title", children: movie.title }),
      /* @__PURE__ */ jsxs("div", { className: "movie-card-meta", children: [
        ((_a = movie.productionId) == null ? void 0 : _a.name) && /* @__PURE__ */ jsx("span", { children: movie.productionId.name }),
        movie.releaseDate && /* @__PURE__ */ jsxs("span", { children: [
          " · ",
          movie.releaseDate
        ] })
      ] })
    ] })
  ] });
}
const SITE = "Ollipedia";
const SITE_URL = "https://ollypedia.in";
const SITE_DESC = "Ollipedia — The complete Odia film encyclopedia. Movies, cast, songs, trailers and more.";
const SITE_IMG = `${SITE_URL}/og-default.jpg`;
function SEO({
  title,
  description = SITE_DESC,
  image = SITE_IMG,
  url,
  type = "website",
  publishDate,
  keywords,
  noIndex = false
}) {
  const full = title ? `${title} | ${SITE}` : SITE;
  const canon = url ? `${SITE_URL}${url}` : void 0;
  return /* @__PURE__ */ jsxs(Helmet, { children: [
    /* @__PURE__ */ jsx("title", { children: full }),
    /* @__PURE__ */ jsx("meta", { name: "description", content: description.slice(0, 160) }),
    keywords && /* @__PURE__ */ jsx("meta", { name: "keywords", content: keywords }),
    noIndex && /* @__PURE__ */ jsx("meta", { name: "robots", content: "noindex,nofollow" }),
    canon && /* @__PURE__ */ jsx("link", { rel: "canonical", href: canon }),
    /* @__PURE__ */ jsx("meta", { property: "og:type", content: type }),
    /* @__PURE__ */ jsx("meta", { property: "og:title", content: full }),
    /* @__PURE__ */ jsx("meta", { property: "og:description", content: description.slice(0, 200) }),
    /* @__PURE__ */ jsx("meta", { property: "og:image", content: image }),
    canon && /* @__PURE__ */ jsx("meta", { property: "og:url", content: canon }),
    /* @__PURE__ */ jsx("meta", { property: "og:site_name", content: SITE }),
    /* @__PURE__ */ jsx("meta", { property: "og:locale", content: "en_IN" }),
    /* @__PURE__ */ jsx("meta", { name: "twitter:card", content: "summary_large_image" }),
    /* @__PURE__ */ jsx("meta", { name: "twitter:title", content: full }),
    /* @__PURE__ */ jsx("meta", { name: "twitter:description", content: description.slice(0, 200) }),
    /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: image }),
    publishDate && /* @__PURE__ */ jsx("meta", { property: "article:published_time", content: publishDate })
  ] });
}
const trunc = (s = "", n = 160) => s.length > n ? s.slice(0, n - 1) + "…" : s;
const ytHQ = (id) => id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
const homeSEO = () => ({
  description: "The complete Odia film encyclopedia — movies, cast, songs, trailers, box office and more.",
  url: "/",
  keywords: "Odia film, Ollywood, Odia cinema, Odia movies, Odia actors, Odia songs"
});
const movieSEO = (movie) => {
  var _a, _b, _c;
  if (!movie) return {};
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const desc = movie.synopsis ? trunc(movie.synopsis) : `${movie.title}${year ? " (" + year + ")" : ""}. ${movie.language || "Odia"} ${movie.category || "film"}.${movie.director ? " Dir. " + movie.director + "." : ""}${movie.verdict && movie.verdict !== "Upcoming" ? " " + movie.verdict + "." : ""}`;
  return {
    title: `${movie.title}${year ? " (" + year + ")" : ""}`,
    description: desc,
    image: movie.posterUrl || movie.thumbnailUrl || ytHQ((_b = (_a = movie.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) || void 0,
    url: `/movie/${movie._id}`,
    type: "article",
    publishDate: movie.releaseDate || void 0,
    keywords: [movie.title, movie.language || "Odia", movie.director, (_c = movie.genre) == null ? void 0 : _c.join(", "), "film", "Ollywood"].filter(Boolean).join(", ")
  };
};
const castSEO = (person) => {
  var _a;
  if (!person) return {};
  const count = ((_a = person.moviesList) == null ? void 0 : _a.length) || 0;
  return {
    title: `${person.name} — ${person.type || "Actor"}`,
    description: person.bio ? trunc(person.bio) : `${person.name} — ${person.type || "Actor"} in Odia cinema.${count ? " " + count + " films." : ""}`,
    image: person.photo || void 0,
    url: `/cast/${person._id}`,
    keywords: `${person.name}, ${person.type || "Actor"}, Odia film, Ollywood`
  };
};
const songDetailSEO = (song, movie) => {
  if (!song) return {};
  const desc = [`"${song.title}"`, (movie == null ? void 0 : movie.title) ? "from " + movie.title : null, song.singer ? "sung by " + song.singer : null, song.musicDirector ? "music by " + song.musicDirector : null].filter(Boolean).join(", ") + ".";
  return {
    title: [song.title, movie == null ? void 0 : movie.title, song.singer].filter(Boolean).join(" — "),
    description: trunc(desc),
    image: song.thumbnailUrl || (song.ytId ? ytHQ(song.ytId) : null) || (movie == null ? void 0 : movie.posterUrl) || void 0,
    url: `/song/${movie == null ? void 0 : movie._id}/${song.songIndex ?? ""}`,
    keywords: `${song.title}, ${song.singer || ""}, Odia song, Ollywood`
  };
};
const newsItemSEO = (item) => {
  if (!item) return {};
  return {
    title: item.title,
    description: trunc(item.content || item.title),
    image: item.imageUrl || void 0,
    url: `/news/${item._id}`,
    type: "article",
    publishDate: item.createdAt,
    keywords: `${item.category || "news"}, Odia cinema, Ollywood`
  };
};
const staticSEO = {
  movies: { title: "Films", description: "Browse all Odia films — filter by year, genre and verdict.", url: "/movies", keywords: "Odia films, Ollywood movies" },
  cast: { title: "Cast & Crew", description: "Explore Odia film actors, directors, music directors and crew.", url: "/cast", keywords: "Odia actors, Odia directors, Ollywood cast" },
  songs: { title: "Songs", description: "Browse all Odia film songs — singers, music directors, lyricists.", url: "/songs", keywords: "Odia songs, Ollywood music" },
  news: { title: "News", description: "Latest news and updates from Odia cinema and Ollywood.", url: "/news", keywords: "Odia film news, Ollywood news" }
};
const extractYtId$6 = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
};
const ytThumb$4 = (id) => {
  const i = extractYtId$6(id);
  return i ? `https://img.youtube.com/vi/${i}/mqdefault.jpg` : null;
};
const heroImage$1 = (m) => {
  var _a, _b;
  return m.thumbnailUrl || ytThumb$4((_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) || m.posterUrl || null;
};
const fmtDate$5 = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const _now = /* @__PURE__ */ new Date();
const RECENT_CUTOFF = new Date(_now.getFullYear() - 3, _now.getMonth(), _now.getDate());
const withinDays$1 = (d, p, f) => {
  if (!d) return false;
  const diff = (new Date(d) - _now) / 864e5;
  return diff >= -p && diff <= f;
};
const isThisWeek$1 = (d) => withinDays$1(d, 7, 14);
const isThisMonth$1 = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getMonth() === _now.getMonth() && dt.getFullYear() === _now.getFullYear();
};
const isLastMonth$1 = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  const lm = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
};
const isLastWeek$1 = (d) => withinDays$1(d, 14, 0);
const VS$1 = {
  "Blockbuster": "#95e5b8",
  "Super Hit": "#95e5b8",
  "Hit": "#a3e8a0",
  "Average": "#e8c87a",
  "Flop": "#e59595",
  "Disaster": "#e59595",
  "Upcoming": "#7aaae8"
};
const imgObserver = (() => {
  if (typeof window === "undefined") return null;
  const callbacks = /* @__PURE__ */ new WeakMap();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const cb = callbacks.get(entry.target);
        if (cb) {
          cb();
          callbacks.delete(entry.target);
          io.unobserve(entry.target);
        }
      }
    });
  }, { rootMargin: "400px" });
  io._callbacks = callbacks;
  return io;
})();
function observeImg(el, cb) {
  if (!imgObserver || !el) return;
  imgObserver._callbacks.set(el, cb);
  imgObserver.observe(el);
  return () => {
    imgObserver.unobserve(el);
    imgObserver._callbacks.delete(el);
  };
}
function LImg$1({ src, alt, style, eager }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!src || eager) return;
    const el = ref.current;
    if (!el) return;
    return observeImg(el, () => {
      el.src = src;
    });
  }, [src, eager]);
  if (!src) return null;
  return /* @__PURE__ */ jsx(
    "img",
    {
      ref,
      src: eager ? src : void 0,
      alt: alt || "",
      loading: eager ? "eager" : "lazy",
      decoding: "async",
      style: { ...style, opacity: loaded ? 1 : 0, transition: "opacity .3s" },
      onLoad: () => setLoaded(true),
      onError: () => setLoaded(true)
    }
  );
}
const cardCss = `
  .hcard{flex-shrink:0;width:150px;cursor:pointer;transition:transform .28s cubic-bezier(.34,1.56,.64,1);contain:layout style;}
  .hcard:hover{transform:translateY(-8px) scale(1.03);}
  .hcard:hover .hcard-img{box-shadow:0 22px 52px rgba(0,0,0,.75);border-color:rgba(201,151,58,.5);}
  .hcard:hover .hcard-grad{opacity:1;}
  .hcard:hover .hcard-play{opacity:1;}
  .hcard:hover .hcard-title{color:var(--gold);}
  .hcard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:2/3;background:var(--bg3);
    box-shadow:0 4px 16px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);transition:box-shadow .3s,border .3s;}
  .hcard-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.1) 55%,transparent 100%);opacity:.5;transition:opacity .3s;}
  .hcard-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;}
  .hcard-title{margin:0;font-weight:700;font-size:.8rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .tcard{flex-shrink:0;width:265px;cursor:pointer;transition:transform .25s;contain:layout style;}
  .tcard:hover{transform:translateY(-5px);}
  .tcard:hover .tcard-img{box-shadow:0 18px 44px rgba(0,0,0,.65);border-color:rgba(220,50,50,.4);}
  .tcard:hover .tcard-play{background:rgba(220,30,30,.9);}
  .tcard:hover .tcard-title{color:var(--gold);}
  .tcard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:16/9;background:var(--bg3);
    box-shadow:0 4px 14px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s;}
  .tcard-play{width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.7);
    display:flex;align-items:center;justify-content:center;padding-left:4px;font-size:1.15rem;transition:background .2s;}
  .tcard-title{margin:0;font-weight:700;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .scard{flex-shrink:0;width:150px;cursor:pointer;transition:transform .25s;contain:layout style;}
  .scard:hover{transform:translateY(-5px);}
  .scard:hover .scard-img{box-shadow:0 14px 36px rgba(0,0,0,.6);border-color:rgba(201,151,58,.4);}
  .scard:hover .scard-title{color:var(--gold);}
  .scard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:var(--bg3);
    box-shadow:0 4px 12px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s;}
  .scard-title{margin:0;font-weight:700;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .ncard{flex-shrink:0;width:250px;cursor:pointer;background:var(--bg2);border-radius:10px;overflow:hidden;
    border:1px solid var(--border);transition:all .2s;contain:layout style;}
  .ncard:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.45);border-color:rgba(201,151,58,.35);}
  .ncard:hover .ncard-img img{transform:scale(1.06);}
  .ncard-img{height:130px;overflow:hidden;background:var(--bg3);}
  .ncard-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s;}
  .recent-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;padding:0 0 4px;overflow:visible;}
  .recent-grid .hcard{width:100%;min-width:0;flex-shrink:unset;}
  .recent-grid .hcard-img{width:100%;}
  @media(max-width:900px){.recent-grid{grid-template-columns:repeat(4,1fr);}}
  @media(max-width:560px){.recent-grid{grid-template-columns:repeat(3,1fr);}}
`;
const MovieCard$2 = React.memo(function MovieCard2({ movie, onClick }) {
  var _a, _b, _c;
  const v = movie.verdict || "Upcoming";
  const c = VS$1[v] || "#7aaae8";
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb$4((_b = (_a = movie.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId);
  return /* @__PURE__ */ jsxs("div", { className: "hcard", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "hcard-img", children: [
      img ? /* @__PURE__ */ jsx(LImg$1, { src: img, alt: movie.title, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" } }) : /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }, children: "🎬" }),
      /* @__PURE__ */ jsx("div", { className: "hcard-grad" }),
      /* @__PURE__ */ jsx("div", { style: {
        position: "absolute",
        top: 7,
        left: 7,
        background: `${c}cc`,
        color: "#000",
        fontSize: ".6rem",
        fontWeight: 900,
        padding: "3px 7px",
        borderRadius: 4,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        maxWidth: "calc(100% - 14px)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 1px 4px rgba(0,0,0,.4)"
      }, children: v }),
      ((_c = movie.genre) == null ? void 0 : _c[0]) && /* @__PURE__ */ jsx("div", { style: { position: "absolute", bottom: 8, left: 8, fontSize: ".58rem", color: "rgba(255,255,255,.65)", fontWeight: 600 }, children: movie.genre[0] }),
      /* @__PURE__ */ jsx("div", { className: "hcard-play", children: /* @__PURE__ */ jsx("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "rgba(201,151,58,.9)", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 3 }, children: "▶" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "9px 2px 0" }, children: [
      /* @__PURE__ */ jsx("p", { className: "hcard-title", children: movie.title }),
      /* @__PURE__ */ jsx("p", { style: { margin: "3px 0 0", fontSize: ".67rem", color: "var(--muted)" }, children: movie.releaseDate ? fmtDate$5(movie.releaseDate) : "TBA" }),
      movie.director && /* @__PURE__ */ jsxs("p", { style: { margin: "2px 0 0", fontSize: ".63rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75 }, children: [
        "🎥 ",
        movie.director
      ] })
    ] })
  ] });
});
const TrailerCard$1 = React.memo(function TrailerCard2({ movie, onClick }) {
  var _a, _b;
  const thumb = ytThumb$4((_b = (_a = movie.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId);
  return /* @__PURE__ */ jsxs("div", { className: "tcard", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "tcard-img", children: [
      thumb && /* @__PURE__ */ jsx(LImg$1, { src: thumb, alt: movie.title, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }),
      /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx("div", { className: "tcard-play", children: "▶" }) }),
      /* @__PURE__ */ jsx("div", { style: { position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.75)", color: "#fff", fontSize: ".58rem", fontWeight: 700, padding: "2px 6px", borderRadius: 3 }, children: "TRAILER" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "9px 2px 0" }, children: [
      /* @__PURE__ */ jsx("p", { className: "tcard-title", children: movie.title }),
      movie.releaseDate && /* @__PURE__ */ jsx("p", { style: { margin: "3px 0 0", fontSize: ".67rem", color: "var(--muted)" }, children: fmtDate$5(movie.releaseDate) })
    ] })
  ] });
});
const SongCard$1 = React.memo(function SongCard2({ s, onClick }) {
  const thumb = s.thumbnailUrl || ytThumb$4(s.ytId) || s.posterUrl;
  return /* @__PURE__ */ jsxs("div", { className: "scard", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "scard-img", children: [
      thumb && /* @__PURE__ */ jsx(LImg$1, { src: thumb, alt: s.title, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }),
      /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,.2)", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx("div", { style: { width: 36, height: 36, borderRadius: "50%", background: "rgba(201,151,58,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }, children: "♪" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "9px 2px 0" }, children: [
      /* @__PURE__ */ jsx("p", { className: "scard-title", children: s.title }),
      s.singer && /* @__PURE__ */ jsxs("p", { style: { margin: "2px 0 0", fontSize: ".63rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        "🎤 ",
        s.singer
      ] }),
      /* @__PURE__ */ jsx("p", { style: { margin: "1px 0 0", fontSize: ".62rem", color: "rgba(255,255,255,.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: s.movieTitle })
    ] })
  ] });
});
const NewsCard$2 = React.memo(function NewsCard2({ n, onClick }) {
  return /* @__PURE__ */ jsxs("div", { className: "ncard", onClick, children: [
    n.imageUrl && /* @__PURE__ */ jsx("div", { className: "ncard-img", children: /* @__PURE__ */ jsx(LImg$1, { src: n.imageUrl, alt: n.title, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }) }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "12px 14px" }, children: [
      n.category && /* @__PURE__ */ jsx("span", { style: { fontSize: ".58rem", fontWeight: 800, color: "var(--gold)", letterSpacing: ".08em", textTransform: "uppercase" }, children: n.category }),
      /* @__PURE__ */ jsx("p", { style: { margin: "5px 0 4px", fontWeight: 700, fontSize: ".8rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }, children: n.title }),
      n.movieTitle && /* @__PURE__ */ jsxs("p", { style: { margin: 0, fontSize: ".67rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        "🎬 ",
        n.movieTitle
      ] })
    ] })
  ] });
});
function CardSkeleton({ ratio = "2/3", width = 150 }) {
  return /* @__PURE__ */ jsx("div", { style: {
    flexShrink: 0,
    width,
    aspectRatio: ratio,
    borderRadius: 10,
    background: "var(--bg3)",
    animation: "homepulse 1.5s ease-in-out infinite"
  } });
}
function Row({ title, badge, badgeColor = "#c9973a", viewAll, children, gap = 14, cardRatio, cardWidth, loading = false }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const sentRef = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = sentRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "250px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const slide = (n) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: n, behavior: "smooth" });
  };
  const count = React.Children.count(children);
  const showSkeletons = loading || !visible;
  return /* @__PURE__ */ jsxs("section", { className: "home-section", ref: sentRef, children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        loading ? /* @__PURE__ */ jsx("div", { style: { width: 160, height: 18, borderRadius: 4, background: "var(--bg3)", animation: "homepulse 1.5s ease-in-out infinite" } }) : /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: title }),
        !loading && badge && /* @__PURE__ */ jsx("span", { style: {
          background: `${badgeColor}20`,
          border: `1px solid ${badgeColor}50`,
          color: badgeColor,
          fontSize: ".58rem",
          fontWeight: 800,
          padding: "2px 8px",
          borderRadius: 3,
          letterSpacing: ".08em",
          textTransform: "uppercase"
        }, children: badge })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        !loading && viewAll && /* @__PURE__ */ jsx("button", { className: "home-view-all", onClick: () => navigate(viewAll), children: "View All" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(-640), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(640), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { ref: rowRef, className: "home-row", style: { gap }, children: showSkeletons ? Array.from({ length: Math.min(count || 8, 8) }).map((_, i) => /* @__PURE__ */ jsx(CardSkeleton, { ratio: cardRatio, width: cardWidth }, i)) : children })
  ] });
}
const heroCss = `
/* ── Outer wrapper — sits right below the fixed 58px navbar ── */
.hh-wrap {
  position: relative;
  width: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

/* ── Each slide — all absolutely stacked, same size as wrapper ── */
.hh-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 25%;
  opacity: 0;
  transition: opacity .7s ease;
  pointer-events: none;
}
/* Active slide is relative — drives the wrapper's height */
.hh-slide.active {
  position: relative;
  opacity: 1;
  pointer-events: auto;
}

/* ── Inner — sets the height responsively, contains ALL overlays ── */
.hh-inner {
  position: relative;
  min-height: clamp(300px, 56vw, 580px);
  overflow: hidden;
}

/* ── Gradient overlay ── */
.hh-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top,
      rgba(0,0,0,.96) 0%,
      rgba(0,0,0,.65) 35%,
      rgba(0,0,0,.15) 65%,
      transparent    100%
    ),
    linear-gradient(to right,
      rgba(0,0,0,.80) 0%,
      rgba(0,0,0,.40) 50%,
      transparent    80%
    );
}

/* ── Text content — bottom-left, above overlay ── */
.hh-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px 16px 52px;
  z-index: 3;
  max-width: 680px;
}
@media(min-width:480px)  { .hh-content { padding: 20px 24px 58px; } }
@media(min-width:768px)  { .hh-content { padding: 28px 36px 70px; } }
@media(min-width:1100px) { .hh-content { padding: 32px 52px 78px; } }

/* Tags row */
.hh-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:9px; }
.hh-tag {
  font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em;
  padding:3px 9px; border-radius:20px;
  background:rgba(201,151,58,.18); border:1px solid rgba(201,151,58,.5); color:#c9973a;
}
.hh-tag-gl {
  font-size:.6rem; font-weight:600;
  padding:3px 9px; border-radius:20px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.22);
  color:rgba(255,255,255,.82);
}

/* Title */
.hh-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 5.5vw, 3rem);
  font-weight: 900;
  line-height: 1.08;
  color: #fff;
  margin: 0 0 7px;
  text-shadow: 0 2px 20px rgba(0,0,0,.7);
}

/* Meta row — director / date / verdict */
.hh-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
  margin-bottom: 8px;
  font-size: clamp(.68rem, 2vw, .79rem);
  color: rgba(255,255,255,.58);
}
.hh-badge {
  font-size: .58rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
  padding: 2px 9px; border-radius: 3px;
}

/* Synopsis — hidden on tiny screens, clamped on larger */
.hh-synopsis {
  font-size: clamp(.78rem, 2.2vw, .86rem);
  color: rgba(255,255,255,.62);
  line-height: 1.6;
  margin: 0 0 14px;
  display: none;
}
@media(min-width:420px) {
  .hh-synopsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
@media(min-width:768px) { .hh-synopsis { -webkit-line-clamp: 3; } }

/* Buttons */
.hh-btns { display:flex; gap:8px; flex-wrap:wrap; }
.hh-btn-play {
  display: inline-flex; align-items: center; gap: 7px;
  background: #c9973a; color: #000; border: none;
  padding: clamp(9px,2vw,12px) clamp(14px,3vw,24px);
  border-radius: 8px;
  font-size: clamp(.76rem, 2vw, .88rem); font-weight: 800;
  cursor: pointer; transition: opacity .18s; white-space: nowrap;
}
.hh-btn-play:hover { opacity: .85; }
.hh-btn-info {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.1); color: #f1f1f1;
  border: 1px solid rgba(255,255,255,.28);
  padding: clamp(9px,2vw,12px) clamp(12px,2.5vw,20px);
  border-radius: 8px;
  font-size: clamp(.74rem, 2vw, .86rem); font-weight: 600;
  cursor: pointer; transition: background .18s; white-space: nowrap;
  backdrop-filter: blur(6px);
}
.hh-btn-info:hover { background: rgba(255,255,255,.18); }

/* ── Dots — inside hh-inner, bottom-left ── */
.hh-dots {
  position: absolute;
  bottom: 16px; left: 16px;
  display: flex; gap: 6px; z-index: 4;
}
@media(min-width:480px)  { .hh-dots { bottom: 18px; left: 24px; } }
@media(min-width:768px)  { .hh-dots { bottom: 22px; left: 36px; } }
@media(min-width:1100px) { .hh-dots { left: 52px; } }
.hh-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.3); border: none;
  cursor: pointer; padding: 0; transition: all .25s;
}
.hh-dot.active { width: 24px; border-radius: 4px; background: #c9973a; }

/* ── Thumbnail strip — inside hh-inner, bottom-right, desktop only ── */
.hh-strip {
  position: absolute;
  bottom: 14px; right: 16px;
  display: none;
  gap: 5px; z-index: 4;
}
@media(min-width:900px) { .hh-strip { display: flex; bottom: 18px; right: 24px; } }
.hh-strip-item {
  width: 72px; height: 48px;
  border-radius: 5px; overflow: hidden;
  cursor: pointer; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.15);
  background: #1c1c1c;
  position: relative; transition: border-color .2s;
}
.hh-strip-item.active { border-color: #c9973a; }
.hh-strip-item img { width:100%; height:100%; object-fit:cover; display:block; }
.hh-strip-play {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.28); font-size: .55rem; color: #fff;
}

/* ── Skeleton ── */
.hh-skel {
  width: 100%;
  min-height: clamp(300px, 56vw, 580px);
  background: #141414;
  animation: homepulse 1.5s ease-in-out infinite;
}
`;
function HeroSlide$1({ movie, active, dots, strip }) {
  var _a, _b, _c;
  const navigate = useNavigate();
  const img = heroImage$1(movie);
  const vc = VS$1[movie.verdict] || "#7aaae8";
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `hh-slide${active ? " active" : ""}`,
      style: { backgroundImage: img ? `url(${img})` : "none" },
      children: /* @__PURE__ */ jsxs("div", { className: "hh-inner", children: [
        /* @__PURE__ */ jsx("div", { className: "hh-overlay" }),
        /* @__PURE__ */ jsxs("div", { className: "hh-content", children: [
          /* @__PURE__ */ jsxs("div", { className: "hh-tags", children: [
            movie.category && /* @__PURE__ */ jsx("span", { className: "hh-tag", children: movie.category }),
            ((_a = movie.genre) == null ? void 0 : _a[0]) && /* @__PURE__ */ jsx("span", { className: "hh-tag-gl", children: movie.genre[0] }),
            movie.language && /* @__PURE__ */ jsx("span", { className: "hh-tag-gl", children: movie.language })
          ] }),
          /* @__PURE__ */ jsx("h2", { className: "hh-title", children: movie.title }),
          /* @__PURE__ */ jsxs("div", { className: "hh-meta", children: [
            movie.releaseDate && /* @__PURE__ */ jsxs("span", { children: [
              "🗓 ",
              fmtDate$5(movie.releaseDate)
            ] }),
            movie.director && /* @__PURE__ */ jsxs("span", { children: [
              "🎬 ",
              movie.director
            ] }),
            movie.verdict && movie.verdict !== "Upcoming" && /* @__PURE__ */ jsx("span", { className: "hh-badge", style: {
              background: `${vc}22`,
              border: `1px solid ${vc}`,
              color: vc
            }, children: movie.verdict })
          ] }),
          movie.synopsis && /* @__PURE__ */ jsxs("p", { className: "hh-synopsis", children: [
            movie.synopsis.slice(0, 180),
            movie.synopsis.length > 180 ? "…" : ""
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "hh-btns", children: [
            ((_c = (_b = movie.media) == null ? void 0 : _b.trailer) == null ? void 0 : _c.ytId) && /* @__PURE__ */ jsx(
              "button",
              {
                className: "hh-btn-play",
                onClick: () => navigate(`/movie/${movie._id}`, { state: { scrollTo: "trailer" } }),
                children: "▶ Watch Trailer"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "hh-btn-info",
                onClick: () => navigate(moviePath(movie)),
                children: "More Info"
              }
            )
          ] })
        ] }),
        active && dots,
        active && strip
      ] })
    }
  );
}
function HeroSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "hh-skel", style: { position: "relative", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("div", { style: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "clamp(16px,3vw,32px) clamp(16px,4vw,52px) clamp(52px,8vw,78px)",
      maxWidth: 680
    }, children: [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [60, 80, 55].map((w, i) => /* @__PURE__ */ jsx("div", { style: { width: w, height: 18, borderRadius: 20, background: "rgba(255,255,255,.08)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` } }, i)) }),
      /* @__PURE__ */ jsx("div", { style: { width: "clamp(200px,50vw,420px)", height: "clamp(28px,6vw,48px)", borderRadius: 6, background: "rgba(255,255,255,.1)", animation: "homepulse 1.5s ease-in-out infinite", marginBottom: 12 } }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 12, marginBottom: 12 }, children: [100, 130].map((w, i) => /* @__PURE__ */ jsx("div", { style: { width: w, height: 14, borderRadius: 4, background: "rgba(255,255,255,.07)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: `${0.15 + i * 0.1}s` } }, i)) }),
      [90, 75].map((pct, i) => /* @__PURE__ */ jsx("div", { style: { width: `${pct}%`, maxWidth: 520, height: 13, borderRadius: 4, background: "rgba(255,255,255,.06)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: `${0.25 + i * 0.07}s`, marginBottom: 6 } }, i)),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 14 }, children: [
        /* @__PURE__ */ jsx("div", { style: { width: 140, height: 40, borderRadius: 8, background: "rgba(201,151,58,.25)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: "0.35s" } }),
        /* @__PURE__ */ jsx("div", { style: { width: 100, height: 40, borderRadius: 8, background: "rgba(255,255,255,.07)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: "0.42s" } })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { position: "absolute", bottom: 16, left: "clamp(16px,4vw,52px)", display: "flex", gap: 6 }, children: [1, 0, 0, 0].map((active, i) => /* @__PURE__ */ jsx("div", { style: { width: active ? 24 : 7, height: 7, borderRadius: active ? 4 : "50%", background: "rgba(255,255,255,.18)", animation: "homepulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.08}s` } }, i)) })
  ] });
}
const _cache = {
  movies: null,
  // null = not fetched yet, [] = fetched but empty
  news: null,
  ts: 0
  // timestamp of last fetch (for optional TTL)
};
const CACHE_TTL = 5 * 60 * 1e3;
function readRecentPlayed() {
  try {
    return JSON.parse(localStorage.getItem("op_recent_songs") || "[]");
  } catch {
    return [];
  }
}
function Home$1({ production }) {
  const navigate = useNavigate();
  const [movies, setMovies] = useState(() => _cache.movies || []);
  const [moviesReady, setMoviesReady] = useState(() => _cache.movies !== null);
  const [recentPlayed, setRecentPlayed] = useState(() => readRecentPlayed());
  const [news, setNews] = useState(() => _cache.news || []);
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    const now2 = Date.now();
    if (_cache.movies !== null && now2 - _cache.ts < CACHE_TTL) return;
    API.getMovies().then((m) => {
      _cache.movies = m;
      _cache.ts = Date.now();
      setMovies(m);
      setMoviesReady(true);
    }).catch(() => setMoviesReady(true));
  }, []);
  useEffect(() => {
    if (!moviesReady) return;
    if (_cache.news !== null) {
      setNews(_cache.news);
      return;
    }
    const load = () => API.getNews().then((n) => {
      const slice = n.slice(0, 12);
      _cache.news = slice;
      setNews(slice);
    }).catch(() => {
    });
    const id = typeof requestIdleCallback !== "undefined" ? requestIdleCallback(load, { timeout: 2e3 }) : setTimeout(load, 200);
    return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(id) : clearTimeout(id);
  }, [moviesReady]);
  const srt = useCallback((arr) => [...arr].sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate) - new Date(a.releaseDate);
  }), []);
  const MAX = 18;
  const allMovies = useMemo(() => srt(movies), [movies, srt]);
  useMemo(() => srt(movies.filter((m) => isThisWeek$1(m.releaseDate) && !m.releaseTBA)).slice(0, MAX), [movies, srt]);
  const thisMonth = useMemo(() => srt(movies.filter((m) => isThisMonth$1(m.releaseDate))).slice(0, MAX), [movies, srt]);
  const inTheatres = useMemo(() => srt(movies.filter((m) => m.releaseDate && withinDays$1(m.releaseDate, 35, 35))).slice(0, MAX), [movies, srt]);
  useMemo(() => srt(movies.filter((m) => isLastWeek$1(m.releaseDate) && !isThisWeek$1(m.releaseDate))).slice(0, MAX), [movies, srt]);
  useMemo(() => srt(movies.filter((m) => isLastMonth$1(m.releaseDate))).slice(0, MAX), [movies, srt]);
  const withTrailer = useMemo(() => {
    return allMovies.filter((m) => {
      var _a, _b;
      return (_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId;
    }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 12);
  }, [allMovies]);
  const highRated = useMemo(
    () => movies.filter((m) => {
      var _a;
      return ((_a = m.reviews) == null ? void 0 : _a.length) >= 1 && m.releaseDate && new Date(m.releaseDate) >= RECENT_CUTOFF;
    }).map((m) => ({ ...m, avg: m.reviews.reduce((s, r) => s + (r.rating || 0), 0) / m.reviews.length })).filter((m) => m.avg >= 3.5).sort((a, b) => b.avg - a.avg).slice(0, MAX),
    [movies]
  );
  const upcoming = useMemo(() => {
    return movies.filter((m) => !m.verdict || m.verdict === "Upcoming").sort((a, b) => {
      const aDate = a.releaseDate ? new Date(a.releaseDate) : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate) : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate - bDate;
    }).slice(0, MAX);
  }, [movies]);
  useMemo(() => allMovies.slice(0, 30), [allMovies]);
  const recentMovies = useMemo(() => {
    const now2 = /* @__PURE__ */ new Date();
    const released = [...movies].filter((m) => m.releaseDate && new Date(m.releaseDate) <= now2).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    const notReleased = [...movies].filter((m) => !m.releaseDate || new Date(m.releaseDate) > now2).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    return [...released, ...notReleased].slice(0, 12);
  }, [movies]);
  const trendingSongs = useMemo(() => {
    const songs = [];
    allMovies.filter((m) => !m.verdict || m.verdict === "Upcoming" || withinDays$1(m.releaseDate, 90, 60)).forEach((m) => {
      var _a;
      return (((_a = m.media) == null ? void 0 : _a.songs) || []).forEach((s, idx) => {
        if (s.ytId) songs.push({ ...s, songIndex: idx, movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl });
      });
    });
    if (songs.length < 6) {
      allMovies.forEach((m) => {
        var _a;
        return (((_a = m.media) == null ? void 0 : _a.songs) || []).forEach((s, idx) => {
          if (s.ytId && !songs.find((t) => t.movieId === m._id && t.songIndex === idx))
            songs.push({ ...s, songIndex: idx, movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl });
        });
      });
    }
    return songs.slice(0, 12);
  }, [allMovies]);
  const heroMovies = useMemo(() => {
    return movies.filter((m) => {
      var _a, _b;
      const h = m.thumbnailUrl || ((_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) || m.posterUrl;
      if (!h) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays$1(m.releaseDate, 60, 0)) return true;
      return isThisMonth$1(m.releaseDate) || isLastMonth$1(m.releaseDate);
    }).sort((a, b) => {
      const aUp = !a.verdict || a.verdict === "Upcoming";
      const bUp = !b.verdict || b.verdict === "Upcoming";
      const aDate = a.releaseDate ? new Date(a.releaseDate) : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate) : null;
      if (aUp && bUp) {
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate - bDate;
      }
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      return (bDate || 0) - (aDate || 0);
    }).slice(0, 8);
  }, [movies]);
  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(() => setHeroIdx((i) => (i + 1) % heroMovies.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [heroMovies.length]);
  const goHero = (i) => {
    setHeroIdx(i);
    clearInterval(timerRef.current);
  };
  return /* @__PURE__ */ jsxs("div", { className: "home-root", children: [
    /* @__PURE__ */ jsx(SEO, { ...homeSEO() }),
    /* @__PURE__ */ jsx("style", { children: `@keyframes homepulse{0%,100%{opacity:1}50%{opacity:.35}}${cardCss}${heroCss}` }),
    !moviesReady ? /* @__PURE__ */ jsx(HeroSkeleton, {}) : heroMovies.length > 0 && /* @__PURE__ */ jsx("div", { className: "hh-wrap", children: heroMovies.map((m, i) => {
      const isAdjacentOrActive = i === heroIdx || i === (heroIdx + 1) % heroMovies.length || i === (heroIdx - 1 + heroMovies.length) % heroMovies.length;
      const dotsEl = /* @__PURE__ */ jsx("div", { className: "hh-dots", children: heroMovies.map((_, di) => /* @__PURE__ */ jsx(
        "button",
        {
          className: `hh-dot${di === heroIdx ? " active" : ""}`,
          onClick: () => goHero(di)
        },
        di
      )) });
      const stripEl = /* @__PURE__ */ jsx("div", { className: "hh-strip", children: heroMovies.map((sm, si) => {
        var _a, _b;
        const simg = heroImage$1(sm);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: `hh-strip-item${si === heroIdx ? " active" : ""}`,
            onClick: () => goHero(si),
            children: [
              simg ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: simg,
                  alt: sm.title,
                  loading: "lazy",
                  decoding: "async",
                  onError: (e) => e.target.style.display = "none"
                }
              ) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem" }, children: "🎬" }),
              ((_b = (_a = sm.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) && /* @__PURE__ */ jsx("div", { className: "hh-strip-play", children: "▶" })
            ]
          },
          sm._id
        );
      }) });
      return isAdjacentOrActive ? /* @__PURE__ */ jsx(
        HeroSlide$1,
        {
          movie: m,
          active: i === heroIdx,
          dots: dotsEl,
          strip: stripEl
        },
        m._id
      ) : /* @__PURE__ */ jsx("div", { className: "hh-slide" }, m._id);
    }) }),
    production && /* @__PURE__ */ jsxs("div", { className: "home-cta-bar", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "Welcome back, ",
        /* @__PURE__ */ jsx("strong", { children: production.name })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => navigate("/dashboard/add-movie"), children: "+ Add Movie" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-sections", children: [
      /* @__PURE__ */ jsx(Row, { title: "🎬 Recent Movies", badge: "Latest", viewAll: "/movies", loading: !moviesReady, children: recentMovies.map((m) => /* @__PURE__ */ jsx(MovieCard$2, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      upcoming.length > 0 && /* @__PURE__ */ jsx(Row, { title: "🚀 Upcoming", viewAll: "/movies", children: upcoming.map((m) => /* @__PURE__ */ jsx(MovieCard$2, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      (!moviesReady || inTheatres.length > 0) && /* @__PURE__ */ jsx(Row, { title: "🎭 Now in Theatres", badge: "Live", badgeColor: "#95e5b8", loading: !moviesReady, children: inTheatres.map((m) => /* @__PURE__ */ jsx(MovieCard$2, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      (!moviesReady || thisMonth.length > 0) && /* @__PURE__ */ jsx(Row, { title: "🗓 This Month", badge: "New", loading: !moviesReady, children: thisMonth.map((m) => /* @__PURE__ */ jsx(MovieCard$2, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      withTrailer.length > 0 && /* @__PURE__ */ jsx(Row, { title: "🎬 Latest Trailers", gap: 16, cardRatio: "16/9", cardWidth: 265, children: withTrailer.map((m) => /* @__PURE__ */ jsx(TrailerCard$1, { movie: m, onClick: () => navigate(`/movie/${m._id}`, { state: { scrollTo: "trailer" } }) }, m._id)) }),
      news.length > 0 && /* @__PURE__ */ jsx(Row, { title: "📰 Latest News", viewAll: "/news", gap: 14, cardRatio: "136/250", cardWidth: 250, children: news.map((n) => /* @__PURE__ */ jsx(NewsCard$2, { n, onClick: () => navigate(`/news/${n._id}`) }, n._id)) }),
      recentPlayed.length > 0 && /* @__PURE__ */ jsx(Row, { title: "🕐 Recently Played", viewAll: "/songs", gap: 14, cardRatio: "1/1", cardWidth: 150, children: recentPlayed.slice(0, 12).map((s, i) => {
        const thumb = s.thumb || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : null);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: "home-song-card",
            style: { flexShrink: 0, width: 150 },
            onClick: () => navigate(`/song/${s.movieSlug || s.movieId}/${s.songIdx}`),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "home-song-thumb", children: [
                thumb ? /* @__PURE__ */ jsx("img", { src: thumb, alt: s.title, loading: "lazy", onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", background: "linear-gradient(135deg,#111,#1a1200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }, children: "🎵" }),
                /* @__PURE__ */ jsx("div", { className: "home-song-play", children: "▶" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "home-song-info", children: [
                /* @__PURE__ */ jsx("p", { className: "home-song-title", children: s.title }),
                s.singer && /* @__PURE__ */ jsx("p", { className: "home-song-singer", children: s.singer }),
                /* @__PURE__ */ jsx("p", { className: "home-song-movie", style: { color: "var(--gold)" }, children: s.movieTitle })
              ] })
            ]
          },
          i
        );
      }) }),
      trendingSongs.length > 0 && /* @__PURE__ */ jsx(Row, { title: "🎵 Trending Songs", viewAll: "/songs", gap: 14, cardRatio: "1/1", cardWidth: 150, children: trendingSongs.map((s, i) => /* @__PURE__ */ jsx(
        SongCard$1,
        {
          s,
          onClick: () => navigate(
            s._movieSlug ? s._movieSlug.replace("/movie/", "/song/") + "/" + s.songIndex : `/song/${s.movieId}/${s.songIndex}`
          )
        },
        i
      )) }),
      highRated.length > 0 && /* @__PURE__ */ jsx(Row, { title: "⭐ Top Rated", badge: "Critic Pick", badgeColor: "#e8c87a", children: highRated.map((m) => /* @__PURE__ */ jsx(MovieCard$2, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      movies.length === 0 && /* @__PURE__ */ jsxs("div", { className: "home-empty", children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "4rem", marginBottom: 16 }, children: "🎬" }),
        /* @__PURE__ */ jsx("h2", { children: "No movies yet" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)" }, children: "Be the first to add a film to Ollipedia" }),
        production && /* @__PURE__ */ jsx("button", { className: "btn btn-gold", onClick: () => navigate("/dashboard/add-movie"), children: "+ Add Movie" })
      ] })
    ] })
  ] });
}
const TTL = 5 * 60 * 1e3;
const store = {
  movies: { data: null, ts: 0, promise: null },
  cast: { data: null, ts: 0, promise: null },
  news: { data: null, ts: 0, promise: null },
  songs: { data: null, ts: 0, promise: null }
};
function fetchOnce(key, apiFn) {
  const entry = store[key];
  const now2 = Date.now();
  if (entry.data !== null && now2 - entry.ts < TTL) {
    return Promise.resolve(entry.data);
  }
  if (entry.promise) return entry.promise;
  entry.promise = apiFn().then((data) => {
    entry.data = data;
    entry.ts = Date.now();
    entry.promise = null;
    return data;
  }).catch((err) => {
    entry.promise = null;
    throw err;
  });
  return entry.promise;
}
const Cache = {
  getMovies: () => fetchOnce("movies", API.getMovies),
  getCast: () => fetchOnce("cast", API.getCast),
  getNews: () => fetchOnce("news", () => API.getNews().then((n) => n.slice(0, 40))),
  // Bust specific keys after a write operation
  bust: (key) => {
    if (store[key]) {
      store[key].data = null;
      store[key].ts = 0;
    }
  },
  bustAll: () => {
    Object.keys(store).forEach((k) => {
      store[k].data = null;
      store[k].ts = 0;
    });
  },
  // Read cached data synchronously (returns null if not yet fetched)
  peek: (key) => {
    var _a;
    return ((_a = store[key]) == null ? void 0 : _a.data) ?? null;
  }
};
const GENRES$3 = ["Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical", "Musical", "Biographical", "Devotional", "Horror"];
const VERDICTS$1 = ["Upcoming", "Blockbuster", "Super Hit", "Hit", "Average", "Flop", "Disaster"];
const VS = { "Blockbuster": "#95e5b8", "Super Hit": "#95e5b8", "Hit": "#a3e8a0", "Average": "#e8c87a", "Flop": "#e59595", "Disaster": "#e59595", "Upcoming": "#7aaae8" };
const YEAR_PREVIEW = 16;
const YEARS_INIT = 3;
const YEARS_STEP = 3;
const FILTER_PAGE = 24;
const _io$2 = typeof window !== "undefined" ? (() => {
  const cbs = /* @__PURE__ */ new WeakMap();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      var _a;
      if (e.isIntersecting) {
        (_a = cbs.get(e.target)) == null ? void 0 : _a();
        cbs.delete(e.target);
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "350px" });
  io._cbs = cbs;
  return io;
})() : null;
const obsImg$2 = (el, cb) => {
  if (!_io$2 || !el) return;
  _io$2._cbs.set(el, cb);
  _io$2.observe(el);
  return () => {
    _io$2.unobserve(el);
    _io$2._cbs.delete(el);
  };
};
const CSS$7 = `
@keyframes mv-pulse { 0%,100%{opacity:1} 50%{opacity:.28} }

.mv-root { min-height:100vh; background:#0f0f0f; padding-top:58px; color:#f1f1f1; }

/* ── Sticky header ── */
.mv-hdr { position:sticky; top:58px; z-index:99; background:#0f0f0f; border-bottom:1px solid rgba(255,255,255,.09); }

/* Search row */
.mv-srow { display:flex; align-items:center; gap:10px; padding:10px 16px; }
@media(min-width:600px){ .mv-srow { padding:10px 24px; } }
@media(min-width:960px){ .mv-srow { padding:10px 32px; } }

.mv-sbox {
  display:flex; align-items:center; flex:1; max-width:560px;
  background:#272727; border:1.5px solid rgba(255,255,255,.1);
  border-radius:24px; padding:0 16px; gap:8px; transition:border-color .18s;
}
.mv-sbox:focus-within { border-color:rgba(201,151,58,.7); background:#303030; }
.mv-sbox input { flex:1; background:none; border:none; outline:none; color:#f1f1f1; font-size:.86rem; padding:9px 0; min-width:0; }
.mv-sbox input::placeholder { color:rgba(255,255,255,.3); }
.mv-sico { color:rgba(255,255,255,.3); font-size:.9rem; flex-shrink:0; }
.mv-sx   { background:none; border:none; color:rgba(255,255,255,.4); cursor:pointer; font-size:.86rem; padding:2px; flex-shrink:0; }
.mv-sx:hover { color:#fff; }
.mv-count { font-size:.73rem; color:rgba(255,255,255,.38); white-space:nowrap; flex-shrink:0; display:none; }
@media(min-width:520px){ .mv-count { display:block; } }

/* Chips */
.mv-chips { display:flex; align-items:center; gap:7px; padding:0 16px 10px; overflow-x:auto; scrollbar-width:none; }
.mv-chips::-webkit-scrollbar { display:none; }
@media(min-width:600px){ .mv-chips { padding:0 24px 10px; } }
@media(min-width:960px){ .mv-chips { padding:0 32px 10px; } }
.mv-chip {
  position:relative; display:inline-flex; align-items:center; gap:5px;
  background:#272727; border:1px solid rgba(255,255,255,.13);
  border-radius:20px; padding:6px 14px; font-size:.75rem; font-weight:600;
  color:#f1f1f1; cursor:pointer; flex-shrink:0; white-space:nowrap;
  transition:background .15s; user-select:none;
}
.mv-chip:hover { background:#3a3a3a; }
.mv-chip.on { background:#f1f1f1; color:#0f0f0f; border-color:#f1f1f1; font-weight:700; }
.mv-chip.on:hover { background:#e0e0e0; }
.mv-chip.tab.on { background:rgba(201,151,58,.16); color:#c9973a; border-color:rgba(201,151,58,.5); }
.mv-chip select { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; font-size:1rem; }
.mv-cx { background:none; border:none; color:inherit; cursor:pointer; font-size:.68rem; padding:0; line-height:1; opacity:.65; flex-shrink:0; }
.mv-cx:hover { opacity:1; }
.mv-cdiv { width:1px; height:22px; background:rgba(255,255,255,.12); flex-shrink:0; margin:0 2px; }

/* Content */
.mv-content { padding:16px 16px 80px; }
@media(min-width:600px){ .mv-content { padding:18px 24px 80px; } }
@media(min-width:960px){ .mv-content { padding:20px 32px 80px; } }

.mv-rinfo { font-size:.75rem; color:rgba(255,255,255,.38); margin-bottom:16px; }

/* ── Year section ── */
.mv-ysec { margin-bottom:40px; }
.mv-ysec-head {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:14px;
}
.mv-ysec-title { font-size:1rem; font-weight:700; color:#f1f1f1; margin:0; }
@media(min-width:600px){ .mv-ysec-title { font-size:1.08rem; } }
.mv-ysec-cnt { font-size:.7rem; color:rgba(255,255,255,.35); margin-left:6px; font-weight:400; }
.mv-va { font-size:.75rem; font-weight:700; color:#3ea6ff; background:none; border:none; cursor:pointer; padding:4px 2px; white-space:nowrap; flex-shrink:0; }
.mv-va:hover { color:#71bcff; text-decoration:underline; }

/* ── Poster grid — 2:3 ── */
.mv-grid {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px 8px;
  align-items:start;
}
@media(min-width:480px)  { .mv-grid { grid-template-columns:repeat(4,1fr);  gap:12px 10px; } }
@media(min-width:720px)  { .mv-grid { grid-template-columns:repeat(5,1fr);  gap:14px 12px; } }
@media(min-width:960px)  { .mv-grid { grid-template-columns:repeat(6,1fr);  gap:16px 12px; } }
@media(min-width:1200px) { .mv-grid { grid-template-columns:repeat(7,1fr);  gap:16px 14px; } }
@media(min-width:1500px) { .mv-grid { grid-template-columns:repeat(8,1fr);  gap:18px 14px; } }

/* ── Poster card ── */
.mv-card { cursor:pointer; display:block; width:100%; overflow:hidden; }
.mv-card:hover .mv-poster { transform:scale(1.03); box-shadow:0 12px 36px rgba(0,0,0,.7); }
.mv-card:hover .mv-po     { opacity:1; }
.mv-card:hover .mv-ctitle { color:#3ea6ff; }

.mv-poster {
  position:relative; display:block; width:100%;
  aspect-ratio:2/3; background:#272727;
  border-radius:8px; overflow:hidden; contain:layout paint;
  transition:transform .22s, box-shadow .22s;
  box-shadow:0 2px 8px rgba(0,0,0,.5);
}
.mv-poster img {
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:top; display:block;
}
.mv-poster-grad {
  position:absolute; bottom:0; left:0; right:0; height:55%;
  background:linear-gradient(to top,rgba(0,0,0,.88) 0%,transparent 100%);
  pointer-events:none;
}
.mv-po {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,.32); opacity:0; transition:opacity .18s;
}
.mv-pc {
  width:36px; height:36px; border-radius:50%;
  background:rgba(0,0,0,.7); border:2px solid rgba(255,255,255,.65);
  display:flex; align-items:center; justify-content:center; font-size:.9rem;
}
.mv-verdict {
  position:absolute; top:6px; left:6px;
  font-size:.52rem; font-weight:800;
  padding:2px 6px; border-radius:3px;
  letter-spacing:.06em; text-transform:uppercase;
}
.mv-genre { position:absolute; bottom:6px; left:6px; font-size:.56rem; color:rgba(255,255,255,.7); font-weight:600; }

.mv-cmeta { padding:6px 1px 0; min-height:44px; }
.mv-ctitle {
  margin:0; font-size:.74rem; font-weight:600; color:#f1f1f1;
  line-height:1.35; transition:color .15s;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; max-height:calc(1.35em * 2); word-break:break-word;
}
@media(min-width:600px){ .mv-ctitle { font-size:.78rem; } }
.mv-cyear { margin:2px 0 0; font-size:.66rem; color:rgba(255,255,255,.3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Skeleton */
.mv-sk-post { aspect-ratio:2/3; background:#272727; border-radius:8px; animation:mv-pulse 1.4s ease-in-out infinite; }
.mv-sk-ln   { height:10px; background:#272727; border-radius:4px; animation:mv-pulse 1.4s ease-in-out infinite; }

/* Buttons */
.mv-more { display:flex; justify-content:center; padding:20px 0; }
.mv-more-btn {
  padding:10px 30px; background:#272727; border:1px solid rgba(255,255,255,.15);
  color:#f1f1f1; border-radius:20px; font-size:.82rem; font-weight:600; cursor:pointer; transition:background .16s;
}
.mv-more-btn:hover { background:#3a3a3a; }

.mv-load-years {
  display:flex; justify-content:center; padding:8px 0 24px;
}
.mv-load-years-btn {
  padding:10px 28px; background:rgba(201,151,58,.08);
  border:1px solid rgba(201,151,58,.3); color:#c9973a;
  border-radius:20px; font-size:.82rem; font-weight:600; cursor:pointer; transition:all .18s;
}
.mv-load-years-btn:hover { background:rgba(201,151,58,.15); }

/* Trending row */
.mv-trend-row { display:flex; gap:10px; overflow-x:auto; padding:4px 0 12px; scrollbar-width:none; }
.mv-trend-row::-webkit-scrollbar { display:none; }
.mv-trend-card { flex-shrink:0; width:120px; }
@media(min-width:480px){ .mv-trend-card { width:136px; } }
@media(min-width:768px){ .mv-trend-card { width:148px; } }

/* Empty */
.mv-empty { display:flex; flex-direction:column; align-items:center; padding:80px 20px; color:rgba(255,255,255,.32); gap:10px; text-align:center; }
.mv-empty span { font-size:3rem; }
.mv-empty p { font-size:.85rem; margin:0; }
`;
function LazyImg$1({ src, alt, eager }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!src || eager || !ref.current) return;
    return obsImg$2(ref.current, () => {
      if (ref.current) ref.current.src = src;
    });
  }, [src, eager]);
  if (!src) return null;
  return /* @__PURE__ */ jsx(
    "img",
    {
      ref,
      src: eager ? src : void 0,
      alt: alt || "",
      decoding: "async",
      width: "200",
      height: "300",
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", opacity: 0, transition: "opacity .22s" },
      onLoad: (e) => {
        e.target.style.opacity = "1";
      },
      onError: (e) => {
        e.target.style.opacity = ".08";
      }
    }
  );
}
const PosterCard = React.memo(function PosterCard2({ movie, onClick }) {
  var _a, _b;
  const v = movie.verdict || "Upcoming";
  const c = VS[v] || "#7aaae8";
  const img = movie.posterUrl || movie.thumbnailUrl;
  return /* @__PURE__ */ jsxs("div", { className: "mv-card", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "mv-poster", children: [
      img ? /* @__PURE__ */ jsx(LazyImg$1, { src: img, alt: movie.title }) : /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }, children: "🎬" }),
      /* @__PURE__ */ jsx("div", { className: "mv-poster-grad" }),
      /* @__PURE__ */ jsx("div", { className: "mv-po", children: /* @__PURE__ */ jsx("div", { className: "mv-pc", children: "▶" }) }),
      /* @__PURE__ */ jsx("div", { className: "mv-verdict", style: { background: `${c}22`, border: `1px solid ${c}88`, color: c }, children: v }),
      ((_a = movie.genre) == null ? void 0 : _a[0]) && /* @__PURE__ */ jsx("div", { className: "mv-genre", children: movie.genre[0] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mv-cmeta", children: [
      /* @__PURE__ */ jsx("p", { className: "mv-ctitle", children: movie.title }),
      /* @__PURE__ */ jsx("p", { className: "mv-cyear", children: ((_b = movie.releaseDate) == null ? void 0 : _b.slice(0, 4)) || "TBA" })
    ] })
  ] });
});
function SkGrid$1({ n = 16 }) {
  return /* @__PURE__ */ jsx("div", { className: "mv-grid", children: Array.from({ length: n }).map((_, i) => /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mv-sk-post", style: { animationDelay: `${i * 0.04}s` } }),
    /* @__PURE__ */ jsx("div", { className: "mv-sk-ln", style: { width: "80%", marginTop: 6, animationDelay: `${i * 0.04 + 0.07}s` } }),
    /* @__PURE__ */ jsx("div", { className: "mv-sk-ln", style: { width: "50%", marginTop: 4, animationDelay: `${i * 0.04 + 0.12}s` } })
  ] }, i)) });
}
function YearSection({ year, movies, onMovie, isExpanded, onExpand, onCollapse }) {
  const sentRef = useRef(null);
  const [vis, setVis] = useState(false);
  const [filterPage, setFilterPage] = useState(1);
  useEffect(() => {
    const el = sentRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVis(true);
        io.disconnect();
      }
    }, { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const total = movies.length;
  const shown = isExpanded ? movies.slice(0, filterPage * FILTER_PAGE) : movies.slice(0, YEAR_PREVIEW);
  const canMore = isExpanded && shown.length < total;
  return /* @__PURE__ */ jsxs("div", { className: "mv-ysec", ref: sentRef, children: [
    /* @__PURE__ */ jsxs("div", { className: "mv-ysec-head", children: [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", gap: 0, minWidth: 0 }, children: /* @__PURE__ */ jsxs("h2", { className: "mv-ysec-title", children: [
        "📅 ",
        year,
        /* @__PURE__ */ jsx("span", { className: "mv-ysec-cnt", children: isExpanded ? `${shown.length} of ${total}` : `${Math.min(YEAR_PREVIEW, total)} of ${total}` })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }, children: [
        !isExpanded && total > YEAR_PREVIEW && /* @__PURE__ */ jsxs("button", { className: "mv-va", onClick: onExpand, children: [
          "View all ",
          total,
          " →"
        ] }),
        isExpanded && /* @__PURE__ */ jsx("button", { className: "mv-va", onClick: onCollapse, style: { color: "rgba(255,255,255,.4)" }, children: "↑ Collapse" })
      ] })
    ] }),
    vis ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "mv-grid", children: shown.map((m) => /* @__PURE__ */ jsx(PosterCard, { movie: m, onClick: () => onMovie(m) }, m._id)) }),
      canMore && /* @__PURE__ */ jsx("div", { className: "mv-more", style: { paddingTop: 14 }, children: /* @__PURE__ */ jsxs("button", { className: "mv-more-btn", onClick: () => setFilterPage((p) => p + 1), children: [
        "Load more · ",
        total - shown.length,
        " remaining"
      ] }) })
    ] }) : /* @__PURE__ */ jsx(SkGrid$1, { n: Math.min(YEAR_PREVIEW, 8) })
  ] });
}
function Movies() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState(() => Cache.peek("movies") || []);
  const [loading, setLoading] = useState(() => Cache.peek("movies") === null);
  const [search, setSearch] = useState("");
  const [fYear, setFYear] = useState("");
  const [fGenre, setFGenre] = useState("");
  const [fVerdict, setFVerdict] = useState("");
  const [yearsVisible, setYearsVisible] = useState(YEARS_INIT);
  const [expandedYears, setExpandedYears] = useState({});
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("browse");
  const isFiltering = !!(search.trim() || fYear || fGenre || fVerdict);
  useEffect(() => {
    if (Cache.peek("movies") !== null) return;
    Cache.getMovies().then((d) => setMovies([...d].sort((a, b) => (b.releaseDate || "0").localeCompare(a.releaseDate || "0")))).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, fYear, fGenre, fVerdict]);
  const go = useCallback((m) => navigate(moviePath(m)), [navigate]);
  const srt = useCallback((arr) => [...arr].sort((a, b) => (b.releaseDate || "0").localeCompare(a.releaseDate || "0")), []);
  const allYears = useMemo(
    () => [...new Set(movies.map((m) => {
      var _a;
      return (_a = m.releaseDate) == null ? void 0 : _a.slice(0, 4);
    }).filter(Boolean))].sort((a, b) => b - a),
    [movies]
  );
  const moviesByYear = useMemo(() => {
    const map = {};
    allYears.forEach((yr) => {
      map[yr] = srt(movies.filter((m) => (m.releaseDate || "").startsWith(yr)));
    });
    return map;
  }, [movies, allYears, srt]);
  const visibleYears = useMemo(() => allYears.slice(0, yearsVisible), [allYears, yearsVisible]);
  const hasMoreYears = yearsVisible < allYears.length;
  const trending = useMemo(
    () => movies.filter((m) => {
      var _a;
      return ((_a = m.reviews) == null ? void 0 : _a.length) >= 1;
    }).map((m) => ({ ...m, avg: m.reviews.reduce((s, r) => s + (r.rating || 0), 0) / m.reviews.length })).filter((m) => m.avg >= 3.5).sort((a, b) => b.avg - a.avg).slice(0, 20),
    [movies]
  );
  const upcoming = useMemo(() => srt(movies.filter((m) => !m.verdict || m.verdict === "Upcoming")).slice(0, 20), [movies, srt]);
  const filtered = useMemo(() => {
    let base = movies;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((m) => {
        var _a, _b;
        return ((_a = m.title) == null ? void 0 : _a.toLowerCase().includes(q)) || ((_b = m.director) == null ? void 0 : _b.toLowerCase().includes(q));
      });
    }
    if (fYear) base = base.filter((m) => (m.releaseDate || "").startsWith(fYear));
    if (fGenre) base = base.filter((m) => {
      var _a;
      return (_a = m.genre) == null ? void 0 : _a.includes(fGenre);
    });
    if (fVerdict) base = base.filter((m) => (m.verdict || "Upcoming") === fVerdict);
    return base;
  }, [movies, search, fYear, fGenre, fVerdict]);
  const shownF = filtered.slice(0, page * FILTER_PAGE);
  const hasMore = shownF.length < filtered.length;
  const clearAll = () => {
    setSearch("");
    setFYear("");
    setFGenre("");
    setFVerdict("");
  };
  const TABS = [
    { key: "browse", label: "🎬 Browse" },
    { key: "upcoming", label: "🚀 Upcoming", count: upcoming.length },
    { key: "trending", label: "⭐ Top Rated", count: trending.length }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "mv-root", children: [
    /* @__PURE__ */ jsx(SEO, { ...staticSEO.movies }),
    /* @__PURE__ */ jsx("style", { children: CSS$7 }),
    /* @__PURE__ */ jsxs("div", { className: "mv-hdr", children: [
      /* @__PURE__ */ jsxs("div", { className: "mv-srow", children: [
        /* @__PURE__ */ jsxs("div", { className: "mv-sbox", children: [
          /* @__PURE__ */ jsx("span", { className: "mv-sico", children: "🔍" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              placeholder: "Search movies, directors…",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              autoComplete: "off"
            }
          ),
          search && /* @__PURE__ */ jsx("button", { className: "mv-sx", onClick: () => setSearch(""), children: "✕" })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "mv-count", children: [
          "🎬 ",
          movies.length.toLocaleString(),
          " films"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mv-chips", children: [
        /* @__PURE__ */ jsx("div", { className: `mv-chip${fYear ? " on" : ""}`, children: fYear ? /* @__PURE__ */ jsxs(Fragment, { children: [
          fYear,
          " ",
          /* @__PURE__ */ jsx("button", { className: "mv-cx", onClick: () => setFYear(""), children: "✕" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          "📅 Year",
          /* @__PURE__ */ jsxs("select", { value: fYear, onChange: (e) => setFYear(e.target.value), title: "Year", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "All Years" }),
            allYears.map((y) => /* @__PURE__ */ jsx("option", { value: y, children: y }, y))
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: `mv-chip${fGenre ? " on" : ""}`, children: fGenre ? /* @__PURE__ */ jsxs(Fragment, { children: [
          fGenre,
          " ",
          /* @__PURE__ */ jsx("button", { className: "mv-cx", onClick: () => setFGenre(""), children: "✕" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          "🎭 Genre",
          /* @__PURE__ */ jsxs("select", { value: fGenre, onChange: (e) => setFGenre(e.target.value), title: "Genre", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "All Genres" }),
            GENRES$3.map((g) => /* @__PURE__ */ jsx("option", { value: g, children: g }, g))
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: `mv-chip${fVerdict ? " on" : ""}`, children: fVerdict ? /* @__PURE__ */ jsxs(Fragment, { children: [
          fVerdict,
          " ",
          /* @__PURE__ */ jsx("button", { className: "mv-cx", onClick: () => setFVerdict(""), children: "✕" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          "🏆 Verdict",
          /* @__PURE__ */ jsxs("select", { value: fVerdict, onChange: (e) => setFVerdict(e.target.value), title: "Verdict", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "All Verdicts" }),
            VERDICTS$1.map((v) => /* @__PURE__ */ jsx("option", { value: v, children: v }, v))
          ] })
        ] }) }),
        (fYear || fGenre || fVerdict) && /* @__PURE__ */ jsx(
          "div",
          {
            className: "mv-chip",
            onClick: clearAll,
            style: { color: "#ff6b6b", borderColor: "rgba(255,107,107,.3)", background: "rgba(255,107,107,.07)" },
            children: "✕ Clear"
          }
        ),
        !isFiltering && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "mv-cdiv" }),
          TABS.map((t) => /* @__PURE__ */ jsxs("div", { className: `mv-chip tab${tab === t.key ? " on" : ""}`, onClick: () => setTab(t.key), children: [
            t.label,
            t.count != null && /* @__PURE__ */ jsx("span", { style: { fontSize: ".62rem", opacity: 0.5, marginLeft: 3 }, children: t.count })
          ] }, t.key))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mv-content", children: [
      loading && /* @__PURE__ */ jsx(SkGrid$1, { n: 16 }),
      !loading && isFiltering && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { className: "mv-rinfo", children: [
          filtered.length === 0 ? "No results" : `${filtered.length.toLocaleString()} film${filtered.length !== 1 ? "s" : ""}`,
          fYear && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · ",
            /* @__PURE__ */ jsx("strong", { style: { color: "#f1f1f1" }, children: fYear })
          ] }),
          fGenre && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · ",
            /* @__PURE__ */ jsx("strong", { style: { color: "#f1f1f1" }, children: fGenre })
          ] }),
          fVerdict && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · ",
            /* @__PURE__ */ jsx("strong", { style: { color: "#f1f1f1" }, children: fVerdict })
          ] })
        ] }),
        filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mv-empty", children: [
          /* @__PURE__ */ jsx("span", { children: "🎬" }),
          /* @__PURE__ */ jsx("p", { children: "No films match your filters." }),
          /* @__PURE__ */ jsx("button", { className: "mv-more-btn", style: { marginTop: 8 }, onClick: clearAll, children: "Clear filters" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "mv-grid", children: shownF.map((m) => /* @__PURE__ */ jsx(PosterCard, { movie: m, onClick: () => go(m) }, m._id)) }),
          hasMore && /* @__PURE__ */ jsx("div", { className: "mv-more", children: /* @__PURE__ */ jsxs("button", { className: "mv-more-btn", onClick: () => setPage((p) => p + 1), children: [
            "Load more · ",
            filtered.length - shownF.length,
            " remaining"
          ] }) })
        ] })
      ] }),
      !loading && !isFiltering && tab === "browse" && /* @__PURE__ */ jsxs(Fragment, { children: [
        trending.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mv-ysec", children: [
          /* @__PURE__ */ jsx("div", { className: "mv-ysec-head", children: /* @__PURE__ */ jsxs("h2", { className: "mv-ysec-title", children: [
            "⭐ Trending Now",
            /* @__PURE__ */ jsx("span", { className: "mv-ysec-cnt", children: trending.length })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "mv-trend-row", children: trending.map((m) => /* @__PURE__ */ jsx("div", { className: "mv-trend-card", children: /* @__PURE__ */ jsx(PosterCard, { movie: m, onClick: () => go(m) }) }, m._id)) })
        ] }),
        visibleYears.map((yr) => /* @__PURE__ */ jsx(
          YearSection,
          {
            year: yr,
            movies: moviesByYear[yr] || [],
            onMovie: go,
            isExpanded: !!expandedYears[yr],
            onExpand: () => setExpandedYears((p) => ({ ...p, [yr]: true })),
            onCollapse: () => setExpandedYears((p) => ({ ...p, [yr]: false }))
          },
          yr
        )),
        hasMoreYears && /* @__PURE__ */ jsx("div", { className: "mv-load-years", children: /* @__PURE__ */ jsxs(
          "button",
          {
            className: "mv-load-years-btn",
            onClick: () => setYearsVisible((v) => v + YEARS_STEP),
            children: [
              "Load ",
              Math.min(YEARS_STEP, allYears.length - yearsVisible),
              " more years · ",
              allYears.length - yearsVisible,
              " remaining"
            ]
          }
        ) })
      ] }),
      !loading && !isFiltering && tab === "upcoming" && /* @__PURE__ */ jsxs("div", { className: "mv-ysec", children: [
        /* @__PURE__ */ jsx("div", { className: "mv-ysec-head", children: /* @__PURE__ */ jsxs("h2", { className: "mv-ysec-title", children: [
          "🚀 Upcoming Films",
          /* @__PURE__ */ jsx("span", { className: "mv-ysec-cnt", children: upcoming.length })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "mv-grid", children: upcoming.map((m) => /* @__PURE__ */ jsx(PosterCard, { movie: m, onClick: () => go(m) }, m._id)) })
      ] }),
      !loading && !isFiltering && tab === "trending" && /* @__PURE__ */ jsxs("div", { className: "mv-ysec", children: [
        /* @__PURE__ */ jsx("div", { className: "mv-ysec-head", children: /* @__PURE__ */ jsxs("h2", { className: "mv-ysec-title", children: [
          "⭐ Top Rated Films",
          /* @__PURE__ */ jsx("span", { className: "mv-ysec-cnt", children: trending.length })
        ] }) }),
        trending.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mv-empty", children: [
          /* @__PURE__ */ jsx("span", { children: "⭐" }),
          /* @__PURE__ */ jsx("p", { children: "No rated films yet." })
        ] }) : /* @__PURE__ */ jsx("div", { className: "mv-grid", children: trending.map((m) => /* @__PURE__ */ jsx(PosterCard, { movie: m, onClick: () => go(m) }, m._id)) })
      ] })
    ] })
  ] });
}
function SafeImg$2({ src, alt, style }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return /* @__PURE__ */ jsx("img", { src, alt, style, onError: () => setBroken(true) });
}
function SafeNewsImg({ src, alt }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return /* @__PURE__ */ jsx("div", { className: "news-card-img", children: /* @__PURE__ */ jsx("img", { src, alt, onError: () => setBroken(true) }) });
}
const extractYtId$5 = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb$3 = (id) => id ? `https://img.youtube.com/vi/${extractYtId$5(id) || id}/mqdefault.jpg` : null;
const VERDICT_COLOR = {
  "Blockbuster": "#95e5b8",
  "Super Hit": "#95e5b8",
  "Hit": "#95e5b8",
  "Average": "#e8c87a",
  "Flop": "#e59595",
  "Disaster": "#e59595",
  "Upcoming": "#7aaae8"
};
const fmtDate$4 = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const GENRES$2 = ["Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical", "Devotional", "Horror"];
const CATS$1 = ["Feature Film", "Short Film", "Web Series", "Documentary"];
const VDICT = ["Upcoming", "Average", "Hit", "Super Hit", "Blockbuster", "Flop", "Disaster"];
const NCATS = ["Update", "Release", "Trailer", "Song", "Award", "Interview", "Other"];
const CTYPES = ["Actor", "Actress", "Director", "Producer", "Music Director", "Cinematographer", "Choreographer", "Lyricist", "Other"];
function InterestedWidget({ movieId }) {
  const voteKey = `interested_${movieId}`;
  const [vote, setVote] = React.useState(() => {
    try {
      return localStorage.getItem(voteKey) || null;
    } catch {
      return null;
    }
  });
  const [yesCount, setYesCount] = React.useState(0);
  const [noCount, setNoCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [voting, setVoting] = React.useState(false);
  React.useEffect(() => {
    if (!movieId) return;
    API.getInterested(movieId).then((d) => {
      setYesCount(d.yes || 0);
      setNoCount(d.no || 0);
    }).catch(() => {
    }).finally(() => setLoading(false));
  }, [movieId]);
  const totalVotes = yesCount + noCount;
  const yesPercent = totalVotes ? Math.round(yesCount / totalVotes * 100) : 0;
  const handleVote = async (v) => {
    if (vote || voting) return;
    setVoting(true);
    try {
      const d = await API.postInterested(movieId, v);
      setYesCount(d.yes || 0);
      setNoCount(d.no || 0);
      setVote(v);
      try {
        localStorage.setItem(voteKey, v);
      } catch {
      }
    } catch {
      setVote(v);
      if (v === "yes") setYesCount((n) => n + 1);
      else setNoCount((n) => n + 1);
      try {
        localStorage.setItem(voteKey, v);
      } catch {
      }
    } finally {
      setVoting(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: ".62rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 8 }, children: "🎬 Interested?" }),
    loading ? /* @__PURE__ */ jsx("div", { style: { height: 36, background: "rgba(255,255,255,.04)", borderRadius: 8, animation: "pulse 1.5s infinite" } }) : !vote ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      yesCount > 0 && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".68rem", color: "rgba(255,255,255,.4)", marginBottom: 2 }, children: [
        "🔥 ",
        /* @__PURE__ */ jsx("strong", { style: { color: "rgba(255,255,255,.7)" }, children: yesCount.toLocaleString() }),
        " people are interested"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleVote("yes"),
            disabled: voting,
            style: { flex: 1, padding: "9px 6px", borderRadius: 8, border: "1px solid rgba(80,200,120,.4)", background: "rgba(80,200,120,.1)", color: "#80e8a8", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", opacity: voting ? 0.6 : 1 },
            onMouseEnter: (e) => {
              if (!voting) e.currentTarget.style.background = "rgba(80,200,120,.22)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "rgba(80,200,120,.1)";
            },
            children: "👍 Interested"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleVote("no"),
            disabled: voting,
            style: { flex: 1, padding: "9px 6px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.55)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", opacity: voting ? 0.6 : 1 },
            onMouseEnter: (e) => {
              if (!voting) e.currentTarget.style.background = "rgba(255,255,255,.1)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.05)";
            },
            children: "👎 Not sure"
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: ".76rem", color: vote === "yes" ? "#80e8a8" : "rgba(255,255,255,.45)", fontWeight: 700, marginBottom: 8 }, children: vote === "yes" ? "✓ You're interested!" : "👎 Not interested" }),
      yesCount > 0 && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".8rem", color: "rgba(255,255,255,.65)", marginBottom: 8 }, children: [
        "🔥 ",
        /* @__PURE__ */ jsx("strong", { style: { color: "#80e8a8", fontSize: "1rem" }, children: yesCount.toLocaleString() }),
        " people interested"
      ] }),
      totalVotes > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { style: { height: 5, background: "rgba(255,255,255,.08)", borderRadius: 3, overflow: "hidden", marginBottom: 5 }, children: /* @__PURE__ */ jsx("div", { style: { height: "100%", width: `${yesPercent}%`, background: "linear-gradient(to right,#80e8a8,#4caf82)", borderRadius: 3, transition: "width .7s ease" } }) }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: ".6rem", color: "rgba(255,255,255,.35)" }, children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "👍 ",
            yesPercent,
            "%"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            totalVotes.toLocaleString(),
            " total votes"
          ] })
        ] })
      ] })
    ] })
  ] });
}
function CountdownDisplay({ releaseDate }) {
  const calc = () => {
    const diff = new Date(releaseDate) - /* @__PURE__ */ new Date();
    if (diff <= 0) return null;
    return {
      d: Math.floor(diff / 864e5),
      h: Math.floor(diff % 864e5 / 36e5),
      m: Math.floor(diff % 36e5 / 6e4),
      s: Math.floor(diff % 6e4 / 1e3)
    };
  };
  const [t, setT] = React.useState(calc);
  React.useEffect(() => {
    const iv = setInterval(() => setT(calc()), 1e3);
    return () => clearInterval(iv);
  }, [releaseDate]);
  if (!t) return null;
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 4, marginTop: 6, width: "100%" }, children: [["d", "Days"], ["h", "Hrs"], ["m", "Min"], ["s", "Sec"]].map(([k, lbl]) => /* @__PURE__ */ jsxs("div", { style: { flex: 1, textAlign: "center", background: "rgba(0,0,0,.5)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 7, padding: "5px 4px" }, children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "1.1rem", fontWeight: 900, color: "#c9973a", lineHeight: 1, fontVariantNumeric: "tabular-nums" }, children: String(t[k]).padStart(2, "0") }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: ".5rem", textTransform: "uppercase", letterSpacing: ".06em", color: "rgba(255,255,255,.35)", marginTop: 2 }, children: lbl })
  ] }, k)) });
}
function HomeRow$1({ title, tag, children }) {
  const ref = useRef(null);
  const slide = (n) => {
    var _a;
    return (_a = ref.current) == null ? void 0 : _a.scrollBy({ left: n, behavior: "smooth" });
  };
  return /* @__PURE__ */ jsxs("div", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: title }),
        tag && /* @__PURE__ */ jsx("span", { className: "home-tag", children: tag })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "home-section-arrows", children: [
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(-400), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(400), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row", ref, children })
  ] });
}
function MiniMovieCard({ movie, onClick }) {
  var _a, _b, _c;
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb$3((_b = (_a = movie.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId);
  const verdict = movie.verdict || "Upcoming";
  const color = VERDICT_COLOR[verdict] || "#7aaae8";
  return /* @__PURE__ */ jsxs("div", { className: "home-card", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "home-card-img", children: [
      img ? /* @__PURE__ */ jsx("img", { src: img, alt: movie.title, loading: "lazy", onError: (e) => {
        e.target.style.display = "none";
      } }) : null,
      /* @__PURE__ */ jsx("div", { className: "home-card-fallback", style: { display: img ? "none" : "flex" }, children: "🎬" }),
      /* @__PURE__ */ jsx("div", { className: "home-card-play", children: "▶" }),
      /* @__PURE__ */ jsxs("div", { className: "home-card-overlay", children: [
        /* @__PURE__ */ jsx("span", { className: "home-card-verdict", style: { color }, children: verdict }),
        ((_c = movie.genre) == null ? void 0 : _c[0]) && /* @__PURE__ */ jsx("span", { className: "home-card-genre", children: movie.genre[0] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-card-info", children: [
      /* @__PURE__ */ jsx("p", { className: "home-card-title", children: movie.title }),
      /* @__PURE__ */ jsx("p", { className: "home-card-date", children: fmtDate$4(movie.releaseDate) })
    ] })
  ] });
}
function MiniCastCard({ person, onClick }) {
  const [broken, setBroken] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "home-card", style: { width: 150 }, onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "home-card-img", style: { height: 190 }, children: [
      person.photo && !broken ? /* @__PURE__ */ jsx("img", { src: person.photo, alt: person.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: () => setBroken(true) }) : /* @__PURE__ */ jsx("div", { className: "home-card-fallback", children: "👤" }),
      /* @__PURE__ */ jsx("div", { className: "home-card-overlay", children: /* @__PURE__ */ jsx("span", { className: "home-card-genre", children: person.type || "Actor" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-card-info", children: [
      /* @__PURE__ */ jsx("p", { className: "home-card-title", children: person.name }),
      person.role && /* @__PURE__ */ jsx("p", { className: "home-card-date", style: { color: "var(--gold)" }, children: person.role })
    ] })
  ] });
}
function NewsModal({ movieId, existing, onSave, onClose }) {
  const [form, setForm] = useState({ title: (existing == null ? void 0 : existing.title) || "", content: (existing == null ? void 0 : existing.content) || "", category: (existing == null ? void 0 : existing.category) || "Update", imageUrl: (existing == null ? void 0 : existing.imageUrl) || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return setErr("Title and content required.");
    setSaving(true);
    setErr("");
    try {
      const r = existing ? await API.editNews(existing._id, form) : await API.addNews(movieId, form);
      onSave(r, !!existing);
      onClose();
    } catch (e) {
      setErr(typeof e === "string" ? e : "Failed");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 540 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsx("span", { className: "modal-title", children: existing ? "Edit News" : "Add News" }),
      /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Title *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.title, onChange: (e) => set("title", e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Category" }),
      /* @__PURE__ */ jsx("select", { className: "form-select", value: form.category, onChange: (e) => set("category", e.target.value), children: NCATS.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Content *" }),
      /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.content, onChange: (e) => set("content", e.target.value), style: { minHeight: 100 } })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Image URL" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.imageUrl, onChange: (e) => set("imageUrl", e.target.value), placeholder: "https://…" })
    ] }),
    err && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.82rem", marginBottom: 8 }, children: err }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: onClose, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: save, disabled: saving, children: saving ? "Saving…" : existing ? "Save Changes" : "Publish" })
    ] })
  ] }) });
}
function AddCastModal({ movieId, onAdded, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState("search");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newType, setNewType] = useState("Actor");
  const [newPhoto, setNewPhoto] = useState("");
  const [newBio, setNewBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef(null);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await API.searchCast(query));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);
  const addExisting = async (c) => {
    setSaving(true);
    setErr("");
    try {
      const up = await API.addCastToMovie(movieId, { castId: c._id, name: c.name, type: c.type, photo: c.photo || "", role: "", isNew: false });
      onAdded(up);
      onClose();
    } catch (e) {
      setErr(typeof e === "string" ? e : "Failed");
      setSaving(false);
    }
  };
  const addNew = async () => {
    if (!newName.trim()) return setErr("Name required.");
    setSaving(true);
    setErr("");
    try {
      const up = await API.addCastToMovie(movieId, { name: newName, type: newType, role: newRole, photo: newPhoto, bio: newBio, isNew: true });
      onAdded(up);
      onClose();
    } catch (e) {
      setErr(typeof e === "string" ? e : "Failed");
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 520 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsx("span", { className: "modal-title", children: "Add Cast / Crew" }),
      /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 16 }, children: [
      /* @__PURE__ */ jsx("button", { className: `btn btn-sm ${mode === "search" ? "btn-gold" : "btn-outline"}`, onClick: () => setMode("search"), children: "Search Existing" }),
      /* @__PURE__ */ jsx("button", { className: `btn btn-sm ${mode === "new" ? "btn-gold" : "btn-outline"}`, onClick: () => setMode("new"), children: "Add New Person" })
    ] }),
    mode === "search" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("input", { className: "form-input", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Type name to search…", autoFocus: true }),
      (results.length > 0 || searching) && /* @__PURE__ */ jsxs("div", { className: "search-dropdown", children: [
        searching && /* @__PURE__ */ jsx("div", { className: "search-dropdown-item muted", children: "Searching…" }),
        results.map((c) => {
          var _a;
          return /* @__PURE__ */ jsxs("div", { className: "search-dropdown-item", onClick: () => !saving && addExisting(c), children: [
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 600 }, children: c.name }),
            /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)", fontSize: "0.75rem", marginLeft: 8 }, children: c.type }),
            /* @__PURE__ */ jsxs("span", { style: { color: "var(--muted)", fontSize: "0.75rem", marginLeft: 8 }, children: [
              ((_a = c.movies) == null ? void 0 : _a.length) || 0,
              " films"
            ] })
          ] }, c._id);
        })
      ] })
    ] }),
    mode === "new" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newName, onChange: (e) => setNewName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Role / Character" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newRole, onChange: (e) => setNewRole(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Type" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: newType, onChange: (e) => setNewType(e.target.value), children: CTYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newPhoto, onChange: (e) => setNewPhoto(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Bio (optional)" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: newBio, onChange: (e) => setNewBio(e.target.value) })
      ] }),
      err && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.82rem", marginBottom: 8 }, children: err }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: addNew, disabled: saving || !newName.trim(), children: saving ? "Adding…" : "+ Add to Movie" })
    ] }),
    mode === "search" && err && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.82rem", marginTop: 8 }, children: err })
  ] }) });
}
function AddSongModal({ movieId, onAdded, onClose }) {
  const [title, setTitle] = useState("");
  const [singer, setSinger] = useState("");
  const [ytId, setYtId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!title.trim()) return setErr("Song title required.");
    setSaving(true);
    setErr("");
    try {
      const up = await API.addSong(movieId, { title: title.trim(), singer: singer.trim(), ytId: ytId.trim() });
      onAdded(up);
      onClose();
    } catch (e) {
      setErr(typeof e === "string" ? e : "Failed");
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 440 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsx("span", { className: "modal-title", children: "Add Song" }),
      /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Song Title *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: title, onChange: (e) => setTitle(e.target.value), autoFocus: true })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Singer(s)" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: singer, onChange: (e) => setSinger(e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "YouTube ID" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: ytId, onChange: (e) => setYtId(e.target.value), placeholder: "e.g. dQw4w9WgXcQ" })
    ] }),
    ytId && /* @__PURE__ */ jsx("div", { className: "trailer-embed", style: { maxWidth: 380, marginBottom: 12 }, children: /* @__PURE__ */ jsx("iframe", { src: `https://www.youtube.com/embed/${ytId}`, allowFullScreen: true, title: "preview" }) }),
    err && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.82rem", marginBottom: 8 }, children: err }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: onClose, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: save, disabled: saving || !title.trim(), children: saving ? "Adding…" : "+ Add Song" })
    ] })
  ] }) });
}
function MovieDetails({ production, onToast, portalMode }) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I;
  const { slug } = useParams();
  const id = extractId(slug) || slug;
  const navigate = useNavigate();
  const location = useLocation();
  const trailerRef = useRef(null);
  const [movie, setMovie] = useState(null);
  const [allMovies, setAllMovies] = useState(() => Cache.peek("movies") || []);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isOwner = !!(getToken() && production && movie && String(((_a = movie.productionId) == null ? void 0 : _a._id) || movie.productionId) === String(production._id));
  const isCollab = !!(getToken() && production && movie && (movie.collaborators || []).some((c) => String(c._id || c) === String(production._id)));
  const canNews = isOwner || isCollab;
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editBO, setEditBO] = useState(false);
  const [boForm, setBoForm] = useState({});
  const [savingBO, setSavingBO] = useState(false);
  const [newsModal, setNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [addCastModal, setAddCastModal] = useState(false);
  const [addSongModal, setAddSongModal] = useState(false);
  const [editTrailer, setEditTrailer] = useState(false);
  const [trailerInput, setTrailerInput] = useState("");
  const [savingTrailer, setSavingTrailer] = useState(false);
  const [rvUser, setRvUser] = useState("");
  const [rvRating, setRvRating] = useState(0);
  const [rvHover, setRvHover] = useState(0);
  const [rvText, setRvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rvSuccess, setRvSuccess] = useState(false);
  const [rvError, setRvError] = useState("");
  const [heroRating, setHeroRating] = useState(() => {
    try {
      return parseInt(localStorage.getItem(`hero_r_${id}`) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [heroHover, setHeroHover] = useState(0);
  const [heroFeedback, setHeroFeedback] = useState("");
  const [watchlisted, setWatchlisted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("op_watchlist") || "[]").includes(String(id));
    } catch {
      return false;
    }
  });
  const [seenPoll, setSeenPoll] = useState(() => {
    try {
      return localStorage.getItem(`seen_${id}`) || null;
    } catch {
      return null;
    }
  });
  const [viewCount, setViewCount] = useState(() => {
    try {
      const k = `views_${id}`;
      const n = parseInt(localStorage.getItem(k) || "0", 10) + 1;
      localStorage.setItem(k, String(n));
      return n;
    } catch {
      return 0;
    }
  });
  const [showShare, setShowShare] = useState(false);
  const [miniHeader, setMiniHeader] = useState(false);
  const heroRef = useRef(null);
  const load = useCallback(() => {
    setLoading(true);
    API.getMovie(id).then((m) => {
      var _a2, _b2;
      setMovie(m);
      setEditForm({ ...m });
      setBoForm({ ...m.boxOffice || {}, verdict: m.verdict });
      setTrailerInput(((_b2 = (_a2 = m.media) == null ? void 0 : _a2.trailer) == null ? void 0 : _b2.ytId) || "");
      setLoading(false);
      const tid = typeof requestIdleCallback !== "undefined" ? requestIdleCallback(() => Cache.getMovies().catch(() => []).then((all) => setAllMovies(all))) : setTimeout(() => Cache.getMovies().catch(() => []).then((all) => setAllMovies(all)), 300);
      return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(tid) : clearTimeout(tid);
    }).catch((e) => {
      setError(typeof e === "string" ? e : "Failed to load");
      setLoading(false);
    });
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      setMiniHeader(heroRef.current.getBoundingClientRect().bottom < 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    var _a2;
    if (((_a2 = location.state) == null ? void 0 : _a2.scrollTo) === "trailer" && !loading && movie) {
      setTab("overview");
      setTimeout(() => {
        var _a3;
        (_a3 = trailerRef.current) == null ? void 0 : _a3.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      window.history.replaceState({}, "");
    }
  }, [location.state, loading, movie]);
  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const up = await API.updateMovie(id, {
        title: editForm.title,
        category: editForm.category,
        genre: editForm.genre,
        releaseDate: editForm.releaseDate,
        releaseTBA: editForm.releaseTBA,
        director: editForm.director,
        producer: editForm.producer,
        budget: editForm.budget,
        language: editForm.language,
        synopsis: editForm.synopsis,
        posterUrl: editForm.posterUrl,
        thumbnailUrl: editForm.thumbnailUrl,
        runtime: editForm.runtime,
        imdbId: editForm.imdbId,
        imdbRating: editForm.imdbRating,
        verdict: editForm.verdict
      });
      setMovie((m) => ({ ...m, ...up }));
      setEditing(false);
      onToast && onToast("Movie updated!");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Save failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };
  const saveBO = async () => {
    setSavingBO(true);
    try {
      const up = await API.updateBoxOffice(id, boForm);
      setMovie((m) => ({ ...m, ...up }));
      setEditBO(false);
      onToast && onToast("Box office updated!");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Save failed", "error");
    } finally {
      setSavingBO(false);
    }
  };
  const saveTrailer = async () => {
    setSavingTrailer(true);
    try {
      const up = await API.updateTrailer(id, { ytId: trailerInput.trim() });
      setMovie((m) => ({ ...m, media: { ...m.media, trailer: { ytId: trailerInput.trim() } } }));
      setEditTrailer(false);
      onToast && onToast("Trailer updated!");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Save failed", "error");
    } finally {
      setSavingTrailer(false);
    }
  };
  const removeCast = async (castId) => {
    if (!window.confirm("Remove this person?")) return;
    try {
      const up = await API.removeCastFromMovie(id, castId);
      setMovie((m) => ({ ...m, cast: up.cast }));
      onToast && onToast("Removed.");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Failed", "error");
    }
  };
  const removeSong = async (index) => {
    if (!window.confirm("Remove this song?")) return;
    try {
      const up = await API.removeSong(id, index);
      setMovie((m) => ({ ...m, media: up.media }));
      onToast && onToast("Song removed.");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Failed", "error");
    }
  };
  const handleNewsSaved = (item, isEdit) => {
    setMovie((m) => ({ ...m, news: isEdit ? (m.news || []).map((n) => n._id === item._id ? item : n) : [...m.news || [], item] }));
    onToast && onToast(isEdit ? "News updated!" : "News published!");
  };
  const handleDeleteNews = async (newsId) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await API.deleteNews(newsId);
      setMovie((m) => ({ ...m, news: (m.news || []).filter((n) => n._id !== newsId) }));
      onToast && onToast("News deleted.");
    } catch (e) {
      onToast && onToast(typeof e === "string" ? e : "Failed", "error");
    }
  };
  const toggleWatchlist = () => {
    try {
      const list = JSON.parse(localStorage.getItem("op_watchlist") || "[]");
      const sid = String(id);
      const next = watchlisted ? list.filter((x) => x !== sid) : [...list, sid];
      localStorage.setItem("op_watchlist", JSON.stringify(next));
      setWatchlisted(!watchlisted);
    } catch {
    }
  };
  const voteSeen = (answer) => {
    try {
      localStorage.setItem(`seen_${id}`, answer);
    } catch {
    }
    setSeenPoll(answer);
  };
  const handleShare = () => {
    var _a2;
    const url = window.location.href;
    const text = `🎬 ${movie.title}${movie.releaseDate ? " (" + new Date(movie.releaseDate).getFullYear() + ")" : ""} — Check it out on Ollypedia!`;
    if (navigator.share) {
      navigator.share({ title: movie.title, text, url });
    } else {
      (_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(url).then(() => onToast && onToast("Link copied!"));
    }
  };
  const reviewFormRef = useRef(null);
  const handleHeroRate = (star) => {
    setHeroRating(star);
    try {
      localStorage.setItem(`hero_r_${id}`, String(star));
    } catch {
    }
    const labels = ["", "Terrible 😞", "Poor 😕", "Average 😐", "Good 😊", "Excellent 🤩"];
    setHeroFeedback(labels[star]);
    setRvRating(star);
    setTab("reviews");
    setTimeout(() => {
      var _a2;
      (_a2 = reviewFormRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    setTimeout(() => setHeroFeedback(""), 3e3);
  };
  const submitReview = async (e) => {
    e.preventDefault();
    setRvError("");
    if (!rvUser.trim()) return setRvError("Please enter your name.");
    if (!rvRating) return setRvError("Please select a star rating.");
    if (!rvText.trim()) return setRvError("Please write your review.");
    setSubmitting(true);
    try {
      const reviews = await API.postReview(id, { user: rvUser.trim(), rating: rvRating, text: rvText.trim() });
      setMovie((m) => ({ ...m, reviews }));
      setRvUser("");
      setRvText("");
      setRvRating(0);
      setRvSuccess(true);
      setTimeout(() => setRvSuccess(false), 4e3);
      onToast && onToast("Review submitted! 🎉");
    } catch (err) {
      setRvError(typeof err === "string" ? err : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return /* @__PURE__ */ jsx("div", { style: { minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }, children: /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
    /* @__PURE__ */ jsx("div", { className: "skeleton", style: { width: 300, height: 450, borderRadius: 12, margin: "0 auto 24px" } }),
    /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 20, width: 200, margin: "0 auto 12px" } }),
    /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 40, width: 320, margin: "0 auto" } })
  ] }) });
  if (error || !movie) return /* @__PURE__ */ jsxs("div", { className: "page empty-state", children: [
    /* @__PURE__ */ jsx("h3", { children: "Movie not found" }),
    /* @__PURE__ */ jsx("p", { children: error }),
    /* @__PURE__ */ jsx(Link, { to: "/movies", className: "btn btn-outline", style: { marginTop: 16 }, children: "← Back to Movies" })
  ] });
  ((_b = movie.reviews) == null ? void 0 : _b.length) ? (movie.reviews.reduce((s, r) => s + r.rating, 0) / movie.reviews.length).toFixed(1) : null;
  const setE = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  const setBo = (k, v) => setBoForm((f) => ({ ...f, [k]: v }));
  const toggleGenre = (g) => setE("genre", (editForm.genre || []).includes(g) ? (editForm.genre || []).filter((x) => x !== g) : [...editForm.genre || [], g]);
  const crew = (movie.cast || []).filter((c) => ["Director", "Producer", "Music Director", "Cinematographer", "Choreographer", "Lyricist"].includes(c.type));
  const actors = (movie.cast || []).filter((c) => !["Director", "Producer", "Music Director", "Cinematographer", "Choreographer", "Lyricist"].includes(c.type));
  const bannerImg = movie.thumbnailUrl || ytThumb$3((_d = (_c = movie.media) == null ? void 0 : _c.trailer) == null ? void 0 : _d.ytId) || movie.posterUrl;
  const verdictColor2 = VERDICT_COLOR[movie.verdict] || "#7aaae8";
  const relatedMovies = allMovies.filter((m) => {
    var _a2, _b2;
    return m._id !== id && (((_a2 = movie.genre) == null ? void 0 : _a2.length) && ((_b2 = m.genre) == null ? void 0 : _b2.some((g) => movie.genre.includes(g))) || movie.director && m.director === movie.director);
  }).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 15);
  const sameDirector = allMovies.filter((m) => m._id !== id && movie.director && m.director === movie.director).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 12);
  const genreClass = ((_e = movie.genre) == null ? void 0 : _e.includes("Action")) ? "genre-action" : ((_f = movie.genre) == null ? void 0 : _f.includes("Romance")) ? "genre-romance" : ((_g = movie.genre) == null ? void 0 : _g.includes("Horror")) ? "genre-horror" : "";
  const isBlockbuster = ["Blockbuster", "Super Hit"].includes(movie.verdict);
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh", background: "#0f0f0f", color: "#f1f1f1" }, className: genreClass, children: [
    /* @__PURE__ */ jsx(SEO, { ...movieSEO(movie) }),
    /* @__PURE__ */ jsxs("div", { className: `md-mini-header${miniHeader ? " visible" : ""}`, children: [
      movie.posterUrl && /* @__PURE__ */ jsx("img", { src: movie.posterUrl, alt: movie.title, className: "md-mini-poster", onError: (e) => e.target.style.display = "none" }),
      /* @__PURE__ */ jsx("span", { className: "md-mini-title", children: movie.title }),
      movie.verdict && /* @__PURE__ */ jsx("span", { className: "md-mini-verdict", style: { background: `${verdictColor2}22`, border: `1px solid ${verdictColor2}`, color: verdictColor2 }, children: movie.verdict }),
      ((_i = (_h = movie.media) == null ? void 0 : _h.trailer) == null ? void 0 : _i.ytId) && /* @__PURE__ */ jsx("button", { className: "md-btn-play", style: { padding: "6px 14px", fontSize: ".75rem" }, onClick: () => {
        setTab("overview");
        setTimeout(() => {
          var _a2;
          return (_a2 = trailerRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }, children: "▶ Trailer" }),
      /* @__PURE__ */ jsx("button", { className: `md-wl-btn${watchlisted ? " active" : ""}`, style: { padding: "6px 12px", fontSize: ".75rem" }, onClick: toggleWatchlist, children: watchlisted ? "✓ Saved" : "+ Watchlist" })
    ] }),
    /* @__PURE__ */ jsx(Helmet, { children: movie && /* @__PURE__ */ jsx("script", { type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": movie.title,
      "description": (_j = movie.synopsis) == null ? void 0 : _j.slice(0, 300),
      "image": movie.posterUrl || movie.thumbnailUrl,
      "datePublished": movie.releaseDate,
      "duration": movie.runtime,
      "director": movie.director ? { "@type": "Person", "name": movie.director } : void 0,
      "contentRating": movie.contentRating,
      "genre": movie.genre,
      "inLanguage": movie.language || "or",
      "aggregateRating": ((_k = movie.reviews) == null ? void 0 : _k.length) ? { "@type": "AggregateRating", "ratingValue": (movie.reviews.reduce((s, r) => s + (r.rating || 0), 0) / movie.reviews.length).toFixed(1), "reviewCount": movie.reviews.length, "bestRating": "5", "worstRating": "1" } : void 0,
      "trailer": ((_m = (_l = movie.media) == null ? void 0 : _l.trailer) == null ? void 0 : _m.ytId) ? { "@type": "VideoObject", "name": movie.title + " Trailer", "embedUrl": "https://www.youtube.com/embed/" + movie.media.trailer.ytId } : void 0
    }) }) }),
    /* @__PURE__ */ jsx("style", { children: `
        /* ── Movie Detail Page ── */
        .md-root { min-height:100vh; background:#0f0f0f; color:#f1f1f1; padding-top:58px; }

        /* ── Hero ── */
        .md-hero {
          position: relative;
          overflow: hidden;
          background: #0a0a0a;
          /* min-height so the hero feels tall even without long content */
          min-height: 420px;
        }
        @media(min-width:600px){ .md-hero { min-height: 480px; } }
        @media(min-width:900px){ .md-hero { min-height: 520px; } }

        /* Blurred backdrop — the key: fill the whole hero, not clipped too tight */
        .md-hero-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center 20%;
          /* brightness .35 = visible but dark, not pitch black */
          filter: blur(0px) brightness(.35) saturate(1.2);
          transform: scale(1.05); /* slight scale prevents blur edge bleeding */
        }

        /* Two-layer gradient:
           left-to-right: dark on left so poster/text are legible
           top-to-bottom: fades to solid #0a0a0a at bottom so page flows in */
        .md-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to right,
              rgba(10,10,10,.88) 0%,
              rgba(10,10,10,.55) 50%,
              rgba(10,10,10,.25) 100%
            ),
            linear-gradient(to bottom,
              transparent 0%,
              transparent 55%,
              rgba(10,10,10,.85) 80%,
              #0a0a0a 100%
            );
        }

        .md-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 14px 36px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }
        @media(min-width:480px){ .md-hero-inner { padding: 24px 20px 44px; gap: 20px; } }
        @media(min-width:600px){ .md-hero-inner { padding: 32px 24px 48px; gap: 28px; flex-wrap:nowrap; } }
        @media(min-width:900px){ .md-hero-inner { padding: 44px 40px 56px; gap: 40px; } }

        /* Poster — taller, more cinematic */
        .md-poster {
          flex-shrink: 0;
          width: clamp(90px, 22vw, 220px);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,.6), 0 24px 64px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.1);
          background: #1a1a1a;
        }
        @media(max-width:480px){ .md-poster { width: 80px; border-radius:8px; } }
        .md-poster img { width: 100%; display: block; }
        .md-poster-ph {
          aspect-ratio: 2/3;
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: rgba(255,255,255,.2);
        }

        /* Info column */
        .md-info { flex:1; min-width:0; padding-top:2px; }
        .md-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
        .md-tag {
          font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em;
          padding:3px 9px; border-radius:20px;
          background:rgba(201,151,58,.14); border:1px solid rgba(201,151,58,.35); color:#c9973a;
        }
        .md-tag-outline {
          font-size:.62rem; font-weight:600;
          padding:3px 9px; border-radius:20px;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.7);
        }
        .md-title {
          font-family:'Playfair Display',serif;
          font-size:clamp(1.2rem,5vw,2.8rem);
          font-weight:900; line-height:1.08; margin:0 0 8px;
          color:#fff; text-shadow:0 2px 20px rgba(0,0,0,.5);
        }
        .md-score-row {
          display:flex; align-items:center; flex-wrap:wrap; gap:6px 10px; margin-bottom:10px;
        }
        .md-rating { display:flex; align-items:center; gap:5px; }
        .md-rating-num { color:#c9973a; font-size:1.1rem; font-weight:800; }
        .md-rating-stars { color:#c9973a; font-size:.82rem; }
        .md-rating-cnt { color:rgba(255,255,255,.4); font-size:.72rem; }
        .md-verdict-badge {
          font-size:.64rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em;
          padding:4px 12px; border-radius:4px;
        }
        .md-meta-row {
          display:flex; flex-wrap:wrap; gap:4px 12px;
          font-size:clamp(.7rem,2.5vw,.78rem); color:rgba(255,255,255,.55);
          margin-bottom:10px; align-items:center;
        }
        .md-meta-row span { display:flex; align-items:center; gap:4px; }
        .md-synopsis {
          font-size:clamp(.8rem,2.5vw,.88rem); color:rgba(255,255,255,.68);
          line-height:1.65; margin:0 0 14px;
          max-width:620px;
          display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
        }
        @media(min-width:480px){ .md-synopsis { -webkit-line-clamp:4; } }
        @media(min-width:768px){ .md-synopsis { -webkit-line-clamp:5; } }
        .md-actions { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
        @media(max-width:480px){ .md-actions .md-btn-play { font-size:.78rem; padding:8px 14px; } .md-actions .md-btn-outline,.md-actions .md-wl-btn { font-size:.74rem; padding:7px 11px; } }
        .md-btn-play {
          display:inline-flex; align-items:center; gap:7px;
          background:#c9973a; color:#000; border:none;
          padding:10px 20px; border-radius:8px;
          font-size:.84rem; font-weight:800; cursor:pointer;
          transition:opacity .18s;
        }
        .md-btn-play:hover { opacity:.88; }
        .md-btn-outline {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,.09); color:#f1f1f1;
          border:1px solid rgba(255,255,255,.2);
          padding:10px 16px; border-radius:8px;
          font-size:.82rem; font-weight:600; cursor:pointer;
          transition:background .18s;
        }
        .md-btn-outline:hover { background:rgba(255,255,255,.15); }

        /* Box office chips row */
        .md-bo-row {
          display:flex; gap:10px; flex-wrap:wrap;
          padding:8px 12px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          border-radius:8px; width:fit-content; max-width:100%;
        }
        .md-bo-item { }
        .md-bo-label { font-size:.58rem; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; font-weight:700; margin-bottom:2px; }
        .md-bo-val   { font-size:.84rem; font-weight:800; color:#c9973a; }

        /* ── Sticky tabs ── */
        .md-tabs-bar {
          position:sticky; top:58px; z-index:20;
          background:rgba(15,15,15,.97);
          backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(255,255,255,.08);
          overflow-x:auto; scrollbar-width:none;
        }
        .md-tabs-bar::-webkit-scrollbar { display:none; }
        .md-tabs-inner {
          display:flex; padding:0 10px;
          min-width:max-content;
          -webkit-overflow-scrolling:touch;
        }
        @media(min-width:480px){ .md-tabs-inner { padding:0 14px; } }
        @media(min-width:600px){ .md-tabs-inner { padding:0 24px; } }
        @media(min-width:900px){ .md-tabs-inner { padding:0 40px; } }
        .md-tab {
          padding:11px 11px;
          background:none; border:none; cursor:pointer;
          font-weight:700; font-size:.78rem;
          color:rgba(255,255,255,.45);
          border-bottom:2px solid transparent;
          white-space:nowrap; transition:all .18s;
          flex-shrink:0;
        }
        @media(min-width:480px){ .md-tab { padding:12px 14px; font-size:.78rem; } }
        @media(min-width:600px){ .md-tab { padding:13px 18px; font-size:.8rem; } }
        .md-tab.on { color:#c9973a; border-bottom-color:#c9973a; }
        .md-tab:hover:not(.on) { color:#f1f1f1; }

        /* ── Tab body ── */
        .md-body {
          max-width:1200px; margin:0 auto;
          padding:24px 16px 60px;
          background:#0f0f0f;
        }
        @media(min-width:600px){ .md-body { padding:28px 24px 60px; } }
        @media(min-width:900px){ .md-body { padding:32px 40px 60px; } }

        /* Section heading inside tabs */
        .md-sec-label {
          font-size:.66rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.1em; color:rgba(255,255,255,.38);
          margin:0 0 12px;
        }

        /* Crew pill */
        .md-crew-pill {
          display:inline-flex; align-items:center; gap:8px;
          background:#1a1a1a; border:1px solid rgba(255,255,255,.09);
          border-radius:8px; padding:7px 12px; cursor:pointer;
          transition:border-color .16s;
        }
        .md-crew-pill:hover { border-color:rgba(201,151,58,.45); }
        .md-crew-av {
          width:28px; height:28px; border-radius:50%; overflow:hidden;
          background:#272727; display:flex; align-items:center; justify-content:center;
          font-size:.8rem; flex-shrink:0;
        }
        .md-crew-av img { width:100%; height:100%; object-fit:cover; }
        .md-crew-name { font-size:.78rem; font-weight:700; line-height:1.2; color:#f1f1f1; }
        .md-crew-role { font-size:.6rem; color:#c9973a; font-weight:600; }

        /* Actor circle */
        .md-actor {
          flex-shrink:0; width:72px; text-align:center; cursor:pointer;
        }
        .md-actor-av {
          width:56px; height:56px; border-radius:50%; overflow:hidden;
          background:#272727; margin:0 auto 5px;
          border:2px solid rgba(255,255,255,.1);
          display:flex; align-items:center; justify-content:center;
          font-size:1.3rem; transition:border-color .16s;
        }
        @media(min-width:480px){ .md-actor-av { width:64px; height:64px; } }
        .md-actor-av img { width:100%; height:100%; object-fit:cover; }
        .md-actor-name { font-size:.66rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-actor-role { font-size:.58rem; color:#c9973a; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Song card */
        .md-song {
          flex-shrink:0; width:160px; cursor:pointer;
          border-radius:10px; overflow:hidden;
          background:#1a1a1a; border:1px solid rgba(255,255,255,.08);
          transition:all .2s; box-shadow:0 2px 8px rgba(0,0,0,.3);
        }
        .md-song:hover { border-color:#c9973a; transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.5); }
        .md-song-thumb {
          width:100%; aspect-ratio:16/9; background:#272727;
          position:relative; overflow:hidden;
        }
        .md-song-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s; }
        .md-song:hover .md-song-thumb img { transform:scale(1.05); }
        .md-song-icon {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,.3); font-size:1.5rem; transition:opacity .2s;
        }
        .md-song:hover .md-song-icon { background:rgba(0,0,0,.5); }
        .md-song-icon::after { content:"▶"; position:absolute; width:32px; height:32px; border-radius:50%; background:rgba(201,151,58,.9); display:flex; align-items:center; justify-content:center; font-size:.75rem; color:#000; opacity:0; transition:opacity .2s; }
        .md-song:hover .md-song-icon::after { opacity:1; }
        .md-song-info { padding:8px 10px; }
        .md-song-title { font-size:.76rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-song-singer { font-size:.65rem; color:#c9973a; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Cast full grid */
        .md-cast-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
          gap:10px;
        }
        @media(min-width:480px){ .md-cast-grid { grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px; } }
        .md-cast-card {
          background:#1a1a1a; border:1px solid rgba(255,255,255,.08);
          border-radius:10px; overflow:hidden; cursor:pointer;
          transition:border-color .16s;
        }
        .md-cast-card:hover { border-color:rgba(201,151,58,.4); }
        .md-cast-img {
          width:100%; aspect-ratio:3/4; background:#272727;
          display:flex; align-items:center; justify-content:center;
          font-size:2.5rem; overflow:hidden; position:relative;
        }
        .md-cast-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:top; }
        .md-cast-meta { padding:8px 10px; }
        .md-cast-cname { font-size:.78rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-cast-type  { font-size:.64rem; color:#c9973a; margin-top:2px; font-weight:600; }
        .md-cast-role  { font-size:.62rem; color:rgba(255,255,255,.4); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Box office table */
        .md-bo-table { width:100%; border-collapse:collapse; }
        .md-bo-table td { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,.06); font-size:.85rem; }
        .md-bo-table td:first-child { color:rgba(255,255,255,.45); font-size:.72rem; text-transform:uppercase; letter-spacing:.07em; font-weight:700; width:140px; }
        .md-bo-table td:last-child { color:#f1f1f1; font-weight:600; }

        /* Scroll rows */
        .md-hscroll { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
        .md-hscroll::-webkit-scrollbar { display:none; }
        @media(min-width:480px){ .md-hscroll { gap:12px; } }

        /* Trailer embed */
        .md-trailer { width:100%; max-width:720px; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#000; }
        .md-trailer iframe { width:100%; height:100%; border:none; display:block; }

        /* Divider */
        .md-divider { border:none; border-top:1px solid rgba(255,255,255,.07); margin:24px 0; }

        /* Production chip */
        .md-prod-chip {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12);
          border-radius:20px; padding:5px 12px;
          font-size:.73rem; font-weight:600; color:rgba(255,255,255,.7);
          text-decoration:none; transition:border-color .16s;
        }
        .md-prod-chip:hover { border-color:rgba(201,151,58,.45); color:#c9973a; }

        /* Empty */
        .md-empty { text-align:center; padding:48px 20px; color:rgba(255,255,255,.3); }
        .md-empty p { font-size:.84rem; margin:8px 0 0; }

        /* Sticky mini-header */
        .md-mini-header {
          position:fixed; top:58px; left:0; right:0; z-index:50;
          background:rgba(10,10,10,.97); backdrop-filter:blur(16px);
          border-bottom:1px solid rgba(255,255,255,.08);
          display:flex; align-items:center; gap:8px; padding:7px 14px;
          transform:translateY(-100%); transition:transform .3s ease;
          overflow:hidden;
        }
        @media(min-width:480px){ .md-mini-header { gap:12px; padding:8px 20px; } }
        .md-mini-header.visible { transform:translateY(0); }
        .md-mini-poster { width:32px; height:44px; border-radius:4px; object-fit:cover; flex-shrink:0; }
        .md-mini-title { font-weight:700; font-size:.88rem; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .md-mini-verdict { font-size:.62rem; font-weight:800; padding:2px 8px; border-radius:4px; flex-shrink:0; }

        /* Watchlist / Share buttons */
        .md-wl-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:8px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.06); color:#f1f1f1; font-size:.82rem; font-weight:600; cursor:pointer; transition:all .18s; font-family:inherit; }
        .md-wl-btn:hover { background:rgba(255,255,255,.12); }
        .md-wl-btn.active { background:rgba(201,151,58,.15); border-color:rgba(201,151,58,.5); color:#c9973a; }

        /* Popularity badge */
        .md-pop-badge { display:inline-flex; align-items:center; gap:5px; font-size:.7rem; color:rgba(255,150,80,.85); background:rgba(255,120,50,.08); border:1px solid rgba(255,120,50,.2); padding:3px 9px; border-radius:20px; }

        /* Verdict pulse for blockbuster */
        @keyframes md-pulse { 0%,100%{box-shadow:0 0 0 0 currentColor} 50%{box-shadow:0 0 0 6px transparent} }
        .verdict-blockbuster-pulse { animation:md-pulse 2.2s infinite; }

        /* Seen poll */
        .md-poll { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .md-poll-btn { padding:7px 16px; border-radius:20px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.05); color:rgba(255,255,255,.7); font-size:.78rem; font-weight:600; cursor:pointer; transition:all .18s; font-family:inherit; }
        .md-poll-btn:hover { background:rgba(201,151,58,.12); border-color:rgba(201,151,58,.4); color:#c9973a; }
        .md-poll-btn.selected { background:rgba(201,151,58,.18); border-color:#c9973a; color:#c9973a; }

        /* Song preview cards in overview */
        .md-song-preview { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#1a1a1a; border:1px solid rgba(255,255,255,.07); border-radius:8px; cursor:pointer; transition:border-color .15s; }
        .md-song-preview:hover { border-color:rgba(201,151,58,.4); }
        .md-song-thumb { width:54px; height:36px; border-radius:5px; overflow:hidden; background:#272727; position:relative; flex-shrink:0; }
        .md-song-thumb img { width:100%;height:100%;object-fit:cover; }
        .md-song-play-icon { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);font-size:.85rem; }

        /* Cast hover card */
        .md-cast-card { position:relative; }
        .md-cast-hover { display:none; position:absolute; bottom:calc(100%+8px); left:50%; transform:translateX(-50%); z-index:30; background:#1e1e1e; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:12px 14px; width:200px; box-shadow:0 8px 30px rgba(0,0,0,.6); }
        .md-cast-card:hover .md-cast-hover { display:block; }

        /* ── Review System ── */
        .md-rv-avatar { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1rem; flex-shrink:0; color:#000; box-shadow:0 2px 8px rgba(0,0,0,.4); }
        .md-rv-form { background:linear-gradient(135deg,rgba(30,25,10,.9),rgba(20,20,20,.9)); border:1px solid rgba(201,151,58,.2); border-radius:16px; padding:16px; margin-bottom:20px; }
        @media(min-width:480px){ .md-rv-form { padding:22px 24px; } }
        .md-rv-form-title { font-size:1rem; font-weight:800; margin:0 0 4px; }
        .md-rv-form-sub { font-size:.74rem; color:rgba(255,255,255,.4); margin:0 0 20px; }
        .md-rv-stars { display:flex; gap:6px; margin-bottom:16px; }
        .md-rv-star { font-size:2rem; cursor:pointer; transition:transform .15s; filter:grayscale(1) opacity(.3); user-select:none; line-height:1; }
        .md-rv-star.lit { filter:none; }
        .md-rv-star:hover { transform:scale(1.2); }
        .md-rv-star-label { font-size:.78rem; color:rgba(255,255,255,.5); margin-left:4px; align-self:center; }
        .md-rv-input { width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:10px; color:#f1f1f1; font-family:inherit; font-size:.86rem; padding:10px 14px; transition:border-color .2s; outline:none; box-sizing:border-box; }
        .md-rv-input:focus { border-color:rgba(201,151,58,.5); background:rgba(255,255,255,.08); }
        .md-rv-textarea { resize:vertical; min-height:100px; line-height:1.65; }
        .md-rv-char { font-size:.66rem; color:rgba(255,255,255,.3); text-align:right; margin-top:4px; }
        .md-rv-error { background:rgba(255,80,80,.1); border:1px solid rgba(255,80,80,.3); border-radius:8px; padding:8px 12px; font-size:.78rem; color:#ff9090; margin-bottom:12px; }
        .md-rv-success { background:rgba(80,200,120,.1); border:1px solid rgba(80,200,120,.3); border-radius:8px; padding:12px 16px; font-size:.84rem; color:#80e8a8; text-align:center; }
        .md-rv-submit { width:100%; padding:12px; border-radius:10px; background:linear-gradient(135deg,#c9973a,#a87830); border:none; color:#000; font-weight:800; font-size:.88rem; cursor:pointer; transition:opacity .18s; font-family:inherit; }
        .md-rv-submit:hover:not(:disabled) { opacity:.88; }
        .md-rv-submit:disabled { opacity:.5; cursor:default; }
        /* Summary bar */
        .md-rv-summary { display:flex; align-items:center; gap:20px; padding:18px 20px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:14px; margin-bottom:24px; flex-wrap:wrap; }
        .md-rv-big-score { font-size:3rem; font-weight:900; color:#c9973a; line-height:1; }
        .md-rv-bars { flex:1; min-width:180px; display:flex; flex-direction:column; gap:5px; }
        .md-rv-bar-row { display:flex; align-items:center; gap:8px; }
        .md-rv-bar-label { font-size:.66rem; color:rgba(255,255,255,.45); width:28px; text-align:right; flex-shrink:0; }
        .md-rv-bar-track { flex:1; height:6px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden; }
        .md-rv-bar-fill { height:100%; background:linear-gradient(to right,#c9973a,#e8c87a); border-radius:3px; transition:width .6s ease; }
        .md-rv-bar-count { font-size:.64rem; color:rgba(255,255,255,.3); width:20px; flex-shrink:0; }
        /* Review cards */
        .md-rv-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:14px; padding:16px 18px; margin-bottom:12px; transition:border-color .15s; }
        .md-rv-card:hover { border-color:rgba(255,255,255,.12); }
        .md-rv-card-header { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .md-rv-card-meta { flex:1; min-width:0; }
        .md-rv-card-name { font-weight:700; font-size:.88rem; }
        .md-rv-card-date { font-size:.66rem; color:rgba(255,255,255,.35); margin-top:2px; }
        .md-rv-card-stars { display:flex; gap:2px; margin-bottom:8px; }
        .md-rv-card-star { font-size:.88rem; }
        .md-rv-card-text { font-size:.84rem; line-height:1.72; color:rgba(255,255,255,.75); margin:0; }
        .md-rv-helpful { font-size:.7rem; color:rgba(255,255,255,.3); margin-top:10px; cursor:pointer; transition:color .15s; display:inline-flex; align-items:center; gap:4px; }
        .md-rv-helpful:hover { color:rgba(201,151,58,.8); }

        /* Genre color coding */
        .genre-action .md-hero-bg { filter:blur(0px) brightness(.32) saturate(1.6) hue-rotate(-10deg); }
        .genre-romance .md-hero-bg { filter:blur(0px) brightness(.32) saturate(1.4) hue-rotate(300deg); }
        .genre-horror .md-hero-bg { filter:blur(0px) brightness(.2) saturate(.8); }

        /* Skeleton shimmer */
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton-shimmer { background:linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%); background-size:800px 100%; animation:shimmer 1.6s infinite; border-radius:8px; }

        /* Hero rating strip */
        .md-hero-rating-strip {
          display:flex; flex-direction:column; gap:10px;
          padding:12px 14px;
          background:rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.1);
          border-radius:14px; backdrop-filter:blur(14px);
          width:200px;
          position:absolute; bottom:36px; right:14px; z-index:4;
        }
        @media(max-width:600px){
          .md-hero-rating-strip {
            position:static; width:100%;
            /* On mobile: full width row below poster+info */
            order:3; flex-basis:100%;
          }
        }
        .md-hero-avg { font-size:2rem; font-weight:900; color:#c9973a; line-height:1; flex-shrink:0; }
        .md-hero-bars { display:flex; flex-direction:column; gap:3px; flex-shrink:0; min-width:100px; }
        .md-hero-bar-row { display:flex; align-items:center; gap:5px; }
        .md-hero-bar-lbl { font-size:.56rem; color:rgba(255,255,255,.4); width:16px; text-align:right; flex-shrink:0; }
        .md-hero-bar-track { width:80px; height:4px; background:rgba(255,255,255,.1); border-radius:2px; overflow:hidden; }
        .md-hero-bar-fill { height:100%; background:#c9973a; border-radius:2px; transition:width .5s ease; }
        /* Quick rate widget in hero */
        .md-hero-quick-rate { }  /* stacked layout — no border needed */
        .md-hero-quick-lbl { font-size:.62rem; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
        .md-hero-stars { display:flex; gap:4px; }
        .md-hero-star { font-size:1.4rem; cursor:pointer; filter:grayscale(1) opacity(.35); transition:all .15s; user-select:none; }
        .md-hero-star.lit { filter:none; }
        .md-hero-star:hover { transform:scale(1.22); filter:none; }
        .md-hero-rate-feedback { font-size:.68rem; margin-top:4px; color:rgba(201,151,58,.85); min-height:16px; transition:opacity .3s; }

        /* Countdown in right panel */
        .md-cd-section { border-bottom:1px solid rgba(255,255,255,.08); padding-bottom:10px; margin-bottom:10px; }
        .md-cd-label { font-size:.58rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.35); margin-bottom:4px; display:flex; align-items:center; gap:5px; }

        /* Share overlay */
        .md-share-overlay { position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(8px); }
        .md-share-card { background:linear-gradient(145deg,#1a1200,#0f0a00,#0a0a0a);border:1px solid rgba(201,151,58,.4);border-radius:20px;width:100%;max-width:360px;overflow:hidden; }
      ` }),
    /* @__PURE__ */ jsxs("div", { className: "md-hero", ref: heroRef, children: [
      bannerImg && /* @__PURE__ */ jsx("div", { className: "md-hero-bg", style: { backgroundImage: `url(${bannerImg})` } }),
      /* @__PURE__ */ jsx("div", { className: "md-hero-overlay" }),
      /* @__PURE__ */ jsxs("div", { className: "md-hero-inner", children: [
        /* @__PURE__ */ jsx("div", { className: "md-poster", children: movie.posterUrl ? /* @__PURE__ */ jsx(
          "img",
          {
            src: movie.posterUrl,
            alt: movie.title,
            loading: "eager",
            decoding: "async",
            onError: (e) => e.target.style.display = "none"
          }
        ) : /* @__PURE__ */ jsx("div", { className: "md-poster-ph", children: "🎬" }) }),
        /* @__PURE__ */ jsxs("div", { className: "md-info", children: [
          /* @__PURE__ */ jsx(Link, { to: "/movies", style: { fontSize: ".74rem", color: "rgba(255,255,255,.38)", textDecoration: "none", display: "inline-block", marginBottom: 18, letterSpacing: ".01em" }, children: "← All Films" }),
          /* @__PURE__ */ jsxs("div", { className: "md-tags", children: [
            /* @__PURE__ */ jsx("span", { className: "md-tag", children: movie.category || "Feature Film" }),
            movie.language && /* @__PURE__ */ jsx("span", { className: "md-tag-outline", children: movie.language }),
            (_n = movie.genre) == null ? void 0 : _n.slice(0, 3).map((g) => /* @__PURE__ */ jsx("span", { className: "md-tag-outline", children: g }, g))
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "md-title", children: movie.title }),
          /* @__PURE__ */ jsx("div", { className: "md-score-row", children: /* @__PURE__ */ jsx("span", { className: "md-verdict-badge", style: {
            background: `${verdictColor2}25`,
            border: `1.5px solid ${verdictColor2}`,
            color: verdictColor2
          }, children: movie.verdict || "Upcoming" }) }),
          /* @__PURE__ */ jsxs("div", { className: "md-meta-row", children: [
            movie.director && /* @__PURE__ */ jsxs("span", { children: [
              "🎬 ",
              movie.director
            ] }),
            (movie.releaseDate || movie.releaseTBA) && /* @__PURE__ */ jsxs("span", { children: [
              "🗓 ",
              movie.releaseTBA ? "TBA" : fmtDate$4(movie.releaseDate)
            ] }),
            movie.runtime && /* @__PURE__ */ jsxs("span", { children: [
              "⏱ ",
              movie.runtime
            ] }),
            movie.budget && /* @__PURE__ */ jsxs("span", { children: [
              "💰 ",
              movie.budget
            ] }),
            movie.imdbRating && /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#f5c518", fontWeight: 700, fontSize: ".7rem" }, children: "IMDb" }),
              " ",
              movie.imdbRating
            ] })
          ] }),
          movie.synopsis && /* @__PURE__ */ jsx("p", { className: "md-synopsis", children: movie.synopsis }),
          /* @__PURE__ */ jsxs("div", { className: "md-actions", children: [
            ((_p = (_o = movie.media) == null ? void 0 : _o.trailer) == null ? void 0 : _p.ytId) && /* @__PURE__ */ jsx(
              "button",
              {
                className: "md-btn-play",
                style: { ...isBlockbuster ? { boxShadow: `0 0 0 0 ${verdictColor2}` } : {} },
                className: `md-btn-play${isBlockbuster ? " verdict-blockbuster-pulse" : ""}`,
                onClick: () => {
                  setTab("overview");
                  setTimeout(() => {
                    var _a2;
                    return (_a2 = trailerRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 200);
                },
                children: "▶ Watch Trailer"
              }
            ),
            /* @__PURE__ */ jsx("button", { className: "md-btn-outline", onClick: () => setTab("cast"), children: "👥 Cast" }),
            /* @__PURE__ */ jsx("button", { className: "md-btn-outline", onClick: () => setTab("media"), children: "🎵 Songs" }),
            /* @__PURE__ */ jsx("button", { className: `md-wl-btn${watchlisted ? " active" : ""}`, onClick: toggleWatchlist, children: watchlisted ? "✓ Watchlist" : "＋ Watchlist" }),
            /* @__PURE__ */ jsx("button", { className: "md-wl-btn", onClick: handleShare, children: "📤 Share" }),
            isOwner && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => {
              setEditing(true);
              setTab("overview");
            }, children: "✏ Edit" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }, children: [
            /* @__PURE__ */ jsxs("span", { className: "md-pop-badge", children: [
              "🔥 ",
              viewCount >= 1e3 ? (viewCount / 1e3).toFixed(1) + "K" : viewCount,
              " views"
            ] }),
            !seenPoll ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".74rem", color: "rgba(255,255,255,.4)" }, children: "Have you seen this?" }),
              /* @__PURE__ */ jsx("button", { className: "md-poll-btn", onClick: () => voteSeen("yes"), children: "👍 Yes" }),
              /* @__PURE__ */ jsx("button", { className: "md-poll-btn", onClick: () => voteSeen("no"), children: "👀 Not yet" }),
              /* @__PURE__ */ jsx("button", { className: "md-poll-btn", onClick: () => voteSeen("watching"), children: "📺 Watching" })
            ] }) : /* @__PURE__ */ jsx("span", { style: { fontSize: ".76rem", color: "rgba(201,151,58,.8)" }, children: seenPoll === "yes" ? "✓ You've seen this!" : seenPoll === "watching" ? "📺 Currently watching" : "👀 Added to your list!" })
          ] }),
          (movie.productionId || (movie.collaborators || []).length > 0) && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }, children: [
            movie.productionId && /* @__PURE__ */ jsxs(Link, { to: `/production/${movie.productionId._id || movie.productionId}`, className: "md-prod-chip", children: [
              movie.productionId.logo && /* @__PURE__ */ jsx(SafeImg$2, { src: movie.productionId.logo, alt: "", style: { width: 15, height: 15, borderRadius: 3, objectFit: "cover" } }),
              movie.productionId.name
            ] }),
            (movie.collaborators || []).map((c) => /* @__PURE__ */ jsxs(Link, { to: `/production/${c._id || c}`, className: "md-prod-chip", children: [
              c.logo && /* @__PURE__ */ jsx(SafeImg$2, { src: c.logo, alt: "", style: { width: 15, height: 15, borderRadius: 3, objectFit: "cover" } }),
              c.name
            ] }, c._id || c))
          ] }),
          (((_q = movie.boxOffice) == null ? void 0 : _q.opening) || ((_r = movie.boxOffice) == null ? void 0 : _r.firstWeek) || ((_s = movie.boxOffice) == null ? void 0 : _s.total)) && /* @__PURE__ */ jsxs("div", { className: "md-bo-row", children: [
            movie.boxOffice.opening && /* @__PURE__ */ jsxs("div", { className: "md-bo-item", children: [
              /* @__PURE__ */ jsx("div", { className: "md-bo-label", children: "Opening" }),
              /* @__PURE__ */ jsx("div", { className: "md-bo-val", children: movie.boxOffice.opening })
            ] }),
            movie.boxOffice.firstWeek && /* @__PURE__ */ jsxs("div", { className: "md-bo-item", children: [
              /* @__PURE__ */ jsx("div", { className: "md-bo-label", children: "First Week" }),
              /* @__PURE__ */ jsx("div", { className: "md-bo-val", children: movie.boxOffice.firstWeek })
            ] }),
            movie.boxOffice.total && /* @__PURE__ */ jsxs("div", { className: "md-bo-item", children: [
              /* @__PURE__ */ jsx("div", { className: "md-bo-label", children: "Total" }),
              /* @__PURE__ */ jsx("div", { className: "md-bo-val", children: movie.boxOffice.total })
            ] })
          ] })
        ] }),
        (() => {
          const reviews = movie.reviews || [];
          const total = reviews.length;
          const avg = total ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(1) : null;
          const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
          return /* @__PURE__ */ jsxs("div", { className: "md-hero-rating-strip", children: [
            movie.verdict === "Upcoming" && movie.releaseDate && (() => {
              const diff = new Date(movie.releaseDate) - /* @__PURE__ */ new Date();
              return diff > 0 ? /* @__PURE__ */ jsxs("div", { className: "md-cd-section", children: [
                /* @__PURE__ */ jsx("div", { className: "md-cd-label", children: "🗓 Releasing in" }),
                /* @__PURE__ */ jsx(CountdownDisplay, { releaseDate: movie.releaseDate })
              ] }) : null;
            })(),
            avg && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { flexShrink: 0, textAlign: "center" }, children: [
                /* @__PURE__ */ jsx("div", { className: "md-hero-avg", children: avg }),
                /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 1, justifyContent: "center", marginTop: 2 }, children: [1, 2, 3, 4, 5].map((s) => /* @__PURE__ */ jsx("span", { style: { fontSize: ".6rem", filter: parseFloat(avg) >= s ? "none" : "grayscale(1) opacity(.25)" }, children: "⭐" }, s)) }),
                /* @__PURE__ */ jsxs("div", { style: { fontSize: ".56rem", color: "rgba(255,255,255,.35)", marginTop: 2, whiteSpace: "nowrap" }, children: [
                  total,
                  " review",
                  total !== 1 ? "s" : ""
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "md-hero-bars", style: { flex: 1 }, children: dist.map(({ n, count }) => /* @__PURE__ */ jsxs("div", { className: "md-hero-bar-row", children: [
                /* @__PURE__ */ jsxs("span", { className: "md-hero-bar-lbl", children: [
                  n,
                  "★"
                ] }),
                /* @__PURE__ */ jsx("div", { className: "md-hero-bar-track", style: { flex: 1 }, children: /* @__PURE__ */ jsx("div", { className: "md-hero-bar-fill", style: { width: `${total ? Math.round(count / total * 100) : 0}%` } }) })
              ] }, n)) })
            ] }),
            avg && /* @__PURE__ */ jsx("div", { style: { borderTop: "1px solid rgba(255,255,255,.08)" } }),
            /* @__PURE__ */ jsx(InterestedWidget, { movieId: id }),
            movie.verdict !== "Upcoming" && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { style: { borderTop: "1px solid rgba(255,255,255,.08)", margin: "8px 0" } }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "md-hero-quick-lbl", children: heroRating ? "Your rating" : "Rate this film" }),
                /* @__PURE__ */ jsx("div", { className: "md-hero-stars", children: [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `md-hero-star${(heroHover || heroRating) >= star ? " lit" : ""}`,
                    onMouseEnter: () => setHeroHover(star),
                    onMouseLeave: () => setHeroHover(0),
                    onClick: () => handleHeroRate(star),
                    children: "⭐"
                  },
                  star
                )) }),
                (heroFeedback || heroRating > 0) && /* @__PURE__ */ jsx("div", { className: "md-hero-rate-feedback", children: heroFeedback || ["", "Terrible 😞", "Poor 😕", "Average 😐", "Good 😊", "Excellent 🤩"][heroRating] }),
                heroRating > 0 && /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setTab("reviews"),
                    style: { fontSize: ".64rem", background: "none", border: "none", color: "rgba(201,151,58,.7)", cursor: "pointer", padding: 0, marginTop: 4, textDecoration: "underline", fontFamily: "inherit", display: "block" },
                    children: "✍️ Write a full review →"
                  }
                )
              ] })
            ] })
          ] });
        })()
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "md-tabs-bar", children: /* @__PURE__ */ jsx("div", { className: "md-tabs-inner", children: ["overview", "cast", "media", "boxoffice", "news", "reviews"].map((t) => {
      var _a2, _b2;
      return /* @__PURE__ */ jsxs(
        "button",
        {
          className: `md-tab${tab === t ? " on" : ""}`,
          onClick: () => {
            setTab(t);
            setEditing(false);
            setEditBO(false);
          },
          children: [
            t === "boxoffice" ? "Box Office" : t.charAt(0).toUpperCase() + t.slice(1),
            t === "reviews" && ((_a2 = movie.reviews) == null ? void 0 : _a2.length) ? ` (${movie.reviews.length})` : "",
            t === "news" && ((_b2 = movie.news) == null ? void 0 : _b2.length) ? ` (${movie.news.length})` : ""
          ]
        },
        t
      );
    }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "md-body", children: [
      tab === "overview" && !editing && /* @__PURE__ */ jsxs("div", { style: { maxWidth: 860 }, children: [
        movie.synopsis ? /* @__PURE__ */ jsx("p", { style: { color: "rgba(255,255,255,.7)", lineHeight: 1.8, fontSize: "clamp(.86rem,2vw,.96rem)", marginBottom: 28 }, children: movie.synopsis }) : /* @__PURE__ */ jsx("p", { style: { color: "rgba(255,255,255,.35)" }, children: "No synopsis available." }),
        crew.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 24 }, children: [
          /* @__PURE__ */ jsx("p", { className: "md-sec-label", children: "Director & Crew" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: crew.slice(0, 8).map((c, i) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "md-crew-pill",
              onClick: () => c.castId && navigate(castPath({ _id: c.castId, name: c.name })),
              children: [
                /* @__PURE__ */ jsx("div", { className: "md-crew-av", children: c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, loading: "lazy", onError: (e) => e.target.style.display = "none" }) : "👤" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "md-crew-name", children: c.name }),
                  /* @__PURE__ */ jsxs("div", { className: "md-crew-role", children: [
                    c.type,
                    c.role ? ` · ${c.role}` : ""
                  ] })
                ] })
              ]
            },
            c.castId || i
          )) })
        ] }),
        actors.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, children: [
            /* @__PURE__ */ jsx("p", { className: "md-sec-label", style: { margin: 0 }, children: "Cast" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: ".7rem" }, onClick: () => setTab("cast"), children: "See all →" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md-hscroll", children: [
            actors.slice(0, 14).map((c, i) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "md-actor",
                onClick: () => c.castId && navigate(castPath({ _id: c.castId, name: c.name })),
                onMouseEnter: (e) => e.currentTarget.querySelector(".md-actor-av").style.borderColor = "#c9973a",
                onMouseLeave: (e) => e.currentTarget.querySelector(".md-actor-av").style.borderColor = "rgba(255,255,255,.1)",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "md-actor-av", children: c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, loading: "lazy", onError: (e) => e.target.style.display = "none" }) : "👤" }),
                  /* @__PURE__ */ jsx("div", { className: "md-actor-name", children: c.name }),
                  c.role && /* @__PURE__ */ jsx("div", { className: "md-actor-role", children: c.role })
                ]
              },
              c.castId || i
            )),
            actors.length > 14 && /* @__PURE__ */ jsxs("div", { className: "md-actor", onClick: () => setTab("cast"), style: { cursor: "pointer" }, children: [
              /* @__PURE__ */ jsxs("div", { className: "md-actor-av", style: { borderStyle: "dashed", borderColor: "#c9973a", background: "rgba(201,151,58,.08)", color: "#c9973a", fontSize: "1rem" }, children: [
                "+",
                actors.length - 14
              ] }),
              /* @__PURE__ */ jsx("div", { className: "md-actor-name", style: { color: "#c9973a" }, children: "more" })
            ] })
          ] })
        ] }),
        (((_t = movie.media) == null ? void 0 : _t.songs) || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, children: [
            /* @__PURE__ */ jsxs("p", { className: "md-sec-label", style: { margin: 0 }, children: [
              "Songs · ",
              movie.media.songs.length
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: ".7rem" }, onClick: () => setTab("media"), children: "See all →" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "md-hscroll", children: movie.media.songs.slice(0, 8).map((s, i) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "md-song",
              onClick: () => navigate(movie ? songPath(movie, i) : `/song/${id}/${i}`),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "md-song-thumb", children: [
                  s.ytId && /* @__PURE__ */ jsx("img", { src: `https://img.youtube.com/vi/${s.ytId}/hqdefault.jpg`, alt: s.title, loading: "lazy", onError: (e) => {
                    e.target.src = `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`;
                  } }),
                  /* @__PURE__ */ jsx("div", { className: "md-song-icon", children: "♪" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "md-song-info", children: [
                  /* @__PURE__ */ jsx("div", { className: "md-song-title", children: s.title }),
                  s.singer && /* @__PURE__ */ jsx("div", { className: "md-song-singer", children: s.singer })
                ] })
              ]
            },
            i
          )) })
        ] }),
        ((_v = (_u = movie.media) == null ? void 0 : _u.trailer) == null ? void 0 : _v.ytId) && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
          /* @__PURE__ */ jsx("p", { className: "md-sec-label", children: "Official Trailer" }),
          /* @__PURE__ */ jsx("div", { ref: trailerRef, className: "md-trailer", children: /* @__PURE__ */ jsx(
            "iframe",
            {
              src: `https://www.youtube.com/embed/${movie.media.trailer.ytId}`,
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true,
              title: "Trailer"
            }
          ) })
        ] }),
        isOwner && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.07)" }, children: [
          /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setEditing(true), children: "✏ Edit Details" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", onClick: () => {
            setEditBO(true);
            setTab("boxoffice");
          }, children: "📊 Box Office" })
        ] })
      ] }),
      tab === "overview" && editing && /* @__PURE__ */ jsxs("div", { style: { maxWidth: 900 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }, children: [
          /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.45)" }, children: "Edit Movie Details" }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditing(false), children: "Cancel" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: saveEdit, disabled: savingEdit, children: savingEdit ? "Saving…" : "Save Changes" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Title" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.title || "", onChange: (e) => setE("title", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Language" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.language || "", onChange: (e) => setE("language", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Category" }),
            /* @__PURE__ */ jsx("select", { className: "form-select", value: editForm.category || "", onChange: (e) => setE("category", e.target.value), children: CATS$1.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Release Date" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", type: "date", value: editForm.releaseDate || "", onChange: (e) => setE("releaseDate", e.target.value), disabled: editForm.releaseTBA }),
            /* @__PURE__ */ jsxs("label", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer" }, children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: !!editForm.releaseTBA, onChange: (e) => setE("releaseTBA", e.target.checked) }),
              " TBA"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Director" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.director || "", onChange: (e) => setE("director", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Producer" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.producer || "", onChange: (e) => setE("producer", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Runtime" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.runtime || "", onChange: (e) => setE("runtime", e.target.value), placeholder: "e.g. 2h 15m" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "IMDb Rating" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.imdbRating || "", onChange: (e) => setE("imdbRating", e.target.value), placeholder: "7.5" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Poster URL" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.posterUrl || "", onChange: (e) => setE("posterUrl", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Verdict" }),
            /* @__PURE__ */ jsx("select", { className: "form-select", value: editForm.verdict || "Upcoming", onChange: (e) => setE("verdict", e.target.value), children: VDICT.map((v) => /* @__PURE__ */ jsx("option", { children: v }, v)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Genres" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: GENRES$2.map((g) => /* @__PURE__ */ jsx("button", { type: "button", className: `btn btn-sm ${(editForm.genre || []).includes(g) ? "btn-gold" : "btn-outline"}`, onClick: () => toggleGenre(g), children: g }, g)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Synopsis" }),
          /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: editForm.synopsis || "", onChange: (e) => setE("synopsis", e.target.value), style: { minHeight: 100 } })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Thumbnail URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.thumbnailUrl || "", onChange: (e) => setE("thumbnailUrl", e.target.value) })
        ] })
      ] }),
      tab === "cast" && /* @__PURE__ */ jsxs("div", { children: [
        isOwner && /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 20 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setAddCastModal(true), children: "+ Add Cast" }) }),
        (movie.cast || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, padding: "14px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.3rem", fontWeight: 800, color: "var(--gold)" }, children: actors.length }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".64rem", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em" }, children: "Actors" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.3rem", fontWeight: 800, color: "var(--gold)" }, children: crew.length }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".64rem", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em" }, children: "Crew" })
          ] }),
          movie.director && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".82rem", fontWeight: 700, color: "#f1f1f1" }, children: movie.director }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".64rem", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em" }, children: "Director" })
          ] })
        ] }),
        crew.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
          /* @__PURE__ */ jsx("p", { className: "md-sec-label", children: "Director & Crew" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: crew.map((c, i) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "md-crew-pill",
              onClick: () => c.castId && navigate(portalMode ? `/portal/cast/${c.castId}` : castPath({ _id: c.castId, name: c.name })),
              children: [
                /* @__PURE__ */ jsx("div", { className: "md-crew-av", children: c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, loading: "lazy", onError: (e) => e.target.style.display = "none" }) : "👤" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "md-crew-name", children: c.name }),
                  /* @__PURE__ */ jsxs("div", { className: "md-crew-role", children: [
                    c.type,
                    c.role ? ` · ${c.role}` : ""
                  ] })
                ] }),
                isOwner && /* @__PURE__ */ jsx("button", { style: { marginLeft: 8, background: "none", border: "none", color: "rgba(255,100,100,.6)", cursor: "pointer", fontSize: ".75rem" }, onClick: (e) => {
                  e.stopPropagation();
                  removeCast(c.castId);
                }, children: "✕" })
              ]
            },
            c.castId || i
          )) })
        ] }),
        actors.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "md-sec-label", children: "Actors & Actresses" }),
          /* @__PURE__ */ jsx("div", { className: "md-cast-grid", children: actors.map((c, i) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "md-cast-card",
              onClick: () => c.castId && navigate(portalMode ? `/portal/cast/${c.castId}` : castPath({ _id: c.castId, name: c.name })),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "md-cast-img", children: [
                  c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, loading: "lazy", onError: (e) => e.target.style.display = "none" }) : "👤",
                  isOwner && /* @__PURE__ */ jsx("button", { style: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", border: "none", color: "rgba(255,100,100,.8)", cursor: "pointer", borderRadius: 4, fontSize: ".72rem", padding: "2px 6px" }, onClick: (e) => {
                    e.stopPropagation();
                    removeCast(c.castId);
                  }, children: "✕" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "md-cast-meta", children: [
                  /* @__PURE__ */ jsx("div", { className: "md-cast-cname", children: c.name }),
                  /* @__PURE__ */ jsx("div", { className: "md-cast-type", children: c.type }),
                  c.role && /* @__PURE__ */ jsx("div", { className: "md-cast-role", children: c.role })
                ] })
              ]
            },
            c.castId || i
          )) })
        ] }),
        (movie.cast || []).length === 0 && /* @__PURE__ */ jsxs("div", { className: "md-empty", children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "2.5rem" }, children: "👤" }),
          /* @__PURE__ */ jsx("p", { children: "No cast added yet." })
        ] })
      ] }),
      tab === "media" && /* @__PURE__ */ jsxs("div", { children: [
        isOwner && /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }, children: [
          /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", onClick: () => setEditTrailer(true), children: "🎬 Edit Trailer" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setAddSongModal(true), children: "+ Add Song" })
        ] }),
        ((_x = (_w = movie.media) == null ? void 0 : _w.trailer) == null ? void 0 : _x.ytId) && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 36 }, children: [
          /* @__PURE__ */ jsx("p", { className: "md-sec-label", children: "Official Trailer" }),
          /* @__PURE__ */ jsx("div", { ref: trailerRef, className: "md-trailer", children: /* @__PURE__ */ jsx(
            "iframe",
            {
              src: `https://www.youtube.com/embed/${movie.media.trailer.ytId}`,
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true,
              title: "Trailer"
            }
          ) }),
          editTrailer && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("input", { className: "form-input", value: trailerInput, onChange: (e) => setTrailerInput(e.target.value), placeholder: "YouTube ID or URL", style: { flex: 1, minWidth: 200 } }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: saveTrailer, disabled: savingTrailer, children: savingTrailer ? "Saving…" : "Save" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditTrailer(false), children: "Cancel" })
          ] })
        ] }),
        (((_y = movie.media) == null ? void 0 : _y.songs) || []).length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "md-sec-label", children: [
            "Songs · ",
            movie.media.songs.length
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: movie.media.songs.map((s, i) => /* @__PURE__ */ jsxs(
            "div",
            {
              style: { display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, cursor: "pointer", transition: "border-color .16s" },
              onClick: () => navigate(movie ? songPath(movie, i) : `/song/${id}/${i}`),
              onMouseEnter: (e) => e.currentTarget.style.borderColor = "rgba(201,151,58,.4)",
              onMouseLeave: (e) => e.currentTarget.style.borderColor = "rgba(255,255,255,.07)",
              children: [
                /* @__PURE__ */ jsxs("div", { style: { flexShrink: 0, width: 60, height: 40, borderRadius: 5, overflow: "hidden", background: "#272727", position: "relative" }, children: [
                  s.ytId && /* @__PURE__ */ jsx("img", { src: `https://img.youtube.com/vi/${s.ytId}/hqdefault.jpg`, alt: s.title, style: { width: "100%", height: "100%", objectFit: "cover" }, loading: "lazy", onError: (e) => {
                    e.target.src = `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`;
                  } }),
                  /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.25)", fontSize: ".9rem" }, children: "♪" })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: ".82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#f1f1f1" }, children: s.title }),
                  s.singer && /* @__PURE__ */ jsx("div", { style: { fontSize: ".7rem", color: "#c9973a", marginTop: 2 }, children: s.singer }),
                  s.musicDirector && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".66rem", color: "rgba(255,255,255,.35)", marginTop: 1 }, children: [
                    "🎼 ",
                    s.musicDirector
                  ] })
                ] }),
                s.ytId && /* @__PURE__ */ jsx("a", { href: `https://youtube.com/watch?v=${s.ytId}`, target: "_blank", rel: "noreferrer", style: { fontSize: ".68rem", color: "#c9973a", fontWeight: 700, opacity: 0.7, padding: "4px 8px", flexShrink: 0 }, onClick: (e) => e.stopPropagation(), children: "YT↗" }),
                isOwner && /* @__PURE__ */ jsx("button", { style: { background: "none", border: "none", color: "rgba(255,100,100,.6)", cursor: "pointer", fontSize: ".75rem", padding: "4px 8px", flexShrink: 0 }, onClick: (e) => {
                  e.stopPropagation();
                  removeSong(i);
                }, children: "✕" })
              ]
            },
            i
          )) })
        ] }),
        !((_A = (_z = movie.media) == null ? void 0 : _z.trailer) == null ? void 0 : _A.ytId) && !((_C = (_B = movie.media) == null ? void 0 : _B.songs) == null ? void 0 : _C.length) && /* @__PURE__ */ jsxs("div", { className: "md-empty", children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "2.5rem" }, children: "🎵" }),
          /* @__PURE__ */ jsx("p", { children: "No media added yet." })
        ] })
      ] }),
      tab === "boxoffice" && !editBO && /* @__PURE__ */ jsxs("div", { style: { maxWidth: 600 }, children: [
        /* @__PURE__ */ jsx("table", { className: "md-bo-table", children: /* @__PURE__ */ jsx("tbody", { children: [["Opening Weekend", (_D = movie.boxOffice) == null ? void 0 : _D.opening], ["First Week", (_E = movie.boxOffice) == null ? void 0 : _E.firstWeek], ["Total Collection", (_F = movie.boxOffice) == null ? void 0 : _F.total], ["Budget", movie.budget], ["Verdict", movie.verdict]].map(([k, v]) => v ? /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: k }),
          /* @__PURE__ */ jsx("td", { children: v })
        ] }, k) : null) }) }),
        isOwner && /* @__PURE__ */ jsx("div", { style: { marginTop: 24 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", onClick: () => setEditBO(true), children: "✏ Update Box Office" }) })
      ] }),
      tab === "boxoffice" && editBO && /* @__PURE__ */ jsxs("div", { style: { maxWidth: 700 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }, children: [
          /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.45)" }, children: "Update Box Office" }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditBO(false), children: "Cancel" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: saveBO, disabled: savingBO, children: savingBO ? "Saving…" : "Save" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Opening Weekend" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: boForm.opening || "", onChange: (e) => setBo("opening", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "First Week" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: boForm.firstWeek || "", onChange: (e) => setBo("firstWeek", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Total Collection" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: boForm.total || "", onChange: (e) => setBo("total", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Verdict" }),
            /* @__PURE__ */ jsx("select", { className: "form-select", value: boForm.verdict || movie.verdict || "Upcoming", onChange: (e) => setBo("verdict", e.target.value), children: VDICT.map((v) => /* @__PURE__ */ jsx("option", { children: v }, v)) })
          ] })
        ] })
      ] }),
      tab === "news" && /* @__PURE__ */ jsxs("div", { children: [
        canNews && /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 20 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => {
          setEditingNews(null);
          setNewsModal(true);
        }, children: "+ Add News" }) }),
        ((_G = movie.news) == null ? void 0 : _G.length) ? /* @__PURE__ */ jsx("div", { className: "news-grid", children: [...movie.news].reverse().map((n) => /* @__PURE__ */ jsxs("div", { className: "news-card", children: [
          /* @__PURE__ */ jsx(SafeNewsImg, { src: n.imageUrl, alt: n.title }),
          /* @__PURE__ */ jsxs("div", { className: "news-card-body", children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }, children: [
              /* @__PURE__ */ jsx("div", { className: "news-card-category", children: n.category || "Update" }),
              canNews && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                /* @__PURE__ */ jsx("button", { className: "news-action-btn", onClick: () => {
                  setEditingNews(n);
                  setNewsModal(true);
                }, children: "✏" }),
                /* @__PURE__ */ jsx("button", { className: "news-action-btn news-action-delete", onClick: () => handleDeleteNews(n._id), children: "🗑" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "news-card-title", children: n.title }),
            /* @__PURE__ */ jsx("div", { className: "news-card-content", children: n.content }),
            /* @__PURE__ */ jsx("div", { className: "news-card-meta", children: new Date(n.createdAt).toLocaleDateString("en-IN") })
          ] })
        ] }, n._id)) }) : /* @__PURE__ */ jsxs("div", { className: "md-empty", children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "2.5rem" }, children: "📰" }),
          /* @__PURE__ */ jsx("p", { children: "No news yet." }),
          canNews && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", style: { marginTop: 12 }, onClick: () => setNewsModal(true), children: "+ Add First News" })
        ] })
      ] }),
      tab === "reviews" && /* @__PURE__ */ jsxs("div", { style: { maxWidth: 820 }, children: [
        ((_H = movie.reviews) == null ? void 0 : _H.length) > 0 && (() => {
          const total = movie.reviews.length;
          const avg = (movie.reviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(1);
          const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: movie.reviews.filter((r) => r.rating === n).length }));
          return /* @__PURE__ */ jsxs("div", { className: "md-rv-summary", children: [
            /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
              /* @__PURE__ */ jsx("div", { className: "md-rv-big-score", children: avg }),
              /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 2, justifyContent: "center", margin: "4px 0" }, children: [1, 2, 3, 4, 5].map((s) => /* @__PURE__ */ jsx("span", { style: { fontSize: ".9rem", filter: parseFloat(avg) >= s ? "none" : "grayscale(1) opacity(.3)" }, children: "⭐" }, s)) }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: ".7rem", color: "rgba(255,255,255,.4)" }, children: [
                total,
                " review",
                total !== 1 ? "s" : ""
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "md-rv-bars", children: dist.map(({ n, count }) => /* @__PURE__ */ jsxs("div", { className: "md-rv-bar-row", children: [
              /* @__PURE__ */ jsxs("span", { className: "md-rv-bar-label", children: [
                n,
                "★"
              ] }),
              /* @__PURE__ */ jsx("div", { className: "md-rv-bar-track", children: /* @__PURE__ */ jsx("div", { className: "md-rv-bar-fill", style: { width: `${total ? Math.round(count / total * 100) : 0}%` } }) }),
              /* @__PURE__ */ jsx("span", { className: "md-rv-bar-count", children: count })
            ] }, n)) })
          ] });
        })(),
        /* @__PURE__ */ jsxs("div", { className: "md-rv-form", ref: reviewFormRef, children: [
          /* @__PURE__ */ jsx("p", { className: "md-rv-form-title", children: "✍️ Write a Review" }),
          /* @__PURE__ */ jsxs("p", { className: "md-rv-form-sub", children: [
            "Share your honest opinion about ",
            movie.title
          ] }),
          rvSuccess ? /* @__PURE__ */ jsx("div", { className: "md-rv-success", children: "🎉 Thank you! Your review has been published." }) : /* @__PURE__ */ jsxs("form", { onSubmit: submitReview, children: [
            /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.45)", display: "block", marginBottom: 6 }, children: "Your Name" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "md-rv-input",
                  value: rvUser,
                  onChange: (e) => setRvUser(e.target.value),
                  placeholder: "e.g. Raju Mohanty",
                  maxLength: 60
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.45)", display: "block", marginBottom: 8 }, children: "Your Rating" }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
                /* @__PURE__ */ jsx("div", { className: "md-rv-stars", children: [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `md-rv-star${(rvHover || rvRating) >= star ? " lit" : ""}`,
                    onMouseEnter: () => setRvHover(star),
                    onMouseLeave: () => setRvHover(0),
                    onClick: () => setRvRating(star),
                    children: "⭐"
                  },
                  star
                )) }),
                (rvHover || rvRating) > 0 && /* @__PURE__ */ jsx("span", { className: "md-rv-star-label", children: ["", "Terrible 😞", "Poor 😕", "Average 😐", "Good 😊", "Excellent 🤩"][rvHover || rvRating] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.45)", display: "block", marginBottom: 6 }, children: "Your Review" }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  className: "md-rv-input md-rv-textarea",
                  value: rvText,
                  onChange: (e) => setRvText(e.target.value),
                  placeholder: `What did you think of ${movie.title}? Was it worth watching?`,
                  maxLength: 1e3
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "md-rv-char", children: [
                rvText.length,
                "/1000"
              ] })
            ] }),
            rvError && /* @__PURE__ */ jsxs("div", { className: "md-rv-error", children: [
              "⚠️ ",
              rvError
            ] }),
            /* @__PURE__ */ jsx("button", { className: "md-rv-submit", type: "submit", disabled: submitting || !rvRating, children: submitting ? "Publishing…" : rvRating ? `Submit ${["", "★", "★★", "★★★", "★★★★", "★★★★★"][rvRating]} Review` : "Select a rating to continue" })
          ] })
        ] }),
        ((_I = movie.reviews) == null ? void 0 : _I.length) ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { style: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.35)", marginBottom: 14 }, children: [
            movie.reviews.length,
            " Review",
            movie.reviews.length !== 1 ? "s" : ""
          ] }),
          [...movie.reviews].reverse().map((r, i) => {
            var _a2;
            const avatarColors = ["#c9973a", "#4caf82", "#7aaae8", "#e5799a", "#a78be8", "#e8c87a"];
            const avatarColor = avatarColors[(((_a2 = r.user) == null ? void 0 : _a2.charCodeAt(0)) || 0) % avatarColors.length];
            const filled = Math.round(r.rating || 0);
            return /* @__PURE__ */ jsxs("div", { className: "md-rv-card", children: [
              /* @__PURE__ */ jsxs("div", { className: "md-rv-card-header", children: [
                /* @__PURE__ */ jsx("div", { className: "md-rv-avatar", style: { background: avatarColor, width: 44, height: 44, fontSize: "1.1rem" }, children: (r.user || "?")[0].toUpperCase() }),
                /* @__PURE__ */ jsxs("div", { className: "md-rv-card-meta", children: [
                  /* @__PURE__ */ jsx("div", { className: "md-rv-card-name", children: r.user }),
                  r.date && /* @__PURE__ */ jsx("div", { className: "md-rv-card-date", children: r.date })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { marginLeft: "auto", textAlign: "right" }, children: [
                  /* @__PURE__ */ jsx("div", { className: "md-rv-card-stars", children: [1, 2, 3, 4, 5].map((s) => /* @__PURE__ */ jsx("span", { className: "md-rv-card-star", style: { filter: s <= filled ? "none" : "grayscale(1) opacity(.25)" }, children: "⭐" }, s)) }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: ".66rem", color: "rgba(255,255,255,.35)", marginTop: 2 }, children: ["", "Terrible", "Poor", "Average", "Good", "Excellent"][filled] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "md-rv-card-text", children: r.text }),
              /* @__PURE__ */ jsx("span", { className: "md-rv-helpful", children: "👍 Helpful?" })
            ] }, i);
          })
        ] }) : /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,.25)" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 10 }, children: "✍️" }),
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, marginBottom: 6 }, children: "No reviews yet" }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: ".8rem" }, children: [
            "Be the first to review ",
            movie.title
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-sections", style: { paddingTop: 16, background: "var(--bg)" }, children: [
      actors.length > 0 && /* @__PURE__ */ jsx(HomeRow$1, { title: "🎭 Full Cast", children: [...crew, ...actors].map((c, i) => /* @__PURE__ */ jsx(
        MiniCastCard,
        {
          person: c,
          onClick: () => c.castId && navigate(portalMode ? `/portal/cast/${c.castId}` : castPath({ _id: c.castId, name: c.name }))
        },
        c.castId || i
      )) }),
      sameDirector.length > 0 && /* @__PURE__ */ jsx(HomeRow$1, { title: `🎬 More by ${movie.director}`, children: sameDirector.map((m) => /* @__PURE__ */ jsx(MiniMovieCard, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) }),
      relatedMovies.length > 0 && /* @__PURE__ */ jsx(HomeRow$1, { title: "🎥 Similar Films", tag: "Related", children: relatedMovies.map((m) => /* @__PURE__ */ jsx(MiniMovieCard, { movie: m, onClick: () => navigate(moviePath(m)) }, m._id)) })
    ] }),
    newsModal && /* @__PURE__ */ jsx(NewsModal, { movieId: id, existing: editingNews, onSave: handleNewsSaved, onClose: () => {
      setNewsModal(false);
      setEditingNews(null);
    } }),
    addCastModal && /* @__PURE__ */ jsx(AddCastModal, { movieId: id, onAdded: (m) => {
      setMovie((prev) => ({ ...prev, cast: m.cast }));
    }, onClose: () => setAddCastModal(false) }),
    addSongModal && /* @__PURE__ */ jsx(AddSongModal, { movieId: id, onAdded: (m) => {
      setMovie((prev) => ({ ...prev, media: m.media }));
    }, onClose: () => setAddSongModal(false) }),
    showShare && /* @__PURE__ */ jsx("div", { className: "md-share-overlay", onClick: () => setShowShare(false), children: /* @__PURE__ */ jsxs("div", { className: "md-share-card", onClick: (e) => e.stopPropagation(), children: [
      (movie.thumbnailUrl || movie.posterUrl) && /* @__PURE__ */ jsx(
        "img",
        {
          src: movie.thumbnailUrl || movie.posterUrl,
          alt: movie.title,
          style: { width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" },
          onError: (e) => e.target.style.display = "none"
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { padding: "18px 20px 20px" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: ".58rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#c9973a", marginBottom: 6 }, children: "🎬 Odia Film" }),
        /* @__PURE__ */ jsx("div", { style: { fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.2, marginBottom: 5 }, children: movie.title }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: ".76rem", color: "rgba(255,255,255,.5)", marginBottom: 14 }, children: [
          movie.releaseDate && /* @__PURE__ */ jsxs("span", { children: [
            new Date(movie.releaseDate).getFullYear(),
            " · "
          ] }),
          movie.director && /* @__PURE__ */ jsx("span", { children: movie.director })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsx("button", { onClick: handleShare, className: "md-btn-play", style: { flex: 1, justifyContent: "center", fontSize: ".8rem", padding: "9px" }, children: navigator.share ? "📤 Share" : "🔗 Copy Link" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setShowShare(false), style: { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#f1f1f1", padding: "9px 14px", cursor: "pointer", fontSize: ".8rem" }, children: "✕" })
        ] })
      ] })
    ] }) })
  ] });
}
const CSS$6 = `
@keyframes cpulse{0%,100%{opacity:1}50%{opacity:.35}}
.cc{flex-shrink:0;width:140px;cursor:pointer;transition:transform .25s cubic-bezier(.34,1.56,.64,1);contain:layout style;}
@media(min-width:480px){.cc{width:152px;}}
@media(min-width:768px){.cc{width:162px;}}
.cc:hover{transform:translateY(-6px) scale(1.02);}
.cc:hover .cc-box{box-shadow:0 18px 48px rgba(0,0,0,.7);border-color:rgba(201,151,58,.45);}
.cc:hover .cc-play{opacity:1;}.cc:hover .cc-name{color:var(--gold);}
.cc-box{position:relative;border-radius:10px;overflow:hidden;height:180px;background:var(--bg3);box-shadow:0 4px 14px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s;}
@media(min-width:480px){.cc-box{height:196px;}}
@media(min-width:768px){.cc-box{height:210px;}}
.cc-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);opacity:0;transition:opacity .2s;}
.cc-name{margin:0;font-weight:700;font-size:.76rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
@media(min-width:480px){.cc-name{font-size:.82rem;}}
/* Cast page */
.cast-root{min-height:100vh;background:var(--bg);padding-top:60px;}
.cast-header{padding:24px 16px 0;background:linear-gradient(to bottom,rgba(201,151,58,.06),transparent);border-bottom:1px solid var(--border);}
@media(min-width:480px){.cast-header{padding:28px 20px 0;}}
@media(min-width:768px){.cast-header{padding:32px 28px 0;}}
.cast-title{font-family:'Playfair Display',serif;font-size:clamp(1.4rem,4vw,2.2rem);font-weight:900;margin:0 0 16px;}
.cast-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.06);}
.cast-tab{padding:10px 16px;background:none;border:none;cursor:pointer;font-weight:700;font-size:.78rem;color:var(--muted);border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;}
@media(min-width:480px){.cast-tab{padding:10px 20px;font-size:.82rem;}}
.cast-tab.active{color:var(--gold);border-bottom-color:var(--gold);}
.cast-filters{padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
@media(min-width:480px){.cast-filters{padding:10px 20px;gap:10px;}}
.cast-sections{padding:20px 0 60px;}
.cast-row-wrap{margin-bottom:8px;}
.cast-row-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:12px;}
@media(min-width:480px){.cast-row-header{padding:0 20px;}}
@media(min-width:768px){.cast-row-header{padding:0 28px;}}
.cast-hrow{display:flex;gap:10px;overflow-x:auto;padding:4px 16px 10px;scrollbar-width:none;}
@media(min-width:480px){.cast-hrow{gap:12px;padding:4px 20px 12px;}}
@media(min-width:768px){.cast-hrow{gap:14px;padding:4px 28px 14px;}}
.cast-hrow::-webkit-scrollbar{display:none;}
.cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:12px;padding:4px 16px 20px;}
@media(min-width:480px){.cast-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;padding:4px 20px 20px;}}
@media(min-width:768px){.cast-grid{grid-template-columns:repeat(auto-fill,minmax(162px,1fr));gap:16px;padding:4px 28px 20px;}}
.cast-row-title{margin:0;font-size:.9rem;font-weight:800;}
@media(min-width:480px){.cast-row-title{font-size:1rem;}}
.cast-arrow{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:var(--text);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.cast-arrow:hover{border-color:rgba(201,151,58,.4);color:var(--gold);}
@media(max-width:400px){.cast-arrow{display:none;}}
`;
const _io$1 = typeof window !== "undefined" ? (() => {
  const cbs = /* @__PURE__ */ new WeakMap();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      var _a;
      if (e.isIntersecting) {
        (_a = cbs.get(e.target)) == null ? void 0 : _a();
        cbs.delete(e.target);
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "350px" });
  io._cbs = cbs;
  return io;
})() : null;
const obsImg$1 = (el, cb) => {
  if (!_io$1 || !el) return;
  _io$1._cbs.set(el, cb);
  _io$1.observe(el);
  return () => {
    _io$1.unobserve(el);
    _io$1._cbs.delete(el);
  };
};
function LImg({ src, alt, style }) {
  const [ok, setOk] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!src) return;
    return obsImg$1(ref.current, () => {
      if (ref.current) ref.current.src = src;
    });
  }, [src]);
  if (!src) return null;
  return /* @__PURE__ */ jsx("img", { ref, alt: alt || "", decoding: "async", style: { ...style, opacity: ok ? 1 : 0, transition: "opacity .3s" }, onLoad: () => setOk(true), onError: () => setOk(true) });
}
const CastCard$1 = React.memo(function CastCard2({ person, onClick }) {
  var _a;
  const filmCount = ((_a = person.movies) == null ? void 0 : _a.length) || 0;
  return /* @__PURE__ */ jsxs("div", { className: "cc", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "cc-box", children: [
      /* @__PURE__ */ jsx(LImg, { src: person.photo, alt: person.name, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }),
      !person.photo && /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }, children: "👤" }),
      /* @__PURE__ */ jsx("div", { className: "cc-play", children: /* @__PURE__ */ jsx("div", { style: { width: 34, height: 34, borderRadius: "50%", background: "rgba(201,151,58,.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem" }, children: "▶" }) }),
      /* @__PURE__ */ jsxs("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px", background: "linear-gradient(to top,rgba(0,0,0,.8),transparent)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: ".58rem", color: "rgba(255,255,255,.7)", fontWeight: 600 }, children: person.type || "Actor" }),
        filmCount > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".58rem", color: "var(--gold)", fontWeight: 700 }, children: [
          filmCount,
          "🎬"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "7px 2px 0" }, children: [
      /* @__PURE__ */ jsx("p", { className: "cc-name", children: person.name }),
      /* @__PURE__ */ jsx("p", { style: { margin: "2px 0 0", fontSize: ".64rem", color: "var(--gold)" }, children: person.type || "Actor" })
    ] })
  ] });
});
function CastRow({ title, people, tag }) {
  const navigate = useNavigate();
  const rowRef = useRef(null), sentRef = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = sentRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVis(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const slide = (n) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: n, behavior: "smooth" });
  };
  if (!people.length) return null;
  return /* @__PURE__ */ jsxs("div", { className: "cast-row-wrap", ref: sentRef, children: [
    /* @__PURE__ */ jsxs("div", { className: "cast-row-header", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("h2", { className: "cast-row-title", children: title }),
        tag && /* @__PURE__ */ jsx("span", { className: "home-tag", style: { flexShrink: 0 }, children: tag }),
        /* @__PURE__ */ jsx("span", { style: { flexShrink: 0, background: "rgba(201,151,58,.15)", color: "var(--gold)", fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10 }, children: people.length })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 5, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsx("button", { className: "cast-arrow", onClick: () => slide(-520), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "cast-arrow", onClick: () => slide(520), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "cast-hrow", ref: rowRef, children: vis ? people.map((p) => /* @__PURE__ */ jsx(CastCard$1, { person: p, onClick: () => navigate(castPath(p)) }, p._id)) : Array.from({ length: 6 }, (_, i) => /* @__PURE__ */ jsx("div", { style: { flexShrink: 0, width: 140, height: 220, borderRadius: 8, background: "var(--bg3)", animation: `cpulse 1.5s ease-in-out ${i * 0.1}s infinite` } }, i)) })
  ] });
}
function Cast() {
  const navigate = useNavigate();
  const [cast, setCast] = useState(() => {
    const c = Cache.peek("cast");
    return c ? [...c].sort((a, b) => {
      var _a, _b;
      return (((_a = b.movies) == null ? void 0 : _a.length) || 0) - (((_b = a.movies) == null ? void 0 : _b.length) || 0);
    }) : [];
  });
  const [loading, setLoading] = useState(() => Cache.peek("cast") === null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("trending");
  const [typeFilter, setTypeFilter] = useState("All");
  useEffect(() => {
    if (Cache.peek("cast") !== null) return;
    Cache.getCast().then((data) => setCast([...data].sort((a, b) => {
      var _a, _b;
      return (((_a = b.movies) == null ? void 0 : _a.length) || 0) - (((_b = a.movies) == null ? void 0 : _b.length) || 0);
    }))).catch(console.error).finally(() => setLoading(false));
  }, []);
  const isFiltering = search || typeFilter !== "All";
  const types = useMemo(() => ["All", ...Array.from(new Set(cast.map((c) => c.type).filter(Boolean))).sort()], [cast]);
  const filtered = useMemo(() => cast.filter((c) => {
    var _a;
    const ms = !search || ((_a = c.name) == null ? void 0 : _a.toLowerCase().includes(search.toLowerCase()));
    const mt = typeFilter === "All" || c.type === typeFilter;
    return ms && mt;
  }), [cast, search, typeFilter]);
  const groups = useMemo(() => ({
    stars: cast.filter((c) => c.type === "Actor" || c.type === "Actress"),
    directors: cast.filter((c) => c.type === "Director"),
    musicians: cast.filter((c) => ["Music Director", "Singer", "Lyricist"].includes(c.type)),
    crew: cast.filter((c) => ["Producer", "Cinematographer", "Choreographer", "Editor"].includes(c.type)),
    topStars: cast.filter((c) => c.type === "Actor" || c.type === "Actress").slice(0, 18),
    risingNew: cast.filter((c) => {
      var _a;
      return (((_a = c.movies) == null ? void 0 : _a.length) || 0) === 1;
    }).slice(0, 18),
    veterans: cast.filter((c) => {
      var _a;
      return (((_a = c.movies) == null ? void 0 : _a.length) || 0) >= 5;
    }).slice(0, 18)
  }), [cast]);
  return /* @__PURE__ */ jsxs("div", { className: "cast-root", children: [
    /* @__PURE__ */ jsx(SEO, { ...staticSEO.cast }),
    /* @__PURE__ */ jsx("style", { children: CSS$6 }),
    /* @__PURE__ */ jsxs("div", { className: "cast-header", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("h1", { className: "cast-title", children: "Cast & Crew" }),
        !loading && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".8rem", color: "var(--muted)" }, children: [
          cast.length,
          " people"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "cast-tabs", children: [
        /* @__PURE__ */ jsx("button", { className: `cast-tab${view === "trending" ? " active" : ""}`, onClick: () => setView("trending"), children: "🔥 Trending" }),
        /* @__PURE__ */ jsx("button", { className: `cast-tab${view === "all" ? " active" : ""}`, onClick: () => setView("all"), children: "👥 Browse All" })
      ] })
    ] }),
    (view === "all" || isFiltering) && /* @__PURE__ */ jsxs("div", { className: "cast-filters", children: [
      /* @__PURE__ */ jsxs("div", { style: { position: "relative", flex: 1, minWidth: 160, maxWidth: 280 }, children: [
        /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: ".8rem" }, children: "🔍" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 32, width: "100%", fontSize: ".82rem" }, placeholder: "Search by name…", value: search, onChange: (e) => setSearch(e.target.value) })
      ] }),
      /* @__PURE__ */ jsx("select", { className: "form-select", style: { width: "auto", fontSize: ".8rem" }, value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), children: types.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) }),
      isFiltering && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => {
          setSearch("");
          setTypeFilter("All");
        }, style: { color: "var(--gold)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 4, fontSize: ".76rem" }, children: "✕ Clear" }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: ".75rem", color: "var(--muted)", marginLeft: "auto" }, children: [
          filtered.length,
          " result",
          filtered.length !== 1 ? "s" : ""
        ] })
      ] })
    ] }),
    loading && /* @__PURE__ */ jsx("div", { className: "cast-sections", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxs("div", { className: "cast-row-wrap", children: [
      /* @__PURE__ */ jsx("div", { className: "cast-row-header", children: /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 16, width: 180 } }) }),
      /* @__PURE__ */ jsx("div", { className: "cast-hrow", children: Array.from({ length: 6 }, (_, j) => /* @__PURE__ */ jsx("div", { className: "skeleton", style: { flexShrink: 0, width: 140, height: 218, borderRadius: 8 } }, j)) })
    ] }, i)) }),
    !loading && view === "trending" && !isFiltering && /* @__PURE__ */ jsxs("div", { className: "cast-sections", children: [
      /* @__PURE__ */ jsx(CastRow, { title: "⭐ Top Stars", people: groups.topStars, tag: "Popular" }),
      /* @__PURE__ */ jsx(CastRow, { title: "🎬 Directors", people: groups.directors }),
      /* @__PURE__ */ jsx(CastRow, { title: "🏆 Veteran Artists", people: groups.veterans, tag: "5+ Films" }),
      /* @__PURE__ */ jsx(CastRow, { title: "🎵 Music & Songs", people: groups.musicians }),
      /* @__PURE__ */ jsx(CastRow, { title: "🌟 Rising Talents", people: groups.risingNew, tag: "New" }),
      /* @__PURE__ */ jsx(CastRow, { title: "🎥 Crew & Production", people: groups.crew }),
      groups.stars.length > 18 && /* @__PURE__ */ jsx(CastRow, { title: "👥 All Actors & Actresses", people: groups.stars }),
      cast.length === 0 && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 24px", color: "var(--muted)" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", marginBottom: 10 }, children: "👤" }),
        /* @__PURE__ */ jsx("p", { children: "No cast members yet." })
      ] })
    ] }),
    !loading && (view === "all" || isFiltering) && /* @__PURE__ */ jsx("div", { className: "cast-sections", children: filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 24px", color: "var(--muted)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", marginBottom: 10 }, children: "👤" }),
      /* @__PURE__ */ jsx("p", { children: "No results found." }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", style: { marginTop: 14 }, onClick: () => {
        setSearch("");
        setTypeFilter("All");
      }, children: "Clear Filters" })
    ] }) : search ? /* @__PURE__ */ jsxs("div", { style: { padding: "4px 0 24px" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "cast-row-header", children: [
        /* @__PURE__ */ jsx("h2", { className: "cast-row-title", children: "Results" }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: ".78rem", color: "var(--muted)" }, children: [
          filtered.length,
          " people"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "cast-grid", children: filtered.map((p) => /* @__PURE__ */ jsx(CastCard$1, { person: p, onClick: () => navigate(castPath(p)) }, p._id)) })
    ] }) : types.filter((t) => t !== "All").map((t) => {
      const g = filtered.filter((c) => c.type === t);
      return g.length ? /* @__PURE__ */ jsx(CastRow, { title: t + "s", people: g }, t) : null;
    }) })
  ] });
}
function SafeImg$1({ src, alt, style, fallback }) {
  const [err, setErr] = useState(false);
  if (!src || err) return fallback ?? null;
  return /* @__PURE__ */ jsx("img", { src, alt, style, onError: () => setErr(true) });
}
const ROLE_ICON = {
  Director: "🎬",
  Producer: "🎥",
  "Music Director": "🎵",
  Cinematographer: "📷",
  Choreographer: "💃",
  Lyricist: "✍️",
  Actor: "🎭",
  Actress: "🎭",
  Singer: "🎤",
  Editor: "✂️"
};
const VERDICT_META = [
  { label: "Blockbuster", bg: "#1a3d28", txt: "#95e5b8" },
  { label: "Super Hit", bg: "#1a3d28", txt: "#95e5b8" },
  { label: "Hit", bg: "#2d6a4f", txt: "#95e5b8" },
  { label: "Average", bg: "#5a4a1a", txt: "#e8c87a" },
  { label: "Flop", bg: "#6a2d2d", txt: "#e59595" },
  { label: "Disaster", bg: "#4a1a1a", txt: "#e59595" }
];
function HomeRow({ title, count, children }) {
  const ref = useRef(null);
  const slide = (n) => {
    var _a;
    return (_a = ref.current) == null ? void 0 : _a.scrollBy({ left: n, behavior: "smooth" });
  };
  return /* @__PURE__ */ jsxs("div", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", style: { padding: "0 24px" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: title }),
        count > 0 && /* @__PURE__ */ jsx("span", { style: {
          background: "rgba(201,151,58,0.15)",
          color: "var(--gold)",
          fontSize: "0.68rem",
          fontWeight: 700,
          padding: "2px 9px",
          borderRadius: 10,
          letterSpacing: "0.05em"
        }, children: count })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "home-section-arrows", children: [
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(-360), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => slide(360), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row", ref, style: { padding: "4px 24px 12px" }, children })
  ] });
}
function MovieCard$1({ movie, role, onClick }) {
  var _a;
  return /* @__PURE__ */ jsxs("div", { className: "home-card", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "home-card-img", children: [
      movie.posterUrl ? /* @__PURE__ */ jsx("img", { src: movie.posterUrl, alt: movie.title, loading: "lazy", decoding: "async", onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { className: "home-card-fallback", children: "🎬" }),
      /* @__PURE__ */ jsx("div", { className: "home-card-play", children: "▶" }),
      /* @__PURE__ */ jsxs("div", { className: "home-card-overlay", children: [
        /* @__PURE__ */ jsx("span", { className: "home-card-verdict", children: movie.verdict || "Upcoming" }),
        /* @__PURE__ */ jsx("span", { className: "home-card-genre", children: ((_a = movie.genre) == null ? void 0 : _a[0]) || "" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-card-info", children: [
      /* @__PURE__ */ jsx("p", { className: "home-card-title", children: movie.title }),
      /* @__PURE__ */ jsx("p", { className: "home-card-date", children: role ? `as ${role}` : movie.releaseDate || "Upcoming" })
    ] })
  ] });
}
function SongCard({ song }) {
  const [playing, setPlaying] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "home-song-card", style: { flexShrink: 0, width: 180 }, onClick: () => song.ytId && setPlaying(true), children: [
    playing && song.ytId ? /* @__PURE__ */ jsx("div", { style: { position: "relative", paddingBottom: "56.25%", background: "#000" }, children: /* @__PURE__ */ jsx(
      "iframe",
      {
        src: `https://www.youtube.com/embed/${song.ytId}?autoplay=1`,
        allow: "autoplay; encrypted-media",
        allowFullScreen: true,
        title: song.title,
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }
      }
    ) }) : /* @__PURE__ */ jsxs("div", { className: "home-song-thumb", children: [
      song.thumbnailUrl ? /* @__PURE__ */ jsx("img", { src: song.thumbnailUrl, alt: song.title, loading: "lazy", decoding: "async", onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", background: "linear-gradient(135deg,#111,#222)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }, children: "🎵" }),
      /* @__PURE__ */ jsx("div", { className: "home-song-play", children: "▶" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-song-info", children: [
      /* @__PURE__ */ jsx("p", { className: "home-song-title", children: song.title }),
      song.singer && /* @__PURE__ */ jsx("p", { className: "home-song-singer", children: song.singer }),
      /* @__PURE__ */ jsx("p", { className: "home-song-movie", children: song.movieTitle })
    ] })
  ] });
}
function TrailerCard({ trailer }) {
  const [playing, setPlaying] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "home-trailer-card", style: { flexShrink: 0, width: 300 }, onClick: () => setPlaying((p) => !p), children: [
    playing ? /* @__PURE__ */ jsx("div", { style: { position: "relative", paddingBottom: "56.25%", background: "#000" }, children: /* @__PURE__ */ jsx(
      "iframe",
      {
        src: `https://www.youtube.com/embed/${trailer.ytId}?autoplay=1`,
        allow: "autoplay; encrypted-media",
        allowFullScreen: true,
        title: trailer.movieTitle,
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }
      }
    ) }) : /* @__PURE__ */ jsxs("div", { className: "home-trailer-thumb", children: [
      /* @__PURE__ */ jsx("img", { src: `https://img.youtube.com/vi/${trailer.ytId}/mqdefault.jpg`, loading: "lazy", decoding: "async", alt: trailer.movieTitle }),
      /* @__PURE__ */ jsx("div", { className: "home-trailer-play", children: "▶" }),
      /* @__PURE__ */ jsx("div", { className: "home-trailer-duration", children: "Trailer" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-trailer-info", children: /* @__PURE__ */ jsx("p", { className: "home-trailer-title", children: trailer.movieTitle }) })
  ] });
}
function NewsCard$1({ news, onClick }) {
  return /* @__PURE__ */ jsxs("div", { className: "home-news-card", style: { flexShrink: 0, width: 260 }, onClick, children: [
    /* @__PURE__ */ jsx("div", { className: "home-news-img", children: news.imageUrl ? /* @__PURE__ */ jsx("img", { src: news.imageUrl, alt: news.title, loading: "lazy", decoding: "async", onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", background: "linear-gradient(135deg,#111,#1a1a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }, children: "📰" }) }),
    /* @__PURE__ */ jsxs("div", { className: "home-news-body", children: [
      /* @__PURE__ */ jsx("span", { className: "home-news-cat", children: news.category || "Update" }),
      /* @__PURE__ */ jsx("p", { className: "home-news-title", children: news.title }),
      news.movieTitle && /* @__PURE__ */ jsx("p", { className: "home-news-movie", children: news.movieTitle })
    ] })
  ] });
}
function Skeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "home-root", style: { paddingTop: 60 }, children: [
    /* @__PURE__ */ jsx("div", { className: "skeleton", style: { width: "100%", height: 480 } }),
    /* @__PURE__ */ jsx("div", { style: { padding: "40px 0" }, children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", { className: "home-section", children: [
      /* @__PURE__ */ jsx("div", { className: "home-section-header", style: { padding: "0 24px" }, children: /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 20, width: 200 } }) }),
      /* @__PURE__ */ jsx("div", { className: "home-row", style: { padding: "8px 24px 12px" }, children: [1, 2, 3, 4, 5].map((j) => /* @__PURE__ */ jsx("div", { className: "skeleton", style: { flexShrink: 0, width: 180, height: 270, borderRadius: 8 } }, j)) })
    ] }, i)) })
  ] });
}
function CastProfile({ portalMode }) {
  var _a, _b, _c;
  const { slug } = useParams();
  const id = extractId(slug);
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("all");
  useEffect(() => {
    setLoading(true);
    setError(null);
    API.getCastMember(id).then((p) => {
      setPerson(p);
      setLoading(false);
      const load = () => Cache.getNews().catch(() => []).then((n) => setAllNews(n));
      const id2 = typeof requestIdleCallback !== "undefined" ? requestIdleCallback(load) : setTimeout(load, 150);
      return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(id2) : clearTimeout(id2);
    }).catch((e) => {
      setError((e == null ? void 0 : e.message) || "Not found");
      setLoading(false);
    });
  }, [id]);
  if (loading) return /* @__PURE__ */ jsx(Skeleton, {});
  if (error || !person) return /* @__PURE__ */ jsxs("div", { className: "page empty-state", children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "3.5rem", marginBottom: 16 }, children: "🎭" }),
    /* @__PURE__ */ jsx("h3", { children: "Person not found" }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-outline", style: { marginTop: 20 }, onClick: () => navigate(-1), children: "← Go Back" })
  ] });
  const movies = person.moviesList || [];
  const icon = ROLE_ICON[person.type] || "🎭";
  const hits = movies.filter((m) => ["Hit", "Super Hit", "Blockbuster"].includes(m.verdict));
  const flops = movies.filter((m) => ["Flop", "Disaster"].includes(m.verdict));
  const upcoming = movies.filter((m) => !m.verdict || m.verdict === "Upcoming");
  const released = movies.filter((m) => m.verdict && m.verdict !== "Upcoming");
  const hitRate = released.length ? Math.round(hits.length / released.length * 100) : null;
  const tabMovies = tab === "hits" ? hits : tab === "upcoming" ? upcoming : movies;
  const songs = movies.flatMap(
    (m) => {
      var _a2;
      return (((_a2 = m.media) == null ? void 0 : _a2.songs) || []).map((s) => ({ ...s, movieTitle: m.title }));
    }
  );
  const trailers = movies.filter((m) => {
    var _a2, _b2;
    return (_b2 = (_a2 = m.media) == null ? void 0 : _a2.trailer) == null ? void 0 : _b2.ytId;
  }).map((m) => ({ ...m.media.trailer, movieTitle: m.title, movieId: m._id }));
  const movieIds = new Set(movies.map((m) => String(m._id)));
  const personNews = allNews.filter((n) => n.movieId && movieIds.has(String(n.movieId)));
  const coMap = {};
  movies.forEach((m) => {
    (m.cast || []).forEach((c) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      const k = String(c.castId);
      if (!coMap[k]) coMap[k] = { ...c, count: 0 };
      coMap[k].count++;
    });
  });
  const costars = Object.values(coMap).sort((a, b) => b.count - a.count).slice(0, 8);
  const gMap = {};
  movies.forEach((m) => (m.genre || []).forEach((g) => {
    gMap[g] = (gMap[g] || 0) + 1;
  }));
  const genres = Object.entries(gMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  ((_a = genres[0]) == null ? void 0 : _a[1]) || 1;
  const verdictPills = VERDICT_META.map((v) => ({ ...v, count: movies.filter((m) => m.verdict === v.label).length })).filter((v) => v.count > 0);
  const backdrop = ((_b = movies.find((m) => m.thumbnailUrl)) == null ? void 0 : _b.thumbnailUrl) || ((_c = movies.find((m) => m.posterUrl)) == null ? void 0 : _c.posterUrl) || null;
  const goMovie = (m) => navigate(portalMode ? `/portal/movie/${typeof m === "object" ? m._id : m}` : typeof m === "object" ? moviePath(m) : `/movie/${m}`);
  return /* @__PURE__ */ jsxs("div", { className: "home-root", children: [
    /* @__PURE__ */ jsx(SEO, { ...castSEO(person) }),
    /* @__PURE__ */ jsx(Helmet, { children: person && /* @__PURE__ */ jsx("script", { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Person", "name": person.name, "image": person.photo, "description": person.bio, "jobTitle": person.type, "nationality": { "@type": "Country", "name": "India" } }) }) }),
    /* @__PURE__ */ jsxs("div", { style: { position: "relative", overflow: "hidden", paddingTop: 60 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { position: "absolute", inset: 0, zIndex: 0 }, children: [
        backdrop ? /* @__PURE__ */ jsx("img", { src: backdrop, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.22)", transform: "scale(1.1)" } }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", background: "linear-gradient(135deg,#0f0f0f,#1a1200)" } }),
        /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(10,10,10,0.75) 60%, #0a0a0a 100%)" } })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "24px 24px 32px" }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-ghost btn-sm",
            onClick: () => navigate(-1),
            style: { marginBottom: 20, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 4 },
            children: "← Back"
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx("div", { style: {
            width: 110,
            height: 140,
            flexShrink: 0,
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid rgba(201,151,58,0.55)",
            background: "var(--bg2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }, children: /* @__PURE__ */ jsx(
            SafeImg$1,
            {
              src: person.photo,
              alt: person.name,
              style: { width: "100%", height: "100%", objectFit: "cover" },
              fallback: /* @__PURE__ */ jsx("span", { style: { fontSize: "3rem" }, children: icon })
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "home-hero-meta", style: { marginBottom: 8 }, children: [
              /* @__PURE__ */ jsxs("span", { className: "home-tag", children: [
                icon,
                " ",
                person.type
              ] }),
              hitRate !== null && /* @__PURE__ */ jsxs("span", { className: "home-tag-outline", children: [
                hitRate,
                "% Hit Rate"
              ] })
            ] }),
            /* @__PURE__ */ jsx("h1", { style: {
              fontFamily: "'Playfair Display',serif",
              fontSize: "clamp(1.6rem,4vw,2.6rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: "0 0 10px",
              textShadow: "0 2px 16px rgba(0,0,0,0.8)"
            }, children: person.name }),
            /* @__PURE__ */ jsxs("div", { className: "home-hero-info", style: { marginBottom: person.bio ? 10 : 0 }, children: [
              /* @__PURE__ */ jsxs("span", { children: [
                movies.length,
                " Films"
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                hits.length,
                " Hits"
              ] }),
              flops.length > 0 && /* @__PURE__ */ jsxs("span", { children: [
                flops.length,
                " Flops"
              ] }),
              upcoming.length > 0 && /* @__PURE__ */ jsxs("span", { children: [
                upcoming.length,
                " Upcoming"
              ] })
            ] }),
            person.bio && /* @__PURE__ */ jsx("p", { style: {
              fontSize: "0.84rem",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.55,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxWidth: 520
            }, children: person.bio }),
            (person.website || person.instagram) && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }, children: [
              person.instagram && /* @__PURE__ */ jsx(
                "a",
                {
                  href: `https://instagram.com/${person.instagram.replace("@", "")}`,
                  target: "_blank",
                  rel: "noreferrer",
                  style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "rgba(225,48,108,.12)", border: "1px solid rgba(225,48,108,.3)", color: "#e1306c", fontSize: ".72rem", fontWeight: 700, textDecoration: "none", transition: "all .15s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = "rgba(225,48,108,.22)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = "rgba(225,48,108,.12)";
                  },
                  children: "📸 Instagram"
                }
              ),
              person.website && /* @__PURE__ */ jsx(
                "a",
                {
                  href: person.website,
                  target: "_blank",
                  rel: "noreferrer",
                  style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)", fontSize: ".72rem", fontWeight: 700, textDecoration: "none" },
                  children: "🌐 Website"
                }
              ),
              person.instagram && /* @__PURE__ */ jsx(
                "a",
                {
                  href: `https://youtube.com/@${person.instagram.replace("@", "")}`,
                  target: "_blank",
                  rel: "noreferrer",
                  style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "rgba(255,0,0,.1)", border: "1px solid rgba(255,0,0,.25)", color: "#ff4444", fontSize: ".72rem", fontWeight: 700, textDecoration: "none" },
                  children: "▶ YouTube"
                }
              )
            ] }),
            verdictPills.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }, children: verdictPills.map((v) => /* @__PURE__ */ jsxs("div", { style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: v.bg,
              borderRadius: 3,
              padding: "3px 9px",
              fontSize: "0.68rem",
              fontWeight: 700
            }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: v.txt }, children: v.label }),
              /* @__PURE__ */ jsx("span", { style: { background: "rgba(255,255,255,0.15)", color: "#fff", padding: "0 5px", borderRadius: 8, fontSize: "0.62rem" }, children: v.count })
            ] }, v.label)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }, children: [
            movies.length > 0 && /* @__PURE__ */ jsx("button", { className: "btn-hero-play", style: { fontSize: "0.8rem", padding: "10px 20px" }, onClick: () => goMovie(movies[0]), children: "▶ Latest Film" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn-hero-info",
                style: { fontSize: "0.78rem", padding: "10px 18px" },
                onClick: () => {
                  var _a2;
                  return (_a2 = document.getElementById("cast-filmography")) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth" });
                },
                children: "Filmography"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-sections", style: { paddingTop: 24 }, children: [
      movies.length > 0 && /* @__PURE__ */ jsx("div", { id: "cast-filmography", style: { padding: "0 24px", marginBottom: 8 }, children: /* @__PURE__ */ jsx("div", { className: "tabs", style: { borderColor: "rgba(255,255,255,0.1)" }, children: [["all", "All Films"], ["hits", "Hits Only"], ["upcoming", "Upcoming"]].map(([k, lbl]) => /* @__PURE__ */ jsxs(
        "button",
        {
          className: `tab ${tab === k ? "active" : ""}`,
          onClick: () => setTab(k),
          style: { fontSize: "0.8rem" },
          children: [
            lbl,
            k === "hits" && hits.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, background: "rgba(201,151,58,0.2)", color: "var(--gold)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 8 }, children: hits.length })
          ]
        },
        k
      )) }) }),
      tabMovies.length > 0 && /* @__PURE__ */ jsx(HomeRow, { title: "Filmography", count: tabMovies.length, children: tabMovies.map((m) => {
        const entry = (m.cast || []).find((c) => String(c.castId) === String(person._id));
        return /* @__PURE__ */ jsx(
          MovieCard$1,
          {
            movie: m,
            role: entry == null ? void 0 : entry.role,
            onClick: () => goMovie(m)
          },
          m._id
        );
      }) }),
      tabMovies.length === 0 && tab !== "all" && /* @__PURE__ */ jsxs("div", { style: { padding: "24px 24px 0", color: "var(--muted)", fontSize: "0.88rem" }, children: [
        "No ",
        tab === "hits" ? "hit" : "upcoming",
        " films found."
      ] }),
      movies.length > 0 && (() => {
        const byYear = {};
        movies.forEach((m) => {
          const yr = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA";
          if (!byYear[yr]) byYear[yr] = [];
          byYear[yr].push(m);
        });
        const years = Object.keys(byYear).sort((a, b) => (b === "TBA" ? -1 : b) - (a === "TBA" ? -1 : a));
        const debutYear = years[years.length - 1];
        return /* @__PURE__ */ jsxs("div", { style: { padding: "0 24px", marginBottom: 32 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { fontSize: ".62rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 16 }, children: [
            "🕐 Career Timeline · ",
            movies.length,
            " films · Debut ",
            debutYear
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { position: "relative", paddingLeft: 20 }, children: [
            /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: 7, top: 4, bottom: 4, width: 2, background: "linear-gradient(to bottom,#c9973a,rgba(201,151,58,.1))", borderRadius: 1 } }),
            years.map((yr, yi) => /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginBottom: 18 }, children: [
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: -13, top: 3, width: 10, height: 10, borderRadius: "50%", background: yi === 0 ? "#c9973a" : "rgba(201,151,58,.4)", border: "2px solid #c9973a", boxShadow: yi === 0 ? "0 0 8px rgba(201,151,58,.6)" : "none" } }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 }, children: [
                /* @__PURE__ */ jsx("div", { style: { minWidth: 40, fontSize: ".72rem", fontWeight: 800, color: "#c9973a", paddingTop: 2, flexShrink: 0 }, children: yr }),
                /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: byYear[yr].map((m) => {
                  const vc = { "Blockbuster": "#95e5b8", "Super Hit": "#95e5b8", "Hit": "#95e5b8", "Average": "#e8c87a", "Flop": "#e59595", "Disaster": "#e59595", "Upcoming": "#7aaae8" }[m.verdict] || "#7aaae8";
                  return /* @__PURE__ */ jsxs(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 6px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, cursor: "pointer", transition: "border-color .15s" },
                      onClick: () => navigate(typeof moviePath === "function" ? moviePath(m) : `/movie/${m._id}`),
                      onMouseEnter: (e) => e.currentTarget.style.borderColor = "rgba(201,151,58,.4)",
                      onMouseLeave: (e) => e.currentTarget.style.borderColor = "rgba(255,255,255,.09)",
                      children: [
                        m.posterUrl && /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: "", style: { width: 20, height: 28, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
                        /* @__PURE__ */ jsx("span", { style: { fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }, children: m.title }),
                        m.verdict && m.verdict !== "Upcoming" && /* @__PURE__ */ jsx("span", { style: { fontSize: ".58rem", fontWeight: 800, color: vc, background: `${vc}18`, padding: "1px 5px", borderRadius: 8 }, children: m.verdict })
                      ]
                    },
                    m._id
                  );
                }) })
              ] })
            ] }, yr))
          ] })
        ] });
      })(),
      costars.length > 0 && /* @__PURE__ */ jsx(HomeRow, { title: "Frequent Co-stars", count: costars.length, children: costars.map((c, i) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "home-card",
          style: { width: 150, cursor: c.castId ? "pointer" : "default" },
          onClick: () => c.castId && navigate(castPath({ _id: c.castId })),
          children: [
            /* @__PURE__ */ jsxs("div", { className: "home-card-img", style: { height: 150 }, children: [
              /* @__PURE__ */ jsx(
                SafeImg$1,
                {
                  src: c.photo,
                  alt: c.name,
                  style: { width: "100%", height: "100%", objectFit: "cover" },
                  fallback: /* @__PURE__ */ jsx("div", { className: "home-card-fallback", children: "🎭" })
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "home-card-play", children: "▶" }),
              /* @__PURE__ */ jsx("div", { className: "home-card-overlay", children: /* @__PURE__ */ jsx("span", { className: "home-card-genre", children: c.type }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "home-card-info", children: [
              /* @__PURE__ */ jsx("p", { className: "home-card-title", children: c.name }),
              /* @__PURE__ */ jsxs("p", { className: "home-card-date", children: [
                c.count,
                " film",
                c.count !== 1 ? "s" : "",
                " together"
              ] })
            ] })
          ]
        },
        i
      )) }),
      songs.length > 0 && /* @__PURE__ */ jsx(HomeRow, { title: "Songs", count: songs.length, children: songs.map((s, i) => /* @__PURE__ */ jsx(SongCard, { song: s }, i)) }),
      trailers.length > 0 && /* @__PURE__ */ jsx(HomeRow, { title: "Trailers", count: trailers.length, children: trailers.map((t, i) => /* @__PURE__ */ jsx(TrailerCard, { trailer: t }, i)) }),
      personNews.length > 0 && /* @__PURE__ */ jsx(HomeRow, { title: "Related News", count: personNews.length, children: personNews.map((n) => /* @__PURE__ */ jsx(NewsCard$1, { news: n, onClick: () => navigate(`/news/${n._id}`) }, n._id)) }),
      movies.length === 0 && /* @__PURE__ */ jsxs("div", { className: "home-empty", children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎬" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "No films linked to ",
          person.name,
          " yet."
        ] })
      ] })
    ] })
  ] });
}
const CATS = ["All", "Update", "Release", "Trailer", "Song", "Award", "Interview", "Review", "Event", "Announcement", "Other"];
const PER_PAGE$1 = 24;
const CAT_META$1 = {
  Interview: { color: "#e07b39", bg: "rgba(224,123,57,.13)", icon: "🎙️" },
  Trailer: { color: "#3a86ff", bg: "rgba(58,134,255,.13)", icon: "🎬" },
  Release: { color: "#2ec4b6", bg: "rgba(46,196,182,.13)", icon: "🎉" },
  Song: { color: "#9b5de5", bg: "rgba(155,93,229,.13)", icon: "🎵" },
  Award: { color: "#f7b731", bg: "rgba(247,183,49,.13)", icon: "🏆" },
  Update: { color: "#c9973a", bg: "rgba(201,151,58,.13)", icon: "📢" },
  Announcement: { color: "#c9973a", bg: "rgba(201,151,58,.13)", icon: "📣" },
  Review: { color: "#4caf82", bg: "rgba(76,175,130,.13)", icon: "⭐" },
  Event: { color: "#ff6b6b", bg: "rgba(255,107,107,.13)", icon: "📅" },
  Other: { color: "#888", bg: "rgba(136,136,136,.1)", icon: "📰" }
};
const cm = (c) => CAT_META$1[c] || CAT_META$1.Other;
const fmtShort = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtLong = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const CSS$5 = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');

.np { --gold:#c9973a; --border:rgba(255,255,255,.08); --muted:#888; font-family:'DM Sans',sans-serif; padding:0 0 80px; }

/* ── masthead ── */
.np-mast {
  position:relative; overflow:hidden;
  padding:52px 28px 40px; margin-bottom:0;
  background:linear-gradient(135deg,rgba(20,14,2,.0) 0%,rgba(201,151,58,.06) 100%);
  border-bottom:1px solid rgba(201,151,58,.12);
}
.np-mast::before {
  content:""; position:absolute; top:-60px; right:-80px;
  width:360px; height:360px; border-radius:50%;
  background:radial-gradient(circle,rgba(201,151,58,.08) 0%,transparent 70%);
  pointer-events:none;
}
.np-mast-inner { max-width:1400px; margin:0 auto; position:relative; z-index:1; }
.np-mast-row { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:20px; }
.np-eyebrow { font-size:.6rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; display:flex; align-items:center; gap:8px; }
.np-eyebrow::after { content:""; flex:1; max-width:60px; height:1px; background:rgba(201,151,58,.35); }
.np-mast h1 { font-family:'Playfair Display',serif; font-size:clamp(2rem,5vw,3.2rem); font-weight:900; margin:0; line-height:1.08; letter-spacing:-.02em; }
.np-mast-sub { font-size:.84rem; color:var(--muted); margin-top:8px; line-height:1.5; }
.np-mast-stats { display:flex; gap:16px; flex-wrap:wrap; }
.np-stat-pill { display:flex; flex-direction:column; align-items:center; background:rgba(201,151,58,.08); border:1px solid rgba(201,151,58,.18); border-radius:12px; padding:12px 20px; min-width:90px; }
.np-stat-num { font-size:1.4rem; font-weight:900; color:var(--gold); line-height:1; }
.np-stat-label { font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-top:4px; }

/* ── sticky toolbar ── */
.np-toolbar-wrap {
  position:sticky; top:58px; z-index:100;
  background:rgba(10,8,2,.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,.06);
  padding:12px 28px;
}
.np-toolbar { max-width:1400px; margin:0 auto; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.np-search-wrap { position:relative; flex:1; min-width:200px; max-width:320px; }
.np-search-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:.82rem; color:var(--muted); pointer-events:none; }
.np-search {
  width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
  border-radius:10px; padding:9px 14px 9px 34px; color:#fff; font-size:.84rem;
  font-family:inherit; outline:none; transition:border .2s,background .2s; box-sizing:border-box;
}
.np-search:focus { border-color:rgba(201,151,58,.5); background:rgba(255,255,255,.09); }
.np-search::placeholder { color:rgba(255,255,255,.3); }
.np-cats { display:flex; gap:6px; flex-wrap:wrap; flex:1; }
.np-cat { display:flex; align-items:center; gap:4px; padding:6px 13px; border-radius:20px; border:1px solid rgba(255,255,255,.1); background:transparent; color:rgba(255,255,255,.55); font-size:.73rem; font-weight:700; cursor:pointer; transition:all .15s; font-family:inherit; white-space:nowrap; }
.np-cat:hover { border-color:rgba(201,151,58,.4); color:#fff; background:rgba(255,255,255,.05); }
.np-cat.on { background:var(--gold); color:#000; border-color:var(--gold); }
.np-result-info { font-size:.74rem; color:var(--muted); white-space:nowrap; margin-left:auto; }

/* ── main content ── */
.np-content { max-width:1400px; margin:0 auto; padding:32px 28px 0; }

/* ── hero story ── */
.np-hero {
  display:grid; grid-template-columns:1fr;
  border-radius:20px; overflow:hidden; cursor:pointer;
  margin-bottom:40px; position:relative;
  box-shadow:0 24px 60px rgba(0,0,0,.5);
  transition:transform .25s,box-shadow .25s;
  border:1px solid rgba(255,255,255,.07);
}
@media(min-width:720px){ .np-hero { grid-template-columns:3fr 2fr; } }
.np-hero:hover { transform:translateY(-4px); box-shadow:0 32px 72px rgba(0,0,0,.6); }
.np-hero-visual { position:relative; min-height:280px; overflow:hidden; background:#111; }
@media(min-width:720px){ .np-hero-visual { min-height:400px; } }
.np-hero-visual img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s; }
.np-hero:hover .np-hero-visual img { transform:scale(1.04); }
.np-hero-visual-ph { width:100%; height:100%; min-height:280px; display:flex; align-items:center; justify-content:center; font-size:5rem; background:linear-gradient(135deg,#1a1200,#0f0a00); }
.np-hero-overlay { position:absolute; inset:0; background:linear-gradient(to right,transparent 40%,rgba(12,8,0,.97)); }
@media(max-width:719px){ .np-hero-overlay { background:linear-gradient(to top,rgba(12,8,0,.96) 0%,transparent 55%); } }
.np-hero-body {
  padding:36px 32px; display:flex; flex-direction:column; justify-content:center; gap:14px;
  background:linear-gradient(135deg,#0f0a00,#1a1200);
}
@media(max-width:719px){ .np-hero-body { padding:20px 20px 28px; } }
.np-hero-eyebrow { font-size:.58rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:rgba(201,151,58,.7); }
.np-hero-title { font-family:'Playfair Display',serif; font-size:clamp(1.1rem,2.5vw,1.7rem); font-weight:900; line-height:1.25; margin:0; color:#fff; }
.np-hero-excerpt { font-size:.82rem; color:rgba(255,255,255,.58); line-height:1.68; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
.np-hero-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.np-hero-cta { margin-top:4px; font-size:.78rem; font-weight:700; color:var(--gold); display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(201,151,58,.3); border-radius:20px; padding:7px 16px; width:fit-content; transition:background .15s; }
.np-hero-cta:hover { background:rgba(201,151,58,.1); }

/* ── section divider ── */
.np-sec-div { display:flex; align-items:center; gap:14px; margin:0 0 24px; }
.np-sec-div::before,.np-sec-div::after { content:""; flex:1; height:1px; background:rgba(255,255,255,.07); }
.np-sec-div-label { font-size:.62rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); white-space:nowrap; padding:0 4px; }

/* ── masonry-style grid ── */
.np-grid { columns:1; gap:20px; }
@media(min-width:580px){ .np-grid { columns:2; } }
@media(min-width:900px){ .np-grid { columns:3; } }
@media(min-width:1200px){ .np-grid { columns:4; } }
.np-grid .np-card { break-inside:avoid; margin-bottom:20px; }

/* ── news card ── */
.np-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
  border-radius:14px; overflow:hidden; cursor:pointer;
  transition:transform .2s,border-color .2s,box-shadow .2s;
  display:flex; flex-direction:column;
}
.np-card:hover { transform:translateY(-5px); border-color:rgba(201,151,58,.4); box-shadow:0 16px 40px rgba(0,0,0,.45); }
.np-card-img { position:relative; overflow:hidden; background:#111; }
.np-card-img.ratio169 { aspect-ratio:16/9; }
.np-card-img img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .35s; }
.np-card:hover .np-card-img img { transform:scale(1.06); }
.np-card-img-ph { width:100%; aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; font-size:2rem; color:rgba(255,255,255,.2); background:linear-gradient(135deg,#111,#1a1200); }
.np-card-badge { position:absolute; top:10px; left:10px; font-size:.58rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:10px; border:1px solid transparent; backdrop-filter:blur(4px); }
.np-card-body { padding:14px 16px 16px; flex:1; display:flex; flex-direction:column; gap:8px; }
.np-card-title { font-weight:800; font-size:.9rem; line-height:1.42; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; color:#fff; }
.np-card-excerpt { font-size:.75rem; color:rgba(255,255,255,.5); line-height:1.6; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1; }
.np-card-foot { display:flex; align-items:center; gap:6px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06); margin-top:auto; }
.np-card-movie { font-size:.67rem; color:var(--gold); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:55%; flex:1; }
.np-card-date { font-size:.64rem; color:var(--muted); white-space:nowrap; flex-shrink:0; }
.np-card-src { font-size:.6rem; color:var(--muted); text-decoration:none; border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:1px 6px; transition:color .12s,border-color .12s; flex-shrink:0; }
.np-card-src:hover { color:var(--gold); border-color:rgba(201,151,58,.4); }

/* ── pagination ── */
.np-pagination { display:flex; align-items:center; justify-content:center; gap:6px; padding:44px 0 8px; flex-wrap:wrap; }
.np-pg-btn { min-width:38px; height:38px; padding:0 10px; border-radius:9px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05); color:rgba(255,255,255,.7); font-size:.82rem; font-weight:700; cursor:pointer; transition:all .15s; font-family:inherit; display:flex; align-items:center; justify-content:center; }
.np-pg-btn:hover:not(:disabled) { border-color:rgba(201,151,58,.5); background:rgba(201,151,58,.1); color:var(--gold); }
.np-pg-btn.active { background:var(--gold); color:#000; border-color:var(--gold); }
.np-pg-btn:disabled { opacity:.3; cursor:default; }
.np-pg-dots { color:rgba(255,255,255,.3); font-size:.9rem; padding:0 4px; }
.np-pg-info { font-size:.72rem; color:var(--muted); margin-left:8px; }

/* ── empty ── */
.np-empty { text-align:center; padding:80px 20px; }
.np-empty-icon { font-size:3.5rem; margin-bottom:18px; }
.np-empty h3 { font-size:1.1rem; margin:0 0 8px; font-weight:800; }
.np-empty p { font-size:.84rem; color:var(--muted); }

/* ── skeleton ── */
.np-skel-grid { columns:1; gap:20px; }
@media(min-width:580px){ .np-skel-grid { columns:2; } }
@media(min-width:900px){ .np-skel-grid { columns:3; } }
@media(min-width:1200px){ .np-skel-grid { columns:4; } }
.np-skel-card { break-inside:avoid; border-radius:14px; overflow:hidden; margin-bottom:20px; }

/* ── load-more btn ── */
.np-load-more { display:flex; justify-content:center; padding:32px 0 0; }
.np-load-more button { padding:12px 32px; border-radius:10px; border:1px solid rgba(201,151,58,.35); background:rgba(201,151,58,.08); color:var(--gold); font-size:.86rem; font-weight:700; cursor:pointer; transition:all .18s; font-family:inherit; }
.np-load-more button:hover { background:rgba(201,151,58,.18); border-color:var(--gold); }
.np-load-more button:disabled { opacity:.5; cursor:not-allowed; }
`;
function CatBadge({ cat, style = {} }) {
  const m = cm(cat);
  return /* @__PURE__ */ jsxs("span", { style: {
    fontSize: ".58rem",
    fontWeight: 800,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    padding: "3px 9px",
    borderRadius: 10,
    background: m.bg,
    color: m.color,
    border: `1px solid ${m.color}33`,
    ...style
  }, children: [
    m.icon,
    " ",
    cat || "Update"
  ] });
}
function HeroCard({ n, onClick }) {
  const [broken, setBroken] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "np-hero", onClick: () => onClick(n._id), children: [
    /* @__PURE__ */ jsxs("div", { className: "np-hero-visual", children: [
      n.imageUrl && !broken ? /* @__PURE__ */ jsx("img", { src: n.imageUrl, alt: n.title, loading: "eager", onError: () => setBroken(true) }) : /* @__PURE__ */ jsx("div", { className: "np-hero-visual-ph", children: "📰" }),
      /* @__PURE__ */ jsx("div", { className: "np-hero-overlay" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "np-hero-body", children: [
      /* @__PURE__ */ jsx("span", { className: "np-hero-eyebrow", children: "Featured Story" }),
      /* @__PURE__ */ jsx(CatBadge, { cat: n.category }),
      /* @__PURE__ */ jsx("h2", { className: "np-hero-title", children: n.title }),
      n.content && /* @__PURE__ */ jsx("p", { className: "np-hero-excerpt", children: n.content }),
      /* @__PURE__ */ jsxs("div", { className: "np-hero-meta", children: [
        n.movieTitle && /* @__PURE__ */ jsxs("span", { style: { fontSize: ".72rem", color: "var(--gold)", fontWeight: 600 }, children: [
          "🎬 ",
          n.movieTitle
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "rgba(255,255,255,.4)", marginLeft: "auto" }, children: fmtLong(n.createdAt) })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "np-hero-cta", children: "Read Full Article →" })
    ] })
  ] });
}
function NewsCard({ n, onClick }) {
  const [broken, setBroken] = useState(false);
  const m = cm(n.category);
  return /* @__PURE__ */ jsxs("div", { className: "np-card", onClick: () => onClick(n._id), children: [
    /* @__PURE__ */ jsxs("div", { className: `np-card-img ratio169`, children: [
      n.imageUrl && !broken ? /* @__PURE__ */ jsx("img", { src: n.imageUrl, alt: n.title, loading: "lazy", decoding: "async", onError: () => setBroken(true) }) : /* @__PURE__ */ jsx("div", { className: "np-card-img-ph", children: "📰" }),
      /* @__PURE__ */ jsxs("span", { className: "np-card-badge", style: { background: m.bg, color: m.color, borderColor: `${m.color}33` }, children: [
        m.icon,
        " ",
        n.category || "Update"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "np-card-body", children: [
      /* @__PURE__ */ jsx("div", { className: "np-card-title", children: n.title }),
      n.content && /* @__PURE__ */ jsx("div", { className: "np-card-excerpt", children: n.content }),
      /* @__PURE__ */ jsxs("div", { className: "np-card-foot", children: [
        /* @__PURE__ */ jsx("span", { className: "np-card-movie", children: n.movieTitle ? `🎬 ${n.movieTitle}` : "" }),
        n.sourceUrl && /* @__PURE__ */ jsx(
          "a",
          {
            href: n.sourceUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "np-card-src",
            onClick: (e) => e.stopPropagation(),
            children: "Source ↗"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "np-card-date", children: fmtShort(n.createdAt) })
      ] })
    ] })
  ] });
}
function Pagination$1({ page, total, perPage, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = (p) => {
    onChange(p);
    scrollUp();
  };
  let lo = Math.max(1, page - 2), hi = Math.min(totalPages, page + 2);
  if (hi - lo < 4) {
    lo = Math.max(1, hi - 4);
    hi = Math.min(totalPages, lo + 4);
  }
  const pages = [];
  for (let i = lo; i <= hi; i++) pages.push(i);
  return /* @__PURE__ */ jsxs("div", { className: "np-pagination", children: [
    /* @__PURE__ */ jsx("button", { className: "np-pg-btn", disabled: page === 1, onClick: () => go(page - 1), children: "‹" }),
    lo > 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("button", { className: "np-pg-btn", onClick: () => go(1), children: "1" }),
      lo > 2 && /* @__PURE__ */ jsx("span", { className: "np-pg-dots", children: "…" })
    ] }),
    pages.map((p) => /* @__PURE__ */ jsx("button", { className: `np-pg-btn${p === page ? " active" : ""}`, onClick: () => go(p), children: p }, p)),
    hi < totalPages && /* @__PURE__ */ jsxs(Fragment, { children: [
      hi < totalPages - 1 && /* @__PURE__ */ jsx("span", { className: "np-pg-dots", children: "…" }),
      /* @__PURE__ */ jsx("button", { className: "np-pg-btn", onClick: () => go(totalPages), children: totalPages })
    ] }),
    /* @__PURE__ */ jsx("button", { className: "np-pg-btn", disabled: page === totalPages, onClick: () => go(page + 1), children: "›" }),
    /* @__PURE__ */ jsxs("span", { className: "np-pg-info", children: [
      (page - 1) * perPage + 1,
      "–",
      Math.min(page * perPage, total),
      " of ",
      total
    ] })
  ] });
}
function News() {
  const navigate = useNavigate();
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setLoading(true);
    API.getNews().then((data) => {
      setAllNews(Array.isArray(data) ? data : []);
    }).catch((e) => console.error("Failed to load news:", e)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setPage(1);
  }, [filter, search]);
  const filtered = allNews.filter((n) => {
    var _a, _b;
    const matchCat = filter === "All" || n.category === filter;
    const matchSearch = !search || ((_a = n.title) == null ? void 0 : _a.toLowerCase().includes(search.toLowerCase())) || ((_b = n.movieTitle) == null ? void 0 : _b.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const showHero = filter === "All" && !search && sorted.length > 0;
  const heroItem = showHero ? sorted[0] : null;
  const gridItems = showHero ? sorted.slice(1) : sorted;
  const totalGrid = gridItems.length;
  const paged = gridItems.slice((page - 1) * PER_PAGE$1, page * PER_PAGE$1);
  const catCounts = {};
  allNews.forEach((n) => {
    catCounts[n.category] = (catCounts[n.category] || 0) + 1;
  });
  const goTo = (id) => navigate(`/news/${id}`);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: CSS$5 }),
    /* @__PURE__ */ jsxs("div", { className: "np", children: [
      /* @__PURE__ */ jsx(SEO, { ...staticSEO.news }),
      /* @__PURE__ */ jsx("div", { className: "np-mast", children: /* @__PURE__ */ jsx("div", { className: "np-mast-inner", children: /* @__PURE__ */ jsxs("div", { className: "np-mast-row", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "np-eyebrow", children: "Ollipedia Film News" }),
          /* @__PURE__ */ jsxs("h1", { children: [
            "Odia Cinema",
            /* @__PURE__ */ jsx("br", {}),
            "News & Updates"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "np-mast-sub", children: "Stories, releases, trailers and exclusives from Ollywood" })
        ] }),
        !loading && allNews.length > 0 && /* @__PURE__ */ jsxs("div", { className: "np-mast-stats", children: [
          /* @__PURE__ */ jsxs("div", { className: "np-stat-pill", children: [
            /* @__PURE__ */ jsx("span", { className: "np-stat-num", children: allNews.length }),
            /* @__PURE__ */ jsx("span", { className: "np-stat-label", children: "Articles" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "np-stat-pill", children: [
            /* @__PURE__ */ jsx("span", { className: "np-stat-num", children: Object.keys(catCounts).length }),
            /* @__PURE__ */ jsx("span", { className: "np-stat-label", children: "Categories" })
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx("div", { className: "np-toolbar-wrap", children: /* @__PURE__ */ jsxs("div", { className: "np-toolbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "np-search-wrap", children: [
          /* @__PURE__ */ jsx("span", { className: "np-search-ico", children: "🔍" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "np-search",
              placeholder: "Search articles, movies…",
              value: search,
              onChange: (e) => setSearch(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "np-cats", children: CATS.filter((c) => c === "All" || catCounts[c] > 0).map((c) => /* @__PURE__ */ jsxs(
          "button",
          {
            className: `np-cat${filter === c ? " on" : ""}`,
            onClick: () => setFilter(c),
            children: [
              c !== "All" && /* @__PURE__ */ jsx("span", { children: cm(c).icon }),
              c,
              c !== "All" && catCounts[c] && /* @__PURE__ */ jsx("span", { style: { opacity: 0.6, fontWeight: 500, fontSize: ".68rem" }, children: catCounts[c] })
            ]
          },
          c
        )) }),
        (search || filter !== "All") && /* @__PURE__ */ jsxs("span", { className: "np-result-info", children: [
          filtered.length,
          " result",
          filtered.length !== 1 ? "s" : ""
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "np-content", children: loading ? /* @__PURE__ */ jsx("div", { className: "np-skel-grid", children: [...Array(12)].map((_, i) => /* @__PURE__ */ jsx("div", { className: "np-skel-card skeleton", style: { height: [280, 240, 300, 260, 220, 280, 240, 300, 260, 240, 280, 260][i] } }, i)) }) : sorted.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "np-empty", children: [
        /* @__PURE__ */ jsx("div", { className: "np-empty-icon", children: "📭" }),
        /* @__PURE__ */ jsx("h3", { children: search ? "No results found" : "No articles yet" }),
        /* @__PURE__ */ jsx("p", { children: search ? `No articles match "${search}". Try different keywords.` : "Check back soon for the latest news." }),
        (search || filter !== "All") && /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-outline",
            style: { marginTop: 16 },
            onClick: () => {
              setSearch("");
              setFilter("All");
            },
            children: "Clear filters"
          }
        )
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        heroItem && /* @__PURE__ */ jsx(HeroCard, { n: heroItem, onClick: goTo }),
        paged.length > 0 && /* @__PURE__ */ jsx("div", { className: "np-sec-div", children: /* @__PURE__ */ jsx("span", { className: "np-sec-div-label", children: filter !== "All" || search ? `${filtered.length} article${filtered.length !== 1 ? "s" : ""}` : "Latest Stories" }) }),
        /* @__PURE__ */ jsx("div", { className: "np-grid", children: paged.map((n) => /* @__PURE__ */ jsx(NewsCard, { n, onClick: goTo }, n._id)) }),
        /* @__PURE__ */ jsx(Pagination$1, { page, total: totalGrid, perPage: PER_PAGE$1, onChange: setPage })
      ] }) })
    ] })
  ] });
}
function SafeImg({ src, alt, style, className }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return /* @__PURE__ */ jsx(
    "img",
    {
      src,
      alt,
      style,
      className,
      loading: "lazy",
      decoding: "async",
      onError: () => setBroken(true)
    }
  );
}
const CAT_META = {
  Interview: { color: "#e07b39", bg: "rgba(224,123,57,.13)", icon: "🎙️" },
  Trailer: { color: "#3a86ff", bg: "rgba(58,134,255,.13)", icon: "🎬" },
  Release: { color: "#2ec4b6", bg: "rgba(46,196,182,.13)", icon: "🎉" },
  Song: { color: "#9b5de5", bg: "rgba(155,93,229,.13)", icon: "🎵" },
  Award: { color: "#f7b731", bg: "rgba(247,183,49,.13)", icon: "🏆" },
  Update: { color: "#c9973a", bg: "rgba(201,151,58,.13)", icon: "📢" },
  Announcement: { color: "#c9973a", bg: "rgba(201,151,58,.13)", icon: "📣" },
  Review: { color: "#4caf82", bg: "rgba(76,175,130,.13)", icon: "⭐" },
  Event: { color: "#ff6b6b", bg: "rgba(255,107,107,.13)", icon: "📅" },
  Other: { color: "#888", bg: "rgba(136,136,136,.1)", icon: "📰" }
};
const catMeta = (c) => CAT_META[c] || CAT_META.Other;
const fmtDate$3 = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDateL = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const verdictColor$1 = (v) => {
  if (!v) return "var(--gold)";
  const l = v.toLowerCase();
  if (["hit", "super hit", "blockbuster"].includes(l)) return "#4caf82";
  if (["flop", "disaster"].includes(l)) return "var(--red)";
  return "var(--gold)";
};
const CSS$4 = `
/* ══════════════════════════════════════
   NEWS DETAIL PAGE
══════════════════════════════════════ */
.nd-root { padding: 58px 0 72px; }

/* ── Back bar ── */
.nd-back-bar {
  max-width: 860px; margin: 0 auto;
  padding: 20px 24px 0;
}
.nd-back { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--muted); font-size:.8rem; font-weight:600; cursor:pointer; padding:0; transition:color .15s; font-family:inherit; }
.nd-back:hover { color:var(--gold); }

/* ── Hero image ── */
.nd-hero-wrap {
  max-width: 860px; margin: 20px auto 0;
  padding: 0 24px;
}
.nd-hero-img {
  width: 100%; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden;
  background: var(--bg2); box-shadow: 0 16px 48px rgba(0,0,0,.55);
  position: relative;
}
.nd-hero-img img { width:100%; height:100%; object-fit:cover; display:block; }

/* ── Article wrapper ── */
.nd-article {
  max-width: 860px; margin: 0 auto;
  padding: 28px 24px 0;
}

/* ── Meta row ── */
.nd-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
.nd-cat-badge { display:inline-flex; align-items:center; gap:5px; font-size:.62rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; padding:4px 11px; border-radius:12px; border:1px solid transparent; }
.nd-movie-link { display:inline-flex; align-items:center; gap:5px; font-size:.78rem; color:var(--gold); font-weight:700; text-decoration:none; background:rgba(201,151,58,.09); border:1px solid rgba(201,151,58,.2); padding:4px 11px; border-radius:20px; transition:background .15s; }
.nd-movie-link:hover { background:rgba(201,151,58,.18); }
.nd-date { font-size:.74rem; color:var(--muted); margin-left:auto; }

/* ── Headline ── */
.nd-headline {
  font-family:'Playfair Display',serif;
  font-size: clamp(1.5rem, 4.5vw, 2.4rem);
  font-weight: 900; line-height: 1.18; margin: 0 0 20px; color:var(--text);
}

/* ── Divider ── */
.nd-divider { height:1px; background:rgba(255,255,255,.07); margin:0 0 28px; }

/* ── Body text ── */
.nd-body { font-size:.96rem; line-height:1.85; color:rgba(255,255,255,.82); }
.nd-body p { margin:0 0 20px; }
.nd-body p:last-child { margin-bottom:0; }

/* ── Source link ── */
.nd-source-row { margin-top:28px; padding:14px 18px; background:var(--bg2); border:1px solid rgba(255,255,255,.07); border-radius:10px; display:flex; align-items:center; gap:12px; }
.nd-source-row .label { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
.nd-source-row a { font-size:.82rem; color:var(--gold); text-decoration:none; font-weight:600; }
.nd-source-row a:hover { text-decoration:underline; }

/* ── Share row ── */
.nd-share-row { margin-top:24px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.nd-share-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
.nd-share-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:20px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text); font-size:.75rem; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; text-decoration:none; }
.nd-share-btn:hover { border-color:rgba(201,151,58,.4); background:rgba(201,151,58,.07); color:var(--gold); }
.nd-share-btn.copied { background:rgba(76,175,130,.12); border-color:rgba(76,175,130,.35); color:#4caf82; }

/* ── Sections below article ── */
.nd-sections { max-width:860px; margin:0 auto; padding:0 24px; }
.nd-sec { margin-top:48px; }
.nd-sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.07); }
.nd-sec-title { font-size:.96rem; font-weight:800; margin:0; }

/* ── Related movie card ── */
.nd-movie-card {
  display:flex; gap:16px; align-items:center;
  background:var(--bg2); border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:16px; cursor:pointer;
  transition:border-color .18s, transform .18s;
}
.nd-movie-card:hover { border-color:rgba(201,151,58,.4); transform:translateX(4px); }
.nd-movie-poster { width:72px; height:100px; border-radius:8px; overflow:hidden; background:var(--bg3); flex-shrink:0; position:relative; }
.nd-movie-poster img { width:100%; height:100%; object-fit:cover; display:block; }
.nd-movie-poster .ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.8rem; }
.nd-movie-info { flex:1; min-width:0; }
.nd-movie-title { font-weight:800; font-size:1rem; margin-bottom:6px; }
.nd-movie-prod { font-size:.74rem; color:var(--muted); margin-bottom:8px; }
.nd-movie-badges { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.nd-movie-badge { font-size:.62rem; font-weight:700; padding:2px 8px; border-radius:8px; background:rgba(255,255,255,.07); color:var(--muted); }
.nd-movie-release { font-size:.74rem; color:var(--muted); }
.nd-movie-arrow { font-size:1.2rem; color:var(--muted); flex-shrink:0; }

/* ── Related news grid ── */
.nd-related-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
.nd-rel-card { background:var(--bg2); border:1px solid rgba(255,255,255,.07); border-radius:12px; overflow:hidden; cursor:pointer; transition:transform .18s,border-color .18s; display:flex; flex-direction:column; }
.nd-rel-card:hover { transform:translateY(-3px); border-color:rgba(201,151,58,.35); }
.nd-rel-img { aspect-ratio:16/9; overflow:hidden; background:var(--bg3); position:relative; }
.nd-rel-img img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
.nd-rel-card:hover .nd-rel-img img { transform:scale(1.04); }
.nd-rel-img .ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:var(--muted); }
.nd-rel-body { padding:12px 14px 14px; flex:1; display:flex; flex-direction:column; gap:6px; }
.nd-rel-title { font-weight:700; font-size:.84rem; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.nd-rel-foot { display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:8px; border-top:1px solid rgba(255,255,255,.05); }
.nd-rel-movie { font-size:.65rem; color:var(--gold); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%; }
.nd-rel-date { font-size:.63rem; color:var(--muted); flex-shrink:0; }

/* ── Loading skeleton ── */
.nd-skeleton-hero { height:420px; border-radius:16px; margin:20px 0 28px; }
`;
function RelCard({ n, onClick }) {
  const [broken, setBroken] = useState(false);
  const m = catMeta(n.category);
  return /* @__PURE__ */ jsxs("div", { className: "nd-rel-card", onClick: () => onClick(n._id), children: [
    /* @__PURE__ */ jsxs("div", { className: "nd-rel-img", children: [
      n.imageUrl && !broken ? /* @__PURE__ */ jsx("img", { src: n.imageUrl, alt: n.title, onError: () => setBroken(true) }) : /* @__PURE__ */ jsx("div", { className: "ph", children: "📰" }),
      /* @__PURE__ */ jsxs("span", { style: { position: "absolute", top: 8, left: 8, fontSize: ".56rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 9, background: m.bg, color: m.color, border: `1px solid ${m.color}33` }, children: [
        m.icon,
        " ",
        n.category || "Update"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "nd-rel-body", children: [
      /* @__PURE__ */ jsx("div", { className: "nd-rel-title", children: n.title }),
      /* @__PURE__ */ jsxs("div", { className: "nd-rel-foot", children: [
        /* @__PURE__ */ jsx("span", { className: "nd-rel-movie", children: n.movieTitle ? `🎬 ${n.movieTitle}` : "" }),
        /* @__PURE__ */ jsx("span", { className: "nd-rel-date", children: fmtDate$3(n.createdAt) })
      ] })
    ] })
  ] });
}
function NewsDetail() {
  var _a, _b;
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [allNews, setAllNews] = useState(() => Cache.peek("news") || []);
  useEffect(() => {
    if (!id) {
      setError("Invalid article ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
    setError(null);
    API.getNewsItem(id).then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      setError("Article not found");
      setLoading(false);
    });
    window.scrollTo(0, 0);
  }, [id]);
  useEffect(() => {
    if (Cache.peek("news")) {
      setAllNews(Cache.peek("news"));
      return;
    }
    Cache.getNews().then(setAllNews).catch(() => {
    });
  }, []);
  const handleCopy = () => {
    var _a2;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: data == null ? void 0 : data.title, url }).catch(() => {
      });
    } else {
      (_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(url).catch(() => {
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };
  if (loading) return /* @__PURE__ */ jsxs("div", { className: "nd-root", children: [
    /* @__PURE__ */ jsx("style", { children: CSS$4 }),
    /* @__PURE__ */ jsx("div", { className: "nd-back-bar", children: /* @__PURE__ */ jsx("button", { className: "nd-back", onClick: () => navigate("/news"), children: "← All News" }) }),
    /* @__PURE__ */ jsx("div", { className: "nd-hero-wrap", children: /* @__PURE__ */ jsx("div", { className: "skeleton nd-skeleton-hero" }) }),
    /* @__PURE__ */ jsxs("div", { className: "nd-article", children: [
      /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 22, width: "40%", borderRadius: 6, marginBottom: 18 } }),
      /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 44, width: "85%", borderRadius: 6, marginBottom: 14 } }),
      /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 44, width: "65%", borderRadius: 6, marginBottom: 28 } }),
      [...Array(5)].map((_, i) => /* @__PURE__ */ jsx("div", { className: "skeleton", style: { height: 16, width: `${[100, 95, 88, 100, 72][i]}%`, borderRadius: 4, marginBottom: 10 } }, i))
    ] })
  ] });
  if (error || !data) return /* @__PURE__ */ jsxs("div", { className: "nd-root", children: [
    /* @__PURE__ */ jsx("style", { children: CSS$4 }),
    /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "80px 24px" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 16 }, children: "📭" }),
      /* @__PURE__ */ jsx("h2", { style: { marginBottom: 8 }, children: "Article not found" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", marginBottom: 24 }, children: "This article may have been removed or the link is incorrect." }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-outline", onClick: () => navigate("/news"), children: "← Back to News" })
    ] })
  ] });
  const related = allNews.filter((n) => String(n._id) !== String(id)).filter(
    (n) => data.movieId && n.movieId && String(n.movieId) === String(data.movieId) || n.category === data.category
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const movie = data.movie || null;
  const m = catMeta(data.category);
  const paragraphs = (data.content || "").split("\n").filter(Boolean);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: CSS$4 }),
    /* @__PURE__ */ jsxs("div", { className: "nd-root", children: [
      data && /* @__PURE__ */ jsx(SEO, { ...newsItemSEO(data) }),
      /* @__PURE__ */ jsx("div", { className: "nd-back-bar", children: /* @__PURE__ */ jsx("button", { className: "nd-back", onClick: () => navigate(-1), children: "← Back" }) }),
      data.imageUrl && /* @__PURE__ */ jsx("div", { className: "nd-hero-wrap", children: /* @__PURE__ */ jsx("div", { className: "nd-hero-img", children: /* @__PURE__ */ jsx(SafeImg, { src: data.imageUrl, alt: data.title, style: { width: "100%", height: "100%", objectFit: "cover" } }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "nd-article", children: [
        /* @__PURE__ */ jsxs("div", { className: "nd-meta", children: [
          /* @__PURE__ */ jsxs("span", { className: "nd-cat-badge", style: { background: m.bg, color: m.color, borderColor: `${m.color}33` }, children: [
            m.icon,
            " ",
            data.category || "Update"
          ] }),
          data.movieTitle && data.movieId && /* @__PURE__ */ jsxs(Link, { to: `/movie/${data.movieId}`, className: "nd-movie-link", onClick: (e) => e.stopPropagation(), children: [
            "🎬 ",
            data.movieTitle
          ] }),
          /* @__PURE__ */ jsx("span", { className: "nd-date", children: fmtDateL(data.createdAt) })
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "nd-headline", children: data.title }),
        /* @__PURE__ */ jsx("div", { className: "nd-divider" }),
        /* @__PURE__ */ jsx("div", { className: "nd-body", children: paragraphs.length > 0 ? paragraphs.map((p, i) => /* @__PURE__ */ jsx("p", { children: p }, i)) : /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontStyle: "italic" }, children: "No content available for this article." }) }),
        data.sourceUrl && /* @__PURE__ */ jsxs("div", { className: "nd-source-row", children: [
          /* @__PURE__ */ jsx("span", { className: "label", children: "Source" }),
          /* @__PURE__ */ jsxs("a", { href: data.sourceUrl, target: "_blank", rel: "noopener noreferrer", children: [
            (() => {
              try {
                return new URL(data.sourceUrl).hostname.replace("www.", "");
              } catch {
                return "View Source";
              }
            })(),
            " ↗"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "nd-share-row", children: [
          /* @__PURE__ */ jsx("span", { className: "nd-share-label", children: "Share" }),
          /* @__PURE__ */ jsx("button", { className: `nd-share-btn${copied ? " copied" : ""}`, onClick: handleCopy, children: copied ? "✅ Copied!" : "🔗 Copy Link" }),
          /* @__PURE__ */ jsx(
            "a",
            {
              className: "nd-share-btn",
              href: `https://wa.me/?text=${encodeURIComponent(`${data.title} — ${window.location.href}`)}`,
              target: "_blank",
              rel: "noopener noreferrer",
              children: "📱 WhatsApp"
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              className: "nd-share-btn",
              href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title)}&url=${encodeURIComponent(window.location.href)}`,
              target: "_blank",
              rel: "noopener noreferrer",
              children: "🐦 Tweet"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "nd-sections", children: [
        movie && /* @__PURE__ */ jsxs("div", { className: "nd-sec", children: [
          /* @__PURE__ */ jsxs("div", { className: "nd-sec-head", children: [
            /* @__PURE__ */ jsx("h2", { className: "nd-sec-title", children: "🎬 About the Film" }),
            /* @__PURE__ */ jsx(Link, { to: `/movie/${movie._id}`, className: "btn btn-ghost btn-sm", style: { fontSize: ".74rem" }, children: "View Full Page →" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "nd-movie-card", onClick: () => navigate(`/movie/${movie._id}`), children: [
            /* @__PURE__ */ jsx("div", { className: "nd-movie-poster", children: movie.posterUrl || movie.thumbnailUrl ? /* @__PURE__ */ jsx("img", { src: movie.posterUrl || movie.thumbnailUrl, alt: movie.title }) : /* @__PURE__ */ jsx("div", { className: "ph", children: "🎬" }) }),
            /* @__PURE__ */ jsxs("div", { className: "nd-movie-info", children: [
              /* @__PURE__ */ jsx("div", { className: "nd-movie-title", children: movie.title }),
              ((_a = movie.productionId) == null ? void 0 : _a.name) && /* @__PURE__ */ jsx("div", { className: "nd-movie-prod", children: movie.productionId.name }),
              /* @__PURE__ */ jsxs("div", { className: "nd-movie-badges", children: [
                (_b = movie.genre) == null ? void 0 : _b.slice(0, 3).map((g) => /* @__PURE__ */ jsx("span", { className: "nd-movie-badge", children: g }, g)),
                movie.verdict && /* @__PURE__ */ jsx("span", { className: "nd-movie-badge", style: { color: verdictColor$1(movie.verdict), background: `${verdictColor$1(movie.verdict)}18` }, children: movie.verdict })
              ] }),
              movie.releaseDate && /* @__PURE__ */ jsxs("div", { className: "nd-movie-release", children: [
                "📅 ",
                fmtDate$3(movie.releaseDate)
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "nd-movie-arrow", children: "›" })
          ] })
        ] }),
        related.length > 0 && /* @__PURE__ */ jsxs("div", { className: "nd-sec", children: [
          /* @__PURE__ */ jsxs("div", { className: "nd-sec-head", children: [
            /* @__PURE__ */ jsx("h2", { className: "nd-sec-title", children: "📰 Related News" }),
            /* @__PURE__ */ jsx(Link, { to: "/news", className: "btn btn-ghost btn-sm", style: { fontSize: ".74rem" }, children: "All News →" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "nd-related-grid", children: related.map((n) => /* @__PURE__ */ jsx(RelCard, { n, onClick: (nid) => navigate(`/news/${nid}`) }, n._id)) })
        ] })
      ] })
    ] })
  ] });
}
function Register({ onSuccess, onToast }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    logo: "",
    bio: "",
    founded: "",
    website: "",
    location: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords don't match");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    setError("");
    setLoading(true);
    try {
      const { token, production } = await API.register({
        name: form.name,
        email: form.email,
        password: form.password,
        logo: form.logo,
        bio: form.bio,
        founded: form.founded,
        website: form.website,
        location: form.location
      });
      setToken(token);
      onSuccess(production);
      onToast && onToast(`Welcome to Ollipedia, ${production.name}!`);
      navigate("/dashboard");
    } catch (e2) {
      setError(typeof e2 === "string" ? e2 : "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "register-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "register-header", children: [
      /* @__PURE__ */ jsx("h1", { children: "Register Your Production" }),
      /* @__PURE__ */ jsx("p", { children: "Join Ollipedia to add and manage your Ollywood films." }),
      /* @__PURE__ */ jsxs("p", { style: { marginTop: 8, fontSize: "0.85rem", color: "var(--muted)" }, children: [
        "Already registered? ",
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { display: "inline", padding: "0 4px" }, onClick: () => navigate(-1), children: "Login" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "register-card", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Production Company Name *" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", required: true, value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. Tarang Cine Productions" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Email *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "email", required: true, value: form.email, onChange: (e) => set("email", e.target.value), placeholder: "contact@yourproduction.com" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Location" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.location, onChange: (e) => set("location", e.target.value), placeholder: "e.g. Bhubaneswar, Odisha" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Password * (min 6 chars)" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", required: true, value: form.password, onChange: (e) => set("password", e.target.value), placeholder: "••••••••" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Confirm Password *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", required: true, value: form.confirm, onChange: (e) => set("confirm", e.target.value), placeholder: "••••••••" }),
          form.confirm && form.password !== form.confirm && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.75rem", marginTop: 4 }, children: "Passwords don't match" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("hr", { className: "divider" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.82rem", marginBottom: 16 }, children: "Optional — you can fill these later from your dashboard." }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Logo URL" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.logo, onChange: (e) => set("logo", e.target.value), placeholder: "https://…" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Founded Year" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.founded, onChange: (e) => set("founded", e.target.value), placeholder: "e.g. 2010" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Website" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.website, onChange: (e) => set("website", e.target.value), placeholder: "https://…" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "About Your Production" }),
        /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.bio, onChange: (e) => set("bio", e.target.value), placeholder: "Brief description of your production company…" })
      ] }),
      error && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.85rem", marginBottom: 12, padding: "10px 14px", background: "rgba(217,79,61,0.1)", borderRadius: 4 }, children: error }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold", type: "submit", disabled: loading, style: { width: "100%", padding: "12px" }, children: loading ? "Creating account…" : "🎬 Create Production Account" })
    ] }) })
  ] });
}
function ProductionProfile({ production: currentProd }) {
  const { id } = useParams();
  const [prod, setProd] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([API.getProduction(id), API.getProductionMovies(id)]).then(([p, m]) => {
      setProd(p);
      setMovies(m);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);
  if (loading) return /* @__PURE__ */ jsx("div", { className: "page empty-state", children: /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)" }, children: "Loading…" }) });
  if (!prod) return /* @__PURE__ */ jsx("div", { className: "page empty-state", children: /* @__PURE__ */ jsx("h3", { children: "Production not found" }) });
  const isOwner = currentProd && String(currentProd._id) === String(id);
  const myMovies = movies.filter((m) => {
    var _a;
    return String((_a = m.productionId) == null ? void 0 : _a._id) === String(id);
  });
  const collabMovies = movies.filter((m) => {
    var _a;
    return String((_a = m.productionId) == null ? void 0 : _a._id) !== String(id);
  });
  return /* @__PURE__ */ jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxs("div", { className: "prod-hero", children: [
      /* @__PURE__ */ jsx("div", { className: "prod-hero-banner", children: /* @__PURE__ */ jsx(SafeImg$3, { src: prod.banner, alt: "Banner", className: "prod-hero-banner-img" }) }),
      /* @__PURE__ */ jsxs("div", { className: "prod-hero-body", children: [
        /* @__PURE__ */ jsx("div", { className: "prod-logo-wrap", children: /* @__PURE__ */ jsx(
          SafeImg$3,
          {
            src: prod.logo,
            alt: prod.name,
            className: "prod-logo",
            fallback: /* @__PURE__ */ jsx("div", { className: "prod-logo-placeholder", children: prod.name[0] })
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "prod-hero-info", children: [
          /* @__PURE__ */ jsx("h1", { className: "prod-name", children: prod.name }),
          /* @__PURE__ */ jsxs("div", { className: "prod-meta", children: [
            prod.location && /* @__PURE__ */ jsxs("span", { children: [
              "📍 ",
              prod.location
            ] }),
            prod.founded && /* @__PURE__ */ jsxs("span", { children: [
              "📅 Est. ",
              prod.founded
            ] }),
            prod.website && /* @__PURE__ */ jsx("a", { href: prod.website, target: "_blank", rel: "noreferrer", children: "🌐 Website" })
          ] }),
          prod.bio && /* @__PURE__ */ jsx("p", { className: "prod-bio", children: prod.bio })
        ] }),
        isOwner && /* @__PURE__ */ jsx("div", { className: "prod-hero-actions", children: /* @__PURE__ */ jsx(Link, { to: "/dashboard", className: "btn btn-gold btn-sm", children: "⚙ My Dashboard" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "prod-stats", children: [
      /* @__PURE__ */ jsxs("div", { className: "prod-stat", children: [
        /* @__PURE__ */ jsx("div", { className: "prod-stat-val", children: myMovies.length }),
        /* @__PURE__ */ jsx("div", { className: "prod-stat-label", children: "Films" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "prod-stat", children: [
        /* @__PURE__ */ jsx("div", { className: "prod-stat-val", children: collabMovies.length }),
        /* @__PURE__ */ jsx("div", { className: "prod-stat-label", children: "Collaborations" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "prod-stat", children: [
        /* @__PURE__ */ jsx("div", { className: "prod-stat-val", children: [...new Set(movies.flatMap((m) => m.cast || []).map((c) => String(c.castId)))].length }),
        /* @__PURE__ */ jsx("div", { className: "prod-stat-label", children: "Cast" })
      ] })
    ] }),
    myMovies.length > 0 && /* @__PURE__ */ jsxs("div", { className: "section", children: [
      /* @__PURE__ */ jsx("div", { className: "section-header", children: /* @__PURE__ */ jsxs("span", { className: "section-title", children: [
        "Films by ",
        prod.name
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "movie-grid", children: myMovies.map((m) => /* @__PURE__ */ jsx(MovieCard$3, { movie: m }, m._id)) })
    ] }),
    collabMovies.length > 0 && /* @__PURE__ */ jsxs("div", { className: "section", children: [
      /* @__PURE__ */ jsx("div", { className: "section-header", children: /* @__PURE__ */ jsx("span", { className: "section-title", children: "Collaborations" }) }),
      /* @__PURE__ */ jsx("div", { className: "movie-grid", children: collabMovies.map((m) => /* @__PURE__ */ jsx(MovieCard$3, { movie: m }, m._id)) })
    ] }),
    myMovies.length === 0 && collabMovies.length === 0 && /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("h3", { children: "No films yet" }),
      isOwner && /* @__PURE__ */ jsx(Link, { to: "/dashboard/add-movie", className: "btn btn-gold", style: { marginTop: 16 }, children: "+ Add Your First Movie" })
    ] })
  ] });
}
const extractYtId$4 = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb$2 = (id) => id ? `https://img.youtube.com/vi/${extractYtId$4(id) || id}/mqdefault.jpg` : null;
const fmtDate$2 = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const firstToken = (str) => (str || "").split(/[,&\/]/)[0].trim().toLowerCase();
const CSS$3 = `
/* ─ Song detail page ─ */
.sd-root { min-height:100vh; background:var(--bg); padding-top:58px; }
.sd-hero {
  position:relative; background:#0a0a0a; overflow:hidden;
  padding: 16px 0 0;
}
.sd-hero-bg {
  position:absolute; inset:0; background-size:cover; background-position:center;
  filter:blur(22px) brightness(.16); transform:scale(1.06);
}
.sd-hero-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(10,10,10,.98) 100%);
}
.sd-back {
  position:relative; z-index:3; padding:0 16px 8px;
}
@media(min-width:480px){ .sd-back { padding:0 24px 10px; } }
@media(min-width:768px){ .sd-back { padding:0 40px 10px; } }
.sd-back button {
  background:none; border:none; color:rgba(255,255,255,.55); cursor:pointer;
  font-size:.8rem; font-weight:600; padding:6px 0; display:flex; align-items:center; gap:5px;
  transition:color .18s;
}
.sd-back button:hover { color:var(--gold); }
/* Main grid: single col mobile, 2-col desktop */
.sd-grid {
  position:relative; z-index:3;
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
  padding:0 16px 32px;
  max-width:1380px;
}
@media(min-width:480px){ .sd-grid { padding:0 20px 36px; gap:18px; } }
@media(min-width:900px){
  .sd-grid {
    grid-template-columns:1fr 290px;
    gap:24px;
    padding:0 32px 48px;
  }
}
@media(min-width:1100px){
  .sd-grid { grid-template-columns:1fr 310px; padding:0 44px 52px; }
}
/* Player */
.sd-player {
  border-radius:10px; overflow:hidden;
  box-shadow:0 16px 50px rgba(0,0,0,.7);
  background:#000; aspect-ratio:16/9; margin-bottom:16px;
}
.sd-player iframe { width:100%; height:100%; border:none; display:block; }
/* Info card */
.sd-info-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:16px; margin-bottom:16px;
}
@media(min-width:480px){ .sd-info-card { padding:18px 20px; } }
.sd-badges { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.sd-song-title {
  font-family:'Playfair Display',serif;
  font-size:clamp(1.2rem,4vw,1.9rem); font-weight:900; margin:0 0 12px; line-height:1.15;
}
.sd-meta-row {
  display:flex; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05);
  align-items:center;
}
.sd-meta-label {
  font-size:.64rem; font-weight:700; color:var(--muted); text-transform:uppercase;
  letter-spacing:.08em; width:82px; flex-shrink:0;
}
.sd-meta-val { font-size:.84rem; flex:1; min-width:0; }
/* Playlist box */
.sd-playlist-box {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
  border-radius:10px; overflow:hidden;
}
.sd-playlist-header {
  padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.07);
  font-size:.62rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:var(--muted);
}
/* Sidebar — sticky on desktop */
.sd-sidebar {
  background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.07);
  border-radius:12px; overflow:hidden;
  /* On mobile: not sticky */
}
@media(min-width:900px){
  .sd-sidebar {
    position:sticky; top:70px; align-self:start;
    max-height:calc(100vh - 90px);
    display:flex; flex-direction:column;
  }
}
.sd-sidebar-head {
  padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,.07); flex-shrink:0;
}
.sd-sidebar-list { overflow-y:auto; flex:1; padding:6px; }
.sd-sidebar-footer { padding:10px 14px; border-top:1px solid rgba(255,255,255,.07); flex-shrink:0; }
/* Song item */
.sd-song-item {
  display:flex; gap:8px; align-items:center; padding:8px 10px;
  border-radius:7px; cursor:pointer; border:1px solid transparent;
  transition:background .14s;
}
.sd-song-item.active { background:rgba(201,151,58,.1); border-color:rgba(201,151,58,.28); }
.sd-song-item:not(.active):hover { background:rgba(255,255,255,.05); }
.sd-song-thumb {
  flex-shrink:0; width:50px; height:34px; border-radius:4px;
  overflow:hidden; background:var(--bg3); position:relative;
}
.sd-song-thumb img { width:100%; height:100%; object-fit:cover; }
.sd-song-icon {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:.75rem; font-weight:700;
}
.sd-song-name { font-weight:600; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-song-singer { font-size:.66rem; color:var(--muted); margin-top:1px; }
/* Sections below */
.sd-sections { padding:28px 0 60px; background:var(--bg); }
.sd-section { margin-bottom:8px; }
.sd-sec-head { display:flex; align-items:center; justify-content:space-between; padding:0 16px; margin-bottom:10px; }
@media(min-width:480px){ .sd-sec-head { padding:0 20px; } }
@media(min-width:768px){ .sd-sec-head { padding:0 28px; } }
.sd-sec-title { margin:0; font-size:.88rem; font-weight:800; }
@media(min-width:480px){ .sd-sec-title { font-size:.96rem; } }
.sd-hrow { display:flex; gap:10px; overflow-x:auto; padding:4px 16px 10px; scrollbar-width:none; }
@media(min-width:480px){ .sd-hrow { gap:12px; padding:4px 20px 12px; } }
@media(min-width:768px){ .sd-hrow { gap:14px; padding:4px 28px 14px; } }
.sd-hrow::-webkit-scrollbar { display:none; }
.sd-sc { flex-shrink:0; width:128px; cursor:pointer; transition:transform .22s; }
@media(min-width:480px){ .sd-sc { width:142px; } }
.sd-sc:hover { transform:translateY(-4px); }
.sd-sc:hover .sd-sc-img { box-shadow:0 12px 30px rgba(0,0,0,.6); border-color:rgba(201,151,58,.4); }
.sd-sc:hover .sd-sc-title { color:var(--gold); }
.sd-sc-img { position:relative; border-radius:9px; overflow:hidden; aspect-ratio:1/1; background:var(--bg3); box-shadow:0 3px 10px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.06); transition:box-shadow .22s; }
.sd-sc-img img { width:100%; height:100%; object-fit:cover; display:block; }
.sd-sc-title { margin:0; font-weight:700; font-size:.72rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); transition:color .2s; margin-top:6px; }
.sd-sc-sub { margin:2px 0 0; font-size:.6rem; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-arr { width:26px; height:26px; border-radius:50%; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:var(--text); cursor:pointer; font-size:.95rem; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
.sd-arr:hover { border-color:rgba(201,151,58,.4); color:var(--gold); }
@media(max-width:400px){ .sd-arr { display:none; } }
/* Movie cards in sd */
.sd-mc { flex-shrink:0; width:120px; cursor:pointer; transition:transform .22s; }
@media(min-width:480px){ .sd-mc { width:134px; } }
.sd-mc:hover { transform:translateY(-5px); }
.sd-mc-box { position:relative; border-radius:9px; overflow:hidden; aspect-ratio:2/3; background:var(--bg3); box-shadow:0 3px 12px rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.06); }
.sd-mc-box img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.sd-mc-title { margin:6px 0 0; font-weight:700; font-size:.7rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); }
/* Lyrics */
.sd-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,.08); flex-shrink:0; }
.sd-tab { flex:1; padding:9px 0; text-align:center; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; background:none; border:none; cursor:pointer; color:var(--muted); border-bottom:2px solid transparent; transition:all .15s; }
.sd-tab.active { color:var(--gold); border-bottom-color:var(--gold); }
.sd-lyrics-wrap { overflow-y:auto; flex:1; padding:12px 14px 20px; scroll-behavior:smooth; }
.sd-lyric-line { padding:5px 8px; border-radius:5px; font-size:.82rem; line-height:1.7; color:rgba(255,255,255,.45); transition:all .3s; cursor:default; white-space:pre-wrap; }
.sd-lyric-line.active { color:#fff; font-weight:700; font-size:.9rem; background:rgba(201,151,58,.12); border-left:3px solid var(--gold); padding-left:10px; }
.sd-lyric-line.passed { color:rgba(255,255,255,.3); }
.sd-no-lyrics { padding:32px 16px; text-align:center; color:var(--muted); font-size:.8rem; line-height:1.8; }
/* Repeat / Queue */
.sd-ctrl-btn { background:none; border:none; cursor:pointer; color:var(--muted); font-size:.8rem; padding:5px 9px; border-radius:7px; transition:all .15s; display:inline-flex; align-items:center; gap:4px; font-family:inherit; }
.sd-ctrl-btn:hover { color:var(--text); background:rgba(255,255,255,.06); }
.sd-ctrl-btn.on { color:var(--gold); background:rgba(201,151,58,.12); }
/* Know this song */
.sd-know-btn { display:inline-flex; align-items:center; gap:7px; padding:8px 18px; border-radius:20px; border:1px solid rgba(255,120,50,.3); background:rgba(255,120,50,.07); color:rgba(255,150,80,.85); font-size:.8rem; font-weight:700; cursor:pointer; transition:all .2s; font-family:inherit; }
.sd-know-btn:hover,.sd-know-btn.voted { background:rgba(255,120,50,.18); border-color:rgba(255,120,50,.5); color:#ff9450; transform:scale(1.03); }
/* Breadcrumb */
.sd-breadcrumb { display:flex; align-items:center; gap:5px; flex-wrap:wrap; font-size:.71rem; color:var(--muted); padding:6px 0 2px; }
.sd-breadcrumb span { cursor:pointer; transition:color .15s; }
.sd-breadcrumb span:hover { color:var(--gold); }
.sd-breadcrumb .sep { opacity:.35; cursor:default; }
.sd-breadcrumb .cur { color:var(--text); font-weight:600; cursor:default; }
/* Queue panel */
.sd-queue-wrap { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:10px; overflow:hidden; margin-top:12px; }
.sd-queue-head { display:flex; align-items:center; justify-content:space-between; padding:9px 13px; border-bottom:1px solid rgba(255,255,255,.06); font-size:.62rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
/* ── Now Playing Bar ── */
.sd-now-playing {
  position:fixed; bottom:0; left:0; right:0; z-index:200;
  background:linear-gradient(to right, rgba(10,10,10,.97), rgba(20,16,8,.97));
  border-top:1px solid rgba(201,151,58,.25);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  display:flex; align-items:center; gap:12px;
  padding:10px 16px; transform:translateY(100%);
  transition:transform .35s cubic-bezier(.34,1.56,.64,1);
}
@media(min-width:480px){ .sd-now-playing { padding:10px 24px; gap:16px; } }
.sd-now-playing.visible { transform:translateY(0); }
.sd-np-thumb { width:40px; height:40px; border-radius:6px; overflow:hidden; flex-shrink:0; background:var(--bg3); border:1px solid rgba(201,151,58,.3); }
.sd-np-thumb img { width:100%; height:100%; object-fit:cover; }
.sd-np-info { flex:1; min-width:0; }
.sd-np-title { font-weight:700; font-size:.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; }
.sd-np-singer { font-size:.68rem; color:var(--gold); margin-top:1px; }
.sd-np-btn { width:36px; height:36px; border-radius:50%; background:var(--gold); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:.9rem; color:#000; flex-shrink:0; transition:transform .15s; }
.sd-np-btn:hover { transform:scale(1.1); }
.sd-np-skip { background:rgba(255,255,255,.1); color:#fff; }
.sd-np-skip:hover { background:rgba(255,255,255,.2); }
.sd-rating { display:flex; align-items:center; gap:6px; padding:10px 0 4px; }
.sd-star { font-size:1.3rem; cursor:pointer; transition:transform .15s; filter:grayscale(1) opacity(.35); user-select:none; }
.sd-star:hover,.sd-star.lit { filter:none; }
.sd-star:hover { transform:scale(1.2); }
.sd-rating-info { font-size:.74rem; color:var(--muted); margin-left:4px; }
.sd-share-overlay { position:fixed; inset:0; z-index:300; background:rgba(0,0,0,.85); display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(8px); }
.sd-share-card { background:linear-gradient(145deg,#1a1200,#0f0a00,#0a0a0a); border:1px solid rgba(201,151,58,.45); border-radius:20px; width:100%; max-width:360px; overflow:hidden; }
.sd-share-card-img { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; }
.sd-share-card-body { padding:18px 20px 20px; }
.sd-share-card-eyebrow { font-size:.58rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
.sd-share-card-title { font-family:"Playfair Display",serif; font-size:1.4rem; font-weight:900; line-height:1.2; margin:0 0 5px; }
.sd-share-card-meta { font-size:.76rem; color:rgba(255,255,255,.55); margin-bottom:14px; }
.sd-share-card-footer { display:flex; align-items:center; gap:10px; border-top:1px solid rgba(255,255,255,.08); padding-top:12px; }
.sd-share-card-watermark { margin-left:auto; font-size:.62rem; font-weight:800; letter-spacing:.08em; color:rgba(201,151,58,.6); }
.sd-autoplay-row { display:flex; align-items:center; gap:8px; padding:8px 0; font-size:.74rem; color:var(--muted); cursor:pointer; user-select:none; }
.sd-autoplay-row.on { color:var(--gold); }
.sd-autoplay-pill { width:30px; height:17px; border-radius:9px; background:rgba(255,255,255,.15); position:relative; transition:background .2s; flex-shrink:0; }
.sd-autoplay-row.on .sd-autoplay-pill { background:var(--gold); }
.sd-autoplay-pill::after { content:""; position:absolute; top:2.5px; left:3px; width:12px; height:12px; border-radius:50%; background:#fff; transition:transform .2s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
.sd-autoplay-row.on .sd-autoplay-pill::after { transform:translateX(13px); }
.sd-spotify-card { flex-shrink:0; width:156px; cursor:pointer; transition:transform .2s; }
@media(min-width:480px){ .sd-spotify-card { width:168px; } }
.sd-spotify-card:hover { transform:translateY(-4px); }
.sd-spotify-img { width:100%; aspect-ratio:1/1; border-radius:10px; overflow:hidden; background:var(--bg3); box-shadow:0 4px 14px rgba(0,0,0,.4); position:relative; margin-bottom:8px; transition:box-shadow .2s; }
.sd-spotify-card:hover .sd-spotify-img { box-shadow:0 12px 32px rgba(0,0,0,.7); }
.sd-spotify-img img { width:100%; height:100%; object-fit:cover; display:block; }
.sd-spotify-play-btn { position:absolute; bottom:8px; right:8px; width:36px; height:36px; border-radius:50%; background:var(--gold); display:flex; align-items:center; justify-content:center; font-size:.85rem; color:#000; box-shadow:0 4px 14px rgba(0,0,0,.5); opacity:0; transform:translateY(6px); transition:all .2s; }
.sd-spotify-card:hover .sd-spotify-play-btn { opacity:1; transform:translateY(0); }
.sd-spotify-title { font-weight:700; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); }
.sd-spotify-sub { font-size:.64rem; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;
function parseLRC(raw = "") {
  if (!raw.trim()) return [];
  const lines = raw.split("\n");
  const parsed = [];
  const timeRe = /\[(\d{1,2}):(\d{2})(?:[.:]\d+)?\]/g;
  lines.forEach((line) => {
    const text = line.replace(/\[\d{1,2}:\d{2}(?:[.:]\d+)?\]/g, "").trim();
    let m;
    timeRe.lastIndex = 0;
    while ((m = timeRe.exec(line)) !== null) {
      const secs = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      if (text) parsed.push({ time: secs, text });
    }
  });
  if (parsed.length === 0 && raw.trim()) {
    return raw.split("\n").map((text, i) => ({ time: null, text }));
  }
  return parsed.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}
function LyricsPanel({ lyrics, currentTime }) {
  const lines = React.useMemo(() => parseLRC(lyrics || ""), [lyrics]);
  const wrapRef = useRef(null);
  const isLRC = lines.some((l) => l.time !== null);
  const activeIdx = React.useMemo(() => {
    if (!isLRC || currentTime == null) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime, isLRC]);
  useEffect(() => {
    if (activeIdx < 0 || !wrapRef.current) return;
    const el = wrapRef.current.children[activeIdx];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);
  if (!(lyrics == null ? void 0 : lyrics.trim())) return /* @__PURE__ */ jsxs("div", { className: "sd-no-lyrics", children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", marginBottom: 8 }, children: "🎵" }),
    /* @__PURE__ */ jsx("div", { children: "No lyrics available for this song." }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: ".72rem", marginTop: 8, opacity: 0.6 }, children: "Lyrics can be added by the admin." })
  ] });
  return /* @__PURE__ */ jsx("div", { className: "sd-lyrics-wrap", ref: wrapRef, children: lines.map((line, i) => /* @__PURE__ */ jsx(
    "div",
    {
      className: "sd-lyric-line" + (isLRC && i === activeIdx ? " active" : "") + (isLRC && i < activeIdx ? " passed" : ""),
      children: line.text || " "
    },
    i
  )) });
}
const RECENT_KEY = "op_recent_songs";
function saveRecent(song, movie, idx) {
  if (!(song == null ? void 0 : song.title)) return;
  try {
    const item = {
      title: song.title,
      singer: song.singer || "",
      ytId: song.ytId || "",
      movieTitle: (movie == null ? void 0 : movie.title) || "",
      movieId: String((movie == null ? void 0 : movie._id) || ""),
      movieSlug: (movie == null ? void 0 : movie.slug) || "",
      songIdx: idx,
      thumb: song.thumbnailUrl || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : ""),
      ts: Date.now()
    };
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((r) => !(r.title === item.title && r.movieId === item.movieId));
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, 20)));
  } catch {
  }
}
function getKnowData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function SpotifyCard({ song, onClick }) {
  const thumb = song.thumbnailUrl || (song.ytId ? ytThumb$2(song.ytId) : null) || song.moviePoster;
  return /* @__PURE__ */ jsxs("div", { className: "sd-spotify-card", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "sd-spotify-img", children: [
      thumb && /* @__PURE__ */ jsx("img", { src: thumb, alt: song.title, onError: (e) => e.target.style.opacity = ".2" }),
      !thumb && /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "var(--muted)" }, children: "🎵" }),
      /* @__PURE__ */ jsx("div", { className: "sd-spotify-play-btn", children: "▶" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "sd-spotify-title", children: song.title }),
    song.singer && /* @__PURE__ */ jsxs("div", { className: "sd-spotify-sub", children: [
      "🎤 ",
      song.singer
    ] }),
    song.movieTitle && /* @__PURE__ */ jsx("div", { className: "sd-spotify-sub", style: { color: "rgba(201,151,58,.7)" }, children: song.movieTitle })
  ] });
}
function ShareCardModal({ song, movie, onClose }) {
  const thumb = song.thumbnailUrl || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null) || (movie == null ? void 0 : movie.posterUrl);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const handleCopy = () => {
    var _a;
    (_a = navigator.clipboard) == null ? void 0 : _a.writeText(url).then(() => {
      alert("Link copied!");
    }).catch(() => {
      prompt("Copy this link:", url);
    });
  };
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `🎵 ${song.title}${song.singer ? " — " + song.singer : ""}${movie ? " | " + movie.title : ""}`, url });
    } else {
      handleCopy();
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "sd-share-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { className: "sd-share-card", onClick: (e) => e.stopPropagation(), children: [
    thumb ? /* @__PURE__ */ jsx("img", { src: thumb, alt: song.title, className: "sd-share-card-img" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg,#1a1200,#0a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }, children: "🎵" }),
    /* @__PURE__ */ jsxs("div", { className: "sd-share-card-body", children: [
      /* @__PURE__ */ jsx("div", { className: "sd-share-card-eyebrow", children: "🎵 Now Playing" }),
      /* @__PURE__ */ jsx("div", { className: "sd-share-card-title", children: song.title }),
      /* @__PURE__ */ jsxs("div", { className: "sd-share-card-meta", children: [
        song.singer && /* @__PURE__ */ jsxs("span", { children: [
          "🎤 ",
          song.singer
        ] }),
        song.singer && song.musicDirector && /* @__PURE__ */ jsx("span", { style: { margin: "0 6px", opacity: 0.4 }, children: "·" }),
        song.musicDirector && /* @__PURE__ */ jsxs("span", { children: [
          "🎼 ",
          song.musicDirector
        ] })
      ] }),
      movie && /* @__PURE__ */ jsxs("div", { className: "sd-share-card-footer", children: [
        movie.posterUrl && /* @__PURE__ */ jsx("img", { src: movie.posterUrl, alt: movie.title, style: { width: 32, height: 44, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,.1)" }, onError: (e) => e.target.style.display = "none" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: ".68rem", color: "var(--muted)" }, children: "From the film" }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: ".82rem", fontWeight: 700, color: "var(--gold)" }, children: movie.title })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "sd-share-card-watermark", children: "Ollypedia" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 14 }, children: [
        /* @__PURE__ */ jsx("button", { onClick: handleShare, className: "btn btn-gold btn-sm", style: { flex: 1, justifyContent: "center" }, children: navigator.share ? "📤 Share" : "🔗 Copy Link" }),
        song.ytId && /* @__PURE__ */ jsx(
          "a",
          {
            href: `https://www.youtube.com/watch?v=${song.ytId}`,
            target: "_blank",
            rel: "noreferrer",
            className: "btn btn-outline btn-sm",
            style: { flex: 1, textAlign: "center", textDecoration: "none" },
            children: "▶ YouTube"
          }
        ),
        /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { flexShrink: 0 }, children: "✕" })
      ] })
    ] })
  ] }) });
}
function SongItem({ song, active, onClick }) {
  const thumb = song.ytId ? ytThumb$2(song.ytId) : null;
  return /* @__PURE__ */ jsxs("div", { className: `sd-song-item${active ? " active" : ""}`, onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "sd-song-thumb", children: [
      thumb && /* @__PURE__ */ jsx("img", { src: thumb, alt: song.title, onError: (e) => e.target.style.opacity = "0.2" }),
      /* @__PURE__ */ jsx("div", { className: "sd-song-icon", style: { background: active ? "rgba(201,151,58,.45)" : "rgba(0,0,0,.4)", color: active ? "var(--gold)" : "rgba(255,255,255,.7)" }, children: active ? "▶" : "♪" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ jsx("div", { className: "sd-song-name", style: { color: active ? "var(--gold)" : "var(--text)" }, children: song.title }),
      song.singer && /* @__PURE__ */ jsxs("div", { className: "sd-song-singer", children: [
        "🎤 ",
        song.singer
      ] })
    ] }),
    song.ytId && /* @__PURE__ */ jsx(
      "a",
      {
        href: `https://www.youtube.com/watch?v=${song.ytId}`,
        target: "_blank",
        rel: "noreferrer",
        onClick: (e) => e.stopPropagation(),
        style: { flexShrink: 0, color: "var(--gold)", fontSize: ".6rem", fontWeight: 700, opacity: 0.65, padding: "3px 5px" },
        children: "YT↗"
      }
    )
  ] });
}
function SongScrollRow({ title, songs, onSongClick }) {
  const ref = useRef(null);
  const slide = (n) => {
    var _a;
    return (_a = ref.current) == null ? void 0 : _a.scrollBy({ left: n, behavior: "smooth" });
  };
  if (!songs.length) return null;
  return /* @__PURE__ */ jsxs("section", { className: "sd-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "sd-sec-head", children: [
      /* @__PURE__ */ jsx("h2", { className: "sd-sec-title", children: title }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 5 }, children: [
        /* @__PURE__ */ jsx("button", { className: "sd-arr", onClick: () => slide(-400), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "sd-arr", onClick: () => slide(400), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "sd-hrow", ref, children: songs.map((s, i) => {
      const thumb = s.thumbnailUrl || (s.ytId ? ytThumb$2(s.ytId) : null) || s.moviePoster;
      return /* @__PURE__ */ jsxs("div", { className: "sd-sc", onClick: () => onSongClick(s), children: [
        /* @__PURE__ */ jsxs("div", { className: "sd-sc-img", children: [
          thumb && /* @__PURE__ */ jsx("img", { src: thumb, alt: s.title, onError: (e) => e.target.style.opacity = "0.2" }),
          /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.25)" }, children: /* @__PURE__ */ jsx("div", { style: { width: 26, height: 26, borderRadius: "50%", background: "rgba(201,151,58,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem" }, children: "▶" }) })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "sd-sc-title", children: s.title }),
        s.singer && /* @__PURE__ */ jsxs("p", { className: "sd-sc-sub", children: [
          "🎤 ",
          s.singer
        ] }),
        s.movieTitle && /* @__PURE__ */ jsx("p", { className: "sd-sc-sub", style: { color: "var(--gold)" }, children: s.movieTitle })
      ] }, i);
    }) })
  ] });
}
function SongDetail() {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const { movieSlug: _rawSlug, songIndex: _rawIdx } = useParams();
  const movieParam = extractId(_rawSlug) || _rawSlug;
  const songIdx = (() => {
    const n = parseInt(_rawIdx, 10);
    return isNaN(n) ? 0 : n;
  })();
  const navigate = useNavigate();
  const [allMovies, setAllMovies] = useState(() => Cache.peek("movies") || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSongIdx, setActiveSongIdx] = useState(songIdx);
  const [activeMovieParam, setActiveMovieParam] = useState(movieParam);
  const [sidebarTab, setSidebarTab] = useState("playlist");
  const [currentTime, setCurrentTime] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [showBar, setShowBar] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [ratingMsg, setRatingMsg] = useState("");
  const [repeatMode, setRepeatMode] = useState("none");
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [knowCount, setKnowCount] = useState(0);
  const [knowVoted, setKnowVoted] = useState(false);
  const playerRef = useRef(null);
  const playerWrap = useRef(null);
  const movie = allMovies.find(
    (m) => String(m._id) === activeMovieParam || m.slug === activeMovieParam
  ) || null;
  const songs = ((_a = movie == null ? void 0 : movie.media) == null ? void 0 : _a.songs) || [];
  const activeSong = songs[activeSongIdx] || songs[0] || null;
  const activeIdx = activeSong ? songs.indexOf(activeSong) : 0;
  const ytId = (activeSong == null ? void 0 : activeSong.ytId) ? extractYtId$4(activeSong.ytId) : null;
  const upgradedRef = useRef("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const cached = Cache.peek("movies");
    if (cached) {
      const found = cached.find((m) => String(m._id) === movieParam || m.slug === movieParam);
      if (found) {
        if (!cancelled) {
          setAllMovies(cached);
          setLoading(false);
        }
        return;
      }
    }
    API.getMovie(movieParam).then((m) => {
      if (cancelled) return;
      setAllMovies((prev) => [m, ...prev.filter((x) => String(x._id) !== String(m._id))]);
      setLoading(false);
      const tid = typeof requestIdleCallback !== "undefined" ? requestIdleCallback(() => Cache.getMovies().catch(() => []).then((all) => {
        if (!cancelled) setAllMovies(all);
      })) : setTimeout(() => Cache.getMovies().catch(() => []).then((all) => {
        if (!cancelled) setAllMovies(all);
      }), 300);
      return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(tid) : clearTimeout(tid);
    }).catch((e) => {
      if (!cancelled) {
        setError((e == null ? void 0 : e.message) || "Failed to load");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [movieParam]);
  useEffect(() => {
    setActiveMovieParam(movieParam);
    setActiveSongIdx(songIdx);
  }, [movieParam, songIdx]);
  useEffect(() => {
    var _a2;
    if ((_a2 = activeSong == null ? void 0 : activeSong.lyrics) == null ? void 0 : _a2.trim()) setSidebarTab("lyrics");
    else setSidebarTab("playlist");
    setCurrentTime(0);
    if (!activeSong || !movie) return;
    ({
      title: activeSong.title,
      singer: activeSong.singer || "",
      ytId: activeSong.ytId ? extractYtId$4(activeSong.ytId) : "",
      movieTitle: movie.title,
      movieId: String(movie._id),
      movieSlug: movie.slug || "",
      thumb: activeSong.ytId ? `https://img.youtube.com/vi/${extractYtId$4(activeSong.ytId)}/mqdefault.jpg` : movie.posterUrl || ""
    });
  }, [activeSong == null ? void 0 : activeSong.title, activeIdx]);
  useEffect(() => {
    if (!activeSong || !movie) return;
    saveRecent(activeSong, movie, activeIdx);
    const kd = getKnowData(`know_${movie._id}_${activeIdx}`);
    setKnowCount(kd.count || 0);
    setKnowVoted(kd.voted || false);
  }, [activeSong == null ? void 0 : activeSong.title, activeIdx]);
  useEffect(() => {
    const onScroll = () => {
      if (!playerWrap.current) return;
      const rect = playerWrap.current.getBoundingClientRect();
      setShowBar(rect.bottom < 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!(activeSong == null ? void 0 : activeSong.title)) return;
    const key = `rating_${movie == null ? void 0 : movie._id}_${activeIdx}`;
    const saved = parseInt(localStorage.getItem(key) || "0", 10);
    setUserRating(saved);
    setRatingMsg("");
  }, [activeSong == null ? void 0 : activeSong.title, activeIdx]);
  useEffect(() => {
    if (!ytId) return;
    let interval = null;
    const onMsg = (e) => {
      var _a2;
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if ((d == null ? void 0 : d.event) === "infoDelivery" && ((_a2 = d == null ? void 0 : d.info) == null ? void 0 : _a2.currentTime) != null) {
          setCurrentTime(d.info.currentTime);
          if (d.info.playerState === 1) setIsPlaying(true);
          if (d.info.playerState === 2) setIsPlaying(false);
          if (d.info.playerState === 0) {
            if (repeatMode === "one") {
              setTimeout(() => {
                var _a3, _b2;
                (_b2 = (_a3 = playerRef.current) == null ? void 0 : _a3.contentWindow) == null ? void 0 : _b2.postMessage(
                  JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
                  "*"
                );
              }, 300);
            } else if (queue.length > 0) {
              const [next, ...rest] = queue;
              setQueue(rest);
              setTimeout(() => changeActiveSong(next.idx), 800);
            } else if (autoplay || repeatMode === "all") {
              const nextIdx = repeatMode === "all" && activeIdx === songs.length - 1 ? 0 : activeIdx + 1;
              if (nextIdx < songs.length) {
                setTimeout(() => changeActiveSong(nextIdx), 800);
              }
            }
          }
        }
      } catch {
      }
    };
    window.addEventListener("message", onMsg);
    const askTime = () => {
      var _a2, _b2, _c2, _d2;
      try {
        (_b2 = (_a2 = playerRef.current) == null ? void 0 : _a2.contentWindow) == null ? void 0 : _b2.postMessage(
          JSON.stringify({ event: "listening" }),
          "*"
        );
        (_d2 = (_c2 = playerRef.current) == null ? void 0 : _c2.contentWindow) == null ? void 0 : _d2.postMessage(
          JSON.stringify({ event: "command", func: "getVideoData" }),
          "*"
        );
      } catch {
      }
    };
    interval = setInterval(askTime, 1e3);
    return () => {
      window.removeEventListener("message", onMsg);
      clearInterval(interval);
    };
  }, [ytId]);
  useEffect(() => {
    if (!movie || !activeSong) return;
    const target = songPath(movie, activeIdx, activeSong);
    if (target !== upgradedRef.current && window.location.pathname !== target) {
      upgradedRef.current = target;
      navigate(target, { replace: true });
    }
  }, [movie == null ? void 0 : movie._id, activeIdx, activeSong == null ? void 0 : activeSong.title]);
  const changeActiveSong = (idx) => {
    const s = songs[idx];
    if (!s) return;
    setActiveSongIdx(idx);
    navigate(songPath(movie, idx, s), { replace: true });
  };
  const handleRelatedSongClick = (s) => {
    const relM = allMovies.find((x) => String(x._id) === s.movieId);
    const idx = typeof s.songIdx === "number" && !isNaN(s.songIdx) ? s.songIdx : 0;
    setActiveMovieParam((relM == null ? void 0 : relM.slug) || s.movieId);
    setActiveSongIdx(idx);
    navigate(
      relM ? songPath(relM, idx, s) : `/song/${s.movieId}/${idx}`,
      { replace: false }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleRate = (stars) => {
    setUserRating(stars);
    const key = `rating_${movie == null ? void 0 : movie._id}_${activeIdx}`;
    localStorage.setItem(key, String(stars));
    setRatingMsg(["😕", "😐", "🙂", "😊", "🤩"][stars - 1] + " Thanks for rating!");
    setTimeout(() => setRatingMsg(""), 2500);
  };
  const handleKnow = () => {
    if (knowVoted) return;
    const key = `know_${movie == null ? void 0 : movie._id}_${activeIdx}`;
    const kd = getKnowData(key);
    const newCount = (kd.count || 0) + 1;
    try {
      localStorage.setItem(key, JSON.stringify({ count: newCount, voted: true }));
    } catch {
    }
    setKnowCount(newCount);
    setKnowVoted(true);
  };
  const addToQueue = (idx) => {
    const s = songs[idx];
    if (!s || idx === activeIdx) return;
    setQueue((q) => {
      if (q.some((x) => x.idx === idx)) return q;
      return [...q, { idx, title: s.title, singer: s.singer || "", ytId: s.ytId || "" }];
    });
    setShowQueue(true);
  };
  const togglePlay = () => {
    var _a2, _b2;
    try {
      const cmd = isPlaying ? "pauseVideo" : "playVideo";
      (_b2 = (_a2 = playerRef.current) == null ? void 0 : _a2.contentWindow) == null ? void 0 : _b2.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: [] }),
        "*"
      );
      setIsPlaying((p) => !p);
    } catch {
    }
  };
  if (loading) return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "var(--muted)" }, children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem" }, children: "🎵" }),
    /* @__PURE__ */ jsx("p", { style: { fontSize: ".8rem" }, children: "Loading…" })
  ] });
  if (error) return /* @__PURE__ */ jsxs("div", { className: "page empty-state", children: [
    /* @__PURE__ */ jsx("h3", { children: "Song not found" }),
    /* @__PURE__ */ jsx("p", { children: error }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-outline", style: { marginTop: 16 }, onClick: () => navigate(-1), children: "← Go Back" })
  ] });
  if (!movie) return /* @__PURE__ */ jsx("div", { style: { minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }, children: /* @__PURE__ */ jsx("p", { children: "Loading movie…" }) });
  if (!activeSong) return /* @__PURE__ */ jsxs("div", { className: "page empty-state", children: [
    /* @__PURE__ */ jsx("h3", { children: "No songs for this movie" }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-outline", style: { marginTop: 16 }, onClick: () => navigate(moviePath(movie)), children: "← Back to Movie" })
  ] });
  const bannerImg = movie.thumbnailUrl || ytThumb$2((_c = (_b = movie.media) == null ? void 0 : _b.trailer) == null ? void 0 : _c.ytId) || movie.posterUrl;
  const allSongs = [];
  allMovies.forEach((m) => {
    var _a2;
    return (((_a2 = m.media) == null ? void 0 : _a2.songs) || []).forEach((s, i) => allSongs.push({ ...s, movieId: String(m._id), movieTitle: m.title, moviePoster: m.posterUrl, songIdx: i, isCurrent: String(m._id) === String(movie._id) && i === activeIdx }));
  });
  const bySinger = activeSong.singer ? allSongs.filter((s) => !s.isCurrent && s.ytId && s.singer && firstToken(s.singer) === firstToken(activeSong.singer)) : [];
  const byMusicDirector = activeSong.musicDirector ? allSongs.filter((s) => !s.isCurrent && s.ytId && s.musicDirector && firstToken(s.musicDirector) === firstToken(activeSong.musicDirector)) : [];
  const byLyricist = activeSong.lyricist ? allSongs.filter((s) => !s.isCurrent && s.ytId && s.lyricist && firstToken(s.lyricist) === firstToken(activeSong.lyricist)) : [];
  return /* @__PURE__ */ jsxs("div", { className: "sd-root", children: [
    /* @__PURE__ */ jsx("style", { children: CSS$3 }),
    /* @__PURE__ */ jsx(SEO, { ...songDetailSEO({ ...activeSong, songIndex: activeIdx }, movie) }),
    /* @__PURE__ */ jsxs("div", { className: "sd-hero", children: [
      bannerImg && /* @__PURE__ */ jsx("div", { className: "sd-hero-bg", style: { backgroundImage: `url(${bannerImg})` } }),
      /* @__PURE__ */ jsx("div", { className: "sd-hero-overlay" }),
      /* @__PURE__ */ jsxs("div", { className: "sd-back", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => navigate(movie ? moviePath(movie) : `/movie/${movie == null ? void 0 : movie._id}`), children: [
          "← ",
          movie.title
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sd-breadcrumb", children: [
          /* @__PURE__ */ jsx("span", { onClick: () => navigate("/"), children: "Home" }),
          /* @__PURE__ */ jsx("span", { className: "sep", children: "›" }),
          /* @__PURE__ */ jsx("span", { onClick: () => navigate("/songs"), children: "Songs" }),
          /* @__PURE__ */ jsx("span", { className: "sep", children: "›" }),
          /* @__PURE__ */ jsx("span", { onClick: () => navigate(moviePath(movie)), children: movie.title }),
          /* @__PURE__ */ jsx("span", { className: "sep", children: "›" }),
          /* @__PURE__ */ jsx("span", { className: "cur", children: activeSong.title })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sd-grid", children: [
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("div", { ref: playerWrap, children: /* @__PURE__ */ jsx("div", { className: "sd-player", children: ytId ? /* @__PURE__ */ jsx(
            "iframe",
            {
              ref: playerRef,
              src: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`,
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true,
              title: activeSong.title
            },
            ytId
          ) : /* @__PURE__ */ jsxs("div", { style: { width: "100%", height: "100%", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--bg3)" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem" }, children: "🎵" }),
            /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: ".82rem" }, children: "No YouTube link available" })
          ] }) }) }),
          /* @__PURE__ */ jsxs("div", { className: "sd-info-card", children: [
            /* @__PURE__ */ jsxs("div", { className: "sd-badges", children: [
              /* @__PURE__ */ jsx("span", { className: "home-tag", children: "🎵 Song" }),
              activeSong.singer && /* @__PURE__ */ jsxs("span", { className: "home-tag-outline", children: [
                "🎤 ",
                activeSong.singer
              ] }),
              activeSong.musicDirector && /* @__PURE__ */ jsxs("span", { className: "home-tag-outline", children: [
                "🎼 ",
                activeSong.musicDirector
              ] }),
              activeSong.lyricist && /* @__PURE__ */ jsxs("span", { className: "home-tag-outline", children: [
                "✍️ ",
                activeSong.lyricist
              ] })
            ] }),
            /* @__PURE__ */ jsx("h1", { className: "sd-song-title", children: activeSong.title }),
            [
              activeSong.singer && ["Singer", "🎤", activeSong.singer, "var(--gold)"],
              activeSong.musicDirector && ["Music Dir.", "🎼", activeSong.musicDirector, "var(--text)"],
              activeSong.lyricist && ["Lyricist", "✍️", activeSong.lyricist, "var(--text)"]
            ].filter(Boolean).map(([label, icon, val, color]) => /* @__PURE__ */ jsxs("div", { className: "sd-meta-row", children: [
              /* @__PURE__ */ jsx("span", { className: "sd-meta-label", children: label }),
              /* @__PURE__ */ jsxs("span", { className: "sd-meta-val", style: { color, fontWeight: label === "Singer" ? 600 : 400 }, children: [
                icon,
                " ",
                val
              ] })
            ] }, label)),
            /* @__PURE__ */ jsxs("div", { className: "sd-meta-row", children: [
              /* @__PURE__ */ jsx("span", { className: "sd-meta-label", children: "From Film" }),
              /* @__PURE__ */ jsxs(
                "span",
                {
                  className: "sd-meta-val",
                  style: { color: "var(--gold)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
                  onClick: () => navigate(movie ? moviePath(movie) : `/movie/${movie == null ? void 0 : movie._id}`),
                  children: [
                    "🎬 ",
                    movie.title
                  ]
                }
              )
            ] }),
            movie.director && /* @__PURE__ */ jsxs("div", { className: "sd-meta-row", children: [
              /* @__PURE__ */ jsx("span", { className: "sd-meta-label", children: "Director" }),
              /* @__PURE__ */ jsx("span", { className: "sd-meta-val", children: movie.director })
            ] }),
            movie.releaseDate && /* @__PURE__ */ jsxs("div", { className: "sd-meta-row", children: [
              /* @__PURE__ */ jsx("span", { className: "sd-meta-label", children: "Release" }),
              /* @__PURE__ */ jsx("span", { className: "sd-meta-val", children: fmtDate$2(movie.releaseDate) })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 14 }, children: [
              ytId && /* @__PURE__ */ jsx(
                "a",
                {
                  href: `https://www.youtube.com/watch?v=${ytId}`,
                  target: "_blank",
                  rel: "noreferrer",
                  className: "btn-hero-play",
                  style: { fontSize: ".76rem", padding: "7px 14px", whiteSpace: "nowrap" },
                  children: "▶ YouTube"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  className: `sd-ctrl-btn${autoplay ? " on" : ""}`,
                  onClick: () => setAutoplay((a) => !a),
                  style: { padding: "6px 12px", border: `1px solid ${autoplay ? "rgba(201,151,58,.4)" : "rgba(255,255,255,.12)"}`, borderRadius: 20 },
                  children: autoplay ? "⏭ Auto: On" : "⏭ Auto: Off"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setShowShare(true),
                  className: "sd-ctrl-btn",
                  style: { padding: "6px 12px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20 },
                  children: "📤 Share"
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  className: `sd-know-btn${knowVoted ? " voted" : ""}`,
                  onClick: handleKnow,
                  style: { padding: "6px 14px", fontSize: ".76rem" },
                  children: [
                    "🔥 ",
                    knowVoted ? "Known!" : "I know this!",
                    knowCount > 0 && /* @__PURE__ */ jsx("span", { style: { fontWeight: 900, marginLeft: 3 }, children: knowCount >= 1e3 ? (knowCount / 1e3).toFixed(1) + "K" : knowCount })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }, children: [
                [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `sd-star${(hoverRating || userRating) >= star ? " lit" : ""}`,
                    onMouseEnter: () => setHoverRating(star),
                    onMouseLeave: () => setHoverRating(0),
                    onClick: () => handleRate(star),
                    style: { fontSize: "1.1rem" },
                    children: "⭐"
                  },
                  star
                )),
                ratingMsg && /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", color: "var(--gold)", marginLeft: 4 }, children: ratingMsg })
              ] })
            ] })
          ] }),
          activeSong.description && /* @__PURE__ */ jsxs("div", { style: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "16px 18px", marginBottom: 0 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".62rem", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }, children: "🎵 About This Song" }),
            /* @__PURE__ */ jsx("p", { style: { fontSize: ".86rem", lineHeight: 1.8, color: "rgba(255,255,255,.75)", margin: 0 }, children: activeSong.description })
          ] }),
          showQueue && /* @__PURE__ */ jsxs("div", { className: "sd-queue-wrap", children: [
            /* @__PURE__ */ jsxs("div", { className: "sd-queue-head", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                "📋 Queue (",
                queue.length,
                ")"
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: () => setQueue([]), style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: ".68rem", fontFamily: "inherit" }, children: "Clear" })
            ] }),
            queue.length === 0 ? /* @__PURE__ */ jsx("div", { style: { padding: "14px 16px", color: "var(--muted)", fontSize: ".78rem", textAlign: "center" }, children: "Queue is empty. Right-click a song below to add it!" }) : queue.map((q, i) => {
              songs[q.idx];
              const thumb = q.ytId ? ytThumb$2(q.ytId) : null;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer" },
                  onClick: () => {
                    setQueue((prev) => prev.filter((_, pi) => pi !== i));
                    changeActiveSong(q.idx);
                  },
                  children: [
                    /* @__PURE__ */ jsx("div", { style: { width: 44, height: 30, borderRadius: 4, overflow: "hidden", background: "var(--bg3)", flexShrink: 0 }, children: thumb && /* @__PURE__ */ jsx("img", { src: thumb, alt: q.title, style: { width: "100%", height: "100%", objectFit: "cover" } }) }),
                    /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                      /* @__PURE__ */ jsx("div", { style: { fontSize: ".78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: q.title }),
                      q.singer && /* @__PURE__ */ jsxs("div", { style: { fontSize: ".64rem", color: "var(--muted)" }, children: [
                        "🎤 ",
                        q.singer
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          setQueue((prev) => prev.filter((_, pi) => pi !== i));
                        },
                        style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: ".8rem", padding: "2px 6px" },
                        children: "✕"
                      }
                    )
                  ]
                },
                i
              );
            }),
            /* @__PURE__ */ jsx("div", { style: { padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: ".66rem", color: "var(--muted)" }, children: "💡 Right-click any song in the playlist to add to queue" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "18px 20px", marginBottom: 0 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".62rem", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }, children: "About This Movie" }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".68rem", color: "var(--muted)", width: 80, flexShrink: 0 }, children: "Track" }),
              /* @__PURE__ */ jsxs("span", { style: { fontSize: ".84rem", fontWeight: 600 }, children: [
                "#",
                activeIdx + 1,
                " of ",
                songs.length,
                " in ",
                movie.title
              ] })
            ] }),
            movie.language && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".68rem", color: "var(--muted)", width: 80, flexShrink: 0 }, children: "Language" }),
              /* @__PURE__ */ jsxs("span", { style: { fontSize: ".84rem" }, children: [
                "🌐 ",
                movie.language
              ] })
            ] }),
            ((_d = movie.genre) == null ? void 0 : _d.length) > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".68rem", color: "var(--muted)", width: 80, flexShrink: 0 }, children: "Genre" }),
              /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 5, flexWrap: "wrap" }, children: movie.genre.map((g) => /* @__PURE__ */ jsx("span", { style: { fontSize: ".7rem", background: "rgba(201,151,58,.1)", color: "var(--gold)", padding: "2px 9px", borderRadius: 20, border: "1px solid rgba(201,151,58,.2)" }, children: g }, g)) })
            ] }),
            movie.verdict && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".68rem", color: "var(--muted)", width: 80, flexShrink: 0 }, children: "Verdict" }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".84rem", fontWeight: 700, color: ["Hit", "Super Hit", "Blockbuster"].includes(movie.verdict) ? "#4caf82" : movie.verdict === "Upcoming" ? "var(--gold)" : "var(--red)" }, children: movie.verdict })
            ] }),
            movie.imdbRating && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: ".68rem", color: "var(--muted)", width: 80, flexShrink: 0 }, children: "IMDb" }),
              /* @__PURE__ */ jsxs("span", { style: { fontSize: ".84rem", fontWeight: 700, color: "#f5c518" }, children: [
                "⭐ ",
                movie.imdbRating,
                "/10"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sd-sidebar", children: [
          /* @__PURE__ */ jsx("div", { className: "sd-sidebar-head", children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }, children: [
            movie.posterUrl && /* @__PURE__ */ jsx(
              "img",
              {
                src: movie.posterUrl,
                alt: movie.title,
                style: { width: 42, height: 58, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)", flexShrink: 0, cursor: "pointer" },
                onClick: () => navigate(movie ? moviePath(movie) : `/movie/${movie == null ? void 0 : movie._id}`),
                onError: (e) => e.target.style.display = "none"
              }
            ),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: { fontWeight: 700, fontSize: ".82rem", lineHeight: 1.3, cursor: "pointer", color: "var(--gold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                  onClick: () => navigate(movie ? moviePath(movie) : `/movie/${movie == null ? void 0 : movie._id}`),
                  children: movie.title
                }
              ),
              movie.releaseDate && /* @__PURE__ */ jsx("div", { style: { fontSize: ".64rem", color: "var(--muted)", marginTop: 2 }, children: fmtDate$2(movie.releaseDate) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "sd-tabs", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: `sd-tab${sidebarTab === "playlist" ? " active" : ""}`,
                onClick: () => setSidebarTab("playlist"),
                children: [
                  "🎵 Playlist ",
                  /* @__PURE__ */ jsxs("span", { style: { opacity: 0.6 }, children: [
                    "(",
                    songs.length,
                    ")"
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: `sd-tab${sidebarTab === "lyrics" ? " active" : ""}`,
                onClick: () => setSidebarTab("lyrics"),
                children: [
                  "✍️ Lyrics",
                  (activeSong == null ? void 0 : activeSong.lyrics) && /* @__PURE__ */ jsx("span", { style: { marginLeft: 4, width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", display: "inline-block", verticalAlign: "middle" } })
                ]
              }
            )
          ] }),
          sidebarTab === "playlist" && /* @__PURE__ */ jsx("div", { className: "sd-sidebar-list", children: songs.length === 0 ? /* @__PURE__ */ jsx("div", { style: { padding: "16px", color: "var(--muted)", fontSize: ".8rem", textAlign: "center" }, children: "No songs" }) : songs.map((s, i) => /* @__PURE__ */ jsx("div", { onContextMenu: (e) => {
            e.preventDefault();
            addToQueue(i);
          }, children: /* @__PURE__ */ jsx(SongItem, { song: s, active: i === activeIdx, onClick: () => changeActiveSong(i) }) }, i)) }),
          sidebarTab === "lyrics" && /* @__PURE__ */ jsx(LyricsPanel, { lyrics: activeSong == null ? void 0 : activeSong.lyrics, currentTime }),
          /* @__PURE__ */ jsx("div", { className: "sd-sidebar-footer", children: /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn btn-outline btn-sm",
              style: { width: "100%", justifyContent: "center", fontSize: ".74rem" },
              onClick: () => navigate(movie ? moviePath(movie) : `/movie/${movie == null ? void 0 : movie._id}`),
              children: "🎬 View Full Movie Page"
            }
          ) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sd-sections", children: [
      bySinger.length > 0 && /* @__PURE__ */ jsxs("section", { className: "sd-section", children: [
        /* @__PURE__ */ jsx("div", { className: "sd-sec-head", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h2", { className: "sd-sec-title", children: [
            "🎤 More by ",
            (_f = (_e = activeSong.singer) == null ? void 0 : _e.split(/[,&]/)[0]) == null ? void 0 : _f.trim()
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: ".66rem", color: "var(--muted)", marginTop: 2 }, children: "Songs you may also like" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "sd-hrow", style: { paddingBottom: 16 }, children: bySinger.slice(0, 12).map((s, i) => /* @__PURE__ */ jsx(SpotifyCard, { song: s, onClick: () => handleRelatedSongClick(s) }, i)) })
      ] }),
      byMusicDirector.length > 0 && /* @__PURE__ */ jsx(SongScrollRow, { title: `🎼 More by ${(_h = (_g = activeSong.musicDirector) == null ? void 0 : _g.split(/[,&]/)[0]) == null ? void 0 : _h.trim()}`, songs: byMusicDirector.slice(0, 15), onSongClick: handleRelatedSongClick }),
      byLyricist.length > 0 && /* @__PURE__ */ jsx(SongScrollRow, { title: `✍️ More by ${(_j = (_i = activeSong.lyricist) == null ? void 0 : _i.split(/[,&]/)[0]) == null ? void 0 : _j.trim()}`, songs: byLyricist.slice(0, 15), onSongClick: handleRelatedSongClick }),
      activeSong.singer && (() => {
        var _a2, _b2;
        const singerName = firstToken(activeSong.singer);
        const singerMovies = allMovies.filter(
          (m) => {
            var _a3, _b3;
            return String(m._id) !== String(movie._id) && ((_b3 = (_a3 = m.media) == null ? void 0 : _a3.songs) == null ? void 0 : _b3.some((s) => s.singer && firstToken(s.singer) === singerName));
          }
        ).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 14);
        if (!singerMovies.length) return null;
        return /* @__PURE__ */ jsxs("section", { className: "sd-section", children: [
          /* @__PURE__ */ jsx("div", { className: "sd-sec-head", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("h2", { className: "sd-sec-title", children: [
              "🎬 More films with ",
              (_b2 = (_a2 = activeSong.singer) == null ? void 0 : _a2.split(/[,&]/)[0]) == null ? void 0 : _b2.trim()
            ] }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: ".64rem", color: "var(--muted)", marginTop: 2 }, children: "Movies where this singer has songs" })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "sd-hrow", children: singerMovies.map((m) => {
            var _a3, _b3;
            return /* @__PURE__ */ jsxs("div", { className: "sd-mc", onClick: () => navigate(moviePath(m)), children: [
              /* @__PURE__ */ jsxs("div", { className: "sd-mc-box", children: [
                (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, loading: "lazy", onError: (e) => e.target.style.display = "none" }),
                !m.posterUrl && !m.thumbnailUrl && /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }, children: "🎬" }),
                /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: 6, right: 6, fontSize: ".55rem", fontWeight: 800, padding: "2px 6px", borderRadius: 8, background: "rgba(0,0,0,.75)", color: "rgba(201,151,58,.9)" }, children: [
                  (_b3 = (_a3 = m.media) == null ? void 0 : _a3.songs) == null ? void 0 : _b3.filter((s) => s.singer && firstToken(s.singer) === singerName).length,
                  " songs"
                ] })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "sd-mc-title", children: m.title }),
              /* @__PURE__ */ jsx("p", { style: { margin: "2px 0 0", fontSize: ".6rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "" })
            ] }, m._id);
          }) })
        ] });
      })(),
      ((_k = movie.cast) == null ? void 0 : _k.length) > 0 && /* @__PURE__ */ jsxs("section", { className: "sd-section", children: [
        /* @__PURE__ */ jsx("div", { className: "sd-sec-head", children: /* @__PURE__ */ jsxs("h2", { className: "sd-sec-title", children: [
          "🎭 Cast of ",
          movie.title
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "sd-hrow", children: movie.cast.map((c, i) => {
          var _a2;
          const castId = ((_a2 = c.castId) == null ? void 0 : _a2._id) || c.castId;
          return /* @__PURE__ */ jsxs("div", { style: { flexShrink: 0, width: 120, cursor: castId ? "pointer" : "default" }, onClick: () => castId && navigate(`/cast/${castId}`), children: [
            /* @__PURE__ */ jsxs("div", { style: { position: "relative", borderRadius: 9, overflow: "hidden", aspectRatio: "2/3", background: "var(--bg3)" }, children: [
              c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }, children: "👤" }),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 6px", background: "linear-gradient(to top,rgba(0,0,0,.75),transparent)" }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: ".55rem", color: "rgba(255,255,255,.7)", fontWeight: 600 }, children: c.type || "Actor" }) })
            ] }),
            /* @__PURE__ */ jsx("p", { style: { margin: "5px 0 0", fontWeight: 700, fontSize: ".7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }, children: c.name }),
            c.role && /* @__PURE__ */ jsx("p", { style: { margin: "1px 0 0", fontSize: ".62rem", color: "var(--gold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: c.role })
          ] }, i);
        }) })
      ] }),
      (() => {
        const related = allMovies.filter((m) => {
          var _a2, _b2;
          return String(m._id) !== String(movie._id) && ((_a2 = movie.genre) == null ? void 0 : _a2.length) && ((_b2 = m.genre) == null ? void 0 : _b2.some((g) => movie.genre.includes(g)));
        }).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 15);
        if (!related.length) return null;
        return /* @__PURE__ */ jsxs("section", { className: "sd-section", children: [
          /* @__PURE__ */ jsx("div", { className: "sd-sec-head", children: /* @__PURE__ */ jsx("h2", { className: "sd-sec-title", children: "🎬 Related Films" }) }),
          /* @__PURE__ */ jsx("div", { className: "sd-hrow", children: related.map((m) => /* @__PURE__ */ jsxs("div", { className: "sd-mc", onClick: () => navigate(moviePath(m)), children: [
            /* @__PURE__ */ jsxs("div", { className: "sd-mc-box", children: [
              (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, loading: "lazy", onError: (e) => e.target.style.display = "none" }),
              !m.posterUrl && !m.thumbnailUrl && /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }, children: "🎬" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "sd-mc-title", children: m.title })
          ] }, m._id)) })
        ] });
      })()
    ] }),
    showShare && /* @__PURE__ */ jsx(ShareCardModal, { song: activeSong, movie, onClose: () => setShowShare(false) }),
    /* @__PURE__ */ jsxs("div", { className: `sd-now-playing${showBar ? " visible" : ""}`, children: [
      /* @__PURE__ */ jsx("div", { className: "sd-np-thumb", children: activeSong.thumbnailUrl || (ytId ? ytThumb$2(ytId) : null) ? /* @__PURE__ */ jsx("img", { src: activeSong.thumbnailUrl || ytThumb$2(ytId), alt: activeSong.title, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }, children: "🎵" }) }),
      /* @__PURE__ */ jsxs("div", { className: "sd-np-info", children: [
        /* @__PURE__ */ jsx("div", { className: "sd-np-title", children: activeSong.title }),
        activeSong.singer && /* @__PURE__ */ jsxs("div", { className: "sd-np-singer", children: [
          "🎤 ",
          activeSong.singer
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "sd-np-btn sd-np-skip",
          title: "Previous",
          onClick: () => activeIdx > 0 && changeActiveSong(activeIdx - 1),
          style: { opacity: activeIdx > 0 ? 1 : 0.4 },
          children: "‹"
        }
      ),
      /* @__PURE__ */ jsx("button", { className: "sd-np-btn", title: isPlaying ? "Pause" : "Play", onClick: togglePlay, children: isPlaying ? "⏸" : "▶" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "sd-np-btn sd-np-skip",
          title: "Next",
          onClick: () => activeIdx < songs.length - 1 && changeActiveSong(activeIdx + 1),
          style: { opacity: activeIdx < songs.length - 1 ? 1 : 0.4 },
          children: "›"
        }
      ),
      /* @__PURE__ */ jsx("button", { className: "sd-np-btn sd-np-skip", title: "Share", onClick: () => setShowShare(true), style: { fontSize: ".75rem" }, children: "📤" })
    ] })
  ] });
}
const extractYtId$3 = (i) => {
  if (!i) return null;
  const s = String(i).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
};
const ytThumb$1 = (id) => {
  const v = extractYtId$3(id);
  return v ? `https://img.youtube.com/vi/${v}/mqdefault.jpg` : null;
};
const now$1 = /* @__PURE__ */ new Date();
const PER_PAGE = 20;
const _io = typeof window !== "undefined" ? (() => {
  const cbs = /* @__PURE__ */ new WeakMap();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      var _a;
      if (e.isIntersecting) {
        (_a = cbs.get(e.target)) == null ? void 0 : _a();
        cbs.delete(e.target);
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "300px" });
  io._cbs = cbs;
  return io;
})() : null;
const obsImg = (el, cb) => {
  if (!_io || !el) return;
  _io._cbs.set(el, cb);
  _io.observe(el);
  return () => {
    _io.unobserve(el);
    _io._cbs.delete(el);
  };
};
const CSS$2 = `
@keyframes yt-pulse { 0%,100%{opacity:1} 50%{opacity:.28} }

/* ── Root
   padding-top = navbar height (58px).
   The sticky header sits BELOW the navbar so we DON'T add extra padding here —
   content starts right after the sticky bar. ── */
.yt-root {
  min-height: 100vh;
  background: #0f0f0f;
  padding-top: 58px;   /* clear fixed Navbar only */
  color: #f1f1f1;
  font-family: inherit;
}

/* ── Sticky header — glues just below the Navbar ── */
.yt-header {
  position: sticky;
  top: 58px;            /* sits flush under the 58px Navbar */
  z-index: 99;
  background: #0f0f0f;  /* solid, no transparency — avoids bleed-through */
  border-bottom: 1px solid rgba(255,255,255,.09);
}

/* ── Search row ── */
.yt-srow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
}
@media(min-width:600px){ .yt-srow { padding: 10px 24px; } }
@media(min-width:960px){ .yt-srow { padding: 10px 32px; } }

/* Search pill */
.yt-sbox {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 580px;
  background: #272727;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: 24px;
  padding: 0 16px;
  gap: 8px;
  transition: border-color .18s;
}
.yt-sbox:focus-within {
  border-color: rgba(201,151,58,.7);
  background: #303030;
}
.yt-sbox input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #f1f1f1;
  font-size: .86rem;
  padding: 9px 0;
  min-width: 0;
}
.yt-sbox input::placeholder { color: rgba(255,255,255,.3); }
.yt-sico  { color: rgba(255,255,255,.3); font-size: .9rem; flex-shrink: 0; }
.yt-sx    { background: none; border: none; color: rgba(255,255,255,.4); cursor: pointer; font-size: .86rem; padding: 2px; flex-shrink:0; }
.yt-sx:hover { color: #fff; }

/* Song count badge — right of search */
.yt-sinfo {
  font-size: .73rem;
  color: rgba(255,255,255,.38);
  white-space: nowrap;
  flex-shrink: 0;
  display: none;
}
@media(min-width:520px){ .yt-sinfo { display: block; } }

/* ── Chips / filter row ── */
.yt-chips {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;
}
.yt-chips::-webkit-scrollbar { display: none; }
@media(min-width:600px){ .yt-chips { padding: 0 24px 10px; } }
@media(min-width:960px){ .yt-chips { padding: 0 32px 10px; } }

/* Single chip */
.yt-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #272727;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: .75rem;
  font-weight: 600;
  color: #f1f1f1;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background .15s, border-color .15s;
  user-select: none;
}
.yt-chip:hover { background: #3a3a3a; }
/* Active filter chip — white filled (YouTube style) */
.yt-chip.on {
  background: #f1f1f1;
  color: #0f0f0f;
  border-color: #f1f1f1;
  font-weight: 700;
}
.yt-chip.on:hover { background: #ddd; }
/* Active tab chip — gold tint */
.yt-chip.tab.on {
  background: rgba(201,151,58,.16);
  color: #c9973a;
  border-color: rgba(201,151,58,.5);
}
/* Invisible <select> overlay on Year chip */
.yt-chip select {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  font-size: 1rem; /* prevents iOS zoom */
}
/* × button inside chip */
.yt-cx {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: .68rem;
  padding: 0;
  line-height: 1;
  opacity: .7;
  flex-shrink: 0;
}
.yt-cx:hover { opacity: 1; }
/* Thin vertical divider between filter chips and tab chips */
.yt-chip-div {
  width: 1px;
  height: 22px;
  background: rgba(255,255,255,.12);
  flex-shrink: 0;
  margin: 0 2px;
}

/* ── Content area ── */
.yt-content {
  padding: 16px 16px 80px;
}
@media(min-width:600px){ .yt-content { padding: 18px 24px 80px; } }
@media(min-width:960px){ .yt-content { padding: 20px 32px 80px; } }

/* Result info text */
.yt-rinfo {
  font-size: .75rem;
  color: rgba(255,255,255,.38);
  margin-bottom: 16px;
}

/* ── Section header ── */
.yt-sec { margin-bottom: 36px; }
.yt-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.yt-sec-title {
  font-size: .94rem;
  font-weight: 700;
  color: #f1f1f1;
  margin: 0;
}
@media(min-width:600px){ .yt-sec-title { font-size: 1.02rem; } }
.yt-sec-cnt {
  font-size: .7rem;
  color: rgba(255,255,255,.35);
  margin-left: 6px;
  font-weight: 400;
}
.yt-va {
  font-size: .75rem;
  font-weight: 700;
  color: #3ea6ff;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.yt-va:hover { color: #71bcff; text-decoration: underline; }

/* ── Video grid ── */
.yt-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 10px;
  /* align-items: start ensures each cell is independently sized —
     no cell stretches to match its neighbour's height */
  align-items: start;
}
@media(min-width:480px)  { .yt-grid { grid-template-columns: repeat(3, 1fr); gap: 18px 12px; } }
@media(min-width:768px)  { .yt-grid { grid-template-columns: repeat(4, 1fr); gap: 20px 14px; } }
@media(min-width:1100px) { .yt-grid { grid-template-columns: repeat(5, 1fr); gap: 20px 14px; } }
@media(min-width:1440px) { .yt-grid { grid-template-columns: repeat(6, 1fr); gap: 22px 16px; } }

/* ── Video card
   width:100% + display:block so it never escapes its grid cell ── */
.yt-card {
  cursor: pointer;
  display: block;
  width: 100%;
  /* prevent ANY content inside from overflowing the card */
  overflow: hidden;
}
.yt-card:hover .yt-tw { opacity: .85; }
.yt-card:hover .yt-po { opacity: 1; }
.yt-card:hover .yt-ct { color: #3ea6ff; }

/* ── Thumbnail container
   KEY FIXES:
   1. width:100%  — fills its grid column exactly
   2. aspect-ratio:16/9  — locks height relative to width
   3. overflow:hidden  — clips anything that escapes
   4. display:block  — no inline gap below
   The img inside is ALWAYS forced to fill this container via object-fit:cover,
   regardless of the YouTube thumbnail's actual pixel dimensions (320×180,
   480×360, 1280×720 etc.) ── */
.yt-tw {
  position: relative;
  display: block;
  width: 100%;
  /* Enforce strict 16:9 — YouTube mqdefault is 320×180 which is exactly 16:9,
     but hqdefault/maxres can vary. aspect-ratio + overflow:hidden locks it. */
  aspect-ratio: 16 / 9;
  background: #272727;
  border-radius: 10px;
  overflow: hidden;
  transition: opacity .16s;
  /* contain prevents the img from influencing parent layout */
  contain: layout paint;
}
.yt-tw img {
  /* Absolutely fill the container — image size is irrelevant */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  /* Don't let the image affect layout flow */
  pointer-events: none;
}
/* Play overlay */
.yt-po {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.3);
  opacity: 0;
  transition: opacity .16s;
}
.yt-pc {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(0,0,0,.7);
  border: 2px solid rgba(255,255,255,.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
}
/* YouTube badge */
.yt-badge {
  position: absolute;
  bottom: 6px;
  right: 7px;
  background: rgba(0,0,0,.82);
  color: #f1f1f1;
  font-size: .58rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: .02em;
}
.yt-novid {
  position: absolute;
  bottom: 6px;
  left: 7px;
  background: rgba(160,0,0,.85);
  color: #fff;
  font-size: .56rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
}

/* ── Card metadata row
   Fixed height so ALL cards in the same row are identical height.
   Text clamps strictly — never pushes the card taller. ── */
.yt-cm {
  display: flex;
  gap: 8px;
  padding: 8px 2px 0;
  /* Fixed height: avatar (32px) + padding = metadata never grows */
  min-height: 72px;
  align-items: flex-start;
}
/* Channel avatar — fixed square, never resizes */
.yt-av {
  width: 32px;
  height: 32px;
  min-width: 32px;   /* prevent flex-shrink collapsing it */
  border-radius: 50%;
  background: #1c3040;
  border: 1.5px solid rgba(62,166,255,.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .74rem;
  font-weight: 700;
  color: #3ea6ff;
  flex-shrink: 0;
  overflow: hidden;
}
.yt-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.yt-ci {
  flex: 1;
  min-width: 0;   /* allow text to truncate inside flex */
  overflow: hidden;
}
/* Title — hard 2-line clamp, never wraps to 3+ lines */
.yt-ct {
  margin: 0;
  font-size: .78rem;
  font-weight: 600;
  color: #f1f1f1;
  line-height: 1.36;
  /* Clamp strictly to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* Fixed 2-line height so all title areas are same size */
  max-height: calc(1.36em * 2);
  transition: color .15s;
  word-break: break-word;
}
@media(min-width:600px){ .yt-ct { font-size: .81rem; } }
/* Singer line — single line, truncates */
.yt-ch {
  margin: 3px 0 0;
  font-size: .69rem;
  color: rgba(255,255,255,.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
/* Movie + year — single line, truncates */
.yt-cs {
  margin: 1px 0 0;
  font-size: .65rem;
  color: rgba(255,255,255,.28);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* ── Skeleton ── */
.sk-tw {
  aspect-ratio: 16 / 9;
  background: #272727;
  border-radius: 10px;
  animation: yt-pulse 1.4s ease-in-out infinite;
}
.sk-ln {
  height: 10px;
  background: #272727;
  border-radius: 4px;
  animation: yt-pulse 1.4s ease-in-out infinite;
}

/* ── Load more ── */
.yt-more { display: flex; justify-content: center; padding: 24px 0; }
.yt-more-btn {
  padding: 10px 30px;
  background: #272727;
  border: 1px solid rgba(255,255,255,.15);
  color: #f1f1f1;
  border-radius: 20px;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .16s;
}
.yt-more-btn:hover { background: #3a3a3a; }

/* ── Empty ── */
.yt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  color: rgba(255,255,255,.32);
  gap: 10px;
  text-align: center;
}
.yt-empty span { font-size: 3rem; }
.yt-empty p    { font-size: .85rem; margin: 0; }
`;
function LazyImg({ src, alt }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!src || !ref.current) return;
    return obsImg(ref.current, () => {
      if (ref.current) ref.current.src = src;
    });
  }, [src]);
  if (!src) return null;
  return /* @__PURE__ */ jsx(
    "img",
    {
      ref,
      alt: alt || "",
      decoding: "async",
      loading: "lazy",
      width: "320",
      height: "180",
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        display: "block",
        opacity: 0,
        transition: "opacity .22s"
      },
      onLoad: (e) => {
        e.target.style.opacity = "1";
      },
      onError: (e) => {
        e.target.style.opacity = ".08";
      }
    }
  );
}
const VideoCard = React.memo(function VideoCard2({ song, onClick }) {
  var _a;
  const thumb = song.thumbnailUrl || ytThumb$1(song.ytId) || song.moviePoster || "";
  const initial = (_a = (song.singer || song.movieTitle || "?")[0]) == null ? void 0 : _a.toUpperCase();
  return /* @__PURE__ */ jsxs("div", { className: "yt-card", onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "yt-tw", children: [
      /* @__PURE__ */ jsx(LazyImg, { src: thumb, alt: song.title }),
      /* @__PURE__ */ jsx("div", { className: "yt-po", children: /* @__PURE__ */ jsx("div", { className: "yt-pc", children: "▶" }) }),
      song.ytId && /* @__PURE__ */ jsx("span", { className: "yt-badge", children: "YouTube" }),
      !song.ytId && /* @__PURE__ */ jsx("span", { className: "yt-novid", children: "No video" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "yt-cm", children: [
      /* @__PURE__ */ jsx("div", { className: "yt-av", children: song.moviePoster ? /* @__PURE__ */ jsx(
        "img",
        {
          src: song.moviePoster,
          alt: song.movieTitle || "",
          width: "32",
          height: "32",
          style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
        }
      ) : /* @__PURE__ */ jsx("span", { style: { fontSize: ".74rem", fontWeight: 700 }, children: initial }) }),
      /* @__PURE__ */ jsxs("div", { className: "yt-ci", children: [
        /* @__PURE__ */ jsx("p", { className: "yt-ct", children: song.title || "Untitled" }),
        song.singer && /* @__PURE__ */ jsxs("p", { className: "yt-ch", children: [
          "🎤 ",
          song.singer
        ] }),
        song.movieTitle && /* @__PURE__ */ jsxs("p", { className: "yt-cs", children: [
          song.movieTitle,
          song.movieYear ? ` · ${song.movieYear}` : ""
        ] })
      ] })
    ] })
  ] });
});
function SkGrid({ n = 10 }) {
  return /* @__PURE__ */ jsx("div", { className: "yt-grid", children: Array.from({ length: n }).map((_, i) => /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "sk-tw", style: { animationDelay: `${i * 0.06}s` } }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, padding: "7px 1px 2px" }, children: [
      /* @__PURE__ */ jsx("div", { style: { width: 30, height: 30, borderRadius: "50%", background: "#272727", flexShrink: 0, animation: "yt-pulse 1.4s ease-in-out infinite" } }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ jsx("div", { className: "sk-ln", style: { width: "88%", marginBottom: 5, animationDelay: `${i * 0.06 + 0.08}s` } }),
        /* @__PURE__ */ jsx("div", { className: "sk-ln", style: { width: "55%", animationDelay: `${i * 0.06 + 0.16}s` } })
      ] })
    ] })
  ] }, i)) });
}
function Section({ icon, title, songs, total, onSongClick, onViewAll }) {
  const sentRef = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = sentRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVis(true);
        io.disconnect();
      }
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!songs.length) return null;
  const shown = songs.slice(0, PER_PAGE);
  return /* @__PURE__ */ jsxs("div", { className: "yt-sec", ref: sentRef, children: [
    /* @__PURE__ */ jsxs("div", { className: "yt-sec-head", children: [
      /* @__PURE__ */ jsxs("h2", { className: "yt-sec-title", children: [
        icon,
        " ",
        title,
        /* @__PURE__ */ jsx("span", { className: "yt-sec-cnt", children: total > PER_PAGE ? `${PER_PAGE} of ${total}` : total })
      ] }),
      total > PER_PAGE && onViewAll && /* @__PURE__ */ jsx("button", { className: "yt-va", onClick: onViewAll, children: "View all →" })
    ] }),
    vis ? /* @__PURE__ */ jsx("div", { className: "yt-grid", children: shown.map((s, i) => /* @__PURE__ */ jsx(VideoCard, { song: s, onClick: () => s.ytId && onSongClick(s) }, i)) }) : /* @__PURE__ */ jsx(SkGrid, { n: 8 })
  ] });
}
function AllSongs() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState(() => Cache.peek("movies") || []);
  const [loading, setLoading] = useState(() => Cache.peek("movies") === null);
  const [search, setSearch] = useState("");
  const [fYear, setFYear] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("recent");
  const isFiltering = !!(search.trim() || fYear);
  useEffect(() => {
    if (Cache.peek("movies") !== null) return;
    Cache.getMovies().catch(() => []).then((m) => {
      setMovies(m);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, fYear, tab]);
  const allSongs = useMemo(() => {
    const list = [];
    movies.forEach((m) => {
      var _a;
      const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : null;
      (((_a = m.media) == null ? void 0 : _a.songs) || []).forEach((s, idx) => {
        list.push({
          ...s,
          songIndex: idx,
          movieId: String(m._id),
          movieTitle: m.title,
          movieYear: year ? String(year) : "",
          moviePoster: m.posterUrl || m.thumbnailUrl || "",
          releaseDate: m.releaseDate || "",
          verdict: m.verdict || "",
          _slug: moviePath(m)
        });
      });
    });
    return list;
  }, [movies]);
  const years = useMemo(() => [...new Set(allSongs.map((s) => s.movieYear).filter(Boolean))].sort((a, b) => b - a), [allSongs]);
  const filtered = useMemo(() => {
    let base = allSongs;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (s) => {
          var _a, _b, _c, _d, _e;
          return ((_a = s.title) == null ? void 0 : _a.toLowerCase().includes(q)) || ((_b = s.singer) == null ? void 0 : _b.toLowerCase().includes(q)) || ((_c = s.musicDirector) == null ? void 0 : _c.toLowerCase().includes(q)) || ((_d = s.lyricist) == null ? void 0 : _d.toLowerCase().includes(q)) || ((_e = s.movieTitle) == null ? void 0 : _e.toLowerCase().includes(q));
        }
      );
    }
    if (fYear) base = base.filter((s) => s.movieYear === fYear);
    return base;
  }, [allSongs, search, fYear]);
  const recent = useMemo(() => allSongs.filter((s) => {
    if (!s.releaseDate) return false;
    const d = new Date(s.releaseDate);
    return d <= now$1 && d >= new Date(now$1.getFullYear() - 2, now$1.getMonth(), now$1.getDate());
  }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [allSongs]);
  const upcoming = useMemo(() => allSongs.filter((s) => {
    const v = s.verdict;
    return !v || v === "Upcoming" || s.releaseDate && new Date(s.releaseDate) > now$1;
  }).sort((a, b) => new Date(a.releaseDate || "2099") - new Date(b.releaseDate || "2099")), [allSongs]);
  const old = useMemo(() => allSongs.filter((s) => {
    if (!s.releaseDate) return false;
    const yr = new Date(s.releaseDate).getFullYear();
    return yr >= now$1.getFullYear() - 10 && yr < now$1.getFullYear() - 2;
  }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [allSongs]);
  const classic = useMemo(() => allSongs.filter((s) => s.releaseDate && new Date(s.releaseDate).getFullYear() < now$1.getFullYear() - 10).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [allSongs]);
  const recentYrs = useMemo(() => [...new Set(recent.map((s) => s.movieYear).filter(Boolean))].slice(0, 4), [recent]);
  const oldYrs = useMemo(() => [...new Set(old.map((s) => s.movieYear).filter(Boolean))].slice(0, 6), [old]);
  const classicYrs = useMemo(() => [...new Set(classic.map((s) => s.movieYear).filter(Boolean))].slice(0, 8), [classic]);
  const handleClick = useCallback((s) => {
    const idx = typeof s.songIndex === "number" && !isNaN(s.songIndex) ? s.songIndex : 0;
    const movieSlug = s._slug ? s._slug.replace(/^\/movie\//, "") : s.movieId;
    navigate(`/song/${movieSlug}/${idx}/${slugify(s.title || "")}-odia-song`);
  }, [navigate]);
  const shownF = filtered.slice(0, page * PER_PAGE);
  const hasMore = shownF.length < filtered.length;
  const TABS = [
    { key: "recent", label: "Recent", count: recent.length },
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "old", label: "Old", count: old.length },
    { key: "classic", label: "Old is Gold", count: classic.length }
  ].filter((t) => t.count > 0);
  const clearAll = () => {
    setSearch("");
    setFYear("");
  };
  return /* @__PURE__ */ jsxs("div", { className: "yt-root", children: [
    /* @__PURE__ */ jsx(SEO, { ...staticSEO.songs }),
    /* @__PURE__ */ jsx("style", { children: CSS$2 }),
    /* @__PURE__ */ jsxs("div", { className: "yt-header", children: [
      /* @__PURE__ */ jsxs("div", { className: "yt-srow", children: [
        /* @__PURE__ */ jsxs("div", { className: "yt-sbox", children: [
          /* @__PURE__ */ jsx("span", { className: "yt-sico", children: "🔍" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              placeholder: "Search songs, singers, movies…",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              autoComplete: "off"
            }
          ),
          search && /* @__PURE__ */ jsx("button", { className: "yt-sx", onClick: () => setSearch(""), children: "✕" })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "yt-sinfo", children: [
          "🎵 ",
          allSongs.length.toLocaleString(),
          " songs · ",
          movies.length,
          " movies"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "yt-chips", children: [
        /* @__PURE__ */ jsx("div", { className: `yt-chip${fYear ? " on" : ""}`, children: fYear ? /* @__PURE__ */ jsxs(Fragment, { children: [
          fYear,
          " ",
          /* @__PURE__ */ jsx("button", { className: "yt-cx", onClick: () => setFYear(""), children: "✕" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          "📅 Year",
          /* @__PURE__ */ jsxs("select", { value: fYear, onChange: (e) => setFYear(e.target.value), title: "Filter by year", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "All Years" }),
            years.map((y) => /* @__PURE__ */ jsx("option", { value: y, children: y }, y))
          ] })
        ] }) }),
        fYear && /* @__PURE__ */ jsx(
          "div",
          {
            className: "yt-chip",
            onClick: clearAll,
            style: { color: "#ff6b6b", borderColor: "rgba(255,107,107,.3)", background: "rgba(255,107,107,.07)" },
            children: "✕ Clear"
          }
        ),
        !isFiltering && TABS.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "yt-chip-div" }),
          TABS.map((t) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: `yt-chip tab${tab === t.key ? " on" : ""}`,
              onClick: () => setTab(t.key),
              children: [
                t.label,
                /* @__PURE__ */ jsx("span", { style: { fontSize: ".62rem", opacity: 0.5, marginLeft: 3 }, children: t.count })
              ]
            },
            t.key
          ))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "yt-content", children: [
      loading && /* @__PURE__ */ jsx(SkGrid, { n: 12 }),
      !loading && isFiltering && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { className: "yt-rinfo", children: [
          filtered.length === 0 ? "No results" : `${filtered.length.toLocaleString()} result${filtered.length !== 1 ? "s" : ""}`,
          fYear && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · Year: ",
            /* @__PURE__ */ jsx("strong", { style: { color: "#f1f1f1" }, children: fYear })
          ] })
        ] }),
        filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "yt-empty", children: [
          /* @__PURE__ */ jsx("span", { children: "🎵" }),
          /* @__PURE__ */ jsx("p", { children: "No songs match your filters." }),
          /* @__PURE__ */ jsx("button", { className: "yt-more-btn", style: { marginTop: 8 }, onClick: clearAll, children: "Clear filters" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "yt-grid", children: shownF.map((s, i) => /* @__PURE__ */ jsx(VideoCard, { song: s, onClick: () => s.ytId && handleClick(s) }, i)) }),
          hasMore && /* @__PURE__ */ jsx("div", { className: "yt-more", children: /* @__PURE__ */ jsxs("button", { className: "yt-more-btn", onClick: () => setPage((p) => p + 1), children: [
            "Load more · ",
            filtered.length - shownF.length,
            " remaining"
          ] }) })
        ] })
      ] }),
      !loading && !isFiltering && /* @__PURE__ */ jsxs(Fragment, { children: [
        tab === "recent" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Section, { icon: "🆕", title: "Recent Songs", songs: recent, total: recent.length, onSongClick: handleClick, onViewAll: () => setFYear(String(now$1.getFullYear())) }),
          recentYrs.map((yr) => {
            const ys = recent.filter((s) => s.movieYear === yr);
            return ys.length ? /* @__PURE__ */ jsx(Section, { icon: "📅", title: `${yr} Songs`, songs: ys, total: ys.length, onSongClick: handleClick, onViewAll: () => setFYear(yr) }, yr) : null;
          })
        ] }),
        tab === "upcoming" && /* @__PURE__ */ jsx(Section, { icon: "🚀", title: "Upcoming Songs", songs: upcoming, total: upcoming.length, onSongClick: handleClick }),
        tab === "old" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Section, { icon: "📀", title: "Old Songs", songs: old, total: old.length, onSongClick: handleClick }),
          oldYrs.map((yr) => {
            const ys = old.filter((s) => s.movieYear === yr);
            return ys.length ? /* @__PURE__ */ jsx(Section, { icon: "📅", title: `${yr} Songs`, songs: ys, total: ys.length, onSongClick: handleClick, onViewAll: () => setFYear(yr) }, yr) : null;
          })
        ] }),
        tab === "classic" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Section, { icon: "🏆", title: "Old is Gold", songs: classic, total: classic.length, onSongClick: handleClick }),
          classicYrs.map((yr) => {
            const ys = classic.filter((s) => s.movieYear === yr);
            return ys.length ? /* @__PURE__ */ jsx(Section, { icon: "🎵", title: `${yr} Songs`, songs: ys, total: ys.length, onSongClick: handleClick, onViewAll: () => setFYear(yr) }, yr) : null;
          })
        ] })
      ] })
    ] })
  ] });
}
const CSS$1 = `
.about-root {
  max-width: 860px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  color: var(--text);
}
.about-root h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 900;
  margin: 0 0 20px;
  color: var(--gold);
}
.about-hero-box {
  background: linear-gradient(135deg, rgba(201,151,58,.1), rgba(201,151,58,.03));
  border: 1px solid rgba(201,151,58,.2);
  border-radius: 14px;
  padding: 32px;
  margin-bottom: 40px;
  text-align: center;
}
.about-hero-box .emoji { font-size: 3.5rem; display: block; margin-bottom: 12px; }
.about-hero-box h2 { font-size: 1.4rem; font-weight: 900; color: var(--gold); margin: 0 0 10px; font-family: 'Playfair Display', serif; }
.about-hero-box p { font-size: .87rem; line-height: 1.7; color: rgba(255,255,255,.7); max-width: 560px; margin: 0 auto; }
.about-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}
@media (max-width: 540px) { .about-stats { grid-template-columns: 1fr; } }
.about-stat {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}
.about-stat .num { font-size: 1.8rem; font-weight: 900; color: var(--gold); }
.about-stat .label { font-size: .75rem; color: var(--muted); margin-top: 4px; }
.about-section h2 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 12px;
  color: var(--text);
}
.about-section p, .about-section li {
  font-size: .87rem;
  line-height: 1.75;
  color: rgba(255,255,255,.7);
}
.about-section ul { padding-left: 22px; margin: 8px 0; }
.about-section { margin-bottom: 32px; }
.policy-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
  font-size: .82rem;
  color: var(--muted);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: color .2s;
}
.policy-back:hover { color: var(--gold); }
`;
function AboutUs() {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "About Us — Ollypedia | Odia Cinema Encyclopedia" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "Learn about Ollypedia — your complete encyclopedia of Odia cinema. Our mission, story and how to contribute." })
    ] }),
    /* @__PURE__ */ jsx("style", { children: CSS$1 }),
    /* @__PURE__ */ jsxs("div", { className: "about-root", children: [
      /* @__PURE__ */ jsx("button", { className: "policy-back", onClick: () => navigate(-1), children: "← Back" }),
      /* @__PURE__ */ jsxs("div", { className: "about-hero-box", children: [
        /* @__PURE__ */ jsx("span", { className: "emoji", children: "🎬" }),
        /* @__PURE__ */ jsx("h2", { children: "Ollypedia — The Odia Cinema Encyclopedia" }),
        /* @__PURE__ */ jsx("p", { children: "Your complete, community-powered database of Odia (Ollywood) movies, actors, songs, trailers and entertainment news. We're passionate about celebrating Odia cinema and its artists." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-stats", children: [
        /* @__PURE__ */ jsxs("div", { className: "about-stat", children: [
          /* @__PURE__ */ jsx("div", { className: "num", children: "500+" }),
          /* @__PURE__ */ jsx("div", { className: "label", children: "Movies Listed" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "about-stat", children: [
          /* @__PURE__ */ jsx("div", { className: "num", children: "1000+" }),
          /* @__PURE__ */ jsx("div", { className: "label", children: "Cast & Crew" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "about-stat", children: [
          /* @__PURE__ */ jsx("div", { className: "num", children: "5000+" }),
          /* @__PURE__ */ jsx("div", { className: "label", children: "Songs & Trailers" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-section", children: [
        /* @__PURE__ */ jsx("h2", { children: "🎯 Our Mission" }),
        /* @__PURE__ */ jsx("p", { children: "Ollipedia was created to give Odia cinema the digital home it deserves. Our goal is to make it easy for fans, researchers, and film enthusiasts to discover, explore and celebrate everything about Ollywood — from classic films to the latest releases." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-section", children: [
        /* @__PURE__ */ jsx("h2", { children: "✨ What We Offer" }),
        /* @__PURE__ */ jsxs("ul", { children: [
          /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Movie Database:" }),
            " Comprehensive listings of Odia films with cast, crew, trailers, songs and box office information."
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Cast Profiles:" }),
            " Detailed profiles for actors, directors, music directors and other film industry professionals."
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Songs & Trailers:" }),
            " Watch trailers and listen to songs directly from our platform via YouTube integration."
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Latest News:" }),
            " Stay up to date with the latest happenings in Odia entertainment."
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Box Office Verdicts:" }),
            " Track whether films are blockbusters, hits, or flops."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-section", children: [
        /* @__PURE__ */ jsx("h2", { children: "📖 Our Story" }),
        /* @__PURE__ */ jsx("p", { children: "Ollipedia started as a personal project by a group of Odia cinema lovers who noticed a lack of a reliable, well-organised online resource for Ollywood films. What began as a simple spreadsheet evolved into a full-featured web platform dedicated to documenting and celebrating Odia cinema heritage." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-section", children: [
        /* @__PURE__ */ jsx("h2", { children: "🤝 Contribute" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "We welcome contributions from the community. If you notice missing information, incorrect data, or want to help us grow the database, please reach out through our ",
          /* @__PURE__ */ jsx("a", { href: "/contact", style: { color: "var(--gold)" }, children: "Contact page" }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-section", children: [
        /* @__PURE__ */ jsx("h2", { children: "📬 Get in Touch" }),
        /* @__PURE__ */ jsx("p", { children: "Have questions, suggestions, or just want to say hello?" }),
        /* @__PURE__ */ jsxs("ul", { children: [
          /* @__PURE__ */ jsxs("li", { children: [
            "Email: ",
            /* @__PURE__ */ jsx("a", { href: "mailto:alekhpradhan18@gmail.com", style: { color: "var(--gold)" }, children: "alekhpradhan18@gmail.com" })
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            "Visit our ",
            /* @__PURE__ */ jsx("a", { href: "/contact", style: { color: "var(--gold)" }, children: "Contact page" }),
            " to send us a message directly."
          ] })
        ] })
      ] })
    ] })
  ] });
}
const CSS = `
.contact-root {
  max-width: 860px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  color: var(--text);
}
.contact-root h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 900;
  margin: 0 0 8px;
  color: var(--gold);
}
.contact-root .subtitle {
  font-size: .87rem;
  color: var(--muted);
  margin-bottom: 40px;
  display: block;
}
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}
@media (max-width: 680px) { .contact-grid { grid-template-columns: 1fr; } }
.contact-form {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px;
}
.contact-form h2 { font-size: 1rem; font-weight: 800; margin: 0 0 20px; color: var(--text); }
.cf-group { margin-bottom: 16px; }
.cf-label { display: block; font-size: .76rem; font-weight: 700; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
.cf-input, .cf-textarea, .cf-select {
  width: 100%;
  background: var(--bg3, #1a1a1a);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text);
  font-size: .85rem;
  font-family: inherit;
  outline: none;
  transition: border .2s;
  box-sizing: border-box;
}
.cf-input:focus, .cf-textarea:focus, .cf-select:focus {
  border-color: rgba(201,151,58,.5);
}
.cf-textarea { min-height: 110px; resize: vertical; }
.cf-submit {
  width: 100%;
  padding: 12px;
  background: var(--gold, #c9973a);
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: .87rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity .2s;
  margin-top: 4px;
}
.cf-submit:hover { opacity: .88; }
.cf-submit:disabled { opacity: .5; cursor: not-allowed; }
.contact-info-cards { display: flex; flex-direction: column; gap: 16px; }
.contact-info-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.contact-info-card .icon {
  font-size: 1.4rem;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(201,151,58,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.contact-info-card .label { font-size: .73rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
.contact-info-card .value { font-size: .85rem; color: var(--text); }
.contact-info-card a { color: var(--gold); text-decoration: none; }
.contact-info-card a:hover { text-decoration: underline; }
.success-box {
  background: rgba(149,229,184,.1);
  border: 1px solid rgba(149,229,184,.3);
  border-radius: 10px;
  padding: 16px 20px;
  color: #95e5b8;
  font-size: .85rem;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.policy-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
  font-size: .82rem;
  color: var(--muted);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: color .2s;
}
.policy-back:hover { color: var(--gold); }
`;
function ContactUs() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", subject: "General Inquiry", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    setError("");
    try {
      await API.submitContact(form);
      setSent(true);
      setForm({ name: "", email: "", subject: "General Inquiry", message: "" });
    } catch (e) {
      setError(typeof (e == null ? void 0 : e.message) === "string" ? e.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "Contact Us — Ollypedia" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "Get in touch with Ollypedia. Report errors, suggest additions, or send us your feedback." })
    ] }),
    /* @__PURE__ */ jsx("style", { children: CSS }),
    /* @__PURE__ */ jsxs("div", { className: "contact-root", children: [
      /* @__PURE__ */ jsx("button", { className: "policy-back", onClick: () => navigate(-1), children: "← Back" }),
      /* @__PURE__ */ jsx("h1", { children: "Contact Us" }),
      /* @__PURE__ */ jsx("span", { className: "subtitle", children: "We'd love to hear from you — corrections, suggestions, business inquiries, all welcome." }),
      /* @__PURE__ */ jsxs("div", { className: "contact-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "contact-form", children: [
          /* @__PURE__ */ jsx("h2", { children: "✉️ Send a Message" }),
          /* @__PURE__ */ jsxs("div", { className: "cf-group", children: [
            /* @__PURE__ */ jsx("label", { className: "cf-label", children: "Your Name *" }),
            /* @__PURE__ */ jsx("input", { className: "cf-input", value: form.name, onChange: set("name"), placeholder: "Full name" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "cf-group", children: [
            /* @__PURE__ */ jsx("label", { className: "cf-label", children: "Email Address *" }),
            /* @__PURE__ */ jsx("input", { className: "cf-input", type: "email", value: form.email, onChange: set("email"), placeholder: "you@example.com" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "cf-group", children: [
            /* @__PURE__ */ jsx("label", { className: "cf-label", children: "Subject" }),
            /* @__PURE__ */ jsxs("select", { className: "cf-select", value: form.subject, onChange: set("subject"), children: [
              /* @__PURE__ */ jsx("option", { children: "General Inquiry" }),
              /* @__PURE__ */ jsx("option", { children: "Report Incorrect Info" }),
              /* @__PURE__ */ jsx("option", { children: "Add/Update Movie" }),
              /* @__PURE__ */ jsx("option", { children: "Advertise With Us" }),
              /* @__PURE__ */ jsx("option", { children: "Copyright Issue" }),
              /* @__PURE__ */ jsx("option", { children: "Technical Problem" }),
              /* @__PURE__ */ jsx("option", { children: "Other" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "cf-group", children: [
            /* @__PURE__ */ jsx("label", { className: "cf-label", children: "Message *" }),
            /* @__PURE__ */ jsx("textarea", { className: "cf-textarea", value: form.message, onChange: set("message"), placeholder: "Write your message here…" })
          ] }),
          !sent ? /* @__PURE__ */ jsxs(Fragment, { children: [
            error && /* @__PURE__ */ jsxs("div", { style: { background: "rgba(220,50,50,.1)", border: "1px solid rgba(220,50,50,.3)", borderRadius: 8, padding: "10px 14px", color: "#e87a7a", fontSize: ".82rem", marginBottom: 10 }, children: [
              "⚠️ ",
              error
            ] }),
            /* @__PURE__ */ jsx("button", { className: "cf-submit", onClick: handleSubmit, disabled: sending || !form.name || !form.email || !form.message, children: sending ? "Sending…" : "Send Message" })
          ] }) : /* @__PURE__ */ jsx("div", { className: "success-box", children: "✅ Message sent! We'll get back to you within 24–48 hours." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "contact-info-cards", children: [
          /* @__PURE__ */ jsxs("div", { className: "contact-info-card", children: [
            /* @__PURE__ */ jsx("div", { className: "icon", children: "📧" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "label", children: "Email" }),
              /* @__PURE__ */ jsx("div", { className: "value", children: /* @__PURE__ */ jsx("a", { href: "mailto:contact@ollipedia.in", children: "alekhpradhan18@gmail.com" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-info-card", children: [
            /* @__PURE__ */ jsx("div", { className: "icon", children: "🌐" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "label", children: "Website" }),
              /* @__PURE__ */ jsx("div", { className: "value", children: /* @__PURE__ */ jsx("a", { href: "https://ollypedia.in", children: "ollypedia.in" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-info-card", children: [
            /* @__PURE__ */ jsx("div", { className: "icon", children: "📍" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "label", children: "Based in" }),
              /* @__PURE__ */ jsx("div", { className: "value", children: "Odisha, India" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-info-card", children: [
            /* @__PURE__ */ jsx("div", { className: "icon", children: "⏰" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "label", children: "Response Time" }),
              /* @__PURE__ */ jsx("div", { className: "value", children: "Within 24–48 hours (Mon–Sat)" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-info-card", children: [
            /* @__PURE__ */ jsx("div", { className: "icon", children: "📢" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "label", children: "Advertise With Us" }),
              /* @__PURE__ */ jsxs("div", { className: "value", children: [
                "Reach thousands of Odia cinema fans daily. ",
                /* @__PURE__ */ jsx("a", { href: "alekhpradhan18@gmail.com", children: "alekhpradhan18@gmail.com" })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const FOOTER_CSS = `
.site-footer {
  background: linear-gradient(to bottom, var(--bg2), #0a0a0a);
  border-top: 1px solid rgba(255,255,255,.07);
  padding: 48px 24px 24px;
  margin-top: 60px;
  font-size: .82rem;
  color: var(--muted, #888);
}
.footer-inner {
  max-width: 1300px;
  margin: 0 auto;
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}
@media (max-width: 900px) {
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
}
@media (max-width: 540px) {
  .footer-grid { grid-template-columns: 1fr; gap: 24px; }
}
.footer-brand-name {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--gold, #c9973a);
  letter-spacing: -.02em;
  font-family: 'Playfair Display', serif;
  margin: 0 0 10px;
}
.footer-brand-desc {
  font-size: .79rem;
  line-height: 1.65;
  color: var(--muted, #888);
  max-width: 280px;
  margin: 0 0 18px;
}
.footer-social {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.footer-social-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text, #eee);
  font-size: .74rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all .2s;
}
.footer-social-btn:hover {
  border-color: rgba(201,151,58,.45);
  background: rgba(201,151,58,.08);
  color: var(--gold, #c9973a);
}
.footer-col-title {
  font-size: .72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text, #eee);
  margin: 0 0 16px;
}
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-links a, .footer-links button {
  color: var(--muted, #888);
  text-decoration: none;
  font-size: .8rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: color .2s;
}
.footer-links a:hover, .footer-links button:hover {
  color: var(--gold, #c9973a);
}
.footer-divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,.06);
  margin: 0 0 20px;
}
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-bottom-links {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.footer-bottom-links a {
  color: var(--muted, #888);
  text-decoration: none;
  font-size: .76rem;
  transition: color .2s;
}
.footer-bottom-links a:hover {
  color: var(--gold, #c9973a);
}
.footer-disclaimer {
  font-size: .68rem;
  color: rgba(255,255,255,.25);
  line-height: 1.6;
  margin-top: 14px;
}
`;
function Footer() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: FOOTER_CSS }),
    /* @__PURE__ */ jsx("footer", { className: "site-footer", children: /* @__PURE__ */ jsxs("div", { className: "footer-inner", children: [
      /* @__PURE__ */ jsxs("div", { className: "footer-grid", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "footer-brand-name", children: "🎬 Ollypedia" }),
          /* @__PURE__ */ jsx("p", { className: "footer-brand-desc", children: "Your complete encyclopedia of Odia cinema — movies, cast, songs, trailers and news all in one place." }),
          /* @__PURE__ */ jsxs("div", { className: "footer-social", children: [
            /* @__PURE__ */ jsxs("a", { href: "https://facebook.com", target: "_blank", rel: "noopener noreferrer", className: "footer-social-btn", children: [
              /* @__PURE__ */ jsx("span", { children: "f" }),
              " Facebook"
            ] }),
            /* @__PURE__ */ jsxs("a", { href: "https://youtube.com", target: "_blank", rel: "noopener noreferrer", className: "footer-social-btn", children: [
              /* @__PURE__ */ jsx("span", { children: "▶" }),
              " YouTube"
            ] }),
            /* @__PURE__ */ jsxs("a", { href: "https://instagram.com", target: "_blank", rel: "noopener noreferrer", className: "footer-social-btn", children: [
              /* @__PURE__ */ jsx("span", { children: "◎" }),
              " Instagram"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "footer-col-title", children: "Explore" }),
          /* @__PURE__ */ jsxs("ul", { className: "footer-links", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/", children: "🏠 Home" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/movies", children: "🎬 Movies" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/cast", children: "👥 Cast & Crew" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/songs", children: "🎵 Songs" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/news", children: "📰 News" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "footer-col-title", children: "Company" }),
          /* @__PURE__ */ jsxs("ul", { className: "footer-links", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/about", children: "About Us" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/contact", children: "Contact Us" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "/sitemap.xml", target: "_blank", rel: "noopener noreferrer", children: "Sitemap" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "footer-col-title", children: "Legal" }),
          /* @__PURE__ */ jsx("ul", { className: "footer-links", children: /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/privacy-policy", children: "Privacy Policy" }) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("hr", { className: "footer-divider" }),
      /* @__PURE__ */ jsxs("div", { className: "footer-bottom", children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: ".76rem" }, children: [
          "© ",
          year,
          " ",
          /* @__PURE__ */ jsx("strong", { style: { color: "var(--gold)" }, children: "Ollypedia" }),
          ". All rights reserved."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "footer-bottom-links", children: [
          /* @__PURE__ */ jsx(Link, { to: "/privacy-policy", children: "Privacy Policy" }),
          /* @__PURE__ */ jsx(Link, { to: "/contact", children: "Contact" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "footer-disclaimer", children: "All movie titles, posters, trailers and related media are trademarks and property of their respective owners and production companies. Ollypedia is an independent fan site and is not affiliated with any film studio or production house. Content on this site is for informational and entertainment purposes only." })
    ] }) })
  ] });
}
const PAGE_CSS = `
.policy-root {
  max-width: 860px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  color: var(--text);
}
.policy-root h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 900;
  margin: 0 0 6px;
  color: var(--gold);
}
.policy-root .updated {
  font-size: .78rem;
  color: var(--muted);
  margin-bottom: 36px;
  display: block;
}
.policy-root h2 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 32px 0 10px;
  color: var(--text);
}
.policy-root p, .policy-root li {
  font-size: .87rem;
  line-height: 1.75;
  color: rgba(255,255,255,.72);
}
.policy-root ul {
  padding-left: 22px;
  margin: 8px 0;
}
.policy-root a {
  color: var(--gold);
  text-decoration: none;
}
.policy-root a:hover { text-decoration: underline; }
.policy-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
  font-size: .82rem;
  color: var(--muted);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: color .2s;
}
.policy-back:hover { color: var(--gold); }
`;
function PrivacyPolicy() {
  const navigate = useNavigate();
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "Privacy Policy — Ollypedia" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "Privacy Policy for Ollypedia — how we collect, use and protect your information." })
    ] }),
    /* @__PURE__ */ jsx("style", { children: PAGE_CSS }),
    /* @__PURE__ */ jsxs("div", { className: "policy-root", children: [
      /* @__PURE__ */ jsx("button", { className: "policy-back", onClick: () => navigate(-1), children: "← Back" }),
      /* @__PURE__ */ jsx("h1", { children: "Privacy Policy" }),
      /* @__PURE__ */ jsxs("span", { className: "updated", children: [
        "Last updated: ",
        (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Welcome to ",
        /* @__PURE__ */ jsx("strong", { children: "Ollypedia" }),
        ' ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information about you when you visit our website.'
      ] }),
      /* @__PURE__ */ jsx("h2", { children: "1. Information We Collect" }),
      /* @__PURE__ */ jsx("p", { children: "We may collect the following types of information:" }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Usage Data:" }),
          " Pages visited, time spent, links clicked, browser type, device type, and IP address (collected automatically)."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Cookies & Tracking:" }),
          " We use cookies and similar tracking technologies to improve your experience and show relevant advertisements."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Third-Party Services:" }),
          " We use Google Analytics and Google AdSense, which may collect data according to their own privacy policies."
        ] })
      ] }),
      /* @__PURE__ */ jsx("h2", { children: "2. How We Use Your Information" }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsx("li", { children: "To operate and improve our website" }),
        /* @__PURE__ */ jsx("li", { children: "To analyse site traffic and usage patterns" }),
        /* @__PURE__ */ jsx("li", { children: "To serve personalised and non-personalised advertisements via Google AdSense" }),
        /* @__PURE__ */ jsx("li", { children: "To comply with legal obligations" })
      ] }),
      /* @__PURE__ */ jsx("h2", { children: "3. Google AdSense & Advertising" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "We use Google AdSense to display advertisements on our website. Google may use cookies to serve ads based on your prior visits to our website or other websites. You can opt out of personalised advertising by visiting ",
        /* @__PURE__ */ jsx("a", { href: "https://www.google.com/settings/ads", target: "_blank", rel: "noopener noreferrer", children: "Google Ad Settings" }),
        "."
      ] }),
      /* @__PURE__ */ jsx("p", { children: "Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the Internet." }),
      /* @__PURE__ */ jsx("h2", { children: "4. Cookies" }),
      /* @__PURE__ */ jsx("p", { children: "Our website uses cookies to enhance your browsing experience. Cookies are small files stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our website may not function properly without cookies." }),
      /* @__PURE__ */ jsx("p", { children: "Types of cookies we use:" }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Essential Cookies:" }),
          " Necessary for the website to function."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Analytics Cookies:" }),
          " Help us understand how visitors interact with our website (Google Analytics)."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Advertising Cookies:" }),
          " Used to display relevant advertisements (Google AdSense)."
        ] })
      ] }),
      /* @__PURE__ */ jsx("h2", { children: "5. Third-Party Links" }),
      /* @__PURE__ */ jsx("p", { children: "Our website may contain links to third-party websites, including YouTube for trailers and videos. We are not responsible for the privacy practices of those websites. We encourage you to read their privacy policies." }),
      /* @__PURE__ */ jsx("h2", { children: "6. Children's Privacy" }),
      /* @__PURE__ */ jsx("p", { children: "Our website is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us to have it removed." }),
      /* @__PURE__ */ jsx("h2", { children: "7. Data Security" }),
      /* @__PURE__ */ jsx("p", { children: "We implement reasonable technical and organisational measures to protect your information. However, no method of transmission over the internet is 100% secure." }),
      /* @__PURE__ */ jsx("h2", { children: "8. Your Rights" }),
      /* @__PURE__ */ jsx("p", { children: "Depending on your location, you may have rights to access, correct, or delete your personal data. To exercise these rights, please contact us using the details below." }),
      /* @__PURE__ */ jsx("h2", { children: "9. Changes to This Policy" }),
      /* @__PURE__ */ jsx("p", { children: 'We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page.' }),
      /* @__PURE__ */ jsx("h2", { children: "10. Contact Us" }),
      /* @__PURE__ */ jsx("p", { children: "If you have any questions about this Privacy Policy, please contact us at:" }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "Email: ",
          /* @__PURE__ */ jsx("a", { href: "mailto:alekhpradhan18@gmail.com", children: "alekhpradhan18@gmail.com" })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Website: ",
          /* @__PURE__ */ jsx("a", { href: "/contact", children: "ollypedia.in/contact" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { style: { marginTop: 32, fontSize: ".75rem", color: "rgba(255,255,255,.3)" }, children: [
        "© ",
        year,
        " Ollypedia. All rights reserved."
      ] })
    ] })
  ] });
}
const extractYtId$2 = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb = (ytId) => {
  const id = extractYtId$2(ytId);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};
const heroImage = (m) => {
  var _a, _b;
  return m.thumbnailUrl || ytThumb((_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) || m.posterUrl || null;
};
const fmtDate$1 = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
const now = /* @__PURE__ */ new Date();
const withinDays = (d, pastDays, futureDays) => {
  if (!d) return false;
  const diff = (new Date(d) - now) / 864e5;
  return diff >= -pastDays && diff <= futureDays;
};
const isThisWeek = (d) => withinDays(d, 7, 14);
const isThisMonth = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};
const isLastMonth = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
};
const isLastWeek = (d) => withinDays(d, 14, 0);
function HeroSlide({ movie, active }) {
  var _a, _b, _c;
  const navigate = useNavigate();
  const img = heroImage(movie);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `home-hero-slide ${active ? "active" : ""}`,
      style: { backgroundImage: img ? `url(${img})` : "none" },
      children: [
        /* @__PURE__ */ jsx("div", { className: "home-hero-overlay" }),
        /* @__PURE__ */ jsxs("div", { className: "home-hero-content", children: [
          /* @__PURE__ */ jsxs("div", { className: "home-hero-meta", children: [
            movie.category && /* @__PURE__ */ jsx("span", { className: "home-tag", children: movie.category }),
            ((_a = movie.genre) == null ? void 0 : _a[0]) && /* @__PURE__ */ jsx("span", { className: "home-tag-outline", children: movie.genre[0] }),
            movie.language && /* @__PURE__ */ jsx("span", { className: "home-tag-outline", children: movie.language })
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "home-hero-title", children: movie.title }),
          /* @__PURE__ */ jsxs("div", { className: "home-hero-info", children: [
            movie.releaseDate && /* @__PURE__ */ jsxs("span", { children: [
              "🗓 ",
              new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            ] }),
            movie.director && /* @__PURE__ */ jsxs("span", { children: [
              "Dir. ",
              movie.director
            ] }),
            movie.verdict && movie.verdict !== "Upcoming" && /* @__PURE__ */ jsx("span", { className: "home-hero-verdict-badge", children: movie.verdict })
          ] }),
          movie.synopsis && /* @__PURE__ */ jsxs("p", { className: "home-hero-synopsis", children: [
            movie.synopsis.slice(0, 160),
            movie.synopsis.length > 160 ? "…" : ""
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "home-hero-actions", children: [
            ((_c = (_b = movie.media) == null ? void 0 : _b.trailer) == null ? void 0 : _c.ytId) && /* @__PURE__ */ jsx(
              "a",
              {
                href: `https://www.youtube.com/watch?v=${movie.media.trailer.ytId}`,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "btn-hero-play",
                children: "▶ Watch Trailer"
              }
            ),
            /* @__PURE__ */ jsx("button", { className: "btn-hero-info", onClick: () => navigate(`/movie/${movie._id}`), children: "More Info" })
          ] })
        ] })
      ]
    }
  );
}
function MovieCard({ movie }) {
  var _a, _b, _c;
  const navigate = useNavigate();
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb((_b = (_a = movie.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId);
  return /* @__PURE__ */ jsxs("div", { className: "home-card", onClick: () => navigate(`/movie/${movie._id}`), children: [
    /* @__PURE__ */ jsxs("div", { className: "home-card-img", children: [
      img ? /* @__PURE__ */ jsx(
        "img",
        {
          src: img,
          alt: movie.title,
          loading: "lazy",
          onError: (e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }
        }
      ) : null,
      /* @__PURE__ */ jsx("div", { className: "home-card-fallback", style: { display: img ? "none" : "flex" }, children: "🎬" }),
      /* @__PURE__ */ jsxs("div", { className: "home-card-overlay", children: [
        /* @__PURE__ */ jsx("span", { className: "home-card-verdict", children: movie.verdict || "Upcoming" }),
        ((_c = movie.genre) == null ? void 0 : _c[0]) && /* @__PURE__ */ jsx("span", { className: "home-card-genre", children: movie.genre[0] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-card-info", children: [
      /* @__PURE__ */ jsx("p", { className: "home-card-title", children: movie.title }),
      movie.releaseDate && /* @__PURE__ */ jsx("p", { className: "home-card-date", children: fmtDate$1(movie.releaseDate) })
    ] })
  ] });
}
function MovieRow({ title, movies, viewAllPath }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const scroll = (d) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: d * 280, behavior: "smooth" });
  };
  const limited = movies.slice(0, 15);
  if (!movies.length) return null;
  return /* @__PURE__ */ jsxs("section", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: title }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        (movies.length > 15 || viewAllPath) && /* @__PURE__ */ jsxs("button", { className: "home-view-all", onClick: () => navigate(viewAllPath || "/movies"), children: [
          "View All (",
          movies.length,
          ")"
        ] }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(-1), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(1), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row", ref: rowRef, children: limited.map((m) => /* @__PURE__ */ jsx(MovieCard, { movie: m }, m._id)) })
  ] });
}
function TrailersRow({ movies }) {
  const rowRef = useRef(null);
  const scroll = (d) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: d * 340, behavior: "smooth" });
  };
  const withTrailer = movies.filter((m) => {
    var _a, _b;
    return (_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId;
  }).slice(0, 15);
  if (!withTrailer.length) return null;
  return /* @__PURE__ */ jsxs("section", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: "🎬 Latest Trailers" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(-1), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(1), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row home-trailer-row", ref: rowRef, children: withTrailer.map((m) => /* @__PURE__ */ jsxs(
      "a",
      {
        href: `https://www.youtube.com/watch?v=${m.media.trailer.ytId}`,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "home-trailer-card",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "home-trailer-thumb", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: ytThumb(m.media.trailer.ytId),
                alt: m.title,
                onError: (e) => e.target.style.opacity = "0"
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "home-trailer-play", children: "▶" }),
            /* @__PURE__ */ jsx("div", { className: "home-trailer-duration", children: "Trailer" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "home-trailer-info", children: [
            /* @__PURE__ */ jsx("p", { className: "home-trailer-title", children: m.title }),
            m.releaseDate && /* @__PURE__ */ jsx("p", { className: "home-trailer-date", children: fmtDate$1(m.releaseDate) })
          ] })
        ]
      },
      m._id
    )) })
  ] });
}
function NewsRow({ news }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const scroll = (d) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: d * 300, behavior: "smooth" });
  };
  if (!news.length) return null;
  return /* @__PURE__ */ jsxs("section", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: "📰 Latest News" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("button", { className: "home-view-all", onClick: () => navigate("/news"), children: "View All" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(-1), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(1), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row home-news-row", ref: rowRef, children: news.map((n) => /* @__PURE__ */ jsxs("div", { className: "home-news-card", onClick: () => navigate(`/news/${n._id}`), children: [
      n.imageUrl && /* @__PURE__ */ jsx("div", { className: "home-news-img", children: /* @__PURE__ */ jsx("img", { src: n.imageUrl, alt: n.title, onError: (e) => e.target.style.display = "none" }) }),
      /* @__PURE__ */ jsxs("div", { className: "home-news-body", children: [
        n.category && /* @__PURE__ */ jsx("span", { className: "home-news-cat", children: n.category }),
        /* @__PURE__ */ jsx("p", { className: "home-news-title", children: n.title }),
        n.movieTitle && /* @__PURE__ */ jsx("p", { className: "home-news-movie", children: n.movieTitle })
      ] })
    ] }, n._id)) })
  ] });
}
function SongsRow({ movies }) {
  const rowRef = useRef(null);
  const scroll = (d) => {
    var _a;
    return (_a = rowRef.current) == null ? void 0 : _a.scrollBy({ left: d * 220, behavior: "smooth" });
  };
  const songs = [];
  movies.forEach((m) => {
    var _a;
    (((_a = m.media) == null ? void 0 : _a.songs) || []).forEach((s) => {
      if (s.ytId) songs.push({ ...s, movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl });
    });
  });
  if (!songs.length) return null;
  return /* @__PURE__ */ jsxs("section", { className: "home-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "home-section-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "home-section-title", children: "🎵 Latest Songs" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(-1), children: "‹" }),
        /* @__PURE__ */ jsx("button", { className: "home-arrow", onClick: () => scroll(1), children: "›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "home-row home-songs-row", ref: rowRef, children: songs.slice(0, 15).map((s, i) => /* @__PURE__ */ jsxs(
      "a",
      {
        href: `https://www.youtube.com/watch?v=${s.ytId}`,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "home-song-card",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "home-song-thumb", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: s.thumbnailUrl || ytThumb(s.ytId) || s.posterUrl || "",
                alt: s.title,
                onError: (e) => e.target.style.opacity = "0.2"
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "home-song-play", children: "♪" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "home-song-info", children: [
            /* @__PURE__ */ jsx("p", { className: "home-song-title", children: s.title }),
            /* @__PURE__ */ jsx("p", { className: "home-song-singer", children: s.singer }),
            /* @__PURE__ */ jsx("p", { className: "home-song-movie", children: s.movieTitle })
          ] })
        ]
      },
      i
    )) })
  ] });
}
function Home({ production }) {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [news, setNews] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  useEffect(() => {
    Promise.all([
      API.getMovies().catch(() => []),
      API.getNews().catch(() => [])
    ]).then(([m, n]) => {
      setMovies(m);
      setNews(n.slice(0, 12));
      setLoading(false);
    });
  }, []);
  const heroMovies = movies.filter((m) => {
    var _a, _b;
    const hasImg = m.thumbnailUrl || ((_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) || m.posterUrl;
    if (!hasImg) return false;
    if (!m.verdict || m.verdict === "Upcoming") return true;
    if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
    if (isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate)) return true;
    return false;
  }).sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 8);
  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(() => setHeroIdx((i) => (i + 1) % heroMovies.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [heroMovies.length]);
  const goHero = (i) => {
    setHeroIdx(i);
    clearInterval(timerRef.current);
  };
  const allMovies = [...movies].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const thisWeek = movies.filter((m) => isThisWeek(m.releaseDate) && !m.releaseTBA);
  const thisMonth = movies.filter((m) => isThisMonth(m.releaseDate));
  const lastMonth = movies.filter((m) => isLastMonth(m.releaseDate));
  const lastWeek = movies.filter((m) => isLastWeek(m.releaseDate) && !isThisWeek(m.releaseDate));
  const upcoming = movies.filter((m) => !m.verdict || m.verdict === "Upcoming");
  const inTheatres = movies.filter((m) => ["Hit", "Average", "Flop", "Super Hit", "Blockbuster"].includes(m.verdict));
  const highRated = movies.filter((m) => {
    var _a;
    return ((_a = m.reviews) == null ? void 0 : _a.length) >= 1;
  }).map((m) => ({ ...m, avg: m.reviews.reduce((s, r) => s + (r.rating || 0), 0) / m.reviews.length })).filter((m) => m.avg >= 3.5).sort((a, b) => b.avg - a.avg);
  if (loading) return /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--muted)" }, children: "Loading…" });
  return /* @__PURE__ */ jsxs("div", { className: "home-root", children: [
    heroMovies.length > 0 && /* @__PURE__ */ jsxs("div", { className: "home-hero", children: [
      heroMovies.map((m, i) => /* @__PURE__ */ jsx(HeroSlide, { movie: m, active: i === heroIdx }, m._id)),
      /* @__PURE__ */ jsx("div", { className: "home-hero-dots", children: heroMovies.map((_, i) => /* @__PURE__ */ jsx(
        "button",
        {
          className: `home-hero-dot ${i === heroIdx ? "active" : ""}`,
          onClick: () => goHero(i)
        },
        i
      )) }),
      /* @__PURE__ */ jsx("div", { className: "home-hero-strip", children: heroMovies.map((m, i) => {
        var _a, _b;
        const img = heroImage(m);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: `home-hero-strip-item ${i === heroIdx ? "active" : ""}`,
            onClick: () => goHero(i),
            children: [
              img ? /* @__PURE__ */ jsx("img", { src: img, alt: m.title, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { className: "home-strip-fallback", children: "🎬" }),
              ((_b = (_a = m.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.ytId) && /* @__PURE__ */ jsx("div", { className: "home-strip-play", children: "▶" })
            ]
          },
          m._id
        );
      }) })
    ] }),
    production && /* @__PURE__ */ jsxs("div", { className: "home-cta-bar", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "Welcome back, ",
        /* @__PURE__ */ jsx("strong", { children: production.name })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => navigate("/dashboard/add-movie"), children: "+ Add Movie" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "home-sections", children: [
      thisWeek.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "🔥 Releasing This Week", movies: thisWeek }),
      thisMonth.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "🗓 This Month", movies: thisMonth }),
      lastWeek.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "📅 Last Week", movies: lastWeek }),
      lastMonth.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "📆 Last Month", movies: lastMonth }),
      inTheatres.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "🎭 Now in Theatres", movies: inTheatres }),
      /* @__PURE__ */ jsx(TrailersRow, { movies: allMovies }),
      /* @__PURE__ */ jsx(NewsRow, { news }),
      /* @__PURE__ */ jsx(SongsRow, { movies: allMovies }),
      highRated.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "⭐ Top Rated", movies: highRated }),
      upcoming.length > 0 && /* @__PURE__ */ jsx(MovieRow, { title: "🚀 Upcoming Movies", movies: upcoming, viewAllPath: "/movies" }),
      /* @__PURE__ */ jsx(MovieRow, { title: "🎬 All Movies", movies: allMovies, viewAllPath: "/movies" }),
      movies.length === 0 && /* @__PURE__ */ jsxs("div", { className: "home-empty", children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "4rem", marginBottom: 16 }, children: "🎬" }),
        /* @__PURE__ */ jsx("h2", { children: "No movies yet" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)" }, children: "Be the first to add a film to Ollipedia" }),
        production && /* @__PURE__ */ jsx("button", { className: "btn btn-gold", onClick: () => navigate("/dashboard/add-movie"), children: "+ Add Movie" })
      ] })
    ] })
  ] });
}
const GENRES$1 = ["Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical", "Devotional", "Horror"];
const CATEGORIES$1 = ["Feature Film", "Short Film", "Web Series", "Documentary"];
const CAST_TYPES$1 = ["Actor", "Actress", "Director", "Producer", "Music Director", "Cinematographer", "Choreographer", "Lyricist", "Singer", "Editor", "Other"];
const STEPS = ["Basic Info", "Cast & Crew", "Collaborators", "Media", "Review & Submit"];
const isOid$1 = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());
const extractYtId$1 = (input) => {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return "";
};
function StepBar({ current }) {
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", marginBottom: 32 }, children: STEPS.map((label, i) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.82rem",
        flexShrink: 0,
        background: i < current ? "var(--gold)" : i === current ? "rgba(201,151,58,0.18)" : "var(--bg3)",
        color: i < current ? "#000" : i === current ? "var(--gold)" : "var(--muted)",
        border: i === current ? "2px solid var(--gold)" : "2px solid transparent",
        transition: "all 0.2s"
      }, children: i < current ? "✓" : i + 1 }),
      /* @__PURE__ */ jsx("span", { style: {
        fontSize: "0.6rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        color: i === current ? "var(--gold)" : "var(--muted)"
      }, children: label })
    ] }),
    i < STEPS.length - 1 && /* @__PURE__ */ jsx("div", { style: {
      flex: 1,
      height: 2,
      margin: "0 4px",
      marginBottom: 22,
      background: i < current ? "var(--gold)" : "var(--border)",
      transition: "background 0.3s"
    } })
  ] }, i)) });
}
function CastCard({ entry, index, onRoleChange, onRemove }) {
  const icons = { Director: "🎬", Producer: "🎥", "Music Director": "🎵", Cinematographer: "📷", Choreographer: "💃", Lyricist: "✍️", Singer: "🎤", Editor: "✂️", Actor: "🎭", Actress: "🎭" };
  const icon = icons[entry.type] || "👤";
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "var(--bg3)", padding: "11px 14px", borderRadius: 8, border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ jsx("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "var(--bg2)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--border)", fontSize: "1.1rem" }, children: entry.photo ? /* @__PURE__ */ jsx("img", { src: entry.photo, alt: entry.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => {
      e.target.style.display = "none";
    } }) : icon }),
    /* @__PURE__ */ jsx("div", { style: { flex: 1, minWidth: 0 }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: "0.88rem" }, children: entry.name }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10, background: "rgba(201,151,58,0.14)", color: "var(--gold)" }, children: entry.type }),
      entry.isNew ? /* @__PURE__ */ jsx("span", { style: { fontSize: "0.64rem", color: "#e8b96a", fontWeight: 600 }, children: "✦ NEW" }) : /* @__PURE__ */ jsx("span", { style: { fontSize: "0.64rem", color: "#4caf82", fontWeight: 600 }, children: "✓ LINKED" })
    ] }) }),
    /* @__PURE__ */ jsx("input", { className: "form-input", style: { width: 150, flexShrink: 0 }, value: entry.role, placeholder: "Character / role", onChange: (e) => onRoleChange(index, e.target.value) }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: () => onRemove(index), style: { color: "var(--red)", flexShrink: 0 }, title: "Remove", children: "✕" })
  ] });
}
function AddMovie({ production, onToast }) {
  var _a, _b;
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Feature Film",
    genre: [],
    releaseDate: "",
    releaseTBA: false,
    language: "Odia",
    budget: "",
    synopsis: "",
    posterUrl: "",
    thumbnailUrl: ""
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGenre = (g) => set("genre", form.genre.includes(g) ? form.genre.filter((x) => x !== g) : [...form.genre, g]);
  const [cast, setCast] = useState([]);
  const [castQuery, setCastQuery] = useState("");
  const [castResults, setCastResults] = useState([]);
  const [castSearching, setCastSearching] = useState(false);
  const [showNewCast, setShowNewCast] = useState(false);
  const [nc, setNc] = useState({ name: "", type: "Actor", role: "", photo: "", bio: "" });
  const castTimer = useRef(null);
  const [collabs, setCollabs] = useState([]);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const collabTimer = useRef(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [songs, setSongs] = useState([]);
  const [sf, setSf] = useState({ url: "", title: "", singer: "", thumb: "" });
  useEffect(() => {
    if (!castQuery.trim()) {
      setCastResults([]);
      return;
    }
    clearTimeout(castTimer.current);
    castTimer.current = setTimeout(async () => {
      setCastSearching(true);
      try {
        setCastResults(await API.searchCast(castQuery));
      } catch {
        setCastResults([]);
      } finally {
        setCastSearching(false);
      }
    }, 300);
    return () => clearTimeout(castTimer.current);
  }, [castQuery]);
  useEffect(() => {
    if (!collabQuery.trim()) {
      setCollabResults([]);
      return;
    }
    clearTimeout(collabTimer.current);
    collabTimer.current = setTimeout(async () => {
      try {
        const res = await API.searchProductions(collabQuery);
        setCollabResults(res.filter((p) => String(p._id) !== String(production == null ? void 0 : production._id)));
      } catch {
        setCollabResults([]);
      }
    }, 300);
    return () => clearTimeout(collabTimer.current);
  }, [collabQuery, production]);
  const addExistingCast = useCallback((c) => {
    const idStr = String(c._id || "").trim();
    if (!isOid$1(idStr)) return;
    if (cast.some((x) => x.castId === idStr)) return;
    setCast((prev) => [...prev, {
      castId: idStr,
      // ← plain "abc123..." hex string, NEVER ObjectId object
      isNew: false,
      name: String(c.name || ""),
      photo: String(c.photo || ""),
      type: String(c.type || "Actor"),
      role: ""
    }]);
    setCastQuery("");
    setCastResults([]);
  }, [cast]);
  const addNewCast = useCallback(() => {
    const name = nc.name.trim();
    if (!name) return;
    if (cast.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      setNc({ name: "", type: "Actor", role: "", photo: "", bio: "" });
      setShowNewCast(false);
      return;
    }
    setCast((prev) => [...prev, {
      castId: "",
      // ← empty string signals "create new" to backend
      isNew: true,
      name,
      type: nc.type,
      role: nc.role.trim(),
      photo: nc.photo.trim(),
      bio: nc.bio.trim()
    }]);
    setNc({ name: "", type: "Actor", role: "", photo: "", bio: "" });
    setShowNewCast(false);
  }, [cast, nc]);
  const updateCastRole = (i, role) => setCast((p) => p.map((c, idx) => idx === i ? { ...c, role } : c));
  const removeCast = (i) => setCast((p) => p.filter((_, idx) => idx !== i));
  const removeCollab = (i) => setCollabs((p) => p.filter((_, idx) => idx !== i));
  const addCollabSafe = (p) => {
    setCollabs((prev) => {
      if (prev.some((x) => String(x._id) === String(p._id))) return prev;
      return [...prev, p];
    });
    setCollabQuery("");
    setCollabResults([]);
  };
  const handleSongUrlChange = (val) => {
    const id = extractYtId$1(val);
    setSf((f) => ({ ...f, url: val, thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "" }));
  };
  const addSong = () => {
    if (!sf.title.trim()) return;
    const id = extractYtId$1(sf.url);
    setSongs((p) => [...p, { title: sf.title.trim(), singer: sf.singer.trim(), ytId: id, thumbnailUrl: sf.thumb || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "") }]);
    setSf({ url: "", title: "", singer: "", thumb: "" });
  };
  const removeSong = (i) => setSongs((p) => p.filter((_, idx) => idx !== i));
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Movie title is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const castPayload = cast.map((c) => ({
        castId: isOid$1(c.castId) ? c.castId : "",
        // ALWAYS a plain string
        isNew: !isOid$1(c.castId),
        name: String(c.name || ""),
        type: String(c.type || "Actor"),
        role: String(c.role || ""),
        photo: String(c.photo || ""),
        bio: String(c.bio || "")
      }));
      const trailerYtId = extractYtId$1(trailerUrl);
      const body = {
        title: String(form.title).trim(),
        category: String(form.category || "Feature Film"),
        genre: [...form.genre || []],
        releaseDate: form.releaseTBA ? "" : String(form.releaseDate || ""),
        releaseTBA: !!form.releaseTBA,
        language: String(form.language || "Odia"),
        budget: String(form.budget || ""),
        synopsis: String(form.synopsis || ""),
        posterUrl: String(form.posterUrl || ""),
        thumbnailUrl: String(form.thumbnailUrl || ""),
        cast: castPayload,
        media: {
          trailer: trailerYtId ? { ytId: trailerYtId } : {},
          songs: songs.map((s) => ({
            title: String(s.title || ""),
            singer: String(s.singer || ""),
            ytId: String(s.ytId || ""),
            thumbnailUrl: String(s.thumbnailUrl || "")
          }))
        },
        collaborators: collabs.map((c) => String(c._id || "").trim()).filter((id) => isOid$1(id))
      };
      const safeBody = JSON.parse(JSON.stringify(body));
      const movie = await API.createMovie(safeBody);
      onToast == null ? void 0 : onToast(`"${movie.title}" created successfully!`);
      navigate(`/movie/${movie._id}`);
    } catch (e) {
      setError(typeof e === "string" ? e : (e == null ? void 0 : e.message) || "Failed to create movie. Please try again.");
      setLoading(false);
    }
  };
  if (!production || !getToken()) return /* @__PURE__ */ jsx("div", { className: "page empty-state", children: /* @__PURE__ */ jsx("h3", { children: "Please login to add movies." }) });
  const trailerYtIdPreview = extractYtId$1(trailerUrl);
  return /* @__PURE__ */ jsxs("div", { className: "register-page", style: { maxWidth: 800 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "register-header", children: [
      /* @__PURE__ */ jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: () => navigate("/dashboard"), children: "← Back to Portal" }) }),
      /* @__PURE__ */ jsx("h1", { children: "Add New Film" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Adding as ",
        /* @__PURE__ */ jsx("strong", { style: { color: "var(--gold)" }, children: production.name })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "register-card", children: [
      /* @__PURE__ */ jsx(StepBar, { current: step }),
      step === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Movie Title *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.title, onChange: (e) => set("title", e.target.value), placeholder: "e.g. Daman", autoFocus: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Category" }),
            /* @__PURE__ */ jsx("select", { className: "form-select", value: form.category, onChange: (e) => set("category", e.target.value), children: CATEGORIES$1.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Language" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: form.language, onChange: (e) => set("language", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Release Date" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", type: "date", value: form.releaseDate, onChange: (e) => set("releaseDate", e.target.value), disabled: form.releaseTBA }),
            /* @__PURE__ */ jsxs("label", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer" }, children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: form.releaseTBA, onChange: (e) => set("releaseTBA", e.target.checked) }),
              " TBA"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Budget" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: form.budget, onChange: (e) => set("budget", e.target.value), placeholder: "e.g. ₹2 Crore" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Genres" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: GENRES$1.map((g) => /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "badge",
              onClick: () => toggleGenre(g),
              style: { cursor: "pointer", borderColor: form.genre.includes(g) ? "var(--gold)" : "var(--border)", color: form.genre.includes(g) ? "var(--gold)" : "var(--muted)", background: form.genre.includes(g) ? "rgba(201,151,58,0.1)" : "transparent" },
              children: [
                form.genre.includes(g) ? "✓ " : "",
                g
              ]
            },
            g
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxs("label", { className: "form-label", children: [
            "Poster URL ",
            /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontWeight: 400 }, children: "(portrait 2:3)" })
          ] }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.posterUrl, onChange: (e) => set("posterUrl", e.target.value), placeholder: "https://…" }),
          form.posterUrl && /* @__PURE__ */ jsx("img", { src: form.posterUrl, alt: "poster", style: { marginTop: 8, height: 120, borderRadius: 4, border: "1px solid var(--border)", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxs("label", { className: "form-label", children: [
            "Banner / Thumbnail URL ",
            /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontWeight: 400 }, children: "(landscape 16:9 — homepage hero)" })
          ] }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.thumbnailUrl, onChange: (e) => set("thumbnailUrl", e.target.value), placeholder: "https://…" }),
          form.thumbnailUrl && /* @__PURE__ */ jsx("img", { src: form.thumbnailUrl, alt: "banner", style: { marginTop: 8, width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }, onError: (e) => e.target.style.display = "none" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Synopsis" }),
          /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.synopsis, onChange: (e) => set("synopsis", e.target.value), style: { minHeight: 90 }, placeholder: "Brief story description…" })
        ] })
      ] }),
      step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { marginBottom: 10 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Search existing cast & crew" }),
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.78rem", color: "var(--muted)", margin: "4px 0 10px" }, children: "Search by name to link to an existing profile in the database." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginBottom: 20 }, children: [
          /* @__PURE__ */ jsx("input", { className: "form-input", value: castQuery, onChange: (e) => setCastQuery(e.target.value), placeholder: "Type name to search…" }),
          (castSearching || castResults.length > 0 || castQuery.trim() && !castSearching) && /* @__PURE__ */ jsxs("div", { className: "search-dropdown", children: [
            castSearching && /* @__PURE__ */ jsx("div", { className: "search-dropdown-item", style: { color: "var(--muted)" }, children: "Searching…" }),
            !castSearching && castResults.length === 0 && castQuery.trim() && /* @__PURE__ */ jsxs("div", { className: "search-dropdown-item", style: { color: "var(--muted)", fontSize: "0.82rem" }, children: [
              'No results for "',
              castQuery,
              '" — use Add New Member below'
            ] }),
            castResults.map((r) => {
              const idStr = String(r._id || "").trim();
              const already = cast.some((x) => x.castId === idStr);
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "search-dropdown-item",
                  onClick: () => !already && addExistingCast(r),
                  style: { opacity: already ? 0.5 : 1, cursor: already ? "default" : "pointer" },
                  children: [
                    r.photo && /* @__PURE__ */ jsx("img", { src: r.photo, alt: r.name, style: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }),
                    /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                      /* @__PURE__ */ jsx("span", { style: { fontWeight: 600 }, children: r.name }),
                      /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)", fontSize: "0.72rem", marginLeft: 8 }, children: r.type })
                    ] }),
                    /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: already ? "var(--muted)" : "#4caf82" }, children: already ? "already added" : "✓ existing" })
                  ]
                },
                idStr
              );
            })
          ] })
        ] }),
        !showNewCast ? /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", type: "button", style: { marginBottom: 20 }, onClick: () => setShowNewCast(true), children: "+ Add New Member" }) : /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "16px 18px", marginBottom: 20 }, children: [
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)", marginBottom: 12 }, children: "✦ New Cast / Crew Member" }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Full Name *" }),
              /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.name, onChange: (e) => setNc((f) => ({ ...f, name: e.target.value })), placeholder: "Full name", autoFocus: true })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Type *" }),
              /* @__PURE__ */ jsx("select", { className: "form-select", value: nc.type, onChange: (e) => setNc((f) => ({ ...f, type: e.target.value })), children: CAST_TYPES$1.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Character / Role" }),
              /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.role, onChange: (e) => setNc((f) => ({ ...f, role: e.target.value })), placeholder: "e.g. Arjun" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Photo URL" }),
              /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.photo, onChange: (e) => setNc((f) => ({ ...f, photo: e.target.value })), placeholder: "https://… (optional)" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", style: { marginBottom: 12 }, children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Bio (optional)" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.bio, onChange: (e) => setNc((f) => ({ ...f, bio: e.target.value })), placeholder: "Short bio…" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.15)", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.7 }, children: "ℹ️ A new public Cast profile will be created and linked to this movie." }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", type: "button", onClick: addNewCast, disabled: !nc.name.trim(), children: "✓ Add to Cast" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: () => {
              setShowNewCast(false);
              setNc({ name: "", type: "Actor", role: "", photo: "", bio: "" });
            }, children: "Cancel" })
          ] })
        ] }),
        cast.length > 0 ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
          /* @__PURE__ */ jsxs("p", { className: "form-label", style: { marginBottom: 4 }, children: [
            "Cast & Crew (",
            cast.length,
            ")"
          ] }),
          cast.map((c, i) => /* @__PURE__ */ jsx(CastCard, { entry: c, index: i, onRoleChange: updateCastRole, onRemove: removeCast }, `${c.castId || c.name}-${i}`)),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--border)" }, children: ["Director", "Producer", "Actor", "Actress", "Music Director"].map((type) => {
            const count = cast.filter((c) => c.type === type).length;
            if (!count) return null;
            return /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", padding: "3px 10px", borderRadius: 10, background: "rgba(201,151,58,0.08)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.2)" }, children: [
              type,
              ": ",
              count
            ] }, type);
          }) })
        ] }) : /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "32px 20px", background: "var(--bg3)", borderRadius: 8, border: "1px dashed var(--border)" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 8 }, children: "🎭" }),
          /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem" }, children: "No cast added yet." }),
          /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.75rem", marginTop: 4 }, children: "You can skip this and add cast later from the movie page." })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }, children: "Add other registered production companies as collaborators. They can post news but cannot edit movie details." }),
        /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginBottom: 20 }, children: [
          /* @__PURE__ */ jsx("input", { className: "form-input", value: collabQuery, onChange: (e) => setCollabQuery(e.target.value), placeholder: "Search production company name…" }),
          collabResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "search-dropdown", children: collabResults.map((p) => /* @__PURE__ */ jsxs("div", { className: "search-dropdown-item", onClick: () => addCollabSafe(p), children: [
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 600 }, children: p.name }),
            p.location && /* @__PURE__ */ jsxs("span", { style: { color: "var(--muted)", fontSize: "0.75rem", marginLeft: 8 }, children: [
              "📍 ",
              p.location
            ] })
          ] }, p._id)) })
        ] }),
        collabs.length > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: collabs.map((p, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg3)", padding: "12px 16px", borderRadius: 6, border: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 600 }, children: p.name }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: () => removeCollab(i), style: { color: "var(--red)" }, children: "Remove" })
        ] }, i)) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: "0.85rem" }, children: "No collaborators. You can skip this step." })
      ] }),
      step === 3 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Trailer (YouTube URL or ID)" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: trailerUrl, onChange: (e) => setTrailerUrl(e.target.value), placeholder: "e.g. https://youtube.com/watch?v=dQw4w9WgXcQ" }),
          trailerYtIdPreview && /* @__PURE__ */ jsx("div", { style: { marginTop: 10, maxWidth: 420, position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 6 }, children: /* @__PURE__ */ jsx(
            "iframe",
            {
              src: `https://www.youtube.com/embed/${trailerYtIdPreview}`,
              allowFullScreen: true,
              title: "Trailer preview",
              style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx("hr", { className: "divider" }),
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Songs" }),
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "YouTube URL or ID" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.url, onChange: (e) => handleSongUrlChange(e.target.value), placeholder: "Paste YouTube link" })
          ] }),
          sf.thumb && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "8px 10px", background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.15)", borderRadius: 5 }, children: [
            /* @__PURE__ */ jsx("img", { src: sf.thumb, alt: "thumb", style: { width: 80, height: 45, objectFit: "cover", borderRadius: 4 }, onError: (e) => e.target.style.opacity = "0.3" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--gold)", marginBottom: 2 }, children: "🎵 Thumbnail detected" }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.65rem", color: "var(--muted)" }, children: [
                "ID: ",
                extractYtId$1(sf.url)
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Song Title *" }),
              /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.title, onChange: (e) => setSf((f) => ({ ...f, title: e.target.value })), placeholder: "Song name" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
              /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: "Singer(s)" }),
              /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.singer, onChange: (e) => setSf((f) => ({ ...f, singer: e.target.value })), placeholder: "Singer name" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", type: "button", onClick: addSong, disabled: !sf.title.trim(), children: "+ Add Song" })
        ] }),
        songs.length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
          /* @__PURE__ */ jsxs("p", { className: "form-label", style: { marginBottom: 4 }, children: [
            "Songs (",
            songs.length,
            ")"
          ] }),
          songs.map((s, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "var(--bg3)", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }, children: [
            s.thumbnailUrl ? /* @__PURE__ */ jsx("img", { src: s.thumbnailUrl, alt: s.title, style: { width: 72, height: 40, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.opacity = "0.2" }) : /* @__PURE__ */ jsx("div", { style: { width: 72, height: 40, background: "var(--bg2)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }, children: "🎵" }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.85rem" }, children: s.title }),
              s.singer && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--gold)" }, children: s.singer })
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: () => removeSong(i), style: { color: "var(--red)", flexShrink: 0 }, children: "✕" })
          ] }, i))
        ] })
      ] }),
      step === 4 && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.82rem", marginBottom: 20 }, children: "Review everything before submitting." }),
        form.posterUrl && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 20, marginBottom: 24, alignItems: "flex-start" }, children: [
          /* @__PURE__ */ jsx("img", { src: form.posterUrl, alt: "poster", style: { width: 80, height: 110, objectFit: "cover", borderRadius: 6, border: "2px solid var(--border)", flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.4rem", marginBottom: 6 }, children: form.title }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "var(--gold)", background: "rgba(201,151,58,0.12)", padding: "3px 10px", borderRadius: 10 }, children: form.category })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column" }, children: [
          ["Title", form.title || "—"],
          ["Category", form.category],
          ["Language", form.language],
          ["Release", form.releaseTBA ? "TBA" : form.releaseDate || "—"],
          ["Budget", form.budget || "—"],
          ["Genres", form.genre.join(", ") || "—"],
          ["Director", ((_a = cast.find((c) => c.type === "Director")) == null ? void 0 : _a.name) || "—"],
          ["Producer", ((_b = cast.find((c) => c.type === "Producer")) == null ? void 0 : _b.name) || "—"],
          ["Total cast", String(cast.length)],
          ["  New members", String(cast.filter((c) => c.isNew).length)],
          ["  Linked", String(cast.filter((c) => !c.isNew).length)],
          ["Collaborators", collabs.length === 0 ? "None" : collabs.map((c) => c.name).join(", ")],
          ["Songs", String(songs.length)],
          ["Trailer", trailerUrl ? "✓ Added" : "—"]
        ].map(([label, value]) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, padding: "9px 0", borderBottom: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: 160, flexShrink: 0 }, children: label }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.88rem" }, children: value })
        ] }, label)) }),
        error && /* @__PURE__ */ jsxs("div", { style: { marginTop: 20, color: "var(--red)", background: "rgba(217,79,61,0.1)", padding: "12px 16px", borderRadius: 6, fontSize: "0.85rem", border: "1px solid rgba(217,79,61,0.3)" }, children: [
          "⚠️ ",
          error
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: "btn btn-outline btn-sm",
            type: "button",
            onClick: () => step > 0 ? setStep((s) => s - 1) : navigate("/dashboard"),
            children: [
              "← ",
              step === 0 ? "Cancel" : "Back"
            ]
          }
        ),
        step < STEPS.length - 1 ? /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-gold btn-sm",
            type: "button",
            onClick: () => {
              setError("");
              setStep((s) => s + 1);
            },
            disabled: step === 0 && !form.title.trim(),
            children: "Next →"
          }
        ) : /* @__PURE__ */ jsx("button", { className: "btn btn-gold", type: "button", onClick: handleSubmit, disabled: loading, children: loading ? "Creating…" : "🎬 Create Movie" })
      ] })
    ] })
  ] });
}
const ALL_ROLES = [
  "Actor",
  "Actress",
  "Director",
  "Producer",
  "Music Director",
  "Singer",
  "Lyricist",
  "Cinematographer",
  "Choreographer",
  "Background Score",
  "Editor",
  "Art Director",
  "Costume Designer",
  "Stunt Director",
  "Voice Artist",
  "Other"
];
function CastRegister({ onSuccess, onToast }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: [],
    gender: "",
    dob: "",
    location: "",
    bio: "",
    photo: ""
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (r) => set("roles", form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]);
  const steps = ["Personal Info", "Your Roles", "Review & Register"];
  const validate = () => {
    if (step === 0) {
      if (!form.name.trim()) return "Full name is required";
      if (!form.email) return "Email is required";
      if (form.password.length < 6) return "Password must be at least 6 characters";
      if (form.password !== form.confirmPassword) return "Passwords do not match";
    }
    if (step === 1) {
      if (form.roles.length === 0) return "Select at least one role";
    }
    return null;
  };
  const next = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };
  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const { token, castMember } = await API.castRegister({
        name: form.name,
        email: form.email,
        password: form.password,
        roles: form.roles,
        gender: form.gender,
        dob: form.dob,
        location: form.location,
        bio: form.bio,
        photo: form.photo
      });
      setCastToken(token);
      onSuccess == null ? void 0 : onSuccess(castMember, token);
      onToast == null ? void 0 : onToast(`Welcome, ${castMember.name}! Your profile is ready.`);
      navigate("/cast-portal");
    } catch (e) {
      setError(typeof e === "string" ? e : "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "register-page", style: { maxWidth: 680 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "register-header", children: [
      /* @__PURE__ */ jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsx(Link, { to: "/", className: "btn btn-ghost btn-sm", children: "← Back to Home" }) }),
      /* @__PURE__ */ jsx("h1", { children: "Join as Industry Professional" }),
      /* @__PURE__ */ jsx("p", { children: "Create your artist profile on Ollipedia — the Ollywood database" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "register-card", children: [
      /* @__PURE__ */ jsx("div", { className: "register-steps", children: steps.map((s, i) => /* @__PURE__ */ jsx("div", { className: `register-step ${i === step ? "active" : i < step ? "done" : ""}`, children: i < step ? "✓" : i + 1 }, s)) }),
      /* @__PURE__ */ jsxs("p", { style: { textAlign: "center", color: "var(--muted)", fontSize: "0.82rem", marginBottom: 24 }, children: [
        "Step ",
        step + 1,
        " of ",
        steps.length,
        " — ",
        /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: steps[step] })
      ] }),
      step === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Full Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "Your real name or screen name" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Email *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "email", value: form.email, onChange: (e) => set("email", e.target.value), placeholder: "your@email.com" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Password *" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", value: form.password, onChange: (e) => set("password", e.target.value), placeholder: "Min 6 characters" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Confirm Password *" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", value: form.confirmPassword, onChange: (e) => set("confirmPassword", e.target.value), placeholder: "Repeat password" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Gender" }),
            /* @__PURE__ */ jsxs("select", { className: "form-select", value: form.gender, onChange: (e) => set("gender", e.target.value), children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
              /* @__PURE__ */ jsx("option", { children: "Male" }),
              /* @__PURE__ */ jsx("option", { children: "Female" }),
              /* @__PURE__ */ jsx("option", { children: "Non-binary" }),
              /* @__PURE__ */ jsx("option", { children: "Prefer not to say" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { className: "form-label", children: "Date of Birth" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", type: "date", value: form.dob, onChange: (e) => set("dob", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Location" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.location, onChange: (e) => set("location", e.target.value), placeholder: "e.g. Bhubaneswar, Odisha" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.photo, onChange: (e) => set("photo", e.target.value), placeholder: "https://…" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Bio" }),
          /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.bio, onChange: (e) => set("bio", e.target.value), style: { minHeight: 80 }, placeholder: "Brief introduction…" })
        ] })
      ] }),
      step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.6 }, children: "Select all roles that apply to you. Your portal will show features relevant to each role. You can update this later." }),
        /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 24 }, children: ALL_ROLES.map((r) => {
          const active = form.roles.includes(r);
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => toggleRole(r),
              style: {
                padding: "12px 14px",
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                background: active ? "rgba(201,151,58,0.12)" : "var(--bg3)",
                color: active ? "var(--gold)" : "var(--muted)",
                fontWeight: active ? 700 : 400,
                fontFamily: "inherit",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s"
              },
              children: [
                /* @__PURE__ */ jsx("span", { children: active ? "✓" : "○" }),
                r
              ]
            },
            r
          );
        }) }),
        form.roles.length > 0 && /* @__PURE__ */ jsxs("div", { style: { background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.2)", borderRadius: 6, padding: 12 }, children: [
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.78rem", color: "var(--gold)", fontWeight: 700, marginBottom: 6 }, children: "Your roles:" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: form.roles.map((r) => /* @__PURE__ */ jsx("span", { style: { background: "rgba(201,151,58,0.15)", color: "var(--gold)", fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }, children: r }, r)) })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 20, alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("div", { style: { width: 72, height: 72, borderRadius: "50%", background: "var(--bg3)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }, children: form.photo ? /* @__PURE__ */ jsx("img", { src: form.photo, alt: form.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "👤" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.3rem", marginBottom: 4 }, children: form.name }),
            /* @__PURE__ */ jsx("p", { style: { fontSize: "0.8rem", color: "var(--muted)" }, children: form.email }),
            form.location && /* @__PURE__ */ jsxs("p", { style: { fontSize: "0.8rem", color: "var(--muted)" }, children: [
              "📍 ",
              form.location
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.78rem", color: "var(--muted)", marginBottom: 6 }, children: "ROLES" }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: form.roles.map((r) => /* @__PURE__ */ jsx("span", { style: { background: "rgba(201,151,58,0.15)", color: "var(--gold)", fontSize: "0.78rem", padding: "4px 12px", borderRadius: 10, fontWeight: 600 }, children: r }, r)) })
        ] }),
        form.bio && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }, children: "BIO" }),
          /* @__PURE__ */ jsx("p", { style: { fontSize: "0.85rem" }, children: form.bio })
        ] })
      ] }),
      error && /* @__PURE__ */ jsx("p", { style: { color: "var(--red)", fontSize: "0.85rem", margin: "16px 0 0" }, children: error }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, marginTop: 28 }, children: [
        step > 0 && /* @__PURE__ */ jsx("button", { className: "btn btn-outline", onClick: () => {
          setStep((s) => s - 1);
          setError("");
        }, children: "← Back" }),
        step < steps.length - 1 ? /* @__PURE__ */ jsx("button", { className: "btn btn-gold", style: { flex: 1 }, onClick: next, children: "Continue →" }) : /* @__PURE__ */ jsx("button", { className: "btn btn-gold", style: { flex: 1 }, onClick: submit, disabled: loading, children: loading ? "Creating profile…" : "🎬 Create My Artist Profile" })
      ] }),
      /* @__PURE__ */ jsxs("p", { style: { textAlign: "center", marginTop: 16, fontSize: "0.78rem", color: "var(--muted)" }, children: [
        "Already have an account? ",
        /* @__PURE__ */ jsx("button", { style: { background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }, onClick: () => navigate("/"), children: "Login here" })
      ] })
    ] })
  ] });
}
const ROLE_CONFIG = {
  "Actor": { icon: "🎭", accent: "#3a5a8a", label: "Actor" },
  "Actress": { icon: "🌟", accent: "#8a3a6a", label: "Actress" },
  "Director": { icon: "🎬", accent: "#5a3a8a", label: "Director" },
  "Producer": { icon: "🎥", accent: "#2d6a4f", label: "Producer" },
  "Singer": { icon: "🎤", accent: "#8a3a3a", label: "Singer" },
  "Music Director": { icon: "🎼", accent: "#6a4a2a", label: "Music Director" },
  "Lyricist": { icon: "✍️", accent: "#4a6a3a", label: "Lyricist" },
  "Cinematographer": { icon: "📷", accent: "#2a5a6a", label: "Cinematographer" },
  "Choreographer": { icon: "💃", accent: "#7a3a5a", label: "Choreographer" },
  "Background Score": { icon: "🎻", accent: "#5a4a2a", label: "Bg Score Artist" },
  "Editor": { icon: "✂️", accent: "#4a4a6a", label: "Editor" },
  "Other": { icon: "🎪", accent: "#555", label: "Crew Member" }
};
const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG["Other"];
function RoleFeatureSection({ role, movies }) {
  const cfg = getRoleConfig(role);
  const roleMovies = movies.filter(
    (m) => {
      var _a;
      return (_a = m.cast) == null ? void 0 : _a.some((c) => {
        const t = (c.type || "").toLowerCase();
        const r = role.toLowerCase();
        return t === r || t.includes(r.split(" ")[0].toLowerCase());
      });
    }
  );
  const sections = {
    "Actor": { label: "Films as Actor", stat: `${roleMovies.length} films`, sub: "Performance credits" },
    "Actress": { label: "Films as Actress", stat: `${roleMovies.length} films`, sub: "Performance credits" },
    "Director": { label: "Films Directed", stat: `${roleMovies.length} films`, sub: "Directorial credits" },
    "Producer": { label: "Films Produced", stat: `${roleMovies.length} films`, sub: "Production credits" },
    "Singer": { label: "Songs Sung", stat: `${movies.flatMap((m) => {
      var _a;
      return ((_a = m.media) == null ? void 0 : _a.songs) || [];
    }).length}`, sub: "Across all films" },
    "Music Director": { label: "Films Scored", stat: `${roleMovies.length} films`, sub: "Music direction" },
    "Lyricist": { label: "Songs Written", stat: `${movies.flatMap((m) => {
      var _a;
      return ((_a = m.media) == null ? void 0 : _a.songs) || [];
    }).length}`, sub: "Lyrics credits" }
  };
  const info = sections[role] || { label: `${role} Credits`, stat: `${roleMovies.length} films`, sub: "Credits" };
  return /* @__PURE__ */ jsxs("div", { className: "cast-portal-role-card", style: { borderLeft: `3px solid ${cfg.accent}` }, children: [
    /* @__PURE__ */ jsx("span", { style: { fontSize: "1.8rem" }, children: cfg.icon }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }, children: info.label }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Playfair Display',serif", lineHeight: 1 }, children: info.stat }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: info.sub })
    ] })
  ] });
}
function SettingsPanel({ member, onToast, onUpdate }) {
  const [form, setForm] = useState({
    name: member.name || "",
    bio: member.bio || "",
    photo: member.photo || "",
    banner: member.banner || "",
    location: member.location || "",
    website: member.website || "",
    instagram: member.instagram || "",
    roles: member.roles || []
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ALL_ROLES2 = ["Actor", "Actress", "Director", "Producer", "Music Director", "Singer", "Lyricist", "Cinematographer", "Choreographer", "Background Score", "Editor", "Art Director", "Stunt Director", "Other"];
  const toggleRole = (r) => set("roles", form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]);
  const save = async () => {
    setSaving(true);
    try {
      const updated = await API.castUpdateMe(form);
      onUpdate(updated);
      onToast("Profile updated!");
    } catch (e) {
      onToast(typeof e === "string" ? e : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: 660 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 24 }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", marginBottom: 4 }, children: "Profile Settings" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem" }, children: "Update your artist profile and roles" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "portal-form-grid", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Display Name" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.name, onChange: (e) => set("name", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Location" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.location, onChange: (e) => set("location", e.target.value), placeholder: "e.g. Bhubaneswar, Odisha" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", style: { gridColumn: "1/-1" }, children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Photo URL" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.photo, onChange: (e) => set("photo", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", style: { gridColumn: "1/-1" }, children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Banner URL" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.banner, onChange: (e) => set("banner", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Website" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.website, onChange: (e) => set("website", e.target.value), placeholder: "https://…" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Instagram" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.instagram, onChange: (e) => set("instagram", e.target.value), placeholder: "@handle" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", style: { gridColumn: "1/-1" }, children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Bio" }),
        /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.bio, onChange: (e) => set("bio", e.target.value), style: { minHeight: 90 } })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", style: { gridColumn: "1/-1" }, children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "My Roles" }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }, children: ALL_ROLES2.map((r) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => toggleRole(r),
            style: {
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: "0.78rem",
              cursor: "pointer",
              border: `1px solid ${form.roles.includes(r) ? "var(--gold)" : "var(--border)"}`,
              background: form.roles.includes(r) ? "rgba(201,151,58,0.15)" : "var(--bg3)",
              color: form.roles.includes(r) ? "var(--gold)" : "var(--muted)",
              fontFamily: "inherit",
              fontWeight: form.roles.includes(r) ? 700 : 400
            },
            children: r
          },
          r
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-gold", onClick: save, disabled: saving, children: saving ? "Saving…" : "💾 Save Changes" })
  ] });
}
function CastPortal({ castMember, onToast, onLogout, onUpdate }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);
  const load = useCallback(async () => {
    if (!castMember || !getCastToken()) {
      navigate("/");
      return;
    }
    try {
      const me = await API.castGetMe();
      setData(me);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [castMember]);
  useEffect(() => {
    load();
  }, [load]);
  if (!castMember || !getCastToken()) return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }, children: [
    /* @__PURE__ */ jsx("h2", { children: "Not logged in" }),
    /* @__PURE__ */ jsx(Link, { to: "/", className: "btn btn-gold", children: "Go Home" })
  ] });
  if (loading) return /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }, children: /* @__PURE__ */ jsx("div", { className: "skeleton", style: { width: 200, height: 20 } }) });
  const member = data || castMember;
  const movies = (data == null ? void 0 : data.movies) || [];
  const roles = member.roles || ["Other"];
  const primary = roles[0] || "Other";
  const primaryCfg = getRoleConfig(primary);
  const NAV_ITEMS = [
    { key: "overview", icon: "⬛", label: "Overview" },
    { key: "filmography", icon: "🎬", label: "Filmography" },
    ...roles.some((r) => ["Singer", "Music Director", "Lyricist"].includes(r)) ? [{ key: "music", icon: "🎵", label: "Music" }] : [],
    { key: "settings", icon: "⚙️", label: "Settings" }
  ];
  const allSongs = movies.flatMap(
    (m) => {
      var _a;
      return (((_a = m.media) == null ? void 0 : _a.songs) || []).map((s) => ({ ...s, movieTitle: m.title, movieId: m._id }));
    }
  );
  const hits = movies.filter((m) => ["Hit", "Super Hit", "Blockbuster"].includes(m.verdict)).length;
  return /* @__PURE__ */ jsxs("div", { className: "portal-layout", children: [
    /* @__PURE__ */ jsxs("header", { className: "portal-topbar", children: [
      /* @__PURE__ */ jsxs("div", { className: "portal-topbar-left", children: [
        /* @__PURE__ */ jsx("button", { className: "portal-mobile-toggle", onClick: () => setSideOpen((o) => !o), children: sideOpen ? "✕" : "☰" }),
        /* @__PURE__ */ jsxs("span", { className: "portal-topbar-wordmark", children: [
          "OLLI",
          /* @__PURE__ */ jsx("span", { children: "PEDIA" })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "portal-topbar-badge", children: [
          primaryCfg.icon,
          " ",
          primaryCfg.label,
          " Portal"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "portal-topbar-right", children: [
        /* @__PURE__ */ jsxs("span", { className: "portal-topbar-user", children: [
          member.photo && /* @__PURE__ */ jsx("img", { src: member.photo, alt: "", style: { width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }, onError: (e) => e.target.style.display = "none" }),
          member.name
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/", className: "btn btn-ghost btn-sm", children: "Public Site ↗" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", onClick: () => {
          onLogout();
          navigate("/");
        }, children: "Logout" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "portal-body", children: [
      /* @__PURE__ */ jsxs("aside", { className: `portal-sidebar ${sideOpen ? "open" : ""}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "portal-sidebar-brand", style: { flexDirection: "column", alignItems: "flex-start", gap: 10, paddingBottom: 20 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
            /* @__PURE__ */ jsx("div", { className: "portal-sidebar-logo", style: { width: 44, height: 44, borderRadius: "50%", border: `2px solid ${primaryCfg.accent}` }, children: member.photo ? /* @__PURE__ */ jsx("img", { src: member.photo, alt: "", onError: (e) => e.target.style.display = "none", style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" } }) : /* @__PURE__ */ jsx("span", { style: { fontSize: "1.3rem" }, children: primaryCfg.icon }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "portal-sidebar-name", children: member.name }),
              member.location && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: [
                "📍 ",
                member.location
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: roles.map((r) => {
            const cfg = getRoleConfig(r);
            return /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${cfg.accent}22`, color: cfg.accent, border: `1px solid ${cfg.accent}44` }, children: [
              cfg.icon,
              " ",
              r
            ] }, r);
          }) })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: "portal-nav", children: NAV_ITEMS.map((n) => /* @__PURE__ */ jsxs(
          "button",
          {
            className: `portal-nav-item ${tab === n.key ? "active" : ""}`,
            onClick: () => {
              setTab(n.key);
              setSideOpen(false);
            },
            children: [
              /* @__PURE__ */ jsx("span", { className: "portal-nav-icon", children: n.icon }),
              /* @__PURE__ */ jsx("span", { className: "portal-nav-label", children: n.label }),
              n.key === "filmography" && movies.length > 0 && /* @__PURE__ */ jsx("span", { className: "portal-nav-badge", children: movies.length })
            ]
          },
          n.key
        )) }),
        /* @__PURE__ */ jsx("div", { className: "portal-sidebar-footer", children: member.castId && /* @__PURE__ */ jsx(Link, { to: `/cast/${member.castId}`, className: "btn btn-outline btn-sm", style: { width: "100%", textAlign: "center" }, target: "_blank", children: "👁 Public Profile ↗" }) })
      ] }),
      /* @__PURE__ */ jsxs("main", { className: "portal-main", children: [
        tab === "overview" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { style: {
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 28,
            background: member.banner ? `url(${member.banner}) center/cover` : `linear-gradient(135deg, ${primaryCfg.accent}33, var(--bg3))`,
            minHeight: 160,
            position: "relative"
          }, children: [
            /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" } }),
            /* @__PURE__ */ jsxs("div", { style: { position: "absolute", bottom: 20, left: 24, display: "flex", alignItems: "flex-end", gap: 16 }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: 72, height: 72, borderRadius: "50%", border: `3px solid ${primaryCfg.accent}`, overflow: "hidden", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }, children: member.photo ? /* @__PURE__ */ jsx("img", { src: member.photo, alt: member.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : primaryCfg.icon }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h1", { style: { fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", marginBottom: 4 }, children: member.name }),
                /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: roles.map((r) => {
                  const cfg = getRoleConfig(r);
                  return /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: `${cfg.accent}55`, color: "#fff", border: `1px solid ${cfg.accent}88` }, children: [
                    cfg.icon,
                    " ",
                    r
                  ] }, r);
                }) })
              ] })
            ] })
          ] }),
          member.bio && /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 28, maxWidth: 600 }, children: member.bio }),
          /* @__PURE__ */ jsxs("div", { className: "portal-stats-grid", style: { marginBottom: 32 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "portal-stat-card", children: [
              /* @__PURE__ */ jsx("div", { className: "portal-stat-icon", children: "🎬" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "portal-stat-val", children: movies.length }),
                /* @__PURE__ */ jsx("div", { className: "portal-stat-label", children: "Total Films" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "portal-stat-card", children: [
              /* @__PURE__ */ jsx("div", { className: "portal-stat-icon", style: { background: "rgba(45,106,79,0.2)" }, children: "🏆" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "portal-stat-val", children: hits }),
                /* @__PURE__ */ jsx("div", { className: "portal-stat-label", children: "Hits" }),
                /* @__PURE__ */ jsx("div", { className: "portal-stat-sub", children: "Hit / Super Hit / Blockbuster" })
              ] })
            ] }),
            roles.some((r) => ["Singer", "Music Director", "Lyricist"].includes(r)) && /* @__PURE__ */ jsxs("div", { className: "portal-stat-card", children: [
              /* @__PURE__ */ jsx("div", { className: "portal-stat-icon", style: { background: "rgba(138,60,60,0.2)" }, children: "🎵" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "portal-stat-val", children: allSongs.length }),
                /* @__PURE__ */ jsx("div", { className: "portal-stat-label", children: "Songs" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "portal-stat-card", children: [
              /* @__PURE__ */ jsx("div", { className: "portal-stat-icon", style: { background: `${primaryCfg.accent}22` }, children: primaryCfg.icon }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "portal-stat-val", children: roles.length }),
                /* @__PURE__ */ jsxs("div", { className: "portal-stat-label", children: [
                  "Role",
                  roles.length !== 1 ? "s" : ""
                ] }),
                /* @__PURE__ */ jsx("div", { className: "portal-stat-sub", children: roles.join(" · ") })
              ] })
            ] })
          ] }),
          roles.length > 0 && /* @__PURE__ */ jsxs("div", { className: "portal-section", children: [
            /* @__PURE__ */ jsx("div", { className: "portal-section-header", children: /* @__PURE__ */ jsx("h2", { className: "portal-section-title", children: "Career by Role" }) }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }, children: roles.map((r) => /* @__PURE__ */ jsx(RoleFeatureSection, { role: r, movies }, r)) })
          ] }),
          movies.length > 0 && /* @__PURE__ */ jsxs("div", { className: "portal-section", children: [
            /* @__PURE__ */ jsxs("div", { className: "portal-section-header", children: [
              /* @__PURE__ */ jsx("h2", { className: "portal-section-title", children: "Recent Films" }),
              /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setTab("filmography"), children: "View All →" })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: movies.slice(0, 5).map((m) => {
              var _a, _b, _c, _d;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  onClick: () => navigate(`/movie/${m._id}`),
                  style: { display: "flex", gap: 14, alignItems: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 16px", cursor: "pointer", transition: "border-color 0.15s" },
                  onMouseOver: (e) => e.currentTarget.style.borderColor = "var(--gold)",
                  onMouseOut: (e) => e.currentTarget.style.borderColor = "var(--border)",
                  children: [
                    /* @__PURE__ */ jsx("div", { style: { width: 40, height: 56, borderRadius: 4, overflow: "hidden", background: "var(--bg3)", flexShrink: 0 }, children: m.posterUrl && /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: m.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) }),
                    /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }, children: m.title }),
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: "var(--muted)" }, children: [
                        ((_a = m.releaseDate) == null ? void 0 : _a.slice(0, 4)) || "TBA",
                        " · ",
                        ((_b = m.productionId) == null ? void 0 : _b.name) || ""
                      ] }),
                      (_c = m.cast) == null ? void 0 : _c.filter((c) => c.castId === member.castId).map((c, i) => /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--gold)", marginRight: 6 }, children: [
                        c.type,
                        c.role ? ` — ${c.role}` : ""
                      ] }, i))
                    ] }),
                    m.verdict && m.verdict !== "Upcoming" && /* @__PURE__ */ jsx("span", { className: `verdict verdict-${(_d = m.verdict) == null ? void 0 : _d.toLowerCase().replace(" ", "-")}`, children: m.verdict })
                  ]
                },
                m._id
              );
            }) })
          ] }),
          movies.length === 0 && /* @__PURE__ */ jsxs("div", { className: "portal-empty-hero", children: [
            /* @__PURE__ */ jsx("div", { className: "portal-empty-icon", children: primaryCfg.icon }),
            /* @__PURE__ */ jsx("h2", { children: "No film credits yet" }),
            /* @__PURE__ */ jsx("p", { children: "Once a production house adds you to a movie, it will appear here." })
          ] })
        ] }),
        tab === "filmography" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "portal-page-header", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h1", { className: "portal-page-title", children: "Filmography" }),
            /* @__PURE__ */ jsxs("p", { className: "portal-page-sub", children: [
              movies.length,
              " film",
              movies.length !== 1 ? "s" : "",
              " on record"
            ] })
          ] }) }),
          movies.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "portal-empty-hero", children: [
            /* @__PURE__ */ jsx("div", { className: "portal-empty-icon", children: "🎬" }),
            /* @__PURE__ */ jsx("h2", { children: "No film credits yet" }),
            /* @__PURE__ */ jsx("p", { children: "Productions will add you to films as they register them on Ollipedia." })
          ] }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: movies.map((m) => {
            var _a, _b, _c, _d, _e;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => navigate(`/movie/${m._id}`),
                style: { display: "flex", gap: 16, alignItems: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px", cursor: "pointer", transition: "border-color 0.15s" },
                onMouseOver: (e) => e.currentTarget.style.borderColor = "var(--gold)",
                onMouseOut: (e) => e.currentTarget.style.borderColor = "var(--border)",
                children: [
                  /* @__PURE__ */ jsx("div", { style: { width: 44, height: 60, borderRadius: 4, overflow: "hidden", background: "var(--bg3)", flexShrink: 0 }, children: m.posterUrl && /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: m.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) }),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }, children: m.title }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }, children: [
                      ((_a = m.releaseDate) == null ? void 0 : _a.slice(0, 4)) || "TBA",
                      " · ",
                      ((_b = m.genre) == null ? void 0 : _b.join(", ")) || "",
                      " · ",
                      ((_c = m.productionId) == null ? void 0 : _c.name) || ""
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: (_d = m.cast) == null ? void 0 : _d.filter((c) => String(c.castId) === String(member.castId)).map((c, i) => /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", padding: "2px 8px", borderRadius: 10 }, children: [
                      c.type,
                      c.role ? ` · ${c.role}` : ""
                    ] }, i)) })
                  ] }),
                  m.verdict && m.verdict !== "Upcoming" && /* @__PURE__ */ jsx("span", { className: `verdict verdict-${(_e = m.verdict) == null ? void 0 : _e.toLowerCase().replace(" ", "-")}`, children: m.verdict })
                ]
              },
              m._id
            );
          }) })
        ] }),
        tab === "music" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "portal-page-header", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h1", { className: "portal-page-title", children: "Music Credits" }),
            /* @__PURE__ */ jsxs("p", { className: "portal-page-sub", children: [
              allSongs.length,
              " song",
              allSongs.length !== 1 ? "s" : "",
              " across ",
              movies.length,
              " film",
              movies.length !== 1 ? "s" : ""
            ] })
          ] }) }),
          allSongs.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "portal-empty-hero", children: [
            /* @__PURE__ */ jsx("div", { className: "portal-empty-icon", children: "🎵" }),
            /* @__PURE__ */ jsx("h2", { children: "No music credits yet" })
          ] }) : /* @__PURE__ */ jsx("div", { className: "song-list", children: allSongs.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "song-item", style: { cursor: "pointer" }, onClick: () => navigate(`/movie/${s.movieId}`), children: [
            /* @__PURE__ */ jsx("span", { className: "song-num", children: i + 1 }),
            /* @__PURE__ */ jsxs("div", { className: "song-info", children: [
              /* @__PURE__ */ jsx("div", { className: "song-title", children: s.title }),
              /* @__PURE__ */ jsxs("div", { className: "song-singer", children: [
                s.singer && `${s.singer} · `,
                /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)" }, children: s.movieTitle })
              ] })
            ] }),
            s.ytId && /* @__PURE__ */ jsx("a", { href: `https://youtube.com/watch?v=${s.ytId}`, target: "_blank", rel: "noreferrer", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx("button", { className: "song-play", style: { opacity: 1 }, children: "▶" }) })
          ] }, i)) })
        ] }),
        tab === "settings" && /* @__PURE__ */ jsx(SettingsPanel, { member, onToast, onUpdate: (m) => {
          onUpdate(m);
          setData((d) => ({ ...d, ...m }));
        } })
      ] })
    ] })
  ] });
}
function PortalMovieDetails({ production, onToast }) {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs("div", { className: "portal-wrap", children: [
    /* @__PURE__ */ jsxs("div", { className: "portal-wrap-topbar", children: [
      /* @__PURE__ */ jsx("button", { className: "portal-wrap-back", onClick: () => navigate("/dashboard"), children: "← Back to Portal" }),
      /* @__PURE__ */ jsxs("span", { className: "portal-wrap-brand", children: [
        "OLLI",
        /* @__PURE__ */ jsx("span", { children: "PEDIA" }),
        " Portal"
      ] }),
      /* @__PURE__ */ jsx("span", {})
    ] }),
    /* @__PURE__ */ jsx(MovieDetails, { production, onToast, portalMode: true })
  ] });
}
function PortalCastProfile({ production }) {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs("div", { className: "portal-wrap", children: [
    /* @__PURE__ */ jsxs("div", { className: "portal-wrap-topbar", children: [
      /* @__PURE__ */ jsx("button", { className: "portal-wrap-back", onClick: () => navigate(-1), children: "← Back" }),
      /* @__PURE__ */ jsxs("span", { className: "portal-wrap-brand", children: [
        "OLLI",
        /* @__PURE__ */ jsx("span", { children: "PEDIA" }),
        " Portal"
      ] }),
      /* @__PURE__ */ jsx("span", {})
    ] }),
    /* @__PURE__ */ jsx(CastProfile, { portalMode: true })
  ] });
}
const GENRES = ["Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical", "Devotional", "Horror", "Action-Drama", "Crime", "Mystery"];
const CATEGORIES = ["Feature Film", "Short Film", "Web Series", "Documentary"];
const CAST_TYPES = [
  "Actor",
  "Actress",
  "Director",
  "Producer",
  "Music Director",
  "Singer",
  "Lyricist",
  "Musician",
  "Screenplay Writer",
  "Dialogue Writer",
  "Writer",
  "Cinematographer",
  "Choreographer",
  "Editor",
  "Background Score",
  "Art Director",
  "Costume Designer",
  "Stunt Director",
  "Voice Artist",
  "Other"
];
const VERDICTS = ["Upcoming", "Hit", "Super Hit", "Blockbuster", "Average", "Flop", "Disaster"];
const NEWS_CATS = ["Update", "Announcement", "Review", "Interview", "Event", "Award", "Other"];
const isOid = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());
const extractYtId = (input) => {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return "";
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA";
const verdictColor = (v) => v === "Hit" || v === "Super Hit" || v === "Blockbuster" ? "#4caf82" : v === "Upcoming" ? "var(--gold)" : "var(--red)";
function Spinner() {
  return /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 60, color: "var(--muted)", fontSize: "2rem" }, children: "⏳" });
}
function ConfirmModal({ message, onConfirm, onCancel }) {
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onCancel, children: /* @__PURE__ */ jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 400 }, children: [
    /* @__PURE__ */ jsx("div", { className: "modal-header", children: /* @__PURE__ */ jsx("span", { className: "modal-title", children: "⚠️ Confirm Delete" }) }),
    /* @__PURE__ */ jsx("p", { style: { padding: "16px 0", color: "var(--text)", lineHeight: 1.6 }, children: message }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: onConfirm, style: { background: "var(--red)", color: "#fff", border: "none" }, children: "Delete" })
    ] })
  ] }) });
}
function ProductionPicker({ selected, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setResults(await API.searchProductions(query));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);
  const addProd = (p) => {
    if (!selected.some((x) => String(x._id) === String(p._id))) onChange([...selected, p]);
    setQuery("");
    setResults([]);
  };
  const removeProd = (id) => onChange(selected.filter((x) => String(x._id) !== String(id)));
  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const p = await API.createProduction({ name: newName.trim() });
      addProd(p);
      setNewName("");
      setCreating(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    selected.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }, children: selected.map((p, i) => /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.3)", color: "var(--gold)", fontSize: "0.78rem", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }, children: [
      i === 0 && /* @__PURE__ */ jsx("span", { title: "Primary", style: { fontSize: "0.65rem" }, children: "★" }),
      p.name,
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removeProd(p._id), style: { background: "none", border: "none", color: "var(--gold)", cursor: "pointer", padding: 0 }, children: "✕" })
    ] }, p._id || i)) }),
    /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx("input", { className: "form-input", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search production…" }),
      results.length > 0 && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, zIndex: 50, maxHeight: 180, overflowY: "auto" }, children: results.map((p) => /* @__PURE__ */ jsx(
        "div",
        {
          onClick: () => addProd(p),
          style: { padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem" },
          onMouseEnter: (e) => e.currentTarget.style.background = "var(--bg3)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
          children: p.name
        },
        p._id
      )) })
    ] }),
    !creating ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", style: { marginTop: 8, fontSize: "0.75rem" }, onClick: () => setCreating(true), children: "+ Create new production" }) : /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
      /* @__PURE__ */ jsx("input", { className: "form-input", value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Production name", style: { flex: 1 } }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", disabled: saving || !newName.trim(), onClick: createAndAdd, children: saving ? "…" : "Add" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => setCreating(false), children: "✕" })
    ] })
  ] });
}
function CastPicker({ cast, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [nc, setNc] = useState({ name: "", type: "Actor", role: "", photo: "", bio: "" });
  const timer = useRef(null);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await API.searchCast(query));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);
  const addFromSearch = (person) => {
    if (cast.some((c) => c.castId && String(c.castId) === String(person._id))) return;
    onChange([...cast, { castId: String(person._id), name: person.name, photo: person.photo || "", type: person.type || "Actor", role: "", isNew: false }]);
    setQuery("");
    setResults([]);
  };
  const addNew = () => {
    if (!nc.name.trim()) return;
    onChange([...cast, { castId: "", name: nc.name.trim(), photo: nc.photo.trim(), type: nc.type, role: nc.role.trim(), bio: nc.bio.trim(), isNew: true }]);
    setNc({ name: "", type: "Actor", role: "", photo: "", bio: "" });
    setShowNewForm(false);
  };
  const update = (i, k, v) => {
    const n = [...cast];
    n[i] = { ...n[i], [k]: v };
    onChange(n);
  };
  const remove = (i) => {
    onChange(cast.filter((_, idx) => idx !== i));
    if (editIdx === i) setEditIdx(null);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsx("label", { style: { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", display: "block", marginBottom: 6 }, children: "🔍 Search & Link Existing Cast" }),
      /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Type name to search…",
            autoComplete: "off"
          }
        ),
        (searching || results.length > 0 || query.trim() && !searching) && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, zIndex: 60, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }, children: [
          searching && /* @__PURE__ */ jsx("div", { style: { padding: "10px 14px", color: "var(--muted)", fontSize: "0.82rem" }, children: "Searching…" }),
          !searching && results.length === 0 && query.trim() && /* @__PURE__ */ jsx("div", { style: { padding: "10px 14px", color: "var(--muted)", fontSize: "0.82rem" }, children: "No results — add as new below" }),
          results.map((p) => {
            const already = cast.some((c) => c.castId === String(p._id));
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => !already && addFromSearch(p),
                style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: already ? "default" : "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: already ? 0.5 : 1 },
                onMouseEnter: (e) => {
                  if (!already) e.currentTarget.style.background = "rgba(201,151,58,0.08)";
                },
                onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                children: [
                  /* @__PURE__ */ jsx("div", { style: { width: 34, height: 34, borderRadius: "50%", background: "var(--bg3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }, children: p.photo ? /* @__PURE__ */ jsx("img", { src: p.photo, alt: p.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "👤" }),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem" }, children: p.name }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--gold)" }, children: p.type })
                  ] }),
                  /* @__PURE__ */ jsx("span", { style: { fontSize: "0.68rem", color: already ? "var(--muted)" : "#4caf82", fontWeight: 700 }, children: already ? "✓ Added" : "+ Link" })
                ]
              },
              p._id
            );
          })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { marginBottom: 16 }, children: !showNewForm ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline btn-sm", onClick: () => setShowNewForm(true), style: { width: "100%", justifyContent: "center" }, children: "+ Add New Cast / Crew Member" }) : /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "14px 16px" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.76rem", fontWeight: 700, color: "var(--gold)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "✦ New Cast / Crew Member" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.name, onChange: (e) => setNc((f) => ({ ...f, name: e.target.value })), autoFocus: true, placeholder: "Full name" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Type" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: nc.type, onChange: (e) => setNc((f) => ({ ...f, type: e.target.value })), children: CAST_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Role / Character" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.role, onChange: (e) => setNc((f) => ({ ...f, role: e.target.value })), placeholder: "e.g. Hero" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: nc.photo, onChange: (e) => setNc((f) => ({ ...f, photo: e.target.value })), placeholder: "https://…" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: addNew, disabled: !nc.name.trim(), children: "✓ Add to Cast" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => {
          setShowNewForm(false);
          setNc({ name: "", type: "Actor", role: "", photo: "", bio: "" });
        }, children: "Cancel" })
      ] })
    ] }) }),
    cast.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.84rem", border: "1px dashed var(--border)", borderRadius: 8 }, children: "No cast added yet — search above or add new" }) : /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }, children: [
        "Cast & Crew (",
        cast.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: cast.map((c, i) => /* @__PURE__ */ jsx("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }, children: editIdx === i ? /* @__PURE__ */ jsxs("div", { style: { padding: "12px 14px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Name *" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: c.name, onChange: (e) => update(i, "name", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Role / Character" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: c.role, onChange: (e) => update(i, "role", e.target.value), placeholder: "e.g. Hero" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Type" }),
            /* @__PURE__ */ jsx("select", { className: "form-select", value: c.type, onChange: (e) => update(i, "type", e.target.value), children: CAST_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Photo URL" }),
            /* @__PURE__ */ jsx("input", { className: "form-input", value: c.photo, onChange: (e) => update(i, "photo", e.target.value), placeholder: "https://…" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: () => setEditIdx(null), children: "✓ Done" })
      ] }) : /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }, children: [
        /* @__PURE__ */ jsx("div", { style: { width: 38, height: 38, borderRadius: "50%", background: "var(--bg2)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: "1px solid var(--border)" }, children: c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "👤" }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: "0.88rem" }, children: c.name || /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)" }, children: "Unnamed" }) }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: "rgba(201,151,58,0.12)", color: "var(--gold)" }, children: c.type }),
            c.isNew ? /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, color: "#e8b96a", background: "rgba(232,185,106,0.12)", padding: "1px 6px", borderRadius: 6 }, children: "✦ NEW" }) : /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, color: "#4caf82", background: "rgba(76,175,130,0.12)", padding: "1px 6px", borderRadius: 6 }, children: "✓ LINKED" })
          ] }),
          c.role && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: [
            "as ",
            c.role
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 5, flexShrink: 0 }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => setEditIdx(i), style: { fontSize: "0.7rem", padding: "4px 8px" }, children: "✏️" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => remove(i), style: { color: "var(--red)", fontSize: "0.7rem", padding: "4px 8px" }, children: "✕" })
        ] })
      ] }) }, i)) })
    ] })
  ] });
}
function PersonPicker({ label, icon, castType, value, refs, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const timer = useRef(null);
  const [selected, setSelected] = useState(() => {
    if (!(refs == null ? void 0 : refs.length)) return [];
    return refs.map((id, i) => ({ _id: id, name: (value || "").split(",").map((s) => s.trim())[i] || id }));
  });
  const update = (next) => {
    setSelected(next);
    const names = next.map((p) => p.name).join(", ");
    const ids = next.filter((p) => isOid(p._id)).map((p) => p._id);
    onChange(names, ids);
  };
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const all = await API.searchCast(query);
        setResults(castType ? all.filter((p) => {
          var _a;
          return (_a = p.type) == null ? void 0 : _a.toLowerCase().includes(castType.toLowerCase());
        }) : all);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);
  const addFromSearch = (person) => {
    if (selected.some((p) => p._id === String(person._id))) return;
    update([...selected, { _id: String(person._id), name: person.name }]);
    setQuery("");
    setResults([]);
  };
  const addNew = async () => {
    if (!newName.trim()) return;
    try {
      const nc = await API.createCast({ name: newName.trim(), type: castType || "Singer", photo: newPhoto.trim() });
      update([...selected, { _id: String(nc._id), name: nc.name }]);
      setNewName("");
      setNewPhoto("");
      setShowNew(false);
    } catch (e) {
      update([...selected, { _id: "__new__" + Date.now(), name: newName.trim() }]);
      setNewName("");
      setNewPhoto("");
      setShowNew(false);
    }
  };
  const remove = (idx) => update(selected.filter((_, i) => i !== idx));
  return /* @__PURE__ */ jsxs("div", { style: { marginBottom: 0 }, children: [
    /* @__PURE__ */ jsxs("label", { style: { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", display: "block", marginBottom: 6 }, children: [
      icon,
      " ",
      label
    ] }),
    selected.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }, children: selected.map((p, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5, background: "rgba(201,151,58,0.1)", border: "1px solid rgba(201,151,58,0.3)", borderRadius: 16, padding: "4px 10px 4px 8px", fontSize: "0.78rem" }, children: [
      /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)", fontWeight: 600 }, children: p.name }),
      isOid(p._id) && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", color: "#4caf82", fontWeight: 700 }, children: "✓" }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => remove(i), style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem", lineHeight: 1, padding: 0, marginLeft: 2 }, children: "×" })
    ] }, i)) }),
    /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginBottom: 6 }, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "form-input",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: `Search ${label.toLowerCase()}…`,
          autoComplete: "off",
          style: { fontSize: "0.82rem" }
        }
      ),
      (searching || results.length > 0 || query.trim() && !searching) && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, zIndex: 70, maxHeight: 180, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }, children: [
        searching && /* @__PURE__ */ jsx("div", { style: { padding: "8px 12px", color: "var(--muted)", fontSize: "0.8rem" }, children: "Searching…" }),
        !searching && results.length === 0 && query.trim() && /* @__PURE__ */ jsx("div", { style: { padding: "8px 12px", color: "var(--muted)", fontSize: "0.8rem" }, children: "No match — add as new below" }),
        results.map((p) => {
          const already = selected.some((s) => s._id === String(p._id));
          return /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => !already && addFromSearch(p),
              style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: already ? "default" : "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: already ? 0.5 : 1 },
              onMouseEnter: (e) => {
                if (!already) e.currentTarget.style.background = "rgba(201,151,58,0.08)";
              },
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsx("div", { style: { width: 28, height: 28, borderRadius: "50%", background: "var(--bg3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }, children: p.photo ? /* @__PURE__ */ jsx("img", { src: p.photo, alt: p.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "👤" }),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.82rem" }, children: p.name }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--gold)" }, children: p.type })
                ] }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", color: already ? "var(--muted)" : "#4caf82", fontWeight: 700 }, children: already ? "✓ Added" : "+ Add" })
              ]
            },
            p._id
          );
        })
      ] })
    ] }),
    !showNew ? /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-outline btn-sm", style: { fontSize: "0.72rem", padding: "3px 10px" }, onClick: () => setShowNew(true), children: [
      "+ Add New ",
      label
    ] }) : /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--gold)", borderRadius: 7, padding: "10px 12px", marginTop: 4 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.65rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Full name", autoFocus: true, style: { fontSize: "0.82rem" } })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.65rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newPhoto, onChange: (e) => setNewPhoto(e.target.value), placeholder: "https://…", style: { fontSize: "0.82rem" } })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: addNew, disabled: !newName.trim(), style: { fontSize: "0.72rem" }, children: "✓ Add" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => {
          setShowNew(false);
          setNewName("");
          setNewPhoto("");
        }, style: { fontSize: "0.72rem" }, children: "Cancel" })
      ] })
    ] })
  ] });
}
const MOVIE_STEPS = ["Basic Info", "Cast & Crew", "Media", "Review & Submit"];
function MovieForm({ initial, onSave, onCancel, saving }) {
  var _a, _b, _c, _d, _e;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: (initial == null ? void 0 : initial.title) || "",
    category: (initial == null ? void 0 : initial.category) || "Feature Film",
    genre: (initial == null ? void 0 : initial.genre) || [],
    releaseDate: (initial == null ? void 0 : initial.releaseDate) || "",
    releaseTBA: (initial == null ? void 0 : initial.releaseTBA) || false,
    language: (initial == null ? void 0 : initial.language) || "Odia",
    budget: (initial == null ? void 0 : initial.budget) || "",
    synopsis: (initial == null ? void 0 : initial.synopsis) || "",
    posterUrl: (initial == null ? void 0 : initial.posterUrl) || "",
    thumbnailUrl: (initial == null ? void 0 : initial.thumbnailUrl) || "",
    verdict: (initial == null ? void 0 : initial.verdict) || "Upcoming",
    runtime: (initial == null ? void 0 : initial.runtime) || "",
    imdbId: (initial == null ? void 0 : initial.imdbId) || "",
    imdbRating: (initial == null ? void 0 : initial.imdbRating) || "",
    imdbVotes: (initial == null ? void 0 : initial.imdbVotes) || "",
    contentRating: (initial == null ? void 0 : initial.contentRating) || "",
    bannerUrl: (initial == null ? void 0 : initial.bannerUrl) || "",
    boxOffice: (initial == null ? void 0 : initial.boxOffice) || { opening: "TBA", firstWeek: "TBA", total: "TBA" },
    trivia: (initial == null ? void 0 : initial.trivia) || []
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGenre = (g) => set("genre", form.genre.includes(g) ? form.genre.filter((x) => x !== g) : [...form.genre, g]);
  const [productions, setProductions] = useState(
    () => ((initial == null ? void 0 : initial.productions) || []).map((p) => {
      if (p && typeof p === "object" && p._id) return { _id: String(p._id), name: p.name || "Unknown Production" };
      if (typeof p === "string" && p.length === 24) {
        return { _id: p, name: "Loading…" };
      }
      return null;
    }).filter(Boolean)
  );
  useEffect(() => {
    const unresolved = productions.filter((p) => p.name === "Loading…");
    if (!unresolved.length) return;
    (async () => {
      try {
        const allProds = await API.getProductions();
        setProductions((prev) => prev.map((p) => {
          if (p.name !== "Loading…") return p;
          const found = allProds.find((x) => String(x._id) === String(p._id));
          return found ? { _id: String(found._id), name: found.name } : { ...p, name: "Unknown" };
        }));
      } catch {
      }
    })();
  }, []);
  const [cast, setCast] = useState(
    () => ((initial == null ? void 0 : initial.cast) || []).map((c) => {
      var _a2, _b2, _c2, _d2;
      const rawId = ((_a2 = c.castId) == null ? void 0 : _a2._id) ?? c.castId ?? "";
      return {
        castId: String(rawId),
        isNew: false,
        name: c.name || ((_b2 = c.castId) == null ? void 0 : _b2.name) || "",
        photo: c.photo || ((_c2 = c.castId) == null ? void 0 : _c2.photo) || "",
        type: c.type || ((_d2 = c.castId) == null ? void 0 : _d2.type) || "Actor",
        role: c.role || "",
        bio: ""
      };
    })
  );
  const [trailerUrl, setTrailerUrl] = useState(
    ((_b = (_a = initial == null ? void 0 : initial.media) == null ? void 0 : _a.trailer) == null ? void 0 : _b.url) || (((_d = (_c = initial == null ? void 0 : initial.media) == null ? void 0 : _c.trailer) == null ? void 0 : _d.ytId) ? `https://youtube.com/watch?v=${initial.media.trailer.ytId}` : "")
  );
  const [songs, setSongs] = useState(((_e = initial == null ? void 0 : initial.media) == null ? void 0 : _e.songs) || []);
  const EMPTY_SF = { url: "", title: "", singer: "", singerRef: [], musicDirector: "", musicDirectorRef: [], lyricist: "", lyricistRef: [] };
  const [sf, setSf] = useState(EMPTY_SF);
  const trailerPreview = extractYtId(trailerUrl);
  const handleSongAdd = () => {
    if (!sf.title.trim()) return;
    const sid = extractYtId(sf.url);
    setSongs((p) => [...p, {
      title: sf.title.trim(),
      singer: sf.singer.trim(),
      singerRef: sf.singerRef,
      musicDirector: sf.musicDirector.trim(),
      musicDirectorRef: sf.musicDirectorRef,
      lyricist: sf.lyricist.trim(),
      lyricistRef: sf.lyricistRef,
      ytId: sid,
      url: sf.url,
      thumbnailUrl: sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : ""
    }]);
    setSf(EMPTY_SF);
  };
  const handleSubmit = () => {
    var _a2;
    const castPayload = cast.filter((c) => c.name.trim()).map((c) => {
      if (isOid(c.castId)) {
        return { castId: c.castId, isNew: false, name: c.name, type: c.type || "Actor", role: c.role || "", photo: c.photo || "", bio: c.bio || "" };
      }
      return { isNew: true, name: c.name, type: c.type || "Actor", role: c.role || "", photo: c.photo || "", bio: c.bio || "" };
    });
    const trailerYtId = extractYtId(trailerUrl);
    onSave({
      title: form.title,
      category: form.category,
      genre: form.genre,
      releaseDate: form.releaseDate,
      releaseTBA: form.releaseTBA,
      language: form.language,
      budget: form.budget,
      synopsis: form.synopsis,
      posterUrl: form.posterUrl,
      thumbnailUrl: form.thumbnailUrl,
      verdict: form.verdict,
      runtime: form.runtime,
      imdbId: form.imdbId,
      imdbRating: form.imdbRating,
      imdbVotes: form.imdbVotes,
      contentRating: form.contentRating,
      bannerUrl: form.bannerUrl,
      boxOffice: form.boxOffice,
      trivia: form.trivia,
      productions: productions.map((p) => String(p._id)).filter(isOid),
      cast: castPayload,
      media: { trailer: trailerYtId ? { ytId: trailerYtId, url: trailerUrl } : ((_a2 = initial == null ? void 0 : initial.media) == null ? void 0 : _a2.trailer) || {}, songs }
    });
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", marginBottom: 28 }, children: MOVIE_STEPS.map((label, i) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }, children: [
        /* @__PURE__ */ jsx("div", { onClick: () => i < step && setStep(i), style: {
          width: 30,
          height: 30,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.78rem",
          cursor: i < step ? "pointer" : "default",
          background: i < step ? "var(--gold)" : i === step ? "rgba(201,151,58,0.18)" : "var(--bg3)",
          color: i < step ? "#000" : i === step ? "var(--gold)" : "var(--muted)",
          border: i === step ? "2px solid var(--gold)" : "2px solid transparent"
        }, children: i < step ? "✓" : i + 1 }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", color: i === step ? "var(--gold)" : "var(--muted)" }, children: label })
      ] }),
      i < MOVIE_STEPS.length - 1 && /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 2, margin: "0 4px", marginBottom: 18, background: i < step ? "var(--gold)" : "var(--border)", transition: "background 0.3s" } })
    ] }, i)) }),
    step === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Movie Title *" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.title, onChange: (e) => set("title", e.target.value), placeholder: "e.g. Daman", autoFocus: true })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Category" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: form.category, onChange: (e) => set("category", e.target.value), children: CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Language" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.language, onChange: (e) => set("language", e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Genres" }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: GENRES.map((g) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => toggleGenre(g), style: {
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: "0.78rem",
          cursor: "pointer",
          border: "1px solid",
          background: form.genre.includes(g) ? "var(--gold)" : "transparent",
          color: form.genre.includes(g) ? "#000" : "var(--muted)",
          borderColor: form.genre.includes(g) ? "var(--gold)" : "var(--border)"
        }, children: g }, g)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Release Date" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "date", value: form.releaseDate, onChange: (e) => set("releaseDate", e.target.value), disabled: form.releaseTBA }),
          /* @__PURE__ */ jsxs("label", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer" }, children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: form.releaseTBA, onChange: (e) => set("releaseTBA", e.target.checked) }),
            " TBA"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Budget" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.budget, onChange: (e) => set("budget", e.target.value), placeholder: "e.g. ₹2 Crore" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Verdict" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: form.verdict, onChange: (e) => set("verdict", e.target.value), children: VERDICTS.map((v) => /* @__PURE__ */ jsx("option", { children: v }, v)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Runtime" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.runtime, onChange: (e) => set("runtime", e.target.value), placeholder: "e.g. 2h 15m" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Production House(s)" }),
        /* @__PURE__ */ jsx(ProductionPicker, { selected: productions, onChange: setProductions })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxs("label", { className: "form-label", children: [
          "Poster URL ",
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontWeight: 400 }, children: "(portrait 2:3)" })
        ] }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.posterUrl, onChange: (e) => set("posterUrl", e.target.value), placeholder: "https://…" }),
        form.posterUrl && /* @__PURE__ */ jsx("img", { src: form.posterUrl, alt: "poster", style: { marginTop: 8, height: 100, borderRadius: 4, border: "1px solid var(--border)", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxs("label", { className: "form-label", children: [
          "Banner URL ",
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontWeight: 400 }, children: "(16:9 landscape)" })
        ] }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.thumbnailUrl, onChange: (e) => set("thumbnailUrl", e.target.value), placeholder: "https://…" }),
        form.thumbnailUrl && /* @__PURE__ */ jsx("img", { src: form.thumbnailUrl, alt: "banner", style: { marginTop: 8, width: "100%", maxHeight: 130, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }, onError: (e) => e.target.style.display = "none" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Synopsis" }),
        /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.synopsis, onChange: (e) => set("synopsis", e.target.value), style: { minHeight: 90 }, placeholder: "Brief story description…" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "IMDb ID" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.imdbId, onChange: (e) => set("imdbId", e.target.value), placeholder: "tt1234567" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "IMDb Rating" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.imdbRating, onChange: (e) => set("imdbRating", e.target.value), placeholder: "7.5" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "IMDb Votes" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.imdbVotes, onChange: (e) => set("imdbVotes", e.target.value), placeholder: "e.g. 1,234" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Content Rating" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: form.contentRating, onChange: (e) => set("contentRating", e.target.value), placeholder: "e.g. U/A, A, U" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Banner URL" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.bannerUrl, onChange: (e) => set("bannerUrl", e.target.value), placeholder: "Wide landscape image URL…" }),
        form.bannerUrl && /* @__PURE__ */ jsx("img", { src: form.bannerUrl, alt: "banner", style: { marginTop: 8, width: "100%", maxHeight: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }, onError: (e) => e.target.style.display = "none" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxs("label", { className: "form-label", style: { margin: 0 }, children: [
            "💡 Trivia & Fun Facts ",
            /* @__PURE__ */ jsxs("span", { style: { fontWeight: 400, color: "var(--muted)", fontSize: "0.7rem" }, children: [
              "(",
              (form.trivia || []).length,
              " facts)"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-outline btn-sm",
              onClick: () => set("trivia", [...form.trivia || [], ""]),
              children: "+ Add Fact"
            }
          )
        ] }),
        (form.trivia || []).length === 0 && /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "14px", background: "rgba(255,255,255,.02)", borderRadius: 8, border: "1px dashed rgba(255,255,255,.1)", color: "var(--muted)", fontSize: "0.78rem" }, children: 'No trivia yet. Click "+ Add Fact" to add fun facts about this movie.' }),
        (form.trivia || []).map((fact, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", marginTop: 10, color: "var(--gold)", flexShrink: 0 }, children: "💡" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: "form-textarea",
              value: fact,
              onChange: (e) => {
                const t = [...form.trivia || []];
                t[i] = e.target.value;
                set("trivia", t);
              },
              style: { minHeight: 60, flex: 1, fontSize: "0.82rem", lineHeight: 1.6 },
              placeholder: `Fun fact #${i + 1}… e.g. "This film was shot in just 30 days in Puri."`
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => set("trivia", (form.trivia || []).filter((_, j) => j !== i)),
              style: { background: "none", border: "none", color: "rgba(255,100,100,.6)", cursor: "pointer", fontSize: "1rem", padding: "8px 4px", flexShrink: 0 },
              children: "✕"
            }
          )
        ] }, i))
      ] }),
      /* @__PURE__ */ jsx("hr", { className: "divider" }),
      /* @__PURE__ */ jsx("p", { style: { fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }, children: "Box Office" }),
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }, children: [["Opening", "opening"], ["First Week", "firstWeek"], ["Total", "total"]].map(([label, key]) => /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.72rem" }, children: label }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.boxOffice[key], onChange: (e) => set("boxOffice", { ...form.boxOffice, [key]: e.target.value }), placeholder: "e.g. ₹50 Lakh" })
      ] }, key)) })
    ] }),
    step === 1 && /* @__PURE__ */ jsx(CastPicker, { cast, onChange: setCast }),
    step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Trailer (YouTube URL or ID)" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: trailerUrl, onChange: (e) => setTrailerUrl(e.target.value), placeholder: "https://youtube.com/watch?v=…" }),
        trailerPreview && /* @__PURE__ */ jsx("div", { style: { marginTop: 10, maxWidth: 380, position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 6 }, children: /* @__PURE__ */ jsx(
          "iframe",
          {
            src: `https://www.youtube.com/embed/${trailerPreview}`,
            allowFullScreen: true,
            title: "Trailer",
            style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx("hr", { className: "divider" }),
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Songs" }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { marginBottom: 8 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "YouTube URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.url, onChange: (e) => setSf((f) => ({ ...f, url: e.target.value })), placeholder: "Paste YouTube link" }),
          extractYtId(sf.url) && /* @__PURE__ */ jsx("img", { src: `https://img.youtube.com/vi/${extractYtId(sf.url)}/hqdefault.jpg`, alt: "thumb", style: { marginTop: 6, width: "100%", maxHeight: 100, objectFit: "cover", borderRadius: 4 } })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { marginBottom: 8 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Song Title *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.title, onChange: (e) => setSf((f) => ({ ...f, title: e.target.value })), placeholder: "e.g. Mora Kaha Achi Tu" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsx(
            PersonPicker,
            {
              label: "Singer(s)",
              icon: "🎤",
              castType: "Singer",
              value: sf.singer,
              refs: sf.singerRef,
              onChange: (name, refs) => setSf((f) => ({ ...f, singer: name, singerRef: refs }))
            }
          ),
          /* @__PURE__ */ jsx(
            PersonPicker,
            {
              label: "Music Director",
              icon: "🎼",
              castType: "Music Director",
              value: sf.musicDirector,
              refs: sf.musicDirectorRef,
              onChange: (name, refs) => setSf((f) => ({ ...f, musicDirector: name, musicDirectorRef: refs }))
            }
          ),
          /* @__PURE__ */ jsx(
            PersonPicker,
            {
              label: "Lyricist",
              icon: "✍️",
              castType: "Lyricist",
              value: sf.lyricist,
              refs: sf.lyricistRef,
              onChange: (name, refs) => setSf((f) => ({ ...f, lyricist: name, lyricistRef: refs }))
            }
          )
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: handleSongAdd, disabled: !sf.title.trim(), children: "+ Add Song" })
      ] }),
      songs.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: songs.map((s, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, background: "var(--bg3)", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }, children: [
        s.thumbnailUrl ? /* @__PURE__ */ jsx("img", { src: s.thumbnailUrl, alt: s.title, style: { width: 64, height: 36, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.opacity = "0.2" }) : /* @__PURE__ */ jsx("div", { style: { width: 64, height: 36, background: "var(--bg2)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: "🎵" }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.84rem" }, children: s.title }),
          s.singer && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--gold)" }, children: [
            "🎤 ",
            s.singer
          ] }),
          s.musicDirector && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
            "🎼 ",
            s.musicDirector
          ] }),
          s.lyricist && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
            "✍️ ",
            s.lyricist
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-ghost btn-sm", onClick: () => setSongs((p) => p.filter((_, idx) => idx !== i)), style: { color: "var(--red)", flexShrink: 0 }, children: "✕" })
      ] }, i)) })
    ] }),
    step === 3 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.82rem", marginBottom: 20 }, children: "Review before saving." }),
      form.posterUrl && /* @__PURE__ */ jsx("img", { src: form.posterUrl, alt: "poster", style: { height: 90, borderRadius: 5, border: "1px solid var(--border)", marginBottom: 16, objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }),
      [
        ["Title", form.title || "—"],
        ["Category", form.category],
        ["Language", form.language],
        ["Release", form.releaseTBA ? "TBA" : form.releaseDate || "—"],
        ["Budget", form.budget || "—"],
        ["Verdict", form.verdict],
        ["Runtime", form.runtime || "—"],
        ["Genres", form.genre.join(", ") || "—"],
        ["Productions", productions.map((p) => p.name).join(", ") || "None"],
        ["Cast count", String(cast.length)],
        ["Songs", String(songs.length)],
        ["Trailer", extractYtId(trailerUrl) ? "✓ Added" : "—"]
      ].map(([label, value]) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 14, padding: "8px 0", borderBottom: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: 130, flexShrink: 0 }, children: label }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: "0.85rem" }, children: value })
      ] }, label))
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-outline btn-sm", onClick: () => step > 0 ? setStep((s) => s - 1) : onCancel(), children: [
        "← ",
        step === 0 ? "Cancel" : "Back"
      ] }),
      step < MOVIE_STEPS.length - 1 ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: () => setStep((s) => s + 1), disabled: step === 0 && !form.title.trim(), children: "Next →" }) : /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: handleSubmit, disabled: saving || !form.title.trim(), children: saving ? "Saving…" : "💾 Save Movie" })
    ] })
  ] });
}
function CastForm({ initial, onSave, onCancel, saving }) {
  const initRoles = (initial == null ? void 0 : initial.type) ? initial.type.split(",").map((r) => r.trim()).filter(Boolean) : ["Actor"];
  const [form, setForm] = useState({
    name: (initial == null ? void 0 : initial.name) || "",
    photo: (initial == null ? void 0 : initial.photo) || "",
    bio: (initial == null ? void 0 : initial.bio) || "",
    dob: (initial == null ? void 0 : initial.dob) || "",
    gender: (initial == null ? void 0 : initial.gender) || "",
    location: (initial == null ? void 0 : initial.location) || "",
    website: (initial == null ? void 0 : initial.website) || "",
    instagram: (initial == null ? void 0 : initial.instagram) || ""
  });
  const [roles, setRoles] = useState(initRoles);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (r) => {
    setRoles(
      (prev) => prev.includes(r) ? prev.length > 1 ? prev.filter((x) => x !== r) : prev : [...prev, r]
    );
  };
  const handleSave = () => {
    onSave({ ...form, type: roles.join(", ") });
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 0 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Full Name *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.name, onChange: (e) => set("name", e.target.value), autoFocus: true })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Roles (select all that apply)" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }, children: CAST_TYPES.map((r) => {
        const sel = roles.includes(r);
        return /* @__PURE__ */ jsx("button", { type: "button", onClick: () => toggleRole(r), style: {
          padding: "4px 12px",
          fontSize: "0.74rem",
          fontWeight: 600,
          borderRadius: 20,
          cursor: "pointer",
          border: "none",
          background: sel ? "var(--gold)" : "rgba(255,255,255,0.07)",
          color: sel ? "#000" : "var(--muted)",
          transition: "all 0.15s"
        }, children: r }, r);
      }) }),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 5 }, children: [
        "Selected: ",
        /* @__PURE__ */ jsx("strong", { style: { color: "var(--gold)" }, children: roles.join(", ") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Photo URL" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.photo, onChange: (e) => set("photo", e.target.value), placeholder: "https://…" }),
      form.photo && /* @__PURE__ */ jsx(
        "img",
        {
          src: form.photo,
          alt: form.name,
          style: { marginTop: 8, width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" },
          onError: (e) => e.target.style.display = "none"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Bio" }),
      /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.bio, onChange: (e) => set("bio", e.target.value), style: { minHeight: 70 }, placeholder: "Short biography…" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Date of Birth" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", type: "date", value: form.dob, onChange: (e) => set("dob", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Gender" }),
        /* @__PURE__ */ jsxs("select", { className: "form-select", value: form.gender, onChange: (e) => set("gender", e.target.value), children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
          /* @__PURE__ */ jsx("option", { children: "Male" }),
          /* @__PURE__ */ jsx("option", { children: "Female" }),
          /* @__PURE__ */ jsx("option", { children: "Non-binary" }),
          /* @__PURE__ */ jsx("option", { children: "Other" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Location" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.location, onChange: (e) => set("location", e.target.value), placeholder: "e.g. Bhubaneswar, Odisha" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Instagram Handle" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.instagram, onChange: (e) => set("instagram", e.target.value), placeholder: "@username" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Website" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.website, onChange: (e) => set("website", e.target.value), placeholder: "https://…" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: handleSave, disabled: saving || !form.name.trim(), children: saving ? "Saving…" : "💾 Save" })
    ] })
  ] });
}
function ProductionForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: (initial == null ? void 0 : initial.name) || "",
    logo: (initial == null ? void 0 : initial.logo) || "",
    banner: (initial == null ? void 0 : initial.banner) || "",
    bio: (initial == null ? void 0 : initial.bio) || "",
    founded: (initial == null ? void 0 : initial.founded) || "",
    website: (initial == null ? void 0 : initial.website) || "",
    location: (initial == null ? void 0 : initial.location) || ""
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Company Name *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.name, onChange: (e) => set("name", e.target.value), autoFocus: true })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Founded" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.founded, onChange: (e) => set("founded", e.target.value), placeholder: "e.g. 2010" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Location" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.location, onChange: (e) => set("location", e.target.value), placeholder: "e.g. Bhubaneswar" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Logo URL" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.logo, onChange: (e) => set("logo", e.target.value), placeholder: "https://…" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Website" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: form.website, onChange: (e) => set("website", e.target.value), placeholder: "https://…" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "About" }),
      /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.bio, onChange: (e) => set("bio", e.target.value), style: { minHeight: 80 } })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: () => onSave(form), disabled: saving || !form.name.trim(), children: saving ? "Saving…" : "💾 Save" })
    ] })
  ] });
}
function MovieSearchPicker({ movies, onSelect, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = (movies || []).filter((m) => {
    var _a;
    return !q.trim() || ((_a = m.title) == null ? void 0 : _a.toLowerCase().includes(q.toLowerCase()));
  }).slice(0, 12);
  return /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "form-input",
        value: q,
        onChange: (e) => {
          setQ(e.target.value);
          setOpen(true);
        },
        onFocus: () => setOpen(true),
        placeholder: placeholder || "Type to search movie…",
        autoComplete: "off"
      }
    ),
    open && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, zIndex: 60, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          onClick: () => {
            onSelect({ _id: "", title: "" });
            setOpen(false);
            setQ("");
          },
          style: { padding: "9px 12px", cursor: "pointer", fontSize: "0.82rem", color: "var(--muted)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
          children: "— General (no movie) —"
        }
      ),
      filtered.map((m) => /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => {
            onSelect(m);
            setOpen(false);
            setQ("");
          },
          style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" },
          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.08)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
          children: [
            (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, style: { width: 26, height: 36, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem" }, children: m.title }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA" })
            ] })
          ]
        },
        m._id
      ))
    ] })
  ] });
}
function NewsForm({ initial, onSave, onCancel, saving, movies }) {
  const [form, setForm] = useState({
    title: (initial == null ? void 0 : initial.title) || "",
    content: (initial == null ? void 0 : initial.content) || "",
    category: (initial == null ? void 0 : initial.category) || "Update",
    imageUrl: (initial == null ? void 0 : initial.imageUrl) || "",
    published: (initial == null ? void 0 : initial.published) !== false,
    movieId: (initial == null ? void 0 : initial.movieId) || "",
    movieTitle: (initial == null ? void 0 : initial.movieTitle) || ""
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Headline *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", required: true, value: form.title, onChange: (e) => set("title", e.target.value), autoFocus: true })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Related Movie / Album" }),
      form.movieId ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "rgba(201,151,58,0.1)", border: "1px solid var(--gold)", borderRadius: 7, padding: "8px 12px" }, children: [
        /* @__PURE__ */ jsxs("span", { style: { flex: 1, fontWeight: 600, fontSize: "0.88rem" }, children: [
          "🎬 ",
          form.movieTitle || form.movieId
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => set("movieId", "") || set("movieTitle", ""), style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem" }, children: "✕" })
      ] }) : /* @__PURE__ */ jsx(MovieSearchPicker, { movies, onSelect: (m) => {
        set("movieId", m._id);
        set("movieTitle", m.title);
      } })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Category" }),
        /* @__PURE__ */ jsx("select", { className: "form-select", value: form.category, onChange: (e) => set("category", e.target.value), children: NEWS_CATS.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Cover Image URL" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: form.imageUrl, onChange: (e) => set("imageUrl", e.target.value), placeholder: "https://…" })
      ] })
    ] }),
    form.imageUrl && /* @__PURE__ */ jsx("img", { src: form.imageUrl, alt: "cover", style: { width: "100%", maxHeight: 130, objectFit: "cover", borderRadius: 5, marginBottom: 12, border: "1px solid var(--border)" }, onError: (e) => e.target.style.display = "none" }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Content *" }),
      /* @__PURE__ */ jsx("textarea", { className: "form-textarea", value: form.content, onChange: (e) => set("content", e.target.value), style: { minHeight: 140 }, placeholder: "News content…" })
    ] }),
    /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer", fontSize: "0.85rem" }, children: [
      /* @__PURE__ */ jsx("input", { type: "checkbox", checked: form.published, onChange: (e) => set("published", e.target.checked) }),
      "Published (visible on public site)"
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: () => onSave(form), disabled: saving || !form.title.trim() || !form.content.trim(), children: saving ? "Saving…" : "💾 Save" })
    ] })
  ] });
}
function SongForm({ onSave, onCancel, saving, movies, preselectedMovieId, initial, isEdit, songIndex }) {
  const [movieId, setMovieId] = useState(preselectedMovieId || "");
  const [movieTitle, setMovieTitle] = useState(() => {
    if (!preselectedMovieId) return "";
    const m = (movies || []).find((x) => x._id === preselectedMovieId);
    return (m == null ? void 0 : m.title) || "";
  });
  const [movieSearch, setMovieSearch] = useState("");
  const [showMovieDrop, setShowMovieDrop] = useState(false);
  const EMPTY_SF = { url: "", title: "", singer: "", singerRef: [], musicDirector: "", musicDirectorRef: [], lyricist: "", lyricistRef: [] };
  const [sf, setSf] = useState(() => initial ? {
    url: initial.url || (initial.ytId ? `https://youtu.be/${initial.ytId}` : ""),
    title: initial.title || "",
    singer: initial.singer || "",
    singerRef: initial.singerRef || [],
    musicDirector: initial.musicDirector || "",
    musicDirectorRef: initial.musicDirectorRef || [],
    lyricist: initial.lyricist || "",
    lyricistRef: initial.lyricistRef || []
  } : EMPTY_SF);
  const filteredMovies = (movies || []).filter(
    (m) => {
      var _a;
      return !movieSearch.trim() || ((_a = m.title) == null ? void 0 : _a.toLowerCase().includes(movieSearch.toLowerCase()));
    }
  ).slice(0, 12);
  const selectMovie = (m) => {
    setMovieId(m._id);
    setMovieTitle(m.title);
    setMovieSearch("");
    setShowMovieDrop(false);
  };
  const handleAdd = () => {
    if (!sf.title.trim() || !movieId) return;
    const ytId = extractYtId(sf.url);
    onSave({ movieId, songIndex, isEdit, song: {
      title: sf.title.trim(),
      singer: sf.singer.trim(),
      singerRef: sf.singerRef,
      musicDirector: sf.musicDirector.trim(),
      musicDirectorRef: sf.musicDirectorRef,
      lyricist: sf.lyricist.trim(),
      lyricistRef: sf.lyricistRef,
      ytId,
      url: sf.url,
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ""
    } });
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "form-group", style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Movie / Album *" }),
      movieId ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "rgba(201,151,58,0.1)", border: "1px solid var(--gold)", borderRadius: 7, padding: "9px 12px" }, children: [
        /* @__PURE__ */ jsxs("span", { style: { flex: 1, fontWeight: 600, fontSize: "0.9rem" }, children: [
          "🎬 ",
          movieTitle
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          setMovieId("");
          setMovieTitle("");
        }, style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }, children: "✕" })
      ] }) : /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            value: movieSearch,
            onChange: (e) => {
              setMovieSearch(e.target.value);
              setShowMovieDrop(true);
            },
            onFocus: () => setShowMovieDrop(true),
            placeholder: "Type to search movie…",
            autoComplete: "off"
          }
        ),
        showMovieDrop && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, zIndex: 60, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }, children: filteredMovies.length === 0 ? /* @__PURE__ */ jsx("div", { style: { padding: "10px 14px", color: "var(--muted)", fontSize: "0.82rem" }, children: "No movies found" }) : filteredMovies.map((m) => /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => selectMovie(m),
            style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" },
            onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.08)",
            onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
            children: [
              (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, style: { width: 28, height: 40, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem" }, children: m.title }),
                /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
                  m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA",
                  " · ",
                  m.language || ""
                ] })
              ] })
            ]
          },
          m._id
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "YouTube URL" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.url, onChange: (e) => setSf((f) => ({ ...f, url: e.target.value })), placeholder: "Paste YouTube link" }),
      extractYtId(sf.url) && /* @__PURE__ */ jsx("img", { src: `https://img.youtube.com/vi/${extractYtId(sf.url)}/hqdefault.jpg`, alt: "thumb", style: { marginTop: 8, width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 4 } })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsx("label", { className: "form-label", children: "Song Title *" }),
      /* @__PURE__ */ jsx("input", { className: "form-input", value: sf.title, onChange: (e) => setSf((f) => ({ ...f, title: e.target.value })), placeholder: "e.g. Mora Kaha Achi Tu" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
      /* @__PURE__ */ jsx("div", { className: "form-group", style: { margin: 0 }, children: /* @__PURE__ */ jsx(
        PersonPicker,
        {
          label: "Singer(s)",
          icon: "🎤",
          castType: "Singer",
          value: sf.singer,
          refs: sf.singerRef,
          onChange: (name, refs) => setSf((f) => ({ ...f, singer: name, singerRef: refs }))
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "form-group", style: { margin: 0 }, children: /* @__PURE__ */ jsx(
        PersonPicker,
        {
          label: "Music Director",
          icon: "🎼",
          castType: "Music Director",
          value: sf.musicDirector,
          refs: sf.musicDirectorRef,
          onChange: (name, refs) => setSf((f) => ({ ...f, musicDirector: name, musicDirectorRef: refs }))
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "form-group", style: { margin: 0 }, children: /* @__PURE__ */ jsx(
        PersonPicker,
        {
          label: "Lyricist",
          icon: "✍️",
          castType: "Lyricist",
          value: sf.lyricist,
          refs: sf.lyricistRef,
          onChange: (name, refs) => setSf((f) => ({ ...f, lyricist: name, lyricistRef: refs }))
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: handleAdd, disabled: saving || !sf.title.trim() || !movieId, children: saving ? "Saving…" : isEdit ? "💾 Save Changes" : "🎵 Add Song" })
    ] })
  ] });
}
function CastDetailTab({ movie, onAdd, onRemove, onToast, onMovieUpdate }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const startEdit = (c, i) => {
    setEditIdx(i);
    setEditForm({ name: c.name || "", type: c.type || "Actor", role: c.role || "", photo: c.photo || "" });
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const updatedCast = movie.cast.map(
        (c, i) => i === editIdx ? { castId: c.castId || String(c._id), name: editForm.name, type: editForm.type, role: editForm.role, photo: editForm.photo, isNew: false } : { castId: c.castId || String(c._id), name: c.name, type: c.type, role: c.role || "", photo: c.photo || "", isNew: false }
      );
      const m = await API.adminUpdateMovie(movie._id, { cast: updatedCast });
      onMovieUpdate == null ? void 0 : onMovieUpdate(m);
      onToast == null ? void 0 : onToast("Cast updated!");
      setEditIdx(null);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 14 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: onAdd, children: "+ Add Cast Member" }) }),
    !movie.cast || movie.cast.length === 0 ? /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)", textAlign: "center", padding: 40 }, children: "No cast added yet." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: movie.cast.map((c, i) => /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", border: `1px solid ${editIdx === i ? "var(--gold)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s" }, children: editIdx === i ? /* @__PURE__ */ jsxs("div", { style: { padding: "14px 16px" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }, children: [
        "✏ Editing: ",
        c.name
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.name, onChange: (e) => setEditForm((f) => ({ ...f, name: e.target.value })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Role / Character" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.role, onChange: (e) => setEditForm((f) => ({ ...f, role: e.target.value })), placeholder: "e.g. Hero" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Type" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: editForm.type, onChange: (e) => setEditForm((f) => ({ ...f, type: e.target.value })), children: CAST_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { fontSize: "0.68rem", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: editForm.photo, onChange: (e) => setEditForm((f) => ({ ...f, photo: e.target.value })), placeholder: "https://…" })
        ] })
      ] }),
      editForm.photo && /* @__PURE__ */ jsx("img", { src: editForm.photo, alt: editForm.name, style: { width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)", marginBottom: 10 }, onError: (e) => e.target.style.display = "none" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: saveEdit, disabled: saving || !editForm.name.trim(), children: saving ? "Saving…" : "💾 Save" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditIdx(null), children: "Cancel" })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }, children: [
      /* @__PURE__ */ jsx("div", { style: { width: 42, height: 42, borderRadius: "50%", background: "var(--bg3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: "1px solid var(--border)" }, children: c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "👤" }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.87rem" }, children: c.name }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--gold)", marginTop: 1 }, children: [
          c.type,
          c.role ? ` · ${c.role}` : ""
        ] }),
        c.castId && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.62rem", color: "var(--muted)", marginTop: 1 }, children: [
          "ID: ",
          String(c.castId).slice(-6)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: "0.7rem" }, onClick: () => startEdit(c, i), children: "✏ Edit" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { color: "var(--red)", fontSize: "0.7rem" }, onClick: () => onRemove(c.castId || String(c._id), c.name), children: "✕" })
      ] })
    ] }) }, i)) })
  ] });
}
function AdminMovieDetail({ movie: initialMovie, movies, onBack, onToast, onMovieUpdate }) {
  var _a;
  const [movie, setMovie] = useState(initialMovie);
  const [detailTab, setDetailTab] = useState("cast");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [modal, setModal] = useState(null);
  const refreshMovie = async () => {
    try {
      const m = await API.getMovie(movie._id);
      setMovie(m);
      onMovieUpdate == null ? void 0 : onMovieUpdate(m);
    } catch {
    }
  };
  const handleAddCastEntry = async (castEntry) => {
    setSaving(true);
    try {
      const m = await API.adminAddCastToMovie(movie._id, castEntry);
      setMovie(m);
      onMovieUpdate == null ? void 0 : onMovieUpdate(m);
      onToast == null ? void 0 : onToast("Cast member added!");
      setModal(null);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleRemoveCast = (castId, name) => {
    setConfirm({
      message: `Remove "${name}" from cast?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const m = await API.adminRemoveCastFromMovie(movie._id, castId);
          setMovie(m);
          onMovieUpdate == null ? void 0 : onMovieUpdate(m);
          onToast == null ? void 0 : onToast(`"${name}" removed from cast.`);
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message, "error");
        }
      }
    });
  };
  const handleAddSong = async ({ movieId, song, isEdit, songIndex }) => {
    setSaving(true);
    try {
      let m;
      if (isEdit) {
        m = await API.adminUpdateSong(movieId, songIndex, song);
        onToast == null ? void 0 : onToast("Song updated!");
      } else {
        m = await API.adminAddSong(movieId, song);
        onToast == null ? void 0 : onToast("Song added!");
      }
      setMovie(m);
      onMovieUpdate == null ? void 0 : onMovieUpdate(m);
      setModal(null);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSong = (idx, title) => {
    setConfirm({
      message: `Delete song "${title}"?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const m = await API.deleteSong(movie._id, idx);
          setMovie(m);
          onMovieUpdate == null ? void 0 : onMovieUpdate(m);
          onToast == null ? void 0 : onToast(`"${title}" deleted.`);
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message, "error");
        }
      }
    });
  };
  const handleAddNews = async (formData) => {
    setSaving(true);
    try {
      const n = await API.adminAddNewsToMovie(movie._id, formData);
      await refreshMovie();
      onToast == null ? void 0 : onToast("News article added!");
      setModal(null);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleEditNews = async (newsId, formData) => {
    setSaving(true);
    try {
      await API.updateNews(newsId, formData);
      await refreshMovie();
      onToast == null ? void 0 : onToast("Article updated!");
      setModal(null);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteNews = (newsId, title) => {
    setConfirm({
      message: `Delete article "${title}"?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await API.adminDeleteNews(newsId);
          await refreshMovie();
          onToast == null ? void 0 : onToast("Article deleted.");
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message, "error");
        }
      }
    });
  };
  const DETAIL_TABS = ["cast", "songs", "news"];
  const tabSt = (t) => ({
    padding: "8px 16px",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: detailTab === t ? 700 : 500,
    fontSize: "0.83rem",
    background: detailTab === t ? "rgba(201,151,58,0.12)" : "transparent",
    color: detailTab === t ? "var(--gold)" : "var(--muted)",
    borderBottom: detailTab === t ? "2px solid var(--gold)" : "2px solid transparent",
    transition: "all 0.15s"
  });
  const banner = movie.thumbnailUrl || movie.posterUrl;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: onBack, style: { marginBottom: 16 }, children: "← Back to Movies" }),
    /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }, children: [
      banner && /* @__PURE__ */ jsxs("div", { style: { position: "relative", height: 180, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsx("img", { src: banner, alt: movie.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }),
        /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" } })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, padding: 16, alignItems: "flex-start" }, children: [
        movie.posterUrl && /* @__PURE__ */ jsx("img", { src: movie.posterUrl, alt: movie.title, style: { width: 70, height: 100, objectFit: "cover", borderRadius: 6, flexShrink: 0, marginTop: 0, border: "2px solid var(--border)" }, onError: (e) => e.target.style.display = "none" }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.3rem", fontWeight: 800, lineHeight: 1.2 }, children: movie.title }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.76rem", color: "var(--muted)", marginTop: 4 }, children: [
            movie.language,
            " · ",
            movie.category,
            " · ",
            fmtDate(movie.releaseDate)
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: {
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 9px",
              borderRadius: 9,
              background: `${verdictColor(movie.verdict)}22`,
              color: verdictColor(movie.verdict),
              border: `1px solid ${verdictColor(movie.verdict)}44`
            }, children: movie.verdict || "Upcoming" }),
            movie.runtime && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", color: "var(--muted)", padding: "2px 9px", borderRadius: 9, border: "1px solid var(--border)" }, children: movie.runtime })
          ] })
        ] }),
        /* @__PURE__ */ jsx("a", { href: `/movie/${movie._id}`, target: "_blank", rel: "noreferrer", className: "btn btn-ghost btn-sm", style: { fontSize: "0.72rem", flexShrink: 0 }, children: "View Public ↗" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20 }, children: DETAIL_TABS.map((t) => {
      var _a2, _b, _c, _d;
      return /* @__PURE__ */ jsxs("button", { onClick: () => setDetailTab(t), style: tabSt(t), children: [
        t === "cast" ? "🎭 Cast" : t === "songs" ? "🎵 Songs" : "📰 News",
        t === "cast" && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, fontSize: "0.68rem", background: "var(--bg3)", padding: "0 5px", borderRadius: 8 }, children: ((_a2 = movie.cast) == null ? void 0 : _a2.length) || 0 }),
        t === "songs" && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, fontSize: "0.68rem", background: "var(--bg3)", padding: "0 5px", borderRadius: 8 }, children: ((_c = (_b = movie.media) == null ? void 0 : _b.songs) == null ? void 0 : _c.length) || 0 }),
        t === "news" && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, fontSize: "0.68rem", background: "var(--bg3)", padding: "0 5px", borderRadius: 8 }, children: ((_d = movie.news) == null ? void 0 : _d.length) || 0 })
      ] }, t);
    }) }),
    detailTab === "cast" && /* @__PURE__ */ jsx(
      CastDetailTab,
      {
        movie,
        onAdd: () => setModal("add-cast"),
        onRemove: handleRemoveCast,
        onToast,
        onMovieUpdate: (m) => {
          setMovie(m);
          onMovieUpdate == null ? void 0 : onMovieUpdate(m);
        }
      }
    ),
    detailTab === "songs" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 14 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setModal("add-song"), children: "+ Add Song" }) }),
      !((_a = movie.media) == null ? void 0 : _a.songs) || movie.media.songs.length === 0 ? /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)", textAlign: "center", padding: 40 }, children: "No songs added yet." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: movie.media.songs.map((s, i) => {
        const thumb = s.ytId ? `https://img.youtube.com/vi/${s.ytId}/hqdefault.jpg` : null;
        return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { width: 72, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }, children: thumb ? /* @__PURE__ */ jsx("img", { src: thumb, alt: s.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : "🎵" }),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.85rem" }, children: s.title }),
            s.singer && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--gold)" }, children: [
              "🎤 ",
              s.singer
            ] }),
            s.musicDirector && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
              "🎼 ",
              s.musicDirector
            ] }),
            s.lyricist && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
              "✍️ ",
              s.lyricist
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0 }, children: [
            s.ytId && /* @__PURE__ */ jsx("a", { href: `https://youtube.com/watch?v=${s.ytId}`, target: "_blank", rel: "noreferrer", className: "btn btn-ghost btn-sm", style: { fontSize: "0.7rem" }, children: "YT↗" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-ghost btn-sm",
                style: { fontSize: "0.7rem" },
                onClick: () => setModal({ type: "edit-song", songIndex: i, data: s }),
                children: "✏ Edit"
              }
            ),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { color: "var(--red)", fontSize: "0.7rem" }, onClick: () => handleDeleteSong(i, s.title), children: "✕ Delete" })
          ] })
        ] }, i);
      }) })
    ] }),
    detailTab === "news" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 14 }, children: /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setModal("add-news"), children: "+ Add News" }) }),
      !movie.news || movie.news.length === 0 ? /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)", textAlign: "center", padding: 40 }, children: "No news articles yet." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: movie.news.map((n, i) => {
        const newsObj = typeof n === "object" ? n : { _id: n, title: "—", category: "", published: true };
        return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }, children: [
          newsObj.imageUrl && /* @__PURE__ */ jsx("img", { src: newsObj.imageUrl, alt: newsObj.title, style: { width: 72, height: 48, objectFit: "cover", borderRadius: 4, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.9rem" }, children: newsObj.title }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: [
              newsObj.category,
              /* @__PURE__ */ jsx("span", { style: { marginLeft: 8, color: newsObj.published ? "#4caf82" : "var(--red)" }, children: newsObj.published ? "● Published" : "○ Draft" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0 }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: "0.7rem" }, onClick: () => setModal({ type: "edit-news", data: newsObj }), children: "Edit" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { color: "var(--red)", fontSize: "0.7rem" }, onClick: () => handleDeleteNews(newsObj._id, newsObj.title), children: "Del" })
          ] })
        ] }, i);
      }) })
    ] }),
    modal && /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && setModal(null), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsx("span", { className: "modal-title", children: modal === "add-cast" ? "🎭 Add Cast Member" : modal === "add-song" ? "🎵 Add Song" : (modal == null ? void 0 : modal.type) === "edit-song" ? "✏️ Edit Song" : modal === "add-news" ? "📰 Add News Article" : (modal == null ? void 0 : modal.type) === "edit-news" ? "✏️ Edit Article" : "" }),
        /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: () => setModal(null), children: "×" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { padding: "20px 0 4px" }, children: [
        modal === "add-cast" && /* @__PURE__ */ jsx(AddCastToMovieForm, { onSave: handleAddCastEntry, onCancel: () => setModal(null), saving }),
        (modal === "add-song" || (modal == null ? void 0 : modal.type) === "edit-song") && /* @__PURE__ */ jsx(
          SongForm,
          {
            onSave: handleAddSong,
            onCancel: () => setModal(null),
            saving,
            movies: [movie],
            preselectedMovieId: movie._id,
            initial: (modal == null ? void 0 : modal.data) || null,
            isEdit: (modal == null ? void 0 : modal.type) === "edit-song",
            songIndex: modal == null ? void 0 : modal.songIndex
          }
        ),
        (modal === "add-news" || (modal == null ? void 0 : modal.type) === "edit-news") && /* @__PURE__ */ jsx(
          NewsForm,
          {
            initial: (modal == null ? void 0 : modal.data) ? { ...modal.data, movieId: movie._id } : { movieId: movie._id },
            onSave: (modal == null ? void 0 : modal.type) === "edit-news" ? (fd) => handleEditNews(modal.data._id, fd) : handleAddNews,
            onCancel: () => setModal(null),
            saving,
            movies: [movie]
          }
        )
      ] })
    ] }) }),
    confirm && /* @__PURE__ */ jsx(ConfirmModal, { message: confirm.message, onConfirm: confirm.onConfirm, onCancel: () => setConfirm(null) })
  ] });
}
function AddCastToMovieForm({ onSave, onCancel, saving }) {
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState("");
  const [type, setType] = useState("Actor");
  const [newForm, setNewForm] = useState({ name: "", type: "Actor", role: "", photo: "" });
  const timer = useRef(null);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setResults(await API.searchCast(query));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);
  const handleSubmit = () => {
    if (mode === "search" && selected) {
      onSave({ castId: String(selected._id), isNew: false, name: selected.name, photo: selected.photo || "", type, role });
    } else if (mode === "new" && newForm.name.trim()) {
      onSave({ isNew: true, name: newForm.name.trim(), photo: newForm.photo, type: newForm.type, role: newForm.role });
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 0, marginBottom: 18, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }, children: ["search", "new"].map((m) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setMode(m), style: {
      flex: 1,
      padding: "8px 0",
      background: mode === m ? "var(--gold)" : "transparent",
      color: mode === m ? "#000" : "var(--muted)",
      border: "none",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: "0.78rem",
      textTransform: "uppercase"
    }, children: m === "search" ? "🔍 Search Existing" : "+ New Person" }, m)) }),
    mode === "search" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginBottom: 12 }, children: [
        /* @__PURE__ */ jsx("input", { className: "form-input", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Type name to search…", autoFocus: true }),
        results.length > 0 && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, zIndex: 50, maxHeight: 200, overflowY: "auto" }, children: results.map((p) => /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => {
              setSelected(p);
              setType(p.type || "Actor");
              setResults([]);
              setQuery(p.name);
            },
            style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem" },
            onMouseEnter: (e) => e.currentTarget.style.background = "var(--bg3)",
            onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
            children: [
              p.photo && /* @__PURE__ */ jsx("img", { src: p.photo, alt: p.name, style: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: p.name }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", color: "var(--gold)" }, children: p.type })
            ]
          },
          p._id
        )) })
      ] }),
      selected && /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Type" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: type, onChange: (e) => setType(e.target.value), children: CAST_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.7rem" }, children: "Role / Character" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: role, onChange: (e) => setRole(e.target.value), placeholder: "e.g. Hero" })
        ] })
      ] })
    ] }),
    mode === "new" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Full Name *" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newForm.name, onChange: (e) => setNewForm((f) => ({ ...f, name: e.target.value })), autoFocus: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Type" }),
          /* @__PURE__ */ jsx("select", { className: "form-select", value: newForm.type, onChange: (e) => setNewForm((f) => ({ ...f, type: e.target.value })), children: CAST_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Role / Character" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newForm.role, onChange: (e) => setNewForm((f) => ({ ...f, role: e.target.value })), placeholder: "e.g. Hero" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Photo URL" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", value: newForm.photo, onChange: (e) => setNewForm((f) => ({ ...f, photo: e.target.value })), placeholder: "https://…" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)", marginTop: 16 }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold", onClick: handleSubmit, disabled: saving || mode === "search" && !selected || mode === "new" && !newForm.name.trim(), children: saving ? "Adding…" : "✓ Add to Cast" })
    ] })
  ] });
}
function AdminSettings({ admin, onToast }) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [conf, setConf] = useState("");
  const [saving, setSaving] = useState(false);
  const handleChange = async (e) => {
    e.preventDefault();
    if (pw !== conf) return onToast == null ? void 0 : onToast("Passwords don't match", "error");
    if (pw.length < 8) return onToast == null ? void 0 : onToast("Password must be at least 8 characters", "error");
    setSaving(true);
    try {
      await API.adminChangePassword(cur, pw);
      onToast == null ? void 0 : onToast("Password updated successfully!");
      setCur("");
      setPw("");
      setConf("");
    } catch (e2) {
      onToast == null ? void 0 : onToast(e2.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: 500 }, children: [
    /* @__PURE__ */ jsx("h2", { style: { marginBottom: 24 }, children: "Settings" }),
    /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px 22px", marginBottom: 20 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", marginBottom: 16 }, children: "🔐 Change Password" }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleChange, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Current Password" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", required: true, value: cur, onChange: (e) => setCur(e.target.value), autoComplete: "current-password" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "New Password (min 8 chars)" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", required: true, value: pw, onChange: (e) => setPw(e.target.value), autoComplete: "new-password" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { className: "form-label", children: "Confirm New Password" }),
          /* @__PURE__ */ jsx("input", { className: "form-input", type: "password", required: true, value: conf, onChange: (e) => setConf(e.target.value), autoComplete: "new-password" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold", type: "submit", disabled: saving, children: saving ? "Updating…" : "Update Password" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px" }, children: [
      /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", marginBottom: 8 }, children: "🛡 Admin Info" }),
      /* @__PURE__ */ jsxs("p", { style: { fontSize: "0.85rem", color: "var(--muted)" }, children: [
        "Username: ",
        /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: admin == null ? void 0 : admin.username })
      ] })
    ] })
  ] });
}
function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  const scrollTop = () => {
    const m = document.getElementById("admin-main");
    if (m) m.scrollTo({ top: 0, behavior: "smooth" });
  };
  const go = (p) => {
    onChange(p);
    scrollTop();
  };
  const pages = [];
  let lo = Math.max(1, page - 2), hi = Math.min(totalPages, page + 2);
  if (hi - lo < 4) {
    lo = Math.max(1, hi - 4);
    hi = Math.min(totalPages, lo + 4);
  }
  for (let i = lo; i <= hi; i++) pages.push(i);
  const PBtn = ({ label, target, disabled, active }) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => !disabled && go(target),
      disabled,
      style: {
        minWidth: 36,
        height: 36,
        padding: "0 10px",
        borderRadius: 8,
        border: `1px solid ${active ? "var(--gold)" : disabled ? "var(--border)" : "var(--border)"}`,
        background: active ? "var(--gold)" : "var(--bg2)",
        color: active ? "#000" : disabled ? "rgba(255,255,255,0.2)" : "var(--text)",
        fontWeight: active ? 800 : 500,
        fontSize: "0.82rem",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.12s"
      },
      onMouseEnter: (e) => {
        if (!disabled && !active) {
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.color = "var(--gold)";
        }
      },
      onMouseLeave: (e) => {
        if (!disabled && !active) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text)";
        }
      },
      children: label
    }
  );
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "32px 0 12px", flexWrap: "wrap" }, children: [
    /* @__PURE__ */ jsx(PBtn, { label: "‹", target: page - 1, disabled: page === 1, active: false }),
    lo > 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(PBtn, { label: "1", target: 1, disabled: false, active: false }),
      lo > 2 && /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", padding: "0 2px" }, children: "…" })
    ] }),
    pages.map((p) => /* @__PURE__ */ jsx(PBtn, { label: p, target: p, disabled: false, active: p === page }, p)),
    hi < totalPages && /* @__PURE__ */ jsxs(Fragment, { children: [
      hi < totalPages - 1 && /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", padding: "0 2px" }, children: "…" }),
      /* @__PURE__ */ jsx(PBtn, { label: totalPages, target: totalPages, disabled: false, active: false })
    ] }),
    /* @__PURE__ */ jsx(PBtn, { label: "›", target: page + 1, disabled: page === totalPages, active: false }),
    /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", color: "var(--muted)", marginLeft: 10, whiteSpace: "nowrap" }, children: [
      (page - 1) * perPage + 1,
      "–",
      Math.min(page * perPage, total),
      " of ",
      total
    ] })
  ] });
}
function EnquiriesPanel({ enquiries, setEnquiries, onToast, setConfirm }) {
  const [enqFilter, setEnqFilter] = useState("all");
  const [enqSearch, setEnqSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const SUBJECTS = Array.from(new Set(enquiries.map((e) => e.subject).filter(Boolean)));
  const filtered = enquiries.filter((e) => {
    var _a, _b, _c, _d;
    if (enqFilter === "unread" && e.read) return false;
    if (enqFilter === "read" && !e.read) return false;
    if (enqFilter.startsWith("subj:") && e.subject !== enqFilter.slice(5)) return false;
    if (enqSearch.trim()) {
      const q = enqSearch.toLowerCase();
      return ((_a = e.name) == null ? void 0 : _a.toLowerCase().includes(q)) || ((_b = e.email) == null ? void 0 : _b.toLowerCase().includes(q)) || ((_c = e.message) == null ? void 0 : _c.toLowerCase().includes(q)) || ((_d = e.subject) == null ? void 0 : _d.toLowerCase().includes(q));
    }
    return true;
  });
  const unreadCount = enquiries.filter((e) => !e.read).length;
  return /* @__PURE__ */ jsxs("div", { style: { padding: "28px" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("h2", { style: { margin: 0, fontSize: "1.35rem", fontWeight: 800 }, children: "Enquiries" }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: [
        enquiries.length,
        " total"
      ] }),
      unreadCount > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", background: "#e05555", color: "#fff", padding: "2px 9px", borderRadius: 12, fontWeight: 800 }, children: [
        unreadCount,
        " unread"
      ] }),
      unreadCount > 0 && /* @__PURE__ */ jsx(
        "button",
        {
          style: { marginLeft: "auto", padding: "6px 14px", fontSize: "0.74rem", background: "rgba(201,151,58,.1)", color: "var(--gold)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
          onClick: async () => {
            try {
              await Promise.all(enquiries.filter((e) => !e.read).map((e) => API.adminMarkEnquiryRead(e._id)));
              setEnquiries((p) => p.map((e) => ({ ...e, read: true })));
              onToast == null ? void 0 : onToast("All marked as read.");
            } catch (e) {
              onToast == null ? void 0 : onToast(e.message, "error");
            }
          },
          children: "✓ Mark all read"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18, padding: "12px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10 }, children: [
      [["all", "All"], ["unread", "Unread"], ["read", "Read"]].map(([val, label]) => /* @__PURE__ */ jsxs("button", { onClick: () => setEnqFilter(val), style: {
        padding: "5px 14px",
        fontSize: "0.74rem",
        fontWeight: 600,
        borderRadius: 20,
        cursor: "pointer",
        border: "none",
        background: enqFilter === val ? "var(--gold)" : "var(--bg3)",
        color: enqFilter === val ? "#000" : "var(--muted)"
      }, children: [
        label,
        val === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""
      ] }, val)),
      /* @__PURE__ */ jsx("div", { style: { width: 1, height: 20, background: "var(--border)", flexShrink: 0, margin: "0 4px" } }),
      SUBJECTS.length > 0 && /* @__PURE__ */ jsxs(
        "select",
        {
          value: enqFilter.startsWith("subj:") ? enqFilter.slice(5) : "",
          onChange: (e) => setEnqFilter(e.target.value ? `subj:${e.target.value}` : "all"),
          style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", color: "var(--text)", fontSize: "0.74rem", cursor: "pointer", outline: "none" },
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "All Subjects" }),
            SUBJECTS.map((s) => /* @__PURE__ */ jsx("option", { value: s, children: s }, s))
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginLeft: "auto" }, children: [
        /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: "0.78rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 28px", color: "var(--text)", fontSize: "0.78rem", outline: "none", width: 200 },
            placeholder: "Search name, message…",
            value: enqSearch,
            onChange: (e) => setEnqSearch(e.target.value)
          }
        ),
        enqSearch && /* @__PURE__ */ jsx("button", { onClick: () => setEnqSearch(""), style: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.78rem" }, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: [
        filtered.length,
        " result",
        filtered.length !== 1 ? "s" : ""
      ] })
    ] }),
    filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 20px", color: "var(--muted)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", marginBottom: 12 }, children: "✉️" }),
      /* @__PURE__ */ jsx("p", { children: enquiries.length === 0 ? "No enquiries yet." : "No results match your filter." })
    ] }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: filtered.map((enq) => {
      const isOpen = !!expanded[enq._id];
      return /* @__PURE__ */ jsxs("div", { style: {
        background: enq.read ? "var(--bg2)" : "rgba(201,151,58,.05)",
        border: `1px solid ${enq.read ? "var(--border)" : "rgba(201,151,58,.28)"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 0.2s"
      }, children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", flexWrap: "wrap" },
            onClick: () => {
              toggleExpand(enq._id);
              if (!enq.read) {
                API.adminMarkEnquiryRead(enq._id).catch(() => {
                });
                setEnquiries((p) => p.map((e) => e._id === enq._id ? { ...e, read: true } : e));
              }
            },
            children: [
              !enq.read && /* @__PURE__ */ jsx("div", { style: { width: 7, height: 7, borderRadius: "50%", background: "#e05555", flexShrink: 0 } }),
              /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: "0.88rem" }, children: enq.name }),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: `mailto:${enq.email}`,
                  style: { fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none" },
                  onClick: (e) => e.stopPropagation(),
                  children: enq.email
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", background: "rgba(201,151,58,.1)", color: "var(--gold)", padding: "1px 8px", borderRadius: 10, border: "1px solid rgba(201,151,58,.2)", flexShrink: 0 }, children: enq.subject }),
              /* @__PURE__ */ jsxs("span", { style: { marginLeft: "auto", fontSize: "0.67rem", color: "var(--muted)", flexShrink: 0 }, children: [
                new Date(enq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                " · ",
                new Date(enq.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              ] }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.68rem", color: "var(--muted)", marginLeft: 6, display: "inline-block", transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "none" }, children: "▼" })
            ]
          }
        ),
        !isOpen && /* @__PURE__ */ jsx("div", { style: { padding: "0 16px 12px", fontSize: "0.78rem", color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: enq.message }),
        isOpen && /* @__PURE__ */ jsxs("div", { style: { padding: "0 16px 16px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { padding: "14px", background: "var(--bg3)", borderRadius: 8, marginBottom: 12 }, children: /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,.82)", lineHeight: 1.75, whiteSpace: "pre-wrap" }, children: enq.message }) }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                href: `mailto:${enq.email}?subject=Re: ${encodeURIComponent(enq.subject)}`,
                style: { padding: "7px 18px", fontSize: "0.78rem", fontWeight: 700, background: "var(--gold)", color: "#000", borderRadius: 6, textDecoration: "none" },
                children: "✉️ Reply"
              }
            ),
            !enq.read && /* @__PURE__ */ jsx(
              "button",
              {
                style: { padding: "7px 14px", fontSize: "0.78rem", background: "rgba(201,151,58,.1)", color: "var(--gold)", border: "1px solid rgba(201,151,58,.3)", borderRadius: 6, cursor: "pointer" },
                onClick: async (e) => {
                  e.stopPropagation();
                  try {
                    await API.adminMarkEnquiryRead(enq._id);
                    setEnquiries((p) => p.map((x) => x._id === enq._id ? { ...x, read: true } : x));
                  } catch (err) {
                    onToast == null ? void 0 : onToast(err.message, "error");
                  }
                },
                children: "✓ Mark Read"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                style: { marginLeft: "auto", padding: "7px 14px", fontSize: "0.78rem", background: "rgba(220,50,50,.08)", color: "var(--red)", border: "1px solid rgba(220,50,50,.2)", borderRadius: 6, cursor: "pointer" },
                onClick: (e) => {
                  e.stopPropagation();
                  setConfirm({
                    message: `Delete enquiry from "${enq.name}"?`,
                    onConfirm: async () => {
                      setConfirm(null);
                      try {
                        await API.adminDeleteEnquiry(enq._id);
                        setEnquiries((p) => p.filter((x) => x._id !== enq._id));
                        onToast == null ? void 0 : onToast("Enquiry deleted.");
                      } catch (err) {
                        onToast == null ? void 0 : onToast(err.message, "error");
                      }
                    }
                  });
                },
                children: "🗑 Delete"
              }
            )
          ] })
        ] })
      ] }, enq._id);
    }) })
  ] });
}
function AdminPortal({ admin, onLogout, onToast }) {
  var _a;
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [movies, setMovies] = useState([]);
  const [cast, setCast] = useState([]);
  const [prods, setProds] = useState([]);
  const [news, setNews] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const setQ = (v) => {
    setSearch(v);
    resetPages();
  };
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailMovie, setDetailMovie] = useState(null);
  const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [moviePage, setMoviePage] = useState(1);
  const [castPage, setCastPage] = useState(1);
  const [prodPage, setProdPage] = useState(1);
  const [newsPage, setNewsPage] = useState(1);
  const [songPage, setSongPage] = useState(1);
  const PG = { movies: 24, cast: 32, songs: 12, prods: 12, news: 16 };
  const resetPages = () => {
    setMoviePage(1);
    setCastPage(1);
    setProdPage(1);
    setNewsPage(1);
    setSongPage(1);
  };
  useEffect(() => {
    if (!admin || !getAdminToken()) navigate("/admin/login");
  }, [admin]);
  useEffect(() => {
    if (admin) loadAll();
  }, [admin]);
  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, c, p, n, s, enq] = await Promise.all([
        API.getMovies(),
        API.getCast(),
        API.getProductions(),
        API.adminGetAllNews(),
        API.adminStats(),
        API.adminGetEnquiries().catch(() => [])
      ]);
      setMovies(m);
      setCast(c);
      setProds(p);
      setNews(n);
      setStats(s);
      setEnquiries(enq);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };
  const openCreate = (type) => setModal({ type, mode: "create", data: null });
  const openEdit = (type, data) => setModal({ type, mode: "edit", data });
  const closeModal = () => setModal(null);
  const handleSaveMovie = async (formData) => {
    setSaving(true);
    try {
      const safeBody = JSON.parse(JSON.stringify(formData));
      if (modal.mode === "create") {
        const m = await API.adminCreateMovie(safeBody);
        setMovies((p) => [m, ...p]);
        onToast == null ? void 0 : onToast(`"${m.title}" created!`);
      } else {
        const m = await API.adminUpdateMovie(modal.data._id, safeBody);
        setMovies((p) => p.map((x) => x._id === m._id ? m : x));
        onToast == null ? void 0 : onToast(`"${m.title}" updated!`);
      }
      closeModal();
      loadAll();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveCast = async (formData) => {
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const c = await API.createCast(formData);
        setCast((p) => [c, ...p]);
        onToast == null ? void 0 : onToast(`${c.name} added!`);
      } else {
        const c = await API.updateCast(modal.data._id, formData);
        setCast((p) => p.map((x) => x._id === c._id ? c : x));
        onToast == null ? void 0 : onToast(`${c.name} updated!`);
      }
      closeModal();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveProd = async (formData) => {
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const p = await API.createProduction(formData);
        setProds((prev) => [p, ...prev]);
        onToast == null ? void 0 : onToast(`${p.name} created!`);
      } else {
        const p = await API.updateProduction(modal.data._id, formData);
        setProds((prev) => prev.map((x) => x._id === p._id ? p : x));
        onToast == null ? void 0 : onToast(`${p.name} updated!`);
      }
      closeModal();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveNews = async (formData) => {
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const n = await API.createNews(formData);
        setNews((p) => [n, ...p]);
        onToast == null ? void 0 : onToast("News article created!");
      } else {
        const n = await API.updateNews(modal.data._id, formData);
        setNews((p) => p.map((x) => x._id === n._id ? n : x));
        onToast == null ? void 0 : onToast("Article updated!");
      }
      closeModal();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveSong = async ({ movieId, song, isEdit, songIndex }) => {
    setSaving(true);
    try {
      let m;
      if (isEdit) {
        m = await API.adminUpdateSong(movieId, songIndex, song);
        onToast == null ? void 0 : onToast("Song updated!");
      } else {
        m = await API.adminAddSong(movieId, song);
        onToast == null ? void 0 : onToast("Song added!");
      }
      setMovies((prev) => prev.map((x) => x._id === movieId ? m : x));
      closeModal();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = (type, id, name, extra) => {
    setConfirm({
      message: `Delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          if (type === "movie") {
            await API.adminDeleteMovie(id);
            setMovies((p) => p.filter((x) => x._id !== id));
          }
          if (type === "cast") {
            await API.deleteCast(id);
            setCast((p) => p.filter((x) => x._id !== id));
          }
          if (type === "production") {
            await API.deleteProduction(id);
            setProds((p) => p.filter((x) => x._id !== id));
          }
          if (type === "news") {
            await API.adminDeleteNews(id);
            setNews((p) => p.filter((x) => x._id !== id));
          }
          if (type === "song") {
            const movieId = extra;
            const m = await API.deleteSong(movieId, id);
            setMovies((prev) => prev.map((x) => x._id === movieId ? m : x));
          }
          onToast == null ? void 0 : onToast(`"${name}" deleted.`);
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message, "error");
        }
      }
    });
  };
  const handleBulkDelete = (type) => {
    const ids = [...selected];
    if (!ids.length) return;
    setConfirm({
      message: `Permanently delete ${ids.length} selected ${type}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        let ok = 0, fail = 0;
        for (const id of ids) {
          try {
            if (type === "movies") {
              await API.adminDeleteMovie(id);
              setMovies((p) => p.filter((x) => x._id !== id));
            }
            if (type === "news") {
              await API.adminDeleteNews(id);
              setNews((p) => p.filter((x) => x._id !== id));
            }
            if (type === "songs") {
              const [mid, idx] = id.split("::");
              const m = await API.deleteSong(mid, Number(idx));
              setMovies((prev) => prev.map((x) => x._id === mid ? m : x));
            }
            ok++;
          } catch {
            fail++;
          }
        }
        setSelected(/* @__PURE__ */ new Set());
        setSelectMode(false);
        onToast == null ? void 0 : onToast(`Deleted ${ok}${fail ? ` (${fail} failed)` : ""}`);
      }
    });
  };
  const toggleSel = (id) => setSelected((p) => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = (ids) => setSelected(new Set(ids));
  const clearSel = () => {
    setSelected(/* @__PURE__ */ new Set());
    setSelectMode(false);
  };
  const q = search.toLowerCase();
  const filteredMovies = movies.filter((m) => {
    var _a2;
    return !q || ((_a2 = m.title) == null ? void 0 : _a2.toLowerCase().includes(q));
  }).slice().sort((a, b) => {
    const now2 = Date.now();
    const da = a.releaseDate ? new Date(a.releaseDate).getTime() : Infinity;
    const db = b.releaseDate ? new Date(b.releaseDate).getTime() : Infinity;
    const aUp = da >= now2 || a.verdict === "Upcoming";
    const bUp = db >= now2 || b.verdict === "Upcoming";
    if (aUp && !bUp) return -1;
    if (!aUp && bUp) return 1;
    return db - da;
  });
  const filteredCast = cast.filter((c) => {
    var _a2;
    return !q || ((_a2 = c.name) == null ? void 0 : _a2.toLowerCase().includes(q));
  });
  const filteredProds = prods.filter((p) => {
    var _a2;
    return !q || ((_a2 = p.name) == null ? void 0 : _a2.toLowerCase().includes(q));
  });
  const filteredNews = news.filter((n) => {
    var _a2;
    return !q || ((_a2 = n.title) == null ? void 0 : _a2.toLowerCase().includes(q));
  });
  if (!admin) return null;
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setDetailMovie(null);
    setSearch("");
    setSelected(/* @__PURE__ */ new Set());
    setSelectMode(false);
    resetPages();
  };
  const openMovieDetail = (m) => {
    setDetailMovie(m);
    setTab("movies");
  };
  return /* @__PURE__ */ jsxs("div", { style: { height: "100vh", overflow: "hidden", background: "var(--bg1)", display: "flex", flexDirection: "column" }, children: [
    /* @__PURE__ */ jsxs("nav", { style: {
      height: 58,
      background: "var(--bg2)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 16,
      flexShrink: 0,
      zIndex: 200
    }, children: [
      /* @__PURE__ */ jsxs("button", { onClick: () => handleTabChange("dashboard"), style: { fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "0.08em", color: "var(--gold)", background: "none", border: "none", cursor: "pointer" }, children: [
        "OLLY",
        /* @__PURE__ */ jsx("span", { style: { color: "var(--text)" }, children: "PEDIA" })
      ] }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: "var(--gold)", color: "#000", padding: "2px 8px", borderRadius: 4 }, children: "ADMIN" }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.82rem", color: "var(--muted)" }, children: [
        "@",
        admin.username
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onLogout == null ? void 0 : onLogout(), children: "Logout" }),
      /* @__PURE__ */ jsx("a", { href: "/", target: "_blank", rel: "noreferrer", className: "btn btn-outline btn-sm", style: { fontSize: "0.76rem" }, children: "View Site ↗" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }, children: [
      /* @__PURE__ */ jsx("aside", { style: {
        width: 220,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto"
      }, children: [
        ["dashboard", "🏠", "Dashboard"],
        ["movies", "🎬", "Movies"],
        ["songs", "🎵", "Songs"],
        ["cast", "🎭", "Cast & Crew"],
        ["productions", "🎥", "Productions"],
        ["news", "📰", "News"],
        ["enquiries", "✉️", "Enquiries"],
        ["settings", "⚙️", "Settings"]
      ].map(([key, icon, label]) => {
        const unread = key === "enquiries" ? enquiries.filter((e) => !e.read).length : 0;
        return /* @__PURE__ */ jsxs("button", { onClick: () => handleTabChange(key), style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.85rem",
          fontWeight: tab === key ? 700 : 400,
          background: tab === key ? "rgba(201,151,58,0.1)" : "transparent",
          color: tab === key ? "var(--gold)" : "var(--text)",
          borderLeft: tab === key ? "3px solid var(--gold)" : "3px solid transparent",
          textAlign: "left",
          transition: "all 0.15s"
        }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1rem" }, children: icon }),
          label,
          key === "movies" && movies.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: movies.length }),
          key === "songs" && movies.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: movies.reduce((a, m) => {
            var _a2, _b;
            return a + (((_b = (_a2 = m.media) == null ? void 0 : _a2.songs) == null ? void 0 : _b.length) || 0);
          }, 0) }),
          key === "cast" && cast.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: cast.length }),
          key === "productions" && prods.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: prods.length }),
          key === "news" && news.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: news.length }),
          key === "enquiries" && unread > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.68rem", background: "#e05555", color: "#fff", padding: "1px 7px", borderRadius: 10, fontWeight: 800 }, children: unread }),
          key === "enquiries" && unread === 0 && enquiries.length > 0 && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", fontSize: "0.7rem", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }, children: enquiries.length })
        ] }, key);
      }) }),
      /* @__PURE__ */ jsx("main", { id: "admin-main", style: { flex: 1, overflowY: "auto", minHeight: 0 }, children: loading ? /* @__PURE__ */ jsx("div", { style: { padding: 28 }, children: /* @__PURE__ */ jsx(Spinner, {}) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        tab === "dashboard" && /* @__PURE__ */ jsxs("div", { style: { padding: "28px 28px 40px" }, children: [
          /* @__PURE__ */ jsx("h2", { style: { marginBottom: 24, fontSize: "1.5rem" }, children: "Dashboard" }),
          /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 32 }, children: [
            ["🎬", "Movies", (stats == null ? void 0 : stats.movies) || movies.length, "movies"],
            ["🎭", "Cast & Crew", (stats == null ? void 0 : stats.cast) || cast.length, "cast"],
            ["🎥", "Productions", (stats == null ? void 0 : stats.productions) || prods.length, "productions"],
            ["📰", "News Articles", (stats == null ? void 0 : stats.news) || news.length, "news"],
            ["✉️", "Enquiries", enquiries.length, "enquiries"]
          ].map(([icon, label, count, key]) => {
            const unread = key === "enquiries" ? enquiries.filter((e) => !e.read).length : 0;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => handleTabChange(key),
                style: { background: "var(--bg2)", border: `1px solid ${unread > 0 ? "rgba(224,85,85,.5)" : "var(--border)"}`, borderRadius: 10, padding: "20px 22px", cursor: "pointer", transition: "border-color 0.15s", position: "relative" },
                onMouseEnter: (e) => e.currentTarget.style.borderColor = "var(--gold)",
                onMouseLeave: (e) => e.currentTarget.style.borderColor = unread > 0 ? "rgba(224,85,85,.5)" : "var(--border)",
                children: [
                  unread > 0 && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: 10, right: 10, background: "#e05555", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "1px 7px", borderRadius: 10 }, children: [
                    unread,
                    " new"
                  ] }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", marginBottom: 8 }, children: icon }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", fontWeight: 900, color: "var(--gold)" }, children: count }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }, children: label })
                ]
              },
              key
            );
          }) }),
          ((_a = stats == null ? void 0 : stats.recentMovies) == null ? void 0 : _a.length) > 0 && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { style: { marginBottom: 14, fontSize: "1rem" }, children: "Recent Movies" }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: stats.recentMovies.map((m) => {
              var _a2;
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }, children: [
                m.posterUrl && /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: m.title, style: { width: 34, height: 48, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: m.title }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)" }, children: ((_a2 = m.productions) == null ? void 0 : _a2.map((p) => p.name).join(", ")) || "—" })
                ] }),
                /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => openMovieDetail(m), children: "Manage" })
              ] }, m._id);
            }) })
          ] })
        ] }),
        tab === "movies" && !detailMovie && (() => {
          const pagedMovies = filteredMovies.slice((moviePage - 1) * PG.movies, moviePage * PG.movies);
          const allIds = filteredMovies.map((m) => m._id);
          const allSel = allIds.length > 0 && allIds.every((id) => selected.has(id));
          return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 40px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 22px", boxShadow: "0 2px 16px rgba(0,0,0,0.45)" }, children: [
              /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.35rem", margin: 0, fontWeight: 800 }, children: "Movies" }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: filteredMovies.length !== movies.length ? `${filteredMovies.length} / ${movies.length}` : `${movies.length} total` }),
              /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
                /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 30, width: 200 }, placeholder: "Search movies…", value: search, onChange: (e) => setQ(e.target.value) })
              ] }),
              /* @__PURE__ */ jsx("button", { className: `btn btn-sm ${selectMode ? "btn-gold" : "btn-outline"}`, onClick: () => {
                setSelectMode((s) => !s);
                setSelected(/* @__PURE__ */ new Set());
              }, children: selectMode ? "✓ Selecting" : "☐ Select" }),
              selectMode && selected.size > 0 && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => handleBulkDelete("movies"), style: { background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }, children: [
                "🗑 Delete ",
                selected.size
              ] }),
              !selectMode && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => openCreate("movie"), children: "+ Add Movie" })
            ] }),
            selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "8px 14px", background: "rgba(201,151,58,0.07)", borderRadius: 10, border: "1px solid rgba(201,151,58,0.2)" }, children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: allSel, onChange: () => allSel ? clearSel() : selectAll(allIds), style: { width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" } }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.82rem", color: "var(--gold)", fontWeight: 600 }, children: selected.size > 0 ? `${selected.size} of ${filteredMovies.length} selected` : `Select all ${filteredMovies.length} movies` }),
              selected.size > 0 && /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: clearSel, style: { marginLeft: "auto", fontSize: "0.72rem" }, children: "Clear" })
            ] }),
            filteredMovies.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎬" }),
              "No movies found."
            ] }) : /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14 }, children: pagedMovies.map((m) => {
              const img = m.posterUrl || m.thumbnailUrl;
              const vc = verdictColor(m.verdict);
              const isSel = selected.has(m._id);
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  style: { position: "relative", borderRadius: 12, overflow: "hidden", background: "var(--bg2)", border: `2px solid ${isSel ? "var(--gold)" : "var(--border)"}`, cursor: "pointer", transition: "transform 0.15s,border-color 0.15s", display: "flex", flexDirection: "column" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    if (!isSel) e.currentTarget.style.borderColor = "rgba(201,151,58,0.6)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    if (!isSel) e.currentTarget.style.borderColor = "var(--border)";
                  },
                  onClick: () => selectMode ? toggleSel(m._id) : openMovieDetail(m),
                  children: [
                    selectMode && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 8, left: 8, zIndex: 10 }, onClick: (e) => {
                      e.stopPropagation();
                      toggleSel(m._id);
                    }, children: /* @__PURE__ */ jsx("div", { style: { width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSel ? "var(--gold)" : "rgba(255,255,255,0.8)"}`, background: isSel ? "var(--gold)" : "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }, children: isSel && /* @__PURE__ */ jsx("span", { style: { color: "#000", fontSize: "0.75rem", fontWeight: 900 }, children: "✓" }) }) }),
                    /* @__PURE__ */ jsxs("div", { style: { position: "relative", aspectRatio: "2/3", background: "var(--bg3)", overflow: "hidden" }, children: [
                      img ? /* @__PURE__ */ jsx("img", { src: img, alt: m.title, style: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }, onError: (e) => e.target.style.display = "none", onMouseEnter: (e) => e.target.style.transform = "scale(1.05)", onMouseLeave: (e) => e.target.style.transform = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }, children: "🎬" }),
                      /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.8) 0%,rgba(0,0,0,0) 55%)" } }),
                      /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 7, right: 7, fontSize: "0.58rem", fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "rgba(0,0,0,0.8)", color: vc, border: `1px solid ${vc}55`, textTransform: "uppercase", letterSpacing: "0.04em" }, children: m.verdict || "Upcoming" }),
                      /* @__PURE__ */ jsxs("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 9px" }, children: [
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.8rem", lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }, children: m.title }),
                        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.63rem", color: "rgba(255,255,255,0.5)", marginTop: 1 }, children: fmtDate(m.releaseDate) })
                      ] })
                    ] }),
                    !selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", borderTop: "1px solid var(--border)" }, onClick: (e) => e.stopPropagation(), children: [
                      [["Manage", () => openMovieDetail(m), "var(--gold)"], ["Edit", () => openEdit("movie", m), "var(--text)"]].map(([lbl, fn, hc]) => /* @__PURE__ */ jsx(
                        "button",
                        {
                          style: { flex: 1, padding: "7px 0", background: "none", border: "none", cursor: "pointer", fontSize: "0.67rem", color: "var(--muted)", borderRight: "1px solid var(--border)", transition: "color 0.1s,background 0.1s" },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.color = hc;
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.color = "var(--muted)";
                            e.currentTarget.style.background = "none";
                          },
                          onClick: fn,
                          children: lbl
                        },
                        lbl
                      )),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          style: { padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: "0.67rem", color: "var(--red)", transition: "background 0.1s" },
                          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(220,50,50,0.12)",
                          onMouseLeave: (e) => e.currentTarget.style.background = "none",
                          onClick: () => handleDelete("movie", m._id, m.title),
                          children: "✕"
                        }
                      )
                    ] })
                  ]
                },
                m._id
              );
            }) }),
            /* @__PURE__ */ jsx(Pagination, { page: moviePage, total: filteredMovies.length, perPage: PG.movies, onChange: setMoviePage })
          ] });
        })(),
        tab === "movies" && detailMovie && /* @__PURE__ */ jsx("div", { style: { padding: "0 28px 40px" }, children: /* @__PURE__ */ jsx(
          AdminMovieDetail,
          {
            movie: detailMovie,
            movies,
            onBack: () => setDetailMovie(null),
            onToast,
            onMovieUpdate: (m) => setMovies((prev) => prev.map((x) => x._id === m._id ? m : x))
          }
        ) }),
        tab === "songs" && (() => {
          const q2 = search.toLowerCase();
          const allRows = [];
          const allRowIds = [];
          movies.forEach((m) => {
            var _a2, _b;
            if (!((_b = (_a2 = m.media) == null ? void 0 : _a2.songs) == null ? void 0 : _b.length)) return;
            const matched = m.media.songs.map((s, i) => ({ ...s, _i: i })).filter(
              (s) => {
                var _a3, _b2, _c;
                return !q2 || ((_a3 = s.title) == null ? void 0 : _a3.toLowerCase().includes(q2)) || ((_b2 = s.singer) == null ? void 0 : _b2.toLowerCase().includes(q2)) || ((_c = m.title) == null ? void 0 : _c.toLowerCase().includes(q2));
              }
            );
            if (!matched.length) return;
            const songIds = matched.map((s) => `${m._id}::${s._i}`);
            const allMovieSel = songIds.every((id) => selected.has(id));
            allRows.push({ m, matched, songIds, allMovieSel });
            allRowIds.push(songIds);
          });
          const allSongIds = allRowIds.flat();
          const pagedRows = allRows.slice((songPage - 1) * PG.songs, songPage * PG.songs);
          return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 40px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 22px", boxShadow: "0 2px 16px rgba(0,0,0,0.45)" }, children: [
              /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.35rem", margin: 0, fontWeight: 800 }, children: "Songs" }),
              /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: [
                allSongIds.length,
                " total"
              ] }),
              /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
                /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 30, width: 200 }, placeholder: "Search songs…", value: search, onChange: (e) => setQ(e.target.value) })
              ] }),
              /* @__PURE__ */ jsx("button", { className: `btn btn-sm ${selectMode ? "btn-gold" : "btn-outline"}`, onClick: () => {
                setSelectMode((s) => !s);
                setSelected(/* @__PURE__ */ new Set());
              }, children: selectMode ? "✓ Selecting" : "☐ Select" }),
              selectMode && selected.size > 0 && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => handleBulkDelete("songs"), style: { background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }, children: [
                "🗑 Delete ",
                selected.size
              ] }),
              !selectMode && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => openCreate("song"), children: "+ Add Song" })
            ] }),
            selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "8px 14px", background: "rgba(201,151,58,0.07)", borderRadius: 10, border: "1px solid rgba(201,151,58,0.2)" }, children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: allSongIds.length > 0 && allSongIds.every((id) => selected.has(id)), onChange: () => {
                const a = allSongIds.every((id) => selected.has(id));
                a ? clearSel() : selectAll(allSongIds);
              }, style: { width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" } }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.82rem", color: "var(--gold)", fontWeight: 600 }, children: selected.size > 0 ? `${selected.size} songs selected` : `Select all ${allSongIds.length} songs` }),
              selected.size > 0 && /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: clearSel, style: { marginLeft: "auto", fontSize: "0.72rem" }, children: "Clear" })
            ] }),
            allRows.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎵" }),
              "No songs found."
            ] }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: pagedRows.map(({ m, matched, songIds, allMovieSel }) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: 4 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg2)", borderRadius: "10px 10px 0 0", border: "1px solid var(--border)", borderBottom: "none" }, children: [
                m.posterUrl ? /* @__PURE__ */ jsx("img", { src: m.posterUrl, alt: m.title, style: { width: 34, height: 48, objectFit: "cover", borderRadius: 4, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: 34, height: 48, background: "var(--bg3)", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }, children: "🎬" }),
                selectMode && /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: allMovieSel,
                    onChange: () => setSelected((prev) => {
                      const n = new Set(prev);
                      songIds.forEach((id) => allMovieSel ? n.delete(id) : n.add(id));
                      return n;
                    }),
                    style: { width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)", flexShrink: 0 }
                  }
                ),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.9rem" }, children: m.title }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 1 }, children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)" }, children: matched.length }),
                    " track",
                    matched.length !== 1 ? "s" : ""
                  ] })
                ] }),
                /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: "0.72rem", opacity: 0.7 }, onClick: () => openMovieDetail(m), children: "Open →" })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderTop: "1px solid rgba(255,255,255,0.05)", borderRadius: "0 0 10px 10px", overflow: "hidden" }, children: matched.map((s, rowIdx) => {
                const thumb = s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : null;
                const songId = `${m._id}::${s._i}`;
                const isSel = selected.has(songId);
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    style: { display: "flex", alignItems: "center", borderBottom: rowIdx < matched.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: isSel ? "rgba(201,151,58,0.08)" : "transparent", cursor: "pointer", transition: "background 0.12s" },
                    onClick: () => selectMode ? toggleSel(songId) : null,
                    onMouseEnter: (e) => {
                      if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                    },
                    onMouseLeave: (e) => {
                      if (!isSel) e.currentTarget.style.background = "transparent";
                    },
                    children: [
                      /* @__PURE__ */ jsx("div", { style: { width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }, children: selectMode ? /* @__PURE__ */ jsx("div", { style: { width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? "var(--gold)" : "rgba(255,255,255,0.25)"}`, background: isSel ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }, onClick: (e) => {
                        e.stopPropagation();
                        toggleSel(songId);
                      }, children: isSel && /* @__PURE__ */ jsx("span", { style: { color: "#000", fontSize: "0.65rem", fontWeight: 900 }, children: "✓" }) }) : rowIdx + 1 }),
                      /* @__PURE__ */ jsx("div", { style: { width: 52, height: 52, flexShrink: 0, overflow: "hidden", position: "relative", background: "var(--bg3)" }, children: thumb ? /* @__PURE__ */ jsx("img", { src: thumb, alt: s.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.opacity = "0.2" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", color: "var(--muted)" }, children: "♪" }) }),
                      /* @__PURE__ */ jsxs("div", { style: { flex: 1, padding: "0 14px", minWidth: 0 }, children: [
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: s.title }),
                        s.singer && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--gold)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: [
                          "🎤 ",
                          s.singer
                        ] }),
                        s.musicDirector && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.65rem", color: "var(--muted)", marginTop: 1 }, children: [
                          "🎼 ",
                          s.musicDirector
                        ] })
                      ] }),
                      !selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4, padding: "0 12px", flexShrink: 0 }, children: [
                        s.ytId && /* @__PURE__ */ jsx("a", { href: `https://youtube.com/watch?v=${s.ytId}`, target: "_blank", rel: "noreferrer", className: "btn btn-ghost btn-sm", style: { fontSize: "0.68rem", padding: "3px 7px" }, onClick: (e) => e.stopPropagation(), children: "YT ↗" }),
                        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: "0.68rem", padding: "3px 7px", color: "var(--red)" }, onClick: (e) => {
                          e.stopPropagation();
                          handleDelete("song", s._i, s.title, m._id);
                        }, children: "✕" })
                      ] })
                    ]
                  },
                  s._i
                );
              }) })
            ] }, m._id)) }),
            /* @__PURE__ */ jsx(Pagination, { page: songPage, total: allRows.length, perPage: PG.songs, onChange: setSongPage })
          ] });
        })(),
        tab === "cast" && (() => {
          const pagedCast = filteredCast.slice((castPage - 1) * PG.cast, castPage * PG.cast);
          return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 40px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 22px", boxShadow: "0 2px 16px rgba(0,0,0,0.45)" }, children: [
              /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.35rem", margin: 0, fontWeight: 800 }, children: "Cast & Crew" }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: filteredCast.length !== cast.length ? `${filteredCast.length} / ${cast.length}` : `${cast.length} total` }),
              /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
                /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 30, width: 200 }, placeholder: "Search cast…", value: search, onChange: (e) => setQ(e.target.value) })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => openCreate("cast"), children: "+ Add Person" })
            ] }),
            filteredCast.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎭" }),
              "No cast found."
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              ["Actor", "Actress", "Director", "Producer", "Music Director", "Singer", "Lyricist", "Cinematographer", "Other"].map((typeLabel) => {
                const group = pagedCast.filter((c) => (c.type || "Other") === typeLabel || typeLabel === "Other" && !["Actor", "Actress", "Director", "Producer", "Music Director", "Singer", "Lyricist", "Cinematographer"].includes(c.type));
                if (!group.length) return null;
                return /* @__PURE__ */ jsxs("div", { style: { marginBottom: 32 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { height: 1, flex: 1, background: "var(--border)" } }),
                    /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", whiteSpace: "nowrap", padding: "0 6px" }, children: [
                      typeLabel,
                      "s — ",
                      group.length
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { height: 1, flex: 1, background: "var(--border)" } })
                  ] }),
                  /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14 }, children: group.map((c) => {
                    const movieCount = movies.filter((m) => {
                      var _a2;
                      return (_a2 = m.cast) == null ? void 0 : _a2.some((mc) => {
                        var _a3;
                        return String(((_a3 = mc.castId) == null ? void 0 : _a3._id) || mc.castId) === String(c._id);
                      });
                    }).length;
                    return /* @__PURE__ */ jsxs(
                      "div",
                      {
                        style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s,transform 0.15s", cursor: "pointer" },
                        onMouseEnter: (e) => {
                          e.currentTarget.style.borderColor = "var(--gold)";
                          e.currentTarget.style.transform = "translateY(-3px)";
                        },
                        onMouseLeave: (e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.transform = "none";
                        },
                        children: [
                          /* @__PURE__ */ jsxs("div", { style: { width: "100%", aspectRatio: "1/1", background: "var(--bg3)", overflow: "hidden", position: "relative" }, children: [
                            c.photo ? /* @__PURE__ */ jsx("img", { src: c.photo, alt: c.name, style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem", color: "var(--muted)" }, children: "👤" }),
                            /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 50%)" } }),
                            /* @__PURE__ */ jsx("div", { style: { position: "absolute", bottom: 8, left: 8 }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, color: "var(--gold)", background: "rgba(0,0,0,0.7)", padding: "2px 7px", borderRadius: 10, border: "1px solid rgba(201,151,58,0.4)" }, children: c.type || "Actor" }) })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { style: { padding: "10px 12px 4px" }, children: [
                            /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.86rem", lineHeight: 1.3, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: c.name }),
                            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "var(--muted)" }, children: movieCount > 0 ? /* @__PURE__ */ jsxs("span", { style: { color: "rgba(201,151,58,0.8)" }, children: [
                              "🎬 ",
                              movieCount,
                              " film",
                              movieCount !== 1 ? "s" : ""
                            ] }) : /* @__PURE__ */ jsx("span", { children: "No films" }) })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { style: { display: "flex", borderTop: "1px solid var(--border)", marginTop: 8 }, children: [
                            /* @__PURE__ */ jsx(
                              "a",
                              {
                                href: `/cast/${c._id}`,
                                target: "_blank",
                                rel: "noreferrer",
                                style: { flex: 1, padding: "7px 0", textAlign: "center", fontSize: "0.67rem", color: "var(--muted)", textDecoration: "none", borderRight: "1px solid var(--border)", transition: "color 0.1s,background 0.1s" },
                                onMouseEnter: (e) => {
                                  e.currentTarget.style.color = "var(--text)";
                                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                                },
                                onMouseLeave: (e) => {
                                  e.currentTarget.style.color = "var(--muted)";
                                  e.currentTarget.style.background = "none";
                                },
                                children: "View"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => openEdit("cast", c),
                                style: { flex: 1, padding: "7px 0", textAlign: "center", fontSize: "0.67rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", borderRight: "1px solid var(--border)", transition: "color 0.1s,background 0.1s" },
                                onMouseEnter: (e) => {
                                  e.currentTarget.style.color = "var(--gold)";
                                  e.currentTarget.style.background = "rgba(201,151,58,0.07)";
                                },
                                onMouseLeave: (e) => {
                                  e.currentTarget.style.color = "var(--muted)";
                                  e.currentTarget.style.background = "none";
                                },
                                children: "Edit"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => handleDelete("cast", c._id, c.name),
                                style: { flex: 1, padding: "7px 0", textAlign: "center", fontSize: "0.67rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", transition: "color 0.1s,background 0.1s" },
                                onMouseEnter: (e) => {
                                  e.currentTarget.style.color = "var(--red)";
                                  e.currentTarget.style.background = "rgba(220,50,50,0.07)";
                                },
                                onMouseLeave: (e) => {
                                  e.currentTarget.style.color = "var(--muted)";
                                  e.currentTarget.style.background = "none";
                                },
                                children: "Del"
                              }
                            )
                          ] })
                        ]
                      },
                      c._id
                    );
                  }) })
                ] }, typeLabel);
              }),
              /* @__PURE__ */ jsx(Pagination, { page: castPage, total: filteredCast.length, perPage: PG.cast, onChange: setCastPage })
            ] })
          ] });
        })(),
        tab === "productions" && (() => {
          const pagedProds = filteredProds.slice((prodPage - 1) * PG.prods, prodPage * PG.prods);
          return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 40px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 22px", boxShadow: "0 2px 16px rgba(0,0,0,0.45)" }, children: [
              /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.35rem", margin: 0, fontWeight: 800 }, children: "Productions" }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: filteredProds.length !== prods.length ? `${filteredProds.length} / ${prods.length}` : `${prods.length} total` }),
              /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
                /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 30, width: 200 }, placeholder: "Search productions…", value: search, onChange: (e) => setQ(e.target.value) })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => openCreate("production"), children: "+ Add Production" })
            ] }),
            filteredProds.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎥" }),
              "No productions found."
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }, children: pagedProds.map((p) => {
                const filmCount = movies.filter((m) => {
                  var _a2;
                  return (_a2 = m.productions) == null ? void 0 : _a2.some((pr) => String(pr._id || pr) === String(p._id));
                }).length;
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", transition: "transform 0.15s,border-color 0.15s" },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "rgba(201,151,58,0.5)";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "var(--border)";
                    },
                    children: [
                      /* @__PURE__ */ jsxs("div", { style: { height: 72, background: "linear-gradient(135deg,rgba(201,151,58,0.12),rgba(201,151,58,0.03))", position: "relative", overflow: "hidden" }, children: [
                        p.banner && /* @__PURE__ */ jsx("img", { src: p.banner, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", opacity: 0.25 }, onError: (e) => e.target.style.display = "none" }),
                        /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,151,58,0.4)" }, children: "Production House" }) })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { style: { padding: "0 16px 16px", marginTop: -22, position: "relative" }, children: [
                        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 10 }, children: [
                          /* @__PURE__ */ jsx("div", { style: { width: 46, height: 46, background: "var(--bg3)", borderRadius: 10, border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }, children: p.logo ? /* @__PURE__ */ jsx("img", { src: p.logo, alt: p.name, style: { width: "100%", height: "100%", objectFit: "contain" }, onError: (e) => e.target.style.display = "none" }) : "🎥" }),
                          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0, paddingBottom: 2 }, children: [
                            /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.94rem", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: p.name }),
                            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: [
                              p.founded && `Est. ${p.founded}`,
                              p.founded && p.location && " · ",
                              p.location
                            ] })
                          ] })
                        ] }),
                        p.bio && /* @__PURE__ */ jsx("p", { style: { fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }, children: p.bio }),
                        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }, children: [
                          /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "rgba(201,151,58,0.9)", fontWeight: 700 }, children: [
                            "🎬 ",
                            filmCount,
                            " film",
                            filmCount !== 1 ? "s" : ""
                          ] }),
                          p.website && /* @__PURE__ */ jsx("a", { href: p.website, target: "_blank", rel: "noreferrer", style: { fontSize: "0.68rem", color: "var(--muted)", textDecoration: "none" }, onMouseEnter: (e) => e.currentTarget.style.color = "var(--gold)", onMouseLeave: (e) => e.currentTarget.style.color = "var(--muted)", children: "Website ↗" })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }, children: [
                          /* @__PURE__ */ jsx(
                            "a",
                            {
                              href: `/production/${p._id}`,
                              target: "_blank",
                              rel: "noreferrer",
                              style: { flex: 1, textAlign: "center", padding: "7px 0", background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)", borderRadius: 8, fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600, transition: "background 0.12s" },
                              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.18)",
                              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.08)",
                              children: "View ↗"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              style: { flex: 1, padding: "7px 0", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.72rem", color: "var(--text)", cursor: "pointer", transition: "border-color 0.12s" },
                              onMouseEnter: (e) => e.currentTarget.style.borderColor = "var(--gold)",
                              onMouseLeave: (e) => e.currentTarget.style.borderColor = "var(--border)",
                              onClick: () => openEdit("production", p),
                              children: "Edit"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              style: { padding: "7px 12px", background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.2)", borderRadius: 8, fontSize: "0.72rem", color: "var(--red)", cursor: "pointer", transition: "background 0.12s" },
                              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(220,50,50,0.18)",
                              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(220,50,50,0.07)",
                              onClick: () => handleDelete("production", p._id, p.name),
                              children: "✕"
                            }
                          )
                        ] })
                      ] })
                    ]
                  },
                  p._id
                );
              }) }),
              /* @__PURE__ */ jsx(Pagination, { page: prodPage, total: filteredProds.length, perPage: PG.prods, onChange: setProdPage })
            ] })
          ] });
        })(),
        tab === "news" && (() => {
          const pagedNews = filteredNews.slice((newsPage - 1) * PG.news, newsPage * PG.news);
          const allNewsIds = filteredNews.map((n) => n._id);
          const allNewsSel = allNewsIds.length > 0 && allNewsIds.every((id) => selected.has(id));
          return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 40px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 22px", boxShadow: "0 2px 16px rgba(0,0,0,0.45)" }, children: [
              /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.35rem", margin: 0, fontWeight: 800 }, children: "News" }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }, children: filteredNews.length !== news.length ? `${filteredNews.length} / ${news.length}` : `${news.length} total` }),
              /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
                /* @__PURE__ */ jsx("input", { className: "form-input", style: { paddingLeft: 30, width: 200 }, placeholder: "Search news…", value: search, onChange: (e) => setQ(e.target.value) })
              ] }),
              /* @__PURE__ */ jsx("button", { className: `btn btn-sm ${selectMode ? "btn-gold" : "btn-outline"}`, onClick: () => {
                setSelectMode((s) => !s);
                setSelected(/* @__PURE__ */ new Set());
              }, children: selectMode ? "✓ Selecting" : "☐ Select" }),
              selectMode && selected.size > 0 && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => handleBulkDelete("news"), style: { background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }, children: [
                "🗑 Delete ",
                selected.size
              ] }),
              !selectMode && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => openCreate("news"), children: "+ Add Article" })
            ] }),
            selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "8px 14px", background: "rgba(201,151,58,0.07)", borderRadius: 10, border: "1px solid rgba(201,151,58,0.2)" }, children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: allNewsSel, onChange: () => allNewsSel ? clearSel() : selectAll(allNewsIds), style: { width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" } }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.82rem", color: "var(--gold)", fontWeight: 600 }, children: selected.size > 0 ? `${selected.size} of ${filteredNews.length} selected` : `Select all ${filteredNews.length} articles` }),
              selected.size > 0 && /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: clearSel, style: { marginLeft: "auto", fontSize: "0.72rem" }, children: "Clear" })
            ] }),
            filteredNews.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "📰" }),
              "No news found."
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }, children: pagedNews.map((n) => {
                const isSel = selected.has(n._id);
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    style: { background: "var(--bg2)", border: `2px solid ${isSel ? "var(--gold)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden", cursor: selectMode ? "pointer" : "default", transition: "transform 0.15s,border-color 0.15s" },
                    onClick: () => selectMode && toggleSel(n._id),
                    onMouseEnter: (e) => {
                      if (!selectMode) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "rgba(201,151,58,0.45)";
                      }
                    },
                    onMouseLeave: (e) => {
                      if (!selectMode) {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.borderColor = isSel ? "var(--gold)" : "var(--border)";
                      }
                    },
                    children: [
                      n.imageUrl && /* @__PURE__ */ jsxs("div", { style: { height: 130, overflow: "hidden", position: "relative", background: "var(--bg3)" }, children: [
                        /* @__PURE__ */ jsx("img", { src: n.imageUrl, alt: n.title, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }),
                        /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.75),transparent)" } }),
                        selectMode && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 10, left: 10 }, onClick: (e) => {
                          e.stopPropagation();
                          toggleSel(n._id);
                        }, children: /* @__PURE__ */ jsx("div", { style: { width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSel ? "var(--gold)" : "rgba(255,255,255,0.8)"}`, background: isSel ? "var(--gold)" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }, children: isSel && /* @__PURE__ */ jsx("span", { style: { color: "#000", fontSize: "0.75rem", fontWeight: 900 }, children: "✓" }) }) }),
                        /* @__PURE__ */ jsxs("div", { style: { position: "absolute", bottom: 8, left: 10, right: 10, display: "flex", gap: 6, alignItems: "center" }, children: [
                          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(201,151,58,0.9)", color: "#000", textTransform: "uppercase", letterSpacing: "0.06em" }, children: n.category || "Update" }),
                          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.62rem", fontWeight: 700, color: n.published ? "#4caf82" : "#e8876a" }, children: n.published ? "● Live" : "○ Draft" })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { style: { padding: "12px 14px" }, children: [
                        !n.imageUrl && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }, children: [
                          selectMode && /* @__PURE__ */ jsx("div", { style: { width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSel ? "var(--gold)" : "rgba(255,255,255,0.3)"}`, background: isSel ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }, onClick: (e) => {
                            e.stopPropagation();
                            toggleSel(n._id);
                          }, children: isSel && /* @__PURE__ */ jsx("span", { style: { color: "#000", fontSize: "0.65rem", fontWeight: 900 }, children: "✓" }) }),
                          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }, children: n.category || "Update" }),
                          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.62rem", fontWeight: 700, color: n.published ? "#4caf82" : "#e8876a", marginLeft: "auto" }, children: n.published ? "● Live" : "○ Draft" })
                        ] }),
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.4, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }, children: n.title }),
                        n.movieTitle && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--gold)", marginBottom: 4 }, children: [
                          "🎬 ",
                          n.movieTitle
                        ] }),
                        n.content && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10 }, children: n.content }),
                        !selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 10 }, children: [
                          /* @__PURE__ */ jsx(
                            "a",
                            {
                              href: `/news/${n._id}`,
                              target: "_blank",
                              rel: "noreferrer",
                              style: { flex: 1, textAlign: "center", padding: "6px 0", fontSize: "0.7rem", color: "var(--muted)", textDecoration: "none", background: "var(--bg3)", borderRadius: 7, transition: "color 0.1s" },
                              onMouseEnter: (e) => e.currentTarget.style.color = "var(--text)",
                              onMouseLeave: (e) => e.currentTarget.style.color = "var(--muted)",
                              children: "View ↗"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              style: { flex: 1, padding: "6px 0", fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", border: "none", borderRadius: 7, cursor: "pointer", transition: "color 0.1s" },
                              onMouseEnter: (e) => e.currentTarget.style.color = "var(--gold)",
                              onMouseLeave: (e) => e.currentTarget.style.color = "var(--muted)",
                              onClick: (e) => {
                                e.stopPropagation();
                                openEdit("news", n);
                              },
                              children: "Edit"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              style: { padding: "6px 12px", fontSize: "0.7rem", color: "var(--red)", background: "rgba(220,50,50,0.07)", border: "none", borderRadius: 7, cursor: "pointer", transition: "background 0.1s" },
                              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(220,50,50,0.18)",
                              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(220,50,50,0.07)",
                              onClick: (e) => {
                                e.stopPropagation();
                                handleDelete("news", n._id, n.title);
                              },
                              children: "✕"
                            }
                          )
                        ] })
                      ] })
                    ]
                  },
                  n._id
                );
              }) }),
              /* @__PURE__ */ jsx(Pagination, { page: newsPage, total: filteredNews.length, perPage: PG.news, onChange: setNewsPage })
            ] })
          ] });
        })(),
        tab === "enquiries" && /* @__PURE__ */ jsx(
          EnquiriesPanel,
          {
            enquiries,
            setEnquiries,
            onToast,
            setConfirm
          }
        ),
        tab === "settings" && /* @__PURE__ */ jsx("div", { style: { padding: 28 }, children: /* @__PURE__ */ jsx(AdminSettings, { admin, onToast }) })
      ] }) })
    ] }),
    modal && /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && closeModal(), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: modal.type === "movie" ? 780 : 540, maxHeight: "90vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsx("span", { className: "modal-title", children: modal.type === "movie" ? modal.mode === "create" ? "+ Add New Movie" : "✏️ Edit Movie" : modal.type === "cast" ? modal.mode === "create" ? "+ Add Cast / Crew" : "✏️ Edit Cast Member" : modal.type === "production" ? modal.mode === "create" ? "+ Add Production House" : "✏️ Edit Production" : modal.type === "song" ? modal.mode === "edit" ? "✏️ Edit Song" : "🎵 Add New Song" : modal.mode === "create" ? "+ Add News Article" : "✏️ Edit Article" }),
        /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: closeModal, children: "×" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { padding: "20px 0 4px" }, children: [
        modal.type === "movie" && /* @__PURE__ */ jsx(MovieForm, { initial: modal.data, onSave: handleSaveMovie, onCancel: closeModal, saving }),
        modal.type === "cast" && /* @__PURE__ */ jsx(CastForm, { initial: modal.data, onSave: handleSaveCast, onCancel: closeModal, saving }),
        modal.type === "production" && /* @__PURE__ */ jsx(ProductionForm, { initial: modal.data, onSave: handleSaveProd, onCancel: closeModal, saving }),
        modal.type === "news" && /* @__PURE__ */ jsx(NewsForm, { initial: modal.data, onSave: handleSaveNews, onCancel: closeModal, saving, movies }),
        modal.type === "song" && /* @__PURE__ */ jsx(
          SongForm,
          {
            onSave: handleSaveSong,
            onCancel: closeModal,
            saving,
            movies,
            preselectedMovieId: modal.mode === "edit" ? modal.movieId : void 0,
            initial: modal.mode === "edit" ? modal.data : null,
            isEdit: modal.mode === "edit",
            songIndex: modal.mode === "edit" ? modal.songIndex : void 0
          }
        )
      ] })
    ] }) }),
    confirm && /* @__PURE__ */ jsx(ConfirmModal, { message: confirm.message, onConfirm: confirm.onConfirm, onCancel: () => setConfirm(null) })
  ] });
}
function AdminLogin({ onSuccess, onToast }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [hasAdmin, setHasAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secret, setSecret] = useState("");
  useEffect(() => {
    API.adminSetupStatus().then(({ hasAdmin: hasAdmin2 }) => {
      setHasAdmin(hasAdmin2);
      setMode(hasAdmin2 ? "login" : "register");
    }).catch(() => {
      setHasAdmin(true);
      setMode("login");
    });
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (mode === "register") {
      if (password.length < 8) {
        onToast == null ? void 0 : onToast("Password must be at least 8 characters", "error");
        return;
      }
      if (password !== confirm) {
        onToast == null ? void 0 : onToast("Passwords do not match", "error");
        return;
      }
      if (!email.trim()) {
        onToast == null ? void 0 : onToast("Email is required", "error");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { token, admin } = await API.adminLogin(username.trim(), password);
        onSuccess == null ? void 0 : onSuccess(admin, token);
        onToast == null ? void 0 : onToast(`Welcome back, ${admin.username}!`, "success");
        navigate("/admin");
      } else {
        const { token, admin } = await API.adminRegister(username.trim(), email.trim(), password, secret);
        onSuccess == null ? void 0 : onSuccess(admin, token);
        onToast == null ? void 0 : onToast(`Admin account created! Welcome, ${admin.username}!`, "success");
        navigate("/admin");
      }
    } catch (err) {
      onToast == null ? void 0 : onToast(err.message || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };
  const isRegister = mode === "register";
  return /* @__PURE__ */ jsx("div", { style: {
    minHeight: "100vh",
    background: "var(--bg1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }, children: /* @__PURE__ */ jsxs("div", { style: {
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420
  }, children: [
    /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", marginBottom: 28 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "1.6rem", color: "var(--gold)", letterSpacing: "0.1em" }, children: [
        "OLLI",
        /* @__PURE__ */ jsx("span", { style: { color: "var(--text)" }, children: "PEDIA" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: 6, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }, children: "Admin Portal" })
    ] }),
    hasAdmin && /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 0, marginBottom: 28, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }, children: ["login", "register"].map((m) => /* @__PURE__ */ jsx("button", { onClick: () => setMode(m), style: {
      flex: 1,
      padding: "9px 0",
      background: mode === m ? "var(--gold)" : "transparent",
      color: mode === m ? "#000" : "var(--muted)",
      border: "none",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: "0.78rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      transition: "all 0.2s"
    }, children: m === "login" ? "Sign In" : "Register" }, m)) }),
    !hasAdmin && hasAdmin !== null && /* @__PURE__ */ jsx("div", { style: {
      background: "rgba(255,200,60,0.12)",
      border: "1px solid var(--gold)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 22,
      fontSize: "0.78rem",
      color: "var(--gold)",
      lineHeight: 1.5
    }, children: "👋 No admin account found. Create the first admin account below." }),
    hasAdmin === null ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", color: "var(--muted)", padding: "32px 0" }, children: "Checking setup…" }) : /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Username" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            value: username,
            onChange: (e) => setUsername(e.target.value),
            autoFocus: true,
            autoComplete: "username",
            placeholder: "admin"
          }
        )
      ] }),
      isRegister && /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            autoComplete: "email",
            placeholder: "admin@example.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            autoComplete: isRegister ? "new-password" : "current-password",
            placeholder: isRegister ? "Min. 8 characters" : "••••••••"
          }
        )
      ] }),
      isRegister && /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { className: "form-label", children: "Confirm Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "password",
            value: confirm,
            onChange: (e) => setConfirm(e.target.value),
            autoComplete: "new-password",
            placeholder: "Re-enter password"
          }
        )
      ] }),
      isRegister && hasAdmin && /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxs("label", { className: "form-label", style: { display: "flex", alignItems: "center", gap: 6 }, children: [
          "Register Secret",
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.68rem", color: "var(--muted)", fontWeight: 400 }, children: "(required — set ADMIN_REGISTER_SECRET in .env)" })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            type: "password",
            value: secret,
            onChange: (e) => setSecret(e.target.value),
            placeholder: "Enter register secret"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          className: "btn btn-gold",
          style: { width: "100%", marginTop: 8 },
          disabled: loading || !username.trim() || !password.trim(),
          children: loading ? isRegister ? "Creating account…" : "Logging in…" : isRegister ? "Create Admin Account →" : "Login →"
        }
      )
    ] }),
    mode === "login" && /* @__PURE__ */ jsx("p", { style: { marginTop: 20, fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }, children: "Admin accounts are stored securely in your database." })
  ] }) });
}
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType === "POP") return;
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);
  return null;
}
function AppInner({
  production,
  setProduction,
  castMember,
  setCastMember,
  admin,
  setAdmin
}) {
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState(null);
  const isProdPortal = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/portal");
  const isCastPortal = location.pathname.startsWith("/cast-portal");
  const isAdminPortal = location.pathname.startsWith("/admin");
  const isAnyPortal = isProdPortal || isCastPortal || isAdminPortal;
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const handleProdAuth = (prod, token) => {
    setProduction(prod);
    setToken(token);
    if (typeof window !== "undefined") {
      localStorage.setItem("op_prod", JSON.stringify(prod));
    }
  };
  const handleProdLogout = () => {
    setProduction(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("op_prod");
    }
  };
  const handleCastAuth = (m, token) => {
    setCastMember(m);
    setCastToken(token);
    if (typeof window !== "undefined") {
      localStorage.setItem("cm_member", JSON.stringify(m));
    }
  };
  const handleCastLogout = () => {
    setCastMember(null);
    setCastToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cm_member");
      localStorage.removeItem("cm_token");
    }
  };
  const handleAdminAuth = (a, token) => {
    setAdmin(a);
    setAdminToken(token);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_user", JSON.stringify(a));
    }
  };
  const handleAdminLogout = () => {
    setAdmin(null);
    setAdminToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_user");
      localStorage.removeItem("admin_token");
    }
  };
  const updateProduction = (p) => {
    setProduction(p);
    if (typeof window !== "undefined") {
      localStorage.setItem("op_prod", JSON.stringify(p));
    }
  };
  const updateCastMember = (m) => {
    setCastMember(m);
    if (typeof window !== "undefined") {
      localStorage.setItem("cm_member", JSON.stringify(m));
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(ScrollToTop, {}),
    !isAnyPortal && /* @__PURE__ */ jsx(
      Navbar,
      {
        production,
        castMember,
        onLoginClick: () => setShowLogin(true),
        onLogout: handleProdLogout,
        onCastLogout: handleCastLogout
      }
    ),
    /* @__PURE__ */ jsxs(Routes, { children: [
      /* @__PURE__ */ jsx(Route, { path: "/", element: /* @__PURE__ */ jsx(Home$1, { production }) }),
      /* @__PURE__ */ jsx(Route, { path: "/movies", element: /* @__PURE__ */ jsx(Movies, {}) }),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/movie/:slug",
          element: /* @__PURE__ */ jsx(MovieDetails, { production, onToast: showToast })
        }
      ),
      /* @__PURE__ */ jsx(Route, { path: "/cast", element: /* @__PURE__ */ jsx(Cast, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/cast/:slug", element: /* @__PURE__ */ jsx(CastProfile, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/cast/:slug/:nameSlug", element: /* @__PURE__ */ jsx(CastProfile, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/songs", element: /* @__PURE__ */ jsx(AllSongs, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/news", element: /* @__PURE__ */ jsx(News, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/news/:id", element: /* @__PURE__ */ jsx(NewsDetail, {}) }),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/production/:id",
          element: /* @__PURE__ */ jsx(ProductionProfile, { production })
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/register",
          element: /* @__PURE__ */ jsx(
            Register,
            {
              onSuccess: (p, t) => handleProdAuth(p, t),
              onToast: showToast
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/cast-register",
          element: /* @__PURE__ */ jsx(
            CastRegister,
            {
              onSuccess: (m, t) => handleCastAuth(m, t),
              onToast: showToast
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(Route, { path: "/about", element: /* @__PURE__ */ jsx(AboutUs, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/contact", element: /* @__PURE__ */ jsx(ContactUs, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/privacy", element: /* @__PURE__ */ jsx(PrivacyPolicy, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "/privacy-policy", element: /* @__PURE__ */ jsx(PrivacyPolicy, {}) }),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/song/:movieSlug/:songIndex",
          element: /* @__PURE__ */ jsx(SongDetail, {})
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/song/:movieSlug/:songIndex/:songSlug",
          element: /* @__PURE__ */ jsx(SongDetail, {})
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/dashboard",
          element: /* @__PURE__ */ jsx(
            Home,
            {
              production,
              onToast: showToast,
              onLogout: handleProdLogout,
              onProductionUpdate: updateProduction
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/dashboard/add-movie",
          element: /* @__PURE__ */ jsx(AddMovie, { production, onToast: showToast })
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/portal/movie/:id",
          element: /* @__PURE__ */ jsx(
            PortalMovieDetails,
            {
              production,
              onToast: showToast
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/portal/cast/:id",
          element: /* @__PURE__ */ jsx(PortalCastProfile, { production })
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/cast-portal",
          element: /* @__PURE__ */ jsx(
            CastPortal,
            {
              castMember,
              onToast: showToast,
              onLogout: handleCastLogout,
              onUpdate: updateCastMember
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/admin/login",
          element: /* @__PURE__ */ jsx(AdminLogin, { onSuccess: handleAdminAuth, onToast: showToast })
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/admin/*",
          element: /* @__PURE__ */ jsx(
            AdminPortal,
            {
              admin,
              onLogout: handleAdminLogout,
              onToast: showToast
            }
          )
        }
      )
    ] }),
    !isAnyPortal && /* @__PURE__ */ jsx(Footer, {}),
    showLogin && /* @__PURE__ */ jsx(
      LoginModal,
      {
        onClose: () => setShowLogin(false),
        onSuccess: (prod, token) => {
          handleProdAuth(prod, token);
          setShowLogin(false);
          showToast(`Welcome back, ${prod.name}!`);
        },
        onCastSuccess: (member, token) => {
          handleCastAuth(member, token);
          setShowLogin(false);
          showToast(`Welcome, ${member.name}!`);
        }
      }
    ),
    toast && /* @__PURE__ */ jsx(
      Toast,
      {
        message: toast.message,
        type: toast.type,
        onClose: () => setToast(null)
      }
    )
  ] });
}
function App() {
  const [production, setProduction] = useState(null);
  const [castMember, setCastMember] = useState(null);
  const [admin, setAdmin] = useState(null);
  useEffect(() => {
    try {
      const prod = localStorage.getItem("op_prod");
      const cast = localStorage.getItem("cm_member");
      const adm = localStorage.getItem("admin_user");
      if (prod) setProduction(JSON.parse(prod));
      if (cast) setCastMember(JSON.parse(cast));
      if (adm) setAdmin(JSON.parse(adm));
    } catch {
    }
  }, []);
  return /* @__PURE__ */ jsx(
    AppInner,
    {
      production,
      setProduction,
      castMember,
      setCastMember,
      admin,
      setAdmin
    }
  );
}
function render(url, helmetContext) {
  return renderToString(
    /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx(HelmetProvider, { context: helmetContext, children: /* @__PURE__ */ jsx(StaticRouter, { location: url, children: /* @__PURE__ */ jsx(App, {}) }) }) })
  );
}
export {
  render
};
