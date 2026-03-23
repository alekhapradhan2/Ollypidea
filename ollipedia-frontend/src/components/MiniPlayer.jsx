// MiniPlayer.jsx — Shows currently playing song bar (UI only, no audio)
// Audio is handled by SongDetail's own iframe
// Place in: src/components/MiniPlayer.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "op_now_playing";

export function getNowPlaying() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
export function setNowPlaying(track) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(track)); } catch {}
  window.dispatchEvent(new Event("op_now_playing_changed"));
}
export function clearNowPlaying() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  window.dispatchEvent(new Event("op_now_playing_changed"));
}
export function sendPlayerCommand() {}  // no-op, kept for import compatibility

const CSS = `
.mp-bar {
  position:fixed; bottom:0; left:0; right:0; z-index:500;
  background:linear-gradient(to right,rgba(8,6,0,.97),rgba(14,11,2,.97));
  border-top:1px solid rgba(201,151,58,.22);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  display:flex; align-items:center; gap:10px;
  padding:8px 14px 10px;
  transform:translateY(100%);
  transition:transform .35s cubic-bezier(.34,1.56,.64,1);
}
@media(min-width:480px){ .mp-bar { padding:8px 22px 10px; gap:14px; } }
.mp-bar.visible { transform:translateY(0); }
.mp-thumb { width:40px; height:40px; border-radius:6px; overflow:hidden; flex-shrink:0; background:#1a1a1a; border:1px solid rgba(201,151,58,.25); cursor:pointer; }
.mp-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.mp-thumb-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
.mp-info { flex:1; min-width:0; cursor:pointer; }
.mp-title { font-weight:700; font-size:.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; }
.mp-sub { font-size:.66rem; color:rgba(201,151,58,.8); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mp-prog { position:absolute; bottom:0; left:0; right:0; height:2px; background:rgba(255,255,255,.08); }
.mp-prog-fill { height:100%; background:linear-gradient(to right,#c9973a,#e8c87a); transition:width .8s linear; }
.mp-btn { width:36px; height:36px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform .15s,background .15s; font-size:.88rem; }
.mp-btn:hover { transform:scale(1.1); }
.mp-btn-play { background:var(--gold,#c9973a); color:#000; font-size:.95rem; }
.mp-btn-play:hover { background:#e8c87a; }
.mp-btn-sec { background:rgba(255,255,255,.1); color:#fff; }
.mp-btn-sec:hover { background:rgba(255,255,255,.18); }
.mp-btn-close { background:transparent; color:rgba(255,255,255,.35); font-size:.78rem; }
.mp-btn-close:hover { color:#fff; }
.mp-yt-link { font-size:.66rem; color:rgba(201,151,58,.65); text-decoration:none; font-weight:700; flex-shrink:0; padding:3px 5px; }
.mp-yt-link:hover { color:var(--gold,#c9973a); }
.mp-resume-hint { font-size:.6rem; color:rgba(255,255,255,.3); white-space:nowrap; flex-shrink:0; }
`;

export default function MiniPlayer() {
  const [track, setTrack] = useState(() => getNowPlaying());
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const onSongPage = pathname.startsWith("/song/");

  useEffect(() => {
    const onChange = () => setTrack(getNowPlaying());
    window.addEventListener("op_now_playing_changed", onChange);
    return () => window.removeEventListener("op_now_playing_changed", onChange);
  }, []);

  const goToSong = () => {
    if (!track) return;
    navigate(`/song/${track.movieSlug || track.movieId}/${track.songIdx || 0}`);
  };

  // Don't show bar when already on the song page, or no track
  if (!track || onSongPage) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="mp-bar visible">
        <div className="mp-prog">
          <div className="mp-prog-fill" style={{ width:"100%" }} />
        </div>

        <div className="mp-thumb" onClick={goToSong}>
          {track.thumb
            ? <img src={track.thumb} alt={track.title} onError={e=>e.target.style.display="none"} />
            : <div className="mp-thumb-ph">🎵</div>
          }
        </div>

        <div className="mp-info" onClick={goToSong}>
          <div className="mp-title">{track.title}</div>
          <div className="mp-sub">
            {track.singer && `🎤 ${track.singer}`}
            {track.singer && track.movieTitle && " · "}
            {track.movieTitle}
          </div>
        </div>

        <span className="mp-resume-hint">Tap to resume ▶</span>

        <button className="mp-btn mp-btn-play" onClick={goToSong} title="Go to song">
          ▶
        </button>

        {track.ytId && (
          <a href={`https://youtube.com/watch?v=${track.ytId}`}
            target="_blank" rel="noreferrer" className="mp-yt-link">YT↗</a>
        )}

        <button className="mp-btn mp-btn-close" onClick={() => { clearNowPlaying(); }} title="Close">✕</button>
      </div>
    </>
  );
}