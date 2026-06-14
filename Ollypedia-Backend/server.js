const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
require("dotenv").config();

// ── Multer: disk storage for blog inline images ──────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "public", "blog-uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const blogImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = `blog-img-${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  },
});
const blogImageUpload = multer({
  storage: blogImageStorage,
  limits:  { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpeg, png, webp, gif)"));
  },
});

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// ── Passive visitor tracking middleware ──────────────────────────────────────
// Fires on every public GET /api/* — silently logs IP, device, page, location
const TRACK_SKIP = ["/api/admin", "/api/auth", "/api/cast-auth", "/api/ping", "/blog-uploads"];

app.use(async (req, _res, next) => {
  try {
    if (req.method !== "GET") return next();
    if (TRACK_SKIP.some(p => req.path.startsWith(p))) return next();
    if (!req.path.startsWith("/api/")) return next();

    const ua  = req.headers["user-agent"] || "";
    const ip  = (req.headers["x-forwarded-for"] || "").split(",")[0].trim()
                || req.socket?.remoteAddress || "";
    const ref = req.headers["referer"] || req.headers["referrer"] || "";

    const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Tablet|PlayBook/i.test(ua);
    const device   = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

    const os = /Windows/i.test(ua)    ? "Windows"
             : /Android/i.test(ua)    ? "Android"
             : /iPhone|iPad/i.test(ua) ? "iOS"
             : /Mac/i.test(ua)         ? "macOS"
             : /Linux/i.test(ua)       ? "Linux" : "Other";

    const browser = /Edg\//i.test(ua)   ? "Edge"
                  : /OPR\//i.test(ua)   ? "Opera"
                  : /Chrome/i.test(ua)  ? "Chrome"
                  : /Firefox/i.test(ua) ? "Firefox"
                  : /Safari/i.test(ua)  ? "Safari" : "Other";

    const page = req.path.replace(/^\/api/, "") || "/";

    let country = "", city = "";
    if (ip && ip !== "::1" && ip !== "127.0.0.1" && !ip.startsWith("::ffff:127")) {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, { signal: AbortSignal.timeout(2000) });
        const gd  = await geo.json();
        if (gd.status === "success") { country = gd.country || ""; city = gd.city || ""; }
      } catch { /* geo timeout — visit still logged */ }
    }

    // fire-and-forget — never block the request
    VisitorLog.create({ ip, country, city, device, os, browser, page, referrer: ref, visitedAt: new Date() }).catch(() => {});
  } catch { /* never block */ }
  next();
});

// Serve uploaded blog images publicly
app.use("/blog-uploads", express.static(UPLOADS_DIR));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

/** Is s a valid 24-hex MongoDB ObjectId string? */
const isOid = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());

// Slugify a movie title + year into a clean URL-safe slug
// e.g. "Bindusagar" 2026 → "bindusagar-2026"
function makeMovieSlug(title, releaseDate) {
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const base = String(title || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return year ? `${base}-${year}` : base;
}

/** Extract bare 11-char YouTube ID from any URL or ID */
const ytId = (input) => {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return "";
};

/**
 * parseToRupeesGlobal — canonical currency parser used everywhere in this file.
 *
 * Converts any human-readable currency string to raw rupees (integer).
 *   "₹3.36 Cr"  → 33600000
 *   "0.17L"     → 17000
 *   "0.1L"      → 10000
 *   "0.01L"     → 1000
 *   "33,00,000" → 3300000
 *
 * SAFETY: bare numbers with no unit (e.g. "7", "3.36") are treated as 0
 * because they are corrupted entries — the value was produced by raw float
 * arithmetic (3.37 - 3.30 = 0.07) instead of proper rupee maths.
 * Only bare integers ≥ 1000 are trusted as already-in-rupees values.
 */
function parseToRupeesGlobal(str) {
  if (!str) return 0;
  const s = String(str).replace(/[₹,\s]/g, "").toLowerCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.includes("cr") || s.includes("crore")) return Math.round(n * 1_00_00_000);
  if (s.includes("l") || s.includes("lakh"))   return Math.round(n * 1_00_000);
  // Bare integer — trust only if it looks like actual rupees (≥ 1000)
  if (n >= 1000) return Math.round(n);
  return 0; // "7", "0.17" etc. with no unit = corrupted — discard
}

/** Format raw rupees (integer) → "₹X.XX Cr" / "₹X.XX L" */
function formatINRGlobal(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

/** Auth middleware — sets req.prodId (string) */
const auth = (req, res, next) => {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.prodId = String(decoded.productionId);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

/** CastMember auth middleware */
const castAuth = (req, res, next) => {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.castMemberId = String(decoded.castMemberId);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

/** Admin auth middleware */
const adminAuth = (req, res, next) => {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: "Not admin" });
    req.admin = decoded;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};

const canEdit = (movie, prodId) =>
  String(movie.productionId) === prodId ||
  (movie.collaborators || []).some(c => String(c) === prodId);

// ════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════

const ProductionSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  logo:     { type: String, default: "" },
  banner:   { type: String, default: "" },
  bio:      { type: String, default: "" },
  founded:  { type: String, default: "" },
  website:  { type: String, default: "" },
  location: { type: String, default: "" },
}, { timestamps: true });

/**
 * Cast — a public profile for any cast/crew member.
 * movies[] is a back-reference array for filmography display.
 */
const CastSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  type:      { type: String, default: "Actor" },   // primary / legacy (comma-separated)
  roles:     [{ type: String }],                   // multi-role array e.g. ["Actor","Singer"]
  bio:       { type: String, default: "" },
  photo:     { type: String, default: "" },
  dob:       { type: String, default: "" },
  gender:    { type: String, default: "" },
  location:  { type: String, default: "" },
  website:   { type: String, default: "" },
  instagram: { type: String, default: "" },
  banner:    { type: String, default: "" },
  movies:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  user:    { type: String, default: "Anonymous" },
  rating:  Number,
  text:    String,
  date:    String,
  likes:   { type: Number, default: 0 },
  replies: [{
    user: { type: String, default: "Anonymous" },
    text: { type: String, default: "" },
    date: { type: String, default: "" },
  }],
});

const SongSchema = new mongoose.Schema({
  title:           { type: String, default: "" },
  singer:          { type: String, default: "" },
  singerRef:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Cast" }],
  musicDirector:   { type: String, default: "" },
  musicDirectorRef:[{ type: mongoose.Schema.Types.ObjectId, ref: "Cast" }],
  lyricist:        { type: String, default: "" },
  lyricistRef:     [{ type: mongoose.Schema.Types.ObjectId, ref: "Cast" }],
  ytId:            { type: String, default: "" },
  url:             { type: String, default: "" },
  thumbnailUrl:    { type: String, default: "" },
  lyrics:          { type: String, default: "" },
  description:     { type: String, default: "" },
});

/**
 * CastEntrySchema — embedded in Movie.cast[].
 * _id: false avoids a sub-document _id which can cause confusing cast errors.
 */
const CastEntrySchema = new mongoose.Schema({
  castId: { type: mongoose.Schema.Types.ObjectId, ref: "Cast", required: true },
  name:   { type: String, default: "" },
  photo:  { type: String, default: "" },
  type:   { type: String, default: "Actor" },
  role:   { type: String, default: "" },
}, { _id: false });

const MovieSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  category:     { type: String, default: "Feature Film" },
  genre:        [{ type: String }],
  releaseDate:  { type: String, default: "" },
  releaseTBA:   { type: Boolean, default: false },
  director:     { type: String, default: "" },
  producer:     { type: String, default: "" },
  budget:       { type: String, default: "" },
  language:     { type: String, default: "Odia" },
  synopsis:     { type: String, default: "" },
  posterUrl:     { type: String, default: "" },
  thumbnailUrl:  { type: String, default: "" },
  bannerUrl:     { type: String, default: "" },
  runtime:       { type: String, default: "" },
  imdbId:        { type: String, default: "" },
  imdbRating:    { type: String, default: "" },
  imdbVotes:     { type: String, default: "" },
  contentRating: { type: String, default: "" },
  productionId:  { type: mongoose.Schema.Types.ObjectId, ref: "Production", required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],
  cast: [CastEntrySchema],
  media: {
    trailer: {
      ytId:         { type: String, default: "" },
      url:          { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
    },
    songs: [SongSchema],
  },
 boxOffice: {
   opening:   { type: String, default: "TBA" },
   firstWeek: { type: String, default: "TBA" },
   total:     { type: String, default: "TBA" },
 },
 boxOfficeDays: [{
   day:   { type: Number, required: true },
   net:   { type: String, default: "" },
   gross: { type: String, default: "" },
   date:  { type: String, default: "" },
   note:  { type: String, default: "" },
 }],
  verdict:  { type: String, default: "Upcoming" },
  status:   { type: String, default: "Upcoming" },
  reviews:  [ReviewSchema],
  news:     [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
  slug:     { type: String, default: "", index: true },
  interestedYes: { type: Number, default: 0 },
  interestedNo:  { type: Number, default: 0 },   // SEO slug e.g. "bindusagar-2026"
  streamingOn:   { type: String, default: "" },  // OTT platform name e.g. "Aao NXT"
  streamingUrl:  { type: String, default: "" },  // Direct link to stream the movie
  ottReleaseDate:{ type: String, default: "" },  // OTT release date (ISO string or "TBA")
}, { timestamps: true });

const NewsSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
  movieTitle: { type: String, default: "" },
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  category:   { type: String, default: "Update" },
  imageUrl:   { type: String, default: "" },
  published:  { type: Boolean, default: true },
  sourceUrl:  { type: String, default: "" },   // link to original article
  ytId:       { type: String, default: "" },   // YouTube video ID (for video news)
  newsType:   { type: String, default: "article" }, // "article" | "video"
}, { timestamps: true });

// ── Blog / Article Schema ────────────────────────────────────────
const BlogSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  slug:       { type: String, required: true, unique: true, trim: true },
  excerpt:    { type: String, default: "" },        // 1–2 sentence teaser
  content:    { type: String, required: true },     // full article HTML/text
  category:   { type: String, default: "General" }, // "Movie Review","Top 10","Actor Spotlight","News","General"
  tags:       [{ type: String }],                   // ["Odia 2025","Babushaan","Action"]
  coverImage: { type: String, default: "" },
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie" }, // optional link
  movieTitle: { type: String, default: "" },
  castId:     { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },  // optional cast link
  castName:   { type: String, default: "" },
  author:     { type: String, default: "Ollypedia Team" },
  published:  { type: Boolean, default: false },
  featured:   { type: Boolean, default: false },
  views:      { type: Number, default: 0 },
  readTime:   { type: Number, default: 5 },         // minutes
  seoTitle:      { type: String, default: "" },
  seoDesc:       { type: String, default: "" },
  youtubeVideoId:{ type: String, default: "" },  // optional embedded YouTube video
  reviews:       [ReviewSchema],
}, { timestamps: true });

// Auto-generate slug from title
BlogSchema.pre("validate", function(next) {
  if (this.isNew && !this.slug && this.title) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim()
      + "-" + Date.now().toString(36);
  }
  if (!this.readTime && this.content) {
    this.readTime = Math.max(1, Math.ceil(this.content.split(/\s+/).length / 200));
  }
  next();
});

const Blog = mongoose.model("Blog", BlogSchema);

const CastMemberSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  roles:     [String],
  photo:     { type: String, default: "" },
  banner:    { type: String, default: "" },
  bio:       { type: String, default: "" },
  dob:       { type: String, default: "" },
  gender:    { type: String, default: "" },
  location:  { type: String, default: "" },
  website:   { type: String, default: "" },
  instagram: { type: String, default: "" },
  castId:    { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
}, { timestamps: true });

const Production = mongoose.model("Production",  ProductionSchema);

// ── Auto-generate slug on Movie create/update ─────────────────
MovieSchema.pre("save", async function(next) {
  if (this.isNew || this.isModified("title") || this.isModified("releaseDate") || !this.slug) {
    const base = makeMovieSlug(this.title, this.releaseDate);
    let slug = base; let attempt = 0;
    while (true) {
      const existing = await mongoose.models.Movie?.findOne({ slug, _id: { $ne: this._id } }).lean();
      if (!existing) break;
      slug = `${base}-${++attempt}`;
    }
    this.slug = slug;
  }
  next();
});

MovieSchema.pre("findOneAndUpdate", async function(next) {
  const u = this.getUpdate();
  const titleNew = u.title ?? u.$set?.title;
  const dateNew  = u.releaseDate ?? u.$set?.releaseDate;
  if (titleNew !== undefined || dateNew !== undefined) {
    const doc = await this.model.findOne(this.getQuery()).lean();
    const title       = titleNew       ?? doc?.title ?? "";
    const releaseDate = dateNew        ?? doc?.releaseDate ?? "";
    const base = makeMovieSlug(title, releaseDate);
    let slug = base; let attempt = 0;
    while (true) {
      const existing = await this.model.findOne({ slug, _id: { $ne: doc?._id } }).lean();
      if (!existing) break;
      slug = `${base}-${++attempt}`;
    }
    if (!u.$set) u.$set = {};
    u.$set.slug = slug;
  }
  next();
});

const Movie      = mongoose.model("Movie",       MovieSchema);
const Cast       = mongoose.model("Cast",        CastSchema);
const News       = mongoose.model("News",        NewsSchema);
const CastMember = mongoose.model("CastMember",  CastMemberSchema);

// Admin User model
const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });
const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

// ── Contact / Enquiry ─────────────────────────────────────────────
const ContactSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, default: "General Inquiry" },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
}, { timestamps: true });
const Contact = mongoose.model("Contact", ContactSchema);

// ════════════════════════════════════════════════════════════════
// VISITOR ANALYTICS SCHEMA
// ════════════════════════════════════════════════════════════════
const VisitorLogSchema = new mongoose.Schema({
  ip:        { type: String, default: "" },
  country:   { type: String, default: "" },
  city:      { type: String, default: "" },
  device:    { type: String, default: "" },   // "Mobile" | "Desktop" | "Tablet"
  os:        { type: String, default: "" },   // "Android" | "iOS" | "Windows" etc.
  browser:   { type: String, default: "" },   // "Chrome" | "Safari" etc.
  page:      { type: String, default: "/" },  // e.g. "/movies/abc"
  referrer:  { type: String, default: "" },
  visitedAt: { type: Date,   default: Date.now },
}, { timestamps: false });

VisitorLogSchema.index({ visitedAt: -1 });
VisitorLogSchema.index({ ip: 1, visitedAt: 1 });

const VisitorLog = mongoose.model("VisitorLog", VisitorLogSchema);

// ════════════════════════════════════════════════════════════════
// CAST RESOLUTION HELPER
// ════════════════════════════════════════════════════════════════

/**
 * resolveCastEntry(item) — given a raw cast item from the request body,
 * returns a PLAIN JS object (not a Mongoose doc) ready to be pushed
 * into Movie.cast[]:
 *   { castId: ObjectId, name, photo, type, role }
 *
 * Logic:
 *  • item.castId is a valid 24-hex string AND the Cast doc exists → use it
 *  • otherwise → create a new Cast doc
 *
 * CRITICAL: We never return a stringified ObjectId. We return the actual
 * ObjectId instance so Mongoose can cast it against CastEntrySchema.castId.
 */
async function resolveCastEntry(item) {
  const name  = String(item.name  || "").trim();
  const type  = String(item.type  || "Actor");
  const role  = String(item.role  || "");
  const photo = String(item.photo || "");
  const bio   = String(item.bio   || "");

  // item.castId could be:
  //  - a valid 24-hex string like "69afd5e377d28936ba5e0344"
  //  - a Mongoose ObjectId object (toString gives the hex)
  //  - an empty string, null, undefined
  //  - something totally wrong like "[object Object]"
  const rawId = item.castId != null ? String(item.castId).trim() : "";
  const validId = isOid(rawId) ? rawId : null;

  if (validId) {
    const existing = await Cast.findById(validId).lean();
    if (existing) {
      // Use the values sent from the form — they reflect the admin's edits.
      // Fall back to the stored Cast doc only if the field is empty.
      const resolvedName  = name  || existing.name;
      const resolvedPhoto = photo || existing.photo;   // ← was existing.photo || photo (wrong priority)
      const resolvedType  = type  || existing.type;
      // Also update the Cast doc itself so changes persist on the cast profile
      if (photo && photo !== existing.photo) {
        await Cast.findByIdAndUpdate(validId, { photo });
      }
      return {
        castId: existing._id,
        name:   resolvedName,
        photo:  resolvedPhoto,
        type:   resolvedType,
        role,
      };
    }
  }

  // Create new Cast document
  if (!name) throw new Error("Cast entry requires a name");
  const rolesArr = type ? type.split(",").map(r => r.trim()).filter(Boolean) : ["Actor"];
  const nc = await Cast.create({ name, type: rolesArr[0], roles: rolesArr, bio, photo });
  return {
    castId: nc._id,     // ObjectId instance
    name:   nc.name,
    photo:  nc.photo,
    type:   nc.type,
    role,
  };
}

// ════════════════════════════════════════════════════════════════
// PRODUCTION AUTH
// ════════════════════════════════════════════════════════════════

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, logo, bio, founded, website, location } = req.body;
    if (!name?.trim())                    return res.status(400).json({ error: "Company name required" });
    if (!email)                           return res.status(400).json({ error: "Email required" });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (await Production.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: "Email already registered" });

    const prod = await Production.create({
      name: name.trim(), email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      logo: logo || "", bio: bio || "", founded: founded || "",
      website: website || "", location: location || "",
    });
    const token = jwt.sign({ productionId: prod._id, email: prod.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const obj = prod.toObject(); delete obj.password;
    res.json({ token, production: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const prod = await Production.findOne({ email: email?.toLowerCase() });
    if (!prod || !(await bcrypt.compare(password, prod.password)))
      return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ productionId: prod._id, email: prod.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const obj = prod.toObject(); delete obj.password;
    res.json({ token, production: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// CAST MEMBER AUTH
// ════════════════════════════════════════════════════════════════

app.post("/api/cast-auth/register", async (req, res) => {
  try {
    const { name, email, password, roles, photo, bio, gender, location, dob } = req.body;
    if (!name?.trim())                    return res.status(400).json({ error: "Name required" });
    if (!email)                           return res.status(400).json({ error: "Email required" });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!roles?.length)                   return res.status(400).json({ error: "Select at least one role" });
    if (await CastMember.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: "Email already registered" });

    const castDoc = await Cast.create({ name: name.trim(), type: roles[0], bio: bio || "", photo: photo || "" });
    const member  = await CastMember.create({
      name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 10),
      roles, photo: photo || "", bio: bio || "", gender: gender || "", location: location || "", dob: dob || "",
      castId: castDoc._id,
    });
    const token = jwt.sign({ castMemberId: member._id, email: member.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const obj = member.toObject(); delete obj.password;
    res.json({ token, castMember: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/cast-auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const member = await CastMember.findOne({ email: email?.toLowerCase() });
    if (!member || !(await bcrypt.compare(password, member.password)))
      return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ castMemberId: member._id, email: member.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const obj = member.toObject(); delete obj.password;
    res.json({ token, castMember: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/cast-auth/me", castAuth, async (req, res) => {
  try {
    const member = await CastMember.findById(req.castMemberId).select("-password").lean();
    if (!member) return res.status(404).json({ error: "Not found" });
    const movies = await Movie.find(
      { "cast.castId": member.castId },
      "title posterUrl releaseDate verdict genre productionId cast"
    ).populate("productionId", "name logo").lean();
    res.json({ ...member, movies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/cast-auth/me", castAuth, async (req, res) => {
  try {
    const allowed = ["name","photo","banner","bio","gender","location","dob","website","instagram","roles"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const member = await CastMember.findByIdAndUpdate(req.castMemberId, update, { new: true, select: "-password" });
    if (member?.castId) {
      const cu = {};
      if (update.name)     cu.name     = update.name;
      if (update.photo)    cu.photo    = update.photo;
      if (update.bio)      cu.bio      = update.bio;
      if (update.location) cu.location = update.location;
      if (update.website)  cu.website  = update.website;
      if (update.instagram)cu.instagram= update.instagram;
      if (update.roles && Array.isArray(update.roles) && update.roles.length) {
        cu.roles = update.roles;
        cu.type  = update.roles[0]; // keep primary type in sync
      }
      if (Object.keys(cu).length) await Cast.findByIdAndUpdate(member.castId, cu);
    }
    res.json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ════════════════════════════════════════════════════════════════

app.get("/api/productions", async (req, res) => {
  try {
    const prods = await Production.find({}, "-password -email").lean();
    const counts = await Movie.aggregate([{ $group: { _id: "$productionId", count: { $sum: 1 } } }]);
    const cm = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
    res.json(prods.map(p => ({ ...p, movieCount: cm[String(p._id)] || 0 })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// IMPORTANT: /search/:q must come before /:id
app.get("/api/productions/search/:q", async (req, res) => {
  try {
    const prods = await Production.find({ name: { $regex: req.params.q, $options: "i" } }, "-password -email").limit(10).lean();
    res.json(prods);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/productions/:id/movies", async (req, res) => {
  try {
    const movies = await Movie.find({
      $or: [{ productionId: req.params.id }, { collaborators: req.params.id }]
    }, "-reviews").populate("productionId","name logo").populate("collaborators","name logo").populate("news").lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/productions/:id", async (req, res) => {
  try {
    const prod = await Production.findById(req.params.id, "-password -email").lean();
    if (!prod) return res.status(404).json({ error: "Not found" });
    res.json(prod);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}, "-reviews").populate("productionId","name logo").populate("collaborators","name logo").lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/movies/:id", async (req, res) => {
  try {
    const param = req.params.id;
    // Accept both ObjectId (24-hex) and human-readable slug (e.g. "bindusagar-2026")
    let movie = null;
    if (isOid(param)) {
      movie = await Movie.findById(param)
        .populate("productionId","name logo").populate("collaborators","name logo").populate("news").lean();
    } else {
      // Slug lookup — strip any trailing ObjectId if old URLs sneak through
      const slugPart = param.replace(/-[a-f0-9]{24}$/i, "");
      movie = await Movie.findOne({ slug: slugPart })
        .populate("productionId","name logo").populate("collaborators","name logo").populate("news").lean();
    }
    if (!movie) return res.status(404).json({ error: "Not found" });
    res.json(movie);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// IMPORTANT: /search/:q must come before /:id
app.get("/api/cast/search/:q", async (req, res) => {
  try {
    const cast = await Cast.find({ name: { $regex: req.params.q, $options: "i" } }).limit(10).lean();
    res.json(cast);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/cast/:id", async (req, res) => {
  try {
    const param = req.params.id;
    let c = null;
    if (isOid(param)) {
      // Standard ObjectId lookup
      c = await Cast.findById(param).lean();
    } else {
      // Name-slug lookup: "babushaan-mohanty" → search by name
      // Convert slug back to searchable name (hyphens → spaces)
      const nameQuery = param.replace(/-/g, " ").trim();
      // Exact case-insensitive match first
      c = await Cast.findOne({ name: { $regex: new RegExp("^" + nameQuery + "$", "i") } }).lean();
      // Fallback: match any cast member whose name words all appear in the slug
      if (!c) {
        const words = nameQuery.split(" ").filter(w => w.length > 2);
        const pattern = words.map(w => "(?=.*" + w + ")").join("") + ".*";
        c = await Cast.findOne({ name: { $regex: new RegExp(pattern, "i") } }).lean();
      }
    }
    if (!c) return res.status(404).json({ error: "Not found" });
    const movies = await Movie.find({ "cast.castId": c._id }, "title posterUrl releaseDate verdict productionId genre cast slug")
      .populate("productionId","name logo").lean();
    res.json({ ...c, moviesList: movies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/cast", async (req, res) => {
  try { res.json(await Cast.find().lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/news", async (req, res) => {
  try { res.json(await News.find({ published: true }).sort({ createdAt: -1 }).lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/news/:newsId", async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId).lean();
    if (!item) return res.status(404).json({ error: "Not found" });
    const related = await News.find({
      _id: { $ne: item._id }, published: true,
      $or: [{ category: item.category }, { movieId: item.movieId }]
    }).sort({ createdAt: -1 }).limit(4).lean();
    let movie = null;
    if (item.movieId)
      movie = await Movie.findById(item.movieId,"title posterUrl genre verdict releaseDate productionId")
        .populate("productionId","name logo").lean();
    res.json({ ...item, related, movie });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/songs", async (req, res) => {
  try {
    const movies = await Movie.find({}, "title posterUrl media").lean();
    res.json(movies.flatMap(m => (m.media?.songs || []).map(s => ({ ...s, movieTitle: m.title, movieId: m._id, moviePoster: m.posterUrl }))));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/movies/:id/reviews", async (req, res) => {
  try {
    const { user, rating, text } = req.body;
    if (!user?.trim() || !text?.trim()) return res.status(400).json({ error:"Name and review required." });
    const query = isOid(req.params.id) ? { _id: req.params.id } : { slug: req.params.id };
    const movie = await Movie.findOneAndUpdate(
      query,
      { $push: { reviews: { user:user.trim(), rating:Number(rating)||5, text:text.trim(), date:new Date().toISOString().split("T")[0] } } },
      { new: true }
    );
    if (!movie) return res.status(404).json({ error:"Movie not found" });
    res.json(movie.reviews);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/movies/:id/interested — vote yes or no
app.post("/api/movies/:id/interested", async (req, res) => {
  try {
    const { vote } = req.body;  // "yes" | "no"
    if (!["yes","no"].includes(vote)) return res.status(400).json({ error:"vote must be yes or no" });
    const query  = isOid(req.params.id) ? { _id: req.params.id } : { slug: req.params.id };
    const field  = vote === "yes" ? "interestedYes" : "interestedNo";
    const movie  = await Movie.findOneAndUpdate(query, { $inc: { [field]: 1 } }, { new: true });
    if (!movie) return res.status(404).json({ error:"Movie not found" });
    res.json({ yes: movie.interestedYes || 0, no: movie.interestedNo || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/movies/:id/interested — get counts
app.get("/api/movies/:id/interested", async (req, res) => {
  try {
    const query = isOid(req.params.id) ? { _id: req.params.id } : { slug: req.params.id };
    const movie = await Movie.findOne(query, "interestedYes interestedNo").lean();
    if (!movie) return res.status(404).json({ error:"Not found" });
    res.json({ yes: movie.interestedYes || 0, no: movie.interestedNo || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// PROTECTED ROUTES
// ════════════════════════════════════════════════════════════════

/**
 * POST /api/movies — Create a new movie
 *
 * The entire cast pipeline:
 *  1. Parse cast from body (array or JSON string)
 *  2. For each item, call resolveCastEntry() which returns a plain object
 *     with castId as a real Mongoose ObjectId (not a string, not "[object Object]")
 *  3. Pass resolvedCast directly to Movie.create({ cast: resolvedCast })
 *  4. After movie is saved, update Cast.movies[] back-references
 */
app.post("/api/movies", auth, async (req, res) => {
  try {
    const b = req.body;

    const title = String(b.title || "").trim();
    if (!title) return res.status(400).json({ error: "Movie title is required" });

    // ── Parse cast ──
    let rawCast = b.cast;
    if (typeof rawCast === "string") {
      try { rawCast = JSON.parse(rawCast); } catch { rawCast = []; }
    }
    if (!Array.isArray(rawCast)) rawCast = [];

    // ── Resolve cast entries ──
    const resolvedCast = [];
    for (const item of rawCast) {
      if (!item) continue;
      // Must have either a name or a valid castId
      const hasName = String(item.name || "").trim().length > 0;
      const hasId   = isOid(String(item.castId || "").trim());
      if (!hasName && !hasId) continue;
      try {
        resolvedCast.push(await resolveCastEntry(item));
      } catch (err) {
        console.warn("⚠️  Skipping cast entry:", item.name || item.castId, "—", err.message);
      }
    }

    // ── Parse collaborators ──
    let rawCollab = b.collaborators;
    if (typeof rawCollab === "string") {
      try { rawCollab = JSON.parse(rawCollab); } catch { rawCollab = []; }
    }
    const collabIds = [];
    for (const cid of (Array.isArray(rawCollab) ? rawCollab : [])) {
      if (isOid(String(cid || ""))) {
        const p = await Production.findById(String(cid)).lean();
        if (p) collabIds.push(p._id);
      }
    }

    // ── Media ──
    const rm = (b.media && typeof b.media === "object") ? b.media : {};
    const tid = ytId(rm.trailer?.ytId || rm.trailer?.url || "");
    const media = {
      trailer: { ytId: tid, url: rm.trailer?.url || "", thumbnailUrl: tid ? `https://img.youtube.com/vi/${tid}/hqdefault.jpg` : "" },
      songs: (Array.isArray(rm.songs) ? rm.songs : []).map(s => {
        const sid = ytId(s.ytId || s.url || "");
        return {
          title: String(s.title || ""), singer: String(s.singer || ""),
          ytId: sid, url: String(s.url || ""),
          thumbnailUrl: String(s.thumbnailUrl || (sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : "")),
        };
      }),
    };

    const director = resolvedCast.find(c => c.type === "Director")?.name || String(b.director || "");
    const producer  = resolvedCast.find(c => c.type === "Producer")?.name  || String(b.producer  || "");

    // ── Create movie ──
    // resolvedCast is a plain array of { castId: ObjectId, name, photo, type, role }
    // Mongoose will cast this correctly against CastEntrySchema
    const movie = await Movie.create({
      title,
      category:     String(b.category    || "Feature Film"),
      genre:        Array.isArray(b.genre) ? b.genre.map(String) : [],
      releaseDate:  String(b.releaseDate  || ""),
      releaseTBA:   !!b.releaseTBA,
      director, producer,
      budget:       String(b.budget      || ""),
      language:     String(b.language    || "Odia"),
      synopsis:     String(b.synopsis    || ""),
      posterUrl:    String(b.posterUrl   || ""),
      thumbnailUrl: String(b.thumbnailUrl || ""),
      verdict:      String(b.verdict     || "Upcoming"),
      status:       b.verdict && b.verdict !== "Upcoming" ? "Released" : "Upcoming",
      media,
      productionId:  req.prodId,
      collaborators: collabIds,
      cast:          resolvedCast,
    });

    // ── Back-references ──
    for (const entry of resolvedCast) {
      await Cast.findByIdAndUpdate(entry.castId, { $addToSet: { movies: movie._id } });
    }

    const populated = await Movie.findById(movie._id)
      .populate("productionId","name logo")
      .populate("collaborators","name logo")
      .lean();

    console.log(`✅ Movie "${movie.title}" created with ${resolvedCast.length} cast member(s)`);
    res.status(201).json(populated);
  } catch (e) {
    console.error("❌ Create movie error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/movies/:id", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.prodId)) return res.status(403).json({ error: "Forbidden" });
    const allowed = ["title","category","genre","releaseDate","releaseTBA","director","producer","budget","language","synopsis","posterUrl","thumbnailUrl","verdict","status","streamingOn","streamingUrl","ottReleaseDate"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (req.body.verdict) update.status = req.body.verdict === "Upcoming" ? "Upcoming" : "Released";
    const updated = await Movie.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("productionId","name logo").populate("collaborators","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/movies/:id/boxoffice", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.prodId)) return res.status(403).json({ error: "Forbidden" });
    const { opening, firstWeek, total, verdict } = req.body;
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { boxOffice: { opening, firstWeek, total }, verdict, status: verdict === "Upcoming" ? "Upcoming" : "Released" },
      { new: true }
    ).populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/movies/:id/cast", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Only owner can manage cast" });

    const entry = await resolveCastEntry(req.body);
    const exists = movie.cast.some(c => String(c.castId) === String(entry.castId));
    if (exists) return res.status(400).json({ error: "This person is already in the cast list" });

    const updated = await Movie.findByIdAndUpdate(req.params.id, { $push: { cast: entry } }, { new: true })
      .populate("productionId","name logo").populate("collaborators","name logo").lean();
    await Cast.findByIdAndUpdate(entry.castId, { $addToSet: { movies: movie._id } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/movies/:id/cast/:castId", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Only owner can manage cast" });
    if (!isOid(req.params.castId)) return res.status(400).json({ error: "Invalid castId" });
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { $pull: { cast: { castId: new mongoose.Types.ObjectId(req.params.castId) } } },
      { new: true }
    ).populate("productionId","name logo").populate("collaborators","name logo").lean();
    const stillLinked = await Movie.exists({ "cast.castId": req.params.castId, _id: { $ne: req.params.id } });
    if (!stillLinked) await Cast.findByIdAndUpdate(req.params.castId, { $pull: { movies: movie._id } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/movies/:id/songs", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Forbidden" });
    const sid = ytId(req.body.ytId || req.body.url || "");
    const song = { title: String(req.body.title || ""), singer: String(req.body.singer || ""), ytId: sid, url: String(req.body.url || ""), thumbnailUrl: sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : "" };
    const updated = await Movie.findByIdAndUpdate(req.params.id, { $push: { "media.songs": song } }, { new: true }).populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/movies/:id/songs/:songIndex", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Forbidden" });
    const songs = (movie.media?.songs || []).filter((_, i) => i !== parseInt(req.params.songIndex, 10));
    const updated = await Movie.findByIdAndUpdate(req.params.id, { "media.songs": songs }, { new: true }).populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/movies/:id/trailer", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Forbidden" });
    const tid = ytId(req.body.ytId || req.body.url || "");
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { "media.trailer": { ytId: tid, url: req.body.url || "", thumbnailUrl: tid ? `https://img.youtube.com/vi/${tid}/hqdefault.jpg` : "" } },
      { new: true }
    ).populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/movies/:id/collaborators", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== req.prodId) return res.status(403).json({ error: "Forbidden" });
    const collab = await Production.findById(req.body.productionId);
    if (!collab) return res.status(404).json({ error: "Production company not found" });
    await Movie.findByIdAndUpdate(req.params.id, { $addToSet: { collaborators: collab._id } });
    res.json({ message: `${collab.name} added as collaborator` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/movies/:id/news", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.prodId)) return res.status(403).json({ error: "Forbidden" });
    const item = await News.create({ ...req.body, movieId: movie._id, movieTitle: movie.title });
    await Movie.findByIdAndUpdate(req.params.id, { $push: { news: item._id } });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/news/:newsId", auth, async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId);
    if (!item) return res.status(404).json({ error: "Not found" });
    const movie = await Movie.findById(item.movieId);
    if (!movie || !canEdit(movie, req.prodId)) return res.status(403).json({ error: "Forbidden" });
    const allowed = ["title","content","category","imageUrl","published"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    res.json(await News.findByIdAndUpdate(req.params.newsId, update, { new: true }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/news/:newsId", auth, async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId);
    if (!item) return res.status(404).json({ error: "Not found" });
    const movie = await Movie.findById(item.movieId);
    if (!movie || !canEdit(movie, req.prodId)) return res.status(403).json({ error: "Forbidden" });
    await News.findByIdAndDelete(req.params.newsId);
    await Movie.findByIdAndUpdate(item.movieId, { $pull: { news: item._id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/productions/me", auth, async (req, res) => {
  try {
    const allowed = ["name","logo","banner","bio","founded","website","location"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const prod = await Production.findByIdAndUpdate(req.prodId, update, { new: true, select: "-password -email" });
    res.json(prod);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// SEARCH CAST BY TYPE
// ════════════════════════════════════════════════════════════════
app.get("/api/cast/search-type/:type/:q", async (req, res) => {
  try {
    const results = await Cast.find({
      type: { $regex: req.params.type, $options: "i" },
      name: { $regex: req.params.q,    $options: "i" },
    }).limit(10).lean();
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN AUTH ROUTES
// ════════════════════════════════════════════════════════════════

// Check if any admin exists
app.get("/api/admin/setup-status", async (req, res) => {
  try {
    const count = await AdminUser.countDocuments();
    res.json({ hasAdmin: count > 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin register (first-time or with existing admin token / secret)
app.post("/api/admin/register", async (req, res) => {
  try {
    const { username, email, password, adminSecret } = req.body;
    if (!username?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: "Username, email and password required" });
    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const existingCount = await AdminUser.countDocuments();
    if (existingCount > 0) {
      let ok = false;
      const token = (req.headers.authorization || "").split(" ")[1];
      if (token) { try { const d = jwt.verify(token, process.env.JWT_SECRET); if (d.isAdmin) ok = true; } catch {} }
      if (!ok && process.env.ADMIN_REGISTER_SECRET && adminSecret === process.env.ADMIN_REGISTER_SECRET) ok = true;
      if (!ok) return res.status(403).json({ error: "Admin already exists. Provide admin token or register secret." });
    }

    const exists = await AdminUser.findOne({ $or: [{ username: username.trim() }, { email: email.toLowerCase() }] });
    if (exists) return res.status(400).json({ error: "Username or email already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await AdminUser.create({ username: username.trim(), email: email.toLowerCase(), password: hashed });
    const jwtToken = jwt.sign({ isAdmin: true, username: admin.username, adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token: jwtToken, admin: { username: admin.username, email: admin.email, _id: admin._id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password) return res.status(400).json({ error: "Username and password required" });
    const admin = await AdminUser.findOne({ $or: [{ username: username.trim() }, { email: username.toLowerCase() }] });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ isAdmin: true, username: admin.username, adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, admin: { username: admin.username, email: admin.email, _id: admin._id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin change password
app.post("/api/admin/change-password", adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    const admin = await AdminUser.findById(req.admin.adminId);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (currentPassword) {
      const ok = await bcrypt.compare(currentPassword, admin.password);
      if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    }
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════════════════
app.get("/api/admin/stats", adminAuth, async (req, res) => {
  try {
    const [movies, cast, productions, news] = await Promise.all([
      Movie.countDocuments(), Cast.countDocuments(),
      Production.countDocuments(), News.countDocuments(),
    ]);
    const recentMovies = await Movie.find().sort({ createdAt: -1 }).limit(5)
      .populate("productionId", "name").lean();
    res.json({ movies, cast, productions, news, recentMovies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/news", adminAuth, async (req, res) => {
  try {
    const items = await News.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN — MOVIES (uses resolveCastEntry for cast, same as public)
// ════════════════════════════════════════════════════════════════

// Helper to get/create the admin production placeholder
async function getAdminProd() {
  let p = await Production.findOne({ email: "admin@ollipedia.local" }).lean();
  if (!p) {
    const h = await bcrypt.hash("adminprod123", 10);
    p = await Production.create({ name: "Ollipedia Admin", email: "admin@ollipedia.local", password: h });
  }
  return p;
}

// Helper to parse songs with new fields
function parseSongs(rawSongs) {
  if (!Array.isArray(rawSongs)) return [];
  const safeRefs = (arr) => Array.isArray(arr) ? arr.filter(id => isOid(String(id))) : [];
  return rawSongs.map(s => {
    const sid = ytId(s.ytId || s.url || "");
    return {
      title:           String(s.title          || ""),
      singer:          String(s.singer         || ""),
      singerRef:       safeRefs(s.singerRef),
      musicDirector:   String(s.musicDirector  || ""),
      musicDirectorRef:safeRefs(s.musicDirectorRef),
      lyricist:        String(s.lyricist       || ""),
      lyricistRef:     safeRefs(s.lyricistRef),
      ytId:            sid,
      url:             String(s.url            || ""),
      thumbnailUrl:    String(s.thumbnailUrl || (sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : "")),
      lyrics:          String(s.lyrics         || ""),
      description:     String(s.description   || ""),
    };
  });
}

app.post("/api/admin/movies", adminAuth, async (req, res) => {
  try {
    const b = req.body;

    // Parse cast using the same robust resolveCastEntry helper
    let rawCast = b.cast;
    if (typeof rawCast === "string") { try { rawCast = JSON.parse(rawCast); } catch { rawCast = []; } }
    if (!Array.isArray(rawCast)) rawCast = [];

    const resolvedCast = [];
    for (let item of rawCast) {
      if (typeof item === "string") { try { item = JSON.parse(item); } catch { continue; } }
      if (!item) continue;
      const hasName = String(item.name || "").trim().length > 0;
      const hasId   = isOid(String(item.castId || "").trim());
      if (!hasName && !hasId) continue;
      try { resolvedCast.push(await resolveCastEntry(item)); }
      catch (err) { console.warn("⚠️ Skipping cast entry:", item.name || item.castId, "—", err.message); }
    }

    // Parse productions — use exactly what the admin provides; no silent fallback
    let prods = b.productions || [];
    if (typeof prods === "string") { try { prods = JSON.parse(prods); } catch { prods = []; } }
    const validProds = Array.isArray(prods) ? prods.filter(id => isOid(String(id))).map(String) : [];
    const validProdId  = validProds.length > 0 ? validProds[0] : null;
    const collabIds    = validProds.slice(1);

    // Media
    const rm = (b.media && typeof b.media === "object") ? b.media : {};
    const tid = ytId(rm.trailer?.ytId || rm.trailer?.url || "");
    const media = {
      trailer: { ytId: tid, url: rm.trailer?.url || "", thumbnailUrl: tid ? `https://img.youtube.com/vi/${tid}/hqdefault.jpg` : "" },
      songs: parseSongs(rm.songs),
    };

    const movie = await Movie.create({
      title:        String(b.title       || "").trim(),
      category:     String(b.category    || "Feature Film"),
      genre:        Array.isArray(b.genre) ? b.genre.map(String) : [],
      releaseDate:  String(b.releaseDate  || ""),
      releaseTBA:   !!b.releaseTBA,
      director:     String(b.director    || ""),
      producer:     String(b.producer    || ""),
      budget:       String(b.budget      || ""),
      language:     String(b.language    || "Odia"),
      synopsis:     String(b.synopsis    || ""),
      posterUrl:    String(b.posterUrl   || ""),
      thumbnailUrl: String(b.thumbnailUrl || ""),
      verdict:      String(b.verdict     || "Upcoming"),
      status:       b.verdict && b.verdict !== "Upcoming" ? "Released" : "Upcoming",
      imdbId:        String(b.imdbId       || ""),
      imdbRating:    String(b.imdbRating   || ""),
      imdbVotes:     String(b.imdbVotes    || ""),
      contentRating: String(b.contentRating|| ""),
      runtime:       String(b.runtime      || ""),
      bannerUrl:     String(b.bannerUrl    || ""),
      boxOffice:    b.boxOffice || { opening: "TBA", firstWeek: "TBA", total: "TBA" },
      streamingOn:   String(b.streamingOn  || ""),
      streamingUrl:  String(b.streamingUrl || ""),
      ottReleaseDate:String(b.ottReleaseDate|| ""),
      media,
      productionId:  validProdId,
      collaborators: collabIds,
      cast:          resolvedCast,
    });

    for (const entry of resolvedCast) {
      await Cast.findByIdAndUpdate(entry.castId, { $addToSet: { movies: movie._id } });
    }

    const populated = await Movie.findById(movie._id)
      .populate("productionId", "name logo")
      .populate("collaborators", "name logo").lean();
    res.status(201).json(populated);
  } catch (e) { console.error("Admin create movie error:", e.message); res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/movies/:id", adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    const b = req.body;
    const update = {};

    // Scalar fields
    const scalars = ["title","category","genre","releaseDate","releaseTBA","director","producer",
      "budget","language","synopsis","posterUrl","thumbnailUrl","verdict","status",
      "imdbId","imdbRating","imdbVotes","contentRating","runtime","bannerUrl",
      "streamingOn","streamingUrl","ottReleaseDate"];
    scalars.forEach(k => { if (b[k] !== undefined) update[k] = b[k]; });
    if (b.verdict) update.status = b.verdict === "Upcoming" ? "Upcoming" : "Released";
    if (b.boxOffice) update.boxOffice = b.boxOffice;

    // Productions → productionId + collaborators
    // Always apply when the key is present — including clearing it (empty array)
    if (b.productions !== undefined && Array.isArray(b.productions)) {
      const validProds = b.productions.filter(id => isOid(String(id))).map(String);
      update.productionId  = validProds.length > 0 ? validProds[0] : null;
      update.collaborators = validProds.slice(1);
    }

    // Cast — use resolveCastEntry (same robust helper)
    if (b.cast !== undefined) {
      let rawCast = b.cast;
      if (typeof rawCast === "string") { try { rawCast = JSON.parse(rawCast); } catch { rawCast = []; } }
      if (!Array.isArray(rawCast)) rawCast = [];
      const resolvedCast = [];
      for (let item of rawCast) {
        if (typeof item === "string") { try { item = JSON.parse(item); } catch { continue; } }
        if (!item) continue;
        const hasName = String(item.name || "").trim().length > 0;
        const hasId   = isOid(String(item.castId || "").trim());
        if (!hasName && !hasId) continue;
        try { resolvedCast.push(await resolveCastEntry(item)); }
        catch (err) { console.warn("⚠️ Skipping:", item.name, "—", err.message); }
      }
      update.cast = resolvedCast;
      for (const entry of resolvedCast) {
        await Cast.findByIdAndUpdate(entry.castId, { $addToSet: { movies: movie._id } });
      }
    }

    // Media
    if (b.media) {
      const rm = b.media;
      if (rm.trailer !== undefined) {
        const tid = ytId(rm.trailer?.ytId || rm.trailer?.url || "");
        update["media.trailer"] = { ytId: tid, url: rm.trailer?.url || "", thumbnailUrl: tid ? `https://img.youtube.com/vi/${tid}/hqdefault.jpg` : "" };
      }
      if (rm.songs !== undefined) {
        update["media.songs"] = parseSongs(rm.songs);
      }
    }

    const updated = await Movie.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: false })
      .populate("productionId", "name logo")
      .populate("collaborators", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/movies/:id", adminAuth, async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin add cast to movie
app.post("/api/admin/movies/:id/cast", adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    const entry = await resolveCastEntry(req.body);
    await Movie.findByIdAndUpdate(req.params.id, { $push: { cast: entry } }, { new: true });
    await Cast.findByIdAndUpdate(entry.castId, { $addToSet: { movies: movie._id } });
    const updated = await Movie.findById(req.params.id).populate("productionId","name logo").populate("collaborators","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin remove cast from movie
app.delete("/api/admin/movies/:id/cast/:castId", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.castId)) return res.status(400).json({ error: "Invalid castId" });
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { $pull: { cast: { castId: new mongoose.Types.ObjectId(req.params.castId) } } },
      { new: true }
    ).populate("productionId","name logo").populate("collaborators","name logo").lean();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin add song
app.post("/api/admin/movies/:id/songs", adminAuth, async (req, res) => {
  try {
    const safeRefs = (arr) => Array.isArray(arr) ? arr.filter(id => isOid(String(id))) : [];
    const sid = ytId(req.body.ytId || req.body.url || "");
    const song = {
      title:           String(req.body.title          || ""),
      singer:          String(req.body.singer         || ""),
      singerRef:       safeRefs(req.body.singerRef),
      musicDirector:   String(req.body.musicDirector  || ""),
      musicDirectorRef:safeRefs(req.body.musicDirectorRef),
      lyricist:        String(req.body.lyricist       || ""),
      lyricistRef:     safeRefs(req.body.lyricistRef),
      ytId: sid, url: String(req.body.url || ""),
      thumbnailUrl: String(req.body.thumbnailUrl || (sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : "")),
      lyrics:      String(req.body.lyrics      || ""),
      description: String(req.body.description || ""),
    };
    const updated = await Movie.findByIdAndUpdate(req.params.id, { $push: { "media.songs": song } }, { new: true })
      .populate("productionId","name logo").lean();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin update song by index
app.patch("/api/admin/movies/:id/songs/:songIndex", adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    const idx = parseInt(req.params.songIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= (movie.media?.songs?.length || 0))
      return res.status(400).json({ error: "Invalid song index" });
    const safeRefs = (arr) => Array.isArray(arr) ? arr.filter(id => isOid(String(id))) : [];
    const existing = movie.media.songs[idx];
    const s = req.body;
    const sid = ytId(s.ytId || s.url || existing.ytId || "");
    const updatedSong = {
      title:           s.title           !== undefined ? String(s.title)          : existing.title,
      singer:          s.singer          !== undefined ? String(s.singer)         : existing.singer,
      singerRef:       s.singerRef       !== undefined ? safeRefs(s.singerRef)    : (existing.singerRef || []),
      musicDirector:   s.musicDirector   !== undefined ? String(s.musicDirector)  : existing.musicDirector,
      musicDirectorRef:s.musicDirectorRef!== undefined ? safeRefs(s.musicDirectorRef): (existing.musicDirectorRef || []),
      lyricist:        s.lyricist        !== undefined ? String(s.lyricist)       : existing.lyricist,
      lyricistRef:     s.lyricistRef     !== undefined ? safeRefs(s.lyricistRef)  : (existing.lyricistRef || []),
      ytId: sid, url: String(s.url || existing.url || ""),
      thumbnailUrl: String(s.thumbnailUrl || existing.thumbnailUrl || (sid ? `https://img.youtube.com/vi/${sid}/hqdefault.jpg` : "")),
      lyrics:       s.lyrics      !== undefined ? String(s.lyrics)      : (existing.lyrics      || ""),
      description:  s.description !== undefined ? String(s.description) : (existing.description || ""),
    };
    const setKey = `media.songs.${idx}`;
    const updated = await Movie.findByIdAndUpdate(req.params.id, { $set: { [setKey]: updatedSong } }, { new: true })
      .populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin delete song
app.delete("/api/admin/movies/:id/songs/:songIndex", adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    const idx = parseInt(req.params.songIndex, 10);
    const songs = (movie.media?.songs || []).filter((_, i) => i !== idx);
    const updated = await Movie.findByIdAndUpdate(req.params.id, { "media.songs": songs }, { new: true })
      .populate("productionId","name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin add news to movie
app.post("/api/admin/movies/:id/news", adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    const item = await News.create({ ...req.body, movieId: movie._id, movieTitle: movie.title });
    await Movie.findByIdAndUpdate(req.params.id, { $push: { news: item._id } });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN — CAST
// ════════════════════════════════════════════════════════════════
app.post("/api/admin/cast", adminAuth, async (req, res) => {
  try {
    const { name, type, bio, photo, dob, gender, location, website, instagram, banner, roles } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    // Derive roles array: prefer explicit roles[], fallback to splitting type string
    const rolesArr = Array.isArray(roles) && roles.length
      ? roles
      : (type ? type.split(",").map(r => r.trim()).filter(Boolean) : ["Actor"]);
    const primaryType = rolesArr[0] || "Actor";
    const c = await Cast.create({
      name: name.trim(), type: primaryType,
      roles: rolesArr,
      bio: bio || "", photo: photo || "", banner: banner || "",
      dob: dob || "", gender: gender || "", location: location || "",
      website: website || "", instagram: instagram || "",
    });
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/cast/:id", adminAuth, async (req, res) => {
  try {
    const allowed = ["name","bio","photo","dob","gender","location","website","instagram","banner"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    // Handle type / roles
    if (req.body.type !== undefined || req.body.roles !== undefined) {
      const rolesArr = Array.isArray(req.body.roles) && req.body.roles.length
        ? req.body.roles
        : (req.body.type ? req.body.type.split(",").map(r => r.trim()).filter(Boolean) : undefined);
      if (rolesArr && rolesArr.length) {
        update.roles = rolesArr;
        update.type  = rolesArr[0]; // keep primary type in sync
      }
    }
    const c = await Cast.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/cast/:id", adminAuth, async (req, res) => {
  try {
    await Cast.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN — PRODUCTIONS
// ════════════════════════════════════════════════════════════════
app.post("/api/admin/productions", adminAuth, async (req, res) => {
  try {
    const { name, logo, bio, founded, website, location } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const hashed = await bcrypt.hash("changeme123", 10);
    const p = await Production.create({ name: name.trim(), email: `${Date.now()}@admin.local`, password: hashed, logo: logo||"", bio: bio||"", founded: founded||"", website: website||"", location: location||"" });
    const obj = p.toObject(); delete obj.password; delete obj.email;
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/productions/:id", adminAuth, async (req, res) => {
  try {
    const allowed = ["name","logo","banner","bio","founded","website","location"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const p = await Production.findByIdAndUpdate(req.params.id, update, { new: true, select: "-password -email" });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/productions/:id", adminAuth, async (req, res) => {
  try {
    await Production.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// ADMIN — NEWS
// ════════════════════════════════════════════════════════════════
app.post("/api/admin/news", adminAuth, async (req, res) => {
  try {
    const item = await News.create(req.body);
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/news/:id", adminAuth, async (req, res) => {
  try {
    const item = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/news/:id", adminAuth, async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ════════════════════════════════════════════════════════════════
// BLOG / ARTICLE ROUTES
// ════════════════════════════════════════════════════════════════

// GET /api/blog — list published posts (paginated)
app.get("/api/blog", async (req, res) => {
  try {
    const page     = parseInt(req.query.page||"1",10);
    const limit    = parseInt(req.query.limit||"12",10);
    const cat      = req.query.category || "";
    const tag      = req.query.tag      || "";
    const featured = req.query.featured === "true";
    const q        = req.query.q || "";

    const filter = { published: true };
    if (cat)      filter.category = cat;
    if (tag)      filter.tags     = tag;
    if (featured) filter.featured = true;
    if (q)        filter.$or = [
      { title:   { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } },
      { tags:    { $regex: q, $options: "i" } },
    ];

    const total = await Blog.countDocuments(filter);
    const posts = await Blog.find(filter, "title slug excerpt category tags coverImage movieTitle author views readTime featured createdAt seoTitle seoDesc")
      .sort({ featured:-1, createdAt:-1 })
      .skip((page-1)*limit).limit(limit).lean();
    res.json({ posts, total, page, pages: Math.ceil(total/limit) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// GET /api/blog/:slug — single post (no view increment here — use POST /:slug/view)
app.get("/api/blog/:slug", async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, published: true }).lean();
    if (!post) return res.status(404).json({ error:"Not found" });
    res.json(post);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// POST /api/blog/:slug/view — increment view count (prod only, session-deduped on frontend)
app.post("/api/blog/:slug/view", async (req, res) => {
  try {
    const post = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true, select: "views" }
    ).lean();
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json({ views: post.views });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Admin Blog Routes ─────────────────────────────────────────────
// GET /api/admin/blog
app.get("/api/admin/blog", adminAuth, async (req, res) => {
  try {
    const posts = await Blog.find().sort({ createdAt:-1 }).lean();
    res.json(posts);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// POST /api/admin/blog
app.post("/api/admin/blog", adminAuth, async (req, res) => {
  try {
    const { title,excerpt,content,category,tags,coverImage,movieId,movieTitle,castId,castName,author,published,featured,seoTitle,seoDesc,youtubeVideoId } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error:"Title and content required" });
    const slug = req.body.slug?.trim()
      ? req.body.slug.trim()
      : title.toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim()
        + "-" + Date.now().toString(36);
    const readTime = Math.max(1, Math.ceil((content||"").split(/\s+/).length/200));
    const post = await Blog.create({
      title:title.trim(), slug, excerpt:excerpt||"", content:content.trim(),
      category:category||"General", tags:Array.isArray(tags)?tags:(tags||"").split(",").map(t=>t.trim()).filter(Boolean),
      coverImage:coverImage||"", movieId:movieId||undefined, movieTitle:movieTitle||"",
      castId: isOid(castId) ? castId : undefined, castName: castName||"",
      author:author||"Ollypedia Team", published:!!published, featured:!!featured, readTime,
      seoTitle:seoTitle||title, seoDesc:seoDesc||excerpt||"",
      youtubeVideoId: youtubeVideoId?.trim() || "",
    });
    res.status(201).json(post);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// PATCH /api/admin/blog/:id
app.patch("/api/admin/blog/:id", adminAuth, async (req, res) => {
  try {
    const allowed = ["title","excerpt","content","category","tags","coverImage","movieId","movieTitle","castId","castName","author","published","featured","seoTitle","seoDesc","youtubeVideoId"];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    // Validate ObjectId fields — reject invalid strings to prevent Mongoose cast errors
    if (update.castId  !== undefined && !isOid(update.castId))  update.castId  = null;
    if (update.movieId !== undefined && !isOid(update.movieId)) update.movieId = null;
    if (update.content) update.readTime = Math.max(1, Math.ceil(update.content.split(/\s+/).length/200));
    if (update.tags && !Array.isArray(update.tags)) update.tags = update.tags.split(",").map(t=>t.trim()).filter(Boolean);
    const post = await Blog.findByIdAndUpdate(req.params.id, update, { new:true });
    if (!post) return res.status(404).json({ error:"Not found" });
    res.json(post);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// DELETE /api/admin/blog/:id
app.delete("/api/admin/blog/:id", adminAuth, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message:"Deleted" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Blog Reviews ──────────────────────────────────────────────────
// POST /api/blog/:id/reviews
app.post("/api/blog/:id/reviews", async (req, res) => {
  try {
    const { user, text, rating } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Review text required" });
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { user: user || "Anonymous", text: text.trim(), rating: Number(rating) || 5, date: new Date().toISOString().split("T")[0], likes: 0, replies: [] } } },
      { new: true }
    ).lean();
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post.reviews);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/blog/:id/reviews/:idx/like
app.post("/api/blog/:id/reviews/:idx/like", async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const idx = parseInt(req.params.idx, 10);
    if (!post.reviews[idx]) return res.status(404).json({ error: "Review not found" });
    post.reviews[idx].likes = (post.reviews[idx].likes || 0) + 1;
    await post.save();
    res.json({ likes: post.reviews[idx].likes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/blog/:id/reviews/:idx/reply
app.post("/api/blog/:id/reviews/:idx/reply", async (req, res) => {
  try {
    const { user, text, date } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Reply text required" });
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const idx = parseInt(req.params.idx, 10);
    if (!post.reviews[idx]) return res.status(404).json({ error: "Review not found" });
    post.reviews[idx].replies.push({ user: user || "Anonymous", text: text.trim(), date: date || new Date().toISOString().split("T")[0] });
    await post.save();
    res.json(post.reviews[idx].replies);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Review Likes & Replies ────────────────────────────────────────
// POST /api/movies/:id/reviews/:reviewIdx/like
app.post("/api/movies/:id/reviews/:reviewIdx/like", async (req, res) => {
  try {
    const query = isOid(req.params.id) ? { _id: req.params.id } : { slug: req.params.id };
    const idx   = parseInt(req.params.reviewIdx, 10);
    const movie = await Movie.findOne(query);
    if (!movie || !movie.reviews[idx]) return res.status(404).json({ error:"Not found" });
    movie.reviews[idx].likes = (movie.reviews[idx].likes||0) + 1;
    await movie.save();
    res.json({ likes: movie.reviews[idx].likes });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// POST /api/movies/:id/reviews/:reviewIdx/reply
app.post("/api/movies/:id/reviews/:reviewIdx/reply", async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error:"Text required" });
    const query = isOid(req.params.id) ? { _id: req.params.id } : { slug: req.params.id };
    const idx   = parseInt(req.params.reviewIdx, 10);
    const movie = await Movie.findOne(query);
    if (!movie || !movie.reviews[idx]) return res.status(404).json({ error:"Not found" });
    const reply = { user:user?.trim()||"Anonymous", text:text.trim(), date:new Date().toISOString().split("T")[0] };
    if (!movie.reviews[idx].replies) movie.reviews[idx].replies = [];
    movie.reviews[idx].replies.push(reply);
    await movie.save();
    res.json(movie.reviews[idx].replies);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════════════════════════════════════════════════
// CONTACT / ENQUIRY ROUTES
// ════════════════════════════════════════════════════════════════

// Public — anyone can submit the contact form
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return res.status(400).json({ error: "Name, email and message are required." });
    const item = await Contact.create({
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      subject: subject || "General Inquiry",
      message: message.trim(),
    });
    res.json({ success: true, _id: item._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — get all enquiries newest first
app.get("/api/admin/enquiries", adminAuth, async (req, res) => {
  try {
    const items = await Contact.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — unread count (must be before /:id route to avoid conflict)
app.get("/api/admin/enquiries/unread-count", adminAuth, async (req, res) => {
  try {
    const count = await Contact.countDocuments({ read: false });
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — mark as read
app.patch("/api/admin/enquiries/:id/read", adminAuth, async (req, res) => {
  try {
    const item = await Contact.findByIdAndUpdate(
      req.params.id, { read: true }, { new: true }
    );
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — delete enquiry
app.delete("/api/admin/enquiries/:id", adminAuth, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ═════════════════════════════════════════════════════════════════
// ADMIN — One-time slug backfill for existing movies
// POST /api/admin/backfill-slugs  (admin token required)
// Safe to call multiple times — only fills empty slugs
// ═════════════════════════════════════════════════════════════════
app.post("/api/admin/backfill-slugs", adminAuth, async (req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    let updated = 0, skipped = 0;
    for (const m of movies) {
      if (m.slug && !/-[a-f0-9]{24}$/i.test(m.slug)) { skipped++; continue; }
      const base = makeMovieSlug(m.title, m.releaseDate);
      let slug = base, attempt = 0;
      while (true) {
        const conflict = await Movie.findOne({ slug, _id: { $ne: m._id } }).lean();
        if (!conflict) break;
        slug = `${base}-${++attempt}`;
      }
      await Movie.updateOne({ _id: m._id }, { $set: { slug } });
      updated++;
    }
    res.json({ ok: true, updated, skipped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═════════════════════════════════════════════════════════════════
// SEO — robots.txt
// ═════════════════════════════════════════════════════════════════
const SITE_URL = process.env.SITE_URL || "https://www.ollypedia.in";

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /portal
Disallow: /api/
Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-movies.xml
Sitemap: ${SITE_URL}/sitemap-cast.xml`
  );
});

// ─── helpers ───────────────────────────────────────────────────
function xmlEsc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function urlEntry(loc, lastmod, freq="monthly", pri="0.7") {
  return `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${lastmod||new Date().toISOString().slice(0,10)}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
}

// ─── Main sitemap (static pages + recent news) ─────────────────
app.get("/sitemap.xml", async (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const statics = [
    ["", "daily", "1.0"], ["/movies","daily","0.9"], ["/cast","weekly","0.8"],
    ["/songs","weekly","0.8"], ["/news","daily","0.8"],
    ["/about","monthly","0.4"], ["/contact","monthly","0.4"], ["/privacy","monthly","0.3"],
  ];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  statics.forEach(([p,f,pr]) => { xml += urlEntry(`${SITE_URL}${p}`, today, f, pr) + "\n"; });
  try {
    const recentNews = await News.find({ published:true }).sort({ createdAt:-1 }).limit(50).lean();
    recentNews.forEach(n => {
      xml += urlEntry(`${SITE_URL}/news/${n._id}`, n.updatedAt?new Date(n.updatedAt).toISOString().slice(0,10):today, "weekly","0.6") + "\n";
    });
  } catch {}
  res.type("application/xml").send(xml + "</urlset>");
});

// ─── Movies sitemap (slug-based URLs) ──────────────────────────
app.get("/sitemap-movies.xml", async (req, res) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  try {
    const movies = await Movie.find({}, "title releaseDate slug updatedAt").lean();
    movies.forEach(m => {
      const slug    = m.slug || makeMovieSlug(m.title, m.releaseDate);
      const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
      xml += urlEntry(`${SITE_URL}/movie/${slug}`, lastmod, "weekly","0.8") + "\n";
    });
  } catch {}
  res.type("application/xml").send(xml + "</urlset>");
});

// ─── Cast sitemap ───────────────────────────────────────────────
app.get("/sitemap-cast.xml", async (req, res) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  try {
    const cast = await Cast.find({}, "name type updatedAt").lean();
    cast.forEach(c => {
      const slug = String(c.name||"").toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"-").trim();
      const role = String(c.type||"artist").toLowerCase().replace(/\s+/g,"-");
      const lastmod = c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
      xml += urlEntry(`${SITE_URL}/cast/${c._id}/${slug}-odia-${role}`, lastmod, "monthly","0.7") + "\n";
    });
  } catch {}
  res.type("application/xml").send(xml + "</urlset>");
});


// ── Admin — POST /api/admin/upload-blog-image ─────────────────────────────────
// Accepts a multipart/form-data upload with field name "image".
// Returns { url } — a public URL the frontend inserts into the article HTML.
app.post("/api/admin/upload-blog-image", adminAuth, blogImageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file received" });
  const SITE_URL_LOCAL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const url = `${SITE_URL_LOCAL}/blog-uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// ── AI Article Generator (uses server-side fetch → no CORS) ─────────────────
// ── AI Article Generator — powered by Groq (free, ~2-3s per article) ────────
// Sign up free at https://console.groq.com → API Keys → Create Key
// Add to .env:  GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
app.post("/api/admin/generate-article", adminAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "Prompt required" });

  const groqKey = process.env.GROQ_API_KEY || "";
  if (!groqKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY not set in .env. Get a free key at https://console.groq.com",
    });
  }

  // Model options (all free on Groq):
  //   llama-3.1-8b-instant  — fastest, great quality  ← default
  //   llama3-70b-8192       — slower but highest quality
  //   gemma2-9b-it          — good alternative
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are an expert Odia cinema journalist writing for Ollypedia. When asked to return JSON, you MUST return ONLY a valid JSON object with no extra text, no markdown, no code fences. All string values must be plain text — no HTML tags, no bullet points.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens:  1500,
        temperature: 0.7,
        top_p:       0.9,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `Groq API error (${response.status})`;

      // Friendly messages for common Groq errors
      if (response.status === 401) {
        return res.status(500).json({ error: "Invalid GROQ_API_KEY. Check your key at console.groq.com" });
      }
      if (response.status === 429) {
        return res.status(500).json({ error: "Groq rate limit hit. Wait a few seconds and try again." });
      }
      return res.status(500).json({ error: errMsg });
    }

    const data = await response.json();
    const text  = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) return res.status(500).json({ error: "Groq returned an empty response. Try again." });

    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: "Generation failed: " + err.message });
  }
});

// ── PUBLIC — GET /api/movies/:id/boxoffice-days ──────────────────────────────
app.get("/api/movies/:id/boxoffice-days", async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const movie = await Movie.findById(req.params.id, "boxOfficeDays title slug verdict").lean();
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    const days = (movie.boxOfficeDays || []).slice().sort((a, b) => a.day - b.day);
    res.json(days);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — POST /api/admin/movies/:id/boxoffice-days
// Add a new day entry (prevents duplicate day numbers)
// ═══════════════════════════════════════════════════════════════════════════
app.post("/api/admin/movies/:id/boxoffice-days", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const { day, net, gross, date, note } = req.body;
 
    if (!day || isNaN(parseInt(day, 10))) return res.status(400).json({ error: "day is required (integer)" });
    const dayNum = parseInt(day, 10);
 
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
 
    // Prevent duplicate
    const exists = (movie.boxOfficeDays || []).some((d) => d.day === dayNum);
    if (exists) return res.status(409).json({ error: `Day ${dayNum} already exists. Use PATCH to update.` });

    // Normalize net/gross — parse whatever the frontend sends ("7", "7L", "₹7.00 L", "700000")
    // and re-format as a clean "₹X.XX L / Cr" string before storing.
    const netNum   = parseToRupeesGlobal(net   || "0");
    const grossNum = parseToRupeesGlobal(gross || "0");
    const netStored   = netNum   > 0 ? formatINRGlobal(netNum)   : (net   || "");
    const grossStored = grossNum > 0 ? formatINRGlobal(grossNum) : (gross || "");

    movie.boxOfficeDays.push({ day: dayNum, net: netStored, gross: grossStored, date: date || "", note: note || "" });
    movie.boxOfficeDays.sort((a, b) => a.day - b.day);
 
    // Auto-update boxOffice summary totals
    const totalNet = movie.boxOfficeDays.reduce((s, d) => s + parseToRupeesGlobal(d.net || "0"), 0);
    if (totalNet > 0) {
      movie.boxOffice = movie.boxOffice || {};
      movie.boxOffice.total = formatINRGlobal(totalNet);
    }
 
    await movie.save({ validateBeforeSave: false });
    res.status(201).json({ success: true, days: movie.boxOfficeDays });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — PATCH /api/admin/movies/:id/boxoffice-days/:day
// Update an existing day entry
// ═══════════════════════════════════════════════════════════════════════════
app.patch("/api/admin/movies/:id/boxoffice-days/:day", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const dayNum = parseInt(req.params.day, 10);
    if (isNaN(dayNum)) return res.status(400).json({ error: "Invalid day number" });
 
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
 
    const idx = (movie.boxOfficeDays || []).findIndex((d) => d.day === dayNum);
    if (idx === -1) return res.status(404).json({ error: `Day ${dayNum} not found` });
 
    const { net, gross, date, note } = req.body;
    if (net !== undefined) {
      const n = parseToRupeesGlobal(net);
      movie.boxOfficeDays[idx].net = n > 0 ? formatINRGlobal(n) : net;
    }
    if (gross !== undefined) {
      const g = parseToRupeesGlobal(gross);
      movie.boxOfficeDays[idx].gross = g > 0 ? formatINRGlobal(g) : gross;
    }
    if (date  !== undefined) movie.boxOfficeDays[idx].date  = date;
    if (note  !== undefined) movie.boxOfficeDays[idx].note  = note;
 
    // Re-sync total
    const totalNetPatch = movie.boxOfficeDays.reduce((s, d) => s + parseToRupeesGlobal(d.net || "0"), 0);
    if (totalNetPatch > 0) {
      movie.boxOffice = movie.boxOffice || {};
      movie.boxOffice.total = formatINRGlobal(totalNetPatch);
    }
 
    await movie.save({ validateBeforeSave: false });
    res.json({ success: true, days: movie.boxOfficeDays });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — DELETE /api/admin/movies/:id/boxoffice-days/:day
// Remove a day entry
// ═══════════════════════════════════════════════════════════════════════════
app.delete("/api/admin/movies/:id/boxoffice-days/:day", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const dayNum = parseInt(req.params.day, 10);
    if (isNaN(dayNum)) return res.status(400).json({ error: "Invalid day number" });
 
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
 
    const before = (movie.boxOfficeDays || []).length;
    movie.boxOfficeDays = (movie.boxOfficeDays || []).filter((d) => d.day !== dayNum);
    if (movie.boxOfficeDays.length === before) {
      return res.status(404).json({ error: `Day ${dayNum} not found` });
    }
 
    await movie.save({ validateBeforeSave: false });
    res.json({ success: true, days: movie.boxOfficeDays });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — GET /api/admin/boxoffice/all-movies
// Returns movies that have at least one boxOfficeDays entry (already existed
// in the original server.js but included here for completeness)
// ═══════════════════════════════════════════════════════════════════════════
// NOTE: if this route already exists in your server.js, skip adding it again.
app.get("/api/admin/boxoffice/all-movies", adminAuth, async (req, res) => {
  try {
    const movies = await Movie
      .find({ "boxOfficeDays.0": { $exists: true } },
            "title slug posterUrl thumbnailUrl releaseDate language verdict boxOffice boxOfficeDays budget")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// SITEMAP EXTENSION
// Add this block inside your existing sitemap-movies.xml route so box office
// pages are indexed. OR add a separate /sitemap-boxoffice.xml as shown below.
// ─────────────────────────────────────────────────────────────────────────────
 
app.get("/sitemap-boxoffice.xml", async (req, res) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  try {
    const movies = await Movie
      .find({ "boxOfficeDays.0": { $exists: true } }, "title slug releaseDate updatedAt")
      .lean();
    const SITE_URL_LOCAL = process.env.SITE_URL || "https://www.ollypedia.in";
    movies.forEach((m) => {
      const slug    = m.slug || (String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      xml += `  <url>\n    <loc>${SITE_URL_LOCAL}/box-office/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
    });
  } catch {}
  res.type("application/xml").send(xml + "</urlset>");
});
// ────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// MERGE ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/admin/merge/cast/preview ──────────────────────────────────────
// Returns a preview of what will change before the actual merge.
app.post("/api/admin/merge/cast/preview", adminAuth, async (req, res) => {
  try {
    const { primaryId, duplicateIds } = req.body;

    if (!isOid(primaryId)) return res.status(400).json({ error: "Invalid primaryId" });
    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0)
      return res.status(400).json({ error: "duplicateIds must be a non-empty array" });
    if (duplicateIds.some(id => !isOid(id)))
      return res.status(400).json({ error: "One or more duplicateIds are invalid" });

    const primary    = await Cast.findById(primaryId).lean();
    if (!primary) return res.status(404).json({ error: "Primary cast member not found" });

    const duplicates = await Cast.find({ _id: { $in: duplicateIds } }).lean();
    if (duplicates.length === 0) return res.status(404).json({ error: "No duplicates found" });

    // Movies that reference any of the duplicates in their cast array
    const affectedMovies = await Movie.find(
      { "cast.castId": { $in: duplicateIds } },
      "title slug cast"
    ).lean();

    res.json({
      primary:        { _id: primary._id, name: primary.name, type: primary.type, photo: primary.photo },
      duplicates:     duplicates.map(d => ({ _id: d._id, name: d.name, type: d.type })),
      moviesAffected: affectedMovies.length,
      movieList:      affectedMovies.map(m => ({
        _id:   m._id,
        title: m.title,
        slug:  m.slug,
        castEntriesReplaced: m.cast.filter(c => duplicateIds.includes(String(c.castId))).length,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/merge/cast ───────────────────────────────────────────────
// Merges duplicate cast members into the primary:
//  1. In every Movie.cast[], replace duplicate castId references with primaryId
//  2. Merge the movies[] back-reference array on the primary Cast doc
//  3. Delete the duplicate Cast docs
app.post("/api/admin/merge/cast", adminAuth, async (req, res) => {
  try {
    const { primaryId, duplicateIds } = req.body;

    if (!isOid(primaryId)) return res.status(400).json({ error: "Invalid primaryId" });
    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0)
      return res.status(400).json({ error: "duplicateIds must be a non-empty array" });
    if (duplicateIds.some(id => !isOid(id)))
      return res.status(400).json({ error: "One or more duplicateIds are invalid" });
    if (duplicateIds.includes(primaryId))
      return res.status(400).json({ error: "primaryId cannot also be a duplicateId" });

    const primary = await Cast.findById(primaryId);
    if (!primary) return res.status(404).json({ error: "Primary cast member not found" });

    const dupObjectIds = duplicateIds.map(id => new mongoose.Types.ObjectId(id));
    const primaryOid   = new mongoose.Types.ObjectId(primaryId);

    // 1. Find all movies that reference any duplicate
    const affectedMovies = await Movie.find({ "cast.castId": { $in: dupObjectIds } });

    let moviesUpdated = 0;
    for (const movie of affectedMovies) {
      let changed = false;
      // Replace duplicate castId entries with primaryId; remove exact duplicates of primary
      const seen = new Set();
      const newCast = [];
      for (const entry of movie.cast) {
        const idStr = String(entry.castId);
        const isPrimary   = idStr === primaryId;
        const isDuplicate = duplicateIds.includes(idStr);

        if (isPrimary) {
          if (!seen.has(primaryId)) { newCast.push(entry); seen.add(primaryId); }
          // else skip — already have the primary entry
        } else if (isDuplicate) {
          if (!seen.has(primaryId)) {
            // Replace this duplicate entry with primary's data but keep role
            newCast.push({
              castId: primaryOid,
              name:   primary.name,
              photo:  primary.photo || entry.photo || "",
              type:   primary.type  || entry.type  || "Actor",
              role:   entry.role    || "",
            });
            seen.add(primaryId);
            changed = true;
          } else {
            // Primary already added — just drop this duplicate entry
            changed = true;
          }
        } else {
          newCast.push(entry);
        }
      }

      if (changed) {
        movie.cast = newCast;
        await movie.save({ validateBeforeSave: false });
        moviesUpdated++;
      }
    }

    // Also fix Song refs (singerRef, musicDirectorRef, lyricistRef) inside movies
    const songMovies = await Movie.find({
      $or: [
        { "media.songs.singerRef":       { $in: dupObjectIds } },
        { "media.songs.musicDirectorRef":{ $in: dupObjectIds } },
        { "media.songs.lyricistRef":     { $in: dupObjectIds } },
      ]
    });
    for (const movie of songMovies) {
      let changed = false;
      for (const song of (movie.media?.songs || [])) {
        const replaceRefs = (arr) => {
          if (!arr || !arr.length) return arr;
          let didChange = false;
          const next = arr.map(ref => {
            if (duplicateIds.includes(String(ref))) { didChange = true; return primaryOid; }
            return ref;
          });
          if (didChange) changed = true;
          // de-dup
          return [...new Set(next.map(String))].map(s => new mongoose.Types.ObjectId(s));
        };
        song.singerRef        = replaceRefs(song.singerRef);
        song.musicDirectorRef = replaceRefs(song.musicDirectorRef);
        song.lyricistRef      = replaceRefs(song.lyricistRef);
      }
      if (changed) await movie.save({ validateBeforeSave: false });
    }

    // 2. Collect all movie back-references from duplicates and merge into primary
    const dupDocs = await Cast.find({ _id: { $in: dupObjectIds } }).lean();
    const allMovieRefs = dupDocs.flatMap(d => (d.movies || []).map(String));
    const existingRefs = (primary.movies || []).map(String);
    const mergedRefs   = [...new Set([...existingRefs, ...allMovieRefs])];
    primary.movies     = mergedRefs.map(id => new mongoose.Types.ObjectId(id));
    await primary.save({ validateBeforeSave: false });

    // 3. Delete duplicates
    const deleteResult = await Cast.deleteMany({ _id: { $in: dupObjectIds } });

    res.json({
      success:       true,
      moviesUpdated,
      deleted:       deleteResult.deletedCount,
      primaryId,
      duplicateIds,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/merge/movie ──────────────────────────────────────────────
// Merges duplicate movie entries into a primary movie:
//  1. Re-points all News docs that reference duplicates → primary
//  2. Merges cast, songs arrays (union, no exact duplicates)
//  3. Deletes duplicate Movie docs
app.post("/api/admin/merge/movie", adminAuth, async (req, res) => {
  try {
    const { primaryId, duplicateIds } = req.body;

    if (!isOid(primaryId)) return res.status(400).json({ error: "Invalid primaryId" });
    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0)
      return res.status(400).json({ error: "duplicateIds must be a non-empty array" });
    if (duplicateIds.some(id => !isOid(id)))
      return res.status(400).json({ error: "One or more duplicateIds are invalid" });
    if (duplicateIds.includes(primaryId))
      return res.status(400).json({ error: "primaryId cannot also be a duplicateId" });

    const primary = await Movie.findById(primaryId);
    if (!primary) return res.status(404).json({ error: "Primary movie not found" });

    const dupDocs = await Movie.find({ _id: { $in: duplicateIds } }).lean();
    if (dupDocs.length === 0) return res.status(404).json({ error: "No duplicates found" });

    // 1. Re-point News docs
    await News.updateMany(
      { movieId: { $in: duplicateIds } },
      { $set: { movieId: primary._id, movieTitle: primary.title } }
    );

    // 2. Merge cast (union by castId string)
    const existingCastIds = new Set(primary.cast.map(c => String(c.castId)));
    for (const dup of dupDocs) {
      for (const entry of (dup.cast || [])) {
        if (!existingCastIds.has(String(entry.castId))) {
          primary.cast.push(entry);
          existingCastIds.add(String(entry.castId));
        }
      }
    }

    // 3. Merge songs (union by title+singer)
    const songKey = (s) => `${(s.title||"").toLowerCase().trim()}|${(s.singer||"").toLowerCase().trim()}`;
    const existingSongKeys = new Set((primary.media?.songs || []).map(songKey));
    for (const dup of dupDocs) {
      for (const song of (dup.media?.songs || [])) {
        const k = songKey(song);
        if (!existingSongKeys.has(k)) {
          primary.media.songs.push(song);
          existingSongKeys.add(k);
        }
      }
    }

    // 4. Merge news references
    const dupNewsIds = dupDocs.flatMap(d => (d.news || []).map(String));
    const existingNewsIds = new Set((primary.news || []).map(String));
    for (const nid of dupNewsIds) {
      if (!existingNewsIds.has(nid)) {
        primary.news.push(new mongoose.Types.ObjectId(nid));
        existingNewsIds.add(nid);
      }
    }

    await primary.save({ validateBeforeSave: false });

    // 5. Update Cast.movies[] back-references — swap duplicate movie IDs → primary
    const dupOids = duplicateIds.map(id => new mongoose.Types.ObjectId(id));
    const primaryOid = new mongoose.Types.ObjectId(primaryId);
    await Cast.updateMany(
      { movies: { $in: dupOids } },
      { $pull:  { movies: { $in: dupOids } } }
    );
    await Cast.updateMany(
      { "movies": { $nin: [primaryOid] }, _id: { $in: primary.cast.map(c => c.castId) } },
      { $addToSet: { movies: primaryOid } }
    );

    // 6. Delete duplicates
    const deleteResult = await Movie.deleteMany({ _id: { $in: duplicateIds } });

    res.json({
      success: true,
      deleted: deleteResult.deletedCount,
      primaryId,
      duplicateIds,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/merge/song ───────────────────────────────────────────────
// Removes duplicate song entries from their respective movies.
// The "primary" entry is kept as-is; duplicates are deleted from their movies.
app.post("/api/admin/merge/song", adminAuth, async (req, res) => {
  try {
    const { primary, duplicates } = req.body;
    // primary   = { movieId, songIndex }
    // duplicates = [{ movieId, songIndex }, ...]

    if (!primary?.movieId || !isOid(primary.movieId))
      return res.status(400).json({ error: "primary.movieId is required and must be a valid ID" });
    if (!Array.isArray(duplicates) || duplicates.length === 0)
      return res.status(400).json({ error: "duplicates must be a non-empty array" });

    let deleted = 0;

    // Group duplicates by movieId so we can do one save per movie
    const byMovie = {};
    for (const dup of duplicates) {
      if (!dup.movieId || !isOid(dup.movieId)) continue;
      if (!byMovie[dup.movieId]) byMovie[dup.movieId] = [];
      byMovie[dup.movieId].push(Number(dup.songIndex));
    }

    for (const [movieId, indices] of Object.entries(byMovie)) {
      const movie = await Movie.findById(movieId);
      if (!movie || !movie.media?.songs) continue;

      // Sort descending so splicing by index doesn't shift remaining indices
      const sortedIndices = [...new Set(indices)].sort((a, b) => b - a);
      for (const idx of sortedIndices) {
        if (idx >= 0 && idx < movie.media.songs.length) {
          movie.media.songs.splice(idx, 1);
          deleted++;
        }
      }
      await movie.save({ validateBeforeSave: false });
    }

    res.json({ success: true, deleted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// BMS OCCUPANCY TRACKER — Schema + Routes
// ════════════════════════════════════════════════════════════════════════════

const OccupancySnapshotSchema = new mongoose.Schema({
  movieId:      { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
  movieTitle:   { type: String, default: "" },
  bmsUrl:       { type: String, default: "" },
  runAt:        { type: Date, default: Date.now, index: true },
  status:       { type: String, enum: ["running","done","error"], default: "running" },
  errorMsg:     { type: String, default: "" },
  // Overall aggregates
  totalShows:   { type: Number, default: 0 },
  totalSeats:   { type: Number, default: 0 },
  totalSold:    { type: Number, default: 0 },
  avgOccupancy: { type: Number, default: 0 }, // 0-100
  estCollection:{ type: Number, default: 0 }, // rupees
  cityCount:    { type: Number, default: 0 },
  theatreCount: { type: Number, default: 0 },
  // City-wise breakdown
  cities: [{
    name:         String,
    shows:        Number,
    totalSeats:   Number,
    soldSeats:    Number,
    occupancy:    Number, // 0-100
    estCollection:Number,
    theatres: [{
      name:         String,
      location:     String,
      shows:        Number,
      totalSeats:   Number,
      soldSeats:    Number,
      occupancy:    Number,
      estCollection:Number,
    }],
  }],
}, { timestamps: true });

const OccupancySnapshot = mongoose.models.OccupancySnapshot ||
  mongoose.model("OccupancySnapshot", OccupancySnapshotSchema);

// ── GET /api/admin/tracker/sessions/:movieId ─────────────────────────────────
// Returns last 50 snapshots for a movie (summary only, no cities array)
app.get("/api/admin/tracker/sessions/:movieId", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.movieId)) return res.status(400).json({ error: "Invalid ID" });
    const snaps = await OccupancySnapshot
      .find({ movieId: req.params.movieId }, "-cities")
      .sort({ runAt: -1 }).limit(50).lean();
    res.json(snaps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/tracker/snapshot/:id ──────────────────────────────────────
// Returns a single snapshot with full city/theatre breakdown
app.get("/api/admin/tracker/snapshot/:id", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const snap = await OccupancySnapshot.findById(req.params.id).lean();
    if (!snap) return res.status(404).json({ error: "Snapshot not found" });
    res.json(snap);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/tracker/save-snapshot ────────────────────────────────────
// Frontend sends scraped data; backend stores it and optionally updates boxOfficeDays
app.post("/api/admin/tracker/save-snapshot", adminAuth, async (req, res) => {
  try {
    const { movieId, bmsUrl, cities = [], status = "done", errorMsg = "" } = req.body;
    if (!isOid(movieId)) return res.status(400).json({ error: "Invalid movieId" });

    const movie = await Movie.findById(movieId, "title").lean();
    if (!movie) return res.status(404).json({ error: "Movie not found" });

    // Aggregate totals from cities
    let totalShows = 0, totalSeats = 0, totalSold = 0, estCollection = 0;
    const theatreSet = new Set();
    const processedCities = (cities || []).map(city => {
      let cShows = 0, cSeats = 0, cSold = 0, cColl = 0;
      const theatres = (city.theatres || []).map(th => {
        theatreSet.add(`${city.name}::${th.name}`);
        cShows   += (th.shows || 0);
        cSeats   += (th.totalSeats || 0);
        cSold    += (th.soldSeats  || 0);
        cColl    += (th.estCollection || 0);
        const occ = th.totalSeats > 0 ? Math.round((th.soldSeats / th.totalSeats) * 100) : 0;
        return { ...th, occupancy: occ };
      });
      cShows = city.shows || cShows;
      cSeats = city.totalSeats || cSeats;
      cSold  = city.soldSeats  || cSold;
      cColl  = city.estCollection || cColl;
      const occ = cSeats > 0 ? Math.round((cSold / cSeats) * 100) : 0;
      totalShows   += cShows;
      totalSeats   += cSeats;
      totalSold    += cSold;
      estCollection+= cColl;
      return { name: city.name, shows: cShows, totalSeats: cSeats, soldSeats: cSold,
               occupancy: occ, estCollection: cColl, theatres };
    });

    const avgOccupancy = totalSeats > 0 ? Math.round((totalSold / totalSeats) * 100) : 0;

    const snap = await OccupancySnapshot.create({
      movieId, movieTitle: movie.title, bmsUrl: bmsUrl || "",
      runAt: new Date(), status, errorMsg,
      totalShows, totalSeats, totalSold, avgOccupancy,
      estCollection, cityCount: processedCities.length,
      theatreCount: theatreSet.size, cities: processedCities,
    });

    res.status(201).json({ success: true, snapshotId: snap._id, avgOccupancy, estCollection });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/admin/tracker/snapshot/:id ───────────────────────────────────
app.delete("/api/admin/tracker/snapshot/:id", adminAuth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await OccupancySnapshot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/tracker/all-active ────────────────────────────────────────
// Returns movies released in last 30 days with their latest snapshot summary
app.get("/api/admin/tracker/all-active", adminAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const movies = await Movie
      .find({ releaseDate: { $gte: cutoff.toISOString().slice(0,10) }, status: { $ne: "Upcoming" } },
            "title slug posterUrl thumbnailUrl releaseDate")
      .sort({ releaseDate: -1 }).lean();

    // Attach latest snapshot to each movie
    const result = await Promise.all(movies.map(async (m) => {
      const latest = await OccupancySnapshot
        .findOne({ movieId: m._id, status: "done" }, "-cities")
        .sort({ runAt: -1 }).lean();
      return { ...m, latestSnapshot: latest || null };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


//  SACNILK SCRAPER — Schema + Routes + Cron
//  Paste this entire block into server.js, just before the app.listen() call.
//
//  Dependencies to install (if not already present):
//    npm install node-cron node-fetch
//  Or if you're on Node 18+ with built-in fetch, remove the node-fetch import.
//
//  Note: The scraping is done server-side using a simple HTTP fetch +
//  regex approach. Sacnilk's India Net figure appears in the page HTML
//  as text next to the "India Net:" label. We use two strategies:
//    1. XPath-equivalent: regex targeting the span right after "India Net:"
//    2. Fallback: look for any ₹ figure near "India Net" in the raw HTML
// ════════════════════════════════════════════════════════════════════════════

const cron = require("node-cron");

// ── SacnilkConfig Schema ─────────────────────────────────────────────────────
// One doc per movie. Stores the Sacnilk URL and schedule config.

const SacnilkConfigSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, unique: true, index: true },
  movieTitle: { type: String, default: "" },
  sacnilkUrl: { type: String, default: "" },   // e.g. https://www.sacnilk.com/movie/Mantra_Muugdha_2026
  active:     { type: Boolean, default: true }, // if false, cron skips it
  lastLog:    {
    runAt:    { type: Date,   default: null },
    status:   { type: String, default: "" },   // "success" | "error"
    net:      { type: String, default: "" },   // e.g. "₹2.10 Cr"  (daily net, not cumulative)
    gross:    { type: String, default: "" },   // e.g. "₹2.48 Cr"  (daily gross = net × 1.18)
    date:     { type: String, default: "" },   // YYYY-MM-DD of box office date (yesterday IST)
    day:      { type: Number, default: null },
    blogSlug: { type: String, default: "" },
    error:    { type: String, default: "" },
  },
}, { timestamps: true });

const SacnilkConfig = mongoose.models.SacnilkConfig ||
  mongoose.model("SacnilkConfig", SacnilkConfigSchema);

// ── SacnilkLog Schema ────────────────────────────────────────────────────────
// Detailed per-run logs. Kept last 30 per movie.

const SacnilkLogSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
  runAt:      { type: Date, default: Date.now },
  status:     { type: String, enum: ["success", "error", "skipped"], default: "error" },
  net:        { type: String, default: "" },   // daily net (delta)
  gross:      { type: String, default: "" },   // daily gross (net × 1.18)
  date:       { type: String, default: "" },   // box office date YYYY-MM-DD (yesterday IST)
  day:        { type: Number, default: null },
  blogSlug:   { type: String, default: "" },
  error:      { type: String, default: "" },
  rawSnippet: { type: String, default: "" }, // first 500 chars of scraped HTML for debug
}, { timestamps: false });

const SacnilkLog = mongoose.models.SacnilkLog ||
  mongoose.model("SacnilkLog", SacnilkLogSchema);

// ════════════════════════════════════════════════════════════════════════════
//  CORE SCRAPE FUNCTION
//  Fetches the Sacnilk page, extracts "India Net" value,
//  stores it as a new boxOfficeDay, generates & publishes a blog post.
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
//  SACNILK SCRAPER — ENHANCED scrapeSacnilkForMovie()
//  DROP-IN REPLACEMENT for the existing function in server.js
//
//  Changes vs. original:
//  1. Daily Net = Current Scraped (cumulative) − Previous Stored Total
//     (Sacnilk always shows a running cumulative; we delta it each run)
//  2. Gross = Net × 1.18  (same GST formula as BoxOfficePanel)
//  3. Date is always "yesterday" in IST — no more manual date changes
//  4. Full Groq AI call using the exact same 7-section JSON prompt as
//     BoxOfficePanel (buildAiPrompt equivalent)
//  5. Blog HTML built with the full BoxOfficePanel template
//     (JSON-LD, FAQPage, BreadcrumbList, bar chart, structured table,
//      editorial sections, prev/next nav, tags, Also Read, footer)
//  6. Full SEO meta block (title, description, og:*, twitter:*,
//     canonical, keywords, slug)  written into the blog HTML comment
//  7. Automatic blog create-or-update → published: true
//
//  PASTE THIS ENTIRE FUNCTION to replace the old scrapeSacnilkForMovie()
//  in server.js. Everything else (schemas, routes, cron) stays unchanged.
// ════════════════════════════════════════════════════════════════════════════

async function scrapeSacnilkForMovie(movieId) {

  // ─────────────────────────────────────────────────────────────────────────
  //  §0  SHARED HELPERS  (mirrors BoxOfficePanel helpers exactly)
  // ─────────────────────────────────────────────────────────────────────────

  /** Format a raw number (rupees) into ₹X.XX Cr / L */
  const formatINR = (n) => {
    if (!n || isNaN(n)) return "—";
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
    return `₹${Number(n).toLocaleString("en-IN")}`;
  };

  /** Parse a human currency string to raw rupees — alias of global helper */
  const parseToRupees = parseToRupeesGlobal;

  /** Slugify — identical to BoxOfficePanel */
  const slugify = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const getYear = (d) => (d ? new Date(d).getFullYear() : "");

  /** Wrap plain text blocks in <p> tags with inline styles */
  const toParagraphs = (text) =>
    String(text || "")
      .replace(/`/g, "&#96;")   // ← prevent backticks in AI text from breaking template literals
      .trim()
      .split(/\n{2,}/)
      .map(chunk => chunk.split(/\n/).map(l => l.trim()).filter(Boolean).join(" ").trim())
      .filter(Boolean)
      .map(p => `<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">${p}</p>`)
      .join("\n");

  /** Cast/crew extraction — mirrors BoxOfficePanel extractCastInfo */
  const extractCastInfo = (movie) => {
    const cast = Array.isArray(movie.cast) ? movie.cast : [];
    const findByRole = (keywords) =>
      cast.find((m) => {
        const r = (m.role || m.type || "").toLowerCase();
        return keywords.some((k) => r.includes(k));
      })?.name || null;

    const directorEntry = cast.find((m) => {
      const r = (m.role || m.type || "").toLowerCase().trim();
      return r === "director" || r === "film director" || r === "movie director" ||
        (r.includes("director") && !["music","art","action","stunt","assistant","co-","associate"].some(x => r.includes(x)));
    });
    const directorName = directorEntry?.name || movie.director || null;

    const producerEntry = cast.find((m) => {
      const r = (m.role || m.type || "").toLowerCase().trim();
      return r === "producer" ||
        (r.includes("producer") && !["executive","co-","line","associate","assistant"].some(x => r.includes(x)));
    });
    const producerName = producerEntry?.name || movie.producer || null;

    const musicDirector = findByRole(["music director"]) || null;
    const writer        = findByRole(["writer","screenplay","story","dialogue"]) || null;
    const dop           = findByRole(["cinematographer","dop","director of photography"]) || null;
    const editor        = findByRole(["editor"]) || null;

    const CREW_KW  = ["director","producer","writer","screenplay","story","dialogue","music director","cinematographer","dop","editor","choreographer","art director","costume","sound","stunt","vfx"];
    const actingKW = ["actor","actress","lead","hero","heroine","supporting","cameo","special appearance"];
    const actors   = cast.filter((m) => {
      const r = (m.role || m.type || "").toLowerCase();
      const isCrew = CREW_KW.some((k) => r.includes(k)) && !actingKW.some((k) => r.includes(k));
      return !isCrew;
    });

    const leadActors    = actors.slice(0, 4).map((m) => m.name).filter(Boolean);
    const leadActresses = actors
      .filter((m) => { const r = (m.role || m.type || "").toLowerCase(); return r.includes("actress") || r.includes("heroine"); })
      .slice(0, 2).map((m) => m.name).filter(Boolean);

    return { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses };
  };

  /** Parse Groq JSON response into the 7 editorial sections */
  const parseAiSections = (aiText, movie, targetDay, totalNet, totalGross) => {
    const year = getYear(movie.releaseDate);
    const fallback = (key) => {
      const defaults = {
        seoHeadline:         `${movie.title}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection Report`,
        introParagraph:      `${movie.title}${year ? ` (${year})` : ""} continues its theatrical run. On Day ${targetDay}, the film has collected a total net of ${formatINR(totalNet)} and gross of ${formatINR(totalGross)} at the Odia box office.`,
        boxOfficeAnalysis:   `${movie.title} has shown a consistent run at the box office. The day-wise figures indicate steady audience interest across the state of Odisha.`,
        audienceResponse:    `Audiences across Odisha have given ${movie.title} a warm response. The film continues to attract viewers with positive word of mouth.`,
        performanceAnalysis: `With a total net collection of ${formatINR(totalNet)} and gross of ${formatINR(totalGross)}, ${movie.title} has delivered a notable performance for Odia cinema.`,
        prediction:          `Based on current trends, ${movie.title} is expected to maintain momentum in the coming days, especially during weekends.`,
        finalVerdict:        `${movie.title} has collected ${formatINR(totalNet)} net and ${formatINR(totalGross)} gross after ${targetDay} days. All figures are industry estimates. Source: Sacnilk via Ollypedia.`,
      };
      return defaults[key] || "";
    };
    const keys = ["seoHeadline","introParagraph","boxOfficeAnalysis","audienceResponse","performanceAnalysis","prediction","finalVerdict"];
    if (!aiText?.trim()) return Object.fromEntries(keys.map(k => [k, fallback(k)]));
    try {
      const clean  = aiText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(clean);
      return Object.fromEntries(keys.map(k => [k, parsed[k] || fallback(k)]));
    } catch {
      return {
        seoHeadline:        fallback("seoHeadline"),
        introParagraph:     fallback("introParagraph"),
        boxOfficeAnalysis:  aiText.trim(),
        audienceResponse:   fallback("audienceResponse"),
        performanceAnalysis: fallback("performanceAnalysis"),
        prediction:         fallback("prediction"),
        finalVerdict:       fallback("finalVerdict"),
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  §1  LOAD CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  const cfg = await SacnilkConfig.findOne({ movieId });
  if (!cfg || !cfg.sacnilkUrl) throw new Error("No Sacnilk URL configured");

  // ─────────────────────────────────────────────────────────────────────────
  //  §2  FETCH SACNILK PAGE
  // ─────────────────────────────────────────────────────────────────────────

  let html = "";
  try {
    const resp = await fetch(cfg.sacnilkUrl, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://www.sacnilk.com/",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (e) {
    throw new Error(`Fetch failed: ${e.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  §3  EXTRACT INDIA NET (cumulative total from Sacnilk)
  // ─────────────────────────────────────────────────────────────────────────

  let scrapedCumulativeRaw = "";

  // Strategy A: span immediately after "India Net:" label
  const stratA = html.match(
    /India\s*Net\s*:?<\/span>\s*<span[^>]*>\s*([^<]{2,40}?)\s*<\/span>/i
  );
  if (stratA) scrapedCumulativeRaw = stratA[1].trim();

  // Strategy B: broader rupee figure near "India Net"
  if (!scrapedCumulativeRaw) {
    const idx = html.search(/India\s*Net/i);
    if (idx !== -1) {
      const slice = html.slice(idx, idx + 400).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const mB = slice.match(/(?:₹|Rs\.?|INR)?\s*(\d[\d,\.]+\s*(?:Cr|L|Lakh|Crore)?)/i);
      if (mB) scrapedCumulativeRaw = mB[0].trim();
    }
  }

  if (!scrapedCumulativeRaw) {
    throw new Error("Could not find 'India Net' value on page. The page structure may have changed.");
  }

  scrapedCumulativeRaw = scrapedCumulativeRaw.replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

  // The number Sacnilk shows is always the RUNNING TOTAL, not a single day's collection.
  const scrapedCumulativeNum = parseToRupees(scrapedCumulativeRaw);

  // ─────────────────────────────────────────────────────────────────────────
  //  §4  LOAD MOVIE + CALCULATE DAY NUMBER AND DATE
  // ─────────────────────────────────────────────────────────────────────────

  const movie = await Movie.findById(movieId);
  if (!movie) throw new Error("Movie not found");

  // IST helpers
  const nowIST    = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // UTC+5:30
  const todayStr  = nowIST.toISOString().slice(0, 10);             // YYYY-MM-DD today (IST)

  // §4a  BOX OFFICE DATE = YESTERDAY (IST)
  //  Sacnilk posts previous-day figures in the morning.
  //  The cron runs at 8 AM IST → data is always for yesterday.
  //  We auto-compute yesterday so the admin never has to change the date manually.
  const yesterdayIST  = new Date(nowIST);
  yesterdayIST.setDate(yesterdayIST.getDate() - 1);
  const yesterdayStr  = yesterdayIST.toISOString().slice(0, 10); // YYYY-MM-DD yesterday (IST)

  movie.boxOfficeDays = movie.boxOfficeDays || [];
  const existingDays  = movie.boxOfficeDays;

// §4b  PREVIOUS STORED CUMULATIVE TOTAL
  //  Use movie.boxOffice.total — set to formatINRGlobal(scrapedCumulativeNum) on every
  //  successful scrape run, so it's always a clean "₹X.XX Cr" string.
  //  Summing individual day nets is unreliable if any entry has a corrupted value
  //  (e.g. "7" from an old float-arithmetic bug).
  const previousTotalNum = parseToRupeesGlobal(movie.boxOffice?.total || "0");

  // §4c  DAILY NET = Scraped Cumulative − Previous Total
  //  e.g. Sacnilk shows ₹55 Cr, we previously stored ₹50 Cr → Day net = ₹5 Cr
  const dailyNetNum = Math.max(0, scrapedCumulativeNum - previousTotalNum);
  const dailyNetRaw = formatINR(dailyNetNum);

  // §4c-guard  ZERO / NEGATIVE DELTA — Sacnilk hasn't updated yet.
  //  This happens when the page still shows yesterday's running total (no new data),
  //  or when we've already scraped today and the number hasn't moved.
  //  We do NOT save a ₹0 day entry and do NOT publish a blog in this case.
  //  We log it as "skipped" so the admin can see it happened.
  const yesterdayEntry = existingDays.find(d => d.date === yesterdayStr);
  if (dailyNetNum === 0 && !yesterdayEntry) {
    // Log the skip
    await SacnilkLog.create({
      movieId,
      runAt:      new Date(),
      status:     "skipped",
      net:        "₹0",
      gross:      "",
      date:       yesterdayStr,
      day:        null,
      blogSlug:   "",
      rawSnippet: html.slice(0, 500),
      error:      `Scraped total (${scrapedCumulativeRaw}) equals stored total — no new data yet.`,
    });
    await SacnilkConfig.findOneAndUpdate(
      { movieId },
      { $set: {
        "lastLog.runAt":   new Date(),
        "lastLog.status":  "skipped",
        "lastLog.net":     "₹0",
        "lastLog.gross":   "",
        "lastLog.date":    yesterdayStr,
        "lastLog.error":   `No new data — scraped total ${scrapedCumulativeRaw} matches stored total.`,
      }}
    );
    return {
      netRaw:       "₹0",
      grossRaw:     "",
      scrapedTotal: scrapedCumulativeRaw,
      day:          null,
      date:         yesterdayStr,
      blogSlug:     "",
      skipped:      true,
      reason:       `Scraped total (${scrapedCumulativeRaw}) equals previously stored total — Sacnilk hasn't updated yet.`,
    };
  }

  // §4d  GROSS = Net × 1.18 (same GST_RATE as BoxOfficePanel)
  const GST_RATE    = 1.18;
  const dailyGrossNum = Math.round(dailyNetNum * GST_RATE);
  const dailyGrossRaw = dailyGrossNum > 0 ? formatINR(dailyGrossNum) : "";

  // §4e  Determine day number
  const existingDayNums = existingDays.map(d => d.day);
  const maxDay          = existingDayNums.length > 0 ? Math.max(...existingDayNums) : 0;

  let actualDay;

  if (yesterdayEntry) {
    // Re-scrape for same day — update existing entry only if new value is non-zero
    yesterdayEntry.net   = dailyNetRaw;
    yesterdayEntry.gross = dailyGrossRaw;
    yesterdayEntry.note  = "Ollypedia Tracker (updated)";
    actualDay = yesterdayEntry.day;
  } else {
    // New day entry
    actualDay = maxDay + 1;
    existingDays.push({
      day:   actualDay,
      net:   dailyNetRaw,
      gross: dailyGrossRaw,
      date:  yesterdayStr,
      note:  "Ollypedia Tracker",
    });
  }

  movie.boxOfficeDays.sort((a, b) => a.day - b.day);

  // §4f  Update boxOffice.total (running cumulative net)
  const newTotalNet = scrapedCumulativeNum; // Sacnilk cumulative IS the new total
  movie.boxOffice        = movie.boxOffice || {};
  movie.boxOffice.total  = formatINR(newTotalNet);

  await movie.save({ validateBeforeSave: false });

  // ─────────────────────────────────────────────────────────────────────────
  //  §5  BUILD BLOG CONTENT  (full BoxOfficePanel template)
  // ─────────────────────────────────────────────────────────────────────────

  const daysUpToN     = movie.boxOfficeDays.filter(d => d.day <= actualDay);
  const sortedDays    = [...daysUpToN].sort((a, b) => a.day - b.day);

  // Recalculate totals from sorted days (net may differ from cumulative due to rounding)
  const totalNet      = newTotalNet;
  const totalGrossNum = sortedDays.reduce((s, d) => s + parseToRupees(d.gross || "0"), 0);

  const totalNetStr   = formatINR(totalNet);
  const totalGrossStr = totalGrossNum > 0 ? formatINR(totalGrossNum) : "—";

  const year          = getYear(movie.releaseDate);
  const movieName     = movie.title || "Unknown Movie";
  const movieNameNoSp = movieName.replace(/\s+/g, "");
  const releaseDateFmt = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const genreArr      = Array.isArray(movie.genre) ? movie.genre : (movie.genre ? [movie.genre] : []);
  const genre         = genreArr.join(", ") || "Drama";
  const movieSlug     = slugify(`${movieName}${year ? ` (${year})` : ""}`);
  const boxOfficeUrl  = `/box-office/${movieSlug}`;

  // Blog slug — deterministic per movie+day (no timestamp suffix)
  const blogSlugBase  = slugify(`${movieName}${year ? ` ${year}` : ""} day ${actualDay} box office collection`);
  const blogSlug      = blogSlugBase; // stable per day → create-or-update

  const blogTitle     = `${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection and collected ${totalGrossStr} gross`;

  const crew = extractCastInfo(movie);
  const { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses } = crew;

  const currentDayObj = sortedDays.find(d => d.day === actualDay) || sortedDays[sortedDays.length - 1] || {};
  const dayNet        = currentDayObj.net   ? formatINR(parseToRupees(currentDayObj.net))   : dailyNetRaw;
  const dayGross      = currentDayObj.gross ? formatINR(parseToRupees(currentDayObj.gross)) : (dailyGrossRaw || "—");

  // ─────────────────────────────────────────────────────────────────────────
  //  §6  GROQ AI — 7-section editorial content (same model + prompt as BoxOfficePanel)
  // ─────────────────────────────────────────────────────────────────────────

  // Build the same prompt as BoxOfficePanel.buildAiPrompt()
  const tableText = sortedDays
    .map((d) => `Day ${d.day}${d.date ? ` (${d.date})` : ""}: Net ${formatINR(parseToRupees(d.net))}, Gross ${formatINR(parseToRupees(d.gross))}${d.note ? ` — ${d.note}` : ""}`)
    .join("\n");
  const castLine = [
    directorName   ? `Director: ${directorName}`         : "",
    producerName   ? `Producer: ${producerName}`         : "",
    musicDirector  ? `Music Director: ${musicDirector}`  : "",
    writer         ? `Writer: ${writer}`                 : "",
    leadActors.length   ? `Cast: ${leadActors.join(", ")}`       : "",
    leadActresses.length ? `Actresses: ${leadActresses.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const aiPrompt = `You are writing a box office collection article for the Odia film website Ollypedia.

Movie: ${movieName}${year ? ` (${year})` : ""}
${movie.language ? `Language: ${movie.language}` : "Language: Odia"}
Genre: ${genre}
Release Date: ${releaseDateFmt}
${castLine}
${movie.budget ? `Budget: ${movie.budget}` : ""}

Day-wise collection data (all days up to Day ${actualDay}):
${tableText}

Total Net: ${totalNetStr}
Total Gross: ${totalGrossStr}

You must respond ONLY with a valid JSON object (no markdown, no code fences, no extra text). The JSON must have exactly these keys:

{
  "seoHeadline": "A compelling 10-15 word headline for the h1 tag",
  "introParagraph": "2-3 sentences introducing the film and Day ${actualDay} performance. Mention the net and gross figures naturally.",
  "boxOfficeAnalysis": "2-3 paragraphs (plain text, no HTML tags) covering the day-wise journey, trending up or down, weekend/weekday patterns. Mention each day's figures naturally.",
  "audienceResponse": "1-2 paragraphs about how Odia audiences are responding — word of mouth, social media buzz, repeat viewing. Keep it positive and engaging.",
  "performanceAnalysis": "2 paragraphs analysing the film's performance relative to its budget and typical Odia cinema benchmarks. Mention total net ${totalNetStr} and gross ${totalGrossStr}.",
  "prediction": "1-2 paragraphs predicting upcoming weekend/week performance based on current trend.",
  "finalVerdict": "2-3 sentences summarising the film's box office status after Day ${actualDay}. Do NOT use words like Hit, Flop, Average, Super-Hit — just describe the collection factually."
}

Rules:
- All values must be plain text only — no HTML, no bullet points, no markdown
- Write for an Odia cinema (Ollywood) audience
- Keep each section concise but informative
- Do not invent or fabricate collection figures — only use the data provided above`;

  let aiRawText = "";
  const groqKey = process.env.GROQ_API_KEY || "";
  if (groqKey) {
    try {
      const model   = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          max_tokens:      1500,
          temperature:     0.7,
          top_p:           0.9,
          response_format: { type: "json_object" },
          messages: [
            {
              role:    "system",
              content: "You are an expert Odia cinema journalist writing for Ollypedia. When asked to return JSON, you MUST return ONLY a valid JSON object with no extra text, no markdown, no code fences. All string values must be plain text — no HTML tags, no bullet points.",
            },
            { role: "user", content: aiPrompt },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (groqRes.ok) {
        const gr = await groqRes.json();
        aiRawText = (gr?.choices?.[0]?.message?.content || "").trim();
      }
    } catch { /* AI failed — fallback sections used below */ }
  }

  const sections = parseAiSections(aiRawText, movie, actualDay, totalNet, totalGrossNum);

  // ─────────────────────────────────────────────────────────────────────────
  //  §7  BUILD SEO KEYWORDS (same logic as BoxOfficePanel.buildKeywordsArr)
  // ─────────────────────────────────────────────────────────────────────────

  const kw = [];
  kw.push(
    `${movieName} Odia Movie`, `${movieName} Movie Details`, `${movieName} Cast`,
    `${movieName} Cast and Crew`, `${movieName} Story`, `${movieName} Review`,
    `${movieName} Trailer`, `${movieName} Teaser`, `${movieName} Songs`, `${movieName} Music`,
    `${movieName} Release Date`,
    `${movieName} Box Office Collection`, `${movieName} Day ${actualDay} Collection`,
    `${movieName} Day ${actualDay} Box Office Collection`, `${movieName} Total Collection`,
    `${movieName} Total Box Office Collection`, `${movieName} Gross Collection`,
    `${movieName} Net Collection`, `${movieName} Opening Day Collection`,
    `${movieName} First Day Collection`, `${movieName} Week 1 Collection`,
    `${movieName} Box Office Report`, `${movieName} Box Office Prediction`,
    `${movieName} Worldwide Collection`, `${movieName} Audience Response`,
    `${movieName} Movie Update`, `${movieName} Latest News`, `${movieName} Movie Collection`,
    year ? `${movieName} (${year})` : null,
    year ? `${movieName} (${year}) Box Office Collection` : null,
    year ? `${movieName} (${year}) Total Collection` : null,
  );
  if (directorName)  kw.push(directorName, `${directorName} Movie`, `${directorName} Odia Movie`, `${directorName} Director`);
  if (producerName)  kw.push(producerName, `${producerName} Producer`);
  leadActors.forEach(a    => kw.push(a, `${a} Movie`, `${a} Odia Movie`));
  leadActresses.forEach(a => kw.push(a, `${a} Movie`, `${a} Odia Movie`));
  if (musicDirector) kw.push(musicDirector, `${musicDirector} Music Director`);
  if (writer)        kw.push(writer, `${writer} Writer`);
  if (dop)           kw.push(dop, `${dop} Cinematographer`);
  if (editor)        kw.push(editor, `${editor} Editor`);
  genreArr.forEach(g => kw.push(`${g} Odia Movie`, `Odia ${g} Film`));
  kw.push(
    "Odia Movie Collection","Odia Movie Details","Odia Movie Cast","Odia Movie Review",
    "Odia Movie Trailer","Odia Movie Release Date","Odia Movie Box Office",
    "Odia Box Office Collection","Ollywood Box Office Collection","Ollywood Movie Collection",
    "Ollywood Movie Details","Ollywood News","Latest Odia Movie News","Odia Cinema News",
    "Odia Film Industry","Trending Odia Movie",
    year ? `New Odia Movie ${year}` : "New Odia Movie",
    "Best Odia Movies","Ollywood Updates",
  );
  const keywordsStr = kw.filter(Boolean).join(",\n");

  // ─────────────────────────────────────────────────────────────────────────
  //  §8  BUILD HASHTAGS
  // ─────────────────────────────────────────────────────────────────────────

  const tags = [
    `#${movieNameNoSp}`, `#${movieNameNoSp}Collection`, `#${movieNameNoSp}BoxOffice`,
    `#${movieNameNoSp}Day${actualDay}`,
    directorName  ? `#${directorName.replace(/\s+/g,"")}` : null,
    producerName  ? `#${producerName.replace(/\s+/g,"")}` : null,
    musicDirector ? `#${musicDirector.replace(/\s+/g,"")}` : null,
    ...leadActors.map(a     => `#${a.replace(/\s+/g,"")}`),
    ...leadActresses.map(a  => `#${a.replace(/\s+/g,"")}`),
    "#OdiaMovie","#Ollywood","#OdiaCinema","#Ollypedia",
    "#BoxOfficeCollection","#OllywoodBoxOffice","#OllywoodNews",
    year ? `#OdiaMovie${year}` : null,
  ].filter(Boolean);

  const tagChips = tags
    .map(t => `<span class="tag-chip" style="display:inline-block;background:#1e1e1e;color:#c9973a;border:1px solid #3a2800;border-radius:20px;padding:4px 13px;font-size:0.78rem;font-weight:600;margin:2px;">${t}</span>`)
    .join("\n    ");

  // ─────────────────────────────────────────────────────────────────────────
  //  §9  BUILD MOVIE INFO TABLE ROWS
  // ─────────────────────────────────────────────────────────────────────────

  const infoRows = [
    ["Movie Name",     movieName],
    ["Language",       "Odia"],
    ["Industry",       "Ollywood"],
    ["Genre",          genre],
    releaseDateFmt      ? ["Release Date",    releaseDateFmt]             : null,
    directorName        ? ["Director",        directorName]               : null,
    producerName        ? ["Producer",        producerName]               : null,
    musicDirector       ? ["Music Director",  musicDirector]              : null,
    writer              ? ["Writer",          writer]                     : null,
    dop                 ? ["Cinematographer", dop]                        : null,
    editor              ? ["Editor",          editor]                     : null,
    leadActors.length   ? ["Cast",            leadActors.join(", ")]      : null,
    leadActresses.length ? ["Actress",        leadActresses.join(", ")]   : null,
    movie.budget        ? ["Budget",          movie.budget]               : null,
  ].filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────────
  //  §10  BUILD STRUCTURED DATA TABLE (with cumulative + trend)
  // ─────────────────────────────────────────────────────────────────────────

  const parseNum = (s) => parseToRupeesGlobal(s);

  let cumulativeNet = 0, cumulativeGross = 0;
  const dataTableRows = sortedDays.map((d, i) => {
    const netNum    = parseNum(d.net);
    const grossNum  = parseNum(d.gross);
    cumulativeNet   += netNum;
    cumulativeGross += grossNum;

    const prevNetNum = i > 0 ? parseNum(sortedDays[i - 1].net) : null;
    let trendHtml = "";
    if (prevNetNum !== null && prevNetNum > 0 && netNum > 0) {
      const pctChange = ((netNum - prevNetNum) / prevNetNum) * 100;
      const isUp = pctChange >= 0;
      trendHtml = `<span style="display:inline-block;background:${isUp ? "rgba(40,120,60,0.25)" : "rgba(180,40,40,0.25)"};color:${isUp ? "#5dba7d" : "#e07070"};border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">
        ${isUp ? "▲" : "▼"} ${Math.abs(pctChange).toFixed(1)}%
      </span>`;
    } else if (i === 0) {
      trendHtml = `<span style="display:inline-block;background:rgba(201,151,58,0.2);color:#c9973a;border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">Opening</span>`;
    }

    const isToday  = d.day === actualDay;
    const dateStr  = d.date
      ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "—";

    return `
    <tr style="background:${isToday ? "rgba(201,151,58,0.05)" : (i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)")};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#aaa"};font-weight:700;white-space:nowrap;">
        Day ${d.day}${isToday ? ` <span style="font-size:0.65rem;background:rgba(201,151,58,0.2);color:#c9973a;padding:1px 6px;border-radius:4px;vertical-align:middle;">Latest</span>` : ""}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${dateStr}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#ddd"};font-weight:700;">${d.net ? formatINR(parseToRupees(d.net)) : "—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:600;">${d.gross ? formatINR(parseToRupees(d.gross)) : "—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:700;">${formatINR(cumulativeNet)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;">${trendHtml}</td>
    </tr>`;
  }).join("");

  // ─────────────────────────────────────────────────────────────────────────
  //  §12  STYLE SHORTHAND (same as BoxOfficePanel)
  // ─────────────────────────────────────────────────────────────────────────

  const card = `background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:26px;`;
  const h2   = `font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;`;
  const h3   = `font-size:0.85rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.09em;margin:0 0 12px;`;
  const tdL  = `padding:10px 0;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.87rem;width:42%;vertical-align:top;`;
  const tdR  = `padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ddd;font-size:0.87rem;font-weight:600;`;
  const th   = `padding:11px 14px;background:#1f1f1f;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:left;border-bottom:2px solid #2a2a2a;`;

  // Prev / Next slugs
  const prevSlug     = slugify(`${movieName}${year ? ` (${year})` : ""} day ${actualDay - 1} box office collection`);
  const nextSlug     = slugify(`${movieName}${year ? ` (${year})` : ""} day ${actualDay + 1} box office collection`);
  const prevDayLabel = `${movieName} Day ${actualDay - 1}`;
  const nextDayLabel = `${movieName} Day ${actualDay + 1}`;

  // ─────────────────────────────────────────────────────────────────────────
  //  §13  ASSEMBLE FULL BLOG HTML (exact BoxOfficePanel structure)
  // ─────────────────────────────────────────────────────────────────────────

  const blogContent = `<!-- ════════════════════════════════════════════════════════════════
  OLLYPEDIA SEO META — READ BY CMS
  title:          ${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection and collected ${totalGrossStr} gross | Ollypedia
  description:    ${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection: Collected ${totalNetStr} net and ${totalGrossStr} gross in ${actualDay} day${actualDay !== 1 ? "s" : ""}. Complete day-wise breakdown, audience response, performance analysis & predictions on Ollypedia.
  keywords:       ${keywordsStr}
  canonical:      https://ollypedia.in/blog/${blogSlug}
  og:title:       ${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection and collected ${totalGrossStr} gross | Ollypedia
  og:description: ${movieName} has collected ${totalNetStr} net and ${totalGrossStr} gross after ${actualDay} days. Full report on Ollypedia. Complete day-wise breakdown, audience response, performance analysis & predictions on Ollypedia.
  og:url:         https://ollypedia.in/blog/${blogSlug}
  og:image:       ${movie.bannerUrl || movie.posterUrl || movie.thumbnailUrl || "https://ollypedia.in/logo.png"}
  og:type:        article
  twitter:card:   summary_large_image
  twitter:title:  ${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection | Ollypedia
  twitter:description: ${movieName} Day ${actualDay} — Net ${dayNet}, Total ${totalNetStr}. Full breakdown on Ollypedia.
  twitter:image:  ${movie.bannerUrl || movie.posterUrl || movie.thumbnailUrl || "https://ollypedia.in/logo.png"}
════════════════════════════════════════════════════════════════ -->

<!-- ─────────────────────────────────────────────
  JSON-LD SCHEMA — NewsArticle + Movie + BreadcrumbList + FAQPage
───────────────────────────────────────────── -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      "headline": "${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection and collected ${totalGrossStr} gross",
      "description": "${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection: Collected ${totalNetStr} net and ${totalGrossStr} gross in ${actualDay} day${actualDay !== 1 ? "s" : ""}.",
      "datePublished": "${yesterdayStr}",
      "dateModified":  "${todayStr}",
      "author":    { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
      "publisher": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in",
                     "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://ollypedia.in/blog/${blogSlug}" },
      "about": {
        "@type": "Movie",
        "name":       "${movieName}",
        "inLanguage": "Odia",
        "genre":      "${genre}"${releaseDateFmt ? `,
        "datePublished": "${releaseDateFmt}"` : ""}${directorName ? `,
        "director": { "@type": "Person", "name": "${directorName}" }` : ""}${producerName ? `,
        "producer": { "@type": "Person", "name": "${producerName}" }` : ""}${leadActors.length ? `,
        "actor": [${leadActors.map(a => `{ "@type": "Person", "name": "${a}" }`).join(", ")}]` : ""}
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://ollypedia.in" },
        { "@type": "ListItem", "position": 2, "name": "Box Office",  "item": "https://ollypedia.in/box-office" },
        { "@type": "ListItem", "position": 3, "name": "${movieName}","item": "https://ollypedia.in${boxOfficeUrl}" },
        { "@type": "ListItem", "position": 4, "name": "Day ${actualDay} Collection", "item": "https://ollypedia.in/blog/${blogSlug}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the total box office collection of ${movieName}${year ? ` (${year})` : ""}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As of Day ${actualDay}, ${movieName} has collected a total of ${totalNetStr} net and ${totalGrossStr} gross at the Odia box office. These are industry estimates updated daily on Ollypedia."
          }
        },
        {
          "@type": "Question",
          "name": "How much did ${movieName} collect on Day ${actualDay}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On Day ${actualDay}, ${movieName} collected ${dayNet} net and ${dayGross} gross. The cumulative total stands at ${totalNetStr} net after ${actualDay} day${actualDay !== 1 ? "s" : ""} in theatres."
          }
        }${directorName ? `,
        {
          "@type": "Question",
          "name": "Who directed ${movieName}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${movieName} is directed by ${directorName}.${producerName ? ` The film is produced by ${producerName}.` : ""} It is an Odia language film released in ${year || new Date().getFullYear()} under the Ollywood banner."
          }
        }` : ""}${leadActors.length ? `,
        {
          "@type": "Question",
          "name": "Who are the lead actors in ${movieName}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${movieName} stars ${leadActors.join(", ")}${leadActresses.length ? ` alongside ${leadActresses.join(", ")}` : ""}.${musicDirector ? ` The music is composed by ${musicDirector}.` : ""}"
          }
        }` : ""},
        {
          "@type": "Question",
          "name": "Is ${movieName} a hit or flop at the box office?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Based on ${actualDay} day${actualDay !== 1 ? "s" : ""} of data, ${movieName} has collected ${totalNetStr} net at the Odia box office.${movie.budget ? ` The film had an estimated budget of ${movie.budget}.` : ""} Ollypedia updates collection figures daily based on industry trade estimates."
          }
        }
      ]
    }
  ]
}
</script>


<!-- MOBILE RESPONSIVE STYLES — scoped, presentation-only, no logic/SEO impact -->
<style>
.ollypedia-blog-content img,
.ollypedia-blog-content table,
.ollypedia-blog-content div,
.ollypedia-blog-content section { box-sizing: border-box; }

.ollypedia-blog-content { overflow-x: hidden; word-break: break-word; }

.ollypedia-blog-content .tbl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 640px) {
  .ollypedia-blog-content .hero-section {
    padding: 20px 16px 18px !important;
  }
  .ollypedia-blog-content section[style*="background:#181818"],
  .ollypedia-blog-content section[style*="background: #181818"] {
    padding: 18px 14px !important;
  }
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr 1fr !important;
  }
  .ollypedia-blog-content .perf-stats {
    flex-direction: column !important;
    gap: 12px !important;
  }
  .ollypedia-blog-content nav[aria-label="Day navigation"] {
    flex-direction: column !important;
  }
  .ollypedia-blog-content .info-table td:first-child {
    width: 38% !important;
    font-size: 0.8rem !important;
  }
  .ollypedia-blog-content .data-table td,
  .ollypedia-blog-content .data-table th {
    padding: 8px 8px !important;
    font-size: 0.78rem !important;
  }
  .ollypedia-blog-content .bar-table td {
    padding: 8px 8px !important;
  }
  .ollypedia-blog-content .also-read-grid {
    grid-template-columns: 1fr !important;
  }
  .ollypedia-blog-content .tag-chip {
    font-size: 0.7rem !important;
    padding: 3px 10px !important;
  }
  .ollypedia-blog-content .cta-btn {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    text-align: center !important;
  }
  .ollypedia-blog-content .faq-section {
    padding: 18px 14px !important;
  }
}

@media (max-width: 400px) {
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr !important;
  }
  .ollypedia-blog-content h1 {
    font-size: 1.1rem !important;
  }
}
</style>

<!-- BREADCRUMB + TIMESTAMP (standalone, before hero — matches BoxOfficePanel structure) -->
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
  <nav aria-label="Breadcrumb" style="font-size:0.78rem;color:#555;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
    <a href="/"           style="color:#777;text-decoration:none;">Home</a>
    <span style="color:#333;">›</span>
    <a href="/box-office" style="color:#777;text-decoration:none;">Box Office</a>
    <span style="color:#333;">›</span>
    <a href="${boxOfficeUrl}" style="color:#777;text-decoration:none;">${movieName}</a>
    <span style="color:#333;">›</span>
    <span style="color:#c9973a;">Day ${actualDay} Collection</span>
  </nav>
  <time datetime="${yesterdayStr}" style="font-size:0.73rem;color:#444;white-space:nowrap;">
    🕐 Updated: ${nowIST.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
  </time>
</div>


<!-- HERO SECTION -->
<div class="hero-section" style="background:linear-gradient(135deg,#1a0e00 0%,#121212 100%);border:1px solid #2e2000;border-radius:14px;padding:30px 28px 24px;margin-bottom:22px;">

    <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="display:inline-block;background:#2a1500;color:#c9973a;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #3a2200;">📊 Box Office Report</span>
      <span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">Day ${actualDay} Update</span>
      ${year ? `<span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">${year}</span>` : ""}
    </div>
    <h1 style="color:#fff;font-size:clamp(1.2rem,4.5vw,1.6rem);line-height:1.3;font-weight:800;margin:0 0 14px;word-break:break-word;">
      ${movieName}${year ? ` (${year})` : ""} Day ${actualDay} Box Office Collection — ${(sections.seoHeadline || blogTitle).replace(/`/g, "&#96;")}
    </h1>
    ${toParagraphs(sections.introParagraph).replace(/<p>/g, '<p style="color:#bbb;font-size:0.98rem;line-height:1.85;margin:0 0 16px;">')}
    <p style="color:#aaa;font-size:0.93rem;line-height:1.7;margin:0 0 24px;">
      According to industry trade estimates, <strong style="color:#fff;">${movieName}</strong> has collected approximately
      <strong style="color:#c9973a;">${totalNetStr} Net</strong> and
      <strong style="color:#7ec8e3;">${totalGrossStr} Gross</strong> in its first ${actualDay} day${actualDay !== 1 ? "s" : ""} of theatrical release.
      ${directorName ? `Directed by <strong style="color:#ddd;">${directorName}</strong>, the` : "The"} film has been running across Odisha${leadActors.length ? ` with <strong style="color:#ddd;">${leadActors.slice(0,2).join(" and ")}</strong> in the lead roles.` : " with strong audience support."}
    </p>
    <div class="stat-chips" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-top:20px;">
      <div style="background:rgba(0,0,0,0.5);border:1px solid #2e2000;border-radius:10px;padding:14px 16px;">
        <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Net</div>
        <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#c9973a;word-break:break-word;">${totalNetStr}</div>
      </div>
      <div style="background:rgba(0,0,0,0.5);border:1px solid #1a2a3a;border-radius:10px;padding:14px 16px;">
        <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Gross</div>
        <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#7ec8e3;word-break:break-word;">${totalGrossStr}</div>
      </div>
      <div style="background:rgba(0,0,0,0.5);border:1px solid #222;border-radius:10px;padding:14px 16px;">
        <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Day ${actualDay} Net</div>
        <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#fff;word-break:break-word;">${dayNet}</div>
      </div>
    </div>
</div>


<!-- KEY HIGHLIGHT CALLOUT -->
<div style="background:#180e00;border-left:4px solid #ff9800;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:22px;">
  <strong style="color:#ff9800;">📊 Box Office Update:</strong>
  <span style="color:#ccc;"> <strong style="color:#fff;">${movieName}</strong> has collected an estimated
  <strong style="color:#c9973a;">${totalNetStr} net</strong> and
  <strong style="color:#7ec8e3;">${totalGrossStr} gross</strong> after
  <strong style="color:#fff;">${actualDay} day${actualDay !== 1 ? "s" : ""}</strong> in theatres.
  ${totalNet >= 1_00_00_000 ? `The film has crossed the <strong style="color:#c9973a;">₹${(totalNet / 1_00_00_000).toFixed(0)} Cr mark</strong> at the Odia box office.` : ""}</span>
</div>


<!-- MOVIE DETAILS TABLE -->
<section style="${card}">
  <h2 style="${h2}">${movieName} Movie Details</h2>
  <table class="info-table" style="width:100%;border-collapse:collapse;">
    <tbody>
      ${infoRows.map(([label, val]) => `
      <tr>
        <td style="${tdL}">${label}</td>
        <td style="${tdR}">${val}</td>
      </tr>`).join("")}
      <tr>
        <td style="${tdL}">Total Net Collection</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:800;font-size:1.05rem;">${totalNetStr}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;font-size:0.87rem;width:42%;vertical-align:top;">Total Gross Collection</td>
        <td style="padding:10px 0;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${totalGrossStr}</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:center;margin-top:22px;">
    <a href="${boxOfficeUrl}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Box Office Updates
    </a>
  </div>
</section>


<!-- GRAPH 2: STRUCTURED DATA TABLE (Net · Gross · Cumulative · Trend) -->
<section style="${card}">
  <h2 style="${h2}">${movieName} Complete Box Office Data — Day-wise Breakdown</h2>
  <p style="color:#666;font-size:0.82rem;margin:0 0 18px;line-height:1.6;">
    Net · Gross · Cumulative net total after each day · Trend vs previous day
  </p>
  <div style="overflow-x:auto;">
    <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:520px;">
      <thead>
        <tr>
          <th style="${th}">Day</th>
          <th style="${th}">Date</th>
          <th style="${th}">Net</th>
          <th style="${th}">Gross</th>
          <th style="${th}">Cumulative Net</th>
          <th style="${th}">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${dataTableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL (${sortedDays.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${totalNetStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${totalGrossStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${totalNetStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;"></td>
        </tr>
      </tfoot>
    </table>
  </div>
  <p style="font-size:0.72rem;color:#444;margin-top:10px;">* All figures are industry estimates sourced from Sacnilk. Subject to revision.</p>
</section>


<!-- EDITORIAL SECTIONS (AI-written) -->
<section style="${card}">
  <h2 style="${h2}">Box Office Journey — ${movieName}</h2>
  ${toParagraphs(sections.boxOfficeAnalysis)}
</section>

<section style="${card}">
  <h2 style="${h2}">Audience Response</h2>
  ${toParagraphs(sections.audienceResponse)}
</section>

<section style="${card}">
  <h2 style="${h2}">Performance Analysis</h2>
  <div class="perf-stats" style="background:#1f1800;border:1px solid #2e2000;border-radius:10px;padding:16px 20px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap;">
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Net</div>
      <div style="font-size:1.2rem;font-weight:800;color:#c9973a;">${totalNetStr}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Gross</div>
      <div style="font-size:1.2rem;font-weight:800;color:#7ec8e3;">${totalGrossStr}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Days Tracked</div>
      <div style="font-size:1.2rem;font-weight:800;color:#fff;">${sortedDays.length}</div>
    </div>
  </div>
  ${toParagraphs(sections.performanceAnalysis)}
</section>

<section style="${card}">
  <h2 style="${h2}">Future Box Office Prediction</h2>
  ${toParagraphs(sections.prediction)}
</section>

<section style="${card}">
  <h2 style="${h2}">Final Verdict</h2>
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-bottom:16px;">
    ${toParagraphs(sections.finalVerdict)}
  </div>
  <p style="color:#555;font-size:0.8rem;line-height:1.6;margin:0;">
    <em>* All collection figures are industry estimates sourced by Ollypedia Box Office Tracking via Ollypedia Tracker. Figures may differ from official studio numbers.</em>
  </p>
</section>


<!-- PREV / NEXT DAY NAVIGATION -->
<nav aria-label="Day navigation" style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
  ${actualDay > 1
    ? `<a href="/blog/${prevSlug}" rel="prev" style="flex:1;min-width:140px;display:flex;align-items:center;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;">
    <span style="font-size:1.1rem;color:#555;">←</span>
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Previous</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${prevDayLabel}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
  </a>`
    : `<div style="flex:1;min-width:140px;"></div>`
  }
  <a href="/blog/${nextSlug}" rel="next" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;text-align:right;">
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Next</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${nextDayLabel}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
    <span style="font-size:1.1rem;color:#555;">→</span>
  </a>
</nav>


<!-- FAQ SECTION -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 22px;line-height:1.3;">
    Frequently Asked Questions — ${movieName} Box Office
  </h2>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      What is the total box office collection of ${movieName}${year ? ` (${year})` : ""}?
    </h3>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
      As of Day ${actualDay}, <strong style="color:#fff;">${movieName}</strong> has collected a total of
      <strong style="color:#c9973a;">${totalNetStr} net</strong> and
      <strong style="color:#7ec8e3;">${totalGrossStr} gross</strong> at the Odia box office.
      These are industry estimates and figures are updated daily on Ollypedia.
    </p>
  </div>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      How much did ${movieName} collect on Day ${actualDay}?
    </h3>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
      On Day ${actualDay}, <strong style="color:#fff;">${movieName}</strong> collected
      <strong style="color:#c9973a;">${dayNet} net</strong> and
      <strong style="color:#7ec8e3;">${dayGross} gross</strong>.
      The cumulative total stands at <strong style="color:#c9973a;">${totalNetStr} net</strong> after ${actualDay} day${actualDay !== 1 ? "s" : ""} in theatres.
    </p>
  </div>

  ${directorName ? `
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">Who directed ${movieName}?</h3>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
      <strong style="color:#fff;">${movieName}</strong> is directed by <strong style="color:#ddd;">${directorName}</strong>.
      ${producerName ? `The film is produced by <strong style="color:#ddd;">${producerName}</strong>.` : ""}
      It is an Odia language film released in ${year || new Date().getFullYear()} under the Ollywood banner.
    </p>
  </div>` : ""}

  ${leadActors.length ? `
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">Who are the lead actors in ${movieName}?</h3>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
      <strong style="color:#fff;">${movieName}</strong> stars
      <strong style="color:#ddd;">${leadActors.join(", ")}</strong>${leadActresses.length ? ` alongside <strong style="color:#ddd;">${leadActresses.join(", ")}</strong>` : ""}.
      ${musicDirector ? `The music is composed by <strong style="color:#ddd;">${musicDirector}</strong>.` : ""}
    </p>
  </div>` : ""}

  <div style="padding-bottom:4px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">Is ${movieName} a hit or flop at the box office?</h3>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
      Based on ${actualDay} day${actualDay !== 1 ? "s" : ""} of data, <strong style="color:#fff;">${movieName}</strong> has collected
      <strong style="color:#c9973a;">${totalNetStr} net</strong> at the Odia box office.
      ${movie.budget ? `The film had an estimated budget of <strong style="color:#ddd;">${movie.budget}</strong>.` : ""}
      A detailed performance analysis is available above. Ollypedia updates collection figures daily based on industry trade estimates.
    </p>
  </div>
</section>


<!-- ALSO READ — Internal Links -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;">
    Also Read
  </h2>
  <div class="also-read-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
    <a href="${boxOfficeUrl}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;">
      <span style="font-size:1.3rem;flex-shrink:0;">📊</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${movieName} Full Box Office Report</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">All days · Running total</div>
      </div>
    </a>
    <a href="/box-office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎬</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">Ollywood Box Office Collection</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Odia movie collections</div>
      </div>
    </a>
    <a href="/movie/${movieSlug}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎭</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${movieName} — Cast, Story & Details</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Full movie info on Ollypedia</div>
      </div>
    </a>
    <a href="/blog?category=Box%20Office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;">
      <span style="font-size:1.3rem;flex-shrink:0;">📰</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">More Box Office Reports</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Ollywood collection news</div>
      </div>
    </a>
  </div>
</section>


<!-- HASHTAGS -->
<section style="background:#111;border-radius:14px;padding:20px 26px;margin-bottom:22px;">
  <h2 style="font-size:0.7rem;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Tags</h2>
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    ${tagChips}
  </div>
</section>


<!-- FOOTER -->
<div style="border-top:1px solid #1c1c1c;padding-top:16px;margin-top:4px;">
  <p style="color:#444;font-size:0.8rem;line-height:1.8;margin:0;">
    <strong style="color:#555;">Source:</strong> <a href="${cfg.sacnilkUrl}" target="_blank" rel="nofollow noreferrer" style="color:#555;">Sacnilk</a> via Ollypedia Box Office Tracking &nbsp;·&nbsp;
    <strong style="color:#555;">Last Updated:</strong>
    <time datetime="${todayStr}" style="color:#444;">Day ${actualDay}, ${nowIST.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
    &nbsp;·&nbsp; <a href="${boxOfficeUrl}" style="color:#c9973a;text-decoration:none;">View full collection report →</a><br>
    <em style="color:#3a3a3a;">All collection figures are industry estimates and may vary from official figures.</em>
  </p>
</div>`;

  // ─────────────────────────────────────────────────────────────────────────
  //  §14  CREATE OR UPDATE BLOG POST
  // ─────────────────────────────────────────────────────────────────────────

  const seoTitle = `${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection and collected ${totalGrossStr} gross | Ollypedia`;
  const seoDesc  = `${movieName}${year ? ` (${year})` : ""} Day ${actualDay} box office collection: The film has collected ${totalNetStr} net and ${totalGrossStr} gross in ${actualDay} day${actualDay !== 1 ? "s" : ""}. Check complete day-wise breakdown, audience response, and performance analysis on Ollypedia.`;
  const excerpt  = sections.introParagraph ||
    `${movieName} Day ${actualDay} box office collection: Net ${dayNet}, Gross ${dayGross}. Total ${totalNetStr} net in ${sortedDays.length} days.`;

  const blogPayload = {
    title:      blogTitle,
    slug:       blogSlug,
    excerpt,
    content:    blogContent,
    category:   "Box Office",
    tags: [
      movieName, "Box Office", "Odia Cinema", "Ollywood",
      `Day ${actualDay}`, year ? String(year) : null,
      directorName, producerName, musicDirector,
      ...leadActors, ...leadActresses,
    ].filter(Boolean),
    coverImage: movie.bannerUrl || movie.posterUrl || movie.thumbnailUrl || "",
    movieId:     movie._id,
    movieTitle:  movieName,
    author:      "Ollypedia Team",
    published:   true,
    featured:    false,
    seoTitle,
    seoDesc,
  };

  // Look for an existing blog with this exact stable slug
  let finalSlug = blogSlug;
  const existingBlog = await Blog.findOne({ slug: blogSlug });

  if (existingBlog) {
    // Update — preserve _id and createdAt
    Object.assign(existingBlog, blogPayload);
    existingBlog.published = true;
    await existingBlog.save();
    finalSlug = existingBlog.slug;
  } else {
    // New post — also try matching by movieId + day pattern (handles old timestamp slugs)
    const dayPatternBlog = await Blog.findOne({
      movieId: movie._id,
      slug: { $regex: `day-${actualDay}-box-office-collection` },
    });
    if (dayPatternBlog) {
      Object.assign(dayPatternBlog, blogPayload);
      dayPatternBlog.slug = blogSlug; // normalise to stable slug
      dayPatternBlog.published = true;
      await dayPatternBlog.save();
      finalSlug = dayPatternBlog.slug;
    } else {
      const created = await Blog.create(blogPayload);
      finalSlug = created.slug;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  §15  UPDATE LASTLOG ON CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  cfg.lastLog = {
    runAt:    new Date(),
    status:   "success",
    net:      dailyNetRaw,
    gross:    dailyGrossRaw,
    date:     yesterdayStr,
    day:      actualDay,
    blogSlug: finalSlug,
    error:    "",
  };
  await cfg.save();

  // ─────────────────────────────────────────────────────────────────────────
  //  §16  APPEND TO SacnilkLog (keep last 30)
  // ─────────────────────────────────────────────────────────────────────────

  await SacnilkLog.create({
    movieId,
    runAt:      new Date(),
    status:     "success",
    net:        dailyNetRaw,
    gross:      dailyGrossRaw,
    date:       yesterdayStr,
    day:        actualDay,
    blogSlug:   finalSlug,
    rawSnippet: html.slice(0, 500),
  });

  // Trim to 30
  const logCount = await SacnilkLog.countDocuments({ movieId });
  if (logCount > 30) {
    const oldest = await SacnilkLog.find({ movieId }).sort({ runAt: 1 }).limit(logCount - 30).select("_id");
    await SacnilkLog.deleteMany({ _id: { $in: oldest.map(l => l._id) } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  §17  AUTO-INDEX PING (optional — uncomment if autoIndexUrl is available)
  // ─────────────────────────────────────────────────────────────────────────

  // try {
  //   const blogFullUrl = `https://ollypedia.in/blog/${finalSlug}`;
  //   await autoIndexUrl(blogFullUrl);
  // } catch { /* non-fatal */ }

  return {
    netRaw:        dailyNetRaw,
    grossRaw:      dailyGrossRaw,
    scrapedTotal:  scrapedCumulativeRaw,
    day:           actualDay,
    date:          yesterdayStr,
    blogSlug:      finalSlug,
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/sacnilk/configs ───────────────────────────────────────────
app.get("/api/admin/sacnilk/configs", adminAuth, async (req, res) => {
  try {
    const configs = await SacnilkConfig.find().sort({ createdAt: -1 }).lean();
    res.json(configs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/admin/sacnilk/configs/:movieId ──────────────────────────────────
// Upsert a config for a movie (create or update fields)
app.put("/api/admin/sacnilk/configs/:movieId", adminAuth, async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!isOid(movieId)) return res.status(400).json({ error: "Invalid movieId" });

    const movie = await Movie.findById(movieId, "title").lean();
    if (!movie) return res.status(404).json({ error: "Movie not found" });

    const { sacnilkUrl, active } = req.body;
    const update = { movieTitle: movie.title };
    if (sacnilkUrl !== undefined) update.sacnilkUrl = sacnilkUrl;
    if (active !== undefined)     update.active     = active;

    const cfg = await SacnilkConfig.findOneAndUpdate(
      { movieId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/admin/sacnilk/configs/:movieId ───────────────────────────────
app.delete("/api/admin/sacnilk/configs/:movieId", adminAuth, async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!isOid(movieId)) return res.status(400).json({ error: "Invalid movieId" });
    await SacnilkConfig.deleteOne({ movieId });
    await SacnilkLog.deleteMany({ movieId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/sacnilk/logs/:movieId ─────────────────────────────────────
app.get("/api/admin/sacnilk/logs/:movieId", adminAuth, async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!isOid(movieId)) return res.status(400).json({ error: "Invalid movieId" });
    const logs = await SacnilkLog.find({ movieId }).sort({ runAt: -1 }).limit(30).lean();
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/sacnilk/scrape/:movieId ──────────────────────────────────
// Manual single-movie scrape trigger
app.post("/api/admin/sacnilk/scrape/:movieId", adminAuth, async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!isOid(movieId)) return res.status(400).json({ error: "Invalid movieId" });

    const result = await scrapeSacnilkForMovie(movieId);

    // Sacnilk hadn't updated yet — no new data, nothing saved, no blog published
    if (result.skipped) {
      return res.json({
        success:      true,
        skipped:      true,
        netCollection: "₹0",
        netRaw:        result.netRaw,
        grossRaw:      result.grossRaw,
        scrapedTotal:  result.scrapedTotal,
        day:           null,
        date:          result.date,
        blogSlug:      "",
        message:       `⏭ Skipped — ${result.reason}`,
      });
    }

    res.json({
      success:       true,
      skipped:       false,
      netCollection: result.netRaw,   // legacy field kept for backwards compat
      netRaw:        result.netRaw,
      grossRaw:      result.grossRaw,
      scrapedTotal:  result.scrapedTotal,
      day:           result.day,
      date:          result.date,
      blogSlug:      result.blogSlug,
      message: `Day ${result.day} (${result.date}) — Net ${result.netRaw}, Gross ${result.grossRaw}. Blog: /blog/${result.blogSlug}`,
    });
  } catch (e) {
    // Log the failure
    try {
      const { movieId } = req.params;
      await SacnilkLog.create({ movieId, status: "error", error: e.message });
      // Update lastLog on config too
      await SacnilkConfig.findOneAndUpdate(
        { movieId },
        { $set: { "lastLog.runAt": new Date(), "lastLog.status": "error", "lastLog.error": e.message } }
      );
    } catch { /* silent */ }
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/sacnilk/scrape-all ──────────────────────────────────────
// Manual "scrape all active movies" — same logic as the cron job
app.post("/api/admin/sacnilk/scrape-all", adminAuth, async (req, res) => {
  try {
    const configs = await SacnilkConfig.find({ active: true, sacnilkUrl: { $ne: "" } }).lean();
    let successCount = 0, failCount = 0;
    const results = [];

    for (const cfg of configs) {
      try {
        const r = await scrapeSacnilkForMovie(String(cfg.movieId));
        successCount++;
        results.push({
          movieId:      cfg.movieId,
          movieTitle:   cfg.movieTitle,
          status:       "success",
          netRaw:       r.netRaw,
          grossRaw:     r.grossRaw,
          scrapedTotal: r.scrapedTotal,
          day:          r.day,
          date:         r.date,
          blogSlug:     r.blogSlug,
        });
      } catch (e) {
        failCount++;
        results.push({ movieId: cfg.movieId, movieTitle: cfg.movieTitle, status: "error", error: e.message });
        // Log failure
        try {
          await SacnilkLog.create({ movieId: cfg.movieId, status: "error", error: e.message });
          await SacnilkConfig.findOneAndUpdate(
            { movieId: cfg.movieId },
            { $set: { "lastLog.runAt": new Date(), "lastLog.status": "error", "lastLog.error": e.message } }
          );
        } catch { /* silent */ }
      }
      // Small delay between requests to avoid hammering Sacnilk
      await new Promise(r => setTimeout(r, 2000));
    }

    res.json({ success: successCount, failed: failCount, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ── Keep-alive ping endpoint — no DB, no auth, ultra-lightweight ─────────────
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});
// ─────────────────────────────────────────────────────────────────────────────

//  CRON JOB — runs every day at 8:00 AM IST (= 02:30 UTC)
//  Schedule format: "30 3 * * *"  (cron uses UTC; IST = UTC+5:30)
// ════════════════════════════════════════════════════════════════════════════
cron.schedule("30 6 * * *", async () => {
  console.log(`[Sacnilk Cron] Starting daily scrape at ${new Date().toISOString()}`);

  try {
    const configs = await SacnilkConfig.find({
      active:      true,
      sacnilkUrl:  { $ne: "" },
    }).lean();

    console.log(`[Sacnilk Cron] ${configs.length} active movie(s) to scrape`);

    for (const cfg of configs) {
      try {
        const r = await scrapeSacnilkForMovie(String(cfg.movieId));
        console.log(`[Sacnilk Cron] ✅ ${cfg.movieTitle}: Day ${r.day} = ${r.netRaw}`);
      } catch (e) {
        console.error(`[Sacnilk Cron] ❌ ${cfg.movieTitle}: ${e.message}`);
        // Log failure
        try {
          await SacnilkLog.create({ movieId: cfg.movieId, status: "error", error: e.message });
          await SacnilkConfig.findOneAndUpdate(
            { movieId: cfg.movieId },
            { $set: { "lastLog.runAt": new Date(), "lastLog.status": "error", "lastLog.error": e.message } }
          );
        } catch { /* silent */ }
      }
      // Polite delay between movies
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`[Sacnilk Cron] Finished at ${new Date().toISOString()}`);
  } catch (e) {
    console.error(`[Sacnilk Cron] Fatal error: ${e.message}`);
  }
}, {
  timezone: "Asia/Kolkata",
});

console.log("✅ Sacnilk cron scheduled: daily at 8:00 AM IST");



// ════════════════════════════════════════════════════════════════
// VISITOR ANALYTICS — PUBLIC + ADMIN ROUTES
// ════════════════════════════════════════════════════════════════

// POST /api/track — called by Next.js VisitorTracker component on every page view
app.post("/api/track", async (req, res) => {
  res.json({ ok: true }); // respond immediately, never block the user

  try {
    const ua  = req.headers["user-agent"] || "";
    const ip  = (req.headers["x-forwarded-for"] || "").split(",")[0].trim()
                || req.socket?.remoteAddress || "";
    const { page = "/", referrer = "" } = req.body;

    const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Tablet|PlayBook/i.test(ua);
    const device   = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

    const os = /Windows/i.test(ua)    ? "Windows"
             : /Android/i.test(ua)    ? "Android"
             : /iPhone|iPad/i.test(ua) ? "iOS"
             : /Mac/i.test(ua)         ? "macOS"
             : /Linux/i.test(ua)       ? "Linux" : "Other";

    const browser = /Edg\//i.test(ua)   ? "Edge"
                  : /OPR\//i.test(ua)   ? "Opera"
                  : /Chrome/i.test(ua)  ? "Chrome"
                  : /Firefox/i.test(ua) ? "Firefox"
                  : /Safari/i.test(ua)  ? "Safari" : "Other";

    let country = "", city = "";
    if (ip && ip !== "::1" && ip !== "127.0.0.1" && !ip.startsWith("::ffff:127")) {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, { signal: AbortSignal.timeout(2000) });
        const gd  = await geo.json();
        if (gd.status === "success") { country = gd.country || ""; city = gd.city || ""; }
      } catch { /* geo timeout */ }
    }

    await VisitorLog.create({ ip, country, city, device, os, browser, page, referrer, visitedAt: new Date() });
  } catch { /* never throw */ }
});

// GET /api/admin/analytics — full analytics dashboard data
app.get("/api/admin/analytics", adminAuth, async (req, res) => {
  try {
    const now   = new Date();
    const day   = new Date(now); day.setHours(0, 0, 0, 0);
    const week  = new Date(now); week.setDate(now.getDate() - 7);
    const month = new Date(now); month.setDate(now.getDate() - 30);

    const [
      totalVisits, todayVisits, weekVisits, monthVisits,
      byDevice, byOS, byBrowser, byCountry, topPages, recentVisits, dailyTrend,
    ] = await Promise.all([
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({ visitedAt: { $gte: day } }),
      VisitorLog.countDocuments({ visitedAt: { $gte: week } }),
      VisitorLog.countDocuments({ visitedAt: { $gte: month } }),

      VisitorLog.aggregate([{ $group: { _id: "$device",  count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorLog.aggregate([{ $group: { _id: "$os",      count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorLog.aggregate([{ $group: { _id: "$browser", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorLog.aggregate([
        { $match: { country: { $ne: "" } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      VisitorLog.aggregate([
        { $group: { _id: "$page", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      VisitorLog.find().sort({ visitedAt: -1 }).limit(50).lean(),
      VisitorLog.aggregate([
        { $match: { visitedAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$visitedAt", timezone: "Asia/Kolkata" } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      summary: { totalVisits, todayVisits, weekVisits, monthVisits },
      byDevice, byOS, byBrowser, byCountry, topPages, recentVisits, dailyTrend,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/analytics/clear — remove logs older than 90 days
app.delete("/api/admin/analytics/clear", adminAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await VisitorLog.deleteMany({ visitedAt: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Serve Vite frontend build (Render.com deployment) ──────────────
// "dist" is Vite's default output folder — make sure your build
// command is: cd frontend && npm run build  (or wherever your React app lives)
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback — any route that isn't /api/* gets index.html
// so React Router can handle /movie/abc, /song/xyz etc. on refresh
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
// ════════════════════════════════════════════════════════════════════════════

app.listen(process.env.PORT || 4000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);

  // ── Self-ping every 2 minutes to prevent Render free-tier spin-down ──────
  // Hits GET /api/ping — lightweight no-DB endpoint defined just above.
  // Set SELF_URL in your Render environment variables:
  //   SELF_URL = https://your-app-name.onrender.com
  const SELF_URL = process.env.SELF_URL;
  if (SELF_URL) {
    const PING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    setInterval(async () => {
      try {
        const res = await fetch(`${SELF_URL}/api/ping`);
        console.log(`[Keep-Alive] Ping → ${res.status} at ${new Date().toISOString()}`);
      } catch (e) {
        console.warn(`[Keep-Alive] Ping failed: ${e.message}`);
      }
    }, PING_INTERVAL_MS);
    console.log(`✅ Keep-alive self-ping active every 2 min → ${SELF_URL}/api/ping`);
  } else {
    console.log(`ℹ️  Keep-alive disabled — set SELF_URL env var to enable (e.g. https://your-app.onrender.com)`);
  }
  // ─────────────────────────────────────────────────────────────────────────
});
// ── KEEP-ALIVE PATCH — replace the last app.listen() above with this ────────
// (Already patched inline below — this comment is for reference only)