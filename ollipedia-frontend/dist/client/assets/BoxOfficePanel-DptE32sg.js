import{r as z,A as Z,j as e,R as we,g as $e}from"./index-A-fQUjkj.js";const ve="http://localhost:4000/api",pe=n=>{if(!n&&n!==0)return 0;const i=String(n).replace(/[₹,\s]/g,"").toLowerCase(),s=parseFloat(i);return isNaN(s)?0:i.includes("cr")||i.includes("crore")?Math.round(s*1e7):i.includes("l")||i.includes("lakh")?Math.round(s*1e5):s>=1e3?Math.round(s):0},h=n=>{if(n==null||n==="")return"—";const i=typeof n=="number"?n:pe(n);return!i||isNaN(i)?n||"—":i>=1e7?`₹${(i/1e7).toFixed(2)} Cr`:i>=1e5?`₹${(i/1e5).toFixed(2)} L`:`₹${i.toLocaleString("en-IN")}`},G=pe,ke=1.18,xe=(n,i)=>{if(!n)return"";const s=new Date(n);return isNaN(s.getTime())?"":(s.setDate(s.getDate()+(Number(i)-1)),s.toISOString().slice(0,10))},Se=(n,i,s)=>{const p=[["Day","Date (reference only — recalculated on upload)","Net Collection"]];for(let a=0;a<s;a++){const b=i+a,D=xe(n==null?void 0:n.releaseDate,b);p.push([`Day ${b}`,D||"TBA",""])}return p.map(a=>a.map(b=>`"${String(b).replace(/"/g,'""')}"`).join(",")).join(`\r
`)},je=(n,i)=>{const s=new Blob(["\uFEFF"+n],{type:"text/csv;charset=utf-8;"}),p=URL.createObjectURL(s),a=document.createElement("a");a.href=p,a.download=i,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(p)},Oe=n=>{const i=[];let s=[],p="",a=!1;const b=()=>{s.push(p),p=""},D=()=>{b(),i.push(s),s=[]};for(let j=0;j<n.length;j++){const t=n[j],u=n[j+1];a?t==='"'&&u==='"'?(p+='"',j++):t==='"'?a=!1:p+=t:t==='"'?a=!0:t===","?b():t==="\r"||(t===`
`?D():p+=t)}return(p.length||s.length)&&D(),i.filter(j=>j.some(t=>String(t).trim()!==""))},me=n=>{const i=String(n??"").match(/(\d+)/);return i?parseInt(i[1],10):null},ze=n=>{if(!n.length)return[];const i=n[0].map(a=>String(a).toLowerCase());let s=i.findIndex(a=>a.includes("day")),p=i.findIndex(a=>a.includes("net"));return s===-1&&(s=0),p===-1&&(p=i.length-1),n.slice(1).map(a=>({day:me(a[s]),netRaw:String(a[p]??"").trim()})).filter(a=>a.day&&a.netRaw)},De=n=>String(n||"").split(/\r?\n/).map(i=>i.trim()).filter(Boolean).map(i=>{const s=me(i);if(!s)return null;const p=i.replace(/^\s*day\s*-?\s*\d+\s*/i,"").replace(/^\d+\s*/,"").replace(/^[\s,:\-\t]+/,"").trim();return p?{day:s,netRaw:p}:null}).filter(Boolean),ie=n=>String(n||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim(),se=n=>n?new Date(n).getFullYear():"",he=n=>{const i=Array.isArray(n.cast)?n.cast:[],s=w=>{var m;return((m=i.find(O=>{const v=(O.role||O.type||"").toLowerCase();return w.some(N=>v.includes(N))}))==null?void 0:m.name)||null},p=i.find(w=>{const m=(w.role||w.type||"").toLowerCase().trim();return m==="director"||m==="film director"||m==="movie director"||m.includes("director")&&!["music","art","action","stunt","assistant","co-","associate"].some(O=>m.includes(O))}),a=(p==null?void 0:p.name)||n.director||null,b=i.find(w=>{const m=(w.role||w.type||"").toLowerCase().trim();return m==="producer"||m.includes("producer")&&!["executive","co-","line","associate","assistant"].some(O=>m.includes(O))}),D=(b==null?void 0:b.name)||n.producer||null,j=s(["music director"])||null,t=s(["writer","screenplay","story","dialogue"])||null,u=s(["cinematographer","dop","director of photography"])||null,f=s(["editor"])||null,r=["director","producer","writer","screenplay","story","dialogue","music director","cinematographer","dop","editor","choreographer","art director","costume","sound","stunt","vfx"],$=["actor","actress","lead","hero","heroine","supporting","cameo","special appearance"],d=i.filter(w=>{const m=(w.role||w.type||"").toLowerCase();return!(r.some(v=>m.includes(v))&&!$.some(v=>m.includes(v)))}),x=d.slice(0,4).map(w=>w.name).filter(Boolean),R=d.filter(w=>{const m=(w.role||w.type||"").toLowerCase();return m.includes("actress")||m.includes("heroine")}).slice(0,2).map(w=>w.name).filter(Boolean);return{directorName:a,producerName:D,musicDirector:j,writer:t,dop:u,editor:f,leadActors:x,leadActresses:R}},ye=(n,i,s,p)=>{const a=[...i||[]].sort((d,x)=>d.day-x.day),b=a.find(d=>d.day===n),D=(b==null?void 0:b.date)||"",j=a.filter(d=>d.day<n).reduce((d,x)=>d+(G(x.net)||0),0),t=[],u=D?new Date(D).getDay():null,f=u===0||u===5||u===6;n===1?t.push("opening-day"):n===2?t.push("day-two"):n===3?t.push("day-three"):n===7?t.push("first-week-closing"):n===10?t.push("day-ten"):n===15&&t.push("day-fifteen"),n>3&&t.push(f?"weekend":"weekday");const $=[1,2,3,5,10,15,20,25,35,50,75,100,150,200].find(d=>{const x=d*1e7;return j<x&&(s||0)>=x})||null;if($&&t.push(`milestone-${$}cr`),p!=null&&p.ottReleaseDate&&D){const d=new Date(p.ottReleaseDate),x=new Date(D);if(!isNaN(d.getTime())){const R=Math.round((d-x)/864e5);R>=0&&R<=7&&t.push("approaching-ott"),R<0&&t.push("post-ott-theatrical")}}return n>=25&&t.push("extended-run"),t.length||t.push("standard-day"),{tags:t,isWeekend:f,milestoneCroreCrossed:$}},Ne=(n,i,s,p,a)=>{const b=se(n.releaseDate),j=[...i].sort((d,x)=>d.day-x.day).map(d=>`Day ${d.day}${d.date?` (${d.date})`:""}: Net ${h(d.net)}, Gross ${h(d.gross)}${d.note?` — ${d.note}`:""}`).join(`
`),t=he(n),u=[t.directorName?`Director: ${t.directorName}`:"",t.producerName?`Producer: ${t.producerName}`:"",t.musicDirector?`Music Director: ${t.musicDirector}`:"",t.writer?`Writer: ${t.writer}`:"",t.leadActors.length?`Cast: ${t.leadActors.join(", ")}`:"",t.leadActresses.length?`Actresses: ${t.leadActresses.join(", ")}`:""].filter(Boolean).join(`
`),r=ye(a,i,s,n).tags,$=r.join(", ");return`You are writing a box office collection article for the Odia film website Ollypedia.

Movie: ${n.title}${b?` (${b})`:""}
${n.language?`Language: ${n.language}`:"Language: Odia"}
Genre: ${Array.isArray(n.genre)?n.genre.join(", "):n.genre||"Drama"}
Release Date: ${n.releaseDate?new Date(n.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):""}
${u}
${n.budget?`Budget: ${n.budget}`:""}

Day-wise collection data (all days up to Day ${a}):
${j}

Total Net: ${h(s)}
Total Gross: ${h(p)}

CONTEXT FOR TODAY (Day ${a}): ${$}.
${r.includes("opening-day")?"This is the FILM'S OPENING DAY — focus on first impressions, opening-day buzz, and how it compares to expectations going in.":""}
${r.includes("weekend")?"Today falls in the WEEKEND box-office window — focus heavily on weekend vs weekday performance and family/leisure footfalls.":""}
${r.includes("weekday")?"Today is a WEEKDAY — focus on how the film is holding up after the opening rush and what weekday collections reveal about word-of-mouth.":""}
${r.includes("first-week-closing")?"Today marks the close of WEEK ONE — focus on the overall week-one verdict and what it signals for week two.":""}
${r.some(d=>d.startsWith("milestone-"))?`The film has just CROSSED A COLLECTION MILESTONE today (${r.find(d=>d.startsWith("milestone-"))}) — lead with this milestone and what it means for the film's standing in Ollywood.`:""}
${r.includes("approaching-ott")?"The film's OTT release is approaching within the next week — mention how the theatrical run is winding down ahead of the digital premiere.":""}
${r.includes("extended-run")?"The film is in an EXTENDED THEATRICAL RUN (25+ days) — focus on staying power, repeat audiences, and longevity rather than day-on-day swings.":""}

You must respond ONLY with a valid JSON object (no markdown, no code fences, no extra text). The JSON must have exactly these keys:

{
  "seoHeadline": "A compelling 10-15 word headline for the h1 tag, reflecting today's specific context above (not a generic 'Day N collection' phrase)",
  "introParagraph": "2-3 sentences introducing the film and Day ${a} performance. Mention the net and gross figures naturally, and reflect today's context.",
  "boxOfficeAnalysis": "2-3 paragraphs (plain text, no HTML tags) covering the day-wise journey and trend, written specifically through today's context above — do NOT just restate yesterday's analysis with new numbers.",
  "audienceResponse": "1-2 paragraphs about how Odia audiences and reviewers are responding — word of mouth, social media buzz, repeat viewing. Vary the framing based on how many days the film has run.",
  "performanceAnalysis": "2 paragraphs analysing the film's performance relative to its budget and typical Odia cinema benchmarks. Mention total net ${h(s)} and gross ${h(p)}.",
  "weekendWeekdayComparison": "1-2 paragraphs specifically comparing weekend and weekday collection patterns for this film so far, and what that pattern suggests about audience type (family/youth/repeat viewers).",
  "occupancyTrend": "1 paragraph describing the likely occupancy trend (rising, falling, steady) across screens based on the collection numbers — do not invent exact percentages, describe the trend qualitatively.",
  "prediction": "1-2 paragraphs predicting upcoming weekend/week performance based on current trend.",
  "industryImpact": "1 paragraph on what this film's performance means for the wider Ollywood (Odia film industry) — e.g. theatre footfalls, confidence in the genre, impact on upcoming Odia releases.",
  "futureOutlook": "1-2 paragraphs on the film's likely box office path from here — upcoming milestones, competition from other releases, or OTT timing if relevant.",
  "finalVerdict": "2-3 sentences summarising the film's box office status after Day ${a}. Do NOT use words like Hit, Flop, Average, Super-Hit — just describe the collection factually."
}

Rules:
- All values must be plain text only — no HTML, no bullet points, no markdown
- Write for an Odia cinema (Ollywood) audience
- Keep each section concise but informative
- Make this article meaningfully different from a generic "Day N" template — lean into today's specific context listed above
- Do not invent or fabricate collection figures — only use the data provided above`},ce=(n,i,s,p,a,b=[])=>{var d;const D=se(i.releaseDate),j=ye(s,b,p,i),t=new Set(j.tags),u=t.has("weekend"),f=(d=[...t].find(x=>x.startsWith("milestone-")))==null?void 0:d.replace("milestone-","").replace("cr",""),r=x=>({seoHeadline:`${i.title}${D?` (${D})`:""} Day ${s} Box Office Collection Report`,introParagraph:`${i.title}${D?` (${D})`:""} continues its theatrical run. On Day ${s}, the film has collected a total net of ${h(p)} and gross of ${h(a)} at the Odia box office.`,boxOfficeAnalysis:t.has("opening-day")?`${i.title} opened in theatres across Odisha with this Day 1 collection setting the baseline for the film's theatrical run.`:t.has("first-week-closing")?`${i.title} has now completed its first full week in theatres, with a week-one tally of ${h(p)} net.`:u?`${i.title} is riding the weekend box office window on Day ${s}, typically a period of higher footfalls than weekdays.`:`${i.title} has shown a steady run at the box office on Day ${s}, a regular weekday in its theatrical journey.`,audienceResponse:`Audiences across Odisha have given ${i.title} a warm response. The film continues to attract viewers with positive word of mouth${t.has("extended-run")?", helping it sustain a long theatrical run":""}.`,performanceAnalysis:`With a total net collection of ${h(p)} and gross of ${h(a)}, ${i.title} has delivered a notable performance for Odia cinema.`,weekendWeekdayComparison:u?`Day ${s} falls within the weekend box office window, when Odia films typically see higher occupancy than weekdays.`:`Day ${s} is a weekday for ${i.title}, and weekday collections are usually lower than the opening weekend.`,occupancyTrend:`Occupancy levels for ${i.title} on Day ${s} are estimated based on trade trends for similarly positioned Odia releases${u?", with weekend shows typically running fuller":", with weekday shows generally running at moderate occupancy"}.`,prediction:`Based on current trends, ${i.title} is expected to maintain momentum in the coming days, especially during weekends.`,industryImpact:`${i.title}'s box office run is being closely watched within Ollywood as a marker of audience appetite for this genre of Odia cinema.`,futureOutlook:f?`Having just crossed the ₹${f} Cr mark, ${i.title} enters its next phase of theatrical run with a fresh milestone to build on.`:`Looking ahead, ${i.title}'s box office trajectory will depend on how it performs through the next weekend.`,finalVerdict:`${i.title} has collected ${h(p)} net and ${h(a)} gross after ${s} days. All figures are industry estimates. Source: Ollypedia.`})[x]||"",$=["seoHeadline","introParagraph","boxOfficeAnalysis","audienceResponse","performanceAnalysis","weekendWeekdayComparison","occupancyTrend","prediction","industryImpact","futureOutlook","finalVerdict"];if(!(n!=null&&n.trim()))return Object.fromEntries($.map(x=>[x,r(x)]));try{const x=n.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim(),R=JSON.parse(x);return Object.fromEntries($.map(w=>[w,R[w]||r(w)]))}catch{return{seoHeadline:r("seoHeadline"),introParagraph:r("introParagraph"),boxOfficeAnalysis:n.trim(),audienceResponse:r("audienceResponse"),performanceAnalysis:r("performanceAnalysis"),weekendWeekdayComparison:r("weekendWeekdayComparison"),occupancyTrend:r("occupancyTrend"),prediction:r("prediction"),industryImpact:r("industryImpact"),futureOutlook:r("futureOutlook"),finalVerdict:r("finalVerdict")}}},ue=n=>String(n||"").replace(/`/g,"&#96;").trim().split(/\n{2,}/).map(i=>i.split(/\n/).map(s=>s.trim()).filter(Boolean).join(" ").trim()).filter(Boolean).map(i=>`<p>${i}</p>`).join(`
`),Ce=(n,i,s,p,a,b,D)=>{const j=se(n.releaseDate),t=[...i].sort((O,v)=>O.day-v.day),u=b&&typeof b=="object"&&"seoHeadline"in b?b:ce(b,n,a,s,p,i),f=`${n.title||"Unknown Movie"} (Re-Release)`,r=`/box-office/${ie(`${n.title}${j?` (${j})`:""}`)}`,$=h(s),d=h(p),x=O=>ue(O).replace(/<p>/g,'<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">');let R=0,w=0;const m=t.map((O,v)=>{R+=G(O.net),w+=G(O.gross);const N=O.day===a,k=O.date?new Date(O.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—";return`
    <tr style="background:${N?"rgba(201,151,58,0.05)":v%2===0?"transparent":"rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${N?"#c9973a":"#aaa"};font-weight:700;white-space:nowrap;">
        Day ${O.day}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${k}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${N?"#c9973a":"#ddd"};font-weight:700;">${O.net?h(O.net):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:700;">${O.gross?h(O.gross):"—"}</td>
    </tr>`}).join("");return`
<!-- RE-RELEASE EXCLUSIVE TEMPLATE -->
<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    ${f} Box Office - Day ${a}
  </h2>
  <p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">
    The much-awaited re-release of <strong>${n.title}</strong> is seeing renewed interest at the box office. 
    By Day ${a}, the re-release has grossed a total of <strong>${d}</strong> and netted <strong>${$}</strong>, proving that true cinematic classics never fade.
  </p>
  ${x(u.boxOfficeAnalysis)}
  ${x(u.performanceAnalysis)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Day-wise Breakdown
  </h2>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:400px;">
      <thead>
        <tr>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Day</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Date</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Net</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Gross</th>
        </tr>
      </thead>
      <tbody>
        ${m}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL RE-RELEASE (${t.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${$}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${d}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Nostalgia & Audience Response
  </h2>
  ${x(u.audienceResponse)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Occupancy Trends & Weekend Growth
  </h2>
  ${x(u.occupancyTrend)}
  ${x(u.weekendWeekdayComparison)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Impact & Legacy
  </h2>
  ${x(u.industryImpact)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Future Outlook & Verdict
  </h2>
  ${x(u.prediction)}
  ${x(u.futureOutlook)}
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-top:16px;">
    ${x(u.finalVerdict)}
  </div>
  <div style="text-align:center;margin-top:22px;">
    <a href="${r}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Re-Release Box Office Updates
    </a>
  </div>
</section>
  `},Te=(n,i,s,p,a,b,D,j="original")=>{if(j==="re-release")return Ce(n,i,s,p,a,b);const t=se(n.releaseDate),u=[...i].sort((c,L)=>c.day-L.day),f=b&&typeof b=="object"&&"seoHeadline"in b?b:ce(b,n,a,s,p,i),r=n.title||"Unknown Movie",$=r.replace(/\s+/g,""),d=n.releaseDate?new Date(n.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"",x=Array.isArray(n.genre)?n.genre:n.genre?[n.genre]:[],R=x.join(", ")||"Drama",w=ie(`${r}${t?` (${t})`:""}`),m=`/box-office/${w}`,O=he(n),{directorName:v,producerName:N,musicDirector:k,writer:U,dop:V,editor:_,leadActors:W,leadActresses:F}=O,P=u.find(c=>c.day===a)||u[u.length-1]||{},Y=P.net?h(P.net):"—",X=P.gross?h(P.gross):"—",A=h(s),E=h(p),o=c=>ue(c).replace(/<p>/g,'<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">');(()=>{const c=[];return c.push(`${r} Odia Movie`,`${r} Movie Details`,`${r} Cast`,`${r} Cast and Crew`,`${r} Story`,`${r} Review`,`${r} Trailer`,`${r} Teaser`,`${r} Songs`,`${r} Music`,`${r} Release Date`),c.push(`${r} Box Office Collection`,`${r} Day ${a} Collection`,`${r} Day ${a} Box Office Collection`,`${r} Total Collection`,`${r} Total Box Office Collection`,`${r} Gross Collection`,`${r} Net Collection`,`${r} Opening Day Collection`,`${r} First Day Collection`,`${r} Week 1 Collection`,`${r} Box Office Report`,`${r} Box Office Prediction`,`${r} Worldwide Collection`,`${r} Audience Response`,`${r} Movie Update`,`${r} Latest News`,`${r} Movie Collection`,t?`${r} (${t})`:null,t?`${r} (${t}) Box Office Collection`:null,t?`${r} (${t}) Total Collection`:null),v&&c.push(v,`${v} Movie`,`${v} Odia Movie`,`${v} Director`),N&&c.push(N,`${N} Producer`),W.forEach(L=>c.push(L,`${L} Movie`,`${L} Odia Movie`)),F.forEach(L=>c.push(L,`${L} Movie`,`${L} Odia Movie`)),k&&c.push(k,`${k} Music Director`),U&&c.push(U,`${U} Writer`),V&&c.push(V,`${V} Cinematographer`),_&&c.push(_,`${_} Editor`),x.forEach(L=>c.push(`${L} Odia Movie`,`Odia ${L} Film`)),c.push("Odia Movie Collection","Odia Movie Details","Odia Movie Cast","Odia Movie Review","Odia Movie Trailer","Odia Movie Release Date","Odia Movie Box Office","Odia Box Office Collection","Ollywood Box Office Collection","Ollywood Movie Collection","Ollywood Movie Details","Ollywood News","Latest Odia Movie News","Odia Cinema News","Odia Film Industry","Trending Odia Movie",t?`New Odia Movie ${t}`:"New Odia Movie","Best Odia Movies","Ollywood Updates"),c.filter(Boolean)})();const y=[`#${$}`,`#${$}Collection`,`#${$}BoxOffice`,`#${$}Day${a}`,v?`#${v.replace(/\s+/g,"")}`:null,N?`#${N.replace(/\s+/g,"")}`:null,k?`#${k.replace(/\s+/g,"")}`:null,...W.map(c=>`#${c.replace(/\s+/g,"")}`),...F.map(c=>`#${c.replace(/\s+/g,"")}`),"#OdiaMovie","#Ollywood","#OdiaCinema","#Ollypedia","#BoxOfficeCollection","#OllywoodBoxOffice","#OllywoodNews",t?`#OdiaMovie${t}`:null].filter(Boolean),M=[["Movie Name",r],["Language","Odia"],["Industry","Ollywood"],["Genre",R],d?["Release Date",d]:null,v?["Director",v]:null,N?["Producer",N]:null,k?["Music Director",k]:null,U?["Writer",U]:null,V?["Cinematographer",V]:null,_?["Editor",_]:null,W.length?["Cast",W.join(", ")]:null,F.length?["Actress",F.join(", ")]:null,n.budget?["Budget",n.budget]:null].filter(Boolean),l=Math.max(...u.map(c=>G(c.net)),1);u.map((c,L)=>{const ne=G(c.net),K=G(c.gross),ee=Math.round(ne/l*100),H=K>0?Math.round(K/l*100):0,q=c.day===a,ae=c.date?new Date(c.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"",de=`Day ${c.day}${c.day===1?" (Opening)":""}`,be=q?"#c9973a":L%2===0?"#8a6fc4":"#4a9fd4";return`
    <tr style="background:${q?"rgba(201,151,58,0.06)":"transparent"};">
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;min-width:72px;vertical-align:middle;">
        <div style="font-size:0.8rem;font-weight:700;color:${q?"#c9973a":"#aaa"};">${de}</div>
        ${ae?`<div style="font-size:0.7rem;color:#555;">${ae}</div>`:""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;width:55%;">
        <div style="margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Net</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:7px;overflow:hidden;">
              <div style="width:${ee}%;height:100%;background:${be};border-radius:999px;transition:width 0.3s;"></div>
            </div>
            <div style="font-size:0.78rem;font-weight:700;color:${q?"#c9973a":"#ccc"};min-width:56px;text-align:right;word-break:break-word;">${c.net?h(c.net):"—"}</div>
          </div>
          ${K>0?`
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Gross</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:5px;overflow:hidden;">
              <div style="width:${H}%;height:100%;background:#3a6a8a;border-radius:999px;"></div>
            </div>
            <div style="font-size:0.72rem;color:#7ec8e3;min-width:56px;text-align:right;word-break:break-word;">${h(c.gross)}</div>
          </div>`:""}
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;vertical-align:middle;text-align:right;">
        ${c.note?`<span style="display:inline-block;background:#1e1e1e;color:#777;border:1px solid #2a2a2a;border-radius:4px;padding:2px 8px;font-size:0.7rem;">${c.note}</span>`:""}
      </td>
    </tr>`}).join("");let C=0;const T=u.map((c,L)=>{const ne=G(c.net);G(c.gross),C+=ne;const K=L>0?G(u[L-1].net):null;let ee="";if(K!==null&&K>0&&ne>0){const ae=(ne-K)/K*100,de=ae>=0;ee=`<span style="display:inline-block;background:${de?"rgba(40,120,60,0.25)":"rgba(180,40,40,0.25)"};color:${de?"#5dba7d":"#e07070"};border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">
        ${de?"▲":"▼"} ${Math.abs(ae).toFixed(1)}%
      </span>`}else L===0&&(ee='<span style="display:inline-block;background:rgba(201,151,58,0.2);color:#c9973a;border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">Opening</span>');const H=c.day===a,q=c.date?new Date(c.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—";return`
    <tr style="background:${H?"rgba(201,151,58,0.05)":L%2===0?"transparent":"rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${H?"#c9973a":"#aaa"};font-weight:700;white-space:nowrap;">
        Day ${c.day}${H?' <span style="font-size:0.65rem;background:rgba(201,151,58,0.2);color:#c9973a;padding:1px 6px;border-radius:4px;vertical-align:middle;">Latest</span>':""}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${q}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${H?"#c9973a":"#ddd"};font-weight:700;">${c.net?h(c.net):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:600;">${c.gross?h(c.gross):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:700;">${h(C)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;">${ee}</td>
    </tr>`}).join(""),B=y.map(c=>`<span class="tag-chip" style="display:inline-block;background:#1e1e1e;color:#c9973a;border:1px solid #3a2800;border-radius:20px;padding:4px 13px;font-size:0.78rem;font-weight:600;margin:2px;">${c}</span>`).join(`
    `),S="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:26px;",I="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;",te="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.87rem;width:42%;vertical-align:top;",oe="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ddd;font-size:0.87rem;font-weight:600;",Q="padding:11px 14px;background:#1f1f1f;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:left;border-bottom:2px solid #2a2a2a;",ge=ie(`${r}${t?` (${t})`:""} day ${a-1} box office collection`),re=ie(`${r}${t?` (${t})`:""} day ${a+1} box office collection`),le=`${r} Day ${a-1}`,fe=`${r} Day ${a+1}`;return`<!-- ════════════════════════════════════════════════════════════════
  OLLYPEDIA SEO META — READ BY CMS
  title:          ${r}${t?` (${t})`:""} Day ${a} box office collection and collected ${E} gross | Ollypedia
  description:    ${r}${t?` (${t})`:""} Day ${a} box office collection: Collected ${A} net and ${E} gross in ${a} day${a!==1?"s":""}. Complete day-wise breakdown, audience response, performance analysis & predictions on Ollypedia.
  og:title:       ${r}${t?` (${t})`:""} Day ${a} box office collection and collected ${E} gross | Ollypedia
  og:description: ${r} has collected ${A} net and ${E} gross after ${a} days. Full report on Ollypedia.
════════════════════════════════════════════════════════════════ -->

<!-- ─────────────────────────────────────────────
  JSON-LD SCHEMA — NewsArticle + Movie + BreadcrumbList
  Injected into <head> by CMS. Enables Google rich results:
  - NewsArticle → headline in search + Google News
  - Movie       → movie knowledge panel association
  - BreadcrumbList → breadcrumb path shown in search results
───────────────────────────────────────────── -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      "headline": "${r}${t?` (${t})`:""} Day ${a} box office collection and collected ${E} gross",
      "description": "${r}${t?` (${t})`:""} Day ${a} box office collection: Collected ${A} net and ${E} gross in ${a} day${a!==1?"s":""}.",
      "datePublished": "${new Date().toISOString().slice(0,10)}",
      "dateModified": "${new Date().toISOString().slice(0,10)}",
      "author": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
      "publisher": {
        "@type": "Organization",
        "name": "Ollypedia",
        "url": "https://ollypedia.in",
        "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://ollypedia.in/blog/${D}" },
      "about": {
        "@type": "Movie",
        "name": "${r}",
        "inLanguage": "Odia",
        "genre": "${R}"${d?`,
        "datePublished": "${d}"`:""}${v?`,
        "director": { "@type": "Person", "name": "${v}" }`:""}${N?`,
        "producer": { "@type": "Person", "name": "${N}" }`:""}${W.length?`,
        "actor": [${W.map(c=>`{ "@type": "Person", "name": "${c}" }`).join(", ")}]`:""}
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://ollypedia.in" },
        { "@type": "ListItem", "position": 2, "name": "Box Office",  "item": "https://ollypedia.in/box-office" },
        { "@type": "ListItem", "position": 3, "name": "${r}", "item": "https://ollypedia.in${m}" },
        { "@type": "ListItem", "position": 4, "name": "Day ${a} Collection", "item": "https://ollypedia.in/blog/${D}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the total box office collection of ${r}${t?` (${t})`:""}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As of Day ${a}, ${r} has collected a total of ${A} net and ${E} gross at the Odia box office. These are industry estimates updated daily on Ollypedia."
          }
        },
        {
          "@type": "Question",
          "name": "How much did ${r} collect on Day ${a}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On Day ${a}, ${r} collected ${Y} net and ${X} gross. The cumulative total stands at ${A} net after ${a} day${a!==1?"s":""} in theatres."
          }
        }${v?`,
        {
          "@type": "Question",
          "name": "Who directed ${r}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${r} is directed by ${v}.${N?` The film is produced by ${N}.`:""} It is an Odia language film released in ${t||"2026"} under the Ollywood banner."
          }
        }`:""}${W.length?`,
        {
          "@type": "Question",
          "name": "Who are the lead actors in ${r}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${r} stars ${W.join(", ")}${F.length?` alongside ${F.join(", ")}`:""}.${k?` The music is composed by ${k}.`:""}"
          }
        }`:""},
        {
          "@type": "Question",
          "name": "Is ${r} a hit or flop at the box office?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Based on ${a} day${a!==1?"s":""} of data, ${r} has collected ${A} net at the Odia box office.${n.budget?` The film had an estimated budget of ${n.budget}.`:""} Ollypedia updates collection figures daily based on industry trade estimates."
          }
        }
      ]
    }
  ]
}
<\/script>


<!-- ─────────────────────────────────────────────
  MOBILE RESPONSIVE STYLES
  Scoped to .ollypedia-blog-content — safe to inject inline.
  No layout or functionality changes, purely presentation fixes.
───────────────────────────────────────────── -->
<style>
/* ── Base resets for blog content ── */
.ollypedia-blog-content img,
.ollypedia-blog-content table,
.ollypedia-blog-content div,
.ollypedia-blog-content section,
.ollypedia-blog-content td,
.ollypedia-blog-content th { box-sizing: border-box; }

/* ── Prevent any element from causing horizontal scroll ── */
.ollypedia-blog-content { overflow-x: hidden; word-break: break-word; }

/* ── Long text, headings, links and data cells wrap instead of overflowing
     (most of this already inherits word-break from the rule above; these
     are explicit so it holds even if an inline style or sanitizer strips
     inheritance) ── */
.ollypedia-blog-content p,
.ollypedia-blog-content span,
.ollypedia-blog-content strong,
.ollypedia-blog-content em,
.ollypedia-blog-content a,
.ollypedia-blog-content h1,
.ollypedia-blog-content h2,
.ollypedia-blog-content h3,
.ollypedia-blog-content td,
.ollypedia-blog-content th {
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

/* ── Images, charts, video and other embeds never exceed the viewport.
     (No <img>/<iframe> currently ships in this template, but this keeps
     any future poster/embed additions safe automatically.) ── */
.ollypedia-blog-content img,
.ollypedia-blog-content svg,
.ollypedia-blog-content video,
.ollypedia-blog-content iframe,
.ollypedia-blog-content embed,
.ollypedia-blog-content object,
.ollypedia-blog-content canvas {
  max-width: 100%;
  height: auto;
}

/* ── Code blocks and quotes wrap or scroll within themselves instead of
     widening the page ── */
.ollypedia-blog-content pre {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.ollypedia-blog-content code {
  overflow-wrap: break-word;
  word-break: break-word;
}
.ollypedia-blog-content blockquote {
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ── A table is only allowed to exceed 100% width when it explicitly opts
     in via min-width (e.g. the day-wise data table, which scrolls inside
     its own .tbl-scroll/overflow-x:auto wrapper) — min-width still wins
     over this for that table, so its intended horizontal scroll is
     untouched; every other table is capped to the viewport. ── */
.ollypedia-blog-content table { max-width: 100%; }

/* ── Scrollable table wrapper already present; ensure -webkit too ── */
.ollypedia-blog-content .tbl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 640px) {

  /* Hero section — tighter padding on small screens */
  .ollypedia-blog-content .hero-section {
    padding: 20px 16px 18px !important;
  }

  /* Section cards — reduce horizontal padding */
  .ollypedia-blog-content section[style*="background:#181818"],
  .ollypedia-blog-content section[style*="background: #181818"] {
    padding: 18px 14px !important;
  }

  /* Tags section — reduce horizontal padding to match other cards */
  .ollypedia-blog-content section[style*="background:#111"] {
    padding: 16px 14px !important;
  }

  /* Stat chips grid — force single column on very small screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr 1fr !important;
  }

  /* Performance analysis stat block — stack vertically */
  .ollypedia-blog-content .perf-stats {
    flex-direction: column !important;
    gap: 12px !important;
  }

  /* Day nav prev/next — stack vertically */
  .ollypedia-blog-content nav[aria-label="Day navigation"] {
    flex-direction: column !important;
  }

  /* Movie details table — label column narrower */
  .ollypedia-blog-content .info-table td:first-child {
    width: 38% !important;
    font-size: 0.8rem !important;
  }

  /* Box office data table cells — reduce padding and font size */
  .ollypedia-blog-content .data-table td,
  .ollypedia-blog-content .data-table th {
    padding: 8px 8px !important;
    font-size: 0.78rem !important;
  }

  /* Bar chart table cells */
  .ollypedia-blog-content .bar-table td {
    padding: 8px 8px !important;
  }

  /* Also Read grid — 1 column */
  .ollypedia-blog-content .also-read-grid {
    grid-template-columns: 1fr !important;
  }

  /* Tag chips — smaller */
  .ollypedia-blog-content .tag-chip {
    font-size: 0.7rem !important;
    padding: 3px 10px !important;
  }

  /* CTA button — full width */
  .ollypedia-blog-content .cta-btn {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    text-align: center !important;
  }

  /* FAQ sections — tighter padding */
  .ollypedia-blog-content .faq-section {
    padding: 18px 14px !important;
  }
}

@media (max-width: 400px) {
  /* Stat chips — single column on very narrow screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr !important;
  }

  /* Hero h1 font size floor */
  .ollypedia-blog-content h1 {
    font-size: 1.1rem !important;
  }
}
</style>

<!-- ─────────────────────────────────────────────
  BREADCRUMB + TIMESTAMP
  Breadcrumb: visual trail matches BreadcrumbList schema above.
  <time>: machine-readable freshness signal for Google.
───────────────────────────────────────────── -->
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
  <nav aria-label="Breadcrumb" style="font-size:0.78rem;color:#555;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
    <a href="/" style="color:#777;text-decoration:none;">Home</a>
    <span style="color:#333;">›</span>
    <a href="/box-office" style="color:#777;text-decoration:none;">Box Office</a>
    <span style="color:#333;">›</span>
    <a href="${m}" style="color:#777;text-decoration:none;">${r}${t?` (${t})`:""}</a>
    <span style="color:#333;">›</span>
    <span style="color:#c9973a;">Day ${a} Collection</span>
  </nav>
  <time datetime="${new Date().toISOString().slice(0,10)}" style="font-size:0.73rem;color:#444;white-space:nowrap;">
    🕐 Updated: ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
  </time>
</div>


<!-- ─────────────────────────────────────────────
  HERO BANNER
───────────────────────────────────────────── -->
<div class="hero-section" style="background:linear-gradient(135deg,#1a0e00 0%,#121212 100%);border:1px solid #2e2000;border-radius:14px;padding:30px 28px 24px;margin-bottom:22px;">

  <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span style="display:inline-block;background:#2a1500;color:#c9973a;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #3a2200;">📊 Box Office Report</span>
    <span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">Day ${a} Update</span>
    ${t?`<span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">${t}</span>`:""}
  </div>

  <h1 style="color:#fff;font-size:clamp(1.2rem,4.5vw,1.6rem);line-height:1.3;font-weight:800;margin:0 0 14px;word-break:break-word;">
    ${r}${t?` (${t})`:""} Day ${a} Box Office Collection — ${(f.seoHeadline||"").replace(/`/g,"&#96;")}
  </h1>

  <p style="color:#bbb;font-size:0.98rem;line-height:1.85;margin:0 0 24px;">${(f.introParagraph||"").replace(/`/g,"&#96;")}</p>

  <p style="color:#aaa;font-size:0.93rem;line-height:1.7;margin:0 0 24px;">
    According to industry trade estimates, <strong style="color:#fff;">${r}</strong> has collected approximately
    <strong style="color:#c9973a;">${A} Net</strong> and
    <strong style="color:#7ec8e3;">${E} Gross</strong> in its first ${a} day${a!==1?"s":""} of theatrical release.
    ${v?`Directed by <strong style="color:#ddd;">${v}</strong>, the`:"The"} film has been running across Odisha with
    ${W.length?`<strong style="color:#ddd;">${W.slice(0,2).join(" and ")}</strong> in the lead roles.`:"strong audience support."}
  </p>

  <!-- Stat chips -->
  <div class="stat-chips" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">
    <div style="background:rgba(0,0,0,0.5);border:1px solid #2e2000;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#c9973a;word-break:break-word;">${A}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #1a2a3a;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Gross</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#7ec8e3;word-break:break-word;">${E}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #222;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Day ${a} Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#fff;word-break:break-word;">${Y}</div>
    </div>
  </div>
</div>


<!-- ─────────────────────────────────────────────
  KEY HIGHLIGHT CALLOUT
───────────────────────────────────────────── -->
<div style="background:#180e00;border-left:4px solid #ff9800;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:22px;">
  <strong style="color:#ff9800;">📊 Box Office Update:</strong>
  <span style="color:#ccc;"> <strong style="color:#fff;">${r}</strong> has collected an estimated
  <strong style="color:#c9973a;">${A} net</strong> and
  <strong style="color:#7ec8e3;">${E} gross</strong> after
  <strong style="color:#fff;">${a} day${a!==1?"s":""}</strong> in theatres.
  ${s>=1e7?`The film has crossed the <strong style="color:#c9973a;">₹${(s/1e7).toFixed(0)} Cr mark</strong> at the Odia box office.`:""}</span>
</div>


<!-- ─────────────────────────────────────────────
  MOVIE DETAILS TABLE
───────────────────────────────────────────── -->
<section style="${S}">
  <h2 style="${I}">${r} Movie Details</h2>
  <table class="info-table" style="width:100%;border-collapse:collapse;">
    <tbody>
      ${M.map(([c,L])=>`
      <tr>
        <td style="${te}">${c}</td>
        <td style="${oe}">${L}</td>
      </tr>`).join("")}
      <tr>
        <td style="${te}">Total Net Collection</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:800;font-size:1.05rem;">${A}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;font-size:0.87rem;width:42%;vertical-align:top;">Total Gross Collection</td>
        <td style="padding:10px 0;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${E}</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:center;margin-top:22px;">
    <a href="${m}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Box Office Updates
    </a>
  </div>
</section>



<!-- ─────────────────────────────────────────────
  GRAPH 2: STRUCTURED DATA TABLE  (Net · Gross · Cumulative · Trend)
  Best for: exact figures + running total + day-on-day trend
───────────────────────────────────────────── -->
<section style="${S}">
  <h2 style="${I}">${r} Complete Box Office Data — Day-wise Breakdown</h2>
  <p style="color:#666;font-size:0.82rem;margin:0 0 18px;line-height:1.6;">
    Net · Gross · Cumulative net total after each day · Trend vs previous day
  </p>
  <div style="overflow-x:auto;">
    <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:520px;">
      <thead>
        <tr>
          <th style="${Q}">Day</th>
          <th style="${Q}">Date</th>
          <th style="${Q}">Net</th>
          <th style="${Q}">Gross</th>
          <th style="${Q}">Cumulative Net</th>
          <th style="${Q}">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${T}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL (${u.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${A}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${E}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${A}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  EDITORIAL SECTIONS (AI-written)
───────────────────────────────────────────── -->
<section style="${S}">
  <h2 style="${I}">Box Office Journey — ${r}</h2>
  ${o(f.boxOfficeAnalysis)}
</section>

<section style="${S}">
  <h2 style="${I}">Weekend vs Weekday Performance</h2>
  ${o(f.weekendWeekdayComparison)}
</section>

<section style="${S}">
  <h2 style="${I}">Audience Response</h2>
  ${o(f.audienceResponse)}
</section>

<section style="${S}">
  <h2 style="${I}">Occupancy Trends</h2>
  ${o(f.occupancyTrend)}
</section>

<section style="${S}">
  <h2 style="${I}">Performance Analysis</h2>
  <div class="perf-stats" style="background:#1f1800;border:1px solid #2e2000;border-radius:10px;padding:16px 20px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap;">
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Net</div>
      <div style="font-size:1.2rem;font-weight:800;color:#c9973a;">${A}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Gross</div>
      <div style="font-size:1.2rem;font-weight:800;color:#7ec8e3;">${E}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Days Tracked</div>
      <div style="font-size:1.2rem;font-weight:800;color:#fff;">${u.length}</div>
    </div>
  </div>
  ${o(f.performanceAnalysis)}
</section>

<section style="${S}">
  <h2 style="${I}">Impact on the Ollywood Industry</h2>
  ${o(f.industryImpact)}
</section>

<section style="${S}">
  <h2 style="${I}">Future Box Office Outlook</h2>
  ${o(f.prediction)}
  ${o(f.futureOutlook)}
</section>

<section style="${S}">
  <h2 style="${I}">Final Verdict</h2>
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-bottom:16px;">
    ${o(f.finalVerdict)}
  </div>
  <p style="color:#555;font-size:0.8rem;line-height:1.6;margin:0;">
    <em>* All collection figures are industry estimates sourced by Ollypedia Box Office Tracking. Figures may differ from official studio numbers.</em>
  </p>
</section>


<!-- ─────────────────────────────────────────────
  PREV / NEXT DAY NAVIGATION
  Signals article series to Google. Passes PageRank
  through the day chain. Helps crawlers find all posts.
───────────────────────────────────────────── -->
<nav aria-label="Day navigation" style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
  ${a>1?`<a href="/blog/${ge}" rel="prev" style="flex:1;min-width:140px;display:flex;align-items:center;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;">
    <span style="font-size:1.1rem;color:#555;">←</span>
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Previous</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${le}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
  </a>`:'<div style="flex:1;min-width:140px;"></div>'}
  <a href="/blog/${re}" rel="next" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;text-align:right;">
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Next</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${fe}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
    <span style="font-size:1.1rem;color:#555;">→</span>
  </a>
</nav>


<!-- ─────────────────────────────────────────────
  FAQ SECTION — Structured Q&A for SEO
  Uses FAQ schema-friendly markup. Google often
  pulls these into rich results / People Also Ask.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 22px;line-height:1.3;">
    Frequently Asked Questions — ${r} Box Office
  </h2>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      What is the total box office collection of ${r}${t?` (${t})`:""}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        As of Day ${a}, <strong style="color:#fff;">${r}</strong> has collected a total of
        <strong style="color:#c9973a;">${A} net</strong> and
        <strong style="color:#7ec8e3;">${E} gross</strong> at the Odia box office.
        These are industry estimates and figures are updated daily on Ollypedia.
      </p>
    </div>
  </div>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      How much did ${r} collect on Day ${a}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        On Day ${a}, <strong style="color:#fff;">${r}</strong> collected
        <strong style="color:#c9973a;">${Y} net</strong> and
        <strong style="color:#7ec8e3;">${X} gross</strong>.
        The cumulative total stands at <strong style="color:#c9973a;">${A} net</strong> after ${a} day${a!==1?"s":""} in theatres.
      </p>
    </div>
  </div>

  ${v?`
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who directed ${r}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${r}</strong> is directed by
        <strong style="color:#ddd;">${v}</strong>.
        ${N?`The film is produced by <strong style="color:#ddd;">${N}</strong>.`:""}
        It is an Odia language film released in ${t||"2026"} under the Ollywood banner.
      </p>
    </div>
  </div>`:""}

  ${W.length?`
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who are the lead actors in ${r}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${r}</strong> stars
        <strong style="color:#ddd;">${W.join(", ")}</strong>${F.length?` alongside <strong style="color:#ddd;">${F.join(", ")}</strong>`:""}.
        ${k?`The music is composed by <strong style="color:#ddd;">${k}</strong>.`:""}
      </p>
    </div>
  </div>`:""}

  <div style="padding-bottom:4px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Is ${r} a hit or flop at the box office?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        Based on ${a} day${a!==1?"s":""} of data, <strong style="color:#fff;">${r}</strong> has collected
        <strong style="color:#c9973a;">${A} net</strong> at the Odia box office.
        ${n.budget?`The film had an estimated budget of <strong style="color:#ddd;">${n.budget}</strong>.`:""}
        A detailed performance analysis is available above. Ollypedia updates collection figures daily based on industry trade estimates.
      </p>
    </div>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  ALSO READ — Internal links section
  Signals site structure to Google, passes
  PageRank to related pages, reduces bounce rate.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;">
    Also Read
  </h2>
  <div class="also-read-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
    <a href="${m}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📊</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${r} Full Box Office Report</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">All days · Running total</div>
      </div>
    </a>
    <a href="/box-office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎬</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">Ollywood Box Office Collection</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Odia movie collections</div>
      </div>
    </a>
    <a href="/movie/${w}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎭</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${r} — Cast, Story & Details</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Full movie info on Ollypedia</div>
      </div>
    </a>
    <a href="/blog?category=Box%20Office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📰</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">More Box Office Reports</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Ollywood collection news</div>
      </div>
    </a>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  HASHTAGS / SOCIAL TAGS
───────────────────────────────────────────── -->
<section style="background:#111;border-radius:14px;padding:20px 26px;margin-bottom:22px;">
  <h2 style="font-size:0.7rem;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Tags</h2>
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    ${B}
  </div>
</section>


<!-- ─────────────────────────────────────────────
  FOOTER
───────────────────────────────────────────── -->
<div style="border-top:1px solid #1c1c1c;padding-top:16px;margin-top:4px;">
  <p style="color:#444;font-size:0.8rem;line-height:1.8;margin:0;">
    <strong style="color:#555;">Source:</strong> Ollypedia Box Office Tracking &nbsp;·&nbsp;
    <strong style="color:#555;">Last Updated:</strong> <time datetime="${new Date().toISOString().slice(0,10)}" style="color:#444;">Day ${a}, ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</time> &nbsp;·&nbsp;
    <a href="${m}" style="color:#c9973a;text-decoration:none;">View full collection report →</a><br>
    <em style="color:#3a3a3a;">All collection figures are industry estimates and may vary from official figures.</em>
  </p>
</div>`},J={display:"block",fontSize:"0.72rem",color:"var(--muted)",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"};function Ae({movie:n,isEdit:i,dayData:s,allDays:p,onClose:a,onSaved:b,onToast:D,trackType:j="normal"}){const t=se(n.releaseDate),u=p.length?Math.max(...p.map(l=>l.day))+1:1,f=l=>({day:String((l==null?void 0:l.day)??u),net:String((l==null?void 0:l.net)??""),gross:String((l==null?void 0:l.gross)??""),date:String((l==null?void 0:l.date)??new Date().toISOString().slice(0,10)),note:String((l==null?void 0:l.note)??"")}),[r,$]=z.useState(f(s));we.useEffect(()=>{$(f(s)),s!=null&&s.gross&&Y(!0)},[s,u]);const[d,x]=z.useState(!1),[R,w]=z.useState(""),[m,O]=z.useState(""),[v,N]=z.useState(null),[k,U]=z.useState(""),[V,_]=z.useState(!1),[W,F]=z.useState(""),[P,Y]=z.useState(!!(s!=null&&s.gross)),X=1.18,A=l=>C=>{const T=C.target.value;l==="net"?$(B=>{const S=pe(T),I=S>0?h(Math.round(S*X)):B.gross;return{...B,net:T,gross:P?B.gross:I}}):l==="gross"?(Y(T.trim()!==""),$(B=>({...B,gross:T}))):$(B=>({...B,[l]:T}))},E=z.useCallback(()=>{const l={day:parseInt(r.day,10),net:r.net.trim(),gross:r.gross.trim(),date:r.date,note:r.note.trim()};return[...(p||[]).filter(T=>T.day!==l.day),l].sort((T,B)=>T.day-B.day)},[r,p]);z.useEffect(()=>{if(!d)return;const l=parseInt(r.day,10),C=E(),T=C.reduce((S,I)=>S+G(I.net),0),B=C.reduce((S,I)=>S+G(I.gross),0);w(Ne(n,C,T,B,l))},[d]);const o=async()=>{if(R.trim()){U("loading"),O(""),N(null);try{const l=$e(),C=await fetch(`${ve}/admin/generate-article`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({prompt:R})}),T=await C.json();if(!C.ok)throw new Error(T.error||"Generation failed");const B=T.text||"";O(B);const S=E(),I=S.reduce((oe,Q)=>oe+G(Q.net),0),te=S.reduce((oe,Q)=>oe+G(Q.gross),0);N(ce(B,n,parseInt(r.day,10),I,te,S)),U("done")}catch(l){U("error"),D("❌ AI generation failed: "+l.message,"error")}}},g=async()=>{if(!r.net.trim()&&!r.gross.trim()){F("Enter at least Net or Gross collection.");return}_(!0),F("");const l={day:parseInt(r.day,10),net:r.net.trim(),gross:r.gross.trim(),date:r.date,note:r.note.trim()};try{if(i?await Z.adminUpdateBoxOfficeDay(n._id,l.day,l,j):await Z.adminAddBoxOfficeDay(n._id,l,j),D(`Day ${l.day} ${i?"updated":"added"}!`,"success"),d){const C=E(),T=C.reduce((H,q)=>H+G(q.net),0),B=C.reduce((H,q)=>H+G(q.gross),0),S=l.day,I=j==="re-release",te=I?" (Re-Release)":"",oe=I?"-re-release":"",Q=`${n.title}${t?` (${t})`:""}${te} Day ${S} box office collection and collected ${h(B)} gross`,ge=`${n.title}${t?` (${t})`:""}${oe} day ${S} box office collection`,re=ie(ge),le=v||ce(m,n,S,T,B,C),fe=Te(n,C,T,B,S,le,re,j),c=le.introParagraph||`${Q}: Net ${h(l.net||0)}, Gross ${h(l.gross||0)}. Total ${h(T)} net in ${C.length} days.`,L=`${n.title}${t?` (${t})`:""}${te} Day ${S} box office collection and collected ${h(B)} gross | Ollypedia`,ne=`${n.title}${t?` (${t})`:""}${te} Day ${S} box office collection: The film has collected ${h(T)} net and ${h(B)} gross in ${S} day${S!==1?"s":""}. Check complete day-wise breakdown, audience response, and performance analysis on Ollypedia.`,K={title:Q,slug:re,excerpt:c,content:fe,category:"Box Office",tags:[n.title,"Box Office","Odia Cinema","Ollywood",`Day ${S}`,t?String(t):null,...le&&n.cast?(()=>{const H=he(n);return[H.directorName,H.producerName,H.musicDirector,...H.leadActors,...H.leadActresses].filter(Boolean)})():[]].filter(Boolean),coverImage:n.bannerUrl||n.posterUrl||"",movieId:n._id,movieTitle:n.title,published:!0,featured:!1,seoTitle:L,seoDesc:ne};let ee=null;try{const q=(await Z.adminGetBlogPosts()).find(ae=>ae.slug===re);q&&(ee=q._id)}catch{}ee?(await Z.adminUpdateBlog(ee,K),D(`✅ Day ${S} blog updated at /blog/${re}`,"success")):(await Z.adminCreateBlog(K),D(`✅ Day ${S} blog published at /blog/${re}`,"success"))}b(),a()}catch(C){F(C.message||"Save failed.")}finally{_(!1)}},y=parseInt(r.day,10),M=ie(`${n.title}${t?` (${t})`:""} day ${y} box office collection`);return e.jsx("div",{className:"modal-overlay",onClick:a,children:e.jsxs("div",{className:"modal",onClick:l=>l.stopPropagation(),style:{maxWidth:580,maxHeight:"90vh",overflowY:"auto"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("span",{className:"modal-title",children:[i?`✏️ Edit Day ${s.day}`:`➕ Add Day ${r.day}`," — ",n.title,t?` (${t})`:""]}),e.jsx("button",{className:"modal-close",onClick:a,children:"×"})]}),e.jsxs("div",{style:{padding:"22px 24px"},children:[W&&e.jsxs("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.4)",borderRadius:8,color:"#e87a6a",fontSize:"0.82rem"},children:["⚠️ ",W]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Day Number"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",value:r.day,onChange:A("day"),disabled:i})]}),e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Date"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"date",value:r.date,onChange:A("date")})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Net Collection (₹)"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"text",placeholder:"e.g. 45,00,000",value:r.net,onChange:A("net"),autoFocus:!i}),e.jsx("div",{style:{fontSize:"0.65rem",color:"var(--muted)",marginTop:4},children:"Gross auto-calculates at Net × 1.18 (18% GST)"})]}),e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5},children:[e.jsx("label",{style:{...J,marginBottom:0},children:"Gross Collection (₹)"}),P&&e.jsx("button",{type:"button",onClick:()=>{Y(!1);const l=parseFloat(r.net.replace(/[^0-9.]/g,"")),C=!isNaN(l)&&l>0?String(Math.round(l*X)):"";$(T=>({...T,gross:C}))},style:{fontSize:"0.6rem",color:"var(--gold)",background:"rgba(201,151,58,0.12)",border:"1px solid rgba(201,151,58,0.3)",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontWeight:700},children:"↺ Auto"})]}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box",borderColor:P?"rgba(201,151,58,0.5)":void 0},type:"text",placeholder:"Auto-filled from Net",value:r.gross,onChange:A("gross")}),e.jsx("div",{style:{fontSize:"0.65rem",marginTop:4,color:P?"var(--gold)":"var(--muted)"},children:P?"✏️ Manual override — click ↺ Auto to recalculate":"✅ Auto-calculated from Net"})]})]}),e.jsxs("div",{style:{marginBottom:20},children:[e.jsx("label",{style:J,children:"Notes (optional)"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"text",placeholder:"e.g. 2nd Saturday, Holiday boost",value:r.note,onChange:A("note")})]}),e.jsx("div",{style:{borderTop:"1px solid var(--border)",margin:"0 0 20px"}}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:d?16:0,cursor:"pointer",userSelect:"none"},onClick:()=>x(l=>!l),children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:"0.9rem"},children:["🤖 Generate AI Blog for Day ",y]}),e.jsxs("div",{style:{fontSize:"0.71rem",color:"var(--muted)",marginTop:3,lineHeight:1.5},children:["Will publish at"," ",e.jsxs("code",{style:{background:"var(--bg3)",padding:"1px 6px",borderRadius:4,color:"var(--gold)",fontSize:"0.68rem"},children:["/blog/",M]})," ","with Day 1–",y," cumulative data"]})]}),e.jsx("div",{style:{width:42,height:24,borderRadius:12,background:d?"var(--gold)":"var(--bg3)",border:"1px solid var(--border)",position:"relative",transition:"background 0.2s",flexShrink:0},children:e.jsx("div",{style:{position:"absolute",top:3,left:d?21:3,width:16,height:16,borderRadius:8,background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}})})]}),d&&e.jsxs("div",{style:{background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.18)",borderRadius:10,padding:"16px 18px",marginBottom:18},children:[e.jsx("label",{style:{...J,color:"#c9973a"},children:"AI Prompt (edit before generating)"}),e.jsx("textarea",{className:"form-input",value:R,onChange:l=>w(l.target.value),rows:7,style:{width:"100%",boxSizing:"border-box",fontSize:"0.76rem",lineHeight:1.65,resize:"vertical",fontFamily:"monospace",marginBottom:10},placeholder:"Prompt will auto-fill when you open this section…"}),e.jsx("button",{className:"btn btn-sm",style:{width:"100%",background:"rgba(201,151,58,0.14)",color:"var(--gold)",border:"1px solid rgba(201,151,58,0.4)",fontWeight:700},onClick:o,disabled:k==="loading"||!R.trim(),children:k==="loading"?"⏳ Generating with Groq AI…":k==="done"?"✅ Regenerate":"🤖 Generate Blog Content"}),k==="error"&&e.jsx("div",{style:{marginTop:10,fontSize:"0.78rem",color:"#e87a6a"},children:"❌ Generation failed — check GROQ_API_KEY in .env, then retry."}),k==="done"&&v&&(()=>{const l=[{label:"SEO Headline",key:"seoHeadline",rows:1},{label:"Intro Paragraph",key:"introParagraph",rows:3},{label:"Box Office Journey",key:"boxOfficeAnalysis",rows:5},{label:"Audience Response",key:"audienceResponse",rows:4},{label:"Performance Analysis",key:"performanceAnalysis",rows:4},{label:"Future Prediction",key:"prediction",rows:3},{label:"Final Verdict",key:"finalVerdict",rows:3}];return e.jsxs("div",{style:{marginTop:14},children:[e.jsx("div",{style:{fontSize:"0.72rem",color:"var(--gold)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12},children:"✅ Generated — Edit any section below before saving"}),l.map(({label:C,key:T,rows:B})=>e.jsxs("div",{style:{marginBottom:14},children:[e.jsx("label",{style:{display:"block",fontSize:"0.68rem",color:"var(--muted)",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"},children:C}),e.jsx("textarea",{className:"form-input",value:v[T]||"",onChange:S=>N(I=>({...I,[T]:S.target.value})),rows:B,style:{width:"100%",boxSizing:"border-box",fontSize:"0.77rem",lineHeight:1.7,resize:"vertical"}})]},T)),e.jsx("div",{style:{fontSize:"0.68rem",color:"var(--muted)",marginTop:4,lineHeight:1.6},children:"✏️ Edit any section above. Blog publishes with full SEO, schema, hero, day-wise table & all sections."})]})})()]}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{className:"btn btn-ghost",style:{flex:1},onClick:a,disabled:V,children:"Cancel"}),e.jsx("button",{className:"btn btn-gold",style:{flex:2,fontWeight:800},onClick:g,disabled:V||d&&k==="loading",children:V?"Saving…":d?`💾 Save Day ${y} + Publish Blog`:`💾 Save Day ${y}`})]}),d&&e.jsxs("p",{style:{marginTop:10,fontSize:"0.7rem",color:"var(--muted)",textAlign:"center",lineHeight:1.6},children:["Day ",y," blog will include ",e.jsxs("strong",{style:{color:"var(--text)"},children:["all days 1–",y]})," in the table. Day 1 blog has 1 row, Day 2 has 2 rows, and so on."]})]})]})})}function Be({movie:n,allDays:i,onClose:s,onSaved:p,onToast:a}){const b=se(n.releaseDate),D=i.length?Math.max(...i.map(o=>o.day))+1:1,j=new Set(i.map(o=>o.day)),[t,u]=z.useState("file"),[f,r]=z.useState(D),[$,d]=z.useState(30),[x,R]=z.useState(""),[w,m]=z.useState([]),[O,v]=z.useState(!1),[N,k]=z.useState(""),U=z.useRef(null),V=o=>{const g=new Map;return o.forEach(({day:y,netRaw:M})=>g.set(y,{day:y,netRaw:M})),Array.from(g.values()).sort((y,M)=>y.day-M.day).map(y=>{const M=pe(y.netRaw);return{...y,netNum:M,valid:M>0,grossNum:M>0?Math.round(M*ke):0,date:xe(n.releaseDate,y.day),isUpdate:j.has(y.day)}})},_=()=>{const o=Se(n,f,$),g=ie(n.title||"movie");je(o,`${g}-boxoffice-template-day${f}-to-${f+$-1}.csv`)},W=async o=>{var y;const g=(y=o.target.files)==null?void 0:y[0];if(g){k("");try{const M=await g.text(),l=Oe(M),C=ze(l);C.length?m(V(C)):(k("No usable rows found — make sure the Net Collection column is filled in."),m([]))}catch(M){k("Could not read that file: "+M.message)}finally{U.current&&(U.current.value="")}}},F=()=>{k("");const o=De(x);o.length?m(V(o)):(k('Could not find any day lines. Try one entry per line, e.g. "Day 1 - 1500000".'),m([]))},P=w.filter(o=>o.valid),Y=w.filter(o=>!o.valid),X=P.filter(o=>!o.isUpdate).length,A=P.filter(o=>o.isUpdate).length,E=async()=>{if(P.length){v(!0),k("");try{const o={days:P.map(y=>({day:y.day,net:String(y.netNum)}))},g=await Z.adminBulkBoxOfficeDays(n._id,o);a(`✅ Saved ${g.added||0} new + ${g.updated||0} updated day(s) for ${n.title}.`,"success"),p(),s()}catch(o){k(o.message||"Bulk save failed.")}finally{v(!1)}}};return e.jsx("div",{className:"modal-overlay",onClick:s,children:e.jsxs("div",{className:"modal",onClick:o=>o.stopPropagation(),style:{maxWidth:700,maxHeight:"90vh",overflowY:"auto"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("span",{className:"modal-title",children:["📤 Bulk Box Office Upload — ",n.title,b?` (${b})`:""]}),e.jsx("button",{className:"modal-close",onClick:s,children:"×"})]}),e.jsxs("div",{style:{padding:"22px 24px"},children:[!n.releaseDate&&e.jsx("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,160,40,0.08)",border:"1px solid rgba(220,160,40,0.3)",borderRadius:8,color:"#d9a73a",fontSize:"0.8rem"},children:"⚠️ This movie has no release date set, so per-day dates can't be auto-calculated. Set a release date first so Day 1 = release date works correctly."}),N&&e.jsxs("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.4)",borderRadius:8,color:"#e87a6a",fontSize:"0.82rem"},children:["⚠️ ",N]}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:18},children:[["file","📄 Template File"],["paste","✏️ Paste Data"]].map(([o,g])=>e.jsx("button",{onClick:()=>{u(o),m([]),k("")},className:t===o?"btn btn-gold btn-sm":"btn btn-ghost btn-sm",style:{fontWeight:700},children:g},o))}),t==="file"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Start Day"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",value:f,onChange:o=>r(parseInt(o.target.value,10)||1)})]}),e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Number of Days"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",max:"200",value:$,onChange:o=>d(parseInt(o.target.value,10)||1)})]})]}),e.jsxs("button",{className:"btn btn-ghost btn-sm",style:{width:"100%",marginBottom:14,fontWeight:700},onClick:_,children:["⬇️ Download Template (Day ",f,"–",f+$-1,")"]}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",marginBottom:16,lineHeight:1.6},children:["Open it in Excel/Sheets, fill in the ",e.jsx("strong",{style:{color:"var(--text)"},children:"Net Collection"})," column only — leave a day blank to skip it — then save as ",e.jsx("strong",{style:{color:"var(--text)"},children:".csv"})," and upload it below. Dates and Gross are always calculated automatically; whatever ends up in the Date column is ignored."]}),e.jsx("label",{style:J,children:"Upload Filled Template (.csv)"}),e.jsx("input",{ref:U,type:"file",accept:".csv,text/csv",onChange:W,className:"form-input",style:{width:"100%",boxSizing:"border-box"}})]}),t==="paste"&&e.jsxs(e.Fragment,{children:[e.jsx("label",{style:J,children:"Paste day-wise data (one entry per line)"}),e.jsx("textarea",{className:"form-input",style:{width:"100%",boxSizing:"border-box",minHeight:140,fontFamily:"monospace",fontSize:"0.82rem",resize:"vertical"},placeholder:`Day 1 - 1500000
Day 2 - 2200000
Day 3 - 1.8 Cr
…`,value:x,onChange:o=>R(o.target.value)}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",margin:"8px 0 14px",lineHeight:1.6},children:['Accepts formats like "Day 1 - 1500000", "1,15L", "1 1.2 Cr" — one entry per line. Dates and Gross are calculated automatically from Day 1 = ',n.releaseDate?new Date(n.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"the release date","."]}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:F,disabled:!x.trim(),children:"🔍 Parse & Preview"})]}),w.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{borderTop:"1px solid var(--border)",margin:"20px 0 16px"}}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12},children:[e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(80,200,120,0.12)",color:"#6fd08c",border:"1px solid rgba(80,200,120,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[X," new"]}),A>0&&e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(201,151,58,0.12)",color:"var(--gold)",border:"1px solid rgba(201,151,58,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[A," will be overwritten"]}),Y.length>0&&e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(220,50,50,0.1)",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[Y.length," skipped (no readable amount)"]})]}),e.jsx("div",{style:{maxHeight:280,overflowY:"auto",border:"1px solid var(--border)",borderRadius:10},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.82rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"var(--bg2)"},children:["Day","Date","Net","Gross","Status"].map(o=>e.jsx("th",{style:{padding:"8px 12px",textAlign:"left",fontSize:"0.62rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"2px solid var(--border)",position:"sticky",top:0,background:"var(--bg2)"},children:o},o))})}),e.jsx("tbody",{children:w.map(o=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",opacity:o.valid?1:.5},children:[e.jsxs("td",{style:{padding:"7px 12px",fontWeight:700,color:"var(--gold)"},children:["Day ",o.day]}),e.jsx("td",{style:{padding:"7px 12px",color:"var(--muted)"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"7px 12px",fontWeight:600},children:o.valid?h(o.netNum):o.netRaw||"—"}),e.jsx("td",{style:{padding:"7px 12px",color:"#7ec8e3"},children:o.valid?h(o.grossNum):"—"}),e.jsx("td",{style:{padding:"7px 12px",fontSize:"0.72rem"},children:o.valid?o.isUpdate?e.jsx("span",{style:{color:"var(--gold)"},children:"↻ update"}):e.jsx("span",{style:{color:"#6fd08c"},children:"+ new"}):e.jsx("span",{style:{color:"#e87a6a"},children:"⚠️ unreadable amount"})})]},o.day))})]})})]}),e.jsxs("div",{style:{display:"flex",gap:10,marginTop:22},children:[e.jsx("button",{className:"btn btn-ghost",style:{flex:1},onClick:s,disabled:O,children:"Cancel"}),e.jsx("button",{className:"btn btn-gold",style:{flex:2,fontWeight:800},onClick:E,disabled:O||P.length===0,children:O?"Saving…":`💾 Save ${P.length} Day${P.length!==1?"s":""}`})]})]})]})})}function Ie({movies:n,onToast:i}){const[s,p]=z.useState(""),[a,b]=z.useState([]),[D,j]=z.useState(!1),[t,u]=z.useState(null),[f,r]=z.useState([]),[$,d]=z.useState([]),[x,R]=z.useState(!1),[w,m]=z.useState(null),[O,v]=z.useState(!1),N=z.useRef(null);z.useEffect(()=>{const o=g=>{N.current&&!N.current.contains(g.target)&&j(!1)};return document.addEventListener("mousedown",o),()=>document.removeEventListener("mousedown",o)},[]),z.useEffect(()=>{if(!s.trim()||t){b([]),j(!1);return}const o=s.toLowerCase(),g=(Array.isArray(n)?n:[]).filter(y=>(y.title||"").toLowerCase().includes(o)).slice(0,8);b(g),j(g.length>0)},[s,n,t]);const k=z.useCallback(async o=>{if(o!=null&&o._id){r([]),d([]),R(!0);try{const g=await Z.getMovieBoxOfficeDays(o._id,"original"),y=Array.isArray(g)?[...g].sort((M,l)=>M.day-l.day):[];if(r(y),o.isReRelease)try{const M=await Z.getMovieBoxOfficeDays(o._id,"re-release"),l=Array.isArray(M)?[...M].sort((C,T)=>C.day-T.day):[];d(l)}catch{d([])}}catch(g){i==null||i("Failed to load data: "+g.message,"error"),r([])}finally{R(!1)}}},[i]),U=o=>{u(o),p(o.title),j(!1),k(o)},V=()=>{u(null),p(""),r([]),d([])};f.reduce((o,g)=>o+G(g.net),0),f.reduce((o,g)=>o+G(g.gross),0);const _=f.length?Math.max(...f.map(o=>o.day))+1:1,W=t?se(t.releaseDate):"",F=!!(t!=null&&t.isReRelease&&(t!=null&&t.reReleaseDate)),P=f.reduce((o,g)=>o+G(g.net),0),Y=f.reduce((o,g)=>o+G(g.gross),0),X=$.reduce((o,g)=>o+G(g.net),0),A=$.reduce((o,g)=>o+G(g.gross),0),E=$.length?Math.max(...$.map(o=>o.day))+1:1;return e.jsxs("div",{style:{padding:"0 28px 60px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",position:"sticky",top:0,zIndex:50,background:"var(--bg1)",padding:"13px 28px",margin:"0 -28px 28px",boxShadow:"0 2px 20px rgba(0,0,0,0.5)",borderBottom:"1px solid var(--border)"},children:[e.jsx("h2",{style:{fontSize:"1.3rem",margin:0,fontWeight:800},children:"📊 Box Office"}),t&&e.jsxs("span",{style:{fontSize:"0.74rem",color:"var(--gold)",background:"rgba(201,151,58,0.1)",border:"1px solid rgba(201,151,58,0.25)",padding:"3px 10px",borderRadius:12,fontWeight:600},children:[t.title,W?` (${W})`:""]}),t&&f.length>0&&e.jsxs("span",{style:{fontSize:"0.68rem",color:"var(--muted)",background:"var(--bg3)",padding:"3px 9px",borderRadius:10,fontWeight:600},children:[f.length," day",f.length!==1?"s":""," recorded"]}),e.jsx("div",{style:{flex:1}}),t&&e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontWeight:800},onClick:()=>v(!0),children:"📤 Bulk Upload"}),t&&e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>m({isEdit:!1,dayData:null}),children:["+ Add Day ",_]})]}),e.jsxs("div",{style:{maxWidth:500,marginBottom:32},children:[e.jsx("label",{style:{...J,marginBottom:8,fontSize:"0.78rem"},children:"Search Movie"}),e.jsxs("div",{ref:N,style:{position:"relative"},children:[e.jsx("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",pointerEvents:"none",zIndex:1},children:"🔍"}),e.jsx("input",{className:"form-input",style:{paddingLeft:38,paddingRight:t?36:14,width:"100%",boxSizing:"border-box"},placeholder:"Type movie name to search…",value:s,onChange:o=>{p(o.target.value),t&&(u(null),r([]))},onFocus:()=>a.length>0&&j(!0)}),t&&e.jsx("button",{onClick:V,style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"1.2rem",padding:0},children:"×"}),D&&a.length>0&&e.jsx("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,zIndex:200,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.65)"},children:a.map(o=>e.jsxs("button",{onClick:()=>U(o),style:{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left",borderBottom:"1px solid var(--border)"},onMouseEnter:g=>g.currentTarget.style.background="rgba(201,151,58,0.09)",onMouseLeave:g=>g.currentTarget.style.background="none",children:[(o.posterUrl||o.thumbnailUrl)&&e.jsx("img",{src:o.posterUrl||o.thumbnailUrl,alt:o.title,style:{width:28,height:38,objectFit:"cover",borderRadius:4,flexShrink:0},onError:g=>g.target.style.display="none"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:700,fontSize:"0.88rem"},children:o.title}),e.jsxs("div",{style:{fontSize:"0.68rem",color:"var(--muted)"},children:[o.releaseDate?new Date(o.releaseDate).getFullYear():"TBA",o.language?` · ${o.language}`:""]})]})]},o._id))}),D&&a.length===0&&s.trim()&&!t&&e.jsxs("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,zIndex:200,padding:16,color:"var(--muted)",fontSize:"0.83rem"},children:['No movies found for "',s,'"']})]})]}),!t&&e.jsxs("div",{style:{textAlign:"center",padding:"80px 0",color:"var(--muted)"},children:[e.jsx("div",{style:{fontSize:"4rem",marginBottom:16},children:"📊"}),e.jsx("div",{style:{fontSize:"1.1rem",fontWeight:800,marginBottom:8,color:"var(--text)"},children:"Box Office Tracker"}),e.jsx("div",{style:{fontSize:"0.84rem",maxWidth:380,margin:"0 auto",lineHeight:1.8},children:"Search a movie above to record day-wise collection and publish AI-powered box office blogs per day."})]}),t&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"20px 24px",marginBottom:28,overflow:"hidden",position:"relative"},children:[t.bannerUrl&&e.jsx("img",{src:t.bannerUrl,alt:"",style:{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.06,pointerEvents:"none"},onError:o=>o.target.style.display="none"}),e.jsxs("div",{style:{display:"flex",gap:20,alignItems:"flex-start",position:"relative",zIndex:1},children:[(t.posterUrl||t.thumbnailUrl)&&e.jsx("img",{src:t.posterUrl||t.thumbnailUrl,alt:t.title,style:{width:68,height:94,objectFit:"cover",borderRadius:10,flexShrink:0,boxShadow:"0 4px 20px rgba(0,0,0,0.7)"},onError:o=>o.target.style.display="none"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontWeight:800,fontSize:"1.25rem",lineHeight:1.2,marginBottom:4},children:[t.title,W?` (${W})`:"",F&&e.jsx("span",{style:{marginLeft:8,fontSize:"0.65rem",background:"rgba(201,151,58,0.18)",color:"#c9973a",padding:"2px 8px",borderRadius:10,fontWeight:700,verticalAlign:"middle"},children:"🔄 Re-Release"})]}),e.jsxs("div",{style:{fontSize:"0.75rem",color:"var(--muted)",marginBottom:16},children:[t.releaseDate?new Date(t.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Release TBA",F&&` · Re-Release: ${new Date(t.reReleaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`,t.language?` · ${t.language}`:"",t.budget?` · Budget: ${t.budget}`:""]}),e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:10},children:[{label:"Original Net",value:h(P),color:"var(--gold)"},{label:"Original Gross",value:h(Y),color:"#7ec8e3"},F?{label:"Re-Release Net",value:h(X),color:"#e89b3a"}:null,F?{label:"Re-Release Gross",value:h(A),color:"#a8d8ea"}:null,{label:"Days",value:x?"…":f.length||"—",color:"var(--text)"}].filter(Boolean).map(({label:o,value:g,color:y})=>e.jsxs("div",{style:{background:"rgba(0,0,0,0.4)",borderRadius:10,padding:"9px 16px",border:"1px solid rgba(255,255,255,0.06)",minWidth:110},children:[e.jsx("div",{style:{fontSize:"0.6rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3},children:o}),e.jsx("div",{style:{fontSize:"1.05rem",fontWeight:800,color:y},children:g})]},o))})]})]})]}),x&&e.jsxs("div",{style:{textAlign:"center",padding:52,color:"var(--muted)"},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"⏳"}),e.jsx("div",{style:{fontSize:"0.88rem"},children:"Loading collection data…"})]}),!x&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsx("div",{style:{fontWeight:800,fontSize:"1rem",color:"var(--text)"},children:"🎬 Original Box Office"}),e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>m({isEdit:!1,dayData:null,trackType:"original"}),children:["+ Add Day ",_]})]}),f.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--muted)",border:"1px dashed var(--border)",borderRadius:12,marginBottom:28},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"📭"}),e.jsx("div",{style:{fontWeight:700,marginBottom:6,color:"var(--text)",fontSize:"0.95rem"},children:"No original box office data yet"}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800,marginTop:8},onClick:()=>m({isEdit:!1,dayData:null,trackType:"original"}),children:"+ Add Day 1 Collection"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{overflowX:"auto",borderRadius:12,border:"1px solid var(--border)",marginBottom:8},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"var(--bg2)"},children:["Day","Date","Net Collection","Gross Collection","Notes",""].map((o,g)=>e.jsx("th",{style:{padding:"12px 16px",textAlign:"left",fontSize:"0.64rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,whiteSpace:"nowrap",borderBottom:"2px solid var(--border)"},children:o},g))})}),e.jsx("tbody",{children:f.map((o,g)=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",background:g%2===0?"transparent":"rgba(255,255,255,0.012)",transition:"background 0.1s"},onMouseEnter:y=>y.currentTarget.style.background="rgba(201,151,58,0.05)",onMouseLeave:y=>y.currentTarget.style.background=g%2===0?"transparent":"rgba(255,255,255,0.012)",children:[e.jsxs("td",{style:{padding:"12px 16px",fontWeight:800,color:"var(--gold)",whiteSpace:"nowrap"},children:["Day ",o.day,o.day===1&&e.jsx("span",{style:{marginLeft:6,fontSize:"0.6rem",background:"rgba(201,151,58,0.14)",color:"var(--gold)",padding:"1px 6px",borderRadius:8},children:"Opening"})]}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.8rem"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:700},children:h(o.net)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:600,color:"#7ec8e3"},children:h(o.gross)}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.78rem",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:o.note||"—"}),e.jsxs("td",{style:{padding:"12px 16px",whiteSpace:"nowrap",display:"flex",gap:6},children:[e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px"},onClick:()=>m({isEdit:!0,dayData:o,trackType:"original"}),children:"✏️ Edit"}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.35)"},onClick:async()=>{if(window.confirm(`Delete Day ${o.day} collection data? This cannot be undone.`))try{await Z.adminDeleteBoxOfficeDay(t._id,o.day,"original"),i(`Day ${o.day} deleted.`,"success"),k(t)}catch(y){i("❌ Delete failed: "+y.message,"error")}},children:"🗑️ Delete"})]})]},o.day))}),e.jsx("tfoot",{children:e.jsxs("tr",{style:{background:"rgba(201,151,58,0.07)",borderTop:"2px solid var(--border)"},children:[e.jsxs("td",{colSpan:2,style:{padding:"12px 16px",fontWeight:800,fontSize:"0.78rem",color:"var(--gold)",textTransform:"uppercase",letterSpacing:"0.07em"},children:["TOTAL (",f.length," day",f.length!==1?"s":"",")"]}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"var(--gold)",fontSize:"1rem"},children:h(P)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#7ec8e3",fontSize:"1rem"},children:h(Y)}),e.jsx("td",{colSpan:2})]})})]})}),e.jsxs("div",{style:{marginBottom:32,padding:"10px 16px",background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.14)",borderRadius:10,fontSize:"0.77rem",color:"var(--muted)",lineHeight:1.7},children:["💡 ",e.jsx("strong",{style:{color:"var(--text)"},children:"Tip:"})," Use ",e.jsxs("strong",{style:{color:"var(--gold)"},children:["+ Add Day ",_]})," to record new data. Toggle ",e.jsx("strong",{style:{color:"var(--gold)"},children:"🤖 AI Blog"})," to also publish an SEO article."]})]}),F&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{borderTop:"2px solid rgba(201,151,58,0.3)",margin:"8px 0 22px"}}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:800,fontSize:"1rem",color:"#c9973a"},children:"🔄 Re-Release Box Office"}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",marginTop:2},children:["Re-Released: ",new Date(t.reReleaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})]})]}),e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800,background:"rgba(201,151,58,0.2)",border:"1px solid rgba(201,151,58,0.5)"},onClick:()=>m({isEdit:!1,dayData:null,trackType:"re-release"}),children:["+ Add Re-Release Day ",E]})]}),$.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--muted)",border:"1px dashed rgba(201,151,58,0.35)",borderRadius:12,marginBottom:28},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"🔄"}),e.jsx("div",{style:{fontWeight:700,marginBottom:6,color:"var(--text)",fontSize:"0.95rem"},children:"No re-release box office data yet"}),e.jsx("div",{style:{fontSize:"0.8rem",marginBottom:12},children:"Add re-release day-wise collection data to track the re-release run separately."}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>m({isEdit:!1,dayData:null,trackType:"re-release"}),children:"+ Add Re-Release Day 1"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{overflowX:"auto",borderRadius:12,border:"1px solid rgba(201,151,58,0.3)",marginBottom:8},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"rgba(201,151,58,0.06)"},children:["Day","Date","Net Collection","Gross Collection","Notes",""].map((o,g)=>e.jsx("th",{style:{padding:"12px 16px",textAlign:"left",fontSize:"0.64rem",color:"#c9973a",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,whiteSpace:"nowrap",borderBottom:"2px solid rgba(201,151,58,0.25)"},children:o},g))})}),e.jsx("tbody",{children:$.map((o,g)=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",background:g%2===0?"transparent":"rgba(201,151,58,0.02)",transition:"background 0.1s"},onMouseEnter:y=>y.currentTarget.style.background="rgba(201,151,58,0.07)",onMouseLeave:y=>y.currentTarget.style.background=g%2===0?"transparent":"rgba(201,151,58,0.02)",children:[e.jsxs("td",{style:{padding:"12px 16px",fontWeight:800,color:"#c9973a",whiteSpace:"nowrap"},children:["Day ",o.day,o.day===1&&e.jsx("span",{style:{marginLeft:6,fontSize:"0.6rem",background:"rgba(201,151,58,0.18)",color:"#c9973a",padding:"1px 6px",borderRadius:8},children:"Re-Opening"})]}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.8rem"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:700},children:h(o.net)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:600,color:"#7ec8e3"},children:h(o.gross)}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.78rem",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:o.note||"—"}),e.jsxs("td",{style:{padding:"12px 16px",whiteSpace:"nowrap",display:"flex",gap:6},children:[e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px"},onClick:()=>m({isEdit:!0,dayData:o,trackType:"re-release"}),children:"✏️ Edit"}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.35)"},onClick:async()=>{if(window.confirm(`Delete Re-Release Day ${o.day}? This cannot be undone.`))try{await Z.adminDeleteBoxOfficeDay(t._id,o.day,"re-release"),i(`Re-Release Day ${o.day} deleted.`,"success"),k(t)}catch(y){i("❌ Delete failed: "+y.message,"error")}},children:"🗑️ Delete"})]})]},o.day))}),e.jsx("tfoot",{children:e.jsxs("tr",{style:{background:"rgba(201,151,58,0.1)",borderTop:"2px solid rgba(201,151,58,0.3)"},children:[e.jsxs("td",{colSpan:2,style:{padding:"12px 16px",fontWeight:800,fontSize:"0.78rem",color:"#c9973a",textTransform:"uppercase",letterSpacing:"0.07em"},children:["RE-RELEASE TOTAL (",$.length," day",$.length!==1?"s":"",")"]}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#c9973a",fontSize:"1rem"},children:h(X)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#7ec8e3",fontSize:"1rem"},children:h(A)}),e.jsx("td",{colSpan:2})]})})]})}),e.jsxs("div",{style:{marginBottom:16,padding:"10px 16px",background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.2)",borderRadius:10,fontSize:"0.77rem",color:"var(--muted)",lineHeight:1.7},children:["💡 ",e.jsx("strong",{style:{color:"var(--text)"},children:"Tip:"})," Use ",e.jsxs("strong",{style:{color:"#c9973a"},children:["+ Add Re-Release Day ",E]})," to record more data. Toggle ",e.jsx("strong",{style:{color:"#c9973a"},children:"🤖 AI Blog"})," to publish a re-release specific blog article."]})]})]})]})]}),w&&t&&e.jsx(Ae,{movie:t,isEdit:w.isEdit,dayData:w.isEdit?w.dayData:null,allDays:w.trackType==="re-release"?$:f,onClose:()=>m(null),onSaved:()=>k(t),onToast:i,trackType:w.trackType||"original"}),O&&t&&e.jsx(Be,{movie:t,allDays:f,onClose:()=>v(!1),onSaved:()=>k(t),onToast:i})]})}export{Ie as default};
