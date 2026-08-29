const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-FzR8z_fe.js","assets/index-o_aEDcv-.css"])))=>i.map(i=>d[i]);
import{r as i,j as e,g as H,I as We,R as Je,_ as Ke}from"./index-FzR8z_fe.js";const ke="http://localhost:4000".replace(/\/$/,""),G=ke.endsWith("/api")?ke:ke+"/api",ze=[{id:"review",label:"🎬 Movie Review",color:"#c9973a"},{id:"ott-release",label:"📺 OTT Release Feature",color:"#7ec8e3"},{id:"ott-streaming",label:"🔴 Now Streaming on OTT",color:"#4ade80"},{id:"movie-details",label:"📄 Full Movie Details",color:"#e8c87a"},{id:"song-details",label:"🎵 Song Feature",color:"#b388ff"},{id:"story",label:"📖 Story & Plot",color:"#7aaae8"},{id:"cast",label:"👥 Cast Spotlight",color:"#a78be8"},{id:"music",label:"🎵 Music & Songs",color:"#4caf82"},{id:"analysis",label:"🔍 Deep Dive",color:"#e8c87a"},{id:"trivia",label:"💡 Trivia & Facts",color:"#e5799a"},{id:"custom",label:"✏️ Custom Prompt",color:"#a0c4a0"}],be=["Movie Review","Actor Spotlight","Top 10","General","Behind the Scenes","Music","Industry News","Opinion","Movie Update","OTT Release","Song Updates"];function me(t){return String(t||"").toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim()}function Ie(t){return t?new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):""}function Ze(t,n,u){if(u||!t||String(t).trim().toUpperCase()==="TBA")return"TBA";const d=String(t).trim(),o=n||(d.length===4?"year":d.length===7?"month":"full");if(o==="year"||/^\d{4}$/.test(d))return d.slice(0,4);if(o==="month"||/^\d{4}-\d{2}$/.test(d)){const f=d.split("-"),r=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],x=parseInt(f[1],10);return!isNaN(x)&&x>=1&&x<=12?`${r[x-1]} ${f[0]}`:d}const g=d.split("T")[0].split("-");if(g.length===3){const f=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],r=parseInt(g[1],10),x=parseInt(g[2],10);if(!isNaN(r)&&r>=1&&r<=12&&!isNaN(x))return`${x} ${f[r-1]} ${g[0]}`}return d}function Te(t){return t.split(/\s+/).filter(Boolean).length}function ie(t){return Math.max(1,Math.ceil(Te(t)/200))}function Ue(t,n){var $,O,c;const u=(t.cast||[]).slice(0,5).map(S=>`${S.name}${S.role?` as ${S.role}`:""}`).join(", "),d=((($=t.media)==null?void 0:$.songs)||[]).slice(0,3).map(S=>S.title).filter(Boolean).join(", "),o=t.releaseDate?new Date(t.releaseDate).getFullYear():"upcoming",s=(t.genre||[]).join(", ")||"Odia",g=t.streamingOn||((O=t.ott)==null?void 0:O.platform)||"OTT Platform",f=t.ottReleaseDate||((c=t.ott)==null?void 0:c.releaseDate)||"TBA",r=`Movie: "${t.title}" (${o}) | Genre: ${s} | Director: ${t.director||"N/A"} | Cast: ${u||"N/A"} | OTT Platform: ${g} | OTT Date: ${f} | Songs: ${d||"N/A"} | Synopsis: ${t.synopsis||"N/A"} | Verdict: ${t.verdict||"Upcoming"}`,x=`
OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML. No markdown. No plain text. No code blocks.
- Wrap everything in <article>
- Use <h2> for section headings (NOT <h1> — the page already has a title)
- Use <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each, short and readable)
- Use <ul><li> for bullet point lists
- Use <ol><li> for numbered lists
- Use <strong> for emphasis on key terms
- Use <table> for any data/comparison (with <thead><tbody><tfoot>)
- Include a Movie & OTT Details Table (Movie Title, OTT Platform, OTT Release Date, Theatrical Release, Genre, Director, Lead Cast) using <table>
- End with a <section class="faq-section"><h2>Frequently Asked Questions</h2> block with 4–5 <details><summary> FAQ items
- 800–1200 words total
- SEO-friendly: include the movie name naturally in the first 100 words
- Short paragraphs, subheading every 150–200 words
- Do NOT use inline styles
- Do NOT output any text outside the <article> tag`,C={"ott-release":`You are an expert SEO content writer for Ollypedia. Write a dual-language (English + Odia translation) OTT Release article for "${t.title}" releasing on ${g}.

Sections to include:
1. Engaging introduction (mention "${t.title}" OTT premiere on ${g})
2. OTT & Movie Details Table (Movie Title, OTT Platform, OTT Release Date, Language, Genre, Director, Lead Cast)
3. Story & Plot Overview
4. Director's Vision & Production Value
5. Star Performances & Cast Highlights
6. Platform & Viewing Guide for ${g}
7. Conclusion & Countdown
8. FAQ section

${r}
${x}`,"ott-streaming":`You are an expert SEO content writer for Ollypedia. Write an excited, dual-language (English + Odia translation) "NOW STREAMING ON OTT" article for "${t.title}" streaming live NOW on ${g}.

Sections to include:
1. Breaking-news introduction (announcing "${t.title}" is NOW LIVE on ${g})
2. OTT & Movie Details Table (Movie Title, OTT Platform, Release Status: Streaming, Genre, Director, Lead Cast)
3. Story & Emotional Hook
4. Lead Performances & Character Highlights
5. How to Watch on ${g} Today
6. Verdict & Final Recommendation
7. FAQ section

${r}
${x}`,"movie-details":`You are an expert SEO content writer for Ollypedia. Write a comprehensive Movie Details article for "${t.title}" (${o}).

Sections to include:
1. Complete Introduction to "${t.title}"
2. Movie & OTT Details Table (Movie Title, Release Date, Language, Genre, Director, Producer, Starring Cast, Music Director)
3. Full Storyline & Plot Breakdown
4. Lead Cast & Character Profiles
5. Music, Songs & Soundtrack Highlights
6. Theatrical & Digital Release Status
7. FAQ section

${r}
${x}`,"song-details":`You are an expert SEO content writer for Ollypedia. Write a Song Release & Soundtrack Feature article for "${t.title}".

Sections to include:
1. Song Release Introduction
2. Track Details Table (Song Title, Movie, Singer, Music Director, Lyricist, Platform)
3. Musical Style & Composition Breakdown
4. Vocal Performance & Lyrics Significance
5. Music Video & Visual Highlights
6. FAQ section

${r}
${x}`,review:`You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured, AdSense-friendly HTML movie review for the Odia film "${t.title}" (${o}).

Sections to include:
1. Engaging introduction (mention "${t.title}" in first sentence)
2. Movie & OTT Details Table
3. Story & Plot Overview
4. Performances & Cast
5. Direction & Screenplay
6. Music & Soundtrack
7. Verdict & Final Thoughts
8. Key Highlights (as <ul>)
9. FAQ section

${r}
${x}`,story:`You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured HTML story and plot breakdown article for "${t.title}" (${o}).

Sections to include:
1. Introduction — what the film is about
2. Movie & OTT Details Table
3. Story Overview
4. Key Plot Points & Narrative Arc
5. Emotional Beats & Themes
6. What Makes the Story Stand Out (as <ul>)
7. Comparison Table — "${t.title}" vs similar Odia films (themes, tone, style)
8. FAQ section

${r}
${x}`,cast:`You are an expert SEO content writer for Ollypedia. Write a fully structured HTML cast spotlight article for "${t.title}" (${o}).

Sections to include:
1. Introduction
2. Lead Cast — profile each major actor/actress (use <h3> per person)
3. Supporting Cast Highlights
4. Director & Key Crew
5. Cast Performance Table (Name | Role | Highlights) using <table>
6. FAQ section

${r}
${x}`,music:`You are an expert SEO content writer for Ollypedia. Write a fully structured HTML music review for "${t.title}" (${o}).

Sections to include:
1. Introduction — overall feel of the soundtrack
2. Music Director's Style
3. Song-by-Song Breakdown (use <h3> per song, short paragraph each)
4. Songs Table (Song Title | Singer | Mood | Rating) using <table>
5. Background Score
6. Verdict on Soundtrack
7. FAQ section

${r}
${x}`,analysis:`You are an expert SEO content writer for Ollypedia. Write a fully structured HTML deep-dive analysis for "${t.title}" (${o}).

Sections to include:
1. Introduction
2. Themes & Symbolism
3. Cinematography & Visual Style
4. Direction & Screenplay Analysis
5. Cultural & Social Significance
6. Key Strengths & Weaknesses (as two <ul> lists)
7. Comparison Table — "${t.title}" vs recent Odia films
8. FAQ section

${r}
${x}`,trivia:`You are an expert SEO content writer for Ollypedia. Write a fully structured HTML trivia & facts article for "${t.title}" (${o}).

Sections to include:
1. Introduction
2. Behind the Scenes Facts (as <ul>)
3. Casting & Production Challenges
4. Interesting On-Set Stories
5. Box Office & Reception
6. Fun Facts Table (Fact | Detail) using <table>
7. FAQ section

${r}
${x}`};return C[n]||C.review}function de(t,n){var s;const u=t.releaseDate?new Date(t.releaseDate).getFullYear():"",d=(t.genre||[]).join(", ")||"Odia Film",o=t.streamingOn||((s=t.ott)==null?void 0:s.platform)||"OTT";return{"ott-release":`${t.title} OTT Release Date Announced: Premieres on ${o} (${t.title} ଓଟିଟି ରିଲିଜ୍)`,"ott-streaming":`${t.title} Is Now Streaming on ${o}: Watch Online Today (${t.title} ବର୍ତ୍ତମାନ ଷ୍ଟ୍ରିମିଂ)`,"movie-details":`${t.title}${u?` (${u})`:""} Movie Details, Cast, Story & Release Date`,"song-details":`${t.title} Song Release: Music, Lyrics & Video Breakdown`,review:`${t.title}${u?` (${u})`:""} – ${d} Odia Movie Review & Story`,story:`${t.title} – Full Story, Plot & Narrative Breakdown`,cast:`${t.title} – Cast Spotlight: Meet the Actors & Characters`,music:`${t.title} – Music Review: Songs, Score & Soundtrack`,analysis:`${t.title} – Deep Dive Analysis & Themes`,trivia:`${t.title} – Interesting Trivia, Facts & Behind the Scenes`,custom:`${t.title} – Article`}[n]||`${t.title} – Article`}function $e(t){return{"ott-release":"OTT Release","ott-streaming":"OTT Release","movie-details":"Movie Update","song-details":"Song Updates",review:"Movie Review",story:"Movie Review",cast:"Actor Spotlight",music:"Music",analysis:"General",trivia:"General"}[t]||"General"}function Me(t,n){const u=(t.movies||[]).slice(0,5).map(g=>typeof g=="string"?g:g.title||"").filter(Boolean).join(", "),d=`Name: ${t.name} | Type: ${t.type||"Actor"} | Known for: ${u||"Ollywood films"} | Bio: ${t.bio||"N/A"}`,o=`
OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML wrapped in <article>. No markdown. No plain text.
- Use <h2> for section headings (NOT <h1>)
- Use <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each)
- Use <ul><li> for bullet lists
- Use <strong> for emphasis
- Use <table> for any data (with <thead><tbody>)
- End with <section class="faq-section"><h2>Frequently Asked Questions</h2> with 4–5 <details><summary> FAQ items
- 800–1200 words total. SEO-friendly.
- Do NOT use inline styles. Do NOT output anything outside <article>.`,s={profile:`You are an expert SEO content writer for Ollypedia, an Odia cinema website. Write a fully structured HTML profile/biography article for ${t.type||"actor"} "${t.name}".

Sections:
1. Introduction — who they are and why they matter in Ollywood
2. Early Life & Background
3. Career Journey & Breakthrough
4. Notable Works (as <ul>)
5. Awards & Recognition
6. Personal Life
7. Legacy & Impact
8. FAQ section

${d}
${o}`,interview:`You are an expert SEO content writer for Ollypedia. Write a creative HTML Q&A-style interview feature with ${t.name} (${t.type||"actor"}) about their career in Odia cinema.

Sections:
1. Introduction
2. 6–8 interview Q&A pairs (use <h3> for each question, <p> for the answer)
3. Career Highlights Table (Film | Year | Role/Contribution) using <table>
4. FAQ section

${d}
${o}`,spotlight:`You are an expert SEO content writer for Ollypedia. Write a fully structured HTML spotlight/feature article on ${t.name} (${t.type||"actor"}) for fans of Odia cinema.

Sections:
1. Introduction
2. Career Milestones (as <ul>)
3. Why Fans Love Them
4. Best Performances / Works
5. What Sets Them Apart
6. Quick Facts Table using <table>
7. FAQ section

${d}
${o}`};return s[n]||s.profile}function ge(t,n){return{profile:`${t.name} – Biography, Career & Films | Odia Cinema`,interview:`${t.name} – Exclusive Interview | Ollywood`,spotlight:`${t.name} – Actor Spotlight | Odia Cinema`,custom:`${t.name} – Article`}[n]||`${t.name} – Article`}const pe=[{id:"profile",label:"👤 Biography",color:"#a78be8"},{id:"interview",label:"🎤 Interview",color:"#7aaae8"},{id:"spotlight",label:"⭐ Spotlight",color:"#e8c87a"},{id:"custom",label:"✏️ Custom Prompt",color:"#a0c4a0"}];let ue=null,ae=null;async function fe(){return ue!==null?ue:ae||(ae=(async()=>{const t=H(),n=await fetch(`${G}/admin/blog`,{headers:{Authorization:`Bearer ${t}`}}),u=n.ok?await n.json():[];return ue=u,ae=null,u})(),ae)}function ne(){ue=null,ae=null}async function Xe(t){return(await fe()).filter(u=>u.movieTitle===t)}async function et(t){return(await fe()).filter(u=>u.castName===t)}async function tt(){return(await fe()).filter(n=>!n.movieTitle&&!n.castName)}async function xe(t){const n=H();if(!n)throw new Error("Not logged in as admin.");const u=new AbortController,d=setTimeout(()=>u.abort(),6e4);try{const o=await fetch(`${G}/admin/generate-article`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({prompt:t}),signal:u.signal});if(!o.ok){const f=await o.json().catch(()=>({}));throw new Error(f.error||`Server error (${o.status})`)}const g=((await o.json()).text||"").trim();if(!g)throw new Error("AI returned an empty response. Please try again.");return g}catch(o){throw o.name==="AbortError"?new Error("Request timed out after 60 s. Please retry."):o}finally{clearTimeout(d)}}async function _e(t,n){return xe(Ue(t,n))}async function Ye(t,n,u,d=""){const o=H();if(!o)throw new Error("Not logged in as admin.");const s=de(t,u),g=me(`${t.title}-${u}-${Date.now().toString(36)}`),f=n.slice(0,200).trim()+"…",r=await fetch(`${G}/admin/blog`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({title:s,slug:g,content:n,excerpt:f,category:$e(u),tags:[t.title,"Ollywood","Odia Movie",...t.genre||[]],coverImage:t.posterUrl||t.thumbnailUrl||"",movieTitle:t.title,movieId:t._id,author:"OllyPedia Editorial",readTime:ie(n),seoTitle:s,seoDesc:f,published:!0,...d.trim()?{youtubeVideoId:d.trim()}:{}})});if(!r.ok){const C=await r.json().catch(()=>({}));throw new Error(C.error||`Publish failed (${r.status})`)}const x=await r.json();return ne(),x}async function at({title:t,content:n,category:u,tags:d,coverImage:o,movie:s,castMember:g,published:f,youtubeVideoId:r}){const x=H();if(!x)throw new Error("Not logged in as admin.");const C=me(`${t}-${Date.now().toString(36)}`),$=n.slice(0,200).trim()+"…",O=await fetch(`${G}/admin/blog`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${x}`},body:JSON.stringify({title:t.trim(),slug:C,content:n.trim(),excerpt:$,category:u||"General",tags:d?d.split(",").map(S=>S.trim()).filter(Boolean):[],coverImage:o||(g?g.photo||"":s&&(s.posterUrl||s.thumbnailUrl)||""),movieTitle:(s==null?void 0:s.title)||"",movieId:(s==null?void 0:s._id)||null,castName:(g==null?void 0:g.name)||"",castId:(g==null?void 0:g._id)||null,author:"OllyPedia Editorial",readTime:ie(n),seoTitle:t.trim(),seoDesc:$,published:f!==!1,...r!=null&&r.trim()?{youtubeVideoId:r.trim()}:{}})});if(!O.ok){const S=await O.json().catch(()=>({}));throw new Error(S.error||`Publish failed (${O.status})`)}const c=await O.json();return ne(),c}async function Le(t){const n=H();await fetch(`${G}/admin/blog/${t}`,{method:"DELETE",headers:{Authorization:`Bearer ${n}`}}),ne()}async function rt(t,n){const u=H(),d=await fetch(`${G}/admin/blog/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${u}`},body:JSON.stringify(n)});if(!d.ok){const o=await d.json().catch(()=>({}));throw new Error(o.error||"Update failed")}return ne(),d.json()}const st=`
@keyframes spin { to { transform: rotate(360deg); } }
.bg-wrap { padding: 24px 28px 40px; }
.bg-header { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  margin-bottom: 20px; 
  flex-wrap: wrap; 
  background: var(--ap-bg-card, var(--bg2, #ffffff)); 
  padding: 16px 20px; 
  border-radius: 14px; 
  border: 1px solid var(--ap-border, rgba(0,0,0,0.08)); 
  box-shadow: var(--ap-shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
}
.bg-title  { 
  font-size: 1.15rem; 
  font-weight: 800; 
  color: var(--ap-accent-text, var(--gold, #c9973a)); 
  display: flex;
  align-items: center;
  gap: 8px;
}
.bg-stats  { 
  display: flex; 
  gap: 12px; 
  font-size: .8rem; 
  color: var(--ap-text-muted, var(--muted, #64748b)); 
  margin-left: auto;
  align-items: center;
}
.bg-stats-pill {
  padding: 3px 10px;
  background: var(--ap-pill-bg, var(--bg3, #f1f5f9));
  border-radius: 20px;
  border: 1px solid var(--ap-border, #e2e8f0);
  font-weight: 600;
  color: var(--ap-text-secondary, #334155);
}
.bg-search { 
  padding: 7px 12px 7px 32px; 
  border-radius: 8px; 
  border: 1px solid var(--ap-border, var(--border, #cbd5e1)); 
  background: var(--ap-bg-input, var(--bg2, #ffffff)); 
  color: var(--ap-text-primary, var(--text, #0f172a)); 
  font-size: .85rem; 
  width: 210px; 
  outline: none; 
}
.bg-filter-select {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--ap-border, var(--border, #cbd5e1));
  background: var(--ap-bg-input, var(--bg2, #ffffff));
  color: var(--ap-text-primary, var(--text, #0f172a));
  font-size: .82rem;
  outline: none;
  cursor: pointer;
}
.bg-new-btn  { 
  padding: 7px 16px; 
  border-radius: 8px; 
  border: 1px solid var(--ap-border-glow, rgba(201,151,58,0.4)); 
  font-size: .82rem; 
  font-weight: 700; 
  cursor: pointer; 
  background: var(--ap-accent-bg, rgba(201,151,58,0.12)); 
  color: var(--ap-accent-text, #9a6a1c); 
  transition: all .15s; 
  white-space: nowrap; 
}
.bg-new-btn:hover { 
  background: var(--ap-accent-text, #c9973a); 
  color: #fff; 
  transform: translateY(-1px);
}
.bg-bulk-btn { 
  padding: 7px 16px; 
  border-radius: 8px; 
  border: none; 
  font-size: .82rem; 
  font-weight: 700; 
  cursor: pointer; 
  background: linear-gradient(135deg, #c9973a 0%, #a87926 100%); 
  color: #fff; 
  white-space: nowrap; 
  box-shadow: 0 2px 8px rgba(180, 120, 24, 0.25);
  transition: all .15s;
}
.bg-bulk-btn:hover { 
  filter: brightness(1.08); 
  transform: translateY(-1px); 
}
.bg-bulk-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

.bg-progress { 
  margin-bottom: 16px; 
  padding: 12px 16px; 
  background: var(--ap-accent-bg, rgba(201,151,58,.1)); 
  border-radius: 10px; 
  border: 1px solid var(--ap-border-glow, rgba(201,151,58,.3)); 
  font-size: .84rem; 
  color: var(--ap-accent-text, #9a6a1c); 
  font-weight: 700; 
}
.bg-progress-bar  { 
  margin-top: 8px; 
  height: 6px; 
  background: var(--ap-bg-card-hover, #e2e8f0); 
  border-radius: 4px; 
  overflow: hidden; 
}
.bg-progress-fill { height: 100%; border-radius: 4px; background: #c9973a; transition: width .4s; }

.bg-tip  { 
  margin-bottom: 18px; 
  padding: 10px 16px; 
  border-radius: 10px; 
  background: var(--ap-bg-card, #ffffff); 
  border: 1px solid var(--ap-border, #e2e8f0); 
  font-size: .78rem; 
  color: var(--ap-text-secondary, #475569); 
  line-height: 1.6; 
  box-shadow: var(--ap-shadow-sm, 0 1px 2px rgba(0,0,0,0.03));
}
.bg-list { 
  background: var(--ap-bg-card, #ffffff); 
  border-radius: 14px; 
  border: 1px solid var(--ap-border, #e2e8f0); 
  overflow: hidden; 
  box-shadow: var(--ap-shadow, 0 2px 12px rgba(0,0,0,0.04));
}
.bg-empty{ padding: 50px 20px; text-align: center; color: var(--ap-text-muted, #64748b); font-size: .9rem; }

.bg-movie-row { border-bottom: 1px solid var(--ap-border, #e2e8f0); transition: background .12s; }
.bg-movie-row:last-child { border-bottom: none; }
.bg-movie-header { 
  display: flex; 
  align-items: center; 
  gap: 14px; 
  padding: 14px 20px; 
  cursor: pointer; 
  transition: background .15s; 
  user-select: none; 
}
.bg-movie-header:hover { background: var(--ap-bg-card-hover, rgba(0,0,0,0.02)); }
.bg-poster    { width: 44px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0; border: 1px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f1f5f9); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.bg-poster-ph { width: 44px; height: 60px; border-radius: 6px; flex-shrink: 0; border: 1px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f1f5f9); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.bg-minfo  { flex: 1; min-width: 0; }
.bg-mtitle { font-weight: 800; font-size: .98rem; color: var(--ap-text-primary, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bg-msub   { font-size: .78rem; color: var(--ap-text-secondary, #64748b); margin-top: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bg-badge-year { font-weight: 700; background: var(--ap-pill-bg, #f1f5f9); padding: 1px 7px; border-radius: 6px; border: 1px solid var(--ap-border, #e2e8f0); color: var(--ap-text-secondary, #334155); }
.bg-badge-verdict { font-size: .7rem; font-weight: 700; padding: 1px 8px; border-radius: 12px; }
.bg-mcount { font-size: .72rem; font-weight: 700; padding: 2px 9px; border-radius: 12px; background: var(--ap-accent-bg, rgba(201,151,58,.15)); color: var(--ap-accent-text, #9a6a1c); border: 1px solid var(--ap-border-glow, rgba(201,151,58,.3)); }
.bg-chevron{ font-size: .85rem; color: var(--ap-text-muted, #94a3b8); transition: transform .2s; }

.bg-panel { padding: 4px 20px 20px 78px; background: var(--ap-bg-card-subtle, #f8fafc); border-top: 1px dashed var(--ap-border, #e2e8f0); }
.bg-section-label { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--ap-text-muted, #64748b); margin: 12px 0 8px; }

.bg-articles  { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.bg-art-item  { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; background: var(--ap-bg-card, #ffffff); border: 1px solid var(--ap-border, #e2e8f0); border-radius: 10px; box-shadow: var(--ap-shadow-sm, 0 1px 2px rgba(0,0,0,0.03)); }
.bg-art-dot   { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.bg-art-body  { flex: 1; min-width: 0; }
.bg-art-title { font-size: .86rem; font-weight: 700; color: var(--ap-text-primary, #0f172a); line-height: 1.4; margin-bottom: 4px; }
.bg-art-meta  { font-size: .72rem; color: var(--ap-text-muted, #64748b); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.bg-art-actions { display: flex; gap: 6px; flex-shrink: 0; }
.bg-art-btn   { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f8fafc); color: var(--ap-text-primary, #0f172a); font-size: .72rem; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all .15s; }
.bg-art-btn:hover     { border-color: var(--ap-accent, #c9973a); color: var(--ap-accent-text, #9a6a1c); background: var(--ap-accent-bg, rgba(201,151,58,0.1)); }
.bg-art-btn.del:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.08); }

.bg-types    { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.bg-type-chip{ padding: 5px 14px; border-radius: 20px; border: 1.5px solid; font-size: .76rem; font-weight: 700; cursor: pointer; transition: all .15s; background: var(--ap-bg-card, #ffffff); }
.bg-type-chip.active { filter: brightness(1.1); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.bg-gen-box   { padding: 12px 14px; background: var(--ap-accent-bg, rgba(201,151,58,.06)); border: 1px dashed var(--ap-border-glow, rgba(201,151,58,.3)); border-radius: 10px; }
.bg-gen-row   { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.bg-gen-label { font-size: .78rem; font-weight: 700; flex: 1; color: var(--ap-text-primary, #0f172a); }
.bg-gen-preview { margin-top: 10px; padding: 12px 14px; background: var(--ap-bg-card, #ffffff); border-radius: 8px; font-size: .78rem; color: var(--ap-text-primary, #0f172a); line-height: 1.75; white-space: pre-wrap; max-height: 200px; overflow-y: auto; border: 1px solid var(--ap-border, #e2e8f0); }

.bg-btn          { padding: 6px 14px; border-radius: 7px; border: none; cursor: pointer; font-size: .76rem; font-weight: 700; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
.bg-btn:disabled { opacity: .5; cursor: not-allowed; }
.bg-btn-gold  { background: linear-gradient(135deg, #c9973a 0%, #a87926 100%); color: #fff; }
.bg-btn-green { background: #10b981; color: #fff; }
.bg-btn-red   { background: #ef4444; color: #fff; }
.bg-btn-ghost { background: var(--ap-bg-card, #ffffff); color: var(--ap-text-primary, #0f172a); border: 1px solid var(--ap-border, #e2e8f0); }
.bg-btn-blue  { background: #2563eb; color: #fff; }

.bg-spinner { width: 13px; height: 13px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }

/* Modals */
.bg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.bg-modal   { background: var(--ap-modal-bg, var(--bg2, #ffffff)); border: 1px solid var(--ap-border, #e2e8f0); border-radius: 16px; width: 100%; max-width: 760px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--ap-shadow, 0 20px 50px rgba(0,0,0,0.15)); }
.bg-modal-head  { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--ap-border, #e2e8f0); flex-shrink: 0; }
.bg-modal-title { font-size: 1.05rem; font-weight: 800; color: var(--ap-accent-text, #9a6a1c); }
.bg-modal-close { background: none; border: none; color: var(--ap-text-muted, #64748b); font-size: 1.4rem; cursor: pointer; line-height: 1; }
.bg-modal-body  { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.bg-modal-foot  { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--ap-border, #e2e8f0); flex-shrink: 0; flex-wrap: wrap; }

.bg-field-label    { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ap-text-secondary, #475569); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
.bg-field-input    { padding: 9px 13px; border-radius: 8px; border: 1px solid var(--ap-border, #cbd5e1); background: var(--ap-bg-input, #ffffff); color: var(--ap-text-primary, #0f172a); font-size: .86rem; outline: none; font-family: inherit; width: 100%; box-sizing: border-box; }
.bg-field-input:focus  { border-color: var(--ap-accent, #c9973a); box-shadow: 0 0 0 3px var(--ap-accent-bg, rgba(201,151,58,0.15)); }
.bg-field-textarea { min-height: 130px; resize: vertical; }
.bg-field-textarea.tall { min-height: 240px; }

/* Mode toggle */
.nb-mode-row    { display: flex; border: 1px solid var(--ap-border, #cbd5e1); border-radius: 10px; overflow: hidden; background: var(--ap-pill-bg, #f1f5f9); padding: 3px; gap: 3px; }
.nb-mode-btn    { flex: 1; padding: 8px 0; border: none; border-radius: 7px; cursor: pointer; font-size: .84rem; font-weight: 700; background: transparent; color: var(--ap-text-muted, #64748b); transition: all .15s; }
.nb-mode-btn.active { background: var(--ap-bg-card, #ffffff); color: var(--ap-accent-text, #9a6a1c); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

/* Movie search dropdown */
.bg-movie-dd      { position: absolute; top: 100%; left: 0; right: 0; background: var(--ap-bg-card, #ffffff); border: 1px solid var(--ap-border, #cbd5e1); border-radius: 8px; z-index: 60; max-height: 200px; overflow-y: auto; margin-top: 4px; box-shadow: var(--ap-shadow, 0 10px 25px rgba(0,0,0,0.1)); }
.bg-movie-dd-item { padding: 9px 14px; cursor: pointer; font-size: .86rem; color: var(--ap-text-primary, #0f172a); border-bottom: 1px solid var(--ap-border, #f1f5f9); }
.bg-movie-dd-item:hover { background: var(--ap-bg-card-hover, #f1f5f9); }

/* Prompt preview box */
.bg-prompt-box { background: rgba(37,99,235,.06); border: 1px solid rgba(37,99,235,.2); border-radius: 8px; padding: 12px 14px; font-size: .75rem; color: #2563eb; line-height: 1.7; font-family: monospace; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }

/* Error / timeout banner */
.nb-err { font-size: .78rem; color: #dc2626; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.25); border-radius: 8px; padding: 9px 14px; }

.nb-divider { border: none; border-top: 1px solid var(--ap-border, #e2e8f0); margin: 4px 0; }

/* Cast & Crew rows */
.bg-cast-row { border-bottom: 1px solid var(--ap-border, #e2e8f0); }
.bg-cast-row:last-child { border-bottom: none; }
.bg-cast-header { display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; transition: background .15s; user-select: none; }
.bg-cast-header:hover { background: var(--ap-bg-card-hover, rgba(0,0,0,0.02)); }
.bg-cast-photo { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f1f5f9); flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.bg-cast-photo-ph { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; border: 1.5px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f1f5f9); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }

/* Main tabs inside BlogGenerator */
.bg-main-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--ap-border, #e2e8f0); background: var(--ap-bg-card-subtle, #f8fafc); padding: 6px 14px 0; }
.bg-main-tab  { padding: 10px 18px; border: none; cursor: pointer; font-size: .84rem; font-weight: 700; background: transparent; color: var(--ap-text-muted, #64748b); border-bottom: 2.5px solid transparent; transition: all .15s; border-radius: 8px 8px 0 0; }
.bg-main-tab.active { color: var(--ap-accent-text, #9a6a1c); border-bottom-color: var(--ap-accent, #c9973a); background: var(--ap-bg-card, #ffffff); }
.bg-main-tab:hover:not(.active) { color: var(--ap-text-primary, #0f172a); }

/* Uncategorized blogs list */
.bg-uncat-list { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px; }

/* Blog Editor Inserted Image Layouts */
.blog-image-row { display: flex; gap: 10px; margin: 15px 0; }
.blog-image-row figure { flex: 1; min-width: 0; margin: 0; }
.blog-image-row figure img { width: 100%; height: auto; border-radius: 6px; }
.blog-image-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 15px 0; }
.blog-image-grid figure { margin: 0; }
.blog-image-grid figure img { width: 100%; height: auto; border-radius: 6px; }
.article-inline-img { margin: 15px 0; text-align: center; }
.article-inline-img img { max-width: 100%; height: auto; border-radius: 6px; }
`,q=()=>e.jsx("span",{className:"bg-spinner"});function Oe({textareaRef:t,content:n,onChange:u,onToast:d}){const o=i.useRef(null),[s,g]=i.useState([]),[f,r]=i.useState(!1),[x,C]=i.useState("auto"),[$,O]=i.useState("100%"),c=async y=>{if(!(!y||y.length===0)){r(!0);try{const N=H(),m=[];for(let z=0;z<y.length;z++){const L=y[z];if(!L.type.startsWith("image/"))continue;const k=new FormData;k.append("image",L);const P=await fetch(`${G}/admin/upload-blog-image`,{method:"POST",headers:{Authorization:`Bearer ${N}`},body:k});if(!P.ok){const E=await P.json().catch(()=>({}));throw new Error(E.error||`Upload failed (${P.status})`)}const{url:I}=await P.json(),j=L.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," ");m.push({url:I,caption:j})}g(z=>[...z,...m]),m.length>0&&d(`📷 ${m.length} photo(s) uploaded! Choose a layout and insert.`,"success")}catch(N){d("❌ "+N.message,"error")}r(!1)}},S=y=>{y.preventDefault(),y.stopPropagation(),c(y.dataTransfer.files)},p=y=>{y.preventDefault(),y.stopPropagation(),y.dataTransfer.dropEffect="copy"},l=(y,N)=>{const m=y+N;if(m<0||m>=s.length)return;const z=[...s];[z[y],z[m]]=[z[m],z[y]],g(z)},v=()=>{if(s.length===0)return;let y="",N=x;N==="auto"&&(s.length===1?N="single":s.length===2?N="row":N="grid"),N==="single"?y=s.map(L=>`
<figure style="margin: 15px auto; text-align: center; max-width: ${$};">
  <img src="${L.url}" alt="${L.caption}" style="max-width: 100%; height: auto; border-radius: 6px;" />
</figure>
`).join(""):N==="row"?y=`
<div style="display: flex; gap: 10px; margin: 15px auto; max-width: ${$};">
`+s.map(L=>`  <figure style="flex: 1; min-width: 0; margin: 0; text-align: center;">
    <img src="${L.url}" alt="${L.caption}" style="width: 100%; height: auto; border-radius: 6px;" />
  </figure>`).join(`
`)+`
</div>
`:y=`
<div style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 15px auto; max-width: ${$};">
`+s.map(L=>`  <figure style="margin: 0; text-align: center;">
    <img src="${L.url}" alt="${L.caption}" style="width: 100%; height: auto; border-radius: 6px;" />
  </figure>`).join(`
`)+`
</div>
`;const m=t==null?void 0:t.current;let z;if(m){const L=m.selectionStart??n.length,k=m.selectionEnd??n.length;z=n.slice(0,L)+y+n.slice(k)}else z=n+y;u(z),d("✅ Image block inserted into article!","success"),g([])};return e.jsx("div",{style:{marginTop:8,marginBottom:12,borderRadius:8,background:"rgba(144,202,249,.06)",border:"1px dashed rgba(144,202,249,.35)"},children:e.jsxs("div",{onDrop:S,onDragOver:p,onClick:()=>{var y;return s.length===0&&((y=o.current)==null?void 0:y.click())},style:{padding:s.length>0?"8px":"15px",textAlign:"center",cursor:s.length===0?"pointer":"default",border:s.length===0?"1px dashed transparent":"none"},children:[e.jsx("input",{ref:o,type:"file",accept:"image/*",multiple:!0,style:{display:"none"},onChange:y=>{c(y.target.files),y.target.value=""}}),s.length===0?e.jsx("div",{style:{color:"#90caf9",fontSize:".75rem",fontWeight:600},children:f?e.jsxs(e.Fragment,{children:[e.jsx(q,{})," Uploading…"]}):"📥 Drag & Drop Photos Here (or click to browse)"}):e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:12},children:[s.map((y,N)=>e.jsxs("div",{style:{position:"relative",width:65,height:65},children:[e.jsx("img",{src:y.url,style:{width:"100%",height:"100%",objectFit:"cover",borderRadius:4,border:"1px solid var(--border)"}}),e.jsxs("div",{style:{position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",display:"flex",gap:2,background:"var(--bg3)",padding:2,borderRadius:10,border:"1px solid var(--border)",zIndex:10},children:[e.jsx("button",{onClick:()=>l(N,-1),disabled:N===0,style:{background:"none",border:"none",color:N===0?"var(--muted)":"var(--text)",cursor:N===0?"default":"pointer",fontSize:10,padding:"0 2px"},children:"◀"}),e.jsx("button",{onClick:()=>l(N,1),disabled:N===s.length-1,style:{background:"none",border:"none",color:N===s.length-1?"var(--muted)":"var(--text)",cursor:N===s.length-1?"default":"pointer",fontSize:10,padding:"0 2px"},children:"▶"})]}),e.jsx("button",{onClick:()=>g(s.filter((m,z)=>z!==N)),style:{position:"absolute",top:-5,right:-5,background:"#f88",color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10},children:"✕"})]},N)),e.jsx("div",{onClick:()=>{var y;return(y=o.current)==null?void 0:y.click()},style:{width:65,height:65,borderRadius:4,border:"1px dashed #90caf9",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#90caf9",fontSize:20},title:"Add more photos",children:"+"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,padding:"8px 12px",background:"rgba(0,0,0,.2)",borderRadius:6},children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"},children:[e.jsxs("div",{style:{display:"flex",gap:6,alignItems:"center"},children:[e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)",fontWeight:700},children:"LAYOUT:"}),e.jsxs("select",{className:"bg-field-input",style:{padding:"4px 8px",fontSize:".75rem",width:"auto"},value:x,onChange:y=>C(y.target.value),children:[e.jsx("option",{value:"auto",children:"Auto (Depends on count)"}),e.jsx("option",{value:"single",children:"Single (Stack)"}),e.jsx("option",{value:"row",children:"Row (Side-by-side)"}),e.jsx("option",{value:"grid",children:"Grid (Masonry)"})]})]}),e.jsxs("div",{style:{display:"flex",gap:6,alignItems:"center"},children:[e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)",fontWeight:700},children:"SIZE:"}),e.jsxs("select",{className:"bg-field-input",style:{padding:"4px 8px",fontSize:".75rem",width:"auto"},value:$,onChange:y=>O(y.target.value),children:[e.jsx("option",{value:"100%",children:"100% (Full Width)"}),e.jsx("option",{value:"75%",children:"75% (Large)"}),e.jsx("option",{value:"50%",children:"50% (Medium)"}),e.jsx("option",{value:"25%",children:"25% (Small)"})]})]})]}),e.jsx("button",{className:"bg-btn bg-btn-blue",onClick:v,disabled:f,style:{padding:"6px 12px",fontSize:".75rem"},children:f?e.jsx(q,{}):"⬇️ Insert HTML"})]})]})]})})}function ye(t){const n=String(t||"").trim(),u=n.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);return u?u[1]:/^[A-Za-z0-9_-]{11}$/.test(n)?n:""}function ve({value:t,onChange:n}){const u=ye(t),d=u.length===11;return e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["🎬 YouTube Video",e.jsx("span",{style:{fontWeight:400,textTransform:"none",fontSize:".65rem",color:"var(--muted)"},children:"optional — full URL or video ID"})]}),e.jsx("input",{className:"bg-field-input",placeholder:"https://youtube.com/watch?v=… or just the ID",value:t,onChange:o=>n(o.target.value)}),t&&d&&e.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"flex-start",gap:10},children:[e.jsx("img",{src:`https://img.youtube.com/vi/${u}/mqdefault.jpg`,alt:"YouTube thumbnail",style:{width:160,height:90,objectFit:"cover",borderRadius:6,border:"1px solid var(--border)",flexShrink:0},onError:o=>o.target.style.display="none"}),e.jsxs("div",{style:{fontSize:".69rem",lineHeight:1.7},children:[e.jsxs("span",{style:{color:"#4acf82"},children:["✅ Video ID: ",e.jsx("b",{style:{color:"var(--text)"},children:u})]}),e.jsx("br",{}),e.jsx("span",{style:{color:"var(--muted)"},children:"This video will be embedded on the blog post."})]})]}),t&&!d&&e.jsx("div",{style:{marginTop:5,fontSize:".69rem",color:"#f88"},children:"⚠️ Could not detect a valid YouTube ID — paste the full URL or the 11-character ID."})]})}function he(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function it(t){const n=t.trim();if(n.length<5)return new RegExp(`(^|[\\s\\W])(${he(n)})(?=[\\s\\W]|$)`,"gi");const d=n.split(/\s+/).map(o=>{if(o.length<=3)return he(o);let s="";for(let g=0;g<o.length;g++){const f=o[g];/[a-zA-Z0-9]/.test(f)?g===0?s+=f:/[aeiouyAEIOUY]/.test(f)?s+="[aeiouyAEIOUY]*":s+=f+"[aeiouyAEIOUY]*":s+="\\"+f}return s.replace(/(\[aeiouyAEIOUY\]\*)+/g,"[aeiouyAEIOUY]*")});return new RegExp(`(^|[\\s\\W])(${d.join("\\s+")})(?=[\\s\\W]|$)`,"gi")}function Ce(t,n,u){if(!t||!n||!u)return t;const d=new RegExp(`(^|[\\s\\W])(${he(n)})(?=[\\s\\W]|$)`,"i"),o=t.split(/(<[^>]*>)/g),s=["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"],g=["a","h1","h2","h3","h4","h5","h6","title","script","style","figure","figcaption","summary"],f=u.trim().toLowerCase();let r=[],x=!1,C=!1;for(let c=0;c<o.length;c++){const S=o[c];if(S.startsWith("</")){const p=S.match(/^<\/\s*([a-z0-9]+)/i);if(p){const l=p[1].toLowerCase(),v=r.lastIndexOf(l);v!==-1&&r.splice(v,1)}}else if(S.startsWith("<")){const p=S.match(/^<\s*([a-z0-9]+)/i);if(p){const l=p[1].toLowerCase();if(l==="a"){const v=S.match(/href=["']([^"']+)["']/i);v&&v[1]&&v[1].trim().toLowerCase()===f&&(r.some(N=>["table","thead","tbody","tfoot","tr","td","th","dl","dd","dt"].includes(N.toLowerCase()))?C=!0:x=!0)}!s.includes(l)&&!S.endsWith("/>")&&r.push(l)}}}r=[];let $=x,O=C;for(let c=0;c<o.length;c++){const S=o[c];if(S.startsWith("</")){const p=S.match(/^<\/\s*([a-z0-9]+)/i);if(p){const l=p[1].toLowerCase(),v=r.lastIndexOf(l);v!==-1&&r.splice(v,1)}}else if(S.startsWith("<")){const p=S.match(/^<\s*([a-z0-9]+)/i);if(p){const l=p[1].toLowerCase();!s.includes(l)&&!S.endsWith("/>")&&r.push(l)}}else if(S.trim().length>0){const p=r.some(v=>g.includes(v.toLowerCase())),l=r.some(v=>["table","thead","tbody","tfoot","tr","td","th","dl","dd","dt"].includes(v.toLowerCase()));p||(l&&!O?d.test(S)&&(o[c]=S.replace(d,(v,y,N)=>O?v:(O=!0,`${y}<a href="${u}" target="_blank" rel="noopener noreferrer" style="color: #7ec8e3; font-weight: 600; text-decoration: none; white-space: nowrap;">${N}</a>`))):!l&&!$&&d.test(S)&&(o[c]=S.replace(d,(v,y,N)=>$?v:($=!0,`${y}<a href="${u}" target="_blank" rel="noopener noreferrer" style="color: #7ec8e3; font-weight: 600; text-decoration: none; white-space: nowrap;">${N}</a>`))))}if($&&O)break}return o.join("")}function Ae({content:t,movies:n=[],cast:u=[],onChange:d}){const[o,s]=i.useState([]),[g,f]=i.useState([]),[r,x]=i.useState(null),[C,$]=i.useState([]);i.useEffect(()=>{const l=setTimeout(()=>{if(!t){s([]),f([]);return}const v=/<a[^>]*href="([^"]*?(?:\/movie\/|\/cast\/)[^"]*)"[^>]*>(.*?)<\/a>/gi,y=[];let N;for(;(N=v.exec(t))!==null;)y.some(k=>k.fullTag===N[0])||y.push({fullTag:N[0],href:N[1],text:N[2],id:N[1]+N[2]});f(y);const m=t.replace(/<a[^>]*>.*?<\/a>/gi," "),z=[],L=(k,P,I)=>{if(C.includes(P._id)||!k||k.trim().length<3)return;const j=it(k);let E;for(;(E=j.exec(m))!==null;){E.index===j.lastIndex&&j.lastIndex++;const R=E[2],W=Math.max(1,Math.floor(k.trim().length*.2));if(R&&Math.abs(R.length-k.trim().length)<=W){const h=I==="movie"?`/movie/${P.slug||me(P.title)}`:`/cast/${P._id}`;Ce(t,R,h)!==t&&(z.some(T=>T._id===P._id)||z.push({...P,type:I,linkUrl:h,displayName:R}));break}}};n.forEach(k=>L(k.title,k,"movie")),u.forEach(k=>L(k.name,k,"cast")),s(z)},500);return()=>clearTimeout(l)},[t,n,u]);const O=l=>{d(Ce(t,l.displayName,l.linkUrl)),r&&r._id===l._id&&x(null)},c=()=>{if(!window.confirm(`Auto-link all ${o.length} detected mentions?`))return;let l=t;o.forEach(v=>{l=Ce(l,v.displayName,v.linkUrl)}),d(l)},S=l=>{d(t.replace(l.fullTag,l.text))},p=l=>{const v=t.replace(/<[^>]*>/g," "),y=v.toLowerCase().indexOf(l.displayName.toLowerCase());if(y===-1)return null;const N=Math.max(0,y-45),m=Math.min(v.length,y+l.displayName.length+45),L=("..."+v.substring(N,m).replace(/\s+/g," ")+"...").split(new RegExp(`(${he(l.displayName)})`,"i"));return e.jsx("div",{style:{fontSize:".75rem",fontStyle:"italic",color:"var(--muted)",background:"rgba(255,255,255,0.05)",padding:8,borderRadius:4,marginTop:12},children:L.map((k,P)=>k.toLowerCase()===l.displayName.toLowerCase()?e.jsx("strong",{style:{color:"var(--text)"},children:k},P):k)})};return o.length===0&&g.length===0?null:e.jsxs(e.Fragment,{children:[(o.length>0||g.length>0)&&e.jsxs("div",{style:{marginTop:10,padding:12,background:"rgba(126,200,227,.04)",border:"1px solid rgba(126,200,227,.15)",borderRadius:8},children:[o.length>0&&e.jsxs("div",{style:{marginBottom:g.length>0?16:0},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},children:[e.jsx("span",{style:{fontSize:".75rem",fontWeight:700,color:"#7ec8e3"},children:"✨ Detected Mentions (Not Linked Yet)"}),e.jsx("button",{className:"bg-btn bg-btn-blue",style:{fontSize:".7rem",padding:"4px 8px"},onClick:c,children:"🔗 Link All"})]}),e.jsx("div",{style:{display:"flex",gap:10,flexWrap:"wrap",maxHeight:160,overflowY:"auto",paddingBottom:6,paddingRight:4},children:o.map(l=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,background:"var(--bg3)",padding:"6px 10px",borderRadius:6,border:"1px solid rgba(126,200,227,.3)",width:"max-content"},children:[e.jsx("img",{src:l.type==="movie"?l.posterUrl||l.thumbnailUrl:l.photo,alt:l.displayName,style:{width:24,height:24,borderRadius:l.type==="cast"?"50%":4,objectFit:"cover"},onError:v=>v.target.style.display="none"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:".75rem",fontWeight:700,color:"var(--text)"},children:l.displayName}),e.jsx("div",{style:{fontSize:".65rem",color:"var(--muted)"},children:l.type==="movie"?"Movie":"Cast/Crew"})]}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".65rem",padding:"3px 8px",marginLeft:4},onClick:()=>x(l),children:"Verify"}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".65rem",padding:"3px 6px",color:"#e57373"},onClick:()=>$([...C,l._id]),title:"Ignore",children:"✕"})]},l._id))})]}),g.length>0&&e.jsxs("div",{style:{borderTop:o.length>0?"1px solid rgba(255,255,255,.05)":"none",paddingTop:o.length>0?10:0},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",marginBottom:8},children:e.jsx("span",{style:{fontSize:".75rem",fontWeight:700,color:"var(--muted)"},children:"✅ Already Linked"})}),e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap",maxHeight:120,overflowY:"auto",paddingBottom:4,paddingRight:4},children:g.map(l=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.03)",padding:"4px 8px",borderRadius:4,border:"1px solid rgba(255,255,255,.08)",width:"max-content"},children:[e.jsx("span",{style:{fontSize:".72rem",color:"var(--text)"},children:l.text}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".6rem",padding:"2px 6px",color:"#e57373"},onClick:()=>S(l),children:"✕ Unlink"})]},l.id))})]})]}),r&&e.jsx("div",{className:"bg-overlay",onClick:l=>l.target===l.currentTarget&&x(null),style:{zIndex:1e5},children:e.jsxs("div",{className:"bg-modal",style:{maxWidth:500},children:[e.jsxs("div",{className:"bg-modal-head",children:[e.jsx("span",{className:"bg-modal-title",children:"🔍 Verify Entity Link"}),e.jsx("button",{className:"bg-modal-close",onClick:()=>x(null),children:"×"})]}),e.jsxs("div",{className:"bg-modal-body",style:{display:"flex",gap:16},children:[e.jsx("img",{src:r.type==="movie"?r.posterUrl||r.thumbnailUrl:r.photo,alt:r.displayName,style:{width:120,height:r.type==="movie"?170:120,borderRadius:r.type==="cast"?"50%":8,objectFit:"cover",border:"1px solid var(--border)"},onError:l=>l.target.style.display="none"}),e.jsxs("div",{style:{flex:1},children:[e.jsx("h3",{style:{margin:"0 0 4px 0",fontSize:"1.2rem",color:"var(--text)"},children:r.displayName}),e.jsx("div",{style:{fontSize:".8rem",color:"var(--gold)",fontWeight:600,marginBottom:12},children:r.type==="movie"?"🎬 Movie":`🎭 ${r.type||"Cast/Crew"}`}),p(r),r.type==="movie"?e.jsxs(e.Fragment,{children:[r.releaseDate&&e.jsxs("div",{style:{fontSize:".75rem",marginBottom:4,color:"var(--muted)"},children:[e.jsx("strong",{children:"Released:"})," ",new Date(r.releaseDate).getFullYear()]}),r.director&&e.jsxs("div",{style:{fontSize:".75rem",marginBottom:8,color:"var(--muted)"},children:[e.jsx("strong",{children:"Director:"})," ",r.director]}),r.synopsis?e.jsx("div",{style:{fontSize:".8rem",color:"var(--text)",lineHeight:1.5,maxHeight:100,overflowY:"auto",marginTop:12},children:r.synopsis}):e.jsx("div",{style:{fontSize:".8rem",color:"var(--muted)",fontStyle:"italic",marginTop:12},children:"No synopsis available."}),r.cast&&r.cast.length>0&&e.jsxs("div",{style:{marginTop:12,fontSize:".75rem",color:"var(--muted)"},children:[e.jsx("strong",{children:"Cast:"})," ",r.cast.slice(0,4).map(l=>l.name).join(", "),r.cast.length>4?"...":""]})]}):e.jsxs(e.Fragment,{children:[r.bio?e.jsx("div",{style:{fontSize:".8rem",color:"var(--text)",lineHeight:1.5,maxHeight:120,overflowY:"auto",marginTop:12},children:r.bio}):e.jsx("div",{style:{fontSize:".8rem",color:"var(--muted)",fontStyle:"italic",marginTop:12},children:"No bio available."}),e.jsxs("div",{style:{marginTop:12,fontSize:".75rem",color:"var(--muted)"},children:[e.jsx("strong",{children:"Roles:"})," ",r.roles&&r.roles.length>0?r.roles.join(", "):r.type||"Cast/Crew"]}),e.jsxs("div",{style:{marginTop:12,fontSize:".75rem",color:"var(--muted)"},children:[e.jsx("strong",{children:"Filmography:"})," ",n.filter(l=>l.cast&&l.cast.some(v=>v.castId===r._id||v.name===r.name)).slice(0,8).map(l=>l.title).join(", ")||"No known movies in database."]})]})]})]}),e.jsxs("div",{className:"bg-modal-foot",children:[e.jsx("button",{className:"bg-btn bg-btn-ghost",onClick:()=>x(null),children:"Cancel"}),e.jsx("button",{className:"bg-btn bg-btn-blue",onClick:()=>O(r),children:"✅ Approve & Link"})]})]})})]})}function Re({article:t,movies:n=[],cast:u=[],onClose:d,onSaved:o,onToast:s}){const[g,f]=i.useState(t.title||""),[r,x]=i.useState(t.content||""),[C,$]=i.useState(t.excerpt||""),[O,c]=i.useState(t.category||be[0]),[S,p]=i.useState(Array.isArray(t.tags)?t.tags.join(", "):t.tags||""),[l,v]=i.useState(t.coverImage||""),[y,N]=i.useState(t.published!==!1),[m,z]=i.useState(t.youtubeVideoId||""),[L,k]=i.useState(!1),P=i.useRef(null);Je.useEffect(()=>{t!=null&&t.slug&&!t.content&&Ke(async()=>{const{API:b}=await import("./index-FzR8z_fe.js").then(D=>D.a);return{API:b}},__vite__mapDeps([0,1])).then(({API:b})=>{b.getBlogPost(t.slug).then(D=>{D&&(x(D.content||""),D.excerpt&&!t.excerpt&&$(D.excerpt),D.tags&&!t.tags&&p(Array.isArray(D.tags)?D.tags.join(", "):D.tags))}).catch(D=>console.error("Failed to fetch full blog:",D))})},[t]);const I=t.castId||t.castName?"cast":t.movieId||t.movieTitle?"movie":"none",[j,E]=i.useState(I),[R,W]=i.useState(t.movieId||t.movieTitle?{_id:t.movieId,title:t.movieTitle,posterUrl:t.coverImage}:null),[h,w]=i.useState(""),[T,A]=i.useState([]),B=i.useRef(null),[F,V]=i.useState(t.castId||t.castName?{_id:t.castId,name:t.castName,type:"",photo:""}:null),[Z,te]=i.useState(""),[Q,J]=i.useState([]),X=i.useRef(null);i.useEffect(()=>{const b=h.trim().toLowerCase();if(!b){A([]);return}return clearTimeout(B.current),B.current=setTimeout(()=>{A(n.filter(D=>D.title.toLowerCase().includes(b)).slice(0,6))},150),()=>clearTimeout(B.current)},[h,n]),i.useEffect(()=>{const b=Z.trim().toLowerCase();if(!b){J([]);return}return clearTimeout(X.current),X.current=setTimeout(()=>{J(u.filter(D=>D.name.toLowerCase().includes(b)).slice(0,6))},150),()=>clearTimeout(X.current)},[Z,u]);const je=b=>{W(b),w(""),A([])},re=()=>{W(null),w(""),A([])},we=b=>{V(b),te(""),J([])},se=()=>{V(null),te(""),J([])},oe=async()=>{k(!0);try{const b=ye(m),D=await rt(t._id,{title:g.trim(),content:r.trim(),excerpt:C.trim()||r.slice(0,200).trim()+"…",category:O,tags:typeof S=="string"?S.split(",").map(_=>_.trim()).filter(Boolean):S,coverImage:l,published:y,youtubeVideoId:b,castId:j==="cast"&&(F!=null&&F._id)?F._id:null,castName:j==="cast"&&(F!=null&&F.name)?F.name:"",movieId:j==="movie"&&(R!=null&&R._id)?R._id:null,movieTitle:j==="movie"&&(R!=null&&R.title)?R.title:""});o(D),s("✅ Article updated!","success"),d()}catch(b){s("❌ "+b.message,"error")}k(!1)};return e.jsx("div",{className:"bg-overlay",onClick:b=>b.target===b.currentTarget&&d(),children:e.jsxs("div",{className:"bg-modal",children:[e.jsxs("div",{className:"bg-modal-head",children:[e.jsx("span",{className:"bg-modal-title",children:"✏️ Edit Article"}),e.jsx("button",{className:"bg-modal-close",onClick:d,children:"×"})]}),e.jsxs("div",{className:"bg-modal-body",children:[e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Title"}),e.jsx("input",{className:"bg-field-input",value:g,onChange:b=>f(b.target.value)})]}),e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Excerpt"}),e.jsx("input",{className:"bg-field-input",value:C,onChange:b=>$(b.target.value),placeholder:"Short teaser shown on blog cards…"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Category / Type"}),e.jsx("select",{className:"bg-field-input",value:O,onChange:b=>c(b.target.value),style:{appearance:"auto"},children:be.map(b=>e.jsx("option",{value:b,children:b},b))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Tags ",e.jsx("span",{style:{fontWeight:400,textTransform:"none"},children:"(comma-separated)"})]}),e.jsx("input",{className:"bg-field-input",placeholder:"Ollywood, Drama…",value:S,onChange:b=>p(b.target.value)})]})]}),e.jsxs("div",{style:{marginBottom:10},children:[e.jsx("label",{className:"bg-field-label",children:"Cover Image URL"}),e.jsx(We,{value:l,onChange:v,placeholder:"https://…",source:"Blog"}),l&&e.jsx("img",{src:l,alt:"cover",style:{marginTop:6,maxHeight:80,borderRadius:5,border:"1px solid var(--border)",display:"block"},onError:b=>b.target.style.display="none"})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",style:{marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("span",{children:"Content"}),e.jsx("button",{type:"button",className:"bg-btn bg-btn-blue",style:{padding:"3px 8px",fontSize:".7rem"},onClick:async()=>{if(r.trim())try{const b=H(),D=await fetch(`${G}/admin/blog/auto-link`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${b}`},body:JSON.stringify({content:r,movieId:(R==null?void 0:R._id)||t.movieId})});if(D.ok){const _=await D.json();_.content&&(x(_.content),s("⚡ Auto-linked all movie & cast names in your pasted article!","success"))}}catch(b){s("❌ Auto-link error: "+b.message,"error")}},children:"⚡ Auto-Link Movies & Cast"})]}),e.jsx(Oe,{textareaRef:P,content:r,onChange:x,onToast:s}),e.jsx("textarea",{ref:P,className:"bg-field-input bg-field-textarea tall",value:r,onChange:b=>x(b.target.value)}),e.jsx(Ae,{content:r,movies:n,cast:u,onChange:x})]}),e.jsx(ve,{value:m,onChange:z}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",style:{marginBottom:8},children:["Link to",e.jsx("span",{style:{fontWeight:400,textTransform:"none",fontSize:".65rem",color:"var(--muted)"},children:" optional"})]}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:10},children:[["none","📝 Standalone"],["movie","🎬 Movie"],["cast","🎭 Cast / Crew"]].map(([b,D])=>e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{flex:1,justifyContent:"center",fontSize:".78rem",background:j===b?"rgba(201,151,58,.15)":"var(--bg3)",borderColor:j===b?"var(--gold)":"var(--border)",color:j===b?"var(--gold)":"var(--muted)",fontWeight:j===b?700:500},onClick:()=>{E(b),b!=="movie"&&re(),b!=="cast"&&se()},children:D},b))}),j==="movie"&&(R?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(201,151,58,.08)",border:"1px solid rgba(201,151,58,.3)",borderRadius:8},children:[R.posterUrl&&e.jsx("img",{src:R.posterUrl,alt:R.title,style:{width:26,height:38,objectFit:"cover",borderRadius:3,border:"1px solid var(--border)"},onError:b=>b.target.style.display="none"}),e.jsxs("span",{style:{flex:1,fontWeight:700,fontSize:".84rem",color:"var(--gold)"},children:["🎬 ",R.title]}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".68rem",padding:"3px 8px"},onClick:re,children:"✕ Remove"})]}):e.jsxs("div",{style:{position:"relative"},children:[e.jsx("input",{className:"bg-field-input",placeholder:"Search movie to link…",value:h,onChange:b=>w(b.target.value)}),T.length>0&&e.jsx("div",{className:"bg-movie-dd",children:T.map(b=>e.jsxs("div",{className:"bg-movie-dd-item",onClick:()=>je(b),children:["🎬 ",b.title,e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)",marginLeft:8},children:b.releaseDate?new Date(b.releaseDate).getFullYear():""})]},b._id))})]})),j==="cast"&&(F?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(167,139,232,.08)",border:"1px solid rgba(167,139,232,.3)",borderRadius:8},children:[F.photo&&e.jsx("img",{src:F.photo,alt:F.name,style:{width:34,height:34,objectFit:"cover",borderRadius:"50%",border:"1px solid var(--border)"},onError:b=>b.target.style.display="none"}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:".84rem",color:"#a78be8"},children:["🎭 ",F.name]}),F.type&&e.jsx("div",{style:{fontSize:".68rem",color:"var(--muted)"},children:F.type})]}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".68rem",padding:"3px 8px"},onClick:se,children:"✕ Remove"})]}):e.jsxs("div",{style:{position:"relative"},children:[e.jsx("input",{className:"bg-field-input",placeholder:"Search cast/crew member…",value:Z,onChange:b=>te(b.target.value)}),Q.length>0&&e.jsx("div",{className:"bg-movie-dd",children:Q.map(b=>e.jsxs("div",{className:"bg-movie-dd-item",onClick:()=>we(b),style:{display:"flex",alignItems:"center",gap:8},children:[b.photo?e.jsx("img",{src:b.photo,alt:b.name,style:{width:24,height:24,borderRadius:"50%",objectFit:"cover"},onError:D=>D.target.style.display="none"}):e.jsx("span",{style:{fontSize:"1rem"},children:"👤"}),e.jsx("span",{style:{flex:1},children:b.name}),e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)"},children:b.type})]},b._id))})]}))]}),e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:".84rem",color:"var(--text)"},children:[e.jsx("input",{type:"checkbox",checked:y,onChange:b=>N(b.target.checked)}),"Published (visible on public blog)"]})]}),e.jsxs("div",{className:"bg-modal-foot",children:[e.jsx("button",{className:"bg-btn bg-btn-ghost",onClick:d,children:"Cancel"}),e.jsx("button",{className:"bg-btn bg-btn-gold",onClick:oe,disabled:L||!g.trim()||!r.trim(),children:L?e.jsxs(e.Fragment,{children:[e.jsx(q,{})," Saving…"]}):"💾 Save Changes"})]})]})})}function nt({movies:t=[],cast:n=[],onClose:u,onPublished:d,onToast:o}){const[s,g]=i.useState("ai"),[f,r]=i.useState(1),[x,C]=i.useState(""),[$,O]=i.useState([]),[c,S]=i.useState(null),p=i.useRef(null),[l,v]=i.useState(""),[y,N]=i.useState([]),[m,z]=i.useState(null),L=i.useRef(null),[k,P]=i.useState("movie"),[I,j]=i.useState("review"),[E,R]=i.useState("profile"),[W,h]=i.useState(""),[w,T]=i.useState(""),[A,B]=i.useState(""),[F,V]=i.useState("General"),[Z,te]=i.useState(""),[Q,J]=i.useState(""),[X,je]=i.useState(!0),[re,we]=i.useState(""),[se,oe]=i.useState(!1),[b,D]=i.useState(!1),[_,ee]=i.useState(""),le=i.useRef(null);i.useEffect(()=>{const a=x.trim().toLowerCase();if(!a){O([]);return}return clearTimeout(p.current),p.current=setTimeout(()=>{O(t.filter(U=>U.title.toLowerCase().includes(a)).slice(0,6))},150),()=>clearTimeout(p.current)},[x,t]),i.useEffect(()=>{const a=l.trim().toLowerCase();if(!a){N([]);return}return clearTimeout(L.current),L.current=setTimeout(()=>{N(n.filter(U=>U.name.toLowerCase().includes(a)).slice(0,6))},150),()=>clearTimeout(L.current)},[l,n]);const He=a=>{S(a),z(null),C(""),O([]),w||T(de(a,I)),!Q&&(a.posterUrl||a.thumbnailUrl)&&J(a.posterUrl||a.thumbnailUrl||""),V($e(I))},Ee=()=>{S(null),C(""),O([])},Ge=a=>{z(a),S(null),v(""),N([]),w||T(ge(a,E)),!Q&&a.photo&&J(a.photo||""),V("Actor Spotlight")},Be=()=>{z(null),v(""),N([])};i.useEffect(()=>{c&&(T(de(c,I)),V($e(I)))},[I]),i.useEffect(()=>{m&&(T(ge(m,E)),V("Actor Spotlight"))},[E]);const De=a=>{g(a),r(1),ee(""),B("")},Ve=i.useCallback(()=>{const a=`

OUTPUT RULES — STRICTLY FOLLOW:
- Output ONLY clean HTML wrapped in <article>. No markdown. No plain text outside tags.
- Use <h2> for section headings, <h3> for sub-headings
- Use <p> for paragraphs (2–3 sentences each)
- Use <ul><li> for bullet lists, <ol><li> for numbered lists
- Use <strong> for emphasis, <table> for data
- End with a FAQ section: <section class="faq-section"><h2>Frequently Asked Questions</h2> with 4 <details><summary> items
- Do NOT use inline styles. Do NOT output anything outside <article>.`;if(m&&k==="cast"){const M=Me(m,E);return W.trim()?`${M}

Editor notes: ${W.trim()}`:M}if(I==="custom"){const M=W.trim()||"Write an engaging 1000+ word blog article about Ollywood cinema.";if(c){const Y=(c.cast||[]).slice(0,5).map(K=>`${K.name}${K.role?` as ${K.role}`:""}`).join(", "),Se=c.releaseDate?new Date(c.releaseDate).getFullYear():"upcoming",Ne=`

[Movie context: "${c.title}" (${Se}), Director: ${c.director||"N/A"}, Cast: ${Y||"N/A"}, Synopsis: ${c.synopsis||"N/A"}]`;return`${M}${Ne}${a}`}return`${M}${a}`}if(c){const M=Ue(c,I);return W.trim()?`${M}

Editor notes: ${W.trim()}`:M}return`You are an expert SEO blog writer for Ollypedia, an Odia cinema website.

Instructions: ${W.trim()||"Write an engaging 1000+ word blog article about Ollywood cinema."}

${a}

IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no backticks, no extra text) in this exact format:
{"title": "Your Blog Title Here", "content": "<article>...full HTML content here...</article>"}`},[c,m,k,I,E,W]),Qe=async()=>{var a,U,M;if(I==="custom"&&!m&&!W.trim()){ee("Please write your custom prompt before generating.");return}ee(""),oe(!0),B("");try{const Y=await xe(Ve()),Se=k==="cast"&&m,Ne=!!c&&I!=="custom";if(Se)B(Y),w||T(ge(m,E));else if(Ne)B(Y),w||T(de(c,I));else{let K=null;try{const ce=Y.replace(/```json|```/g,"").trim();K=JSON.parse(ce)}catch{const ce=Y.split(`
`).filter(Boolean);K={title:((a=ce[0])==null?void 0:a.slice(0,100))||"New Blog Post",content:ce.slice(1).join(`
`).trim()||Y}}T(((U=K.title)==null?void 0:U.trim())||"New Blog Post"),B(((M=K.content)==null?void 0:M.trim())||Y)}r(2)}catch(Y){ee(Y.message),o("❌ "+Y.message,"error")}oe(!1)},qe=async()=>{if(!(!w.trim()||!A.trim())){ee(""),D(!0);try{const a=await at({title:w,content:A,category:F,tags:Z,coverImage:Q,movie:k==="movie"?c:null,castMember:k==="cast"?m:null,published:X,youtubeVideoId:ye(re)});d(a),u()}catch(a){ee(a.message),o("❌ "+a.message,"error")}D(!1)}},Pe=e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",style:{marginBottom:8},children:["Link to",e.jsx("span",{style:{fontWeight:400,textTransform:"none",fontSize:".65rem",color:"var(--muted)"},children:"optional"})]}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:10},children:[["none","📝 Standalone"],["movie","🎬 Movie"],["cast","🎭 Cast / Crew"]].map(([a,U])=>e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{flex:1,justifyContent:"center",fontSize:".78rem",background:k===a?"rgba(201,151,58,.15)":"var(--bg3)",borderColor:k===a?"var(--gold)":"var(--border)",color:k===a?"var(--gold)":"var(--muted)",fontWeight:k===a?700:500},onClick:()=>{P(a),a!=="movie"&&Ee(),a!=="cast"&&Be()},children:U},a))}),k==="movie"&&(c?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(201,151,58,.08)",border:"1px solid rgba(201,151,58,.3)",borderRadius:8},children:[(c.posterUrl||c.thumbnailUrl)&&e.jsx("img",{src:c.posterUrl||c.thumbnailUrl,alt:c.title,style:{width:26,height:38,objectFit:"cover",borderRadius:3,border:"1px solid var(--border)"},onError:a=>a.target.style.display="none"}),e.jsxs("span",{style:{flex:1,fontWeight:700,fontSize:".84rem",color:"var(--gold)"},children:["🎬 ",c.title]}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".68rem",padding:"3px 8px"},onClick:Ee,children:"✕ Remove"})]}):e.jsxs("div",{style:{position:"relative"},children:[e.jsx("input",{className:"bg-field-input",placeholder:"Search movie to link…",value:x,onChange:a=>C(a.target.value)}),$.length>0&&e.jsx("div",{className:"bg-movie-dd",children:$.map(a=>e.jsxs("div",{className:"bg-movie-dd-item",onClick:()=>He(a),children:["🎬 ",a.title,e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)",marginLeft:8},children:a.releaseDate?new Date(a.releaseDate).getFullYear():""})]},a._id))})]})),k==="cast"&&(m?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(167,139,232,.08)",border:"1px solid rgba(167,139,232,.3)",borderRadius:8},children:[m.photo&&e.jsx("img",{src:m.photo,alt:m.name,style:{width:34,height:34,objectFit:"cover",borderRadius:"50%",border:"1px solid var(--border)"},onError:a=>a.target.style.display="none"}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:".84rem",color:"#a78be8"},children:["🎭 ",m.name]}),e.jsx("div",{style:{fontSize:".68rem",color:"var(--muted)"},children:m.type})]}),e.jsx("button",{className:"bg-btn bg-btn-ghost",style:{fontSize:".68rem",padding:"3px 8px"},onClick:Be,children:"✕ Remove"})]}):e.jsxs("div",{style:{position:"relative"},children:[e.jsx("input",{className:"bg-field-input",placeholder:"Search cast/crew member…",value:l,onChange:a=>v(a.target.value)}),y.length>0&&e.jsx("div",{className:"bg-movie-dd",children:y.map(a=>e.jsxs("div",{className:"bg-movie-dd-item",onClick:()=>Ge(a),style:{display:"flex",alignItems:"center",gap:8},children:[a.photo?e.jsx("img",{src:a.photo,alt:a.name,style:{width:24,height:24,borderRadius:"50%",objectFit:"cover"},onError:U=>U.target.style.display="none"}):e.jsx("span",{style:{fontSize:"1rem"},children:"👤"}),e.jsx("span",{style:{flex:1},children:a.name}),e.jsx("span",{style:{fontSize:".7rem",color:"var(--muted)"},children:a.type})]},a._id))})]}))]}),Fe=e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Category"}),e.jsx("select",{className:"bg-field-input",value:F,onChange:a=>V(a.target.value),style:{appearance:"auto"},children:be.map(a=>e.jsx("option",{value:a,children:a},a))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Tags ",e.jsx("span",{style:{fontWeight:400,textTransform:"none"},children:"(comma-separated)"})]}),e.jsx("input",{className:"bg-field-input",placeholder:"Ollywood, Drama, 2025…",value:Z,onChange:a=>te(a.target.value)})]})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Cover Image URL ",e.jsx("span",{style:{fontWeight:400,textTransform:"none"},children:"(optional)"})]}),e.jsx(We,{value:Q,onChange:J,placeholder:"https://…",source:"Blog"}),Q&&e.jsx("img",{src:Q,alt:"cover",style:{marginTop:6,maxHeight:80,borderRadius:5,border:"1px solid var(--border)",display:"block"},onError:a=>a.target.style.display="none"})]}),e.jsx(ve,{value:re,onChange:we}),c&&k==="movie"&&e.jsxs("div",{style:{padding:"7px 12px",background:"rgba(201,151,58,.06)",border:"1px solid rgba(201,151,58,.22)",borderRadius:7,fontSize:".76rem",color:"var(--gold)"},children:["🎬 Linked to movie: ",e.jsx("b",{children:c.title})]}),m&&k==="cast"&&e.jsxs("div",{style:{padding:"7px 12px",background:"rgba(167,139,232,.06)",border:"1px solid rgba(167,139,232,.22)",borderRadius:7,fontSize:".76rem",color:"#a78be8"},children:["🎭 Linked to cast: ",e.jsx("b",{children:m.name})," (",m.type,")"]}),e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:".84rem",color:"var(--text)"},children:[e.jsx("input",{type:"checkbox",checked:X,onChange:a=>je(a.target.checked)}),"Publish immediately (visible on public blog)"]})]});return e.jsx("div",{className:"bg-overlay",onClick:a=>a.target===a.currentTarget&&u(),children:e.jsxs("div",{className:"bg-modal",children:[e.jsxs("div",{className:"bg-modal-head",children:[e.jsxs("span",{className:"bg-modal-title",children:["✍️ New Blog Post",s==="ai"&&f===2&&e.jsx("span",{style:{fontSize:".7rem",fontWeight:500,color:"var(--muted)",marginLeft:10},children:"— Review & Publish"})]}),e.jsx("button",{className:"bg-modal-close",onClick:u,children:"×"})]}),e.jsxs("div",{className:"bg-modal-body",children:[f===1&&e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",style:{marginBottom:8},children:"How do you want to write this blog?"}),e.jsxs("div",{className:"nb-mode-row",children:[e.jsx("button",{className:`nb-mode-btn${s==="ai"?" active":""}`,onClick:()=>De("ai"),children:"✨ AI Generate"}),e.jsx("button",{className:`nb-mode-btn${s==="manual"?" active":""}`,onClick:()=>De("manual"),children:"✏️ Write Manually"})]})]}),s==="ai"&&f===1&&e.jsxs(e.Fragment,{children:[Pe,k==="cast"&&m&&e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Article Type"}),e.jsx("div",{className:"bg-types",style:{marginBottom:8},children:pe.map(a=>e.jsx("button",{className:`bg-type-chip${E===a.id?" active":""}`,style:{borderColor:a.color,color:E===a.id?"#fff":a.color,background:E===a.id?a.color:"transparent",borderStyle:a.id==="custom"?"dashed":"solid"},onClick:()=>R(a.id),children:a.label},a.id))})]}),k!=="cast"&&e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Article Type"}),e.jsx("div",{className:"bg-types",style:{marginBottom:I==="custom"?8:0},children:ze.map(a=>e.jsx("button",{className:`bg-type-chip${I===a.id?" active":""}`,style:{borderColor:a.color,color:I===a.id?a.id==="review"?"#000":"#fff":a.color,background:I===a.id?a.color:"transparent",borderStyle:a.id==="custom"?"dashed":"solid"},onClick:()=>j(U=>U===a.id?c?"review":null:a.id),children:a.label},a.id))}),I==="custom"&&e.jsxs("div",{style:{padding:"8px 12px",background:"rgba(160,196,160,.08)",border:"1px solid rgba(160,196,160,.2)",borderRadius:7,fontSize:".72rem",color:"#a0c4a0",lineHeight:1.65},children:["✏️ ",e.jsx("strong",{children:"Custom mode"})," — write any prompt you like below.",c&&" Movie data is available as optional context."]})]}),e.jsx("hr",{className:"nb-divider"}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:[k==="cast"&&E==="custom"||k!=="cast"&&I==="custom"?"Your Custom Prompt":c||m?"Extra Notes for AI":"What should the blog be about?",e.jsx("span",{style:{fontWeight:400,textTransform:"none",fontSize:".65rem",color:"var(--muted)"},children:k==="cast"&&E==="custom"||k!=="cast"&&I==="custom"?"required":c||m?"optional":"required"})]}),e.jsx("textarea",{className:"bg-field-input bg-field-textarea",placeholder:m&&k==="cast"?'e.g. "Focus on their most emotional performances" or "Highlight their contribution to Odia cinema"':c?'e.g. "Focus on the emotional climax" or "Highlight the music score"…':"Describe your blog topic, tone, key points and audience.",value:W,onChange:a=>h(a.target.value),style:{minHeight:100}})]}),e.jsx("hr",{className:"nb-divider"}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Blog Title",e.jsx("span",{style:{fontWeight:400,textTransform:"none",fontSize:".65rem",color:"var(--muted)"},children:c||m?"auto-filled":"auto-generated by AI"})]}),c||m?e.jsx("input",{className:"bg-field-input",placeholder:"Leave blank to auto-fill…",value:w,onChange:a=>T(a.target.value)}):e.jsx("div",{style:{padding:"9px 12px",borderRadius:7,border:"1px dashed var(--border)",background:"rgba(255,255,255,.02)",fontSize:".82rem",color:"var(--muted)",fontStyle:"italic"},children:"✨ AI will generate the title from your prompt"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Category"}),e.jsx("select",{className:"bg-field-input",value:F,onChange:a=>V(a.target.value),style:{appearance:"auto"},children:be.map(a=>e.jsx("option",{value:a,children:a},a))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Tags"}),e.jsx("input",{className:"bg-field-input",placeholder:"Ollywood, Drama…",value:Z,onChange:a=>te(a.target.value)})]})]}),_&&e.jsxs("div",{className:"nb-err",children:["⚠️ ",_]})]}),s==="ai"&&f===2&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:"bg-field-label",children:"Blog Title"}),e.jsx("input",{className:"bg-field-input",value:w,onChange:a=>T(a.target.value)})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Generated Content — review & edit before publishing",e.jsxs("span",{style:{fontWeight:400,textTransform:"none",color:"var(--muted)",display:"flex",alignItems:"center",gap:8},children:[e.jsxs("span",{children:[Te(A)," words · ~",ie(A)," min"]}),e.jsx(Oe,{textareaRef:le,content:A,onChange:B,onToast:o})]})]}),e.jsx("textarea",{ref:le,className:"bg-field-input bg-field-textarea tall",style:{minHeight:240,resize:"vertical"},value:A,onChange:a=>B(a.target.value)}),e.jsx(Ae,{content:A,movies:t,cast:n,onChange:B})]}),Fe,_&&e.jsxs("div",{className:"nb-err",children:["⚠️ ",_]})]}),s==="manual"&&e.jsxs(e.Fragment,{children:[Pe,e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Blog Title ",e.jsx("span",{style:{color:"#e57373"},children:"*"})]}),e.jsx("input",{className:"bg-field-input",placeholder:"Enter your blog title…",value:w,onChange:a=>T(a.target.value)})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"bg-field-label",children:["Content ",e.jsx("span",{style:{color:"#e57373"},children:"*"}),e.jsxs("span",{style:{fontWeight:400,textTransform:"none",color:"var(--muted)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},children:[e.jsxs("span",{children:[Te(A)," words · ~",ie(A)," min"]}),e.jsx("button",{type:"button",className:"bg-btn bg-btn-blue",style:{padding:"4px 10px",fontSize:".72rem"},onClick:async()=>{if(A.trim())try{const a=H(),U=await fetch(`${G}/admin/blog/auto-link`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a}`},body:JSON.stringify({content:A,movieId:c==null?void 0:c._id})});if(U.ok){const M=await U.json();M.content&&(B(M.content),o("⚡ Auto-linked all movie & cast names in your pasted article!","success"))}}catch(a){o("❌ Auto-link error: "+a.message,"error")}},children:"⚡ Auto-Link Movies & Cast (SEO Safe)"}),e.jsx(Oe,{textareaRef:le,content:A,onChange:B,onToast:o})]})]}),e.jsx("textarea",{ref:le,className:"bg-field-input bg-field-textarea tall",style:{minHeight:260,resize:"vertical"},value:A,onChange:a=>B(a.target.value),placeholder:"Paste or write your full blog content here…"}),e.jsx(Ae,{content:A,movies:t,cast:n,onChange:B})]}),Fe,_&&e.jsxs("div",{className:"nb-err",children:["⚠️ ",_]})]})]}),e.jsxs("div",{className:"bg-modal-foot",children:[s==="ai"&&f===2&&e.jsx("button",{className:"bg-btn bg-btn-ghost",onClick:()=>{r(1),ee("")},children:"← Back & Re-generate"}),e.jsx("button",{className:"bg-btn bg-btn-ghost",onClick:u,children:"Cancel"}),s==="ai"&&f===1&&e.jsx("button",{className:"bg-btn bg-btn-blue",onClick:Qe,disabled:se||I==="custom"&&!W.trim(),children:se?e.jsxs(e.Fragment,{children:[e.jsx(q,{})," Generating… (up to 60 s)"]}):I==="custom"&&!W.trim()?"✏️ Enter your prompt first":"✨ Generate Blog"}),(s==="manual"||s==="ai"&&f===2)&&e.jsx("button",{className:"bg-btn bg-btn-green",onClick:qe,disabled:b||!w.trim()||!A.trim(),children:b?e.jsxs(e.Fragment,{children:[e.jsx(q,{})," Saving…"]}):X?"🚀 Publish Blog":"💾 Save as Draft"})]})]})})}function ot({movie:t,type:n,onPublished:u,onToast:d}){const[o,s]=i.useState("idle"),[g,f]=i.useState(""),[r,x]=i.useState(!1),[C,$]=i.useState(""),[O,c]=i.useState(""),[S,p]=i.useState(""),l=o==="generating"||o==="publishing",v=ze.find(m=>m.id===n),y=async()=>{if(n==="custom"&&!O.trim()){$("Please enter your custom prompt first.");return}s("generating"),f(""),$(""),x(!1);try{let m;if(n==="custom"){const z=(t.cast||[]).slice(0,5).map(I=>`${I.name}${I.role?` as ${I.role}`:""}`).join(", "),L=t.releaseDate?new Date(t.releaseDate).getFullYear():"upcoming",k=`

[Movie context: "${t.title}" (${L}), Director: ${t.director||"N/A"}, Cast: ${z||"N/A"}, Synopsis: ${t.synopsis||"N/A"}]`,P=`${O.trim()}${k}

IMPORTANT: Return ONLY the article text. No labels.`;m=await xe(P)}else m=await _e(t,n);f(m),s("ready")}catch(m){s("error"),$(m.message),d("❌ "+m.message,"error")}},N=async()=>{if(g.trim()){s("publishing"),$("");try{const m=await Ye(t,g,n==="custom"?"review":n,S);u(m),d(`✅ Published: "${v==null?void 0:v.label}" for ${t.title}`,"success"),s("idle"),f(""),x(!1)}catch(m){s("error"),$(m.message),d("❌ "+m.message,"error")}}};return e.jsxs("div",{className:"bg-gen-box",children:[n==="custom"&&e.jsxs("div",{style:{marginBottom:10},children:[e.jsx("div",{style:{fontSize:".68rem",fontWeight:700,color:"#a0c4a0",textTransform:"uppercase",letterSpacing:".07em",marginBottom:5},children:"✏️ Your Custom Prompt"}),e.jsx("textarea",{className:"bg-field-input bg-field-textarea",style:{minHeight:100,marginBottom:0},placeholder:`Write any prompt for this movie.
e.g. "Write a 1000-word article about the visual storytelling in ${t.title}"
e.g. "Write a comparison between ${t.title} and similar Bollywood films"`,value:O,onChange:m=>c(m.target.value)}),C&&e.jsxs("div",{className:"nb-err",style:{marginTop:6},children:["⚠️ ",C]})]}),e.jsxs("div",{className:"bg-gen-row",children:[e.jsx("span",{className:"bg-gen-label",style:{color:v==null?void 0:v.color},children:v==null?void 0:v.label}),C&&n!=="custom"&&e.jsxs("span",{style:{fontSize:".69rem",color:"#f77"},children:["⚠️ ",C]}),e.jsx("button",{className:"bg-btn bg-btn-gold",onClick:y,disabled:l||n==="custom"&&!O.trim(),children:o==="generating"?e.jsxs(e.Fragment,{children:[e.jsx(q,{}),"Generating…"]}):g?"🔄 Regenerate":"✨ Generate"}),g&&e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"bg-btn bg-btn-ghost",onClick:()=>x(m=>!m),disabled:l,children:r?"Hide":"Preview"}),e.jsx("button",{className:"bg-btn bg-btn-green",onClick:N,disabled:l,children:o==="publishing"?e.jsxs(e.Fragment,{children:[e.jsx(q,{}),"Publishing…"]}):"🚀 Publish"})]}),o==="error"&&n!=="custom"&&e.jsx("button",{className:"bg-btn bg-btn-red",onClick:y,children:"🔁 Retry"})]}),g&&r&&e.jsx("div",{className:"bg-gen-preview",children:g}),g&&e.jsx("div",{style:{marginTop:10},children:e.jsx(ve,{value:S,onChange:p})})]})}function lt({movie:t,movies:n=[],cast:u=[],onToast:d}){const[o,s]=i.useState([]),[g,f]=i.useState(!0),[r,x]=i.useState(null),[C,$]=i.useState(null);i.useEffect(()=>{f(!0),Xe(t.title).then(p=>s(p)).catch(()=>{}).finally(()=>f(!1))},[t.title]);const O=p=>{s(l=>[p,...l]),x(null)},c=async p=>{if(window.confirm("Delete this article? This cannot be undone."))try{await Le(p),s(l=>l.filter(v=>v._id!==p)),d("🗑 Article deleted","success")}catch{d("❌ Delete failed","error")}},S=p=>s(l=>l.map(v=>v._id===p._id?p:v));return e.jsxs("div",{className:"bg-panel",children:[g?e.jsx("div",{style:{fontSize:".77rem",color:"var(--muted)",padding:"6px 0 10px"},children:"Loading articles…"}):o.length>0&&e.jsxs("div",{style:{marginBottom:14},children:[e.jsxs("div",{className:"bg-section-label",children:["📄 Published Articles (",o.length,")"]}),e.jsx("div",{className:"bg-articles",children:o.map(p=>e.jsxs("div",{className:"bg-art-item",children:[e.jsx("div",{className:"bg-art-dot",style:{background:p.published?"#4caf82":"#666"}}),e.jsxs("div",{className:"bg-art-body",children:[e.jsx("div",{className:"bg-art-title",children:p.title}),e.jsxs("div",{className:"bg-art-meta",children:[e.jsx("span",{style:{color:p.published?"#4caf82":"#888",fontWeight:700},children:p.published?"● Live":"○ Draft"}),e.jsxs("span",{children:["📅 ",Ie(p.createdAt)]}),p.readTime&&e.jsxs("span",{children:["⏱ ",p.readTime," min"]}),p.views>0&&e.jsxs("span",{children:["👁 ",p.views]}),e.jsx("span",{style:{color:"rgba(255,255,255,.25)"},children:p.category})]})]}),e.jsxs("div",{className:"bg-art-actions",children:[e.jsx("a",{href:`/blog/${p.slug}`,target:"_blank",rel:"noreferrer",className:"bg-art-btn",children:"🔗 View"}),e.jsx("button",{className:"bg-art-btn",onClick:()=>$(p),children:"✏️"}),e.jsx("button",{className:"bg-art-btn del",onClick:()=>c(p._id),children:"🗑"})]})]},p._id))})]}),e.jsx("div",{className:"bg-section-label",children:"✨ Generate New Article — Choose Type"}),e.jsx("div",{className:"bg-types",children:ze.map(p=>e.jsx("button",{className:`bg-type-chip${r===p.id?" active":""}`,style:{borderColor:p.color,color:r===p.id?p.id==="review"?"#000":"#fff":p.color,background:r===p.id?p.color:"transparent"},onClick:()=>x(l=>l===p.id?null:p.id),children:p.label},p.id))}),r&&e.jsx(ot,{movie:t,type:r,onPublished:O,onToast:d},r),C&&e.jsx(Re,{article:C,movies:n,cast:u,onClose:()=>$(null),onSaved:S,onToast:d},C._id||"new")]})}function ct({castMember:t,movies:n=[],cast:u=[],onToast:d}){var P,I;const[o,s]=i.useState([]),[g,f]=i.useState(!0),[r,x]=i.useState(null),[C,$]=i.useState(null),[O,c]=i.useState(!1),[S,p]=i.useState(""),[l,v]=i.useState(""),[y,N]=i.useState("");i.useEffect(()=>{f(!0),et(t.name).then(s).catch(()=>{}).finally(()=>f(!1))},[t.name]);const m=async()=>{if(!(!S.trim()||!r))try{const j=ge(t,r),E=me(`${t.name}-${r}-${Date.now().toString(36)}`),R=S.slice(0,200).trim()+"…",W=H(),h=await fetch(`${G}/admin/blog`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${W}`},body:JSON.stringify({title:j,slug:E,content:S,excerpt:R,category:"Actor Spotlight",tags:[t.name,t.type||"Actor","Ollywood"],coverImage:t.photo||"",castName:t.name,castId:t._id,movieTitle:"",movieId:null,author:"OllyPedia Editorial",readTime:ie(S),seoTitle:j,seoDesc:R,published:!0,...y.trim()?{youtubeVideoId:ye(y)}:{}})});if(!h.ok){const T=await h.json().catch(()=>({}));throw new Error(T.error||"Publish failed")}const w=await h.json();ne(),s(T=>[w,...T]),x(null),p(""),N(""),d(`✅ Published: "${j}"`,"success")}catch(j){d("❌ "+j.message,"error")}},z=async j=>{c(!0),p(""),v("");try{const E=await xe(Me(t,j));p(E)}catch(E){v(E.message),d("❌ "+E.message,"error")}c(!1)},L=async j=>{if(window.confirm("Delete this article?"))try{await Le(j),s(E=>E.filter(R=>R._id!==j)),d("🗑 Deleted","success")}catch{d("❌ Delete failed","error")}},k=j=>s(E=>E.map(R=>R._id===j._id?j:R));return e.jsxs("div",{className:"bg-panel",children:[g?e.jsx("div",{style:{fontSize:".77rem",color:"var(--muted)",padding:"6px 0 10px"},children:"Loading articles…"}):o.length>0&&e.jsxs("div",{style:{marginBottom:14},children:[e.jsxs("div",{className:"bg-section-label",children:["📄 Published Articles (",o.length,")"]}),e.jsx("div",{className:"bg-articles",children:o.map(j=>e.jsxs("div",{className:"bg-art-item",children:[e.jsx("div",{className:"bg-art-dot",style:{background:j.published?"#4caf82":"#666"}}),e.jsxs("div",{className:"bg-art-body",children:[e.jsx("div",{className:"bg-art-title",children:j.title}),e.jsxs("div",{className:"bg-art-meta",children:[e.jsx("span",{style:{color:j.published?"#4caf82":"#888",fontWeight:700},children:j.published?"● Live":"○ Draft"}),e.jsxs("span",{children:["📅 ",Ie(j.createdAt)]}),j.readTime&&e.jsxs("span",{children:["⏱ ",j.readTime," min"]}),j.views>0&&e.jsxs("span",{children:["👁 ",j.views]})]})]}),e.jsxs("div",{className:"bg-art-actions",children:[e.jsx("a",{href:`/blog/${j.slug}`,target:"_blank",rel:"noreferrer",className:"bg-art-btn",children:"🔗 View"}),e.jsx("button",{className:"bg-art-btn",onClick:()=>$(j),children:"✏️"}),e.jsx("button",{className:"bg-art-btn del",onClick:()=>L(j._id),children:"🗑"})]})]},j._id))})]}),e.jsx("div",{className:"bg-section-label",children:"✨ Generate New Article — Choose Type"}),e.jsx("div",{className:"bg-types",children:pe.map(j=>e.jsx("button",{className:`bg-type-chip${r===j.id?" active":""}`,style:{borderColor:j.color,color:r===j.id?"#fff":j.color,background:r===j.id?j.color:"transparent"},onClick:()=>{x(E=>E===j.id?null:j.id),p(""),v("")},children:j.label},j.id))}),r&&e.jsxs("div",{className:"bg-gen-box",children:[e.jsxs("div",{className:"bg-gen-row",children:[e.jsx("span",{className:"bg-gen-label",style:{color:(P=pe.find(j=>j.id===r))==null?void 0:P.color},children:(I=pe.find(j=>j.id===r))==null?void 0:I.label}),l&&e.jsxs("span",{style:{fontSize:".69rem",color:"#f77"},children:["⚠️ ",l]}),e.jsx("button",{className:"bg-btn bg-btn-gold",onClick:()=>z(r),disabled:O,children:O?e.jsxs(e.Fragment,{children:[e.jsx(q,{}),"Generating…"]}):S?"🔄 Regenerate":"✨ Generate"}),S&&e.jsx("button",{className:"bg-btn bg-btn-green",onClick:m,disabled:O,children:"🚀 Publish"})]}),S&&e.jsx("div",{style:{marginTop:10},children:e.jsx(ve,{value:y,onChange:N})})]}),C&&e.jsx(Re,{article:C,movies:n,cast:u,onClose:()=>$(null),onSaved:k,onToast:d},C._id||"new")]})}function dt({castMember:t,artCount:n,onToast:u,movies:d=[],cast:o=[]}){const[s,g]=i.useState(!1);return e.jsxs("div",{className:"bg-cast-row",children:[e.jsxs("div",{className:"bg-cast-header",onClick:()=>g(f=>!f),children:[t.photo?e.jsx("img",{src:t.photo,alt:t.name,className:"bg-cast-photo",onError:f=>f.target.style.opacity="0"}):e.jsx("div",{className:"bg-cast-photo-ph",children:"👤"}),e.jsxs("div",{className:"bg-minfo",children:[e.jsx("div",{className:"bg-mtitle",children:t.name}),e.jsxs("div",{className:"bg-msub",children:[e.jsx("span",{style:{color:"#a78be8"},children:t.type||"Cast"}),n>0?e.jsxs("span",{className:"bg-mcount",children:[n," article",n!==1?"s":""]}):e.jsx("span",{className:"bg-mcount",style:{background:"rgba(255,255,255,.06)",color:"var(--muted)",borderColor:"var(--border)"},children:"No articles"})]})]}),e.jsx("div",{className:"bg-chevron",style:{transform:s?"rotate(90deg)":"none"},children:"▶"})]}),s&&e.jsx(ct,{castMember:t,movies:d,cast:o,onToast:u})]})}function gt({cast:t,movies:n=[],search:u,castCountMap:d,onToast:o,onCountChange:s}){const g=t.filter(f=>f.name.toLowerCase().includes(u.toLowerCase()));return t.length?g.length?e.jsx(e.Fragment,{children:g.map(f=>e.jsx(dt,{castMember:f,artCount:d[f.name]??0,movies:n,cast:t,onToast:o},f._id))}):e.jsx("div",{className:"bg-empty",children:"No cast members match your search."}):e.jsx("div",{className:"bg-empty",children:"No cast members found. Add cast first."})}function pt({onToast:t,count:n,onCountChange:u,movies:d=[],cast:o=[]}){const[s,g]=i.useState([]),[f,r]=i.useState(!0),[x,C]=i.useState(null);i.useEffect(()=>{r(!0),tt().then(g).catch(()=>{}).finally(()=>r(!1))},[]);const $=async c=>{if(window.confirm("Delete this article? This cannot be undone."))try{await Le(c),g(S=>S.filter(p=>p._id!==c)),u(-1),t("🗑 Article deleted","success")}catch{t("❌ Delete failed","error")}},O=c=>g(S=>S.map(p=>p._id===c._id?c:p));return f?e.jsx("div",{className:"bg-empty",style:{padding:24},children:"Loading…"}):s.length?e.jsxs("div",{className:"bg-uncat-list",children:[e.jsxs("div",{className:"bg-section-label",style:{marginBottom:10},children:["📝 Standalone Blogs — ",s.length," article",s.length!==1?"s":""]}),e.jsx("div",{className:"bg-articles",children:s.map(c=>e.jsxs("div",{className:"bg-art-item",children:[e.jsx("div",{className:"bg-art-dot",style:{background:c.published?"#4caf82":"#666"}}),e.jsxs("div",{className:"bg-art-body",children:[e.jsx("div",{className:"bg-art-title",children:c.title}),e.jsxs("div",{className:"bg-art-meta",children:[e.jsx("span",{style:{color:c.published?"#4caf82":"#888",fontWeight:700},children:c.published?"● Live":"○ Draft"}),e.jsxs("span",{children:["📅 ",Ie(c.createdAt)]}),c.readTime&&e.jsxs("span",{children:["⏱ ",c.readTime," min"]}),c.views>0&&e.jsxs("span",{children:["👁 ",c.views]}),e.jsx("span",{style:{color:"rgba(255,255,255,.25)"},children:c.category})]})]}),e.jsxs("div",{className:"bg-art-actions",children:[e.jsx("a",{href:`/blog/${c.slug}`,target:"_blank",rel:"noreferrer",className:"bg-art-btn",children:"🔗 View"}),e.jsx("button",{className:"bg-art-btn",onClick:()=>C(c),children:"✏️"}),e.jsx("button",{className:"bg-art-btn del",onClick:()=>$(c._id),children:"🗑"})]})]},c._id))}),x&&e.jsx(Re,{article:x,movies:d,cast:o,onClose:()=>C(null),onSaved:O,onToast:t},x._id||"new")]}):e.jsxs("div",{className:"bg-empty",children:[e.jsx("div",{style:{fontSize:"1.5rem",marginBottom:8},children:"📝"}),"No standalone blogs found.",e.jsx("br",{}),e.jsx("span",{style:{fontSize:".76rem",color:"var(--muted)"},children:"Blogs created without a movie or cast link will appear here."})]})}function ut({movie:t,artCount:n,onToast:u,movies:d=[],cast:o=[]}){const[s,g]=i.useState(!1),f=Ze(t.releaseDate,t.releaseDatePrecision,t.releaseTBA),x=(C=>!C||C==="Upcoming"?{bg:"rgba(245,158,11,0.12)",color:"#d97706",border:"1px solid rgba(245,158,11,0.3)"}:["Hit","Super Hit","Blockbuster"].includes(C)?{bg:"rgba(16,185,129,0.12)",color:"#059669",border:"1px solid rgba(16,185,129,0.3)"}:["Flop","Disaster"].includes(C)?{bg:"rgba(239,68,68,0.12)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.3)"}:{bg:"rgba(100,116,139,0.12)",color:"#475569",border:"1px solid rgba(100,116,139,0.25)"})(t.verdict);return e.jsxs("div",{className:"bg-movie-row",children:[e.jsxs("div",{className:"bg-movie-header",onClick:()=>g(C=>!C),children:[t.posterUrl||t.thumbnailUrl?e.jsx("img",{src:t.posterUrl||t.thumbnailUrl,alt:t.title,className:"bg-poster",onError:C=>C.target.style.opacity="0"}):e.jsx("div",{className:"bg-poster-ph",children:"🎬"}),e.jsxs("div",{className:"bg-minfo",children:[e.jsx("div",{className:"bg-mtitle",children:t.title}),e.jsxs("div",{className:"bg-msub",children:[e.jsxs("span",{className:"bg-badge-year",children:["📅 ",f]}),e.jsx("span",{children:(t.genre||[]).slice(0,3).join(", ")||"Odia Film"}),t.verdict&&e.jsx("span",{className:"bg-badge-verdict",style:{background:x.bg,color:x.color,border:x.border},children:t.verdict}),n>0&&e.jsxs("span",{className:"bg-mcount",children:["✨ ",n," article",n!==1?"s":""]}),n===0&&e.jsx("span",{className:"bg-mcount",style:{background:"var(--ap-pill-bg, #f1f5f9)",color:"var(--ap-text-muted, #64748b)",borderColor:"var(--ap-border, #e2e8f0)"},children:"No articles yet"})]})]}),e.jsx("div",{className:"bg-chevron",style:{transform:s?"rotate(90deg)":"none"},children:"▶"})]}),s&&e.jsx(lt,{movie:t,movies:d,cast:o,onToast:u})]})}function ht({movies:t=[],cast:n=[],onToast:u}){const[d,o]=i.useState(""),[s,g]=i.useState(""),[f,r]=i.useState("all"),[x,C]=i.useState(!1),[$,O]=i.useState(null),[c,S]=i.useState(!1),[p,l]=i.useState("movies"),[v,y]=i.useState({}),[N,m]=i.useState({}),[z,L]=i.useState(0),[k,P]=i.useState(!1);i.useEffect(()=>{fe().then(h=>{const w={},T={};let A=0;h.forEach(B=>{B.movieTitle&&(w[B.movieTitle]=(w[B.movieTitle]||0)+1),B.castName&&(T[B.castName]=(T[B.castName]||0)+1),!B.movieTitle&&!B.castName&&A++}),y(w),m(T),L(A)}).catch(()=>{}).finally(()=>P(!0))},[]);const I=Array.from(new Set(t.map(h=>{const w=String(h.releaseDate||"").trim();if(!w||w.toUpperCase()==="TBA")return null;const T=w.slice(0,4);return/^\d{4}$/.test(T)?T:null}).filter(Boolean))).sort((h,w)=>Number(w)-Number(h)),j=h=>{if(h.releaseTBA||!h.releaseDate||String(h.releaseDate).trim().toUpperCase()==="TBA")return{isTBA:!0,year:99999,precisionRank:1,dateValue:"",title:h.title||""};const w=String(h.releaseDate).trim(),T=w.match(/\b(19\d\d|20\d\d)\b/),A=T?parseInt(T[1],10):0;if(A===0)return{isTBA:!0,year:99999,precisionRank:1,dateValue:"",title:h.title||""};const B=h.releaseDatePrecision||(w.length===4?"year":w.length===7?"month":"full");let F=4;return B==="year"||/^\d{4}$/.test(w)?F=2:(B==="month"||/^\d{4}-\d{2}$/.test(w))&&(F=3),{isTBA:!1,year:A,precisionRank:F,dateValue:w,title:h.title||""}},R=[...t].sort((h,w)=>{const T=j(h),A=j(w);return T.isTBA&&!A.isTBA?-1:!T.isTBA&&A.isTBA?1:T.isTBA&&A.isTBA?T.title.localeCompare(A.title):T.year!==A.year?A.year-T.year:T.precisionRank!==A.precisionRank?T.precisionRank-A.precisionRank:T.dateValue!==A.dateValue?A.dateValue.localeCompare(T.dateValue):T.title.localeCompare(A.title)}).filter(h=>{const w=!d||h.title.toLowerCase().includes(d.toLowerCase()),T=String(h.releaseDate||"").slice(0,4),A=!s||T===s,B=v[h.title]||0,F=f==="all"?!0:f==="has_articles"?B>0:B===0;return w&&A&&F}),W=async()=>{if(window.confirm(`Generate review articles for all ${t.length} movies? This may take several minutes.`)){C(!0),O({done:0,total:t.length});for(let h=0;h<t.length;h++){try{const w=await _e(t[h],"review");await Ye(t[h],w,"review")}catch{}O({done:h+1,total:t.length}),await new Promise(w=>setTimeout(w,1200))}C(!1),O(null),u("✅ Bulk generation complete!","success")}};return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:st}),e.jsxs("div",{className:"bg-wrap",children:[e.jsxs("div",{className:"bg-header",children:[e.jsx("div",{className:"bg-title",children:"✨ AI Blog & SEO Engine"}),e.jsxs("div",{className:"bg-stats",children:[e.jsxs("span",{className:"bg-stats-pill",children:["🎬 ",e.jsx("b",{children:t.length})," movies"]}),e.jsxs("span",{className:"bg-stats-pill",children:["📝 ",e.jsx("b",{children:Object.values(v).reduce((h,w)=>h+w,0)+Object.values(N).reduce((h,w)=>h+w,0)+z})," total articles"]})]}),e.jsxs("select",{className:"bg-filter-select",value:s,onChange:h=>g(h.target.value),children:[e.jsx("option",{value:"",children:"All Release Years"}),I.map(h=>e.jsx("option",{value:h,children:h},h))]}),e.jsxs("select",{className:"bg-filter-select",value:f,onChange:h=>r(h.target.value),children:[e.jsx("option",{value:"all",children:"All Articles Status"}),e.jsx("option",{value:"has_articles",children:"With Articles Only"}),e.jsx("option",{value:"no_articles",children:"Without Articles"})]}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:".8rem",color:"var(--ap-text-muted, #64748b)",pointerEvents:"none"},children:"🔍"}),e.jsx("input",{className:"bg-search",placeholder:"Search title…",value:d,onChange:h=>o(h.target.value)})]}),e.jsx("button",{className:"bg-new-btn",onClick:()=>S(!0),children:"+ Write Blog"}),e.jsx("button",{className:"bg-bulk-btn",onClick:W,disabled:x,children:x?e.jsxs(e.Fragment,{children:[e.jsx(q,{})," Generating…"]}):"🚀 Bulk Generate Reviews"})]}),$&&e.jsxs("div",{className:"bg-progress",children:["⏳ ",$.done," / ",$.total," complete",e.jsx("div",{className:"bg-progress-bar",children:e.jsx("div",{className:"bg-progress-fill",style:{width:`${$.done/$.total*100}%`}})})]}),e.jsxs("div",{className:"bg-tip",children:["💡 ",e.jsx("b",{style:{color:"var(--text)"},children:"Two ways to create:"})," ","Click ",e.jsx("b",{style:{color:"#90caf9"},children:"✍️ New Blog"})," then choose ",e.jsx("b",{style:{color:"#90caf9"},children:"✨ AI Generate"})," or ",e.jsx("b",{style:{color:"#90caf9"},children:"✏️ Write Manually"})," — with or without linking a movie. Or expand any movie below and pick an article type for quick AI generation."]}),e.jsxs("div",{className:"bg-list",children:[e.jsxs("div",{className:"bg-main-tabs",children:[e.jsxs("button",{className:`bg-main-tab${p==="movies"?" active":""}`,onClick:()=>l("movies"),children:["🎬 Movies ",Object.keys(v).length>0&&e.jsxs("span",{style:{fontSize:".68rem",marginLeft:4,color:"var(--muted)"},children:["(",Object.values(v).reduce((h,w)=>h+w,0),")"]})]}),e.jsxs("button",{className:`bg-main-tab${p==="cast"?" active":""}`,onClick:()=>l("cast"),children:["🎭 Cast & Crew ",Object.keys(N).length>0&&e.jsxs("span",{style:{fontSize:".68rem",marginLeft:4,color:"var(--muted)"},children:["(",Object.values(N).reduce((h,w)=>h+w,0),")"]})]}),e.jsxs("button",{className:`bg-main-tab${p==="uncat"?" active":""}`,onClick:()=>l("uncat"),children:["📝 Other Blogs ",z>0&&e.jsxs("span",{style:{fontSize:".68rem",marginLeft:4,color:"var(--muted)"},children:["(",z,")"]})]})]}),k?p==="movies"?R.length===0?e.jsx("div",{className:"bg-empty",children:d?"No movies match your search.":"No movies found."}):R.map(h=>e.jsx(ut,{movie:h,artCount:v[h.title]??0,movies:t,cast:n,onToast:u},h._id)):p==="cast"?e.jsx(gt,{cast:n,movies:t,search:d,castCountMap:N,onToast:u,onCountChange:(h,w)=>m(T=>({...T,[h]:Math.max(0,(T[h]||0)+w)}))}):e.jsx(pt,{onToast:u,count:z,movies:t,cast:n,onCountChange:h=>L(w=>Math.max(0,w+h))}):e.jsx("div",{className:"bg-empty",style:{padding:20,fontSize:".85rem"},children:"Loading blog counts…"})]})]}),c&&e.jsx(nt,{movies:t,cast:n,onClose:()=>S(!1),onPublished:h=>{u(`✅ Blog published: "${h.title}"`,"success"),S(!1),h.movieTitle?y(w=>({...w,[h.movieTitle]:(w[h.movieTitle]||0)+1})):h.castName?m(w=>({...w,[h.castName]:(w[h.castName]||0)+1})):L(w=>w+1)},onToast:u})]})}export{ht as default};
