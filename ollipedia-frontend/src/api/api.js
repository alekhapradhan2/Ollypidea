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

export const API = {
  // ── Auth ──
  register:  (body)        => post("/auth/register", body),
  login:     (email, pw)   => post("/auth/login", { email, password: pw }),

  // ── Productions (public) ──
  getProductions:       ()    => get("/productions"),
  getProduction:        (id)  => get(`/productions/${id}`),
  searchProductions:    (q)   => get(`/productions/search/${encodeURIComponent(q)}`),
  getProductionMovies:  (id)  => get(`/productions/${id}/movies`),

  // ── Movies (public) ──
  getMovies:    ()    => get("/movies"),
  getMovie:     (id)  => get(`/movies/${id}`),
  getNews:      ()    => get("/news"),
  getSongs:     ()    => get("/songs"),
  getCast:      ()    => get("/cast"),
  searchCast:   (q)   => get(`/cast/search/${encodeURIComponent(q)}`),
  postReview:   (id, body) => post(`/movies/${id}/reviews`, body),

  // ── Protected ──
  createMovie:        (body)        => post("/movies", body, true),
  updateMovie:        (id, body)    => patch(`/movies/${id}`, body),
  updateBoxOffice:    (id, body)    => patch(`/movies/${id}/boxoffice`, body),
  updateCast:         (id, cast)    => patch(`/movies/${id}/cast`, { cast }),
  updateMedia:        (id, media)   => patch(`/movies/${id}/media`, { media }),
  addCollaborator:    (id, pid)     => post(`/movies/${id}/collaborators`, { productionId: pid }, true),
  addNews:            (id, body)    => post(`/movies/${id}/news`, body, true),
  updateProfile:      (body)        => patch("/productions/me", body),
};