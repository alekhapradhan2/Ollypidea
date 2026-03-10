const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

const json = async (res: Response) => {
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Request failed");
  }
  return res.json();
};

let _token: string | null = null;
if (typeof window !== 'undefined') {
  try { 
    _token = localStorage.getItem("op_token"); 
  } catch {}
}

export const setToken = (t: string | null) => {
  _token = t;
  if (typeof window !== 'undefined') {
    try { 
      t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token"); 
    } catch {}
  }
};

export const getToken = () => _token;

const get = (path: string) => fetch(`${BASE}${path}`).then(json);

const post = (path: string, body: any, token?: string | null) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      ...(token ? { Authorization: `Bearer ${token}` } : {}) 
    },
    body: JSON.stringify(body),
  }).then(json);

const patch = (path: string, body: any, token?: string | null) =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json", 
      ...(token ? { Authorization: `Bearer ${token}` } : {}) 
    },
    body: JSON.stringify(body),
  }).then(json);

export const API = {
  getMovies: () => get("/movies"),
  getMovie: (id: string) => get(`/movies/${id}`),
  getCast: () => get("/cast"),
  getCastOne: (id: string) => get(`/cast/${id}`),
  getNews: () => get("/news"),
  getSongs: () => get("/songs"),
  postReview: (id: string, body: any) => post(`/movies/${id}/reviews`, body),
  register: (body: any) => post("/register", body),
  login: (email: string, pw: string) => post("/login", { email, password: pw }),
  updateBoxOffice: (id: string, body: any) => patch(`/movies/${id}/boxoffice`, body, _token),
  updateCast: (id: string, cast: any[]) => patch(`/movies/${id}/cast`, { cast }, _token),
  updateMedia: (id: string, media: any) => patch(`/movies/${id}/media`, { media }, _token),
  addNews: (id: string, body: any) => post(`/movies/${id}/news`, body, _token),
  createCast: (body: any) => post("/cast", body, _token),
};