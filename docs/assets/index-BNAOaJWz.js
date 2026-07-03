(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();function J(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function Be(){return{roomId:J(),inviteToken:J()}}function we({wsUrl:e,roomId:t,inviteToken:n,name:s,onHealth:o,onError:i}){if(!t)throw new Error("A room ID is required.");if(!n)throw new Error("An invitation token is required.");const r=J(),l=[],a=[],c=[],f=[];let p=null,L=!1,O=!1,E=0,b=0,I=0,F=null;const x=g=>o==null?void 0:o({localPeerId:r,status:g,peerCount:b,reconnectAttempts:I,peers:[]});function B(g){const A=JSON.stringify(g);L&&(p==null?void 0:p.readyState)===WebSocket.OPEN?p.send(A):f.push(A)}function k(){for(;f.length&&(p==null?void 0:p.readyState)===WebSocket.OPEN;)p.send(f.shift())}function P(){const g=`${e.replace(/\/$/,"")}/room/${encodeURIComponent(t)}`;p=new WebSocket(g),p.onopen=()=>{L=!0,E=0,B({t:"hello",id:r,token:n,name:s}),k(),x("connected")},p.onmessage=A=>{let v;try{v=JSON.parse(A.data)}catch{return}v.t==="welcome"?(b=v.peers.length,x("connected"),v.peers.forEach(T=>a.forEach(U=>U(T)))):v.t==="peer-join"?(b+=1,x("connected"),a.forEach(T=>T(v.id))):v.t==="peer-leave"?(b=Math.max(0,b-1),x("connected"),c.forEach(T=>T(v.id))):v.t==="evt"&&l.forEach(T=>T(v.payload,v.from))},p.onclose=A=>{if(L=!1,O){x("closed");return}if(A.code===4001||A.code===4002){i==null||i({type:"join-error",message:"Could not join room (bad token)."}),x("degraded");return}I+=1,x("reconnecting");const T=Math.min(1e3*2**E,8e3);E+=1,F=setTimeout(P,T)},p.onerror=()=>{i==null||i({type:"ws-error",message:"Relay connection error."})}}return P(),{localPeerId:r,publish:g=>B({t:"evt",payload:g}),publishTo:(g,A)=>B({t:"evt",target:g,payload:A}),onEvent:g=>{l.push(g)},onPeerJoin:g=>a.push(g),onPeerLeave:g=>c.push(g),getPeerIds:()=>[],leave(){O=!0,F&&clearTimeout(F);try{p==null||p.close(1e3,"leave")}catch{}}}}const V={rock:{glyph:"✊",beats:"scissors"},paper:{glyph:"✋",beats:"rock"},scissors:{glyph:"✌️",beats:"paper"}};function Fe(e){const t=Object.keys(e),n=new Set,s=new Set(t.map(o=>e[o]));if(t.length<2)return{outcome:"incomplete",winners:[],winningThrow:null};if(t.length===2){const[o,i]=t;if(e[o]===e[i])return{outcome:"draw",winners:[],winningThrow:null};const r=V[e[o]].beats===e[i]?o:i;return n.add(r),{outcome:"win",winners:[...n],winningThrow:e[r]}}if(s.size===2){const[o,i]=[...s],r=V[o].beats===i?o:i;return t.forEach(l=>{e[l]===r&&n.add(l)}),{outcome:"win",winners:[...n],winningThrow:r}}return s.size===1?{outcome:"draw",winners:[],winningThrow:null}:{outcome:"stalemate",winners:[],winningThrow:null}}function Ne(e){const t=Object.values(e).map(Number);if(!t.length)return{avg:0,spread:0,consensus:!0,hardNo:!1,min:0,max:0};const n=Math.min(...t),s=Math.max(...t),o=t.reduce((r,l)=>r+l,0)/t.length,i=s-n;return{avg:o,spread:i,consensus:i<=1,hardNo:t.some(r=>r===0),min:n,max:s}}const qe=Object.keys(V),Me={id:"rps",label:"Rock · Paper · Scissors",description:"The classic settler of disputes. Head-to-head or whole-team throwdown.",glyphs:"✊ ✋ ✌️",blind:!0,needsConfig:!1,minPlayers:2,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>qe.includes(e),result:e=>Fe(e)},Ge={id:"f2f",label:"Fist to Five",description:"Gauge the room. Zero is a hard no, five is full-throated support.",glyphs:"☝️ 🖐",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>Number.isInteger(e)&&e>=0&&e<=5,result:e=>Ne(e)},z=[0,1,2,3,5,8,13],ie=["?","coffee"],Y={id:"points",label:"Story Pointing",description:"Estimate together, anchor-free. Fibonacci scale, reveal when all hands are in.",glyphs:"1 3 5 8 13",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>z.includes(e)||ie.includes(e),result(e){const t=Object.entries(e),n=t.filter(([,f])=>typeof f=="number"),s=t.filter(([,f])=>!z.includes(f)||typeof f!="number").map(([f])=>f),o=n.map(([,f])=>f);if(!o.length)return{avg:null,min:null,max:null,consensus:!1,outliers:[],abstained:s,numericCount:0};const i=Math.min(...o),r=Math.max(...o),l=o.reduce((f,p)=>f+p,0)/o.length,a=z.indexOf(r)-z.indexOf(i)<=1,c=a?[]:n.filter(([,f])=>f===i||f===r).map(([f])=>f);return{avg:l,min:i,max:r,consensus:a,outliers:c,abstained:s,numericCount:o.length}},scale:z,special:ie},re=["yes","no","abstain"],He={id:"motion",label:"Motion Vote",description:"Pose a question, vote blind. Yes, no, or abstain — revealed together.",glyphs:"👍 👎",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({question:""}),normalizeConfig(e){return{question:typeof(e==null?void 0:e.question)=="string"?e.question.trim().slice(0,200):""}},validatePick:e=>re.includes(e),result(e){const t={yes:0,no:0,abstain:0};for(const s of Object.values(e))t[s]+=1;const n=t.yes+t.no;return{...t,passed:t.yes>t.no,tied:t.yes===t.no&&n>0,unanimous:n>0&&(t.yes===0||t.no===0)}},options:re};function ze(e,t){return!Array.isArray(e)||e.length!==t||new Set(e).size!==t?!1:e.every(s=>Number.isInteger(s)&&s>=0&&s<t)}const Ve={id:"ranked",label:"Ranked Choice",description:"Everyone privately ranks the options. Borda-count scores, revealed together.",glyphs:"🥇 🥈 🥉",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({options:[]}),normalizeConfig(e){const t=Array.isArray(e==null?void 0:e.options)?e.options:[];return{options:[...new Set(t.filter(s=>typeof s=="string").map(s=>s.trim().slice(0,100)).filter(Boolean))].slice(0,10)}},validatePick:(e,t)=>ze(e,t.options.length)&&t.options.length>=2,result(e,t){const n=t.options.length,s=new Array(n).fill(0),o=new Array(n).fill(0);for(const a of Object.values(e))a.forEach((c,f)=>{s[c]+=n-1-f,f===0&&(o[c]+=1)});const i=t.options.map((a,c)=>({option:a,index:c,points:s[c],firsts:o[c]})).sort((a,c)=>c.points-a.points||c.firsts-a.firsts||a.index-c.index),r=i[0],l=i.filter(a=>a.points===r.points&&a.firsts===r.firsts);return{scores:i,winner:l.length===1?r.option:null,tie:l.length>1?l.map(a=>a.option):[],voterCount:Object.keys(e).length}}},ae=["Mission & Purpose","Pace & Sustainability","Process & Tools","Support & Safety","Fun & Energy"],ce=["r","y","g"];function le(e){const{r:t,y:n,g:s}=e;return s>n&&s>t?"g":n>s&&n>t?"y":t>n&&t>s||t===n&&t>=s?"r":"y"}const Ue={id:"health",label:"Health Check",description:"Rate the team red / yellow / green across five dimensions, blind, then compare.",glyphs:"🔴 🟡 🟢",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({categories:ae}),normalizeConfig(e){const n=(Array.isArray(e==null?void 0:e.categories)?e.categories:[]).filter(s=>typeof s=="string").map(s=>s.trim().slice(0,60)).filter(Boolean).slice(0,10);return{categories:n.length>=2?n:ae}},validatePick(e,t){return!e||typeof e!="object"||Array.isArray(e)?!1:t.categories.every((n,s)=>ce.includes(e[s]))},result(e,t){const n=t.categories.map((o,i)=>{const r={r:0,y:0,g:0};for(const l of Object.values(e))r[l[i]]+=1;return{name:o,...r,light:le(r)}}),s={r:0,y:0,g:0};for(const o of n)s[o.light]+=1;return{categories:n,overall:le(s),raterCount:Object.keys(e).length}},lights:ce};function H(e){if(e===void 0)throw new Error("cannot canonicalize undefined");if(typeof e=="function"||typeof e=="symbol"||typeof e=="bigint")throw new Error(`cannot canonicalize ${typeof e}`);if(typeof e=="number"&&!Number.isFinite(e))throw new Error("cannot canonicalize non-finite number");return e===null||typeof e!="object"?JSON.stringify(e):Array.isArray(e)?`[${e.map(H).join(",")}]`:`{${Object.keys(e).sort().map(s=>`${JSON.stringify(s)}:${H(e[s])}`).join(",")}}`}function _e(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619)>>>0;return t>>>0}const De={id:"turn",label:"Turn Picker",description:"Fairly picks who goes next. Nobody can rig it — randomness comes from everyone.",glyphs:"🎯",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({excluded:[]}),normalizeConfig(e){return{excluded:(Array.isArray(e==null?void 0:e.excluded)?e.excluded:[]).filter(n=>typeof n=="string").slice(0,100)}},validatePick:e=>typeof e=="string"&&e.length>0&&e.length<=64,result(e,t,n){const s=new Set(t.excluded);let o=n.participants.filter(c=>!s.has(c));const i=o.length===0;if(i&&(o=[...n.participants]),!o.length)return{winner:null,eligible:[],exhausted:i};const r=Object.keys(e).sort(),l=H(r.map(c=>[c,e[c]]));return{winner:o.sort()[_e(l)%o.length],eligible:o,exhausted:i}}},ge=[Y,Ge,He,Ve,Ue,De,Me],We=Object.fromEntries(ge.map(e=>[e.id,e])),Je=ge,D=e=>We[e]||null;function Ye(){return{round:0,game:null,config:{},selectFrom:null,names:{},departed:{},commits:{},reveals:{},forced:{},presenceSeq:{},facilitator:{holder:null,term:-1}}}function de(e,t,n,s){const o={...e};return o[t]={...o[t]||{},[n]:s},o}function ue(e,t){return t.round>e.round?!0:t.round===e.round?e.selectFrom==null||t.from<e.selectFrom:!1}function Ke(e,t){if(!t||typeof t!="object")return e;switch(t.type){case"presence":{const n=Number(t.seq)||0;return(e.presenceSeq[t.from]??-1)>=n&&e.names[t.from]?e:{...e,names:{...e.names,[t.from]:String(t.name||"").slice(0,20)||"peer"},departed:Qe(e.departed,t.from),presenceSeq:{...e.presenceSeq,[t.from]:n}}}case"select-game":{if(!ue(e,t))return e;const n=t.config&&typeof t.config=="object"?t.config:{};return{...e,round:t.round,game:t.game,config:n,selectFrom:t.from}}case"back-to-lobby":return ue(e,t)?{...e,round:t.round,game:null,config:{},selectFrom:t.from}:e;case"commit":return{...e,commits:de(e.commits,t.round,t.from,t.hash)};case"reveal":return{...e,reveals:de(e.reveals,t.round,t.from,{pick:t.pick,nonce:t.nonce})};case"force-reveal":return{...e,forced:{...e.forced,[t.round]:!0}};case"facilitator":{const n=e.facilitator;return t.term>n.term||t.term===n.term&&(n.holder==null||t.holder<n.holder)?{...e,facilitator:{holder:t.holder,term:t.term}}:e}case"leave":return{...e,departed:{...e.departed,[t.from]:!0}};default:return e}}function Qe(e,t){if(!(t in e))return e;const n={...e};return delete n[t],n}function he(e){return[...e].sort()[0]??null}function Ze(e,t,n,s={}){const o=[...new Set(n)].filter(k=>!e.departed[k]);o.sort();const i=e.facilitator.holder,l=i&&o.includes(i)?i:he(o),a=e.round,c=e.commits[a]||{},f=s[a]||{},p=o.filter(k=>k in c),L=o.length>0&&p.length===o.length,O=!!e.forced[a],E=O||L,b=e.game?D(e.game):null,I=b?b.normalizeConfig(e.config):{};let F=b?"pick":"lobby",x=null,B=null;if(b&&E){const k={};for(const g of p)g in f&&b.validatePick(f[g],I)&&(k[g]=f[g]);(O?Object.keys(k).length>0:p.every(g=>g in f))&&(F="reveal",B=k,x=b.result(k,I,{round:a,participants:o}))}return{round:a,game:e.game,config:I,phase:F,participants:o,names:e.names,facilitator:l,isFacilitator:t===l,committedIds:p,lockedCount:p.length,remaining:o.length-p.length,iAmCommitted:p.includes(t),revealPicks:B,result:x}}function Xe(e,{onDeliver:t}){const n=new Set,s=[];function o(i,r){!i||typeof i.id!="string"||n.has(i.id)||(n.add(i.id),s.push(i),t(i),r&&e.publish(i))}return e.onEvent((i,r)=>{if(i&&Array.isArray(i.__snapshot)){for(const l of i.__snapshot)o(l,!1);return}o(i,!0)}),e.onPeerJoin(i=>{e.publishTo(i,{__snapshot:s})}),{publish(i){o(i,!0)},log:s,seenIds:n}}async function X(e){const t=new TextEncoder().encode(e),n=await crypto.subtle.digest("SHA-256",t);return[...new Uint8Array(n)].map(s=>s.toString(16).padStart(2,"0")).join("")}const ye=(e,t)=>`${H(e)}|${t}`;function et(e,t,n=X){return n(ye(e,t))}async function tt(e,t,n,s=X){return typeof t!="string"||!t?!1:await s(ye(e,t))===n}const nt=15e3;function st(){const e=new Uint8Array(16);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function ot({transport:e,name:t,hasher:n=X,now:s=()=>Date.now(),randomNonce:o=st,livenessMs:i=nt,autoVerify:r=!1,isCreator:l=!1}){const a=e.localPeerId;let c=Ye();const f={},p=new Map,L=[],O=new Set;let E=null,b=0;const I=new Set,F=Xe(e,{onDeliver:g});e.onPeerLeave(d=>{g({type:"leave",from:d})}),p.set(a,s());function x(){const d=s(),y=new Set([a]);for(const[C,N]of p)C!==a&&d-N<=i&&!c.departed[C]&&y.add(C);return[...y]}function B(){return x().filter(d=>!c.departed[d])}function k(){const d=G();for(const y of I)y(d)}function P(d){F.publish(d)}function g(d){c=Ke(c,d),d.from&&p.set(d.from,s()),d.type==="reveal"&&d.from!==a&&L.push({round:d.round,from:d.from,pick:d.pick,nonce:d.nonce}),A(),te(),k(),r&&L.length&&queueMicrotask(T)}function A(){if(!c.game||!E||E.round!==c.round||O.has(c.round))return;const d=B(),y=c.commits[c.round]||{},C=d.length>0&&d.every(N=>N in y);(c.forced[c.round]||C)&&(O.add(c.round),P({id:`reveal:${a}:${c.round}`,type:"reveal",from:a,round:c.round,pick:E.pick,nonce:E.nonce}))}let v=!1;function T(){v||(v=!0,Promise.resolve(U()).finally(()=>{v=!1}))}async function U(){var C,N;let d=!1;const y=[];for(const $ of L){const se=(C=c.commits[$.round])==null?void 0:C[$.from];if(!se){y.push($);continue}if(await tt($.pick,$.nonce,se,n)){f[N=$.round]??(f[N]={});const oe=f[$.round][$.from];(oe===void 0||H(oe)!==H($.pick))&&(f[$.round][$.from]=$.pick,d=!0)}}return L.length=0,L.push(...y),d&&k(),d}function G(){return Ze(c,a,x(),f)}function W(d,y){P({id:`fac:${y}:${d}`,type:"facilitator",from:a,holder:d,term:y})}function te(){const d=c.facilitator.holder;if(d==null)return;const y=B();!y.length||y.includes(d)||he(y)===a&&d!==a&&W(a,c.facilitator.term+1)}function xe(d){!G().isFacilitator||d===a||!c.names[d]||c.departed[d]||W(d,c.facilitator.term+1)}function Le(){ne(),l&&W(a,0)}function ne(){p.set(a,s()),P({id:`presence:${a}:${b}`,type:"presence",from:a,name:t,seq:b}),b+=1}function Pe(){A(),te(),r&&L.length&&T(),k()}async function Ae(d){var $;if(!c.game||O.has(c.round))return;const y=c.commits[c.round]||{};if(a in y)return;const C=o(),N=await et(d,C,n);E={round:c.round,pick:d,nonce:C},f[$=c.round]??(f[$]={}),f[c.round][a]=d,P({id:`commit:${a}:${c.round}`,type:"commit",from:a,round:c.round,hash:N})}function Te(d,y={}){if(!G().isFacilitator)return;const C=c.round+1;E=null,P({id:`select:${C}:${a}`,type:"select-game",from:a,round:C,game:d,config:y})}function Re(){if(!G().isFacilitator)return;const d=c.round+1;E=null,P({id:`lobby:${d}:${a}`,type:"back-to-lobby",from:a,round:d})}function je(){G().isFacilitator&&P({id:`force:${c.round}:${a}`,type:"force-reveal",from:a,round:c.round})}function Ie(){P({id:`leave:${a}`,type:"leave",from:a})}function Oe(d){return I.add(d),()=>I.delete(d)}return{self:a,join:Le,heartbeat:ne,tick:Pe,lock:Ae,selectGame:Te,backToLobby:Re,forceReveal:je,leave:Ie,handOff:xe,processVerifications:U,getView:G,onChange:Oe,_debug:()=>({state:c,verified:f})}}const u=e=>document.getElementById(e),m=e=>String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function q(e,t){return e?`<div class="lock-note"><strong>Locked in.</strong> Waiting on ${t} player${t===1?"":"s"}…</div>`:'<div class="lock-note">Your pick locks in immediately — choose with intent.</div>'}function M(e,t){return e.isFacilitator?`
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${m(t)}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`:`<div class="lock-note">Waiting on ${m(e.names[e.facilitator]||"the facilitator")} for the next round…</div>`}function S(e,t){return`<div class="stage-kicker">Round ${e.round} — ${m(t)}</div>`}const it={renderPick(e,t){const n=e.iAmCommitted;return`
      ${S(e,"Rock Paper Scissors")}
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(V).map(([s,o])=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="glyph">${o.glyph}</span>
            <span class="lbl">${s}</span>
          </button>`).join("")}
      </div>
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),s=e.result,o=new Set(s.winners);let i;if(s.outcome==="draw")i=n.length===2?"A <em>draw.</em> Run it back.":"Everyone threw the same. A <em>draw.</em>";else if(s.outcome==="stalemate")i="All three throws on the table — <em>stalemate.</em>";else if(s.outcome==="incomplete")i="Not enough throws to call it.";else if(n.length===2){const r=s.winners[0],l=n.find(a=>a!==r);i=`<em>${m(e.names[r]||"Someone")}</em> takes it — ${m(t[r])} beats ${m(t[l])}.`}else{const r=s.winningThrow;i=`<em>${m(r[0].toUpperCase()+r.slice(1))}</em> wins the round.`}return`
      ${S(e,"the reveal")}
      <div class="verdict">${i}</div>
      <div class="results">
        ${n.map((r,l)=>{var a;return`
          <div class="result-row ${o.has(r)?"winner":""}" style="animation-delay:${l*90}ms">
            <span class="r-glyph">${((a=V[t[r]])==null?void 0:a.glyph)||"?"}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${m(t[r])}${o.has(r)?" · win":""}</span>
          </div>`}).join("")}
      </div>
      ${M(e,"Throw again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=o.dataset.pick,t.lock(n.choice),s()}))}},rt={renderPick(e,t){const n=e.iAmCommitted;return`
      ${S(e,"Fist to Five")}
      <div class="stage-title">How do you <em>really</em> feel?</div>
      <div class="choices">
        ${[0,1,2,3,4,5].map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="num">${s}</span>
            <span class="lbl">${s===0?"fist":s===5?"all in":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),s=e.result;let o;s.hardNo?o="A fist on the table — <em>someone is blocking.</em> Talk it out.":s.consensus&&s.avg>=4?o='<span class="consensus">Strong consensus.</span> Ship it.':s.consensus?o='<span class="consensus">Aligned</span> — the room agrees.':o=`The room is <em>split.</em> Hear from the ${s.min}s and the ${s.max}s.`;const i=[...n].sort((r,l)=>Number(t[r])-Number(t[l]));return`
      ${S(e,"the reveal")}
      <div class="verdict">${o}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${s.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${s.spread}</div><div class="s-lbl">spread</div></div>
      </div>
      <div class="results">
        ${i.map((r,l)=>`
          <div class="result-row" style="animation-delay:${l*90}ms">
            <span class="r-num">${m(t[r])}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${Number(t[r])===0?"block":Number(t[r])>=4?"support":"reserved"}</span>
          </div>`).join("")}
      </div>
      ${M(e,"Vote again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=Number(o.dataset.pick),t.lock(n.choice),s()}))}},fe={"?":"?",coffee:"☕"},at={renderPick(e,t){const n=e.iAmCommitted,s=[...Y.scale,...Y.special];return`
      ${S(e,"Story Pointing")}
      <div class="stage-title">Size it <em>blind</em></div>
      <div class="choices">
        ${s.map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${m(String(o))}" ${n?"disabled":""}>
            <span class="num">${fe[o]??o}</span>
            <span class="lbl">${o==="?"?"unsure":o==="coffee"?"break":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,s=Object.keys(t).sort((r,l)=>{const a=typeof t[r]=="number"?t[r]:1/0,c=typeof t[l]=="number"?t[l]:1/0;return a-c}),o=new Set(n.outliers);let i;return n.numericCount===0?i="No estimates on the table — <em>coffee first?</em>":n.consensus?i=`<span class="consensus">Converged.</span> Call it a ${Math.round(n.avg)}.`:i=`The room is <em>split</em> — hear from the ${n.min}s and the ${n.max}s.`,`
      ${S(e,"the reveal")}
      <div class="verdict">${i}</div>
      ${n.numericCount?`
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${n.min}–${n.max}</div><div class="s-lbl">range</div></div>
      </div>`:""}
      <div class="results">
        ${s.map((r,l)=>`
          <div class="result-row ${o.has(r)?"winner":""}" style="animation-delay:${l*90}ms">
            <span class="r-num">${fe[t[r]]??m(t[r])}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${o.has(r)?"outlier · speak up":n.abstained.includes(r)?"abstained":""}</span>
          </div>`).join("")}
      </div>
      ${M(e,"Point again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{const i=o.dataset.pick,r=i==="?"||i==="coffee"?i:Number(i);n.choice=r,t.lock(r),s()}))}},me={yes:"👍",no:"👎",abstain:"🤷"},ct={configForm(e){return`
      <div class="field">
        <label for="cfgQuestion">The question</label>
        <input type="text" id="cfgQuestion" maxlength="200" placeholder="e.g. Ship it on Friday?" value="${m(e.question||"")}" autocomplete="off">
      </div>`},readConfig(){var e;return{question:((e=document.getElementById("cfgQuestion"))==null?void 0:e.value)||""}},configValid:e=>e.question.trim().length>0,renderPick(e,t){const n=e.iAmCommitted;return`
      ${S(e,"Motion Vote")}
      <div class="stage-title">${m(e.config.question||"The motion")}</div>
      <div class="choices">
        ${["yes","no","abstain"].map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="glyph">${me[s]}</span>
            <span class="lbl">${s}</span>
          </button>`).join("")}
      </div>
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,s=Object.keys(t).sort();let o;return n.tied?o="Dead <em>even.</em> Keep talking.":n.passed?o=`<span class="consensus">Carried${n.unanimous?", unanimously":""}.</span> ${n.yes}–${n.no}.`:o=`<em>Does not carry.</em> ${n.yes}–${n.no}.`,`
      ${S(e,"the reveal")}
      <p class="stage-sub">${m(e.config.question||"")}</p>
      <div class="verdict">${o}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.yes}</div><div class="s-lbl">yes</div></div>
        <div class="stat"><div class="s-val">${n.no}</div><div class="s-lbl">no</div></div>
        <div class="stat"><div class="s-val">${n.abstain}</div><div class="s-lbl">abstain</div></div>
      </div>
      <div class="results">
        ${s.map((i,r)=>`
          <div class="result-row" style="animation-delay:${r*90}ms">
            <span class="r-glyph">${me[t[i]]}</span>
            <span class="r-name">${m(e.names[i]||"departed player")}</span>
            <span class="r-choice">${m(t[i])}</span>
          </div>`).join("")}
      </div>
      ${M(e,"New motion")}`},againOpensConfig:!0,bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=o.dataset.pick,t.lock(n.choice),s()}))}},lt={configForm(e){return`
      <div class="field">
        <label for="cfgOptions">Options — one per line (2–10)</label>
        <textarea id="cfgOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C">${m(e.optionsText||"")}</textarea>
      </div>`},readConfig(){var t;return{options:(((t=document.getElementById("cfgOptions"))==null?void 0:t.value)||"").split(`
`).map(n=>n.trim()).filter(Boolean)}},configValid:e=>e.options.length>=2,renderPick(e,t){const n=e.iAmCommitted,s=t.rank||[],o=e.config.options,i=s.length===o.length;return`
      ${S(e,"Ranked Choice")}
      <div class="stage-title">Rank them <em>all</em></div>
      <p class="stage-sub">Tap in order of preference — first tap is your top pick.</p>
      <div class="choices">
        ${o.map((r,l)=>{const a=s.indexOf(l);return`
            <button class="choice ${a>=0?"selected":""}" data-rank="${l}" ${n||a>=0?"disabled":""}>
              <span class="num">${a>=0?a+1:"·"}</span>
              <span class="lbl">${m(r)}</span>
            </button>`}).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockRankBtn" ${i?"":"disabled"}>Lock ranking</button>
        <button class="btn-ghost" id="resetRankBtn" ${s.length?"":"disabled"}>Reset</button>
      </div>`}
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.result;let n;return t.winner?n=`<em>${m(t.winner)}</em> takes it.`:t.tie.length?n=`A tie between <em>${t.tie.map(m).join("</em> and <em>")}</em>.`:n="No clear result.",`
      ${S(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.scores.map((s,o)=>`
          <div class="result-row ${s.option===t.winner?"winner":""}" style="animation-delay:${o*90}ms">
            <span class="r-num">${o+1}</span>
            <span class="r-name">${m(s.option)}</span>
            <span class="r-choice">${s.points} pts · ${s.firsts} first${s.firsts===1?"":"s"}</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">Borda count across ${t.voterCount} ballot${t.voterCount===1?"":"s"}.</div>
      ${M(e,"Vote again")}`},bind(e,t,n,s){document.querySelectorAll("[data-rank]").forEach(r=>r.addEventListener("click",()=>{n.rank=[...n.rank||[],Number(r.dataset.rank)],s()}));const o=document.getElementById("resetRankBtn");o&&o.addEventListener("click",()=>{n.rank=[],s()});const i=document.getElementById("lockRankBtn");i&&i.addEventListener("click",()=>{(n.rank||[]).length===e.config.options.length&&(t.lock(n.rank),s())})}},pe={r:"🔴",y:"🟡",g:"🟢"},dt={renderPick(e,t){const n=e.iAmCommitted,s=t.ratings||{},o=e.config.categories,i=o.every((r,l)=>s[l]);return`
      ${S(e,"Health Check")}
      <div class="stage-title">How's the <em>team?</em></div>
      <div class="health-rate">
        ${o.map((r,l)=>`
          <div class="health-row">
            <span class="hc-name">${m(r)}</span>
            <span class="hc-lights">
              ${["r","y","g"].map(a=>`
                <button class="hc-light ${s[l]===a?"selected":""}" data-cat="${l}" data-light="${a}" ${n?"disabled":""}>${pe[a]}</button>`).join("")}
            </span>
          </div>`).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockHealthBtn" ${i?"":"disabled"}>Lock ratings</button>
      </div>`}
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.overall==="g"?'<span class="consensus">Healthy.</span> Keep going.':t.overall==="y"?"Some <em>yellow flags</em> — worth a conversation.":"<em>Red flags on the table.</em> Make time for this.";return`
      ${S(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.categories.map((s,o)=>`
          <div class="result-row" style="animation-delay:${o*90}ms">
            <span class="r-glyph">${pe[s.light]}</span>
            <span class="r-name">${m(s.name)}</span>
            <span class="r-choice">${s.g}🟢 ${s.y}🟡 ${s.r}🔴</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">${t.raterCount} rating${t.raterCount===1?"":"s"} · lights are the majority, ties darken.</div>
      ${M(e,"Check again")}`},bind(e,t,n,s){document.querySelectorAll("[data-cat]").forEach(i=>i.addEventListener("click",()=>{n.ratings={...n.ratings||{},[i.dataset.cat]:i.dataset.light},s()}));const o=document.getElementById("lockHealthBtn");o&&o.addEventListener("click",()=>{const i=e.config.categories,r=n.ratings||{};i.every((l,a)=>r[a])&&(t.lock(Object.fromEntries(i.map((l,a)=>[a,r[a]]))),s())})}};function ut(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}const ft={renderPick(e,t){const n=e.iAmCommitted,s=(e.config.excluded||[]).filter(o=>e.names[o]).map(o=>e.names[o]);return`
      ${S(e,"Turn Picker")}
      <div class="stage-title">Who goes <em>next?</em></div>
      <p class="stage-sub">Everyone contributes randomness — nobody can rig the draw. ${s.length?`Already picked: ${s.map(m).join(", ")}.`:""}</p>
      <div class="stage-actions">
        <button class="btn-primary" id="drawBtn" ${n?"disabled":""}>${n?"In the hat":"Throw in the hat"}</button>
      </div>
      ${q(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.winner?e.names[t.winner]||"a departed player":"nobody";return`
      ${S(e,"the draw")}
      <div class="verdict"><em>${m(n)}</em> — you're up.</div>
      ${t.exhausted?'<div class="lock-note">Everyone had a turn — the exclusion list reset.</div>':""}
      ${e.isFacilitator?`
        <div class="stage-actions">
          <button class="btn-primary" id="againExcludeBtn">Pick again (skip ${m(n)})</button>
          <button class="btn-ghost" id="lobbyBtn">Change game</button>
        </div>`:M(e,"Pick again")}`},bind(e,t,n,s){const o=document.getElementById("drawBtn");o&&o.addEventListener("click",()=>{t.lock(ut()),s()});const i=document.getElementById("againExcludeBtn");i&&i.addEventListener("click",()=>{const r=e.result,l=r.exhausted?[]:e.config.excluded||[],a=r.winner?[...new Set([...l,r.winner])]:l;t.selectGame("turn",{excluded:a})})}},mt={rps:it,f2f:rt,points:at,motion:ct,ranked:lt,health:dt,turn:ft},ee=e=>mt[e]||null;function pt(e,t){if(!e.isFacilitator)return`
      <div class="stage-kicker">Round table</div>
      <div class="stage-title">Waiting on the <em>facilitator</em></div>
      <p class="waiting-host">${m(e.names[e.facilitator]||"The facilitator")} is choosing a game…</p>`;if(t.configGame){const n=D(t.configGame),s=ee(t.configGame);return`
      <div class="stage-kicker">Set up</div>
      <div class="stage-title">${m(n.label)}</div>
      <p class="stage-sub">${m(n.description)}</p>
      ${s.configForm(t.configDraft||{})}
      <div class="stage-actions">
        <button class="btn-primary" id="startConfiguredBtn">Start round</button>
        <button class="btn-ghost" id="cancelConfigBtn">Back</button>
      </div>
      <div class="transport-error" id="configError"></div>`}return`
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're facilitating. Everyone locks in blind — nothing is shown until all hands are in.</p>
    <div class="game-cards">
      ${Je.map(n=>`
        <button class="game-card" data-game="${m(n.id)}">
          <div class="gc-glyphs">${n.glyphs}</div>
          <div class="gc-name">${m(n.label)}</div>
          <div class="gc-desc">${m(n.description)}</div>
        </button>`).join("")}
    </div>`}function gt(e,t,n,s){document.querySelectorAll("[data-game]").forEach(r=>r.addEventListener("click",()=>{const l=r.dataset.game,a=D(l);a&&(a.needsConfig?(n.configGame=l,n.configDraft={},s()):t.selectGame(l,a.defaultConfig(e)))}));const o=document.getElementById("startConfiguredBtn");o&&o.addEventListener("click",()=>{const r=n.configGame,l=D(r),a=ee(r),c=l.normalizeConfig(a.readConfig());if(!a.configValid(c)){const f=document.getElementById("configError");f&&(f.textContent="That setup isn’t complete yet.");return}n.configGame=null,n.configDraft=null,t.selectGame(r,c)});const i=document.getElementById("cancelConfigBtn");i&&i.addEventListener("click",()=>{n.configGame=null,n.configDraft=null,s()})}const ht="wss://tablestakes-turn.joshuarlowry.workers.dev",yt=()=>new URLSearchParams(location.hash.replace(/^#/,"")),K=()=>`${location.origin}${location.pathname}?room=${encodeURIComponent(j)}#token=${encodeURIComponent(R)}`;let h=null,j=null,R="",be=!1,w={},Q=-1,ve=null,$e=null;const ke=new URLSearchParams(location.search);j=ke.get("room");be=!j;R=yt().get("token")||ke.get("token")||"";R&&(u("inviteTokenInput").value=R);if(j){u("createBtn").textContent="Join room";const e=u("joinNote");e.style.display="inline",e.textContent=`joining ${j}`}u("createBtn").addEventListener("click",Ce);u("nameInput").addEventListener("keydown",e=>{e.key==="Enter"&&Ce()});u("copyBtn").addEventListener("click",async()=>{Se();const e=u("inviteLinkInput").value;try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this link:",e)}const t=u("toast");t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),1800)});u("leaveBtn").addEventListener("click",bt);async function Ce(){const e=u("nameInput").value.trim();if(!e){u("nameInput").focus();return}if(j){if(R=u("inviteTokenInput").value.trim()||R,!R){u("transportError").textContent="This room needs an invitation token.";return}history.replaceState(null,"",K())}else{const n=Be();j=n.roomId,R=n.inviteToken,u("inviteTokenInput").value=R,history.replaceState(null,"",K())}const t=we({wsUrl:ht,roomId:j,inviteToken:R,name:e,onHealth:$t,onError:vt});h=ot({transport:t,name:e,autoVerify:!0,isCreator:be}),h.onChange(Z),h.join(),ve=setInterval(()=>h.heartbeat(),5e3),$e=setInterval(()=>h.tick(),2e3),u("entry").classList.add("hidden"),u("room").classList.add("visible"),u("roomCodeText").textContent=j,Se(),Z(h.getView())}function Se(){!j||!R||(u("inviteLinkInput").value=K())}function bt(){h==null||h.leave(),h=null,clearInterval(ve),clearInterval($e),j=null,R="",w={},Q=-1,history.replaceState(null,"",location.pathname),u("room").classList.remove("visible"),u("entry").classList.remove("hidden"),u("createBtn").textContent="Start a room",u("joinNote").style.display="none",u("joinNote").textContent="",u("roomCodeText").textContent="",u("inviteLinkInput").value="",u("inviteTokenInput").value="",u("transportError").textContent="",u("healthErrors").textContent="",u("localPeerId").textContent="pending",u("transportStatus").textContent="idle",u("peerCount").textContent="0",u("reconnectAttempts").textContent="0",u("players").innerHTML="",u("stage").innerHTML="",Ee(!1,0)}function vt(e){u("healthErrors").textContent=e.message||String(e)}function $t(e){u("localPeerId").textContent=e.localPeerId||"pending",u("transportStatus").textContent=e.status,u("peerCount").textContent=String(e.peerCount),u("reconnectAttempts").textContent=String(e.reconnectAttempts)}function Ee(e,t){u("conn").classList.toggle("live",e),u("connText").textContent=e?`${t} connected`:h?"waiting for peers":"offline"}function Z(e){e.round!==Q&&(w={},Q=e.round),Ct(e);const t=u("stage"),n=e.game?ee(e.game):null;e.phase==="lobby"||!n?t.innerHTML=pt(e,w):e.phase==="pick"?t.innerHTML=n.renderPick(e,w)+kt(e):t.innerHTML=n.renderReveal(e),St(e,n),Ee(e.participants.length>1,e.participants.length)}function kt(e){return e.isFacilitator&&e.iAmCommitted&&e.remaining>0?'<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>':""}function Ct(e){u("players").innerHTML=e.participants.map(t=>`
    <div class="player ${e.committedIds.includes(t)?"locked":""} ${t===h.self?"me":""}">
      <span class="pip"></span>
      <span>${m(e.names[t]||"…")}</span>
      ${t===e.facilitator?'<span class="tag">FACILITATOR</span>':""}
      ${e.isFacilitator&&t!==h.self&&t!==e.facilitator?`<button class="mini-action" data-facilitator="${m(t)}">Make facilitator</button>`:""}
    </div>`).join("")}function _(){Z(h.getView())}function St(e,t){if(e.phase==="lobby"||!t)gt(e,h,w,_);else if(e.phase==="pick"){t.bind(e,h,w,_);const n=u("forceBtn");n&&n.addEventListener("click",()=>h.forceReveal())}else{t.bind(e,h,w,_);const n=u("againBtn");n&&n.addEventListener("click",()=>{t.againOpensConfig?(h.backToLobby(),w.configGame=e.game,w.configDraft={},_()):h.selectGame(e.game,e.config)});const s=u("lobbyBtn");s&&s.addEventListener("click",()=>h.backToLobby())}document.querySelectorAll("[data-facilitator]").forEach(n=>n.addEventListener("click",()=>h.handOff(n.dataset.facilitator)))}
