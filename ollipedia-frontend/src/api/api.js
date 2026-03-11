// ─────────────────────────────────────────────────────────────────
//  api.js  —  Drop this file into your src/ folder
//  Replace the DB object in ollipedia-full.jsx with this
// ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ── Production token
let _token = (() => { try { return localStorage.getItem("op_token"); } catch { return null; } })();
export const setToken = (t) => {
  _token = t;
  try { t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token"); } catch {}
};
export const getToken = () => _token;

// ── Cast member token
let _castToken = (() => { try { return localStorage.getItem("cm_token"); } catch { return null; } })();
export const setCastToken = (t) => {
  _castToken = t;
  try { t ? localStorage.setItem("cm_token", t) : localStorage.removeItem("cm_token"); } catch {}
};
export const getCastToken = () => _castToken;

// ── Request helpers
const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};

const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const get  = (path, token)        => req("GET",    path, undefined, token);
const post = (path, body, token)  => req("POST",   path, body,      token);
const patch= (path, body, token)  => req("PATCH",  path, body,      token);
const del  = (path, token)        => req("DELETE", path, undefined, token);

export const API = {
  // ── Public
  getMovies:         ()         => get("/movies"),
  getMovie:          (id)       => get(`/movies/${id}`),
  getCast:           ()         => get("/cast"),
  searchCast:        (q)        => get(`/cast/search/${encodeURIComponent(q)}`),
  getCastMember:     (id)       => get(`/cast/${id}`),
  getNews:           ()         => get("/news"),
  getNewsItem:       (id)       => get(`/news/${id}`),
  getSongs:          ()         => get("/songs"),
  postReview:        (id, body) => post(`/movies/${id}/reviews`, body),
  getProductions:    ()         => get("/productions"),
  getProduction:     (id)       => get(`/productions/${id}`),
  searchProductions: (q)        => get(`/productions/search/${encodeURIComponent(q)}`),
  getProductionMovies:(id)      => get(`/productions/${id}/movies`),

  // ── Production auth
  register:      (body)        => post("/auth/register", body),
  login:         (email, pw)   => post("/auth/login", { email, password: pw }),
  updateProfile: (body)        => patch("/productions/me", body, _token),

  // ── Cast member auth
  castRegister:  (body)        => post("/cast-auth/register", body),
  castLogin:     (email, pw)   => post("/cast-auth/login", { email, password: pw }),
  castGetMe:     ()            => get("/cast-auth/me", _castToken),
  castUpdateMe:  (body)        => patch("/cast-auth/me", body, _castToken),

  // ── Movie management (production token required)
  createMovie:         (body)      => post("/movies", body, _token),
  updateMovie:         (id, body)  => patch(`/movies/${id}`, body, _token),
  updateBoxOffice:     (id, body)  => patch(`/movies/${id}/boxoffice`, body, _token),
  addCastToMovie:      (id, data)  => post(`/movies/${id}/cast`, data, _token),
  removeCastFromMovie: (id, castId)=> del(`/movies/${id}/cast/${castId}`, _token),
  addSong:             (id, song)  => post(`/movies/${id}/songs`, song, _token),
  removeSong:          (id, idx)   => del(`/movies/${id}/songs/${idx}`, _token),
  updateTrailer:       (id, data)  => patch(`/movies/${id}/trailer`, data, _token),
  addCollaborator:     (id, pid)   => post(`/movies/${id}/collaborators`, { productionId: pid }, _token),
  addNews:             (id, body)  => post(`/movies/${id}/news`, body, _token),
  editNews:            (nid, body) => patch(`/news/${nid}`, body, _token),
  deleteNews:          (nid)       => del(`/news/${nid}`, _token),
};

// ─────────────────────────────────────────────────────────────────
//  HOW TO USE in your React components:
//
//  import { API, setToken, getToken } from "./api";
//
//  // Load all movies
//  const movies = await API.getMovies();
//
//  // Register a movie
//  const { token, movie } = await API.register({ email, password, title, ... });
//  setToken(token);
//
//  // Login
//  const { token, movie } = await API.login(email, password);
//  setToken(token);
//
//  // Update box office (owner only)
//  await API.updateBoxOffice(movieId, { opening, firstWeek, total, verdict });
//
//  // Add news (owner only)
//  await API.addNews(movieId, { title, content, category, imageUrl });
// ─────────────────────────────────────────────────────────────────