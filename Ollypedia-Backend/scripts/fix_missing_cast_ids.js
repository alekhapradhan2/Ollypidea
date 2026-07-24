const mongoose = require("mongoose");
require("dotenv").config();

// Assuming your models are in server.js, but since server.js isn't easily exportable without starting the server,
// we will just redefine the bare minimum schemas needed to fix the data.
const CastSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, default: "Actor" },
  roles: [{ type: String }],
  photo: { type: String, default: "" },
});
const Cast = mongoose.model("Cast", CastSchema);

const CastEntrySchema = new mongoose.Schema({
  castId: { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
  name: { type: String, default: "" },
  photo: { type: String, default: "" },
  type: { type: String, default: "Actor" },
  role: { type: String, default: "" },
}, { _id: false });

const MovieSchema = new mongoose.Schema({
  title: String,
  cast: [CastEntrySchema]
}, { strict: false });
const Movie = mongoose.model("Movie", MovieSchema);

async function fixMissingCastIds() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  const movies = await Movie.find({});
  let moviesUpdated = 0;
  let castCreated = 0;
  let castResolved = 0;

  for (const movie of movies) {
    let needsUpdate = false;
    const updatedCast = [];

    if (!Array.isArray(movie.cast)) continue;

    for (const entry of movie.cast) {
      if (!entry.castId) {
        needsUpdate = true;
        
        const nameEscaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let castDoc = await Cast.findOne({ name: new RegExp(`^${nameEscaped}$`, "i") });

        if (!castDoc) {
          const rolesArr = entry.type ? entry.type.split(",").map(r => r.trim()).filter(Boolean) : ["Actor"];
          castDoc = await Cast.create({ 
            name: entry.name, 
            type: rolesArr[0], 
            roles: rolesArr, 
            photo: entry.photo 
          });
          castCreated++;
        } else {
          castResolved++;
        }

        updatedCast.push({
          castId: castDoc._id,
          name: entry.name,
          photo: entry.photo || castDoc.photo,
          type: entry.type,
          role: entry.role
        });
      } else {
        updatedCast.push(entry);
      }
    }

    if (needsUpdate) {
      // Overwrite the cast array
      await Movie.findByIdAndUpdate(movie._id, { $set: { cast: updatedCast } }, { strict: false });
      console.log(`Updated movie: ${movie.title} (Resolved: ${castResolved}, Created: ${castCreated} so far)`);
      moviesUpdated++;
    }
  }

  console.log("-----------------------------------------");
  console.log(`Finished!`);
  console.log(`Movies updated: ${moviesUpdated}`);
  console.log(`Cast missing IDs resolved to existing profiles: ${castResolved}`);
  console.log(`New Cast profiles created: ${castCreated}`);
  console.log("-----------------------------------------");

  await mongoose.disconnect();
}

fixMissingCastIds().catch(err => {
  console.error("Error:", err);
  mongoose.disconnect();
});
