// ─────────────────────────────────────────────────────────────────────────────
//  api.js — BOX OFFICE EXTENSION
//  Add the following entries to your existing API object in api.js.
//  These go INSIDE the existing `export const API = { ... }` block.
//  DO NOT replace the existing file — only ADD these lines.
// ─────────────────────────────────────────────────────────────────────────────

/*
  ── Paste inside the API = { ... } object, after the last entry ──

  // ── Box Office (public)
  getMovieBoxOfficeDays:    (id)          => get(`/movies/${id}/boxoffice-days`),
  getMovieBoxOffice:        (id)          => get(`/movies/${id}/boxoffice`),

  // ── Admin — Box Office
  adminGetBoxOfficeMovies:  ()            => get("/admin/boxoffice/all-movies", _adminToken),
  adminAddBoxOfficeDay:     (id, body)    => post(`/admin/movies/${id}/boxoffice-days`, body, _adminToken),
  adminUpdateBoxOfficeDay:  (id, day, body) => req("PATCH", `/admin/movies/${id}/boxoffice-days/${day}`, body, _adminToken),
  adminDeleteBoxOfficeDay:  (id, day)    => del(`/admin/movies/${id}/boxoffice-days/${day}`, _adminToken),

*/

// ─────────────────────────────────────────────────────────────────────────────
//  NOTE: The following two entries already exist in the original api.js.
//  Do NOT add them again:
//    getMovieBoxOfficeDays:   (id) => get(`/movies/${id}/boxoffice-days`),
//    adminGetBoxOfficeMovies: ()   => get("/admin/boxoffice/all-movies", _adminToken),
//
//  Only add the NEW entries (adminAddBoxOfficeDay, adminUpdateBoxOfficeDay,
//  adminDeleteBoxOfficeDay) that are not already present.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
//  FULL UPDATED api.js  — safe to replace your existing file entirely
//  (All existing methods preserved; box office admin methods added at the end)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let _token = (() => { try { return localStorage.getItem("op_token"); } catch { return null; } })();
export const setToken = (t) => {
  _token = t;
  try { t ? localStorage.setItem("op_token", t) : localStorage.removeItem("op_token"); } catch { }
};
export const getToken = () => _token;

let _castToken = (() => { try { return localStorage.getItem("cm_token"); } catch { return null; } })();
export const setCastToken = (t) => {
  _castToken = t;
  try { t ? localStorage.setItem("cm_token", t) : localStorage.removeItem("cm_token"); } catch { }
};
export const getCastToken = () => _castToken;

let _adminToken = (() => { try { return localStorage.getItem("admin_token"); } catch { return null; } })();
export const setAdminToken = (t) => {
  _adminToken = t;
  try { t ? localStorage.setItem("admin_token", t) : localStorage.removeItem("admin_token"); } catch { }
};
export const getAdminToken = () => _adminToken || (() => { try { return localStorage.getItem("admin_token"); } catch { return null; } })();

const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};

const req = async (method, path, body, token) => {
  const activeToken = (typeof token === "string" && token) ? token : (getAdminToken() || getToken() || getCastToken());
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader(activeToken) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status} ${res.statusText})`);
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const get = (path, token) => req("GET", path, undefined, token);
const post = (path, body, token) => req("POST", path, body, token);
const patch = (path, body, token) => req("PATCH", path, body, token);
const del = (path, token) => req("DELETE", path, undefined, token);

export const API = {
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
  addVideo: (id, video) => post(`/movies/${id}/videos`, video, _token),
  updateVideo: (id, idx, video) => patch(`/movies/${id}/videos/${idx}`, video, _token),
  removeVideo: (id, idx) => del(`/movies/${id}/videos/${idx}`, _token),
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
  adminAddVideo: (id, video) => post(`/admin/movies/${id}/videos`, video, _adminToken),
  adminUpdateVideo: (id, idx, video) => patch(`/admin/movies/${id}/videos/${idx}`, video, _adminToken),
  adminDeleteVideo: (id, idx) => del(`/admin/movies/${id}/videos/${idx}`, _adminToken),
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

  // ── Blog (public)
  getBlogPosts: (params = "") => get(`/blog${params ? `?${params}` : ""}`),
  getBlogPost: (slug) => get(`/blog/${slug}`),

  // ── Admin — blog
  adminGetBlogPosts: () => get("/admin/blog", _adminToken),
  adminCreateBlog: (body) => post("/admin/blog", body, _adminToken),
  adminUpdateBlog: (id, body) => patch(`/admin/blog/${id}`, body, _adminToken),
  adminDeleteBlog: (id) => del(`/admin/blog/${id}`, _adminToken),

  // ── Contact / Enquiries
  submitContact: (body) => post("/contact", body),
  adminGetEnquiries: () => get("/admin/enquiries", _adminToken),
  adminUnreadCount: () => get("/admin/enquiries/unread-count", _adminToken),
  adminMarkEnquiryRead: (id) => req("PATCH", `/admin/enquiries/${id}/read`, undefined, _adminToken),
  adminDeleteEnquiry: (id) => del(`/admin/enquiries/${id}`, _adminToken),

  // ── Box Office (public) — existing
  getMovieBoxOfficeDays: (id, trackType = "original") => get(`/movies/${id}/boxoffice-days?trackType=${trackType}`),

  // ── Admin — Box Office (existing)
  adminGetBoxOfficeMovies: () => get("/admin/boxoffice/all-movies", _adminToken),

  // ── Admin — Box Office (NEW additions)
  adminAddBoxOfficeDay: (id, body, trackType = "original") => post(`/admin/movies/${id}/boxoffice-days?trackType=${trackType}`, body, _adminToken),
  adminUpdateBoxOfficeDay: (id, day, body, trackType = "original") => req("PATCH", `/admin/movies/${id}/boxoffice-days/${day}?trackType=${trackType}`, body, _adminToken),
  adminDeleteBoxOfficeDay: (id, day, trackType = "original") => del(`/admin/movies/${id}/boxoffice-days/${day}?trackType=${trackType}`, _adminToken),
  adminBulkBoxOfficeDays: (id, body, trackType = "original") => post(`/admin/movies/${id}/boxoffice-days/bulk?trackType=${trackType}`, body, _adminToken),

  // ── Admin — Sacnilk Tracker
  sacnilkGetConfigs: () => get("/admin/sacnilk/configs", _adminToken),
  sacnilkGetLogs: (movieId) => get(`/admin/sacnilk/logs/${movieId}`, _adminToken),
  sacnilkSaveConfig: (movieId, body) => req("PUT", `/admin/sacnilk/configs/${movieId}`, body, _adminToken),
  sacnilkDeleteConfig: (movieId) => req("DELETE", `/admin/sacnilk/configs/${movieId}`, undefined, _adminToken),
  sacnilkScrapeOne: (movieId) => post(`/admin/sacnilk/scrape/${movieId}`, undefined, _adminToken),
  sacnilkScrapeAll: () => post("/admin/sacnilk/scrape-all", undefined, _adminToken),
  sacnilkGenerateFinalBlogDraft: (movieId) => post(`/admin/sacnilk/generate-final-blog-draft/${movieId}`, undefined, _adminToken),
  sacnilkPublishFinalBlog: (movieId, body) => post(`/admin/sacnilk/publish-final-blog/${movieId}`, body, _adminToken),

  // ── Admin — Staff Management
  adminGetStaff:    () => get("/admin/staff", _adminToken),
  adminCreateStaff: (body) => post("/admin/staff", body, _adminToken),
  adminUpdateStaff: (id, body) => req("PUT", `/admin/staff/${id}`, body, _adminToken),
  adminDeleteStaff: (id) => del(`/admin/staff/${id}`, _adminToken),

  // ── Admin — Optimized list endpoints (paginated / lightweight) ──
  // Use these in the admin portal instead of the full getMovies / getCast calls.
  adminGetMoviesList: (page = 1, limit = 50, search = "", verdict = "", year = "") =>
    get(`/admin/movies-list?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&verdict=${encodeURIComponent(verdict)}&year=${encodeURIComponent(year)}`, _adminToken),
  adminGetCastList: () => get("/admin/cast-list", _adminToken),

  // ── Admin — Users & Reviews
  adminGetReviews: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/reviews${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminGetReviewers: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/reviewers${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminDeleteReview: (movieId, reviewIdx) => del(`/admin/movies/${movieId}/reviews/${reviewIdx}`, _adminToken),

  // ── Admin — Community & Port 3000 Users Integration
  adminGetCommunityStats: () => get("/admin/community/stats", _adminToken),
  adminGetCommunityUsers: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/community/users${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminGetCommunityUser: (id) => get(`/admin/community/users/${id}`, _adminToken),
  adminUpdateCommunityUserStatus: (id, status) => req("PATCH", `/admin/community/users/${id}/status`, { status }, _adminToken),
  adminUpdateCommunityUserRole: (id, role) => req("PATCH", `/admin/community/users/${id}/role`, { role }, _adminToken),
  adminDeleteCommunityUser: (id) => del(`/admin/community/users/${id}`, _adminToken),
  adminGetCommunityActivities: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/community/activities${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminGetCommunityDiscussions: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/community/discussions${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminUpdateCommunityDiscussion: (id, body) => req("PATCH", `/admin/community/discussions/${id}`, body, _adminToken),
  adminDeleteCommunityDiscussion: (id) => del(`/admin/community/discussions/${id}`, _adminToken),
  adminGetCommunityComments: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/community/comments${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminDeleteCommunityComment: (id) => del(`/admin/community/comments/${id}`, _adminToken),
  adminGetCommunityVotes: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/community/votes${qp ? `?${qp}` : ""}`, _adminToken);
  },

  // ── Admin — Media Library & Uploads Module
  adminGetMedia: (params = {}) => {
    const qp = new URLSearchParams(params).toString();
    return get(`/admin/media${qp ? `?${qp}` : ""}`, _adminToken);
  },
  adminUploadMedia: async (formData) => {
    const activeToken = getAdminToken();
    const res = await fetch(`${BASE}/admin/media/upload`, {
      method: "POST",
      headers: { ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}) },
      body: formData,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Media upload failed with server status ${res.status}`);
    }
    if (!res.ok) throw new Error(data.error || "Media upload failed");
    return data;
  },
  adminSyncCloudinary: () => post("/admin/media/sync-cloudinary", undefined, _adminToken),
  adminDeleteMedia: (id) => del(`/admin/media/${id}`, _adminToken),
  adminBulkDeleteMedia: (ids) => post("/admin/media/bulk-delete", { ids }, _adminToken),
  adminUpdateMedia: (id, body) => patch(`/admin/media/${id}`, body, _adminToken),
};