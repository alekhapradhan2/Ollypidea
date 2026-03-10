const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ── Token management ──
let _token = (() => { try { return localStorage.getItem("op_token"); } catch { return null; } })();
export const setToken = (t) => {
  _token = t;
  try { t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token"); } catch {}
};
export const getToken = () => _token;

// ── Helpers ──
const json = (res) => {
  if (!res.ok) return res.json().then(d => Promise.reject(d.error || "Request failed"));
  return res.json();
};
const get  = (path) => fetch(`${BASE}${path}`).then(json);
const post = (path, body, auth = false) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth && _token ? { Authorization: `Bearer ${_token}` } : {}) },
    body: JSON.stringify(body),
  }).then(json);
const patch = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
    body: JSON.stringify(body),
  }).then(json);
const del = (path) =>
  fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${_token}` },
  }).then(json);

export const API = {
  // ── Auth ──
  register:  (body)       => post("/auth/register", body),
  login:     (email, pw)  => post("/auth/login", { email, password: pw }),

  // ── Productions ──
  getProductions:      ()   => get("/productions"),
  getProduction:       (id) => get(`/productions/${id}`),
  searchProductions:   (q)  => get(`/productions/search/${encodeURIComponent(q)}`),
  getProductionMovies: (id) => get(`/productions/${id}/movies`),
  updateProfile:       (body) => patch("/productions/me", body),

  // ── Movies (public) ──
  getMovies:  ()    => get("/movies"),
  getMovie:   (id)  => get(`/movies/${id}`),
  getNews:    ()    => get("/news"),
  getNewsItem: (id)  => get(`/news/${id}`),
  getSongs:   ()    => get("/songs"),
  postReview: (id, body) => post(`/movies/${id}/reviews`, body),

  // ── Cast (public) ──
  getCast:       ()    => get("/cast"),
  searchCast:    (q)   => get(`/cast/search/${encodeURIComponent(q)}`),
  getCastMember: (id)  => get(`/cast/${id}`),

  // ── Movie management (protected) ──
  createMovie:     (body)     => post("/movies", body, true),
  updateMovie:     (id, body) => patch(`/movies/${id}`, body),
  updateBoxOffice: (id, body) => patch(`/movies/${id}/boxoffice`, body),

  // Cast management — owner only
  addCastToMovie:      (id, castData)  => post(`/movies/${id}/cast`, castData, true),
  removeCastFromMovie: (id, castId)    => del(`/movies/${id}/cast/${castId}`),

  // Media management — owner only
  addSong:        (id, song)  => post(`/movies/${id}/songs`, song, true),
  removeSong:     (id, index) => del(`/movies/${id}/songs/${index}`),
  updateTrailer:  (id, data)  => patch(`/movies/${id}/trailer`, data),

  // Collaborators — owner only
  addCollaborator: (id, pid)  => post(`/movies/${id}/collaborators`, { productionId: pid }, true),

  // News — owner + collabs
  addNews:    (id, body)    => post(`/movies/${id}/news`, body, true),
  editNews:   (newsId, body) => patch(`/news/${newsId}`, body),
  deleteNews: (newsId)      => del(`/news/${newsId}`),
};