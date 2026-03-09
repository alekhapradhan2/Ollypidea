# Ollipedia — Full Deployment Guide
## Stack: React (Vercel) + Node.js/Express + MongoDB Atlas

---

## STEP 1 — MongoDB Atlas (Free Database)

1. Go to https://mongodb.com/atlas → Sign up free
2. Create a new project → Build a Database → **M0 Free tier**
3. Choose a region close to India (e.g. Mumbai)
4. Create a **Database User**:
   - Username: `ollipedia_user`
   - Password: (generate a strong one, save it)
5. Under **Network Access** → Add IP Address → Allow access from anywhere: `0.0.0.0/0`
6. Click **Connect** on your cluster → **Drivers** → Copy the connection string:
   ```
   mongodb+srv://ollipedia_user:PASSWORD@cluster0.xxxxx.mongodb.net/ollipedia
   ```

---

## STEP 2 — Deploy Backend to Railway (Free)

Railway gives you a free backend server. Alternatively use Render.com.

### Option A: Railway
1. Go to https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo (push your backend folder first)
3. Add environment variables:
   ```
   MONGO_URI     = mongodb+srv://...your connection string...
   JWT_SECRET    = any_long_random_string_here_make_it_64_chars
   FRONTEND_URL  = https://your-app.vercel.app
   ```
4. Railway auto-detects Node.js and runs `npm start`
5. Copy your Railway URL: `https://ollipedia-backend.railway.app`

### Option B: Render.com (also free)
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add the same environment variables as above

---

## STEP 3 — Set up the Frontend (React + Vite)

### Create the Vite project
```bash
npm create vite@latest ollipedia-frontend -- --template react
cd ollipedia-frontend
npm install
```

### Add your files
- Copy `ollipedia-full.jsx` → rename to `src/App.jsx`
- Copy `api.js` → `src/api.js`
- Replace the `DB` object in `App.jsx` with calls to `api.js`

### Create .env file
```bash
# ollipedia-frontend/.env
VITE_API_URL=https://ollipedia-backend.railway.app/api
```

### Test locally
```bash
npm run dev
# Opens at http://localhost:5173
```

---

## STEP 4 — Deploy Frontend to Vercel (Free)

1. Push your frontend folder to GitHub
2. Go to https://vercel.com → Import project
3. Select your repo → Framework: **Vite**
4. Add environment variable:
   ```
   VITE_API_URL = https://ollipedia-backend.railway.app/api
   ```
5. Deploy → Get your URL: `https://ollipedia.vercel.app`

6. Go back to Railway → Update `FRONTEND_URL` = your Vercel URL
7. Redeploy backend

---

## STEP 5 — Swap DB layer in App.jsx

Replace the `DB` object at the top of `App.jsx` with API calls.

**Before (window.storage):**
```js
const movies = await DB.getMovies();
```

**After (real API):**
```js
import { API, setToken } from "./api";
const movies = await API.getMovies();
```

Key swaps:
| Old (window.storage)             | New (API)                              |
|----------------------------------|----------------------------------------|
| `DB.getMovies()`                 | `API.getMovies()`                      |
| `DB.getCast()`                   | `API.getCast()`                        |
| `DB.getNews()`                   | `API.getNews()`                        |
| Register form submit             | `API.register({...})` → `setToken(t)` |
| Login form submit                | `API.login(em,pw)` → `setToken(t)`    |
| `DB.setMovies(...)` (box office) | `API.updateBoxOffice(id, {...})`       |
| `DB.setMovies(...)` (cast)       | `API.updateCast(id, cast)`             |
| `DB.setMovies(...)` (media)      | `API.updateMedia(id, media)`           |
| `DB.setNews([...news, item])`    | `API.addNews(movieId, {...})`          |

---

## Local Development Setup

```bash
# Terminal 1 — Backend
cd ollipedia-backend
npm install
cp .env.example .env      # Fill in your MONGO_URI and JWT_SECRET
npm run dev               # Runs on http://localhost:4000

# Terminal 2 — Frontend
cd ollipedia-frontend
npm install
npm run dev               # Runs on http://localhost:5173
```

---

## Summary of Free Tier Limits

| Service      | Free Tier                          |
|--------------|------------------------------------|
| MongoDB Atlas | 512 MB storage, shared cluster    |
| Railway      | $5 credit/month (~500 hours)       |
| Render       | 750 hours/month, sleeps after 15min|
| Vercel       | Unlimited (for personal projects)  |

**Tip:** For production, use Render for the backend (always free) + Vercel frontend + MongoDB Atlas free tier. This covers a small to medium Ollywood database easily.

---

## Domain Setup (Optional)

1. Buy a domain from GoDaddy / Namecheap (~₹800/year for .in)
2. In Vercel → Settings → Domains → Add `ollipedia.in`
3. Update your DNS records as Vercel shows
4. Update `FRONTEND_URL` in Railway and redeploy backend
