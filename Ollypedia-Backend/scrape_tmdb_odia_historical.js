/**
 * scrape_tmdb_odia_historical.js
 * ──────────────────────────────
 * Standalone one-time / on-demand scraper.
 * Fetches ALL Odia-language movies from TMDB (1936 → 2025) and:
 *
 *  MOVIE UPDATES (never touches box office):
 *   ✓ Poster & banner (overwrite always if TMDB has one)
 *   ✓ Director, producer (always overwrite from TMDB)
 *   ✓ Cast & crew entries on the movie (always overwrite)
 *   ✓ Release date, runtime, genre, synopsis, imdbId
 *   ✓ Content rating / certification
 *   ✗ boxOffice, boxOfficeDays — NEVER touched
 *
 *  CAST PROFILE UPDATES (Cast collection):
 *   ✓ Photo (profile image) — always overwrite if TMDB has one
 *   ✓ DOB, gender, location — always overwrite if TMDB has a value
 *   ✓ Bio/about — only overwrite if TMDB bio is LONGER than existing DB bio
 *
 *  DUPLICATE DETECTION (same as live scraper):
 *   1. IMDB ID match (most reliable)
 *   2. Exact normalised title + release year match
 *   3. Fuzzy prefix match (e.g. "Dahan" ↔ "Dahan: The Ultimate")
 *   → Never creates a duplicate; only updates found existing record
 *
 * Usage:
 *   node scrape_tmdb_odia_historical.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0B00-\u0B7F\s]/g, " ") // keep Odia unicode
    .replace(/\s+/g, " ")
    .trim();
}

function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  return false;
}

// ─── inline minimal schemas (mirrors server.js) ───────────────────────────────

const VideoSchema = new mongoose.Schema({
  ytId:         { type: String, default: "" },
  url:          { type: String, default: "" },
  thumbnailUrl: { type: String, default: "" },
  type:         { type: String, default: "Trailer", enum: ["Trailer","Teaser","Glimpse","First Look","Motion Poster"] },
}, { _id: false });

const CastEntrySchema = new mongoose.Schema({
  castId: { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
  name:   { type: String, default: "" },
  photo:  { type: String, default: "" },
  type:   { type: String, default: "Actor" },
  role:   { type: String, default: "" },
}, { _id: false });

// Cast public profile
const CastSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  type:      { type: String, default: "Actor" },
  roles:     [{ type: String }],
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

const MovieSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  category:     { type: String, default: "Feature Film" },
  genre:        [{ type: String }],
  releaseDate:  { type: String, default: "" },
  director:     { type: String, default: "" },
  producer:     { type: String, default: "" },
  language:     { type: String, default: "Odia" },
  synopsis:     { type: String, default: "" },
  posterUrl:    { type: String, default: "" },
  thumbnailUrl: { type: String, default: "" },
  bannerUrl:    { type: String, default: "" },
  runtime:      { type: String, default: "" },
  imdbId:       { type: String, default: "" },
  imdbRating:   { type: String, default: "" },
  imdbVotes:    { type: String, default: "" },
  contentRating:{ type: String, default: "" },
  productionId: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
  collaborators:[{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],
  cast:         [CastEntrySchema],
  media: {
    videos: [VideoSchema],
    songs:  [],
  },
  // boxOffice fields intentionally omitted — never touched by this scraper
  verdict:      { type: String, default: "Upcoming" },
  status:       { type: String, default: "Upcoming" },
  slug:         { type: String, default: "" },
  streamingOn:  { type: String, default: "" },
  streamingUrl: { type: String, default: "" },
  ottReleaseDate:{ type: String, default: "" },
}, { timestamps: true, strict: false }); // strict:false so unknown fields don't error

// ─── main ─────────────────────────────────────────────────────────────────────

// Map a TMDB crew job string → clean type label used in Movie.cast[].type
function crewTypeLabel(job) {
  const map = {
    "Director":                  "Director",
    "Producer":                  "Producer",
    "Executive Producer":        "Producer",
    "Screenplay":                "Writer",
    "Writer":                    "Writer",
    "Story":                     "Writer",
    "Music":                     "Music Director",
    "Original Music Composer":   "Music Director",
    "Director of Photography":   "Cinematographer",
    "Cinematographer":           "Cinematographer",
    "Editor":                    "Editor",
  };
  return map[job] || job;
}

async function main() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) { console.error("❌  TMDB_API_KEY not set in .env"); process.exit(1); }

  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) { console.error("❌  MONGO_URI not set in .env"); process.exit(1); }

  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  // Use existing models if server already registered them, otherwise register locally
  const Movie = mongoose.models.Movie || mongoose.model("Movie", MovieSchema);
  const Cast  = mongoose.models.Cast  || mongoose.model("Cast",  CastSchema);

  const todayStr = new Date().toISOString().split("T")[0];

  let totalMovies = 0;
  let updatedMovies = 0;
  let skippedMovies = 0; // in TMDB but not in our DB
  let castUpdated = 0;

  // ── Iterate years 1936 → 2025 ─────────────────────────────────────────────
  for (let year = 1936; year <= 2025; year++) {
    const minDate = `${year}-01-01`;
    const maxDate = `${year}-12-31`;
    let page = 1;
    let totalPages = 1;

    console.log(`\n📅  Processing year ${year}...`);

    while (page <= totalPages) {
      try {
        const url =
          `https://api.themoviedb.org/3/discover/movie` +
          `?api_key=${TMDB_API_KEY}` +
          `&with_original_language=or` +
          `&primary_release_date.gte=${minDate}` +
          `&primary_release_date.lte=${maxDate}` +
          `&sort_by=primary_release_date.asc` +
          `&page=${page}`;

        const res  = await fetch(url);
        const data = await res.json();
        if (!data.results || data.results.length === 0) break;
        totalPages = Math.min(data.total_pages, 500); // TMDB hard-limit is 500

        for (const tmdbMovie of data.results) {
          totalMovies++;
          const title = tmdbMovie.title || tmdbMovie.original_title;
          if (!title) continue;

          // ── Fetch full detail + credits + releases (for certification) ──────
          const detailUrl =
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}` +
            `?api_key=${TMDB_API_KEY}` +
            `&append_to_response=credits,external_ids,release_dates`;

          const detailRes  = await fetch(detailUrl);
          const detailData = await detailRes.json();
          await sleep(80); // gentle rate-limiting

          const imdbId      = detailData.external_ids?.imdb_id || "";
          const releaseDate = detailData.release_date || "";
          const isReleased  = releaseDate !== "" && releaseDate <= todayStr;
          const status      = isReleased ? "Released" : "Upcoming";
          const verdict     = isReleased ? "Released" : "Upcoming";
          const runtime     = detailData.runtime ? `${detailData.runtime} min` : "";
          const synopsis    = detailData.overview || "";
          const genre       = (detailData.genres || []).map(g => g.name);

          // Certification (content rating) — prefer India, fallback US
          let contentRating = "";
          if (detailData.release_dates?.results) {
            const inRelease = detailData.release_dates.results;
            const preferred = ["IN", "US"];
            for (const cc of preferred) {
              const entry = inRelease.find(r => r.iso_3166_1 === cc);
              if (entry) {
                const cert = entry.release_dates?.find(d => d.certification)?.certification;
                if (cert) { contentRating = cert; break; }
              }
            }
          }

          let posterUrl = detailData.poster_path
            ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}` : "";
          let bannerUrl = detailData.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${detailData.backdrop_path}` : "";

          // ── Credits ─────────────────────────────────────────────────────────
          let director = "";
          let producer = "";
          const KEY_CREW_ROLES = [
            "Director","Producer","Executive Producer",
            "Screenplay","Writer","Story",
            "Music","Original Music Composer",
            "Director of Photography","Cinematographer","Editor",
          ];
          const tmdbCrew = []; // { name, role, tmdbId, profilePath }
          const tmdbCast = []; // { name, character, tmdbId, profilePath, order }

          if (detailData.credits?.crew) {
            for (const m of detailData.credits.crew) {
              if (m.job === "Director" && !director) director = m.name;
              if ((m.job === "Producer" || m.job === "Executive Producer") && !producer) producer = m.name;
              if (KEY_CREW_ROLES.includes(m.job)) {
                tmdbCrew.push({ name: m.name, role: m.job, tmdbId: m.id, profilePath: m.profile_path });
              }
            }
          }
          if (detailData.credits?.cast) {
            for (const m of detailData.credits.cast.slice(0, 20)) {
              tmdbCast.push({
                name: m.name,
                character: m.character || "Actor",
                tmdbId: m.id,
                profilePath: m.profile_path,
                order: m.order,
              });
            }
          }

          // ── Find existing movie in DB ────────────────────────────────────────
          let existingMovie = null;

          // Step 1: IMDB ID
          if (imdbId) existingMovie = await Movie.findOne({ imdbId }).lean();

          // Step 2: exact title + release date
          if (!existingMovie && title && releaseDate) {
            const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            existingMovie = await Movie.findOne({
              title: new RegExp(`^${escaped}$`, "i"),
              releaseDate,
            }).lean();
          }

          // Step 3: fuzzy title match (prefix / normalised)
          if (!existingMovie) {
            const firstWord = normalizeTitle(title).split(" ")[0];
            if (firstWord.length >= 3) { // skip single/double-char words to avoid false hits
              const candidates = await Movie.find({
                title: new RegExp(firstWord, "i"),
              }).select("_id title releaseDate").lean();

              for (const c of candidates) {
                if (titlesMatch(title, c.title)) {
                  existingMovie = await Movie.findById(c._id).lean();
                  if (existingMovie) {
                    console.log(`  🔀 Fuzzy: TMDB "${title}" (${releaseDate}) → DB "${c.title}" (${c.releaseDate})`);
                    break;
                  }
                }
              }
            }
          }

          // ── Only update if found in DB — this scraper NEVER creates new docs ─
          if (!existingMovie) {
            // Not in our DB — skip silently (historical data may have many we don't have)
            skippedMovies++;
            continue;
          }

          // ── Build update payload — NEVER touch box office fields ─────────────
          const $set = {};

          // Core fields — always overwrite with TMDB data
          if (releaseDate)    $set.releaseDate  = releaseDate;
          if (runtime)        $set.runtime      = runtime;
          if (synopsis)       $set.synopsis     = synopsis;
          if (genre.length)   $set.genre        = genre;
          if (imdbId)         $set.imdbId       = imdbId;
          if (status)         $set.status       = status;
          if (verdict)        $set.verdict      = verdict;
          if (director)       $set.director     = director;
          if (producer)       $set.producer     = producer;
          if (contentRating)  $set.contentRating = contentRating;
          if (posterUrl)    { $set.posterUrl = posterUrl; $set.thumbnailUrl = posterUrl; }
          if (bannerUrl)      $set.bannerUrl    = bannerUrl;

          // ── Update Cast profiles in Cast collection & build cast array ────────
          const newCastEntries = [];

          for (const member of [...tmdbCast, ...tmdbCrew]) {
            const isCrew = tmdbCrew.includes(member);
            const memberRole = isCrew ? member.role : member.character;

            // Try to find the Cast doc by tmdbId, exact name, or aliases
            let castDoc = null;
            if (member.tmdbId) {
                castDoc = await Cast.findOne({ tmdbId: String(member.tmdbId) });
            }
            if (!castDoc) {
                const nameEscaped = member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const nameRegex = new RegExp(`^${nameEscaped}$`, "i");
                castDoc = await Cast.findOne({ $or: [{ name: nameRegex }, { aliases: nameRegex }] });
            }

            const tmdbProfileUrl = member.profilePath
              ? `https://image.tmdb.org/t/p/w185${member.profilePath}` : "";

            if (castDoc) {
              // ── Update Cast profile fields ─────────────────────────────────
              const castUpdate = {};

              // Photo — always overwrite if TMDB has one
              if (tmdbProfileUrl && tmdbProfileUrl !== castDoc.photo) {
                castUpdate.photo = tmdbProfileUrl;
              }

              // tmdbId - save if missing
              if (member.tmdbId && castDoc.tmdbId !== String(member.tmdbId)) {
                castUpdate.tmdbId = String(member.tmdbId);
              }

              // Fetch person details from TMDB for DOB, place of birth, biography
              if (member.tmdbId) {
                try {
                  const personRes  = await fetch(
                    `https://api.themoviedb.org/3/person/${member.tmdbId}?api_key=${TMDB_API_KEY}`
                  );
                  const personData = await personRes.json();
                  await sleep(60);

                  // DOB — overwrite if TMDB has value
                  if (personData.birthday && personData.birthday !== castDoc.dob) {
                    castUpdate.dob = personData.birthday;
                  }

                  // Location (place_of_birth) — overwrite if TMDB has value
                  if (personData.place_of_birth && personData.place_of_birth !== castDoc.location) {
                    castUpdate.location = personData.place_of_birth;
                  }

                  // Gender
                  if (personData.gender) {
                    const genderStr = personData.gender === 1 ? "Female" : personData.gender === 2 ? "Male" : "";
                    if (genderStr && genderStr !== castDoc.gender) {
                      castUpdate.gender = genderStr;
                    }
                  }

                  // Bio — only overwrite if TMDB bio is LONGER than our current bio
                  const tmdbBio = (personData.biography || "").trim();
                  const dbBio   = (castDoc.bio || "").trim();
                  if (tmdbBio && tmdbBio.length > dbBio.length) {
                    castUpdate.bio = tmdbBio;
                  }
                } catch (personErr) {
                  // Non-fatal: person detail fetch failed, skip bio/dob update
                }
              }

              if (Object.keys(castUpdate).length > 0) {
                await Cast.findByIdAndUpdate(castDoc._id, { $set: castUpdate });
                castUpdated++;
              }

              // Both cast actors AND crew go into Movie.cast[] —
              // the Movie schema has no separate "crew" field.
              // Use `type` to distinguish (Actor vs Director vs Producer etc.)
              newCastEntries.push({
                castId: castDoc._id,
                name:   castDoc.name,
                photo:  tmdbProfileUrl || castDoc.photo || "",
                type:   isCrew ? crewTypeLabel(member.role) : ((castDoc.roles && castDoc.roles.length > 0) ? castDoc.roles[0] : (castDoc.type || "Actor")),
                role:   isCrew ? member.role : member.character,
              });
            } else {
              // Not in our Cast collection — create it!
              const typeStr = isCrew ? crewTypeLabel(member.role) : "Actor";
              const rolesArr = typeStr.split(",").map(r => r.trim()).filter(Boolean);
              castDoc = await Cast.create({ 
                name: member.name, 
                type: rolesArr[0] || "Actor", 
                roles: rolesArr.length ? rolesArr : ["Actor"], 
                photo: tmdbProfileUrl,
                tmdbId: member.tmdbId ? String(member.tmdbId) : ""
              });
              newCastEntries.push({
                castId: castDoc._id,
                name:  member.name,
                photo: tmdbProfileUrl,
                type:  typeStr,
                role:  isCrew ? member.role : member.character,
              });
            }
          }

          // Deduplicate: same person + same role → keep first occurrence only.
          // Different roles for same person (e.g. Actor + Director) → keep both.
          const seen = new Set();
          const dedupedCast = newCastEntries.filter(e => {
            const key = `${(e.name || "").toLowerCase()}||${(e.type || "").toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Fully replace cast[] with TMDB data — removes any stale/wrong entries from DB.
          if (dedupedCast.length > 0) {
            $set.cast = dedupedCast;
          }

          await Movie.findByIdAndUpdate(existingMovie._id, { $set });
          
          for (const c of dedupedCast) {
            if (c.castId) {
              await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: existingMovie._id } });
            }
          }
          
          updatedMovies++;
          console.log(`  ✅ Updated: "${existingMovie.title}" (DB) ← TMDB "${title}" (${releaseDate})`);
        }

        page++;
        await sleep(150); // between pages

      } catch (pageErr) {
        console.error(`  ❌ Error on year ${year}, page ${page}:`, pageErr.message);
        page++; // skip broken page, continue
        await sleep(500);
      }
    }
  }

  console.log("\n════════════════════════════════════════════");
  console.log(`🎬  Total TMDB results processed : ${totalMovies}`);
  console.log(`✅  Movies updated in DB          : ${updatedMovies}`);
  console.log(`⏭️   Not in DB (skipped)           : ${skippedMovies}`);
  console.log(`👤  Cast profiles updated         : ${castUpdated}`);
  console.log("════════════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
