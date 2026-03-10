const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const json = (res) => {
  if (!res.ok) return res.json().then(d => Promise.reject(d.error || "Request failed"));
  return res.json();
};

let _token = (() => { try { return localStorage.getItem("op_token"); } catch { return null; } })();
export const setToken = (t) => {
  _token = t;
  try { t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token"); } catch {}
};
export const getToken = () => _token;

const get = (path) => fetch(`${BASE}${path}`).then(json);
const post = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then(json);
const patch = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then(json);

export const API = {
  getMovies:       ()           => get("/movies"),
  getMovie:        (id)         => get(`/movies/${id}`),
  getCast:         ()           => get("/cast"),
  getCastOne:      (id)         => get(`/cast/${id}`),
  getNews:         ()           => get("/news"),
  getSongs:        ()           => get("/songs"),
  postReview:      (id, body)   => post(`/movies/${id}/reviews`, body),
  register:        (body)       => post("/register", body),
  login:           (email, pw)  => post("/login", { email, password: pw }),
  updateBoxOffice: (id, body)   => patch(`/movies/${id}/boxoffice`, body, _token),
  updateCast:      (id, cast)   => patch(`/movies/${id}/cast`, { cast }, _token),
  updateMedia:     (id, media)  => patch(`/movies/${id}/media`, { media }, _token),
  addNews:         (id, body)   => post(`/movies/${id}/news`, body, _token),
  createCast:      (body)       => post("/cast", body, _token),
};