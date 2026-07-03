(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();function Y(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function we(){return{roomId:Y(),inviteToken:Y()}}function Fe({wsUrl:e,roomId:t,inviteToken:n,name:s,onHealth:o,onError:i}){if(!t)throw new Error("A room ID is required.");if(!n)throw new Error("An invitation token is required.");const r=Y(),l=[],a=[],c=[],f=[];let p=null,L=!1,I=!1,S=0,b=0,j=0,O=null;const A=g=>o==null?void 0:o({localPeerId:r,status:g,peerCount:b,reconnectAttempts:j,peers:[]});function B(g){const P=JSON.stringify(g);L&&(p==null?void 0:p.readyState)===WebSocket.OPEN?p.send(P):f.push(P)}function E(){for(;f.length&&(p==null?void 0:p.readyState)===WebSocket.OPEN;)p.send(f.shift())}function N(){const g=`${e.replace(/\/$/,"")}/room/${encodeURIComponent(t)}`;p=new WebSocket(g),p.onopen=()=>{L=!0,S=0,B({t:"hello",id:r,token:n,name:s}),E(),A("connected")},p.onmessage=P=>{let $;try{$=JSON.parse(P.data)}catch{return}$.t==="welcome"?(b=$.peers.length,A("connected"),$.peers.forEach(x=>a.forEach(U=>U(x)))):$.t==="peer-join"?(b+=1,A("connected"),a.forEach(x=>x($.id))):$.t==="peer-leave"?(b=Math.max(0,b-1),A("connected"),c.forEach(x=>x($.id))):$.t==="evt"&&l.forEach(x=>x($.payload,$.from))},p.onclose=P=>{if(L=!1,I){A("closed");return}if(P.code===4001||P.code===4002){i==null||i({type:"join-error",message:"Could not join room (bad token)."}),A("degraded");return}j+=1,A("reconnecting");const x=Math.min(1e3*2**S,8e3);S+=1,O=setTimeout(N,x)},p.onerror=()=>{i==null||i({type:"ws-error",message:"Relay connection error."})}}return N(),{localPeerId:r,publish:g=>B({t:"evt",payload:g}),publishTo:(g,P)=>B({t:"evt",target:g,payload:P}),onEvent:g=>{l.push(g)},onPeerJoin:g=>a.push(g),onPeerLeave:g=>c.push(g),getPeerIds:()=>[],leave(){I=!0,O&&clearTimeout(O);try{p==null||p.close(1e3,"leave")}catch{}}}}const V={rock:{glyph:"✊",beats:"scissors"},paper:{glyph:"✋",beats:"rock"},scissors:{glyph:"✌️",beats:"paper"}};function Ne(e){const t=Object.keys(e),n=new Set,s=new Set(t.map(o=>e[o]));if(t.length<2)return{outcome:"incomplete",winners:[],winningThrow:null};if(t.length===2){const[o,i]=t;if(e[o]===e[i])return{outcome:"draw",winners:[],winningThrow:null};const r=V[e[o]].beats===e[i]?o:i;return n.add(r),{outcome:"win",winners:[...n],winningThrow:e[r]}}if(s.size===2){const[o,i]=[...s],r=V[o].beats===i?o:i;return t.forEach(l=>{e[l]===r&&n.add(l)}),{outcome:"win",winners:[...n],winningThrow:r}}return s.size===1?{outcome:"draw",winners:[],winningThrow:null}:{outcome:"stalemate",winners:[],winningThrow:null}}function qe(e){const t=Object.values(e).map(Number);if(!t.length)return{avg:0,spread:0,consensus:!0,hardNo:!1,min:0,max:0};const n=Math.min(...t),s=Math.max(...t),o=t.reduce((r,l)=>r+l,0)/t.length,i=s-n;return{avg:o,spread:i,consensus:i<=1,hardNo:t.some(r=>r===0),min:n,max:s}}const Me=Object.keys(V),Ge={id:"rps",label:"Rock · Paper · Scissors",description:"The classic settler of disputes. Head-to-head or whole-team throwdown.",glyphs:"✊ ✋ ✌️",blind:!0,needsConfig:!1,minPlayers:2,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>Me.includes(e),result:e=>Ne(e)},He={id:"f2f",label:"Fist to Five",description:"Gauge the room. Zero is a hard no, five is full-throated support.",glyphs:"☝️ 🖐",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>Number.isInteger(e)&&e>=0&&e<=5,result:e=>qe(e)},z=[0,1,2,3,5,8,13],re=["?","coffee"],K={id:"points",label:"Story Pointing",description:"Estimate together, anchor-free. Fibonacci scale, reveal when all hands are in.",glyphs:"1 3 5 8 13",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>z.includes(e)||re.includes(e),result(e){const t=Object.entries(e),n=t.filter(([,f])=>typeof f=="number"),s=t.filter(([,f])=>!z.includes(f)||typeof f!="number").map(([f])=>f),o=n.map(([,f])=>f);if(!o.length)return{avg:null,min:null,max:null,consensus:!1,outliers:[],abstained:s,numericCount:0};const i=Math.min(...o),r=Math.max(...o),l=o.reduce((f,p)=>f+p,0)/o.length,a=z.indexOf(r)-z.indexOf(i)<=1,c=a?[]:n.filter(([,f])=>f===i||f===r).map(([f])=>f);return{avg:l,min:i,max:r,consensus:a,outliers:c,abstained:s,numericCount:o.length}},scale:z,special:re},ae=["yes","no","abstain"],ze={id:"motion",label:"Motion Vote",description:"Pose a question, vote blind. Yes, no, or abstain — revealed together.",glyphs:"👍 👎",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({question:""}),normalizeConfig(e){return{question:typeof(e==null?void 0:e.question)=="string"?e.question.trim().slice(0,200):""}},validatePick:e=>ae.includes(e),result(e){const t={yes:0,no:0,abstain:0};for(const s of Object.values(e))t[s]+=1;const n=t.yes+t.no;return{...t,passed:t.yes>t.no,tied:t.yes===t.no&&n>0,unanimous:n>0&&(t.yes===0||t.no===0)}},options:ae};function Ve(e,t){return!Array.isArray(e)||e.length!==t||new Set(e).size!==t?!1:e.every(s=>Number.isInteger(s)&&s>=0&&s<t)}const Ue={id:"ranked",label:"Ranked Choice",description:"Everyone privately ranks the options. Borda-count scores, revealed together.",glyphs:"🥇 🥈 🥉",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({options:[]}),normalizeConfig(e){const t=Array.isArray(e==null?void 0:e.options)?e.options:[];return{options:[...new Set(t.filter(s=>typeof s=="string").map(s=>s.trim().slice(0,100)).filter(Boolean))].slice(0,10)}},validatePick:(e,t)=>Ve(e,t.options.length)&&t.options.length>=2,result(e,t){const n=t.options.length,s=new Array(n).fill(0),o=new Array(n).fill(0);for(const a of Object.values(e))a.forEach((c,f)=>{s[c]+=n-1-f,f===0&&(o[c]+=1)});const i=t.options.map((a,c)=>({option:a,index:c,points:s[c],firsts:o[c]})).sort((a,c)=>c.points-a.points||c.firsts-a.firsts||a.index-c.index),r=i[0],l=i.filter(a=>a.points===r.points&&a.firsts===r.firsts);return{scores:i,winner:l.length===1?r.option:null,tie:l.length>1?l.map(a=>a.option):[],voterCount:Object.keys(e).length}}},ce=["Mission & Purpose","Pace & Sustainability","Process & Tools","Support & Safety","Fun & Energy"],le=["r","y","g"];function de(e){const{r:t,y:n,g:s}=e;return s>n&&s>t?"g":n>s&&n>t?"y":t>n&&t>s||t===n&&t>=s?"r":"y"}const De={id:"health",label:"Health Check",description:"Rate the team red / yellow / green across five dimensions, blind, then compare.",glyphs:"🔴 🟡 🟢",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({categories:ce}),normalizeConfig(e){const n=(Array.isArray(e==null?void 0:e.categories)?e.categories:[]).filter(s=>typeof s=="string").map(s=>s.trim().slice(0,60)).filter(Boolean).slice(0,10);return{categories:n.length>=2?n:ce}},validatePick(e,t){return!e||typeof e!="object"||Array.isArray(e)?!1:t.categories.every((n,s)=>le.includes(e[s]))},result(e,t){const n=t.categories.map((o,i)=>{const r={r:0,y:0,g:0};for(const l of Object.values(e))r[l[i]]+=1;return{name:o,...r,light:de(r)}}),s={r:0,y:0,g:0};for(const o of n)s[o.light]+=1;return{categories:n,overall:de(s),raterCount:Object.keys(e).length}},lights:le};function q(e){if(e===void 0)throw new Error("cannot canonicalize undefined");if(typeof e=="function"||typeof e=="symbol"||typeof e=="bigint")throw new Error(`cannot canonicalize ${typeof e}`);if(typeof e=="number"&&!Number.isFinite(e))throw new Error("cannot canonicalize non-finite number");return e===null||typeof e!="object"?JSON.stringify(e):Array.isArray(e)?`[${e.map(q).join(",")}]`:`{${Object.keys(e).sort().map(s=>`${JSON.stringify(s)}:${q(e[s])}`).join(",")}}`}function _e(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619)>>>0;return t>>>0}const We={id:"turn",label:"Turn Picker",description:"Fairly picks who goes next. Nobody can rig it — randomness comes from everyone.",glyphs:"🎯",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({excluded:[]}),normalizeConfig(e){return{excluded:(Array.isArray(e==null?void 0:e.excluded)?e.excluded:[]).filter(n=>typeof n=="string").slice(0,100)}},validatePick:e=>typeof e=="string"&&e.length>0&&e.length<=64,result(e,t,n){const s=new Set(t.excluded);let o=n.participants.filter(c=>!s.has(c));const i=o.length===0;if(i&&(o=[...n.participants]),!o.length)return{winner:null,eligible:[],exhausted:i};const r=Object.keys(e).sort(),l=q(r.map(c=>[c,e[c]]));return{winner:o.sort()[_e(l)%o.length],eligible:o,exhausted:i}}},he=[K,He,ze,Ue,De,We,Ge],Je=Object.fromEntries(he.map(e=>[e.id,e])),Ye=he,_=e=>Je[e]||null;function Ke(){return{round:0,game:null,config:{},selectFrom:null,names:{},departed:{},commits:{},reveals:{},forced:{},presenceSeq:{},facilitator:{holder:null,term:-1}}}function ue(e,t,n,s){const o={...e};return o[t]={...o[t]||{},[n]:s},o}function fe(e,t){return t.round>e.round?!0:t.round===e.round?e.selectFrom==null||t.from<e.selectFrom:!1}function Qe(e,t){if(!t||typeof t!="object")return e;switch(t.type){case"presence":{const n=Number(t.seq)||0;return(e.presenceSeq[t.from]??-1)>=n&&e.names[t.from]?e:{...e,names:{...e.names,[t.from]:String(t.name||"").slice(0,20)||"peer"},departed:Ze(e.departed,t.from),presenceSeq:{...e.presenceSeq,[t.from]:n}}}case"select-game":{if(!fe(e,t))return e;const n=t.config&&typeof t.config=="object"?t.config:{};return{...e,round:t.round,game:t.game,config:n,selectFrom:t.from}}case"back-to-lobby":return fe(e,t)?{...e,round:t.round,game:null,config:{},selectFrom:t.from}:e;case"commit":return{...e,commits:ue(e.commits,t.round,t.from,t.hash)};case"reveal":return{...e,reveals:ue(e.reveals,t.round,t.from,{pick:t.pick,nonce:t.nonce})};case"force-reveal":return{...e,forced:{...e.forced,[t.round]:!0}};case"facilitator":{const n=e.facilitator;return t.term>n.term||t.term===n.term&&(n.holder==null||t.holder<n.holder)?{...e,facilitator:{holder:t.holder,term:t.term}}:e}case"leave":return{...e,departed:{...e.departed,[t.from]:!0}};default:return e}}function Ze(e,t){if(!(t in e))return e;const n={...e};return delete n[t],n}function ye(e){return[...e].sort()[0]??null}function Xe(e,t,n,s={}){const o=[...new Set(n)].filter(E=>!e.departed[E]);o.sort();const i=e.facilitator.holder,l=i&&o.includes(i)?i:ye(o),a=e.round,c=e.commits[a]||{},f=s[a]||{},p=o.filter(E=>E in c),L=o.length>0&&p.length===o.length,I=!!e.forced[a],S=I||L,b=e.game?_(e.game):null,j=b?b.normalizeConfig(e.config):{};let O=b?"pick":"lobby",A=null,B=null;if(b&&S){const E={};for(const g of p)g in f&&b.validatePick(f[g],j)&&(E[g]=f[g]);(I?Object.keys(E).length>0:p.every(g=>g in f))&&(O="reveal",B=E,A=b.result(E,j,{round:a,participants:o}))}return{round:a,game:e.game,config:j,phase:O,participants:o,names:e.names,facilitator:l,isFacilitator:t===l,committedIds:p,lockedCount:p.length,remaining:o.length-p.length,iAmCommitted:p.includes(t),revealPicks:B,result:A}}function et(e,{onDeliver:t}){const n=new Set,s=[];function o(i,r){!i||typeof i.id!="string"||n.has(i.id)||(n.add(i.id),s.push(i),t(i),r&&e.publish(i))}return e.onEvent((i,r)=>{if(i&&Array.isArray(i.__snapshot)){for(const l of i.__snapshot)o(l,!1);return}o(i,!0)}),e.onPeerJoin(i=>{e.publishTo(i,{__snapshot:s})}),{publish(i){o(i,!0)},log:s,seenIds:n}}async function ee(e){const t=new TextEncoder().encode(e),n=await crypto.subtle.digest("SHA-256",t);return[...new Uint8Array(n)].map(s=>s.toString(16).padStart(2,"0")).join("")}const be=(e,t)=>`${q(e)}|${t}`;function tt(e,t,n=ee){return n(be(e,t))}async function nt(e,t,n,s=ee){return typeof t!="string"||!t?!1:await s(be(e,t))===n}const st=15e3;function ot(){const e=new Uint8Array(16);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function it({transport:e,name:t,hasher:n=ee,now:s=()=>Date.now(),randomNonce:o=ot,livenessMs:i=st,autoVerify:r=!1,isCreator:l=!1}){const a=e.localPeerId;let c=Ke();const f={},p=new Map,L=[],I=new Set;let S=null,b=0;const j=new Set;let O=null;const A=et(e,{onDeliver:P});e.onPeerLeave(d=>{P({type:"leave",from:d})}),p.set(a,s());function B(){const d=s(),h=new Set([a]);for(const[v,F]of p)v!==a&&d-F<=i&&!c.departed[v]&&h.add(v);return[...h]}function E(){return B().filter(d=>!c.departed[d])}function N(){const d=H();let h;try{h=q(d)}catch{h=null}if(!(h!==null&&h===O)){O=h;for(const v of j)v(d)}}function g(d){A.publish(d)}function P(d){c=Qe(c,d),d.from&&p.set(d.from,s()),d.type==="reveal"&&d.from!==a&&L.push({round:d.round,from:d.from,pick:d.pick,nonce:d.nonce}),$(),ne(),N(),r&&L.length&&queueMicrotask(U)}function $(){if(!c.game||!S||S.round!==c.round||I.has(c.round))return;const d=E(),h=c.commits[c.round]||{},v=d.length>0&&d.every(F=>F in h);(c.forced[c.round]||v)&&(I.add(c.round),g({id:`reveal:${a}:${c.round}`,type:"reveal",from:a,round:c.round,pick:S.pick,nonce:S.nonce}))}let x=!1;function U(){x||(x=!0,Promise.resolve(te()).finally(()=>{x=!1}))}async function te(){var v,F;let d=!1;const h=[];for(const k of L){const oe=(v=c.commits[k.round])==null?void 0:v[k.from];if(!oe){h.push(k);continue}if(await nt(k.pick,k.nonce,oe,n)){f[F=k.round]??(f[F]={});const ie=f[k.round][k.from];(ie===void 0||q(ie)!==q(k.pick))&&(f[k.round][k.from]=k.pick,d=!0)}}return L.length=0,L.push(...h),d&&N(),d}function H(){return Xe(c,a,B(),f)}function J(d,h){g({id:`fac:${h}:${d}`,type:"facilitator",from:a,holder:d,term:h})}function ne(){const d=c.facilitator.holder;if(d==null)return;const h=E();!h.length||h.includes(d)||ye(h)===a&&d!==a&&J(a,c.facilitator.term+1)}function Le(d){!H().isFacilitator||d===a||!c.names[d]||c.departed[d]||J(d,c.facilitator.term+1)}function Ae(){se(),l&&J(a,0)}function se(){p.set(a,s()),g({id:`presence:${a}:${b}`,type:"presence",from:a,name:t,seq:b}),b+=1}function Pe(){$(),ne(),r&&L.length&&U(),N()}async function Te(d){var k;if(!c.game||I.has(c.round))return;const h=c.commits[c.round]||{};if(a in h)return;const v=o(),F=await tt(d,v,n);S={round:c.round,pick:d,nonce:v},f[k=c.round]??(f[k]={}),f[c.round][a]=d,g({id:`commit:${a}:${c.round}`,type:"commit",from:a,round:c.round,hash:F})}function Re(d,h={}){if(!H().isFacilitator)return;const v=c.round+1;S=null,g({id:`select:${v}:${a}`,type:"select-game",from:a,round:v,game:d,config:h})}function je(){if(!H().isFacilitator)return;const d=c.round+1;S=null,g({id:`lobby:${d}:${a}`,type:"back-to-lobby",from:a,round:d})}function Ie(){H().isFacilitator&&g({id:`force:${c.round}:${a}`,type:"force-reveal",from:a,round:c.round})}function Oe(){g({id:`leave:${a}`,type:"leave",from:a})}function Be(d){return j.add(d),()=>j.delete(d)}return{self:a,join:Ae,heartbeat:se,tick:Pe,lock:Te,selectGame:Re,backToLobby:je,forceReveal:Ie,leave:Oe,handOff:Le,processVerifications:te,getView:H,onChange:Be,_debug:()=>({state:c,verified:f})}}const u=e=>document.getElementById(e),m=e=>String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function M(e,t){return e?`<div class="lock-note"><strong>Locked in.</strong> Waiting on ${t} player${t===1?"":"s"}…</div>`:'<div class="lock-note">Your pick locks in immediately — choose with intent.</div>'}function G(e,t){return e.isFacilitator?`
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${m(t)}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`:`<div class="lock-note">Waiting on ${m(e.names[e.facilitator]||"the facilitator")} for the next round…</div>`}function C(e,t){return`<div class="stage-kicker">Round ${e.round} — ${m(t)}</div>`}const rt={renderPick(e,t){const n=e.iAmCommitted;return`
      ${C(e,"Rock Paper Scissors")}
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(V).map(([s,o])=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="glyph">${o.glyph}</span>
            <span class="lbl">${s}</span>
          </button>`).join("")}
      </div>
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),s=e.result,o=new Set(s.winners);let i;if(s.outcome==="draw")i=n.length===2?"A <em>draw.</em> Run it back.":"Everyone threw the same. A <em>draw.</em>";else if(s.outcome==="stalemate")i="All three throws on the table — <em>stalemate.</em>";else if(s.outcome==="incomplete")i="Not enough throws to call it.";else if(n.length===2){const r=s.winners[0],l=n.find(a=>a!==r);i=`<em>${m(e.names[r]||"Someone")}</em> takes it — ${m(t[r])} beats ${m(t[l])}.`}else{const r=s.winningThrow;i=`<em>${m(r[0].toUpperCase()+r.slice(1))}</em> wins the round.`}return`
      ${C(e,"the reveal")}
      <div class="verdict">${i}</div>
      <div class="results">
        ${n.map((r,l)=>{var a;return`
          <div class="result-row ${o.has(r)?"winner":""}" style="animation-delay:${l*90}ms">
            <span class="r-glyph">${((a=V[t[r]])==null?void 0:a.glyph)||"?"}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${m(t[r])}${o.has(r)?" · win":""}</span>
          </div>`}).join("")}
      </div>
      ${G(e,"Throw again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=o.dataset.pick,t.lock(n.choice),s()}))}},at={renderPick(e,t){const n=e.iAmCommitted;return`
      ${C(e,"Fist to Five")}
      <div class="stage-title">How do you <em>really</em> feel?</div>
      <div class="choices">
        ${[0,1,2,3,4,5].map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="num">${s}</span>
            <span class="lbl">${s===0?"fist":s===5?"all in":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),s=e.result;let o;s.hardNo?o="A fist on the table — <em>someone is blocking.</em> Talk it out.":s.consensus&&s.avg>=4?o='<span class="consensus">Strong consensus.</span> Ship it.':s.consensus?o='<span class="consensus">Aligned</span> — the room agrees.':o=`The room is <em>split.</em> Hear from the ${s.min}s and the ${s.max}s.`;const i=[...n].sort((r,l)=>Number(t[r])-Number(t[l]));return`
      ${C(e,"the reveal")}
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
      ${G(e,"Vote again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=Number(o.dataset.pick),t.lock(n.choice),s()}))}},me={"?":"?",coffee:"☕"},ct={renderPick(e,t){const n=e.iAmCommitted,s=[...K.scale,...K.special];return`
      ${C(e,"Story Pointing")}
      <div class="stage-title">Size it <em>blind</em></div>
      <div class="choices">
        ${s.map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${m(String(o))}" ${n?"disabled":""}>
            <span class="num">${me[o]??o}</span>
            <span class="lbl">${o==="?"?"unsure":o==="coffee"?"break":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,s=Object.keys(t).sort((r,l)=>{const a=typeof t[r]=="number"?t[r]:1/0,c=typeof t[l]=="number"?t[l]:1/0;return a-c}),o=new Set(n.outliers);let i;return n.numericCount===0?i="No estimates on the table — <em>coffee first?</em>":n.consensus?i=`<span class="consensus">Converged.</span> Call it a ${Math.round(n.avg)}.`:i=`The room is <em>split</em> — hear from the ${n.min}s and the ${n.max}s.`,`
      ${C(e,"the reveal")}
      <div class="verdict">${i}</div>
      ${n.numericCount?`
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${n.min}–${n.max}</div><div class="s-lbl">range</div></div>
      </div>`:""}
      <div class="results">
        ${s.map((r,l)=>`
          <div class="result-row ${o.has(r)?"winner":""}" style="animation-delay:${l*90}ms">
            <span class="r-num">${me[t[r]]??m(t[r])}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${o.has(r)?"outlier · speak up":n.abstained.includes(r)?"abstained":""}</span>
          </div>`).join("")}
      </div>
      ${G(e,"Point again")}`},bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{const i=o.dataset.pick,r=i==="?"||i==="coffee"?i:Number(i);n.choice=r,t.lock(r),s()}))}},pe={yes:"👍",no:"👎",abstain:"🤷"},lt={configForm(e){return`
      <div class="field">
        <label for="cfgQuestion">The question</label>
        <input type="text" id="cfgQuestion" maxlength="200" placeholder="e.g. Ship it on Friday?" value="${m(e.question||"")}" autocomplete="off">
      </div>`},readConfig(){var e;return{question:((e=document.getElementById("cfgQuestion"))==null?void 0:e.value)||""}},configValid:e=>e.question.trim().length>0,renderPick(e,t){const n=e.iAmCommitted;return`
      ${C(e,"Motion Vote")}
      <div class="stage-title">${m(e.config.question||"The motion")}</div>
      <div class="choices">
        ${["yes","no","abstain"].map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${s}" ${n?"disabled":""}>
            <span class="glyph">${pe[s]}</span>
            <span class="lbl">${s}</span>
          </button>`).join("")}
      </div>
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,s=Object.keys(t).sort();let o;return n.tied?o="Dead <em>even.</em> Keep talking.":n.passed?o=`<span class="consensus">Carried${n.unanimous?", unanimously":""}.</span> ${n.yes}–${n.no}.`:o=`<em>Does not carry.</em> ${n.yes}–${n.no}.`,`
      ${C(e,"the reveal")}
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
            <span class="r-glyph">${pe[t[i]]}</span>
            <span class="r-name">${m(e.names[i]||"departed player")}</span>
            <span class="r-choice">${m(t[i])}</span>
          </div>`).join("")}
      </div>
      ${G(e,"New motion")}`},againOpensConfig:!0,bind(e,t,n,s){document.querySelectorAll("[data-pick]").forEach(o=>o.addEventListener("click",()=>{n.choice=o.dataset.pick,t.lock(n.choice),s()}))}},dt={configForm(e){return`
      <div class="field">
        <label for="cfgOptions">Options — one per line (2–10)</label>
        <textarea id="cfgOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C">${m(e.optionsText||"")}</textarea>
      </div>`},readConfig(){var t;const e=((t=document.getElementById("cfgOptions"))==null?void 0:t.value)||"";return{optionsText:e,options:e.split(`
`).map(n=>n.trim()).filter(Boolean)}},configValid:e=>e.options.length>=2,renderPick(e,t){const n=e.iAmCommitted,s=t.rank||[],o=e.config.options,i=s.length===o.length;return`
      ${C(e,"Ranked Choice")}
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
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.result;let n;return t.winner?n=`<em>${m(t.winner)}</em> takes it.`:t.tie.length?n=`A tie between <em>${t.tie.map(m).join("</em> and <em>")}</em>.`:n="No clear result.",`
      ${C(e,"the reveal")}
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
      ${G(e,"Vote again")}`},bind(e,t,n,s){document.querySelectorAll("[data-rank]").forEach(r=>r.addEventListener("click",()=>{n.rank=[...n.rank||[],Number(r.dataset.rank)],s()}));const o=document.getElementById("resetRankBtn");o&&o.addEventListener("click",()=>{n.rank=[],s()});const i=document.getElementById("lockRankBtn");i&&i.addEventListener("click",()=>{(n.rank||[]).length===e.config.options.length&&(t.lock(n.rank),s())})}},ge={r:"🔴",y:"🟡",g:"🟢"},ut={renderPick(e,t){const n=e.iAmCommitted,s=t.ratings||{},o=e.config.categories,i=o.every((r,l)=>s[l]);return`
      ${C(e,"Health Check")}
      <div class="stage-title">How's the <em>team?</em></div>
      <div class="health-rate">
        ${o.map((r,l)=>`
          <div class="health-row">
            <span class="hc-name">${m(r)}</span>
            <span class="hc-lights">
              ${["r","y","g"].map(a=>`
                <button class="hc-light ${s[l]===a?"selected":""}" data-cat="${l}" data-light="${a}" ${n?"disabled":""}>${ge[a]}</button>`).join("")}
            </span>
          </div>`).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockHealthBtn" ${i?"":"disabled"}>Lock ratings</button>
      </div>`}
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.overall==="g"?'<span class="consensus">Healthy.</span> Keep going.':t.overall==="y"?"Some <em>yellow flags</em> — worth a conversation.":"<em>Red flags on the table.</em> Make time for this.";return`
      ${C(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.categories.map((s,o)=>`
          <div class="result-row" style="animation-delay:${o*90}ms">
            <span class="r-glyph">${ge[s.light]}</span>
            <span class="r-name">${m(s.name)}</span>
            <span class="r-choice">${s.g}🟢 ${s.y}🟡 ${s.r}🔴</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">${t.raterCount} rating${t.raterCount===1?"":"s"} · lights are the majority, ties darken.</div>
      ${G(e,"Check again")}`},bind(e,t,n,s){document.querySelectorAll("[data-cat]").forEach(i=>i.addEventListener("click",()=>{n.ratings={...n.ratings||{},[i.dataset.cat]:i.dataset.light},s()}));const o=document.getElementById("lockHealthBtn");o&&o.addEventListener("click",()=>{const i=e.config.categories,r=n.ratings||{};i.every((l,a)=>r[a])&&(t.lock(Object.fromEntries(i.map((l,a)=>[a,r[a]]))),s())})}};function ft(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}const mt={renderPick(e,t){const n=e.iAmCommitted,s=(e.config.excluded||[]).filter(o=>e.names[o]).map(o=>e.names[o]);return`
      ${C(e,"Turn Picker")}
      <div class="stage-title">Who goes <em>next?</em></div>
      <p class="stage-sub">Everyone contributes randomness — nobody can rig the draw. ${s.length?`Already picked: ${s.map(m).join(", ")}.`:""}</p>
      <div class="stage-actions">
        <button class="btn-primary" id="drawBtn" ${n?"disabled":""}>${n?"In the hat":"Throw in the hat"}</button>
      </div>
      ${M(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.winner?e.names[t.winner]||"a departed player":"nobody";return`
      ${C(e,"the draw")}
      <div class="verdict"><em>${m(n)}</em> — you're up.</div>
      ${t.exhausted?'<div class="lock-note">Everyone had a turn — the exclusion list reset.</div>':""}
      ${e.isFacilitator?`
        <div class="stage-actions">
          <button class="btn-primary" id="againExcludeBtn">Pick again (skip ${m(n)})</button>
          <button class="btn-ghost" id="lobbyBtn">Change game</button>
        </div>`:G(e,"Pick again")}`},bind(e,t,n,s){const o=document.getElementById("drawBtn");o&&o.addEventListener("click",()=>{t.lock(ft()),s()});const i=document.getElementById("againExcludeBtn");i&&i.addEventListener("click",()=>{const r=e.result,l=r.exhausted?[]:e.config.excluded||[],a=r.winner?[...new Set([...l,r.winner])]:l;t.selectGame("turn",{excluded:a})})}},pt={rps:rt,f2f:at,points:ct,motion:lt,ranked:dt,health:ut,turn:mt},W=e=>pt[e]||null;function gt(e,t){if(!e.isFacilitator)return`
      <div class="stage-kicker">Round table</div>
      <div class="stage-title">Waiting on the <em>facilitator</em></div>
      <p class="waiting-host">${m(e.names[e.facilitator]||"The facilitator")} is choosing a game…</p>`;if(t.configGame){const n=_(t.configGame),s=W(t.configGame);return`
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
      ${Ye.map(n=>`
        <button class="game-card" data-game="${m(n.id)}">
          <div class="gc-glyphs">${n.glyphs}</div>
          <div class="gc-name">${m(n.label)}</div>
          <div class="gc-desc">${m(n.description)}</div>
        </button>`).join("")}
    </div>`}function ht(e,t,n,s){if(document.querySelectorAll("[data-game]").forEach(r=>r.addEventListener("click",()=>{const l=r.dataset.game,a=_(l);a&&(a.needsConfig?(n.configGame=l,n.configDraft={},s()):t.selectGame(l,a.defaultConfig(e)))})),n.configGame){const r=W(n.configGame);document.querySelectorAll("#stage input, #stage textarea").forEach(l=>l.addEventListener("input",()=>{n.configDraft=r.readConfig()}))}const o=document.getElementById("startConfiguredBtn");o&&o.addEventListener("click",()=>{const r=n.configGame,l=_(r),a=W(r),c=l.normalizeConfig(a.readConfig());if(!a.configValid(c)){const f=document.getElementById("configError");f&&(f.textContent="That setup isn’t complete yet.");return}n.configGame=null,n.configDraft=null,t.selectGame(r,c)});const i=document.getElementById("cancelConfigBtn");i&&i.addEventListener("click",()=>{n.configGame=null,n.configDraft=null,s()})}const yt="wss://tablestakes-turn.joshuarlowry.workers.dev",bt=()=>new URLSearchParams(location.hash.replace(/^#/,"")),Q=()=>`${location.origin}${location.pathname}?room=${encodeURIComponent(R)}#token=${encodeURIComponent(T)}`;let y=null,R=null,T="",ve=!1,w={},Z=-1,$e=null,ke=null;const Ce=new URLSearchParams(location.search);R=Ce.get("room");ve=!R;T=bt().get("token")||Ce.get("token")||"";T&&(u("inviteTokenInput").value=T);if(R){u("createBtn").textContent="Join room";const e=u("joinNote");e.style.display="inline",e.textContent=`joining ${R}`}u("createBtn").addEventListener("click",Se);u("nameInput").addEventListener("keydown",e=>{e.key==="Enter"&&Se()});u("copyBtn").addEventListener("click",async()=>{Ee();const e=u("inviteLinkInput").value;try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this link:",e)}const t=u("toast");t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),1800)});u("leaveBtn").addEventListener("click",vt);async function Se(){const e=u("nameInput").value.trim();if(!e){u("nameInput").focus();return}if(R){if(T=u("inviteTokenInput").value.trim()||T,!T){u("transportError").textContent="This room needs an invitation token.";return}history.replaceState(null,"",Q())}else{const n=we();R=n.roomId,T=n.inviteToken,u("inviteTokenInput").value=T,history.replaceState(null,"",Q())}const t=Fe({wsUrl:yt,roomId:R,inviteToken:T,name:e,onHealth:kt,onError:$t});y=it({transport:t,name:e,autoVerify:!0,isCreator:ve}),y.onChange(X),y.join(),$e=setInterval(()=>y.heartbeat(),5e3),ke=setInterval(()=>y.tick(),2e3),u("entry").classList.add("hidden"),u("room").classList.add("visible"),u("roomCodeText").textContent=R,Ee(),X(y.getView())}function Ee(){!R||!T||(u("inviteLinkInput").value=Q())}function vt(){y==null||y.leave(),y=null,clearInterval($e),clearInterval(ke),R=null,T="",w={},Z=-1,history.replaceState(null,"",location.pathname),u("room").classList.remove("visible"),u("entry").classList.remove("hidden"),u("createBtn").textContent="Start a room",u("joinNote").style.display="none",u("joinNote").textContent="",u("roomCodeText").textContent="",u("inviteLinkInput").value="",u("inviteTokenInput").value="",u("transportError").textContent="",u("healthErrors").textContent="",u("localPeerId").textContent="pending",u("transportStatus").textContent="idle",u("peerCount").textContent="0",u("reconnectAttempts").textContent="0",u("players").innerHTML="",u("stage").innerHTML="",xe(!1,0)}function $t(e){u("healthErrors").textContent=e.message||String(e)}function kt(e){u("localPeerId").textContent=e.localPeerId||"pending",u("transportStatus").textContent=e.status,u("peerCount").textContent=String(e.peerCount),u("reconnectAttempts").textContent=String(e.reconnectAttempts)}function xe(e,t){u("conn").classList.toggle("live",e),u("connText").textContent=e?`${t} connected`:y?"waiting for peers":"offline"}function X(e){e.round!==Z&&(w={},Z=e.round),St(e);const t=u("stage"),n=e.game?W(e.game):null;e.phase==="lobby"||!n?t.innerHTML=gt(e,w):e.phase==="pick"?t.innerHTML=n.renderPick(e,w)+Ct(e):t.innerHTML=n.renderReveal(e),Et(e,n),xe(e.participants.length>1,e.participants.length)}function Ct(e){return e.isFacilitator&&e.iAmCommitted&&e.remaining>0?'<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>':""}function St(e){u("players").innerHTML=e.participants.map(t=>`
    <div class="player ${e.committedIds.includes(t)?"locked":""} ${t===y.self?"me":""}">
      <span class="pip"></span>
      <span>${m(e.names[t]||"…")}</span>
      ${t===e.facilitator?'<span class="tag">FACILITATOR</span>':""}
      ${e.isFacilitator&&t!==y.self&&t!==e.facilitator?`<button class="mini-action" data-facilitator="${m(t)}">Make facilitator</button>`:""}
    </div>`).join("")}function D(){X(y.getView())}function Et(e,t){if(e.phase==="lobby"||!t)ht(e,y,w,D);else if(e.phase==="pick"){t.bind(e,y,w,D);const n=u("forceBtn");n&&n.addEventListener("click",()=>y.forceReveal())}else{t.bind(e,y,w,D);const n=u("againBtn");n&&n.addEventListener("click",()=>{t.againOpensConfig?(y.backToLobby(),w.configGame=e.game,w.configDraft={},D()):y.selectGame(e.game,e.config)});const s=u("lobbyBtn");s&&s.addEventListener("click",()=>y.backToLobby())}document.querySelectorAll("[data-facilitator]").forEach(n=>n.addEventListener("click",()=>y.handOff(n.dataset.facilitator)))}
