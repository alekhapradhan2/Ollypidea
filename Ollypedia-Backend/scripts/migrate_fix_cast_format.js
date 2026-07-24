/**
 * migrate_fix_cast_format.js
 * ──────────────────────────
 * One-time migration that finds and fixes malformed cast entries in Movie docs:
 *
 *  Pattern 1 — Comma-separated names in a single entry:
 *    { name: "Lipsa Mishra, Bikram, Manaswitni Pati", role: "Actor" }
 *    → 3 separate entries each with the same role/type
 *
 *  Pattern 2 — Role-prefixed name:
 *    { name: "singer:Assema Panda" }  or  { name: "Actor:Babushaan" }
 *    → { name: "Assema Panda", type: "Singer", role: "Singer" }
 *
 * Usage:
 *   node scripts/migrate_fix_cast_format.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌  MONGO_URI not in .env"); process.exit(1); }

// Map common role prefixes to canonical type labels
const ROLE_PREFIX_MAP = {
  actor:        "Actor",
  actress:      "Actor",
  director:     "Director",
  producer:     "Producer",
  singer:       "Singer",
  music:        "Music Director",
  "music director": "Music Director",
  composer:     "Music Director",
  writer:       "Writer",
  screenplay:   "Writer",
  story:        "Writer",
  lyricist:     "Lyricist",
  editor:       "Editor",
  cinematographer: "Cinematographer",
  dop:          "Cinematographer",
  "executive producer": "Producer",
};

function parseRolePrefix(rawName) {
  // Matches patterns like "singer:Assema Panda" or "Actor : Babushaan"
  const match = rawName.match(/^([a-zA-Z\s]+?)\s*:\s*(.+)$/);
  if (!match) return null;
  const prefix = match[1].trim().toLowerCase();
  const name   = match[2].trim();
  const type   = ROLE_PREFIX_MAP[prefix] || capitalize(prefix);
  return { name, type };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function expandCastEntry(entry) {
  const rawName = (entry.name || "").trim();
  if (!rawName) return [];

  const baseType = entry.type || "Actor";
  const baseRole = entry.role || "";
  const basePhoto = entry.photo || "";
  const baseCastId = entry.castId || undefined;

  const results = [];

  // Pattern 2: check for role:Name prefix first (before splitting by comma)
  const prefixParsed = parseRolePrefix(rawName);
  if (prefixParsed) {
    results.push({
      ...(baseCastId ? { castId: baseCastId } : {}),
      name:  prefixParsed.name,
      type:  prefixParsed.type,
      role:  prefixParsed.type, // role = type label for crew/singer etc.
      photo: basePhoto,
    });
    return results;
  }

  // Pattern 1: comma-separated names
  if (rawName.includes(",")) {
    const names = rawName.split(",").map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      // Each split name might itself have a role prefix
      const parsed = parseRolePrefix(name);
      if (parsed) {
        results.push({
          name:  parsed.name,
          type:  parsed.type,
          role:  parsed.type,
          photo: basePhoto,
        });
      } else {
        results.push({
          name,
          type:  baseType,
          role:  baseRole || baseType,
          photo: basePhoto,
        });
      }
    }
    return results;
  }

  // No pattern matched — entry is fine, return as-is
  return [entry];
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  const moviesColl = mongoose.connection.collection("movies");
  const cursor = moviesColl.find({});

  let totalMovies = 0;
  let fixedMovies = 0;
  let totalEntriesBefore = 0;
  let totalEntriesAfter  = 0;

  for await (const movie of cursor) {
    totalMovies++;
    const originalCast = movie.cast || [];
    if (originalCast.length === 0) continue;

    let needsFix = false;

    // Check if any entry is malformed
    for (const entry of originalCast) {
      const name = (entry.name || "").trim();
      if (name.includes(",") || parseRolePrefix(name)) {
        needsFix = true;
        break;
      }
    }

    if (!needsFix) continue;

    // Expand all entries
    const newCast = [];
    for (const entry of originalCast) {
      const expanded = expandCastEntry(entry);
      newCast.push(...expanded);
    }

    // Deduplicate by name+type
    const seen = new Set();
    const dedupedCast = newCast.filter(e => {
      const key = `${(e.name || "").toLowerCase()}||${(e.type || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    totalEntriesBefore += originalCast.length;
    totalEntriesAfter  += dedupedCast.length;

    await moviesColl.updateOne(
      { _id: movie._id },
      { $set: { cast: dedupedCast } }
    );

    fixedMovies++;
    console.log(
      `  ✅ "${movie.title}" — cast: ${originalCast.length} entries → ${dedupedCast.length} entries`
    );

    // Show what changed for debugging
    for (const e of dedupedCast) {
      console.log(`       • [${e.type}] ${e.name} (${e.role})`);
    }
  }

  console.log("\n════════════════════════════════════════════");
  console.log(`🎬  Total movies scanned  : ${totalMovies}`);
  console.log(`🔧  Movies fixed          : ${fixedMovies}`);
  console.log(`📊  Cast entries before   : ${totalEntriesBefore}`);
  console.log(`📊  Cast entries after    : ${totalEntriesAfter}`);
  console.log("════════════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
