// Bellio AR mini-game: tappable items bob above the target. Activated when window.GAME is set (client.json type:"game").
(function(){const G=window.GAME;if(!G)return;
const $=id=>document.getElementById(id),t=$('target'),scene=$('scene'),C=G.colors||{};
const css=document.createElement('style');css.textContent=`#hud{position:fixed;top:10px;left:10px;right:10px;z-index:8;display:flex;justify-content:space-between;font:700 20px system-ui;color:#fff;text-shadow:0 1px 4px #000;pointer-events:none}
#res .score{font-size:56px;font-weight:800;color:${C.accent||'#ffb703'}}#res a.cta{display:inline-block;padding:16px 28px;border-radius:14px;background:${C.accent||'#ffb703'};color:${C.text||'#000'};font-weight:700;text-decoration:none;font-size:20px}
#res button{background:#fff}.pop{position:fixed;z-index:9;color:${C.accent||'#ffb703'};font:800 26px system-ui;text-shadow:0 1px 4px #000;pointer-events:none;transition:transform .6s,opacity .6s}`;document.head.appendChild(css);
document.body.insertAdjacentHTML('beforeend',`<div id="hud" class="hide"><span id="sc">${G.emoji||'⭐'} 0</span><span id="tm">⏱ ${G.duration}</span></div>
<div id="res" class="ov hide" style="background:${C.bg||'rgba(0,20,40,.94)'}"><h2>${G.title}</h2><div>You collected</div><div class="score" id="final">0</div><div>${G.itemName}</div>
<button id="again">Play again</button>${G.ctaLink?`<a class="cta" href="${G.ctaLink}" target="_blank" rel="noopener">${G.ctaLabel||'Learn more'}</a>`:''}</div>`);
const st=$('start');if(st&&G.title)st.querySelector('h2').textContent=G.title;

const shapes={coin:'primitive: cylinder; radius: 0.08; height: 0.02',shell:'primitive: cone; radiusBottom: 0.08; radiusTop: 0.01; height: 0.1; segmentsRadial: 8',
 bolt:'primitive: cone; radiusBottom: 0.05; radiusTop: 0; height: 0.16; segmentsRadial: 3',star:'primitive: dodecahedron; radius: 0.07',gem:'primitive: octahedron; radius: 0.07',sphere:'primitive: sphere; radius: 0.06; segmentsWidth: 10; segmentsHeight: 8'};
const kinds=(G.items||[{shape:'coin',color:'#ffd166'}]),N=G.count||5,H=G.aspect||1;let score=0,left=G.duration,running=false,timer=null,started=false;
const items=[];
function place(e){e.object3D.position.set((Math.random()-.5)*.8,(Math.random()-.5)*H*.8,.12+Math.random()*.25);e.object3D.scale.set(1,1,1);e.object3D.visible=true;}
for(let i=0;i<N;i++){const k=kinds[i%kinds.length],e=document.createElement('a-entity');e.className='item';
 e.setAttribute('geometry',shapes[k.shape]||shapes.sphere);e.setAttribute('material',`color: ${k.color||'#ffd166'}; metalness: .3; roughness: .4; emissive: ${k.color||'#ffd166'}; emissiveIntensity: .25`);
 e.setAttribute('rotation',k.shape==='coin'?'90 0 0':'0 0 0');e.setAttribute('animation__spin',`property: rotation; to: ${k.shape==='coin'?'90 360 0':'0 360 0'}; dur: ${2500+i*300}; loop: true; easing: linear`);
 e.setAttribute('bob','');e.object3D.visible=false;t.appendChild(e);items.push(e);
 e.addEventListener('hit',ev=>{if(!running||!e.object3D.visible)return;score+=G.pointsPerTap||1;$('sc').textContent=`${G.emoji||'⭐'} ${score}`;
  const d=ev.detail||{},p=document.createElement('div');p.className='pop';p.textContent='+'+(G.pointsPerTap||1);
  p.style.left=((d.clientX||innerWidth/2)-14)+'px';p.style.top=((d.clientY||innerHeight/2)-20)+'px';document.body.appendChild(p);
  requestAnimationFrame(()=>{p.style.transform='translateY(-60px) scale(1.4)';p.style.opacity='0';});setTimeout(()=>p.remove(),650);
  e.object3D.visible=false;setTimeout(()=>{if(running)place(e);},400);});}
AFRAME.registerComponent('bob',{init(){this.o=Math.random()*6;},tick(ms){if(!this.el.object3D.visible)return;const s=this.el.object3D.scale.x;this.el.object3D.position.z+=Math.sin(ms/400+this.o)*.0015;}});
function begin(){score=0;left=G.duration;running=true;$('sc').textContent=`${G.emoji||'⭐'} 0`;$('tm').textContent='⏱ '+left;$('hud').classList.remove('hide');$('res').classList.add('hide');items.forEach(place);
 clearInterval(timer);timer=setInterval(()=>{left--;$('tm').textContent='⏱ '+left;if(left<=0)end();},1000);}
function end(){running=false;clearInterval(timer);items.forEach(e=>e.object3D.visible=false);$('final').textContent=score;$('res').classList.remove('hide');}
$('again').onclick=begin;
// Touch-friendly hit test: project each visible item to screen, take the nearest within ~60px of the tap (no raycaster/cursor needed).
const V=new THREE.Vector3();
addEventListener('pointerdown',ev=>{if(!running||ev.target.closest('button,a'))return;const cam=scene.camera;let best=null,bd=Math.max(60,innerWidth*.12);
 for(const e of items){if(!e.object3D.visible||!t.object3D.visible)continue;e.object3D.getWorldPosition(V).project(cam);
  const x=(V.x+1)/2*innerWidth,y=(1-V.y)/2*innerHeight,dd=Math.hypot(x-ev.clientX,y-ev.clientY);if(dd<bd){bd=dd;best=e;}}
 if(best)best.emit('hit',{clientX:ev.clientX,clientY:ev.clientY},false);});
t.addEventListener('targetFound',()=>{if(!started){started=true;begin();}});
window.__game={begin,end,get score(){return score;},items};
})();
