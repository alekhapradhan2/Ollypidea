const express = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const path     = require("path");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

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
  user:   { type: String, default: "Anonymous" },
  rating: Number,
  text:   String,
  date:   String,
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
  verdict:  { type: String, default: "Upcoming" },
  status:   { type: String, default: "Upcoming" },
  reviews:  [ReviewSchema],
  news:     [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
  slug:     { type: String, default: "", index: true },
  interestedYes: { type: Number, default: 0 },
  interestedNo:  { type: Number, default: 0 },   // SEO slug e.g. "bindusagar-2026"
}, { timestamps: true });

const NewsSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
  movieTitle: { type: String, default: "" },
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  category:   { type: String, default: "Update" },
  imageUrl:   { type: String, default: "" },
  published:  { type: Boolean, default: true },
}, { timestamps: true });

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
    const allowed = ["title","category","genre","releaseDate","releaseTBA","director","producer","budget","language","synopsis","posterUrl","thumbnailUrl","verdict","status"];
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
    const adminProd = await getAdminProd();
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

    // Parse productions
    let prods = b.productions || [];
    if (typeof prods === "string") { try { prods = JSON.parse(prods); } catch { prods = []; } }
    const validProdId = Array.isArray(prods) && prods.length > 0 && isOid(String(prods[0]))
      ? String(prods[0]) : String(adminProd._id);
    const collabIds = Array.isArray(prods) ? prods.slice(1).filter(id => isOid(String(id))).map(String) : [];

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
      "imdbId","imdbRating","imdbVotes","contentRating","runtime","bannerUrl"];
    scalars.forEach(k => { if (b[k] !== undefined) update[k] = b[k]; });
    if (b.verdict) update.status = b.verdict === "Upcoming" ? "Upcoming" : "Released";
    if (b.boxOffice) update.boxOffice = b.boxOffice;

    // Productions → productionId + collaborators
    if (b.productions && Array.isArray(b.productions) && b.productions.length > 0) {
      const validProds = b.productions.filter(id => isOid(String(id))).map(String);
      if (validProds.length > 0) {
        update.productionId  = validProds[0];
        update.collaborators = validProds.slice(1);
      }
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
// ────────────────────────────────────────────────────────────────────

app.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
);