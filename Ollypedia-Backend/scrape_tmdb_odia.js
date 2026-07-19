const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

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
  const Production = mongoose.models.Production;

  // Find or create auto-import production
  let productionId = null;
  if (Production) {
    let prod = await Production.findOne({ name: "Ollipedia Auto-Import" });
    if (!prod) {
      prod = await Production.create({
        name: "Ollipedia Auto-Import",
        email: "auto@ollypedia.in",
        password: "auto",
        bio: "Auto-synced from TMDB."
      });
    }
    productionId = prod._id;
  }

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

        // Fetch detailed movie info to get IMDB ID, runtime, and cast
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
        const genre = (detailData.genres || []).map(g => g.name);

        // Find existing movie
        let existingMovie = null;
        if (imdbId) {
          existingMovie = await Movie.findOne({ imdbId });
        }
        if (!existingMovie && title && releaseDate) {
          // Fallback title match
          existingMovie = await Movie.findOne({ 
            title: new RegExp(`^${title}$`, "i"),
            releaseDate: releaseDate
          });
        }
        if (!existingMovie) {
          // Broad title match
          existingMovie = await Movie.findOne({ title: new RegExp(`^${title}$`, "i") });
        }

        const movieData = {
          title,
          language: "Odia",
          releaseDate,
          status,
          verdict,
          synopsis,
          runtime,
          imdbId,
          genre: genre.length > 0 ? genre : ["Drama"], // default fallback
        };

        if (posterUrl) {
          movieData.posterUrl = posterUrl;
          movieData.thumbnailUrl = posterUrl;
        }
        if (bannerUrl) {
          movieData.bannerUrl = bannerUrl;
        }

        // Try extracting Director from TMDB credits
        let director = "";
        if (detailData.credits && detailData.credits.crew) {
          const dirObj = detailData.credits.crew.find(c => c.job === "Director");
          if (dirObj) director = dirObj.name;
        }
        if (director) movieData.director = director;

        // Extract youtube videos (Trailer, Teaser, Clip/Glimpse)
        const tmdbVideos = [];
        if (detailData.videos && detailData.videos.results) {
          for (const v of detailData.videos.results) {
            if (v.site === "YouTube") {
              let mappedType = null;
              if (v.type === "Trailer") mappedType = "Trailer";
              else if (v.type === "Teaser") mappedType = "Teaser";
              else if (v.type === "Clip" || v.type === "Featurette") mappedType = "Glimpse";

              if (mappedType) {
                tmdbVideos.push({
                  ytId: v.key,
                  url: `https://www.youtube.com/watch?v=${v.key}`,
                  thumbnailUrl: `https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`,
                  type: mappedType
                });
              }
            }
          }
        }

        // Merge with existing videos to prevent overwriting manual entries
        let finalVideos = [];
        if (existingMovie && existingMovie.media && Array.isArray(existingMovie.media.videos)) {
          finalVideos = [...existingMovie.media.videos];
        }

        let videosAdded = false;
        for (const tv of tmdbVideos) {
          if (!finalVideos.some(fv => fv.ytId === tv.ytId)) {
            finalVideos.push(tv);
            videosAdded = true;
          }
        }

        // Only update if we have new videos to add or it's a new movie
        if (videosAdded || (!existingMovie && finalVideos.length > 0)) {
          movieData["media.videos"] = finalVideos;
        }

        if (existingMovie) {
          // Update
          await Movie.findByIdAndUpdate(existingMovie._id, { $set: movieData });
          console.log(`[TMDB] Updated: ${title} (${releaseDate})`);
          updateCount++;
        } else {
          // Create
          if (productionId) {
            movieData.productionId = productionId;
          }
          const newMovie = await Movie.create(movieData);
          console.log(`[TMDB] Created: ${title} (${releaseDate})`);
          newCount++;

          if (typeof generateBlogCallback === 'function') {
            try {
              console.log(`[TMDB] Generating blog for new movie: ${title}...`);
              // Slight delay to prevent rate limits on the AI provider
              await new Promise(r => setTimeout(r, 2500));
              await generateBlogCallback(newMovie);
              console.log(`[TMDB] ✅ Successfully generated blog for: ${title}`);
            } catch (err) {
              console.error(`[TMDB] ❌ Failed to generate blog for ${title}:`, err);
            }
          }
        }
      }
      
      page++;
      // Sleep slightly to respect rate limits
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.error(`[TMDB] Error on page ${page}:`, err);
      break;
    }
  }

  console.log(`[TMDB] Scrape complete. Created: ${newCount}, Updated: ${updateCount}`);
}

module.exports = { runTmdbOdiaScraper };
