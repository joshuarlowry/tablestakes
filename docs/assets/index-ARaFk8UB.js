(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function n(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(s){if(s.ep)return;s.ep=!0;const r=n(s);fetch(s.href,r)}})();function se(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function ut(){return{roomId:se(),inviteToken:se()}}function mt({wsUrl:e,roomId:t,inviteToken:n,name:o,onHealth:s,onError:r}){if(!t)throw new Error("A room ID is required.");if(!n)throw new Error("An invitation token is required.");const a=se(),u=[],d=[],f=[],c=[];let l=null,b=!1,$=!1,k=0,x=0,L=0,P=null;const R=C=>s==null?void 0:s({localPeerId:a,status:C,peerCount:x,reconnectAttempts:L,peers:[]});function N(C){const A=JSON.stringify(C);b&&(l==null?void 0:l.readyState)===WebSocket.OPEN?l.send(A):c.push(A)}function w(){for(;c.length&&(l==null?void 0:l.readyState)===WebSocket.OPEN;)l.send(c.shift())}function E(){const C=`${e.replace(/\/$/,"")}/room/${encodeURIComponent(t)}`;l=new WebSocket(C),l.onopen=()=>{b=!0,k=0,N({t:"hello",id:a,token:n,name:o}),w(),R("connected")},l.onmessage=A=>{let I;try{I=JSON.parse(A.data)}catch{return}I.t==="welcome"?(x=I.peers.length,R("connected"),I.peers.forEach(F=>d.forEach(te=>te(F)))):I.t==="peer-join"?(x+=1,R("connected"),d.forEach(F=>F(I.id))):I.t==="peer-leave"?(x=Math.max(0,x-1),R("connected"),f.forEach(F=>F(I.id))):I.t==="evt"&&u.forEach(F=>F(I.payload,I.from))},l.onclose=A=>{if(b=!1,$){R("closed");return}if(A.code===4001||A.code===4002){r==null||r({type:"join-error",message:"Could not join room (bad token)."}),R("degraded");return}L+=1,R("reconnecting");const F=Math.min(1e3*2**k,8e3);k+=1,P=setTimeout(E,F)},l.onerror=()=>{r==null||r({type:"ws-error",message:"Relay connection error."})}}return E(),{localPeerId:a,publish:C=>N({t:"evt",payload:C}),publishTo:(C,A)=>N({t:"evt",target:C,payload:A}),onEvent:C=>{u.push(C)},onPeerJoin:C=>d.push(C),onPeerLeave:C=>f.push(C),getPeerIds:()=>[],leave(){$=!0,P&&clearTimeout(P);try{l==null||l.close(1e3,"leave")}catch{}}}}const K={rock:{glyph:"✊",beats:"scissors"},paper:{glyph:"✋",beats:"rock"},scissors:{glyph:"✌️",beats:"paper"}};function ft(e){const t=Object.keys(e),n=new Set,o=new Set(t.map(s=>e[s]));if(t.length<2)return{outcome:"incomplete",winners:[],winningThrow:null};if(t.length===2){const[s,r]=t;if(e[s]===e[r])return{outcome:"draw",winners:[],winningThrow:null};const a=K[e[s]].beats===e[r]?s:r;return n.add(a),{outcome:"win",winners:[...n],winningThrow:e[a]}}if(o.size===2){const[s,r]=[...o],a=K[s].beats===r?s:r;return t.forEach(u=>{e[u]===a&&n.add(u)}),{outcome:"win",winners:[...n],winningThrow:a}}return o.size===1?{outcome:"draw",winners:[],winningThrow:null}:{outcome:"stalemate",winners:[],winningThrow:null}}function pt(e){const t=Object.values(e).map(Number);if(!t.length)return{avg:0,spread:0,consensus:!0,hardNo:!1,min:0,max:0};const n=Math.min(...t),o=Math.max(...t),s=t.reduce((a,u)=>a+u,0)/t.length,r=o-n;return{avg:s,spread:r,consensus:r<=1,hardNo:t.some(a=>a===0),min:n,max:o}}const gt=Object.keys(K),ht={id:"rps",label:"Rock · Paper · Scissors",description:"The classic settler of disputes. Head-to-head or whole-team throwdown.",glyphs:"✊ ✋ ✌️",blind:!0,needsConfig:!1,minPlayers:2,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>gt.includes(e),result:e=>ft(e)},bt={id:"f2f",label:"Fist to Five",description:"Gauge the room. Zero is a hard no, five is full-throated support.",glyphs:"☝️ 🖐",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>Number.isInteger(e)&&e>=0&&e<=5,result:e=>pt(e)},V=[0,1,2,3,5,8,13],ke=["?","coffee"],re={id:"points",label:"Story Pointing",description:"Estimate together, anchor-free. Fibonacci scale, reveal when all hands are in.",glyphs:"1 3 5 8 13",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>V.includes(e)||ke.includes(e),result(e){const t=Object.entries(e),n=t.filter(([,c])=>typeof c=="number"),o=t.filter(([,c])=>!V.includes(c)||typeof c!="number").map(([c])=>c),s=n.map(([,c])=>c);if(!s.length)return{avg:null,min:null,max:null,consensus:!1,outliers:[],abstained:o,numericCount:0};const r=Math.min(...s),a=Math.max(...s),u=s.reduce((c,l)=>c+l,0)/s.length,d=V.indexOf(a)-V.indexOf(r)<=1,f=d?[]:n.filter(([,c])=>c===r||c===a).map(([c])=>c);return{avg:u,min:r,max:a,consensus:d,outliers:f,abstained:o,numericCount:s.length}},scale:V,special:ke},Ce=["yes","no","abstain"],yt={id:"motion",label:"Motion Vote",description:"Pose a question, vote blind. Yes, no, or abstain — revealed together.",glyphs:"👍 👎",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({question:""}),normalizeConfig(e){return{question:typeof(e==null?void 0:e.question)=="string"?e.question.trim().slice(0,200):""}},validatePick:e=>Ce.includes(e),result(e){const t={yes:0,no:0,abstain:0};for(const o of Object.values(e))t[o]+=1;const n=t.yes+t.no;return{...t,passed:t.yes>t.no,tied:t.yes===t.no&&n>0,unanimous:n>0&&(t.yes===0||t.no===0)}},options:Ce};function vt(e,t){return!Array.isArray(e)||e.length!==t||new Set(e).size!==t?!1:e.every(o=>Number.isInteger(o)&&o>=0&&o<t)}const $t={id:"ranked",label:"Ranked Choice",description:"Everyone privately ranks the options. Borda-count scores, revealed together.",glyphs:"🥇 🥈 🥉",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({options:[]}),normalizeConfig(e){const t=Array.isArray(e==null?void 0:e.options)?e.options:[];return{options:[...new Set(t.filter(o=>typeof o=="string").map(o=>o.trim().slice(0,100)).filter(Boolean))].slice(0,10)}},validatePick:(e,t)=>vt(e,t.options.length)&&t.options.length>=2,result(e,t){const n=t.options.length,o=new Array(n).fill(0),s=new Array(n).fill(0);for(const d of Object.values(e))d.forEach((f,c)=>{o[f]+=n-1-c,c===0&&(s[f]+=1)});const r=t.options.map((d,f)=>({option:d,index:f,points:o[f],firsts:s[f]})).sort((d,f)=>f.points-d.points||f.firsts-d.firsts||d.index-f.index),a=r[0],u=r.filter(d=>d.points===a.points&&d.firsts===a.firsts);return{scores:r,winner:u.length===1?a.option:null,tie:u.length>1?u.map(d=>d.option):[],voterCount:Object.keys(e).length}}},xe=["Mission & Purpose","Pace & Sustainability","Process & Tools","Support & Safety","Fun & Energy"],Se=["r","y","g"];function Ee(e){const{r:t,y:n,g:o}=e;return o>n&&o>t?"g":n>o&&n>t?"y":t>n&&t>o||t===n&&t>=o?"r":"y"}const kt={id:"health",label:"Health Check",description:"Rate the team red / yellow / green across five dimensions, blind, then compare.",glyphs:"🔴 🟡 🟢",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({categories:xe}),normalizeConfig(e){const n=(Array.isArray(e==null?void 0:e.categories)?e.categories:[]).filter(o=>typeof o=="string").map(o=>o.trim().slice(0,60)).filter(Boolean).slice(0,10);return{categories:n.length>=2?n:xe}},validatePick(e,t){return!e||typeof e!="object"||Array.isArray(e)?!1:t.categories.every((n,o)=>Se.includes(e[o]))},result(e,t){const n=t.categories.map((s,r)=>{const a={r:0,y:0,g:0};for(const u of Object.values(e))a[u[r]]+=1;return{name:s,...a,light:Ee(a)}}),o={r:0,y:0,g:0};for(const s of n)o[s.light]+=1;return{categories:n,overall:Ee(o),raterCount:Object.keys(e).length}},lights:Se};function _(e){if(e===void 0)throw new Error("cannot canonicalize undefined");if(typeof e=="function"||typeof e=="symbol"||typeof e=="bigint")throw new Error(`cannot canonicalize ${typeof e}`);if(typeof e=="number"&&!Number.isFinite(e))throw new Error("cannot canonicalize non-finite number");return e===null||typeof e!="object"?JSON.stringify(e):Array.isArray(e)?`[${e.map(_).join(",")}]`:`{${Object.keys(e).sort().map(o=>`${JSON.stringify(o)}:${_(e[o])}`).join(",")}}`}function Ct(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619)>>>0;return t>>>0}const xt={id:"turn",label:"Turn Picker",description:"Fairly picks who goes next. Nobody can rig it — randomness comes from everyone.",glyphs:"🎯",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({excluded:[]}),normalizeConfig(e){return{excluded:(Array.isArray(e==null?void 0:e.excluded)?e.excluded:[]).filter(n=>typeof n=="string").slice(0,100)}},validatePick:e=>typeof e=="string"&&e.length>0&&e.length<=64,result(e,t,n){const o=new Set(t.excluded);let s=n.participants.filter(f=>!o.has(f));const r=s.length===0;if(r&&(s=[...n.participants]),!s.length)return{winner:null,eligible:[],exhausted:r};const a=Object.keys(e).sort(),u=_(a.map(f=>[f,e[f]]));return{winner:s.sort()[Ct(u)%s.length],eligible:s,exhausted:r}}},Y={wwda:{label:"Went Well / Didn’t / Actions",columns:[{key:"well",title:"Went Well"},{key:"not",title:"Didn’t Go Well"},{key:"actions",title:"Actions"}]},ssc:{label:"Start / Stop / Continue",columns:[{key:"start",title:"Start"},{key:"stop",title:"Stop"},{key:"continue",title:"Continue"}]}},St={id:"retro",label:"Retrospective",description:"Reflect as a team. Cards in columns, blind or live, everyone can rearrange.",glyphs:"🗂️",mode:"board",needsConfig:!0,minPlayers:1,defaultConfig:()=>({template:"wwda",privacy:"blind"}),normalizeConfig(e){const t=e&&Y[e.template]?e.template:"wwda",n=e&&e.privacy==="live"?"live":"blind";return{template:t,privacy:n}},columnsFor(e){return Y[e.template]?Y[e.template].columns:Y.wwda.columns},validatePick:()=>!1,result:()=>null},Et=[{key:"planned",title:"What we planned"},{key:"happened",title:"What actually happened"},{key:"why",title:"Why — what worked & what didn’t"},{key:"next",title:"What we’ll do next time"},{key:"timeline",title:"Timeline",timeline:!0}];function Le(e){if(typeof e!="string")return null;const t=e.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);if(!t)return null;let n=parseInt(t[1],10);const o=t[2]?parseInt(t[2],10):0,s=t[3];if(o>59)return null;if(s){if(n<1||n>12)return null;s[0]==="p"&&n!==12&&(n+=12),s[0]==="a"&&n===12&&(n=0)}else if(n>23)return null;return n*60+o}function ae(e,t){return e.order<t.order?-1:e.order>t.order?1:e.cardId<t.cardId?-1:e.cardId>t.cardId?1:0}function Lt(e,t){const n=Le(e.time),o=Le(t.time);return n!==null&&o!==null?n!==o?n-o:ae(e,t):n!==null?-1:o!==null?1:ae(e,t)}const At={id:"aar",label:"After-Action Review",description:"Debrief as a team: what was planned, what happened, why, and a shared timeline.",glyphs:"📋",mode:"board",needsConfig:!1,minPlayers:1,defaultConfig:()=>({privacy:"live"}),normalizeConfig(){return{privacy:"live"}},columnsFor(){return Et},cardComparatorFor(e){return e.timeline?Lt:ae},validatePick:()=>!1,result:()=>null},Oe=[re,bt,yt,$t,kt,xt,St,At,ht],It=Object.fromEntries(Oe.map(e=>[e.id,e])),Tt=Oe,Z=e=>It[e]||null;function wt(){return{round:0,game:null,config:{},selectFrom:null,names:{},departed:{},commits:{},reveals:{},forced:{},presenceSeq:{},cards:{},cardsRevealed:{},facilitator:{holder:null,term:-1}}}function Ae(e,t,n,o){const s={...e};return s[t]={...s[t]||{},[n]:o},s}function Ie(e,t){return t.round>e.round?!0:t.round===e.round?e.selectFrom==null||t.from<e.selectFrom:!1}function Bt(e,t){if(!t||typeof t!="object")return e;switch(t.type){case"presence":{const n=Number(t.seq)||0;return(e.presenceSeq[t.from]??-1)>=n&&e.names[t.from]?e:{...e,names:{...e.names,[t.from]:String(t.name||"").slice(0,20)||"peer"},departed:Pt(e.departed,t.from),presenceSeq:{...e.presenceSeq,[t.from]:n}}}case"select-game":{if(!Ie(e,t))return e;const n=t.config&&typeof t.config=="object"?t.config:{};return{...e,round:t.round,game:t.game,config:n,selectFrom:t.from}}case"back-to-lobby":return Ie(e,t)?{...e,round:t.round,game:null,config:{},selectFrom:t.from}:e;case"commit":return{...e,commits:Ae(e.commits,t.round,t.from,t.hash)};case"reveal":return{...e,reveals:Ae(e.reveals,t.round,t.from,{pick:t.pick,nonce:t.nonce})};case"force-reveal":return{...e,forced:{...e.forced,[t.round]:!0}};case"facilitator":{const n=e.facilitator;return t.term>n.term||t.term===n.term&&(n.holder==null||t.holder<n.holder)?{...e,facilitator:{holder:t.holder,term:t.term}}:e}case"card":{const n=e.cards[t.round]||{},o=n[t.cardId];if(!(!o||t.ver>o.ver||t.ver===o.ver&&t.from<o.from))return e;const r=t.card&&typeof t.card=="object"?t.card:{};return{...e,cards:{...e.cards,[t.round]:{...n,[t.cardId]:{...r,ver:t.ver,from:t.from}}}}}case"reveal-cards":return{...e,cardsRevealed:{...e.cardsRevealed,[t.round]:!0}};case"leave":return{...e,departed:{...e.departed,[t.from]:!0}};default:return e}}function Pt(e,t){if(!(t in e))return e;const n={...e};return delete n[t],n}function Fe(e,t){return e.order<t.order?-1:e.order>t.order?1:e.cardId<t.cardId?-1:e.cardId>t.cardId?1:0}function Rt(e,t,n,o){const s=e.cards[o]||{};return{columns:t.columnsFor(n).map(a=>{const u=t.cardComparatorFor?t.cardComparatorFor(a,n):Fe;return{...a,cards:Object.entries(s).filter(([,d])=>d.col===a.key&&!d.deleted).map(([d,f])=>({cardId:d,...f})).sort(u)}}),cardsRevealed:!!e.cardsRevealed[o],privacy:n.privacy}}function qe(e){return[...e].sort()[0]??null}function jt(e,t,n,o={}){const s=[...new Set(n)].filter(w=>!e.departed[w]);s.sort();const r=e.facilitator.holder,u=r&&s.includes(r)?r:qe(s),d=e.round,f=e.commits[d]||{},c=o[d]||{},l=s.filter(w=>w in f),b=s.length>0&&l.length===s.length,$=!!e.forced[d],k=$||b,x=e.game?Z(e.game):null,L=x?x.normalizeConfig(e.config):{};if(x&&x.mode==="board")return{round:d,game:e.game,config:L,phase:"board",participants:s,names:e.names,facilitator:u,isFacilitator:t===u,committedIds:[],lockedCount:0,remaining:s.length,iAmCommitted:!1,revealPicks:null,result:null,board:Rt(e,x,L,d)};let P=x?"pick":"lobby",R=null,N=null;if(x&&k){const w={};for(const C of l)C in c&&x.validatePick(c[C],L)&&(w[C]=c[C]);($?Object.keys(w).length>0:l.every(C=>C in c))&&(P="reveal",N=w,R=x.result(w,L,{round:d,participants:s}))}return{round:d,game:e.game,config:L,phase:P,participants:s,names:e.names,facilitator:u,isFacilitator:t===u,committedIds:l,lockedCount:l.length,remaining:s.length-l.length,iAmCommitted:l.includes(t),revealPicks:N,result:R}}function Ot(e,{onDeliver:t}){const n=new Set,o=[];function s(r,a){!r||typeof r.id!="string"||n.has(r.id)||(n.add(r.id),o.push(r),t(r),a&&e.publish(r))}return e.onEvent((r,a)=>{if(r&&Array.isArray(r.__snapshot)){for(const u of r.__snapshot)s(u,!1);return}s(r,!0)}),e.onPeerJoin(r=>{e.publishTo(r,{__snapshot:o})}),{publish(r){s(r,!0)},log:o,seenIds:n}}async function de(e){const t=new TextEncoder().encode(e),n=await crypto.subtle.digest("SHA-256",t);return[...new Uint8Array(n)].map(o=>o.toString(16).padStart(2,"0")).join("")}const Me=(e,t)=>`${_(e)}|${t}`;function Ft(e,t,n=de){return n(Me(e,t))}async function qt(e,t,n,o=de){return typeof t!="string"||!t?!1:await o(Me(e,t))===n}const Q=36,Mt=Q-1;function Te(e,t){return t<e.length?parseInt(e[t],Q):0}function H(e="",t=""){let n="",o=0;for(;o<200;){const s=Te(e,o),r=o<t.length?Te(t,o):Mt+1;if(r-s>1){const a=s+Math.floor((r-s)/2);return n+a.toString(Q)}n+=s.toString(Q),o+=1}return n+"1"}function Nt(e=""){let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)&65535;return(t%1296).toString(Q).padStart(2,"0")}function Gt(e="",t=""){return H(e,"")+Nt(t)}const Dt=15e3;function _t(){const e=new Uint8Array(16);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function Ht({transport:e,name:t,hasher:n=de,now:o=()=>Date.now(),randomNonce:s=_t,livenessMs:r=Dt,autoVerify:a=!1,isCreator:u=!1,roomId:d="default",storage:f=typeof localStorage<"u"?localStorage:null}){const c=e.localPeerId;let l=wt();const b={},$=new Map,k=[],x=new Set;let L=null,P=0,R=0;const N=new Set;let w=null;const E=new Map,C=`tablestakes:drafts:${d}`;function A(){if(f)try{f.setItem(C,JSON.stringify([...E]))}catch{}}function I(){if(f)try{const i=f.getItem(C);if(i)for(const[p,h]of JSON.parse(i))E.set(p,h)}catch{}}function F(){E.clear();try{f==null||f.removeItem(C)}catch{}}I();const te=Ot(e,{onDeliver:fe});e.onPeerLeave(i=>{fe({type:"leave",from:i})}),$.set(c,o());function ue(){const i=o(),p=new Set([c]);for(const[h,v]of $)h!==c&&i-v<=r&&!l.departed[h]&&p.add(h);return[...p]}function me(){return ue().filter(i=>!l.departed[i])}function G(){const i=D();let p;try{p=_(i)}catch{p=null}if(!(p!==null&&p===w)){w=p;for(const h of N)h(i)}}function q(i){te.publish(i)}function fe(i){if(l=Bt(l,i),i.from&&$.set(i.from,o()),i.type==="reveal"&&i.from!==c&&k.push({round:i.round,from:i.from,pick:i.pick,nonce:i.nonce}),i.type==="reveal-cards"&&i.round===l.round){for(const[p,h]of E)q({id:`card:${p}:1`,type:"card",from:c,round:i.round,cardId:p,ver:1,card:h});F()}pe(),be(),G(),a&&k.length&&queueMicrotask(ge)}function pe(){if(!l.game||!L||L.round!==l.round||x.has(l.round))return;const i=me(),p=l.commits[l.round]||{},h=i.length>0&&i.every(v=>v in p);(l.forced[l.round]||h)&&(x.add(l.round),q({id:`reveal:${c}:${l.round}`,type:"reveal",from:c,round:l.round,pick:L.pick,nonce:L.nonce}))}let ne=!1;function ge(){ne||(ne=!0,Promise.resolve(he()).finally(()=>{ne=!1}))}async function he(){var h,v;let i=!1;const p=[];for(const y of k){const B=(h=l.commits[y.round])==null?void 0:h[y.from];if(!B){p.push(y);continue}if(await qt(y.pick,y.nonce,B,n)){b[v=y.round]??(b[v]={});const X=b[y.round][y.from];(X===void 0||_(X)!==_(y.pick))&&(b[y.round][y.from]=y.pick,i=!0)}}return k.length=0,k.push(...p),i&&G(),i}function D(){const i=jt(l,c,ue(),b);if(i.board){const p=new Map;if(!i.board.cardsRevealed)for(const[h,v]of E){const y=p.get(v.col)||[];y.push({cardId:h,from:c,ver:0,pending:!0,...v}),p.set(v.col,y)}i.board={...i.board,columns:i.board.columns.map(h=>{const v=p.get(h.key),y=v?[...h.cards,...v].sort(Fe):h.cards;return{...h,cards:y.map(B=>({...B,mine:B.author===c}))}})}}return i}function oe(i,p){q({id:`fac:${p}:${i}`,type:"facilitator",from:c,holder:i,term:p})}function be(){const i=l.facilitator.holder;if(i==null)return;const p=me();!p.length||p.includes(i)||qe(p)===c&&i!==c&&oe(c,l.facilitator.term+1)}function Je(i){!D().isFacilitator||i===c||!l.names[i]||l.departed[i]||oe(i,l.facilitator.term+1)}function Ye(){ye(),u&&oe(c,0)}function ye(){$.set(c,o()),q({id:`presence:${c}:${P}`,type:"presence",from:c,name:t,seq:P}),P+=1}function Ke(){pe(),be(),a&&k.length&&ge(),G()}async function Qe(i){var y;if(!l.game||x.has(l.round))return;const p=l.commits[l.round]||{};if(c in p)return;const h=s(),v=await Ft(i,h,n);L={round:l.round,pick:i,nonce:h},b[y=l.round]??(b[y]={}),b[l.round][c]=i,q({id:`commit:${c}:${l.round}`,type:"commit",from:c,round:l.round,hash:v})}function Xe(i,p={}){if(!D().isFacilitator)return;const h=l.round+1;L=null,q({id:`select:${h}:${c}`,type:"select-game",from:c,round:h,game:i,config:p})}function Ze(){if(!D().isFacilitator)return;const i=l.round+1;L=null,q({id:`lobby:${i}:${c}`,type:"back-to-lobby",from:c,round:i})}function et(){D().isFacilitator&&q({id:`force:${l.round}:${c}`,type:"force-reveal",from:c,round:l.round})}function tt(){q({id:`leave:${c}`,type:"leave",from:c})}function nt(i){return i.board&&i.board.privacy==="blind"&&!i.board.cardsRevealed}function W(i,p,h){q({id:`card:${i}:${p}`,type:"card",from:c,round:l.round,cardId:i,ver:p,card:h})}function ot(i,p,h={}){var $e;const v=D();if(!v.board)return null;const y=`${c}:${R++}`,B=(($e=v.board.columns.find(dt=>dt.key===i))==null?void 0:$e.cards)||[],X=Gt(B.length?B[B.length-1].order:"",c),ve={text:String(p).slice(0,280),col:i,order:X,author:c,deleted:!1,...h};return nt(v)?(E.set(y,ve),A(),G()):W(y,1,ve),y}function st(i,p){var v;if(E.has(i)){const y=E.get(i);if(y.author!==c)return;E.set(i,{...y,text:String(p).slice(0,280)}),A(),G();return}const h=(v=l.cards[l.round])==null?void 0:v[i];!h||h.author!==c||W(i,h.ver+1,{...h,text:String(p).slice(0,280)})}function rt(i,p,h){var y;if(E.has(i)){const B=E.get(i);E.set(i,{...B,col:p,order:h}),A(),G();return}const v=(y=l.cards[l.round])==null?void 0:y[i];v&&W(i,v.ver+1,{...v,col:p,order:h})}function at(i,p){var y;const h=String(p).slice(0,20);if(E.has(i)){const B=E.get(i);E.set(i,{...B,time:h}),A(),G();return}const v=(y=l.cards[l.round])==null?void 0:y[i];v&&W(i,v.ver+1,{...v,time:h})}function it(i){var h;if(E.has(i)){if(E.get(i).author!==c)return;E.delete(i),A(),G();return}const p=(h=l.cards[l.round])==null?void 0:h[i];!p||p.author!==c||W(i,p.ver+1,{...p,deleted:!0})}function ct(){const i=D();!i.isFacilitator||!i.board||q({id:`reveal-cards:${l.round}`,type:"reveal-cards",from:c,round:l.round})}function lt(i){return N.add(i),()=>N.delete(i)}return{self:c,join:Ye,heartbeat:ye,tick:Ke,lock:Qe,selectGame:Xe,backToLobby:Ze,forceReveal:et,leave:tt,handOff:Je,addCard:ot,editCard:st,moveCard:rt,deleteCard:it,retimeCard:at,revealCards:ct,processVerifications:he,getView:D,onChange:lt,_debug:()=>({state:l,verified:b})}}const g=e=>document.getElementById(e),m=e=>String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function z(e,t){return e?`<div class="lock-note"><strong>Locked in.</strong> Waiting on ${t} player${t===1?"":"s"}…</div>`:'<div class="lock-note">Your pick locks in immediately — choose with intent.</div>'}function U(e,t){return e.isFacilitator?`
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${m(t)}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`:`<div class="lock-note">Waiting on ${m(e.names[e.facilitator]||"the facilitator")} for the next round…</div>`}function T(e,t){return`<div class="stage-kicker">Round ${e.round} — ${m(t)}</div>`}const zt={renderPick(e,t){const n=e.iAmCommitted;return`
      ${T(e,"Rock Paper Scissors")}
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(K).map(([o,s])=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="glyph">${s.glyph}</span>
            <span class="lbl">${o}</span>
          </button>`).join("")}
      </div>
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),o=e.result,s=new Set(o.winners);let r;if(o.outcome==="draw")r=n.length===2?"A <em>draw.</em> Run it back.":"Everyone threw the same. A <em>draw.</em>";else if(o.outcome==="stalemate")r="All three throws on the table — <em>stalemate.</em>";else if(o.outcome==="incomplete")r="Not enough throws to call it.";else if(n.length===2){const a=o.winners[0],u=n.find(d=>d!==a);r=`<em>${m(e.names[a]||"Someone")}</em> takes it — ${m(t[a])} beats ${m(t[u])}.`}else{const a=o.winningThrow;r=`<em>${m(a[0].toUpperCase()+a.slice(1))}</em> wins the round.`}return`
      ${T(e,"the reveal")}
      <div class="verdict">${r}</div>
      <div class="results">
        ${n.map((a,u)=>{var d;return`
          <div class="result-row ${s.has(a)?"winner":""}" style="animation-delay:${u*90}ms">
            <span class="r-glyph">${((d=K[t[a]])==null?void 0:d.glyph)||"?"}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${m(t[a])}${s.has(a)?" · win":""}</span>
          </div>`}).join("")}
      </div>
      ${U(e,"Throw again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=s.dataset.pick,t.lock(n.choice),o()}))}},Ut={renderPick(e,t){const n=e.iAmCommitted;return`
      ${T(e,"Fist to Five")}
      <div class="stage-title">How do you <em>really</em> feel?</div>
      <div class="choices">
        ${[0,1,2,3,4,5].map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="num">${o}</span>
            <span class="lbl">${o===0?"fist":o===5?"all in":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),o=e.result;let s;o.hardNo?s="A fist on the table — <em>someone is blocking.</em> Talk it out.":o.consensus&&o.avg>=4?s='<span class="consensus">Strong consensus.</span> Ship it.':o.consensus?s='<span class="consensus">Aligned</span> — the room agrees.':s=`The room is <em>split.</em> Hear from the ${o.min}s and the ${o.max}s.`;const r=[...n].sort((a,u)=>Number(t[a])-Number(t[u]));return`
      ${T(e,"the reveal")}
      <div class="verdict">${s}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${o.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${o.spread}</div><div class="s-lbl">spread</div></div>
      </div>
      <div class="results">
        ${r.map((a,u)=>`
          <div class="result-row" style="animation-delay:${u*90}ms">
            <span class="r-num">${m(t[a])}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${Number(t[a])===0?"block":Number(t[a])>=4?"support":"reserved"}</span>
          </div>`).join("")}
      </div>
      ${U(e,"Vote again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=Number(s.dataset.pick),t.lock(n.choice),o()}))}},we={"?":"?",coffee:"☕"},Wt={renderPick(e,t){const n=e.iAmCommitted,o=[...re.scale,...re.special];return`
      ${T(e,"Story Pointing")}
      <div class="stage-title">Size it <em>blind</em></div>
      <div class="choices">
        ${o.map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${m(String(s))}" ${n?"disabled":""}>
            <span class="num">${we[s]??s}</span>
            <span class="lbl">${s==="?"?"unsure":s==="coffee"?"break":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,o=Object.keys(t).sort((a,u)=>{const d=typeof t[a]=="number"?t[a]:1/0,f=typeof t[u]=="number"?t[u]:1/0;return d-f}),s=new Set(n.outliers);let r;return n.numericCount===0?r="No estimates on the table — <em>coffee first?</em>":n.consensus?r=`<span class="consensus">Converged.</span> Call it a ${Math.round(n.avg)}.`:r=`The room is <em>split</em> — hear from the ${n.min}s and the ${n.max}s.`,`
      ${T(e,"the reveal")}
      <div class="verdict">${r}</div>
      ${n.numericCount?`
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${n.min}–${n.max}</div><div class="s-lbl">range</div></div>
      </div>`:""}
      <div class="results">
        ${o.map((a,u)=>`
          <div class="result-row ${s.has(a)?"winner":""}" style="animation-delay:${u*90}ms">
            <span class="r-num">${we[t[a]]??m(t[a])}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${s.has(a)?"outlier · speak up":n.abstained.includes(a)?"abstained":""}</span>
          </div>`).join("")}
      </div>
      ${U(e,"Point again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{const r=s.dataset.pick,a=r==="?"||r==="coffee"?r:Number(r);n.choice=a,t.lock(a),o()}))}},Be={yes:"👍",no:"👎",abstain:"🤷"},Vt={configForm(e){return`
      <div class="field">
        <label for="cfgQuestion">The question</label>
        <input type="text" id="cfgQuestion" maxlength="200" placeholder="e.g. Ship it on Friday?" value="${m(e.question||"")}" autocomplete="off">
      </div>`},readConfig(){var e;return{question:((e=document.getElementById("cfgQuestion"))==null?void 0:e.value)||""}},configValid:e=>e.question.trim().length>0,renderPick(e,t){const n=e.iAmCommitted;return`
      ${T(e,"Motion Vote")}
      <div class="stage-title">${m(e.config.question||"The motion")}</div>
      <div class="choices">
        ${["yes","no","abstain"].map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="glyph">${Be[o]}</span>
            <span class="lbl">${o}</span>
          </button>`).join("")}
      </div>
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,o=Object.keys(t).sort();let s;return n.tied?s="Dead <em>even.</em> Keep talking.":n.passed?s=`<span class="consensus">Carried${n.unanimous?", unanimously":""}.</span> ${n.yes}–${n.no}.`:s=`<em>Does not carry.</em> ${n.yes}–${n.no}.`,`
      ${T(e,"the reveal")}
      <p class="stage-sub">${m(e.config.question||"")}</p>
      <div class="verdict">${s}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.yes}</div><div class="s-lbl">yes</div></div>
        <div class="stat"><div class="s-val">${n.no}</div><div class="s-lbl">no</div></div>
        <div class="stat"><div class="s-val">${n.abstain}</div><div class="s-lbl">abstain</div></div>
      </div>
      <div class="results">
        ${o.map((r,a)=>`
          <div class="result-row" style="animation-delay:${a*90}ms">
            <span class="r-glyph">${Be[t[r]]}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${m(t[r])}</span>
          </div>`).join("")}
      </div>
      ${U(e,"New motion")}`},againOpensConfig:!0,bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=s.dataset.pick,t.lock(n.choice),o()}))}},Jt={configForm(e){return`
      <div class="field">
        <label for="cfgOptions">Options — one per line (2–10)</label>
        <textarea id="cfgOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C">${m(e.optionsText||"")}</textarea>
      </div>`},readConfig(){var t;const e=((t=document.getElementById("cfgOptions"))==null?void 0:t.value)||"";return{optionsText:e,options:e.split(`
`).map(n=>n.trim()).filter(Boolean)}},configValid:e=>e.options.length>=2,renderPick(e,t){const n=e.iAmCommitted,o=t.rank||[],s=e.config.options,r=o.length===s.length;return`
      ${T(e,"Ranked Choice")}
      <div class="stage-title">Rank them <em>all</em></div>
      <p class="stage-sub">Tap in order of preference — first tap is your top pick.</p>
      <div class="choices">
        ${s.map((a,u)=>{const d=o.indexOf(u);return`
            <button class="choice ${d>=0?"selected":""}" data-rank="${u}" ${n||d>=0?"disabled":""}>
              <span class="num">${d>=0?d+1:"·"}</span>
              <span class="lbl">${m(a)}</span>
            </button>`}).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockRankBtn" ${r?"":"disabled"}>Lock ranking</button>
        <button class="btn-ghost" id="resetRankBtn" ${o.length?"":"disabled"}>Reset</button>
      </div>`}
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.result;let n;return t.winner?n=`<em>${m(t.winner)}</em> takes it.`:t.tie.length?n=`A tie between <em>${t.tie.map(m).join("</em> and <em>")}</em>.`:n="No clear result.",`
      ${T(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.scores.map((o,s)=>`
          <div class="result-row ${o.option===t.winner?"winner":""}" style="animation-delay:${s*90}ms">
            <span class="r-num">${s+1}</span>
            <span class="r-name">${m(o.option)}</span>
            <span class="r-choice">${o.points} pts · ${o.firsts} first${o.firsts===1?"":"s"}</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">Borda count across ${t.voterCount} ballot${t.voterCount===1?"":"s"}.</div>
      ${U(e,"Vote again")}`},bind(e,t,n,o){document.querySelectorAll("[data-rank]").forEach(a=>a.addEventListener("click",()=>{n.rank=[...n.rank||[],Number(a.dataset.rank)],o()}));const s=document.getElementById("resetRankBtn");s&&s.addEventListener("click",()=>{n.rank=[],o()});const r=document.getElementById("lockRankBtn");r&&r.addEventListener("click",()=>{(n.rank||[]).length===e.config.options.length&&(t.lock(n.rank),o())})}},Pe={r:"🔴",y:"🟡",g:"🟢"},Yt={renderPick(e,t){const n=e.iAmCommitted,o=t.ratings||{},s=e.config.categories,r=s.every((a,u)=>o[u]);return`
      ${T(e,"Health Check")}
      <div class="stage-title">How's the <em>team?</em></div>
      <div class="health-rate">
        ${s.map((a,u)=>`
          <div class="health-row">
            <span class="hc-name">${m(a)}</span>
            <span class="hc-lights">
              ${["r","y","g"].map(d=>`
                <button class="hc-light ${o[u]===d?"selected":""}" data-cat="${u}" data-light="${d}" ${n?"disabled":""}>${Pe[d]}</button>`).join("")}
            </span>
          </div>`).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockHealthBtn" ${r?"":"disabled"}>Lock ratings</button>
      </div>`}
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.overall==="g"?'<span class="consensus">Healthy.</span> Keep going.':t.overall==="y"?"Some <em>yellow flags</em> — worth a conversation.":"<em>Red flags on the table.</em> Make time for this.";return`
      ${T(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.categories.map((o,s)=>`
          <div class="result-row" style="animation-delay:${s*90}ms">
            <span class="r-glyph">${Pe[o.light]}</span>
            <span class="r-name">${m(o.name)}</span>
            <span class="r-choice">${o.g}🟢 ${o.y}🟡 ${o.r}🔴</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">${t.raterCount} rating${t.raterCount===1?"":"s"} · lights are the majority, ties darken.</div>
      ${U(e,"Check again")}`},bind(e,t,n,o){document.querySelectorAll("[data-cat]").forEach(r=>r.addEventListener("click",()=>{n.ratings={...n.ratings||{},[r.dataset.cat]:r.dataset.light},o()}));const s=document.getElementById("lockHealthBtn");s&&s.addEventListener("click",()=>{const r=e.config.categories,a=n.ratings||{};r.every((u,d)=>a[d])&&(t.lock(Object.fromEntries(r.map((u,d)=>[d,a[d]]))),o())})}};function Kt(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}const Qt={renderPick(e,t){const n=e.iAmCommitted,o=(e.config.excluded||[]).filter(s=>e.names[s]).map(s=>e.names[s]);return`
      ${T(e,"Turn Picker")}
      <div class="stage-title">Who goes <em>next?</em></div>
      <p class="stage-sub">Everyone contributes randomness — nobody can rig the draw. ${o.length?`Already picked: ${o.map(m).join(", ")}.`:""}</p>
      <div class="stage-actions">
        <button class="btn-primary" id="drawBtn" ${n?"disabled":""}>${n?"In the hat":"Throw in the hat"}</button>
      </div>
      ${z(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.winner?e.names[t.winner]||"a departed player":"nobody";return`
      ${T(e,"the draw")}
      <div class="verdict"><em>${m(n)}</em> — you're up.</div>
      ${t.exhausted?'<div class="lock-note">Everyone had a turn — the exclusion list reset.</div>':""}
      ${e.isFacilitator?`
        <div class="stage-actions">
          <button class="btn-primary" id="againExcludeBtn">Pick again (skip ${m(n)})</button>
          <button class="btn-ghost" id="lobbyBtn">Change game</button>
        </div>`:U(e,"Pick again")}`},bind(e,t,n,o){const s=document.getElementById("drawBtn");s&&s.addEventListener("click",()=>{t.lock(Kt()),o()});const r=document.getElementById("againExcludeBtn");r&&r.addEventListener("click",()=>{const a=e.result,u=a.exhausted?[]:e.config.excluded||[],d=a.winner?[...new Set([...u,a.winner])]:u;t.selectGame("turn",{excluded:d})})}};function Re(e,{title:t}={}){const n=[];t&&n.push(`# ${t}`,"");for(const o of e.board.columns){if(n.push(`## ${o.title}`),!o.cards.length)n.push("_(empty)_");else for(const s of o.cards){const r=e.names[s.author]||"unknown";n.push(`- ${s.text} — _${r}_`)}n.push("")}return n.join(`
`).trim()+`
`}function je(e,{title:t}={}){const n=[];t&&n.push(`# ${t}`,"");for(const s of e.board.columns)if(s.key!=="timeline"){if(n.push(`## ${s.title}`),!s.cards.length)n.push("_(empty)_");else for(const r of s.cards)n.push(`- ${r.text}`);n.push("")}const o=e.board.columns.find(s=>s.key==="timeline");if(o){if(n.push("## Timeline"),!o.cards.length)n.push("_(empty)_");else for(const s of o.cards){const r=s.time?`**${s.time}** — `:"";n.push(`- ${r}${s.text}`)}n.push("")}return n.join(`
`).trim()+`
`}async function Ne(e){try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this:",e);return}const t=g("toast");t&&(t.textContent="Copied",t.classList.add("show"),setTimeout(()=>{t.classList.remove("show"),t.textContent="Link copied"},1800))}function Ge(e,t){const n=new Blob([e],{type:"text/markdown"}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=t,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(o)}const Xt={configForm(e){const t=e.template||"wwda",n=e.privacy||"blind";return`
      <div class="field">
        <label>Template</label>
        <div class="choice-row">
          ${Object.entries(Y).map(([o,s])=>`
            <label class="check-row">
              <input type="radio" name="cfgTemplate" value="${o}" ${t===o?"checked":""}>
              <span>${m(s.label)}</span>
            </label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Card privacy</label>
        <div class="choice-row">
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="blind" ${n==="blind"?"checked":""}>
            <span>Blind — hidden until you reveal</span>
          </label>
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="live" ${n==="live"?"checked":""}>
            <span>Live — visible as written</span>
          </label>
        </div>
      </div>`},readConfig(){var n,o;const e=((n=document.querySelector('input[name="cfgTemplate"]:checked'))==null?void 0:n.value)||"wwda",t=((o=document.querySelector('input[name="cfgPrivacy"]:checked'))==null?void 0:o.value)||"blind";return{template:e,privacy:t}},configValid:()=>!0,renderBoard(e){const t=e.board.privacy==="blind"&&!e.board.cardsRevealed;return`
      <div class="stage-kicker">Retrospective</div>
      <div class="stage-title">${t?"Write it <em>down</em>":"The <em>board</em>"}</div>
      ${t?'<p class="stage-sub">Your cards are private until the facilitator reveals the board.</p>':""}
      <div class="board">
        ${e.board.columns.map(n=>`
          <div class="board-col">
            <div class="board-col-title">${m(n.title)}</div>
            <div class="board-cards" data-col="${m(n.key)}">
              ${n.cards.map((o,s)=>`
                <div class="board-card ${o.pending?"pending":""}" data-card="${m(o.cardId)}">
                  <div class="bc-text">${m(o.text)}</div>
                  <div class="bc-meta">
                    <span class="bc-author">${m(e.names[o.author]||(o.pending?"you":"departed"))}${o.pending?" · private":""}</span>
                    <span class="bc-actions">
                      ${s>0?`<button class="bc-btn" data-act="up" data-card="${m(o.cardId)}">↑</button>`:""}
                      ${s<n.cards.length-1?`<button class="bc-btn" data-act="down" data-card="${m(o.cardId)}">↓</button>`:""}
                      <button class="bc-btn" data-act="left" data-card="${m(o.cardId)}">←</button>
                      <button class="bc-btn" data-act="right" data-card="${m(o.cardId)}">→</button>
                      ${o.mine?`<button class="bc-btn" data-act="delete" data-card="${m(o.cardId)}">✕</button>`:""}
                    </span>
                  </div>
                </div>`).join("")}
              <form class="bc-add" data-col="${m(n.key)}">
                <input type="text" maxlength="280" placeholder="Add a card…" autocomplete="off">
              </form>
            </div>
          </div>`).join("")}
      </div>
      <div class="stage-actions">
        ${e.isFacilitator&&t?'<button class="btn-primary" id="revealCardsBtn">Reveal cards</button>':""}
        ${e.isFacilitator?'<button class="btn-ghost" id="lobbyBtn">Change game</button>':""}
        <button class="btn-ghost" id="exportMdBtn">Copy markdown</button>
        <button class="btn-ghost" id="downloadMdBtn">Download .md</button>
      </div>`},bindBoard(e,t){const n=e.board.columns.map(u=>u.key);document.querySelectorAll(".board-cards").forEach(u=>{const d=u.dataset.col;u.querySelectorAll("[data-act]").forEach(f=>f.addEventListener("click",()=>{const c=f.dataset.card,l=f.dataset.act,b=e.board.columns.find(k=>k.key===d).cards,$=b.findIndex(k=>k.cardId===c);if(l==="delete"){t.deleteCard(c);return}if(l==="up"&&$>0){const k=$>=2?b[$-2].order:"";t.moveCard(c,d,H(k,b[$-1].order))}else if(l==="down"&&$<b.length-1){const k=$+2<b.length?b[$+2].order:"";t.moveCard(c,d,H(b[$+1].order,k))}else if(l==="left"||l==="right"){const k=n[(n.indexOf(d)+(l==="right"?1:n.length-1))%n.length],x=e.board.columns.find(P=>P.key===k).cards,L=x.length?x[x.length-1].order:"";t.moveCard(c,k,H(L,""))}}))}),document.querySelectorAll(".bc-add").forEach(u=>u.addEventListener("submit",d=>{d.preventDefault();const f=u.querySelector("input"),c=f.value.trim();c&&t.addCard(u.dataset.col,c),f.value=""}));const o=document.getElementById("revealCardsBtn");o&&o.addEventListener("click",()=>t.revealCards());const s=document.getElementById("lobbyBtn");s&&s.addEventListener("click",()=>t.backToLobby());const r=document.getElementById("exportMdBtn");r&&r.addEventListener("click",()=>Ne(Re(e)));const a=document.getElementById("downloadMdBtn");a&&a.addEventListener("click",()=>Ge(Re(e),"retro.md"))}},Zt={renderBoard(e){return`
      <div class="stage-kicker">After-Action Review</div>
      <div class="stage-title">The <em>debrief</em></div>
      <p class="stage-sub">Capture what happened together. The Timeline sorts itself by clock time.</p>
      <div class="board board-aar">
        ${e.board.columns.map(t=>this.renderColumn(e,t)).join("")}
      </div>
      <div class="stage-actions">
        ${e.isFacilitator?'<button class="btn-ghost" id="lobbyBtn">Change game</button>':""}
        <button class="btn-ghost" id="exportMdBtn">Copy markdown</button>
        <button class="btn-ghost" id="downloadMdBtn">Download .md</button>
      </div>`},renderColumn(e,t){const n=!!t.timeline;return`
      <div class="board-col ${n?"board-col-timeline":""}">
        <div class="board-col-title">${m(t.title)}</div>
        <div class="board-cards" data-col="${m(t.key)}">
          ${t.cards.map((o,s)=>`
            <div class="board-card" data-card="${m(o.cardId)}">
              ${n?`<input class="bc-time" type="text" maxlength="20" placeholder="hh:mm"
                          value="${m(o.time||"")}" data-card="${m(o.cardId)}" aria-label="Time">`:""}
              <div class="bc-text">${m(o.text)}</div>
              <div class="bc-meta">
                <span class="bc-author">${m(e.names[o.author]||"departed")}</span>
                <span class="bc-actions">
                  ${s>0?`<button class="bc-btn" data-act="up" data-card="${m(o.cardId)}">↑</button>`:""}
                  ${s<t.cards.length-1?`<button class="bc-btn" data-act="down" data-card="${m(o.cardId)}">↓</button>`:""}
                  <button class="bc-btn" data-act="left" data-card="${m(o.cardId)}">←</button>
                  <button class="bc-btn" data-act="right" data-card="${m(o.cardId)}">→</button>
                  ${o.mine?`<button class="bc-btn" data-act="delete" data-card="${m(o.cardId)}">✕</button>`:""}
                </span>
              </div>
            </div>`).join("")}
          <form class="bc-add" data-col="${m(t.key)}">
            ${n?'<input class="bc-add-time" type="text" maxlength="20" placeholder="hh:mm" autocomplete="off">':""}
            <input class="bc-add-text" type="text" maxlength="280" placeholder="Add a card…" autocomplete="off">
          </form>
        </div>
      </div>`},bindBoard(e,t){const n=e.board.columns.map(a=>a.key);document.querySelectorAll(".board-cards").forEach(a=>{const u=a.dataset.col;a.querySelectorAll("[data-act]").forEach(d=>d.addEventListener("click",()=>{const f=d.dataset.card,c=d.dataset.act,l=e.board.columns.find($=>$.key===u).cards,b=l.findIndex($=>$.cardId===f);if(c==="delete"){t.deleteCard(f);return}if(c==="up"&&b>0){const $=b>=2?l[b-2].order:"";t.moveCard(f,u,H($,l[b-1].order))}else if(c==="down"&&b<l.length-1){const $=b+2<l.length?l[b+2].order:"";t.moveCard(f,u,H(l[b+1].order,$))}else if(c==="left"||c==="right"){const $=n[(n.indexOf(u)+(c==="right"?1:n.length-1))%n.length],k=e.board.columns.find(L=>L.key===$).cards,x=k.length?k[k.length-1].order:"";t.moveCard(f,$,H(x,""))}}))}),document.querySelectorAll(".bc-time").forEach(a=>a.addEventListener("change",()=>t.retimeCard(a.dataset.card,a.value.trim()))),document.querySelectorAll(".bc-add").forEach(a=>a.addEventListener("submit",u=>{u.preventDefault();const d=a.querySelector(".bc-add-text"),f=a.querySelector(".bc-add-time"),c=d.value.trim();if(!c)return;const l=f&&f.value.trim()?{time:f.value.trim()}:{};t.addCard(a.dataset.col,c,l),d.value="",f&&(f.value="")}));const o=document.getElementById("lobbyBtn");o&&o.addEventListener("click",()=>t.backToLobby());const s=document.getElementById("exportMdBtn");s&&s.addEventListener("click",()=>Ne(je(e)));const r=document.getElementById("downloadMdBtn");r&&r.addEventListener("click",()=>Ge(je(e),"aar.md"))}},en={rps:zt,f2f:Ut,points:Wt,motion:Vt,ranked:Jt,health:Yt,turn:Qt,retro:Xt,aar:Zt},ee=e=>en[e]||null;function tn(e,t){if(!e.isFacilitator)return`
      <div class="stage-kicker">Round table</div>
      <div class="stage-title">Waiting on the <em>facilitator</em></div>
      <p class="waiting-host">${m(e.names[e.facilitator]||"The facilitator")} is choosing a game…</p>`;if(t.configGame){const n=Z(t.configGame),o=ee(t.configGame);return`
      <div class="stage-kicker">Set up</div>
      <div class="stage-title">${m(n.label)}</div>
      <p class="stage-sub">${m(n.description)}</p>
      ${o.configForm(t.configDraft||{})}
      <div class="stage-actions">
        <button class="btn-primary" id="startConfiguredBtn">Start round</button>
        <button class="btn-ghost" id="cancelConfigBtn">Back</button>
      </div>
      <div class="transport-error" id="configError"></div>`}return`
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're facilitating. Everyone locks in blind — nothing is shown until all hands are in.</p>
    <div class="game-cards">
      ${Tt.map(n=>`
        <button class="game-card" data-game="${m(n.id)}">
          <div class="gc-glyphs">${n.glyphs}</div>
          <div class="gc-name">${m(n.label)}</div>
          <div class="gc-desc">${m(n.description)}</div>
        </button>`).join("")}
    </div>`}function nn(e,t,n,o){if(document.querySelectorAll("[data-game]").forEach(a=>a.addEventListener("click",()=>{const u=a.dataset.game,d=Z(u);d&&(d.needsConfig?(n.configGame=u,n.configDraft={},o()):t.selectGame(u,d.defaultConfig(e)))})),n.configGame){const a=ee(n.configGame);document.querySelectorAll("#stage input, #stage textarea").forEach(u=>u.addEventListener("input",()=>{n.configDraft=a.readConfig()}))}const s=document.getElementById("startConfiguredBtn");s&&s.addEventListener("click",()=>{const a=n.configGame,u=Z(a),d=ee(a),f=u.normalizeConfig(d.readConfig());if(!d.configValid(f)){const c=document.getElementById("configError");c&&(c.textContent="That setup isn’t complete yet.");return}n.configGame=null,n.configDraft=null,t.selectGame(a,f)});const r=document.getElementById("cancelConfigBtn");r&&r.addEventListener("click",()=>{n.configGame=null,n.configDraft=null,o()})}const on="wss://tablestakes-turn.joshuarlowry.workers.dev",sn=()=>new URLSearchParams(location.hash.replace(/^#/,"")),ie=()=>`${location.origin}${location.pathname}?room=${encodeURIComponent(O)}#token=${encodeURIComponent(j)}`;let S=null,O=null,j="",De=!1,M={},ce=-1,_e=null,He=null;const ze=new URLSearchParams(location.search);O=ze.get("room");De=!O;j=sn().get("token")||ze.get("token")||"";j&&(g("inviteTokenInput").value=j);if(O){g("createBtn").textContent="Join room";const e=g("joinNote");e.style.display="inline",e.textContent=`joining ${O}`}g("createBtn").addEventListener("click",Ue);g("nameInput").addEventListener("keydown",e=>{e.key==="Enter"&&Ue()});g("copyBtn").addEventListener("click",async()=>{We();const e=g("inviteLinkInput").value;try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this link:",e)}const t=g("toast");t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),1800)});g("leaveBtn").addEventListener("click",rn);async function Ue(){const e=g("nameInput").value.trim();if(!e){g("nameInput").focus();return}if(O){if(j=g("inviteTokenInput").value.trim()||j,!j){g("transportError").textContent="This room needs an invitation token.";return}history.replaceState(null,"",ie())}else{const n=ut();O=n.roomId,j=n.inviteToken,g("inviteTokenInput").value=j,history.replaceState(null,"",ie())}const t=mt({wsUrl:on,roomId:O,inviteToken:j,name:e,onHealth:cn,onError:an});S=Ht({transport:t,name:e,autoVerify:!0,isCreator:De,roomId:O}),S.onChange(le),S.join(),_e=setInterval(()=>S.heartbeat(),5e3),He=setInterval(()=>S.tick(),2e3),g("entry").classList.add("hidden"),g("room").classList.add("visible"),g("roomCodeText").textContent=O,We(),le(S.getView())}function We(){!O||!j||(g("inviteLinkInput").value=ie())}function rn(){S==null||S.leave(),S=null,clearInterval(_e),clearInterval(He),O=null,j="",M={},ce=-1,history.replaceState(null,"",location.pathname),g("room").classList.remove("visible"),g("entry").classList.remove("hidden"),g("createBtn").textContent="Start a room",g("joinNote").style.display="none",g("joinNote").textContent="",g("roomCodeText").textContent="",g("inviteLinkInput").value="",g("inviteTokenInput").value="",g("transportError").textContent="",g("healthErrors").textContent="",g("localPeerId").textContent="pending",g("transportStatus").textContent="idle",g("peerCount").textContent="0",g("reconnectAttempts").textContent="0",g("players").innerHTML="",g("stage").innerHTML="",Ve(!1,0)}function an(e){g("healthErrors").textContent=e.message||String(e)}function cn(e){g("localPeerId").textContent=e.localPeerId||"pending",g("transportStatus").textContent=e.status,g("peerCount").textContent=String(e.peerCount),g("reconnectAttempts").textContent=String(e.reconnectAttempts)}function Ve(e,t){g("conn").classList.toggle("live",e),g("connText").textContent=e?`${t} connected`:S?"waiting for peers":"offline"}function le(e){e.round!==ce&&(M={},ce=e.round),dn(e);const t=g("stage"),n=e.game?ee(e.game):null;e.phase==="lobby"||!n?t.innerHTML=tn(e,M):e.phase==="board"?t.innerHTML=n.renderBoard(e,M):e.phase==="pick"?t.innerHTML=n.renderPick(e,M)+ln(e):t.innerHTML=n.renderReveal(e),un(e,n),Ve(e.participants.length>1,e.participants.length)}function ln(e){return e.isFacilitator&&e.iAmCommitted&&e.remaining>0?'<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>':""}function dn(e){g("players").innerHTML=e.participants.map(t=>`
    <div class="player ${e.committedIds.includes(t)?"locked":""} ${t===S.self?"me":""}">
      <span class="pip"></span>
      <span>${m(e.names[t]||"…")}</span>
      ${t===e.facilitator?'<span class="tag">FACILITATOR</span>':""}
      ${e.isFacilitator&&t!==S.self&&t!==e.facilitator?`<button class="mini-action" data-facilitator="${m(t)}">Make facilitator</button>`:""}
    </div>`).join("")}function J(){le(S.getView())}function un(e,t){if(e.phase==="lobby"||!t)nn(e,S,M,J);else if(e.phase==="board")t.bindBoard(e,S,M,J);else if(e.phase==="pick"){t.bind(e,S,M,J);const n=g("forceBtn");n&&n.addEventListener("click",()=>S.forceReveal())}else{t.bind(e,S,M,J);const n=g("againBtn");n&&n.addEventListener("click",()=>{t.againOpensConfig?(S.backToLobby(),M.configGame=e.game,M.configDraft={},J()):S.selectGame(e.game,e.config)});const o=g("lobbyBtn");o&&o.addEventListener("click",()=>S.backToLobby())}document.querySelectorAll("[data-facilitator]").forEach(n=>n.addEventListener("click",()=>S.handOff(n.dataset.facilitator)))}
