const mongoose = require("mongoose");

// Normalize a title for fuzzy comparison:
// - lowercase
// - strip punctuation except alphanumeric and spaces
// - collapse multiple spaces
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0B00-\u0B7F\s]/g, " ") // keep Odia unicode chars too
    .replace(/\s+/g, " ")
    .trim();
}

// Check if two titles refer to the same movie using fuzzy matching:
// - Exact match after normalization (lowercase, punctuation stripped, spaces collapsed)
// - OR one normalized title starts with the other
//   e.g. "Dahan" matches "Dahan: The Ultimate" and vice versa
function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  // Prefix match — handles subtitle variants like "Dahan" vs "Dahan The Ultimate"
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  return false;
}

// Map a TMDB crew job string → clean type label stored in Movie.cast[].type
function crewTypeLabel(job) {
  const map = {
    "Director":                "Director",
    "Producer":                "Producer",
    "Executive Producer":      "Producer",
    "Screenplay":              "Writer",
    "Writer":                  "Writer",
    "Story":                   "Writer",
    "Music":                   "Music Director",
    "Original Music Composer": "Music Director",
    "Director of Photography": "Cinematographer",
    "Cinematographer":         "Cinematographer",
    "Editor":                  "Editor",
  };
  return map[job] || job;
}

async function runTmdbOdiaScraper(generateBlogCallback) {
  console.log("[TMDB] Starting TMDB Odia Movie Scraper...");
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.error("[TMDB] Error: TMDB_API_KEY is not defined in .env");
    return;
  }

  const Movie = mongoose.models.Movie;
  if (!Movie) {
    console.error("[TMDB] Error: Movie model not found!");
    return;
  }

  // ── FIX 1: Do NOT create a dummy production house.
  // productionId will remain null unless TMDB provides real production company data.

  const sixMonthsAgoDate = new Date();
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);
  const minDateStr = sixMonthsAgoDate.toISOString().split("T")[0];

  const todayStr = new Date().toISOString().split("T")[0];

  let page = 1;
  let totalPages = 1;
  let newCount = 0;
  let updateCount = 0;

  console.log(`[TMDB] Fetching Odia movies released since ${minDateStr}...`);

  while (page <= totalPages) {
    try {
      const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=or&primary_release_date.gte=${minDateStr}&sort_by=primary_release_date.desc&page=${page}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.results) break;

      totalPages = data.total_pages;

      for (const tmdbMovie of data.results) {
        const title = tmdbMovie.title || tmdbMovie.original_title;
        if (!title) continue;

        // Fetch detailed movie info including credits
        const detailUrl = `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,external_ids`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();

        // Map data to Ollipedia Movie schema
        const imdbId = detailData.external_ids?.imdb_id || "";
        const releaseDate = detailData.release_date || "";
        const isReleased = releaseDate !== "" && releaseDate <= todayStr;
        const status = isReleased ? "Released" : "Upcoming";
        const verdict = isReleased ? "Released" : "Upcoming";

        let posterUrl = "";
        if (detailData.poster_path) {
          posterUrl = `https://image.tmdb.org/t/p/w500${detailData.poster_path}`;
        }
        let bannerUrl = "";
        if (detailData.backdrop_path) {
          bannerUrl = `https://image.tmdb.org/t/p/w1280${detailData.backdrop_path}`;
        }

        const runtime = detailData.runtime ? `${detailData.runtime} min` : "";
        const synopsis = detailData.overview || "";

        // Extract genres
        const genre = (detailData.genres || []).map((g) => g.name);

        // ── FIX 3: Smarter movie deduplication ──────────────────────────────
        // Step 1: exact IMDB ID match
        let existingMovie = null;
        if (imdbId) {
          existingMovie = await Movie.findOne({ imdbId });
        }

        // Step 2: exact title + release date match
        if (!existingMovie && title && releaseDate) {
          existingMovie = await Movie.findOne({
            title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            releaseDate: releaseDate,
          });
        }

        // Step 3: fuzzy / normalized title match against all movies
        // (catches "Dahan" vs "Dahan: The Ultimate", subtitle variants, etc.)
        if (!existingMovie) {
          // Pull candidates whose title has at least partial text overlap
          const normalizedIncoming = normalizeTitle(title);
          // Use a loose regex to limit DB scan (first significant word)
          const firstWord = normalizedIncoming.split(" ")[0];
          const candidates = await Movie.find({
            title: new RegExp(firstWord, "i"),
          }).select("_id title releaseDate");

          for (const candidate of candidates) {
            if (titlesMatch(title, candidate.title)) {
              existingMovie = await Movie.findById(candidate._id);
              if (existingMovie) {
                console.log(
                  `[TMDB] Fuzzy match: "${title}" → existing "${candidate.title}"`
                );
                break;
              }
            }
          }
        }
        // ────────────────────────────────────────────────────────────────────

        const movieData = {
          title,
          language: "Odia",
          releaseDate,
          status,
          verdict,
          synopsis,
          runtime,
          imdbId,
          genre: genre.length > 0 ? genre : ["Drama"],
        };

        if (posterUrl) {
          movieData.posterUrl = posterUrl;
          movieData.thumbnailUrl = posterUrl;
        }
        if (bannerUrl) {
          movieData.bannerUrl = bannerUrl;
        }

        // ── Extract cast & crew from TMDB credits ─────────────────────────────
        let director = "";
        // Both actors AND crew go into the same cast[] array.
        // Movie schema has no separate "crew" field — type distinguishes them.
        const allCastEntries = [];

        if (detailData.credits) {
          // Crew first
          if (detailData.credits.crew) {
            for (const member of detailData.credits.crew) {
              if (member.job === "Director") director = member.name;
              const keyRoles = [
                "Director", "Producer", "Executive Producer",
                "Screenplay", "Writer", "Story",
                "Music", "Original Music Composer",
                "Director of Photography", "Cinematographer", "Editor",
              ];
              if (keyRoles.includes(member.job)) {
                allCastEntries.push({
                  name:  member.name,
                  photo: member.profile_path
                    ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : "",
                  type:  crewTypeLabel(member.job),
                  role:  member.job,
                  tmdbId: String(member.id),
                });
              }
            }
          }

          // Cast actors (top 20 billed)
          if (detailData.credits.cast) {
            for (const member of detailData.credits.cast.slice(0, 20)) {
              allCastEntries.push({
                name:  member.name,
                photo: member.profile_path
                  ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : "",
                type:  "Actor",
                role:  member.character || "Actor",
                tmdbId: String(member.id),
              });
            }
          }
        }

        if (director) movieData.director = director;

        // Deduplicate and resolve castIds: same person + same role → keep first occurrence only.
        const Cast = mongoose.models.Cast;
        const seen = new Set();
        const dedupedCast = [];
        for (const e of allCastEntries) {
          const key = `${(e.name || "").toLowerCase()}||${(e.type || "").toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          
          let castDoc = null;
          if (e.tmdbId) {
             castDoc = await Cast.findOne({ tmdbId: e.tmdbId });
          }
          if (!castDoc) {
             const nameEscaped = e.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
             const nameRegex = new RegExp(`^${nameEscaped}$`, "i");
             castDoc = await Cast.findOne({ $or: [{ name: nameRegex }, { aliases: nameRegex }] });
          }
          
          if (!castDoc) {
             const rolesArr = e.type ? e.type.split(",").map(r => r.trim()).filter(Boolean) : ["Actor"];
             castDoc = await Cast.create({ name: e.name, type: rolesArr[0], roles: rolesArr, photo: e.photo, tmdbId: e.tmdbId });
          } else {
             let needsSave = false;
             if (e.photo && !castDoc.photo) {
                 castDoc.photo = e.photo;
                 needsSave = true;
             }
             if (e.tmdbId && castDoc.tmdbId !== e.tmdbId) {
                 castDoc.tmdbId = e.tmdbId;
                 needsSave = true;
             }
             if (needsSave) await castDoc.save();
          }
          e.castId = castDoc._id;
          dedupedCast.push(e);
        }
        // ──────────────────────────────────────────────────────────────────────

        // Extract youtube videos (Trailer, Teaser, Clip/Glimpse)
        const tmdbVideos = [];
        if (detailData.videos && detailData.videos.results) {
          for (const v of detailData.videos.results) {
            if (v.site === "YouTube") {
              let mappedType = null;
              if (v.type === "Trailer") mappedType = "Trailer";
              else if (v.type === "Teaser") mappedType = "Teaser";
              else if (v.type === "Clip" || v.type === "Featurette")
                mappedType = "Glimpse";

              if (mappedType) {
                tmdbVideos.push({
                  ytId: v.key,
                  url: `https://www.youtube.com/watch?v=${v.key}`,
                  thumbnailUrl: `https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`,
                  type: mappedType,
                });
              }
            }
          }
        }

        // Merge with existing videos to prevent overwriting manual entries
        let finalVideos = [];
        if (
          existingMovie &&
          existingMovie.media &&
          Array.isArray(existingMovie.media.videos)
        ) {
          finalVideos = [...existingMovie.media.videos];
        }

        let videosAdded = false;
        for (const tv of tmdbVideos) {
          if (!finalVideos.some((fv) => fv.ytId === tv.ytId)) {
            finalVideos.push(tv);
            videosAdded = true;
          }
        }

        if (videosAdded || (!existingMovie && finalVideos.length > 0)) {
          movieData["media.videos"] = finalVideos;
        }

        if (existingMovie) {
          // Update existing movie.
          // Always overwrite director + cast (cast includes crew entries by type).
          // Also $unset the old "crew" field that may have been written by earlier
          // scraper versions — it doesn't exist in the Movie schema and confuses
          // the frontend cast/crew tables.
          const updatePayload = {
            $set:   { ...movieData },
            $unset: { crew: "" },   // remove stale crew field from old scraper runs
          };

          // Cast array: Merge dedupedCast with existing cast (crew + actors together)
          if (dedupedCast.length > 0) {
            let finalCast = [];
            if (existingMovie.cast && Array.isArray(existingMovie.cast)) {
               // Clone existing cast objects to avoid mongoose document mutation issues
               finalCast = existingMovie.cast.map(c => c.toObject ? c.toObject() : c);
            }
            
            for (const newC of dedupedCast) {
                let matchedIndex = finalCast.findIndex(extC => {
                    // Match by IDs if available
                    if (newC.castId && extC.castId && newC.castId.toString() === extC.castId.toString()) return true;
                    if (newC.tmdbId && extC.tmdbId && String(newC.tmdbId) === String(extC.tmdbId)) return true;
                    
                    // Match by fuzzy name and role
                    const normNew = normalizeTitle(newC.name || "");
                    const normExt = normalizeTitle(extC.name || "");
                    
                    const nameMatch = normNew && normExt && (normNew === normExt || normNew.includes(normExt) || normExt.includes(normNew));
                    
                    const roleMatch = ((newC.type || "").toLowerCase() === (extC.type || "").toLowerCase()) ||
                                      ((newC.role || "").toLowerCase() === (extC.role || "").toLowerCase());
                                      
                    return nameMatch && roleMatch;
                });
                
                if (matchedIndex >= 0) {
                    // Update photo if missing in DB but available from TMDB
                    if (newC.photo && !finalCast[matchedIndex].photo) {
                        finalCast[matchedIndex].photo = newC.photo;
                    }
                    if (newC.tmdbId && !finalCast[matchedIndex].tmdbId) {
                        finalCast[matchedIndex].tmdbId = newC.tmdbId;
                    }
                    if (newC.castId && !finalCast[matchedIndex].castId) {
                        finalCast[matchedIndex].castId = newC.castId;
                    }
                } else {
                    // Add new cast/crew
                    finalCast.push(newC);
                }
            }
            updatePayload.$set.cast = finalCast;
          }

          await Movie.findByIdAndUpdate(existingMovie._id, updatePayload);
          
          // Also update each Cast profile's 'movies' array so the movie shows on their profile
          for (const c of dedupedCast) {
            if (c.castId) {
              await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: existingMovie._id } });
            }
          }
          console.log(`[TMDB] Updated: ${title} (${releaseDate})`);
          updateCount++;
        } else {
          // Create new movie — ── FIX 1: never attach a fake productionId ──
          // productionId is intentionally omitted; only set if TMDB returns
          // a real production company that maps to an Ollipedia Production doc.
          const newMovie = await Movie.create(movieData);
          
          for (const c of dedupedCast) {
            if (c.castId) {
              await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: newMovie._id } });
            }
          }
          console.log(`[TMDB] Created: ${title} (${releaseDate})`);
          newCount++;

          if (typeof generateBlogCallback === "function") {
            try {
              console.log(
                `[TMDB] Generating blog for new movie: ${title}...`
              );
              // Slight delay to prevent rate limits on the AI provider
              await new Promise((r) => setTimeout(r, 2500));
              await generateBlogCallback(newMovie);
              console.log(
                `[TMDB] ✅ Successfully generated blog for: ${title}`
              );
            } catch (err) {
              console.error(
                `[TMDB] ❌ Failed to generate blog for ${title}:`,
                err
              );
            }
          }
        }
      }

      page++;
      // Sleep slightly to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[TMDB] Error on page ${page}:`, err);
      break;
    }
  }

  console.log(
    `[TMDB] Scrape complete. Created: ${newCount}, Updated: ${updateCount}`
  );
}

module.exports = { runTmdbOdiaScraper };
