const BASE = "https://ollypidea.onrender.com/api";

export const API = {
  getMovies: () => fetch(`${BASE}/movies`).then(res => res.json()),

  getMovie: (id) =>
    fetch(`${BASE}/movies/${id}`).then(res => res.json()),

  getCast: () =>
    fetch(`${BASE}/cast`).then(res => res.json()),

  getCastOne: (id) =>
    fetch(`${BASE}/cast/${id}`).then(res => res.json()),

  getNews: () =>
    fetch(`${BASE}/news`).then(res => res.json()),

  getSongs: () =>
    fetch(`${BASE}/songs`).then(res => res.json()),

  register: (body) =>
    fetch(`${BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(res => res.json()),

  login: (body) =>
    fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(res => res.json()),
};