// ─────────────────────────────────────────────────────────────────
//  api.js  —  Drop this file into your src/ folder
//  Replace the DB object in ollipedia-full.jsx with this
// ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Store JWT token in memory (or localStorage in a real app)
let _token = localStorage.getItem("op_token") || null;
export const setToken = (t) => { _token = t; if (t) localStorage.setItem("op_token", t); else localStorage.removeItem("op_token"); };
export const getToken = () => _token;

const headers = (auth = false) => ({
  "Content-Type": "application/json",
  ...(auth && _token ? { Authorization: `Bearer ${_token}` } : {}),
});

const req = async (method, path, body, auth = false) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(auth),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ── PUBLIC ──
export const API = {
  getMovies:  ()          => req("GET",  "/movies"),
  getMovie:   (id)        => req("GET",  `/movies/${id}`),
  getCast:    ()          => req("GET",  "/cast"),
  getCastOne: (id)        => req("GET",  `/cast/${id}`),
  getNews:    ()          => req("GET",  "/news"),
  getSongs:   ()          => req("GET",  "/songs"),
  postReview: (id, body)  => req("POST", `/movies/${id}/reviews`, body),

  // ── AUTH ──
  register: (body)        => req("POST", "/register", body),
  login:    (email, pw)   => req("POST", "/login", { email, password: pw }),

  // ── PROTECTED (need token) ──
  updateBoxOffice: (id, body) => req("PATCH", `/movies/${id}/boxoffice`, body, true),
  updateCast:      (id, cast) => req("PATCH", `/movies/${id}/cast`, { cast }, true),
  updateMedia:     (id, media)=> req("PATCH", `/movies/${id}/media`, { media }, true),
  addNews:         (id, body) => req("POST",  `/movies/${id}/news`, body, true),
  createCast:      (body)     => req("POST",  "/cast", body, true),
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
