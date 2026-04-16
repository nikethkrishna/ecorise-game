'use strict';
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RENDERER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const canvas3 = document.getElementById('c3d');
const DPR_CAP = 1.0;
let dynamicPixelRatio = Math.min(window.devicePixelRatio || 1, DPR_CAP);
let smoothFrame = 1 / 60;
let perfTuneClock = 0;

const renderer = new THREE.WebGLRenderer({
  canvas:canvas3,
  antialias:false,
  powerPreference:'high-performance'
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setPixelRatio(dynamicPixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight,false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(0x000000,0);
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const skyCanvas = document.getElementById('skyC');
function syncRendererSize(){
  renderer.setPixelRatio(dynamicPixelRatio);
  renderer.setSize(window.innerWidth,window.innerHeight,false);
}
function rsz(){
  skyCanvas.width=0;
  skyCanvas.height=0;
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  syncRendererSize();
}
window.addEventListener('resize',rsz);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8b3a10,35,110);

const camera = new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,160);
const DEFAULT_CAM={theta:0.58,phi:0.68,radius:31,target:new THREE.Vector3(0.4,0.8,4.5)};
const CAM_MIN_PHI=0.28;
const CAM_MAX_PHI=1.08;
let camTheta=DEFAULT_CAM.theta, camPhi=DEFAULT_CAM.phi, camRadius=DEFAULT_CAM.radius, camTgt=DEFAULT_CAM.target.clone();

// Lights
const ambL = new THREE.AmbientLight(0xffd8a0,1.2); scene.add(ambL);
const sunL = new THREE.DirectionalLight(0xfff0cc,2.0);
sunL.position.set(20,35,14); sunL.castShadow=true;
sunL.shadow.mapSize.set(768,768);
sunL.shadow.camera.near=1; sunL.shadow.camera.far=90;
sunL.shadow.camera.left=-40; sunL.shadow.camera.right=40;
sunL.shadow.camera.top=40; sunL.shadow.camera.bottom=-40;
scene.add(sunL);
const fillL = new THREE.DirectionalLight(0xaaccff,0.5); fillL.position.set(-12,10,-10); scene.add(fillL);
const toxL = new THREE.PointLight(0xff4400,1.8,30); toxL.position.set(0,5,0); scene.add(toxL);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CAMERA CONTROLS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let drag=false,rDrag=false,mDown={x:0,y:0},pm={x:0,y:0};
canvas3.addEventListener('mousedown',e=>{drag=true;rDrag=e.button===2;pm={x:e.clientX,y:e.clientY};mDown={x:e.clientX,y:e.clientY};e.preventDefault();});
canvas3.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mouseup',()=>drag=false);
window.addEventListener('mousemove',e=>{
  if(!drag)return;
  const dx=e.clientX-pm.x,dy=e.clientY-pm.y; pm={x:e.clientX,y:e.clientY};
  if(rDrag){const r=new THREE.Vector3(-Math.sin(camTheta),0,Math.cos(camTheta));camTgt.addScaledVector(r,-dx*0.055);camTgt.y=Math.max(0,Math.min(6,camTgt.y+dy*0.055));}
  else{camTheta-=dx*0.007;camPhi=Math.max(CAM_MIN_PHI,Math.min(CAM_MAX_PHI,camPhi-dy*0.005));}
  updateCam();
});
canvas3.addEventListener('wheel',e=>{camRadius=Math.max(8,Math.min(72,camRadius+e.deltaY*0.055));updateCam();},{passive:true});
document.addEventListener('keydown',onKey);

function updateCam(){
  camera.position.x=camTgt.x+camRadius*Math.sin(camPhi)*Math.sin(camTheta);
  camera.position.y=camTgt.y+camRadius*Math.cos(camPhi);
  camera.position.z=camTgt.z+camRadius*Math.sin(camPhi)*Math.cos(camTheta);
  camera.lookAt(camTgt);
}
updateCam();

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const cloneTex=(tex,rx=1,ry=1)=>{
  const copy=tex.clone();
  copy.repeat.set(rx,ry);
  copy.wrapS=THREE.RepeatWrapping;
  copy.wrapT=THREE.RepeatWrapping;
  copy.anisotropy=MAX_ANISO;
  copy.encoding=THREE.sRGBEncoding;
  copy.needsUpdate=true;
  return copy;
};
const M=(c,r=0.75,m=0,map=null)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,map});
const ME=(c,e,ei)=>new THREE.MeshStandardMaterial({color:c,emissive:e,emissiveIntensity:ei,roughness:0.3});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const R=()=>Math.random();
const rr=(a,b)=>a+(b-a)*R();
const lC=(c1,c2,t)=>new THREE.Color(lerp(c1.r,c2.r,t),lerp(c1.g,c2.g,t),lerp(c1.b,c2.b,t));
const disposeMaterial=material=>{
  if(!material)return;
  if(Array.isArray(material)){material.forEach(disposeMaterial);return;}
  if(material.map?.dispose)material.map.dispose();
  if(material.alphaMap?.dispose)material.alphaMap.dispose();
  if(material.dispose)material.dispose();
};
function disposeObject3D(root){
  if(!root?.traverse)return;
  root.traverse(obj=>{
    if(obj.geometry?.dispose)obj.geometry.dispose();
    if(obj.material)disposeMaterial(obj.material);
  });
}
function mkCanvasTexture(size,paint){
  const cv=document.createElement('canvas');
  cv.width=size;
  cv.height=size;
  const ctx=cv.getContext('2d');
  paint(ctx,size);
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=THREE.RepeatWrapping;
  tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=MAX_ANISO;
  tex.encoding=THREE.sRGBEncoding;
  return tex;
}
function scatterNoise(ctx,size,count,palette,minA=.05,maxA=.18){
  for(let i=0;i<count;i++){
    ctx.globalAlpha=rr(minA,maxA);
    ctx.fillStyle=palette[Math.floor(R()*palette.length)];
    ctx.fillRect(rr(-8,size),rr(-8,size),rr(2,size*.16),rr(2,size*.12));
  }
  ctx.globalAlpha=1;
}
const TEX={
  ground:mkCanvasTexture(256,(ctx,size)=>{
    const grad=ctx.createLinearGradient(0,0,0,size);
    grad.addColorStop(0,'#56402d');
    grad.addColorStop(.55,'#372619');
    grad.addColorStop(1,'#24160d');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,size,size);
    scatterNoise(ctx,size,180,['#6b533b','#2d1d13','#1a100a','#8a6a48'],.04,.14);
    ctx.strokeStyle='rgba(25,13,7,.24)';
    ctx.lineWidth=2;
    for(let i=0;i<24;i++){
      ctx.beginPath();
      const y=rr(0,size);
      ctx.moveTo(rr(-12,size*.2),y);
      ctx.bezierCurveTo(rr(size*.2,size*.4),y+rr(-18,18),rr(size*.55,size*.78),y+rr(-18,18),rr(size*.75,size+10),y+rr(-10,10));
      ctx.stroke();
    }
  }),
  concrete:mkCanvasTexture(256,(ctx,size)=>{
    const grad=ctx.createLinearGradient(0,0,size,size);
    grad.addColorStop(0,'#8a8478');
    grad.addColorStop(1,'#5e5a52');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,size,size);
    scatterNoise(ctx,size,220,['#4d4943','#b1aba0','#777168'],.03,.12);
    ctx.strokeStyle='rgba(255,255,255,.06)';
    for(let i=0;i<size;i+=24){
      ctx.beginPath();
      ctx.moveTo(i,0);
      ctx.lineTo(i+rr(-10,10),size);
      ctx.stroke();
    }
  }),
  roof:mkCanvasTexture(256,(ctx,size)=>{
    const grad=ctx.createLinearGradient(0,0,0,size);
    grad.addColorStop(0,'#7c3927');
    grad.addColorStop(1,'#4a1f15');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,size,size);
    for(let y=0;y<size;y+=18){
      ctx.fillStyle=y%36===0?'rgba(255,255,255,.08)':'rgba(0,0,0,.12)';
      ctx.fillRect(0,y,size,3);
    }
    scatterNoise(ctx,size,110,['#33150d','#a35744','#5b291c'],.03,.1);
  }),
  road:mkCanvasTexture(512,(ctx,size)=>{
    ctx.fillStyle='#2e3032';
    ctx.fillRect(0,0,size,size);
    scatterNoise(ctx,size,360,['#202224','#4b4e50','#666968','#151617'],.03,.14);
    ctx.fillStyle='rgba(198,190,162,.12)';
    ctx.fillRect(0,0,size,34);
    ctx.fillRect(0,size-34,size,34);
    ctx.fillStyle='rgba(218,197,128,.2)';
    for(let x=14;x<size;x+=74)ctx.fillRect(x,size*.5-3,42,6);
    ctx.strokeStyle='rgba(0,0,0,.2)';
    ctx.lineWidth=2;
    for(let i=0;i<18;i++){
      ctx.beginPath();
      ctx.moveTo(rr(0,size),rr(0,size));
      ctx.lineTo(rr(0,size),rr(0,size));
      ctx.stroke();
    }
  }),
  solar:mkCanvasTexture(256,(ctx,size)=>{
    const grad=ctx.createLinearGradient(0,0,0,size);
    grad.addColorStop(0,'#173252');
    grad.addColorStop(.55,'#09192a');
    grad.addColorStop(1,'#040d16');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,size,size);
    ctx.strokeStyle='rgba(120,174,255,.36)';
    ctx.lineWidth=2;
    for(let i=0;i<=8;i++){
      const p=(i/8)*size;
      ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,size);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(size,p);ctx.stroke();
    }
    ctx.fillStyle='rgba(255,255,255,.08)';
    ctx.fillRect(0,0,size,size*.16);
  })
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  WORLD CONSTANTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const GW=22,GH=22,CELL=3.8;
const cPos=(r,c)=>({x:(c-GW/2+.5)*CELL,z:(r-GH/2+.5)*CELL});
function worldToCell(x,z){
  const c=Math.floor((x+GW*CELL/2)/CELL);
  const r=Math.floor((z+GH*CELL/2)/CELL);
  if(r<0||r>=GH||c<0||c>=GW)return null;
  return {r,c,key:`${r}_${c}`};
}

const FACTORY_NAMES=['TOXICORP','SMOGWORKS','POLLUTEX','GRIMDUST','DARKFUEL','ASHTECH','FUMECO','SOOTLAB','CHEMAXIS','RUSTVEIL'];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GAME STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let GS={};
let selB=null, demoMode=false, cleanMode=false;
let gTimer=null,dayTimer=null,aiTimer=null,raidTimer=null,raidStartTimer=null,running=false;
let tiles=[],cells={};
let humans=[],children=[],smokes=[],windmills=[],rings=[],drips=[],fxParts=[];
let roadMeshes=[],streamMeshes=[],sewageMeshes=[],carObjs=[],grassPts=[];
let workerObjs=[],missileObjs=[],bombObjs=[];
let atmParts=[], skyPhase=0, treesBuilt=0;
let demoUsed=0,demoResetTimer=60,gameSeconds=0,animT=0;
let hoverMesh,curMission=0,mActive=false;
let factoryRegistry=[],userBuildingRegistry=[],nextFactoryId=1,nextBuildingId=1;
let roadSegments=[],roadAdjacency=new Map();
let ponds=[],waterMilestoneIndex=0,skyDome=null,skyUniforms=null,sunOrb=null,sunGlow=null,skyClouds=[];
const raycaster=new THREE.Raycaster(), mouse2=new THREE.Vector2();
const WATER_THRESHOLDS=[25,50,75,100];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SKY PHASES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const SKY=[
  {s1:'#08010a',s2:'#2e0600',cl:'rgba(80,15,8,.72)', fog:0x1a0400,fN:22,fF:60,aI:.7,aC:0xaa2200,sI:.9,sC:0xff2200,tI:2.2},
  {s1:'#160300',s2:'#5a1500',cl:'rgba(120,40,12,.65)',fog:0x280900,fN:26,fF:68,aI:1.0,aC:0xcc4411,sI:1.3,sC:0xff5500,tI:1.6},
  {s1:'#5a5855',s2:'#8a8580',cl:'rgba(150,145,135,.6)',fog:0x706860,fN:30,fF:80,aI:1.3,aC:0xccbbaa,sI:1.6,sC:0xeeddbb,tI:.4},
  {s1:'#9a9890',s2:'#c0bdb5',cl:'rgba(190,188,180,.52)',fog:0x988880,fN:36,fF:95,aI:1.5,aC:0xddd0c8,sI:1.9,sC:0xfff5ee,tI:.05},
  {s1:'#1e4fa8',s2:'#6fb0ed',cl:null,                  fog:0x7aaacc,fN:50,fF:120,aI:2.0,aC:0xffd8a0,sI:2.5,sC:0xfff5e0,tI:0},
];

function getAirPhase(a){return a<25?0:a<50?1:a<75?2:a<90?3:4;}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  BUILD DEFINITIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const BUILDS=[
  {id:'solar',   nm:'Solar Farm',   ico:'SOL', cost:80,  aD:7,wD:0, hD:2, pD:30, polD:-6, cpd:15, green:true, skyReq:2, desc:'Clean energy - dark blue panels',fx:'+Air -Pollution'},
  {id:'tree',    nm:'Tree Grove',   ico:'TR',  cost:35,  aD:5,wD:2, hD:5, pD:0,  polD:-3, cpd:0,             desc:'Purifies air - grows grass nearby',fx:'+Air +Happiness'},
  {id:'house',   nm:'Eco House',    ico:'HOME',cost:60,  aD:-1,wD:-1,hD:3,pD:30, polD:0,  cpd:10,            desc:'Homes - +30 population - +10/day',fx:'+Population +Happiness'},
  {id:'filter',  nm:'Water Filter', ico:'WTR', cost:100, aD:2,wD:14,hD:4, pD:0,  polD:-4, cpd:5,  filt:true, desc:'Cleans toxic water supply',fx:'+Water -Pollution'},
  {id:'market',  nm:'Market',       ico:'MKT', cost:120, aD:0,wD:0, hD:8, pD:10, polD:0,  cpd:25,            desc:'Trade hub - +25/day',fx:'+Happiness +Coins'},
  {id:'hospital',nm:'Med Center',   ico:'MED', cost:180, aD:2,wD:2, hD:10,pD:50, polD:-2, cpd:8,             desc:'Heals the city - +50 population',fx:'+Stats +Population'},
  {id:'wind',    nm:'Wind Farm',    ico:'WND', cost:150, aD:9,wD:0, hD:2, pD:0,  polD:-7, cpd:20, green:true, desc:'Air purifier - lowers pollution',fx:'+Air -Pollution'},
  {id:'school',  nm:'Eco School',   ico:'SCH', cost:200, aD:3,wD:3, hD:12,pD:40, polD:-2, cpd:12, skyReq:2,  desc:'Educates the city - children arrive',fx:'+All Stats'},
];
function calcEco(s){return Math.round((s.air+s.water+s.happy+(s.pop/10))/(4+s.pollution/80));}

function focusWorld(x,z,y=.8){
  camTgt.set(x,y,z);
  updateCam();
}

function getFactoryRecord(factoryId){
  return factoryRegistry.find(entry=>entry.id===factoryId);
}

function getBuildingRecord(buildingId){
  return userBuildingRegistry.find(entry=>entry.id===buildingId);
}

function registerFactoryRecord(cellKey,mesh,label,kind='factory'){
  const id=`F${nextFactoryId++}`;
  const record={id,cellKey,label,status:'active',kind,lastPos:{x:mesh.position.x,z:mesh.position.z}};
  factoryRegistry.push(record);
  mesh.userData.factoryId=id;
  mesh.userData.factoryName=label;
  return record;
}

function registerUserBuildingRecord(cellKey,bd,mesh){
  const id=`B${nextBuildingId++}`;
  const record={id,cellKey,label:bd.nm,status:'active',kind:bd.id,lastPos:{x:mesh.position.x,z:mesh.position.z}};
  userBuildingRegistry.push(record);
  mesh.userData.buildingId=id;
  mesh.userData.owner='player';
  mesh.userData.label=bd.nm;
  return record;
}

function setRecordDestroyed(record){
  if(!record)return;
  record.status='destroyed';
}

function activeFilterRecords(){
  return userBuildingRegistry.filter(entry=>entry.kind==='filter'&&entry.status==='active');
}

function pruneAnimatedRefs(root){
  if(!root?.getObjectById)return;
  const owns=obj=>!!obj&&!!root.getObjectById(obj.id);
  smokes=smokes.filter(entry=>!owns(entry.mesh));
  rings=rings.filter(entry=>!owns(entry.mesh));
  drips=drips.filter(entry=>!owns(entry.mesh));
  windmills=windmills.filter(mesh=>!owns(mesh));
  grassPts=grassPts.filter(entry=>!owns(entry.mesh));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MISSIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const MISSIONS=[
  {tag:'MISSION 1',guide:"The city's ponds are <em>choked with toxic runoff</em>. Use <em>CLEAN RUNOFF</em> and click the <strong>dark brown polluted ponds</strong> directly to purify them. Clean <strong>3 ponds</strong>.",check:g=>g.sewCleaned>=3,prog:g=>`Ponds cleaned: ${g.sewCleaned}/3`},
  {tag:'MISSION 2',guide:"Those chimneys will not stop. Use <em>DEMOLISH</em>, click a factory to arm a demolition charge. Demolish <strong>2 factories</strong> and watch the ponds start to clear.",check:g=>g.facDest>=2,prog:g=>`Demolished: ${g.facDest}/2`},
  {tag:'MISSION 3',guide:"Build <strong>2 Solar Farms</strong> or <strong>2 Wind Farms</strong>. Solar needs grey sky first (Air above 50). Wind works immediately. Select from the build bar below.",check:g=>g.greenBuilt>=2,prog:g=>`Built: ${g.greenBuilt}/2`},
  {tag:'MISSION 4',guide:"Stabilize the water grid. Build <strong>2 Water Filters</strong> so clean rivers can branch out into ponds and push back the toxic runoff.",check:g=>g.filterBuilt>=2,prog:g=>`Filters: ${g.filterBuilt}/2`},
  {tag:'MISSION 5',guide:"Demolish <strong>5 factories total</strong> and reduce Pollution below 40. <em>The AI destroys your buildings after 50 seconds - rebuild fast.</em> You have 4 demolitions per minute.",check:g=>g.facDest>=5&&g.pollution<40,prog:g=>`Factories: ${g.facDest}/5 | Pollution: ${Math.round(g.pollution)}/40`},
  {tag:'MISSION 6',guide:"Rebuild society. Build homes, markets, and a hospital. Get <strong>Population above 200</strong> and <strong>Happiness above 50.</strong>",check:g=>g.pop>=200&&g.happy>=50,prog:g=>`Population: ${g.pop}/200 | Happiness: ${Math.round(g.happy)}/50`},
  {tag:'FINAL MISSION',guide:"The final push. Achieve <strong>ECO SCORE 65%+</strong>, keep Pollution below 25, and reach Population 300+. <em>The city will breathe again.</em>",check:g=>calcEco(g)>=65&&g.pollution<25&&g.pop>=300,prog:g=>`Eco: ${calcEco(g)}% | Pollution: ${Math.round(g.pollution)} | Population: ${g.pop}`},
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  3D BUILDERS â€” all realistic, no tiles
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// RUIN
function mkRuin(x,z){
  const g=new THREE.Group();
  const wm=M(0x4a3020,.95);
  const h=rr(.8,2.2);
  const w1=new THREE.Mesh(new THREE.BoxGeometry(.28,h,rr(1.2,2)),wm); w1.position.set(-.5,h/2,0);w1.castShadow=true;g.add(w1);
  const h2=rr(.4,h*.8);
  const w2=new THREE.Mesh(new THREE.BoxGeometry(rr(1,1.8),h2,.28),wm); w2.position.set(0,h2/2,-.4);w2.castShadow=true;g.add(w2);
  for(let i=0;i<5;i++){const ds=rr(.1,.28);const d=new THREE.Mesh(new THREE.BoxGeometry(ds,ds*.4,ds),M(0x5a3c22,.97));d.position.set(rr(-1.1,1.1),ds*.2,rr(-1.1,1.1));d.rotation.y=R()*Math.PI;d.castShadow=true;g.add(d);}
  g.position.set(x,0,z);return g;
}

// FACTORY - industrial core + name billboard
function mkFactory(x,z,name){
  const g=new THREE.Group();
  const label=(name||'FACTORY').substring(0,10);
  const wallMat=M(0x8a7c6c,.97,.08,cloneTex(TEX.concrete,1.4,1.2));
  const roofMat=M(0x4f3d31,.92,.12,cloneTex(TEX.roof,1.2,1.2));
  const metalMat=M(0x5b5c5c,.58,.48);
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.8,2.2,2.6),wallMat);
  body.position.y=1.1;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const annex=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.3,1.05),wallMat);
  annex.position.set(-.85,.65,-.78);annex.castShadow=true;annex.receiveShadow=true;g.add(annex);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(2.92,.16,2.72),roofMat);
  roof.position.y=2.22;roof.receiveShadow=true;g.add(roof);
  [[-.82,2.42,-.72],[.86,2.42,-.58],[.14,2.42,.18]].forEach(([vx,vy,vz])=>{
    const vent=new THREE.Mesh(new THREE.BoxGeometry(.32,.18,.48),metalMat);
    vent.position.set(vx,vy,vz);vent.castShadow=true;g.add(vent);
  });
  const wm=ME(0x2c241d,0xff7a2a,.7);
  [[-1,1.05,1.34],[-.34,1.05,1.34],[.34,1.05,1.34],[1,1.05,1.34],[-1,1.56,1.34],[-.34,1.56,1.34],[.34,1.56,1.34],[1,1.56,1.34]].forEach(([wx,wy,wz])=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(.36,.24,.08),wm);
    w.position.set(wx,wy,wz);g.add(w);
  });
  [[.6,.4],[-.6,.5],[.05,-.6]].forEach(([cx,cz])=>{
    const ch=new THREE.Mesh(new THREE.CylinderGeometry(.15,.21,2.8,10),M(0x3f3b37,.76,.44));
    ch.position.set(cx,3.2,cz);ch.castShadow=true;g.add(ch);
    const cap=new THREE.Mesh(new THREE.TorusGeometry(.18,.03,6,12),metalMat);
    cap.position.set(cx,4.55,cz);cap.rotation.x=Math.PI/2;g.add(cap);
    for(let j=0;j<4;j++){
      const sm=new THREE.Mesh(new THREE.SphereGeometry(.22+j*.15,6,6),new THREE.MeshBasicMaterial({color:[0x847766,0x665a48,0x4a3b2d,0x231c16][j],transparent:true,opacity:.48-j*.1}));
      sm.position.set(cx,4.4+j*.6,cz);
      smokes.push({mesh:sm,base:4.4+j*.6,phase:R()*Math.PI*2});
      g.add(sm);
    }
  });
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.25,8),M(0x2e4631,.62,.34));
  sp.position.set(-1.32,.58,.46);sp.rotation.z=Math.PI/2;g.add(sp);
  const sd=new THREE.Mesh(new THREE.SphereGeometry(.13,7,7),new THREE.MeshBasicMaterial({color:0x2ca53a,transparent:true,opacity:.8}));
  sd.position.set(-1.78,.1,.4);drips.push({mesh:sd,phase:R()*Math.PI*2});g.add(sd);
  const nc=document.createElement('canvas');nc.width=256;nc.height=56;
  const ctx=nc.getContext('2d');
  const signGrad=ctx.createLinearGradient(0,0,0,56);
  signGrad.addColorStop(0,'#120d0a');
  signGrad.addColorStop(1,'#2a170d');
  ctx.fillStyle=signGrad;ctx.fillRect(0,0,256,56);
  ctx.strokeStyle='#f18d44';ctx.lineWidth=3;ctx.strokeRect(2,2,252,52);
  ctx.font='bold 18px monospace';ctx.fillStyle='#ffd4a6';ctx.textAlign='center';
  ctx.fillText(label,128,38);
  const nb=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(nc),transparent:true}));
  nb.position.set(0,2.82,1.38);nb.userData.factoryName=label;g.add(nb);
  g.position.set(x,0,z);
  g.userData={isFactory:true,factoryName:label};
  return g;
}

// AI HQ
function mkAIHQ(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(3,3.5,3),M(0x17141d,.94,.26,cloneTex(TEX.concrete,1.2,1.4)));
  body.position.y=1.75;body.castShadow=true;g.add(body);
  const tower=new THREE.Mesh(new THREE.BoxGeometry(1.2,2,1.2),M(0x0e0a16,.92,.34,cloneTex(TEX.concrete,.8,.8)));
  tower.position.y=4.25;tower.castShadow=true;g.add(tower);
  const wm=ME(0x110011,0x8800aa,.9);
  for(let i=0;i<4;i++){const w=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.07),wm);w.position.set(-.42+i*.28,1.8,1.52);g.add(w);}
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.4,6),M(0x555566,.5,.8));
  ant.position.y=6.2;g.add(ant);
  const nc2=document.createElement('canvas');nc2.width=128;nc2.height=44;
  const ctx2=nc2.getContext('2d');ctx2.fillStyle='#080010';ctx2.fillRect(0,0,128,44);
  ctx2.strokeStyle='#8800aa';ctx2.lineWidth=2;ctx2.strokeRect(1,1,126,42);
  ctx2.font='bold 14px monospace';ctx2.fillStyle='#cc44ff';ctx2.textAlign='center';ctx2.fillText('AI  HQ',64,28);
  const nb2=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(nc2),transparent:true}));
  nb2.position.set(0,3.2,1.55);g.add(nb2);
  g.position.set(x,0,z);return g;
}

// ROAD (single segment as flat box)
function mkRoadSeg(ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az;
  const len=Math.sqrt(dx*dx+dz*dz);
  const cx=(ax+bx)/2,cz=(az+bz)/2;
  const g=new THREE.Group();
  const road=new THREE.Mesh(new THREE.PlaneGeometry(len,1.35),M(0xffffff,.98,.02,cloneTex(TEX.road,Math.max(1,len/5),1)));
  road.rotation.x=-Math.PI/2;road.receiveShadow=true;g.add(road);
  [-.62,.62].forEach(side=>{
    const shoulder=new THREE.Mesh(new THREE.PlaneGeometry(len*.98,.06),new THREE.MeshBasicMaterial({color:0xc3b68a,transparent:true,opacity:.28}));
    shoulder.rotation.x=-Math.PI/2;shoulder.position.set(0,.011,side);g.add(shoulder);
  });
  g.position.set(cx,.01,cz);
  g.rotation.y=Math.atan2(-dz,dx);
  roadMeshes.push(g);scene.add(g);
  return g;
}

// (Sewage pipes removed - ponds are used instead)

// SOLAR FARM â€” dark navy blue panels
function mkSolar(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.8,.12,2.8),M(0x4c4d51,.9,.08,cloneTex(TEX.concrete,1.2,1.2)));
  base.position.y=.05;g.add(base);
  const pm1=M(0xffffff,.12,.82,cloneTex(TEX.solar,1,1));
  const pm2=M(0xe6f1ff,.1,.84,cloneTex(TEX.solar,1,1));
  const frameMat=M(0x7b838a,.46,.72);
  for(let i=0;i<2;i++) for(let j=0;j<2;j++){
    const frame=new THREE.Mesh(new THREE.BoxGeometry(1.16,.08,1.16),frameMat);
    frame.position.set(-0.65+i*1.3,.69,-.65+j*1.3);frame.rotation.x=-.3;frame.castShadow=true;g.add(frame);
    const p=new THREE.Mesh(new THREE.BoxGeometry(1.06,.03,1.06),(i+j)%2===0?pm1:pm2);
    p.position.set(-0.65+i*1.3,.73,-.65+j*1.3);p.rotation.x=-.3;g.add(p);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.72,8),M(0x666c74,.5,.72));
    pole.position.set(-0.65+i*1.3,.35,-.65+j*1.3);g.add(pole);
  }
  g.position.set(x,0,z);return g;
}

// TREE GROVE
function mkTree(x,z){
  const g=new THREE.Group();
  [[-.62,.02],[.58,-.08],[0,.58],[.34,-.52],[-.42,-.34]].forEach(([px,pz],i)=>{
    const h=rr(1.35,2.2);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.12,h*.48,8),M(0x6a4325,.94));
    trunk.position.set(px,h*.24,pz);trunk.castShadow=true;g.add(trunk);
    const lc=[0x355e2b,0x427438,0x274f21][i%3];
    for(let l=0;l<3;l++){
      const crown=new THREE.Mesh(new THREE.SphereGeometry(rr(.28,.42),8,8),M(lc,.88));
      crown.position.set(px+rr(-.07,.07),h*.54+l*.2,pz+rr(-.07,.07));
      crown.scale.set(rr(.92,1.32),rr(.92,1.22),rr(.92,1.32));
      crown.castShadow=true;
      g.add(crown);
    }
  });
  g.position.set(x,0,z);return g;
}

// ── PLANT PATCH HELPERS ──────────────────────────────────────
// Each function returns a THREE.Group positioned at (x,0,z)
// with scale (.01,.01,.01) so it grows in via grassPts.

function _addGroundPatch(g,col){
  const gnd=new THREE.Mesh(
    new THREE.PlaneGeometry(CELL*.88,CELL*.88),
    M(col,.96,0,cloneTex(TEX.ground,.55,.55))
  );
  gnd.rotation.x=-Math.PI/2; gnd.position.y=.018; g.add(gnd);
}

// TYPE 0 – Blade grass (dense green blades, varying heights)
function mkPlantGrass(x,z){
  const g=new THREE.Group();
  _addGroundPatch(g,0x3a6b26);
  const cols=[0x4e9035,0x5daa40,0x3d7a28,0x66bb4a,0x2e5e1e,0x4a8830];
  for(let i=0;i<32;i++){
    const h=rr(.16,.56);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(rr(.04,.09),h),M(cols[i%cols.length],.9));
    b.material.side=THREE.DoubleSide;
    b.position.set(rr(-1.5,1.5),h/2,rr(-1.5,1.5));
    b.rotation.y=R()*Math.PI; b.rotation.x=rr(-.1,.1);
    g.add(b);
  }
  g.position.set(x,0,z); g.scale.set(.01,.01,.01);
  grassPts.push({mesh:g,s:0}); return g;
}

// TYPE 1 – Wildflowers (stems with coloured round flower heads)
function mkPlantFlowers(x,z){
  const g=new THREE.Group();
  _addGroundPatch(g,0x3d6e22);
  const petalCols=[0xff5577,0xffdd33,0xcc44ee,0xff8833,0x44ccff,0xff4499];
  for(let i=0;i<18;i++){
    const sh=rr(.25,.55);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.016,.02,sh,5),M(0x4a7a2a,.9));
    stem.position.set(rr(-1.3,1.3),sh/2,rr(-1.3,1.3)); g.add(stem);
    // 5-petal flower: centre + 5 small spheres around it
    const cx=stem.position.x, cz=stem.position.z, cy=sh+.02;
    const pc=petalCols[i%petalCols.length];
    const centre=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),M(0xffee88,.6));
    centre.position.set(cx,cy,cz); g.add(centre);
    for(let p=0;p<5;p++){
      const pa=p*(Math.PI*2/5);
      const petal=new THREE.Mesh(new THREE.SphereGeometry(.045,5,5),M(pc,.7));
      petal.position.set(cx+Math.cos(pa)*.1,cy,cz+Math.sin(pa)*.1); g.add(petal);
    }
  }
  // Filler grass blades
  for(let i=0;i<10;i++){
    const h=rr(.1,.28);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(.06,h),M(0x4e9035,.9));
    b.material.side=THREE.DoubleSide;
    b.position.set(rr(-1.4,1.4),h/2,rr(-1.4,1.4)); b.rotation.y=R()*Math.PI; g.add(b);
  }
  g.position.set(x,0,z); g.scale.set(.01,.01,.01);
  grassPts.push({mesh:g,s:0}); return g;
}

// TYPE 2 – Fern patch (wide flat leaves fanning outward)
function mkPlantFerns(x,z){
  const g=new THREE.Group();
  _addGroundPatch(g,0x2e5e1e);
  const fernCols=[0x2d7020,0x3d9430,0x1e5016,0x4aaa38];
  for(let i=0;i<14;i++){
    const lw=rr(.35,.7), lh=rr(.12,.24);
    const leaf=new THREE.Mesh(new THREE.PlaneGeometry(lw,lh),M(fernCols[i%fernCols.length],.85));
    leaf.material.side=THREE.DoubleSide;
    leaf.position.set(rr(-1.1,1.1),lh*.5+.05,rr(-1.1,1.1));
    leaf.rotation.y=R()*Math.PI*2;
    leaf.rotation.x=rr(-.3,.05); // droop slightly forward
    g.add(leaf);
  }
  // Central rosette of short upright blades
  for(let i=0;i<8;i++){
    const h=rr(.18,.38);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(.055,h),M(0x3d8a2a,.9));
    b.material.side=THREE.DoubleSide;
    b.position.set(rr(-.6,.6),h/2,rr(-.6,.6)); b.rotation.y=R()*Math.PI; g.add(b);
  }
  g.position.set(x,0,z); g.scale.set(.01,.01,.01);
  grassPts.push({mesh:g,s:0}); return g;
}

// TYPE 3 – Mushroom cluster (small caps + stems + ground blades)
function mkPlantMushrooms(x,z){
  const g=new THREE.Group();
  _addGroundPatch(g,0x2e4e1a);
  const capCols=[0xcc3311,0xff8822,0xffcc44,0xdd44aa,0x6688dd,0xff6644];
  for(let i=0;i<9;i++){
    const sh=rr(.1,.3);
    const stemR=rr(.025,.042);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(stemR,stemR*1.2,sh,7),M(0xe0d8cc,.85));
    stem.position.set(rr(-1.2,1.2),sh/2,rr(-1.2,1.2)); g.add(stem);
    const capR=rr(.06,.15);
    const cap=new THREE.Mesh(
      new THREE.SphereGeometry(capR,8,6,0,Math.PI*2,0,Math.PI*.65),
      M(capCols[i%capCols.length],.6)
    );
    cap.position.set(stem.position.x,sh+capR*.3,stem.position.z); g.add(cap);
    // White spots on cap
    if(R()>.4){
      for(let s=0;s<3;s++){
        const spot=new THREE.Mesh(new THREE.SphereGeometry(.018,4,4),M(0xffffff,.5));
        const sa=R()*Math.PI*2, sr=capR*.55;
        spot.position.set(
          stem.position.x+Math.cos(sa)*sr,
          sh+capR*.5,
          stem.position.z+Math.sin(sa)*sr
        ); g.add(spot);
      }
    }
  }
  // Ground moss blades
  for(let i=0;i<12;i++){
    const h=rr(.08,.2);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(.05,h),M([0x3a7a28,0x2e6020][i%2],.9));
    b.material.side=THREE.DoubleSide;
    b.position.set(rr(-1.4,1.4),h/2,rr(-1.4,1.4)); b.rotation.y=R()*Math.PI; g.add(b);
  }
  g.position.set(x,0,z); g.scale.set(.01,.01,.01);
  grassPts.push({mesh:g,s:0}); return g;
}

// TYPE 4 – Low bush patch (rounded shrubs + berries)
function mkPlantBushes(x,z){
  const g=new THREE.Group();
  _addGroundPatch(g,0x355a20);
  const bushCols=[0x2e8822,0x3daa30,0x1c6a18,0x4abf38,0x226a18];
  for(let i=0;i<7;i++){
    const br=rr(.16,.38);
    const bush=new THREE.Mesh(new THREE.SphereGeometry(br,8,6),M(bushCols[i%bushCols.length],.88));
    bush.scale.set(rr(.9,1.5),rr(.5,.8),rr(.9,1.4));
    bush.position.set(rr(-1.1,1.1),br*.4,rr(-1.1,1.1));
    bush.castShadow=true; g.add(bush);
  }
  // Berries
  const berryCols=[0xff2222,0xffaa11,0xff44aa,0xaa22ff];
  for(let i=0;i<8;i++){
    const berry=new THREE.Mesh(new THREE.SphereGeometry(rr(.03,.055),5,5),M(berryCols[i%berryCols.length],.55));
    berry.position.set(rr(-1.1,1.1),rr(.12,.38),rr(-1.1,1.1)); g.add(berry);
  }
  // Short grass underneath
  for(let i=0;i<8;i++){
    const h=rr(.08,.18);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(.055,h),M(0x4a9030,.9));
    b.material.side=THREE.DoubleSide;
    b.position.set(rr(-1.4,1.4),h/2,rr(-1.4,1.4)); b.rotation.y=R()*Math.PI; g.add(b);
  }
  g.position.set(x,0,z); g.scale.set(.01,.01,.01);
  grassPts.push({mesh:g,s:0}); return g;
}

// Dispatcher – cycles through the 5 plant types in order
// mkGrass is kept as alias so existing code that calls mkGrass still works
let _plantIdx=0;
const _plantFns=[mkPlantGrass,mkPlantFlowers,mkPlantFerns,mkPlantMushrooms,mkPlantBushes];
function mkGrass(x,z){
  return _plantFns[_plantIdx++%_plantFns.length](x,z);
}

// ECO HOUSE
function mkHouse(x,z){
  const g=new THREE.Group();
  const wallMat=M(0xe0d5c0,.88,.04,cloneTex(TEX.concrete,.7,.7));
  const walls=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.45,2.0),wallMat);
  walls.position.y=.76;walls.castShadow=true;walls.receiveShadow=true;g.add(walls);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.72,1.08,4),M(0xffffff,.82,.1,cloneTex(TEX.roof,.9,.9)));
  roof.position.y=1.96;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  const porch=new THREE.Mesh(new THREE.BoxGeometry(.78,.08,.62),M(0x8a7c68,.92,.08));
  porch.position.set(0,.08,1.05);g.add(porch);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.34,.68,.08),M(0x6a4324,.9));
  door.position.set(0,.58,1.03);g.add(door);
  [[-0.58,.98],[.58,.98]].forEach(([wx,wy])=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(.32,.34,.08),ME(0xfff1ca,0xffd878,.45));
    w.position.set(wx,wy,1.03);g.add(w);
  });
  const chim=new THREE.Mesh(new THREE.BoxGeometry(.22,.52,.22),M(0x7a4428,.9));
  chim.position.set(.45,2.2,-.3);chim.castShadow=true;g.add(chim);
  g.position.set(x,0,z);return g;
}

// WATER FILTER
function mkFilter(x,z){
  const g=new THREE.Group();
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,2.2,10),M(0x1a88bb,.3,.85));
  tank.position.y=1.1;tank.castShadow=true;g.add(tank);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(.8,10,8,0,Math.PI*2,0,Math.PI/2),M(0x1166aa,.25,.9));
  dome.position.y=2.2;dome.castShadow=true;g.add(dome);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.05,4,22),ME(0x29aeff,0x1188ff,.7));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;
  rings.push({mesh:ring,phase:R()*Math.PI*2});g.add(ring);
  // Output nozzle (decorative)
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.6,7),M(0x334466,.6,.7));
  sp.position.set(-.62,.42,0);sp.rotation.z=Math.PI/2;g.add(sp);
  g.position.set(x,0,z);return g;
}

// MARKET
function mkMarket(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.25,2.3),M(0xf0d8a6,.88,.04,cloneTex(TEX.concrete,.75,.75)));
  body.position.y=.62;body.castShadow=true;g.add(body);
  const can=new THREE.Mesh(new THREE.BoxGeometry(2.9,.13,2.9),M(0xffffff,.76,.08,cloneTex(TEX.roof,.9,.9)));
  can.position.y=1.3;can.castShadow=true;g.add(can);
  for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.6,.08,2.9),M(i%2===0?0xdd5511:0xffeecc,.7));s.position.set(-1.15+i*.75,1.4,0);g.add(s);}
  [0xff4444,0xffaa00,0x44cc22,0xff7733].forEach((c,i)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),M(c,.7));b.position.set(-.6+i*.4,1.48,0);g.add(b);});
  g.position.set(x,0,z);return g;
}

// HOSPITAL
function mkHospital(x,z){
  const g=new THREE.Group();
  const main=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.3,2.5),M(0xf2f4f7,.88,.04,cloneTex(TEX.concrete,.9,.9)));
  main.position.y=1.15;main.castShadow=true;g.add(main);
  [new THREE.BoxGeometry(.19,.8,.07),new THREE.BoxGeometry(.8,.19,.07)].forEach(geo=>{
    const c=new THREE.Mesh(geo,M(0xff1111,.4));c.position.set(0,1.2,1.26);g.add(c);
  });
  const wm=ME(0x88ccff,0x3366cc,.38);
  for(let r2=0;r2<2;r2++) for(let c2=0;c2<3;c2++){
    const w=new THREE.Mesh(new THREE.BoxGeometry(.28,.32,.07),wm);
    w.position.set(-.76+c2*.76,.75+r2*.92,1.26);g.add(w);
  }
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.07,16),M(0x334433,.9));
  pad.position.y=2.34;g.add(pad);
  g.position.set(x,0,z);return g;
}

// WINDMILL
function mkWindmill(x,z){
  const g=new THREE.Group();
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(.1,.24,4.4,9),M(0xdddddd,.5,.3));
  tower.position.y=2.2;tower.castShadow=true;g.add(tower);
  const hub=new THREE.Group();hub.position.set(0,4.35,.42);
  for(let i=0;i<3;i++){
    const b=new THREE.Mesh(new THREE.BoxGeometry(.07,1.65,.04),M(0xfafafa,.3,.2));
    b.position.set(0,.82,0);
    const piv=new THREE.Group();piv.rotation.z=(i/3)*Math.PI*2;piv.add(b);hub.add(piv);
  }
  g.add(hub);windmills.push(hub);
  g.position.set(x,0,z);return g;
}

// SCHOOL
function mkSchool(x,z){
  const g=new THREE.Group();
  const main=new THREE.Mesh(new THREE.BoxGeometry(2.7,1.85,2.3),M(0xf3d9a0,.88,.04,cloneTex(TEX.concrete,.9,.9)));
  main.position.y=.92;main.castShadow=true;g.add(main);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(2.7,.14,2.3),M(0xffffff,.78,.08,cloneTex(TEX.roof,.8,.8)));
  roof.position.y=1.92;g.add(roof);
  const twr=new THREE.Mesh(new THREE.BoxGeometry(.56,.92,.56),M(0xf3d9a0,.88,.04,cloneTex(TEX.concrete,.8,.8)));
  twr.position.y=2.38;twr.castShadow=true;g.add(twr);
  const tr=new THREE.Mesh(new THREE.ConeGeometry(.48,.56,4),M(0x994400,.7));
  tr.position.y=3.06;tr.rotation.y=Math.PI/4;g.add(tr);
  const wm=ME(0xaaffee,0x33cc88,.32);
  for(let i=0;i<3;i++){const w=new THREE.Mesh(new THREE.BoxGeometry(.32,.38,.07),wm);w.position.set(-.76+i*.76,.96,1.16);g.add(w);}
  const flag=new THREE.Mesh(new THREE.BoxGeometry(.44,.27,.04),M(0x228822,.7));
  flag.position.set(1.22,2.22,.88);g.add(flag);
  g.position.set(x,0,z);return g;
}

// HUMAN WITH GAS MASK
function mkHuman(x,z){
  const g=new THREE.Group();
  const clM=M([0x3344aa,0x772233,0x226622,0x553322][Math.floor(R()*4)],.9);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.22,.32,.16),clM);body.position.y=.47;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.12,7,7),M(0x88aa88,.9));head.position.y=.77;g.add(head);
  const maskGroup=new THREE.Group();
  const mk=new THREE.Mesh(new THREE.BoxGeometry(.2,.14,.16),M(0x1a1a1a,.5,.6));mk.position.set(0,.73,.1);maskGroup.add(mk);
  const gm=ME(0x003322,0x004433,.6);
  [-0.048,.048].forEach(gx=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.04,7),gm);l.position.set(gx,.77,.15);l.rotation.x=Math.PI/2;maskGroup.add(l);});
  [-0.13,.13].forEach(cx=>{const can=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.08,6),M(0x333333,.5,.5));can.position.set(cx,.73,.1);can.rotation.z=Math.PI/2;maskGroup.add(can);});
  g.add(maskGroup);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5,0,Math.PI*2,0,Math.PI/2),M(0x221100,.9));hair.position.y=.82;g.add(hair);
  [-0.16,.16].forEach(ax=>{const arm=new THREE.Mesh(new THREE.BoxGeometry(.07,.25,.09),M(0x88aa88,.9));arm.position.set(ax,.44,0);g.add(arm);});
  [-0.07,.07].forEach(lx=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.09,.28,.1),M(0x111133,.9));leg.position.set(lx,.18,0);g.add(leg);});
  g.position.set(x,0,z);
  g.userData={cx:x,cz:z,angle:R()*Math.PI*2,radius:rr(.4,1.3),speed:rr(.28,.55),bob:R()*Math.PI*2,maskGroup};
  maskGroup.visible=skyPhase<4;
  return g;
}

// CHILD (running to school)
function mkChild(sx,sz,tx,tz){
  const g=new THREE.Group();
  const clM=M([0xffaaaa,0xaaffaa,0xaaaaff,0xffffaa][Math.floor(R()*4)],.9);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.14,.22,.1),clM);body.position.y=.31;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),M(0xffcc88,.9));head.position.y=.52;g.add(head);
  [-0.07,.07].forEach(lx=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.055,.18,.065),M(0x224488,.9));leg.position.set(lx,.12,0);g.add(leg);});
  g.position.set(sx,0,sz);
  g.userData={isChild:true,tx,tz,speed:rr(1.5,2.8),arrived:false,bob:R()*Math.PI*2};
  return g;
}

// CAR
function mkCar(x,z,roadAngle){
  const carCols=[0xcc2222,0x2255cc,0x228822,0xaaaa22,0xaa44aa,0xcc6622,0x888888,0x111111];
  const cc=carCols[Math.floor(R()*carCols.length)];
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.4,.64),M(cc,.6,.5));body.position.y=.24;body.castShadow=true;g.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(.74,.32,.58),M(cc,.5,.4));cabin.position.set(-.08,.56,0);g.add(cabin);
  const wm=ME(0xaaddff,0x5599cc,.32);
  const fw=new THREE.Mesh(new THREE.BoxGeometry(.06,.24,.48),wm);fw.position.set(.33,.54,0);g.add(fw);
  const whl=M(0x111111,.9);const rim=M(0x888888,.4,.8);
  [[-0.42,.12,.34],[.36,.12,.34],[-.42,.12,-.34],[.36,.12,-.34]].forEach(([wx,wy,wz])=>{
    const w2=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.11,10),whl);w2.rotation.x=Math.PI/2;w2.position.set(wx,wy,wz);g.add(w2);
    const r2=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.13,8),rim);r2.rotation.x=Math.PI/2;r2.position.set(wx,wy,wz);g.add(r2);
  });
  const hl=ME(0xffff88,0xffff44,1.0);
  [[.6,.22,.2],[.6,.22,-.2]].forEach(([hx,hy,hz])=>{const h=new THREE.Mesh(new THREE.BoxGeometry(.06,.1,.13),hl);h.position.set(hx,hy,hz);g.add(h);});
  g.position.set(x,0,z);
  g.rotation.y=roadAngle;
  g.userData={roadAngle,speed:rr(.8,1.7),bob:R()*Math.PI*2};
  return g;
}

// CONSTRUCTION WORKER WITH HAMMER
function mkWorker(x,z){
  const g=new THREE.Group();
  // Hi-vis vest
  const vest=new THREE.Mesh(new THREE.BoxGeometry(.22,.32,.16),M(0xee7700,.8));vest.position.y=.44;g.add(vest);
  // Vest stripes
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.24,.05,.17),M(0xffee00,.7));stripe.position.y=.54;g.add(stripe);
  // Head
  const head=new THREE.Mesh(new THREE.SphereGeometry(.1,7,7),M(0xdd9966,.9));head.position.y=.72;g.add(head);
  // Hard hat
  const hat=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6,0,Math.PI*2,0,Math.PI/2),M(0xffdd00,.6));hat.position.y=.8;g.add(hat);
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.03,8),M(0xffcc00,.6));brim.position.y=.73;g.add(brim);
  // Left arm (static, out to side)
  const la=new THREE.Group();la.position.set(-.14,.56,0);
  const laM=new THREE.Mesh(new THREE.BoxGeometry(.07,.24,.08),M(0xdd9966,.9));laM.position.set(0,-.12,0);la.add(laM);g.add(la);
  // Right arm pivot - swings hammer
  const ra=new THREE.Group();ra.position.set(.14,.58,0);
  const raM=new THREE.Mesh(new THREE.BoxGeometry(.07,.24,.08),M(0xdd9966,.9));raM.position.set(0,-.12,0);ra.add(raM);
  // Hammer handle attached to right arm
  const hammerGrp=new THREE.Group();hammerGrp.position.set(0,-.28,.04);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.38,6),M(0x8b5a2b,.8));handle.position.y=-.19;hammerGrp.add(handle);
  const head2=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.07),M(0x555555,.4,.7));head2.position.y=-.41;hammerGrp.add(head2);
  ra.add(raM);ra.add(hammerGrp);g.add(ra);
  // Legs
  [-0.07,.07].forEach(lx=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.09,.26,.09),M(0x223355,.9));leg.position.set(lx,.16,0);g.add(leg);});
  g.position.set(x,.0,z);
  g.userData={isWorker:true,phase:R()*Math.PI*2,la,ra,hammerGrp};
  return g;
}

// FOUNDATION STAKES (placed before building)
function mkFoundation(x,z){
  const g=new THREE.Group();
  // Corner stakes
  const positions=[[-0.8,-.8],[.8,-.8],[.8,.8],[-.8,.8],[0,-.8],[.8,0],[0,.8],[-.8,0]];
  positions.forEach(([px,pz])=>{
    const stake=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.55,6),M(0xc8a45a,.8));
    stake.position.set(px+rr(-.1,.1),.28,pz+rr(-.1,.1));
    stake.rotation.x=rr(-.12,.12);stake.rotation.z=rr(-.12,.12);
    g.add(stake);
    // Yellow caution tape between stakes
  });
  // Ground outline (sawdust/chalk)
  const outline=new THREE.Mesh(new THREE.RingGeometry(.95,1.05,20),new THREE.MeshBasicMaterial({color:0xffe84a,transparent:true,opacity:.55,side:THREE.DoubleSide}));
  outline.rotation.x=-Math.PI/2;outline.position.y=.03;g.add(outline);
  // Caution tape strands
  for(let i=0;i<4;i++){
    const tape=new THREE.Mesh(new THREE.PlaneGeometry(1.68,.04),M(0xffe844,.6));
    tape.material.side=THREE.DoubleSide;
    tape.position.set(0,.32,0);tape.rotation.y=i*Math.PI/4;
    g.add(tape);
  }
  g.position.set(x,.0,z);
  return g;
}

// LEGACY JCB MODEL (unused)
function mkJCB(x,z){
  const g=new THREE.Group();
  // Tracks
  const track=M(0x1a1510,.95);const tBody=M(0xee9900,.7);
  [-.28,.28].forEach(tz=>{
    const t=new THREE.Mesh(new THREE.BoxGeometry(1.4,.2,.22),track);t.position.set(0,.1,tz);g.add(t);
    for(let i=0;i<6;i++){const tl=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,.24),track);tl.position.set(-.5+i*.2,.11,tz);g.add(tl);}
  });
  // Body
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,.55,1.0),tBody);body.position.y=.48;body.castShadow=true;g.add(body);
  // Cab
  const cab=new THREE.Mesh(new THREE.BoxGeometry(.58,.52,.72),tBody);cab.position.set(.22,.79,.06);cab.castShadow=true;g.add(cab);
  const cabWin=new THREE.Mesh(new THREE.BoxGeometry(.06,.38,.52),ME(0xaaddff,0x5599cc,.3));cabWin.position.set(.5,.76,.06);g.add(cabWin);
  // Arm group
  const armGrp=new THREE.Group();armGrp.position.set(-.52,.75,0);g.add(armGrp);
  const arm1=new THREE.Mesh(new THREE.BoxGeometry(.12,.72,.14),tBody);arm1.position.y=-.36;armGrp.add(arm1);
  const arm2Grp=new THREE.Group();arm2Grp.position.y=-.75;armGrp.add(arm2Grp);
  const arm2=new THREE.Mesh(new THREE.BoxGeometry(.1,.58,.12),M(0xdd8800,.7));arm2.position.y=-.29;arm2Grp.add(arm2);
  // Bucket
  const buckGrp=new THREE.Group();buckGrp.position.y=-.6;arm2Grp.add(buckGrp);
  const buck=new THREE.Mesh(new THREE.BoxGeometry(.32,.24,.38),M(0x886600,.8));buck.position.y=-.12;buckGrp.add(buck);
  for(let i=0;i<4;i++){const t2=new THREE.Mesh(new THREE.BoxGeometry(.04,.1,.04),M(0x555555,.7));t2.position.set(-.12+i*.08,-.25,0);buckGrp.add(t2);}
  // Headlights
  [[.62,.48,.25],[.62,.48,-.25]].forEach(([hx,hy,hz])=>{const hl=new THREE.Mesh(new THREE.BoxGeometry(.05,.08,.1),ME(0xffff88,0xffff44,.8));hl.position.set(hx,hy,hz);g.add(hl);});
  g.position.set(x,.0,z);
  g.userData={isJCB:true,armGrp,arm2Grp,buckGrp};
  return g;
}

// MISSILE
function mkMissile(sx,sy,sz){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.5,8),M(0x888888,.5,.8));
  body.rotation.z=Math.PI/2;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.06,.18,8),M(0xcc2211,.5));
  nose.rotation.z=-Math.PI/2;nose.position.x=.3;g.add(nose);
  for(let i=0;i<3;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.18,.02,.1),M(0x666666,.6));fin.position.set(-.2,0,0);fin.rotation.x=i*(Math.PI*2/3);g.add(fin);}
  const exhaust=new THREE.PointLight(0xff6600,.8,2);exhaust.position.set(-.35,0,0);g.add(exhaust);
  g.position.set(sx,sy,sz);
  return g;
}

// GUIDE AVATAR (Dr. Meera)
function drawGuideAvatar(){
  const cv=document.getElementById('guide-av'),ctx=cv.getContext('2d');
  ctx.clearRect(0,0,44,56);
  const bg=ctx.createRadialGradient(22,28,2,22,28,24);
  bg.addColorStop(0,'#0a1a0a');bg.addColorStop(1,'#040804');
  ctx.fillStyle=bg;ctx.fillRect(0,0,44,56);
  ctx.fillStyle='#bbddbb';ctx.fillRect(9,32,26,22);
  ctx.fillStyle='#7aaa7a';ctx.fillRect(14,32,6,22);ctx.fillRect(24,32,6,22);
  ctx.fillStyle='#7aaa7a';ctx.fillRect(18,24,8,10);
  ctx.fillStyle='#7aaa7a';ctx.beginPath();ctx.arc(22,20,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a0a00';ctx.beginPath();ctx.arc(22,14,10,Math.PI,0);ctx.fill();
  ctx.fillStyle='#0f0f0f';ctx.fillRect(14,18,16,10);
  ctx.fillStyle='#002a1a';ctx.strokeStyle='#333';ctx.lineWidth=.8;
  ctx.beginPath();ctx.arc(17,23,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(27,23,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(0,255,140,.35)';
  ctx.beginPath();ctx.arc(17,23,1.8,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(27,23,1.8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a2a2a';ctx.fillRect(10,24,5,5);ctx.fillRect(29,24,5,5);
  ctx.strokeStyle='rgba(80,255,48,.25)';ctx.lineWidth=1.5;ctx.strokeRect(.75,.75,42.5,54.5);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SCENE INIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let hoverMeshInst,roadNetwork=[],roadCellKeys=new Set();

function distToSegment2D(px,pz,ax,az,bx,bz){
  const vx=bx-ax,vz=bz-az;
  const wx=px-ax,wz=pz-az;
  const vv=vx*vx+vz*vz||1;
  const t=clamp((wx*vx+wz*vz)/vv,0,1);
  const qx=ax+vx*t,qz=az+vz*t;
  return Math.hypot(px-qx,pz-qz);
}

function rebuildRoadCellKeys(){
  roadCellKeys=new Set();
  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
    const key=`${r}_${c}`;
    const {x,z}=cPos(r,c);
    if(roadNetwork.some(seg=>distToSegment2D(x,z,seg.ax,seg.az,seg.bx,seg.bz)<CELL*0.24)){
      roadCellKeys.add(key);
    }
  }
}

function buildRoadGraph(){
  const avenueCols=[1,5,10,15,20];
  const avenueRows=[1,6,11,15,20];
  const xNodes=avenueCols.map(col=>cPos(0,col).x).sort((a,b)=>a-b);
  const zNodes=avenueRows.map(row=>cPos(row,0).z).sort((a,b)=>a-b);
  const adjacency=new Map();
  const segments=[];
  const nodeKey=(x,z)=>`${x.toFixed(2)}_${z.toFixed(2)}`;
  const ensureNode=(x,z)=>{
    const key=nodeKey(x,z);
    if(!adjacency.has(key))adjacency.set(key,[]);
    return key;
  };
  const addSegment=(ax,az,bx,bz)=>{
    const na=ensureNode(ax,az);
    const nb=ensureNode(bx,bz);
    const segment={ax,az,bx,bz,na,nb};
    const index=segments.push(segment)-1;
    adjacency.get(na).push(index);
    adjacency.get(nb).push(index);
  };
  xNodes.forEach(x=>{
    for(let i=0;i<zNodes.length-1;i++)addSegment(x,zNodes[i],x,zNodes[i+1]);
  });
  zNodes.forEach(z=>{
    for(let i=0;i<xNodes.length-1;i++)addSegment(xNodes[i],z,xNodes[i+1],z);
  });
  return {segments,adjacency};
}

function seedCars(){
  carObjs.forEach(car=>scene.remove(car.mesh));
  carObjs=[];
  roadNetwork.forEach((seg,index)=>{
    if(R()<.22){
      const startForward=R()>.5;
      const t=R();
      const posX=lerp(startForward?seg.ax:seg.bx,startForward?seg.bx:seg.ax,t);
      const posZ=lerp(startForward?seg.az:seg.bz,startForward?seg.bz:seg.az,t);
      const angle=Math.atan2((startForward?seg.bz:seg.az)-(startForward?seg.az:seg.bz),(startForward?seg.bx:seg.ax)-(startForward?seg.ax:seg.bx));
      const car=mkCar(posX,posZ,angle);
      scene.add(car);
      carObjs.push({mesh:car,segIndex:index,dir:startForward?1:-1,t,speed:rr(.16,.25),laneOffset:rr(.18,.25)});
    }
  });
}

function initScene(){
  while(scene.children.length>0)scene.remove(scene.children[0]);
  tiles=[];cells={};humans=[];children=[];smokes=[];windmills=[];rings=[];drips=[];fxParts=[];
  atmParts=[];grassPts=[];workerObjs=[];missileObjs=[];bombObjs=[];
  roadMeshes.forEach(m=>scene.remove(m));roadMeshes=[];
  streamMeshes.forEach(m=>{scene.remove(m);disposeObject3D(m);});streamMeshes=[];
  sewageMeshes=[];
  carObjs.forEach(c=>scene.remove(c.mesh));carObjs=[];
  roadNetwork=[];
  roadSegments=[];
  roadAdjacency=new Map();
  roadCellKeys=new Set();
  ponds=[];
  factoryRegistry=[];
  userBuildingRegistry=[];
  nextFactoryId=1;
  nextBuildingId=1;
  waterMilestoneIndex=0;

  scene.add(ambL);scene.add(sunL);scene.add(fillL);scene.add(toxL);
  scene.fog.color.setHex(0x1a0400);scene.fog.near=22;scene.fog.far=62;
  buildAtmosphere();

  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(GW*CELL+14,GH*CELL+14),M(0xffffff,.98,0,cloneTex(TEX.ground,6,6)));
  gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;scene.add(gnd);
  const parcelGrid=new THREE.GridHelper(GW*CELL,GW,0x26382a,0x162119);
  parcelGrid.position.y=.035;
  parcelGrid.material.transparent=true;
  parcelGrid.material.opacity=.32;
  scene.add(parcelGrid);
  const parcelBorder=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(GW*CELL,GH*CELL)),
    new THREE.LineBasicMaterial({color:0x42533d,transparent:true,opacity:.55})
  );
  parcelBorder.rotation.x=-Math.PI/2;
  parcelBorder.position.y=.04;
  scene.add(parcelBorder);

  // Clickable tiles
  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
    const{x,z}=cPos(r,c);
    const t=new THREE.Mesh(new THREE.PlaneGeometry(CELL-.1,CELL-.1),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    t.rotation.x=-Math.PI/2;t.position.set(x,.016,z);t.receiveShadow=true;t.userData={r,c};
    scene.add(t);tiles.push(t);
  }

  // Hover indicator
  hoverMeshInst=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(CELL-.24,CELL-.24)),
    new THREE.LineBasicMaterial({color:0x50ff30,transparent:true,opacity:.55})
  );
  hoverMeshInst.rotation.x=-Math.PI/2;hoverMeshInst.position.y=.11;hoverMeshInst.visible=false;scene.add(hoverMeshInst);

  // Boundary walls
  for(let i=0;i<10;i++){
    const h=rr(1,5.5);
    const bw=new THREE.Mesh(new THREE.BoxGeometry(rr(.5,1.2),h,rr(.5,1.2)),M(0x2a1a08,.98));
    const side=Math.floor(R()*4);
    bw.position.set(side<2?GW*CELL/2*(side===0?-1:1)+rr(-1,1):rr(-GW*CELL/2,GW*CELL/2),h/2,side>=2?GH*CELL/2*(side===2?-1:1)+rr(-1,1):rr(-GH*CELL/2,GH*CELL/2));
    bw.castShadow=true;scene.add(bw);
  }

  const graph=buildRoadGraph();
  roadNetwork=graph.segments;
  roadSegments=graph.segments;
  roadAdjacency=graph.adjacency;
  roadNetwork.forEach(seg=>{mkRoadSeg(seg.ax,seg.az,seg.bx,seg.bz);});
  rebuildRoadCellKeys();

  // Spawn AI HQ
  {
    const hqSpot=[[4,GW-5],[4,GW-6],[5,GW-5],[5,GW-6],[3,GW-5]].find(([r2,c2])=>!roadCellKeys.has(`${r2}_${c2}`))||[4,GW-5];
    const[r2,c2]=hqSpot;
    const{x,z}=cPos(r2,c2);
    const m=mkAIHQ(x,z);
    scene.add(m);
    const record=registerFactoryRecord(`${r2}_${c2}`,m,'AI HQ','aihq');
    cells[`${r2}_${c2}`]={type:'aihq',mesh:m,factoryId:record.id};
  }

  // Populate grid with AI factories and ruins
  const fnList=[...FACTORY_NAMES,...FACTORY_NAMES];let fi=0;
  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
    const key=`${r}_${c}`;if(cells[key]||roadCellKeys.has(key))continue;
    const{x,z}=cPos(r,c);const roll=R();
    let mesh,type;
    if(roll<.10){type='factory';mesh=mkFactory(x,z,fnList[fi++%fnList.length]);}
    else if(roll<.20){type='ruin';mesh=mkRuin(x,z);}
    if(mesh){
      scene.add(mesh);
      if(type==='factory'){
        const record=registerFactoryRecord(key,mesh,mesh.userData.factoryName||'Factory');
        cells[key]={type,mesh,factoryId:record.id};
      } else cells[key]={type,mesh};
    }
  }

  seedBaseBasins();

  // Build sewage streams near factories
  rebuildSewage();

  // Spawn initial humans
  let spawnedHumans=0,humanAttempts=0;
  while(spawnedHumans<10&&humanAttempts<180){
    humanAttempts++;
    const r2=Math.floor(R()*GH),c2=Math.floor(R()*GW);
    const key=`${r2}_${c2}`;
    if(roadCellKeys.has(key)||cells[key])continue;
    const{x,z}=cPos(r2,c2);
    const h=mkHuman(x+rr(-1,1),z+rr(-1,1));scene.add(h);humans.push(h);
    spawnedHumans++;
  }

  seedCars();

  // Atmospheric smog
  for(let i=0;i<8;i++){
    const sm=new THREE.Mesh(new THREE.SphereGeometry(rr(1.2,3.0),5,5),new THREE.MeshBasicMaterial({color:0x4f3727,transparent:true,opacity:rr(.05,.1)}));
    sm.position.set(rr(-GW*CELL/2,GW*CELL/2),rr(2.5,7.5),rr(-GH*CELL/2,GH*CELL/2));
    atmParts.push({mesh:sm,baseY:sm.position.y,phase:R()*Math.PI*2,spd:rr(.1,.24)});
    scene.add(sm);
  }

  // Minimap
  drawMinimap();
  buildFactoryPanel();
}

function rebuildSewage(){
  // No pipes or tubes. Factories simply pollute nearby ponds based on proximity.
  // Reset all ponds to their base state, then re-dirty based on active factories.
  refreshPondPollution();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SKY DRAWING (2D Canvas overlay)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function drawSky(airQ,t){
  return;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ACTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function onTileClick(r,c){
  const key=`${r}_${c}`;const cell=cells[key];const{x,z}=cPos(r,c);

  if(roadCellKeys.has(key)){
    setStatus('That plot is part of the road network. Build beside the road, not on it.');
    return;
  }

  if(cleanMode){
    setStatus('Click a dark polluted pond to purify it (30 coins). Aim for the brown water.','clean');
    return;
  }

  if(demoMode){
    if(demoUsed>=4){toast('4 per minute limit reached. Wait for reset.','warn');return;}
    if(!cell){setStatus('Nothing to demolish here.');return;}
    if(cell.type==='aihq'){setStatus('AI HQ is shielded. Focus on the factories around it.','demo');return;}
    demoUsed++;
    let refund=0;
    if(cell.type==='factory'){
      toast('Bomb armed on the factory. Runoff will stop after detonation.');
    } else if(cell.bd){
      refund=Math.floor(cell.bd.cost*.3);
      toast(`Bomb armed. Refund after blast: ${refund} coins.`);
    } else toast('Explosive charge planted on the site.');
    cell.beingDemo=true;
    queueBombDemolition(key,x,z,refund);
    setStatus('Demolition charge planted. Stand clear.','demo');
    updateUI();return;
  }

  if(!selB){setStatus('Select a building from the bar below.');return;}
  if(cell&&['factory','aihq'].includes(cell.type)){setStatus('Clear this first - use Demolish.');return;}
  if(cell&&cell.bd){setStatus('Cell occupied - demolish first.');return;}

  const bd=BUILDS.find(b=>b.id===selB);
  if(!bd)return;
  if(GS.coins<bd.cost){toast(`Need ${bd.cost} coins!`,'warn');return;}
  if(bd.skyReq&&skyPhase<bd.skyReq){toast(`${bd.nm} needs grey sky first (Air above 50).`,'warn');setStatus(`${bd.nm} needs grey sky first.`);return;}

  // Remove existing ruin
  if(cell&&cell.mesh){scene.remove(cell.mesh);}

  GS.coins-=bd.cost;

  // Place foundation stakes immediately
  const foundation=mkFoundation(x,z);scene.add(foundation);

  // Spawn construction workers around foundation
  const wks=[];
  const workerAngles=[0, Math.PI*.66, Math.PI*1.33];
  for(let i=0;i<3;i++){
    const ang=workerAngles[i];
    const wx=x+Math.cos(ang)*rr(.7,1.1),wz=z+Math.sin(ang)*rr(.7,1.1);
    const wk=mkWorker(wx,wz);
    wk.rotation.y=Math.atan2(x-wx,z-wz); // face center
    scene.add(wk);wks.push(wk);workerObjs.push(wk);
  }
  // Mark cell as under-construction
  cells[key]={type:'construction',bd,wks};
  setStatus('Construction started - 3 seconds.','build');
  toast('Workers building '+bd.nm+'...');

  setTimeout(()=>{
    // Remove workers and foundation
    wks.forEach(w=>{scene.remove(w);const i=workerObjs.indexOf(w);if(i>=0)workerObjs.splice(i,1);});
    scene.remove(foundation);
    // Place actual building - rises from ground (not drops from sky)
    let mesh;
    switch(bd.id){
      case 'solar':mesh=mkSolar(x,z);break;case 'tree':mesh=mkTree(x,z);break;
      case 'house':mesh=mkHouse(x,z);break;case 'filter':mesh=mkFilter(x,z);break;
      case 'market':mesh=mkMarket(x,z);break;case 'hospital':mesh=mkHospital(x,z);break;
      case 'wind':mesh=mkWindmill(x,z);break;case 'school':mesh=mkSchool(x,z);break;
    }
    mesh.position.y=-2.5;mesh.userData.rising=true;mesh.userData.targetY=0;
    scene.add(mesh);
    const record=registerUserBuildingRecord(key,bd,mesh);
    cells[key]={type:bd.id,mesh,bd,buildingId:record.id};
    // Apply stats
    GS.air=clamp(GS.air+bd.aD,0,100);GS.water=clamp(GS.water+bd.wD,0,100);
    GS.happy=clamp(GS.happy+bd.hD,0,100);GS.pop=clamp(GS.pop+bd.pD,0,1000);
    GS.pollution=clamp(GS.pollution+bd.polD,0,100);
    if(bd.green)GS.greenBuilt++;if(bd.filt)GS.filterBuilt++;
    // Tree â†’ grass
    if(bd.id==='tree'){
      treesBuilt++;
      // Every 3rd tree: grass spreads to 1-2 adjacent empty cells
      if(treesBuilt%3===0){
        const adj=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        let spread=0;
        for(const[dr,dc] of adj){
          if(spread>=2)break;
          const nr=r+dr,nc=c+dc,nk=`${nr}_${nc}`;
          if(nr>=0&&nr<GH&&nc>=0&&nc<GW&&!cells[nk]&&!roadCellKeys.has(nk)){
            const{x:gx,z:gz}=cPos(nr,nc);
            const gm=mkGrass(gx,gz);scene.add(gm);
            cells[nk]={type:'grass',mesh:gm};
            spread++;
          }
        }
      }
    }
    // School â†’ children
    if(bd.id==='school'&&skyPhase>=2){for(let i=0;i<5;i++){const sr=Math.floor(R()*GH),sc=Math.floor(R()*GW);const{x:sx,z:sz}=cPos(sr,sc);const ch=mkChild(sx,sz,x,z);scene.add(ch);children.push(ch);}toast('Children are running to school!');}
    // Spawn humans
    if(bd.pD>0){for(let i=0;i<Math.min(2,Math.floor(bd.pD/15));i++){const hm=mkHuman(x+rr(-1,1),z+rr(-1,1));hm.userData.cx=x;hm.userData.cz=z;scene.add(hm);humans.push(hm);}}
    spawnFX(x,z,0x50ff30);toast(`${bd.nm} complete!`);
    updateUI();checkM();checkSkyPhase();checkWaterMilestones();drawMinimap();buildFactoryPanel();
  },3000);
}

function checkSkyPhase(){
  const np=getAirPhase(GS.air);
  if(np!==skyPhase){
    skyPhase=np;
    setCitizenMaskState(skyPhase<4);
    const msgs=['Sky: pitch black','Sky: red smog','Sky: grey (Solar and School unlocked)','Sky: light grey','Sky: blue - citizens can finally remove their gas masks'];
    toast(msgs[skyPhase]);
    buildBuildBar();
  }
}

function checkWaterPhase(){
  // Rivers/water color handled in animate via Three.js fog/ground
}

function buildAtmosphere(){
  const vertexShader=`
    varying vec3 vWorldPosition;
    void main(){
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader=`
    uniform vec3 topColor;
    uniform vec3 midColor;
    uniform vec3 bottomColor;
    varying vec3 vWorldPosition;
    void main(){
      float blend = normalize(vWorldPosition).y * 0.5 + 0.5;
      vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.55, blend));
      color = mix(color, topColor, smoothstep(0.45, 1.0, blend));
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  skyUniforms={
    topColor:{value:new THREE.Color('#10233a')},
    midColor:{value:new THREE.Color('#44556d')},
    bottomColor:{value:new THREE.Color('#6a3c22')}
  };
  skyDome=new THREE.Mesh(
    new THREE.SphereGeometry(130,32,24),
    new THREE.ShaderMaterial({uniforms:skyUniforms,vertexShader,fragmentShader,side:THREE.BackSide,depthWrite:false})
  );
  scene.add(skyDome);

  sunOrb=new THREE.Mesh(
    new THREE.SphereGeometry(3.4,20,20),
    new THREE.MeshBasicMaterial({color:0xfff4c4,transparent:true,opacity:.95})
  );
  sunOrb.position.set(42,32,-28);
  skyDome.add(sunOrb);

  sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({color:0xffd778,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}));
  sunGlow.position.copy(sunOrb.position);
  sunGlow.scale.set(28,28,1);
  skyDome.add(sunGlow);

  // Sun corona ring
  const coronaMat=new THREE.MeshBasicMaterial({color:0xffe899,transparent:true,opacity:.18,side:THREE.DoubleSide});
  const corona=new THREE.Mesh(new THREE.RingGeometry(4.5,9,28),coronaMat);
  corona.position.copy(sunOrb.position);
  corona.lookAt(new THREE.Vector3(0,0,0));
  skyDome.add(corona);
  sunOrb.userData.corona=corona;
  sunOrb.userData.coronaMat=coronaMat;

  // Sun rays (8 thin planes radiating)
  sunOrb.userData.rays=[];
  for(let i=0;i<8;i++){
    const ray=new THREE.Mesh(
      new THREE.PlaneGeometry(.28,rr(6,11)),
      new THREE.MeshBasicMaterial({color:0xffe490,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false})
    );
    ray.position.copy(sunOrb.position);
    ray.rotation.z=i*Math.PI/4;
    skyDome.add(ray);
    sunOrb.userData.rays.push(ray);
  }

  skyClouds=[];
  for(let i=0;i<6;i++){
    const cloud=new THREE.Mesh(
      new THREE.PlaneGeometry(rr(10,18),rr(4,7)),
      new THREE.MeshBasicMaterial({color:0xe9e4d6,transparent:true,opacity:.16,depthWrite:false})
    );
    cloud.position.set(rr(-42,42),rr(18,26),rr(-40,25));
    cloud.rotation.y=rr(-.8,.8);
    skyDome.add(cloud);
    skyClouds.push({mesh:cloud,phase:R()*Math.PI*2,speed:rr(.05,.11)});
  }
}

function spawnPond(x,z,radius,kind='clean'){
  const group=new THREE.Group();
  // Clean ponds = blue, polluted ponds = dark green (toxic algae)
  const isDirty=kind==='dirty';
  const waterColor=isDirty?0x1a4a1a:0x3a9fd4;
  const rimColor=isDirty?0x0d2a0d:0x8ed8f8;
  const water=new THREE.Mesh(
    new THREE.CircleGeometry(radius,32),
    new THREE.MeshStandardMaterial({color:waterColor,emissive:isDirty?0x0a1a0a:0x062233,emissiveIntensity:.18,transparent:true,opacity:.88,roughness:.2,metalness:.06})
  );
  water.rotation.x=-Math.PI/2;
  const rim=new THREE.Mesh(
    new THREE.RingGeometry(radius*.9,radius*1.1,32),
    new THREE.MeshBasicMaterial({color:rimColor,transparent:true,opacity:.28,side:THREE.DoubleSide})
  );
  rim.rotation.x=-Math.PI/2;
  rim.position.y=.004;
  group.add(water);
  group.add(rim);
  group.position.set(x,.042,z);
  scene.add(group);
  const pond={id:`P${ponds.length+1}`,group,water,rim,radius,kind,polluted:isDirty,permanentDirty:isDirty};
  ponds.push(pond);
  return pond;
}

function updatePondVisual(pond){
  if(pond.polluted){
    // Dark green = toxic/algae
    pond.water.material.color.setHex(0x1a4a1a);
    pond.water.material.emissive.setHex(0x0a1a0a);
    pond.rim.material.color.setHex(0x0d2a0d);
    pond.rim.material.opacity=.22;
  } else {
    // Blue = clean water
    pond.water.material.color.setHex(0x3a9fd4);
    pond.water.material.emissive.setHex(0x062233);
    pond.rim.material.color.setHex(0x8ed8f8);
    pond.rim.material.opacity=.30;
  }
}

function seedBaseBasins(){
  // 5 polluted ponds distributed around the map - all dark green, factory runoff
  [
    {x:-GW*CELL*.32,z:GH*CELL*.34,r:2.2},
    {x:GW*CELL*.33,z:-GH*CELL*.31,r:2.6},
    {x:GW*CELL*.08,z:GH*CELL*.28,r:2.0},
    {x:-GW*CELL*.18,z:-GH*CELL*.28,r:1.8},
    {x:GW*CELL*.28,z:GH*CELL*.2,r:1.6}
  ].forEach(({x,z,r})=>spawnPond(x,z,r,'dirty'));
}

// RIVER - flat ribbon using PlaneGeometry segments, NOT tubes/pipes
function spawnRiverRibbon(points, width){
  // Build a flat ribbon along a series of waypoints using flat quads
  const group=new THREE.Group();
  for(let i=0;i<points.length-1;i++){
    const ax=points[i].x, az=points[i].z;
    const bx=points[i+1].x, bz=points[i+1].z;
    const dx=bx-ax, dz=bz-az;
    const len=Math.hypot(dx,dz)||1;
    const seg=new THREE.Mesh(
      new THREE.PlaneGeometry(len,width),
      new THREE.MeshStandardMaterial({color:0x3a9fd4,emissive:0x0a4a6a,emissiveIntensity:.18,transparent:true,opacity:.82,roughness:.22,metalness:.04})
    );
    seg.rotation.x=-Math.PI/2;
    seg.position.set((ax+bx)/2,.06,(az+bz)/2);
    seg.rotation.z=Math.atan2(-dz,dx);
    seg.receiveShadow=true;
    group.add(seg);
  }
  group.userData={isRiver:true,width,points};
  scene.add(group);
  streamMeshes.push(group);
  return group;
}

function buildRiverPath(start,end,bendFactor=0.28){
  // Simple 3-point path with gentle natural sway - NOT a tube
  const pts=[];
  pts.push({x:start.x,z:start.z});
  const dx=end.x-start.x, dz=end.z-start.z;
  const len=Math.hypot(dx,dz)||1;
  const nx=-dz/len, nz=dx/len;
  const midX=lerp(start.x,end.x,.5)+nx*rr(-bendFactor,bendFactor)*len;
  const midZ=lerp(start.z,end.z,.5)+nz*rr(-bendFactor,bendFactor)*len;
  pts.push({x:midX,z:midZ});
  pts.push({x:end.x,z:end.z});
  return pts;
}

function destroyStream(group){
  if(!group)return;
  const streamIdx=streamMeshes.indexOf(group);
  if(streamIdx>=0)streamMeshes.splice(streamIdx,1);

  scene.remove(group);
  disposeObject3D(group);
}

function refreshPondPollution(){
  // Each pond is polluted if any active factory is within 18 units AND not cleaned
  ponds.forEach(pond=>{
    if(pond.cleaned){
      pond.polluted=false;
    } else if(pond.permanentDirty){
      // Check if any nearby factory still active
      let nearFactory=false;
      const px=pond.group.position.x, pz=pond.group.position.z;
      for(const[,cell] of Object.entries(cells)){
        if(cell.type!=='factory')continue;
        const cx=cell.mesh.position.x, cz=cell.mesh.position.z;
        if(Math.hypot(px-cx,pz-cz)<22){nearFactory=true;break;}
      }
      pond.polluted=nearFactory;
    } else {
      pond.polluted=false;
    }
  });
  ponds.forEach(updatePondVisual);
}

function nearestPondTarget(x,z){
  if(!ponds.length)return null;
  return ponds.slice().sort((a,b)=>{
    const da=(a.group.position.x-x)**2+(a.group.position.z-z)**2;
    const db=(b.group.position.x-x)**2+(b.group.position.z-z)**2;
    return da-db;
  })[0];
}

function removeStreamsForFactory(factoryId){
  // No tube streams - just refresh pond pollution based on remaining factories
  refreshPondPollution();
}

function spawnRiverBranch(origin,angle,width,depth){
  // Cap depth at 1 to avoid spaghetti. One main river, one optional tributary.
  const reach=CELL*(4+depth*2);
  let end=null;
  for(let i=0;i<6;i++){
    const candidate={
      x:clamp(origin.x+Math.cos(angle+rr(-.35,.35))*rr(reach*.7,reach*1.2),-GW*CELL*.43,GW*CELL*.43),
      z:clamp(origin.z+Math.sin(angle+rr(-.35,.35))*rr(reach*.7,reach*1.2),-GH*CELL*.43,GH*CELL*.43)
    };
    const cell=worldToCell(candidate.x,candidate.z);
    const blocked=cell&&(cells[cell.key]?.type==='factory'||cells[cell.key]?.type==='aihq');
    if(!blocked){end=candidate;break;}
  }
  if(!end)end={x:origin.x+Math.cos(angle)*reach,z:origin.z+Math.sin(angle)*reach};
  end.x=clamp(end.x,-GW*CELL*.43,GW*CELL*.43);
  end.z=clamp(end.z,-GH*CELL*.43,GH*CELL*.43);

  const pts=buildRiverPath(origin,end,.22);
  spawnRiverRibbon(pts,Math.max(.22,width));

  // Pond at the end of this river arm
  const pondR=rr(width*2.5,width*5);
  const pond=spawnPond(end.x,end.z,Math.max(.7,pondR),'clean');
  updatePondVisual(pond);

  // One tributary splits off midway, thinner
  if(depth>0 && R()>.45){
    const mid=pts[Math.floor(pts.length/2)]||pts[0];
    const sideAngle=angle+(R()>.5?1:-1)*rr(.5,.9);
    spawnRiverBranch({x:mid.x,z:mid.z},sideAngle,width*.5,0);
  }
}

function triggerWaterMilestone(index){
  const filters=activeFilterRecords();
  if(!filters.length)return;
  filters.forEach(record=>{
    const cell=cells[record.cellKey];
    if(!cell?.mesh)return;
    const origin={x:cell.mesh.position.x+rr(-.2,.2),z:cell.mesh.position.z+rr(-.2,.2)};
    // ONE river per filter per milestone - clean and intentional
    const heading=R()*Math.PI*2;
    const mainWidth=.45+index*.12;
    spawnRiverBranch(origin,heading,mainWidth,1);
  });
  toast(`Water network expanded at ${WATER_THRESHOLDS[index]} percent.`);
  refreshPondPollution();
  refreshPondPollution();
}

function checkWaterMilestones(){
  while(waterMilestoneIndex<WATER_THRESHOLDS.length&&GS.water>=WATER_THRESHOLDS[waterMilestoneIndex]){
    triggerWaterMilestone(waterMilestoneIndex);
    waterMilestoneIndex++;
  }
}

function setCitizenMaskState(maskOn){
  humans.forEach(human=>{
    if(human.userData.maskGroup)human.userData.maskGroup.visible=maskOn;
  });
}

function removeCellRecord(cellKey){
  const cell=cells[cellKey];
  if(!cell)return null;
  const position=cell.mesh?{x:cell.mesh.position.x,z:cell.mesh.position.z}:{x:0,z:0};
  if(cell.factoryId){
    const record=getFactoryRecord(cell.factoryId);
    if(record){
      record.cellKey='';
      record.lastPos=position;
      setRecordDestroyed(record);
    }
    removeStreamsForFactory(cell.factoryId);
  }
  if(cell.buildingId){
    const record=getBuildingRecord(cell.buildingId);
    if(record){
      record.cellKey='';
      record.lastPos=position;
      setRecordDestroyed(record);
    }
  }
  if(cell.mesh){
    pruneAnimatedRefs(cell.mesh);
    scene.remove(cell.mesh);
    disposeObject3D(cell.mesh);
  }
  delete cells[cellKey];
  return {cell,position};
}

function mkBombCharge(x,z){
  const group=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(.2,10,10),M(0x272727,.68,.22));
  body.position.y=.26;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.38,.52,20),new THREE.MeshBasicMaterial({color:0xff5533,transparent:true,opacity:.55,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;
  ring.position.y=.03;
  const led=new THREE.PointLight(0xff5533,1.4,3.2);
  led.position.y=.45;
  const shock=new THREE.Mesh(new THREE.RingGeometry(.24,.36,28),new THREE.MeshBasicMaterial({color:0xffd28a,transparent:true,opacity:0,side:THREE.DoubleSide}));
  shock.rotation.x=-Math.PI/2;
  shock.position.y=.05;
  group.add(body);
  group.add(ring);
  group.add(shock);
  group.add(led);
  group.position.set(x,0,z);
  group.userData={body,ring,shock,led};
  return group;
}

function queueBombDemolition(cellKey,x,z,refund=0){
  const mesh=mkBombCharge(x,z);
  scene.add(mesh);
  bombObjs.push({mesh,cellKey,x,z,refund,time:0,exploded:false});
}

function aiTurn(){
  const empty=[];
  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){const key=`${r}_${c}`;if(!cells[key]&&!roadCellKeys.has(key))empty.push([r,c]);}
  if(!empty.length)return;
  const[r,c]=empty[Math.floor(R()*empty.length)];
  const key=`${r}_${c}`;const{x,z}=cPos(r,c);
  const mesh=mkFactory(x,z,FACTORY_NAMES[Math.floor(R()*FACTORY_NAMES.length)]);
  scene.add(mesh);
  const record=registerFactoryRecord(key,mesh,mesh.userData.factoryName||'Factory');
  cells[key]={type:'factory',mesh,factoryId:record.id};
  GS.pollution=clamp(GS.pollution+8,0,100);GS.air=clamp(GS.air-1.5,0,100);
  toast('AI built a new factory!','bad');
  setTimeout(()=>refreshPondPollution(),200);
  updateUI();drawMinimap();buildFactoryPanel();
}

function aiDestroyBuilding(){
  const pKeys=Object.keys(cells).filter(k=>cells[k]?.bd&&!cells[k]?.beingDemo);
  if(pKeys.length<1)return;
  const picks=pKeys.sort(()=>R()-.5).slice(0,2);
  // Find AI HQ position
  const hqKey=Object.keys(cells).find(k=>cells[k]?.type==='aihq');
  const[hr,hc]=hqKey?hqKey.split('_').map(Number):[GH/2,GW/2];
  const{x:hx,z:hz}=cPos(hr,hc);
  picks.forEach(key=>{
    const[tr,tc]=key.split('_').map(Number);
    const{x:tx,z:tz}=cPos(tr,tc);
    // Fire missile
    const miss=mkMissile(hx,3.5,hz);scene.add(miss);
    missileObjs.push({mesh:miss,src:{x:hx,y:3.5,z:hz},dst:{x:tx,y:1.5,z:tz},t:0,speed:.3,key,done:false});
  });
  toast('AI launched missiles!','bad');
}

function spawnFX(x,z,color){
  for(let i=0;i<14;i++){
    const p=new THREE.Mesh(new THREE.SphereGeometry(rr(.04,.12),4,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
    p.position.set(x+rr(-.6,.6),rr(.2,.9),z+rr(-.6,.6));
    p.userData={vx:rr(-.07,.07),vy:rr(.07,.15),vz:rr(-.07,.07),life:1.0};
    scene.add(p);fxParts.push(p);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  UI FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function buildBuildBar(){
  const bar=document.getElementById('buildbar');bar.innerHTML='';
  BUILDS.forEach((b,i)=>{
    const locked=b.skyReq&&skyPhase<b.skyReq;
    const btn=document.createElement('button');
    btn.className='bbt'+(locked?' lk':'');btn.id='bbt_'+b.id;
    btn.innerHTML=`<span class="bkey">${i+1}</span><div class="bico">${b.ico}</div><div class="bname">${b.nm}</div><div class="bcost">${b.cost} C</div><div class="bfx">${locked?'LOCKED: grey sky':b.fx}</div>`;
    btn.onclick=()=>selectB(b.id);
    btn.onmouseenter=e=>showTip(e,b,locked);
    btn.onmouseleave=()=>document.getElementById('tip').style.display='none';
    bar.appendChild(btn);
  });
}

function selectB(id){
  demoMode=false;cleanMode=false;selB=id;
  document.getElementById('btn-demo').classList.remove('on');
  document.getElementById('btn-clean').classList.remove('on');
  document.querySelectorAll('.bbt').forEach(b=>b.classList.remove('sel'));
  document.getElementById('bbt_'+id)?.classList.add('sel');
  hoverMeshInst.material.color.setHex(0x50ff30);
  const b=BUILDS.find(x=>x.id===id);
  if(b.skyReq&&skyPhase<b.skyReq)setStatus(`${b.nm} needs grey sky first (Air > 50).`);
  else setStatus(`${b.nm} selected | click a plot to place | cost: ${b.cost} coins`,'build');
}
function toggleDemo(){
  demoMode=!demoMode;cleanMode=false;selB=null;
  document.getElementById('btn-demo').classList.toggle('on',demoMode);
  document.getElementById('btn-clean').classList.remove('on');
  document.querySelectorAll('.bbt').forEach(b=>b.classList.remove('sel'));
  hoverMeshInst.material.color.setHex(demoMode?0xff3322:0x50ff30);
  if(demoMode)setStatus(`Demolish mode | bomb charge ready | ${4-demoUsed}/4 uses left this minute`,'demo');
  else setStatus('Demolish off');
}
function toggleClean(){
  cleanMode=!cleanMode;demoMode=false;selB=null;
  document.getElementById('btn-clean').classList.toggle('on',cleanMode);
  document.getElementById('btn-demo').classList.remove('on');
  document.querySelectorAll('.bbt').forEach(b=>b.classList.remove('sel'));
  hoverMeshInst.material.color.setHex(cleanMode?0x1188cc:0x50ff30);
  if(cleanMode)setStatus('Clean mode | click dark polluted ponds to purify them (30 coins each)','clean');
  else setStatus('Clean mode off');
}
function hideGuide(){document.getElementById('guide').style.display='none';}
function showTip(e,b,locked){
  const t=document.getElementById('tip');
  document.getElementById('t-nm').textContent=`${b.nm}`;
  document.getElementById('t-co').textContent=`Cost: ${b.cost} coins`;
  document.getElementById('t-fx').textContent=locked?`${b.desc} | LOCKED`:b.desc;
  t.style.display='block';t.style.left=(e.clientX+14)+'px';t.style.top=(e.clientY-50)+'px';
}

function updateUI(){
  const eco=calcEco(GS);
  document.getElementById('v-coins').textContent=GS.coins;
  document.getElementById('v-eco').textContent=eco+'%';
  document.getElementById('v-day').textContent=GS.day;
  document.getElementById('v-demo').textContent=4-demoUsed;
  let inc=0;Object.values(cells).forEach(c=>{if(c?.bd)inc+=c.bd.cpd;});
  document.getElementById('v-income').textContent=inc;
  sb('sf-air','v-air',GS.air,'#50ff30','#ff5533');
  sb('sf-wat','v-wat',GS.water,'#29aeff','#ff5533');
  sb2('sf-pol','v-pol',GS.pollution);
  sb('sf-hap','v-hap',GS.happy,'#ffaa00','#ff5533');
  sb3('sf-pop','v-pop',GS.pop);
  document.getElementById('al-pol').style.display=GS.pollution>70?'block':'none';
  document.getElementById('al-wat').style.display=GS.water<15?'block':'none';
  BUILDS.forEach(b=>{const btn=document.getElementById('bbt_'+b.id);if(btn&&!btn.classList.contains('lk'))btn.disabled=GS.coins<b.cost;});
  if(mActive&&curMission<MISSIONS.length)document.getElementById('g-prog').textContent=MISSIONS[curMission].prog(GS);
  checkWaterMilestones();
}
function sb(fi,ni,v,g,b){const f=document.getElementById(fi);f.style.width=v+'%';f.style.background=v<30?b:g;document.getElementById(ni).textContent=Math.round(v);}
function sb2(fi,ni,v){document.getElementById(fi).style.width=v+'%';document.getElementById(fi).style.background=v>60?'#cc2200':v>30?'#886600':'#446600';document.getElementById(ni).textContent=Math.round(v);}
function sb3(fi,ni,v){document.getElementById(fi).style.width=(v/1000*100)+'%';document.getElementById(fi).style.background='#bb88ff';document.getElementById(ni).textContent=v;}

function setStatus(t,mode=''){const el=document.getElementById('status');el.textContent=t;el.className=mode||'';}
let toastTm=null;
function toast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='show'+(type?' '+type:'');clearTimeout(toastTm);toastTm=setTimeout(()=>t.className='',3200);}

function updateTimer(){const m=Math.floor(GS.timeLeft/60),s=GS.timeLeft%60;document.getElementById('v-timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;document.getElementById('v-timer').style.color=GS.timeLeft<60?'#ff3333':'#ffaa00';}

// MINIMAP
function drawMinimap(){
  const mm=document.getElementById('mm-canvas');
  const ctx=mm.getContext('2d');
  const W2=mm.width,H2=mm.height;
  const sx=W2/GW,sy=H2/GH;
  const parcelPad=Math.max(0.8,Math.min(sx,sy)*0.12);
  const bg=ctx.createLinearGradient(0,0,0,H2);
  bg.addColorStop(0,'#182017');
  bg.addColorStop(1,'#070907');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W2,H2);

  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
    const cell=cells[`${r}_${c}`];
    const x=c*sx,y=r*sy;
    ctx.fillStyle=(r+c)%2===0?'#0d110d':'#101410';
    ctx.fillRect(x,y,sx,sy);
    ctx.fillStyle=roadCellKeys.has(`${r}_${c}`)?'#141615':cell?.type==='factory'||cell?.type==='aihq'?'#1d1310':cell?.type==='tree'||cell?.type==='grass'?'#132013':'#161915';
    ctx.fillRect(x+.35,y+.35,sx-.7,sy-.7);
  }

  ctx.strokeStyle='rgba(130,150,126,.12)';
  ctx.lineWidth=.45;
  for(let gx=1;gx<GW;gx++){ctx.beginPath();ctx.moveTo(gx*sx,0);ctx.lineTo(gx*sx,H2);ctx.stroke();}
  for(let gy=1;gy<GH;gy++){ctx.beginPath();ctx.moveTo(0,gy*sy);ctx.lineTo(W2,gy*sy);ctx.stroke();}

  ctx.strokeStyle='rgba(46,50,46,.95)';
  ctx.lineWidth=Math.max(2.1,Math.min(sx,sy)*0.46);
  roadNetwork.forEach(seg=>{
    ctx.beginPath();
    ctx.moveTo((seg.ax/CELL+GW/2)*sx,(seg.az/CELL+GH/2)*sy);
    ctx.lineTo((seg.bx/CELL+GW/2)*sx,(seg.bz/CELL+GH/2)*sy);
    ctx.stroke();
  });
  ctx.strokeStyle='rgba(220,198,138,.35)';
  ctx.lineWidth=Math.max(.7,Math.min(sx,sy)*0.12);
  roadNetwork.forEach(seg=>{
    ctx.beginPath();
    ctx.moveTo((seg.ax/CELL+GW/2)*sx,(seg.az/CELL+GH/2)*sy);
    ctx.lineTo((seg.bx/CELL+GW/2)*sx,(seg.bz/CELL+GH/2)*sy);
    ctx.stroke();
  });

  // Draw rivers on minimap
  streamMeshes.forEach(stream=>{
    if(!stream.userData.isRiver||!stream.userData.points)return;
    const pts=stream.userData.points;
    const w=Math.max(.8,Math.min(sx,sy)*(stream.userData.width/CELL)*2.2);
    ctx.strokeStyle='rgba(58,159,212,.85)';
    ctx.lineWidth=w;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();
    pts.forEach((pt,i)=>{
      const px=(pt.x/CELL+GW/2)*sx;
      const py=(pt.z/CELL+GH/2)*sy;
      if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
    });
    ctx.stroke();
  });

  // Ponds on minimap: blue=clean, dark green=polluted
  ponds.forEach(pond=>{
    const px=(pond.group.position.x/CELL+GW/2)*sx;
    const py=(pond.group.position.z/CELL+GH/2)*sy;
    const pr=Math.max(2.5,(pond.radius/CELL)*Math.min(sx,sy));
    ctx.fillStyle=pond.polluted?'rgba(18,58,18,.9)':'rgba(42,148,210,.88)';
    ctx.strokeStyle=pond.polluted?'rgba(30,90,30,.7)':'rgba(120,210,255,.75)';
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.arc(px,py,pr,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
  });

  for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
    const cell=cells[`${r}_${c}`];
    if(!cell)continue;
    const x=c*sx+parcelPad;
    const y=r*sy+parcelPad;
    const w=sx-parcelPad*2;
    const h=sy-parcelPad*2;
    const shadowX=x+Math.max(.5,sx*.08);
    const shadowY=y+Math.max(.7,sy*.1);

    const shadow=(sw,sh)=>{
      ctx.fillStyle='rgba(0,0,0,.3)';
      ctx.fillRect(shadowX,shadowY,sw,sh);
    };

    switch(cell.type){
      case 'factory':
        shadow(w,h*.78);
        ctx.fillStyle='#664235';ctx.fillRect(x,y+h*.2,w,h*.58);
        ctx.fillStyle='#b96b3b';ctx.fillRect(x,y+h*.12,w,h*.16);
        ctx.fillStyle='#d2bba5';
        for(let i=0;i<3;i++)ctx.fillRect(x+w*.12+i*w*.26,y+h*.42,w*.1,h*.1);
        ctx.fillStyle='#7f776c';
        ctx.fillRect(x+w*.12,y-h*.2,w*.14,h*.4);
        ctx.fillRect(x+w*.58,y-h*.28,w*.16,h*.48);
        ctx.fillStyle='rgba(214,80,44,.14)';
        ctx.beginPath();
        ctx.arc((c+.5)*sx,(r+.5)*sy,Math.max(sx,sy)*1.25,0,Math.PI*2);
        ctx.fill();
        break;
      case 'aihq':
        shadow(w*.8,h*.92);
        ctx.fillStyle='#2a1832';ctx.fillRect(x+w*.08,y+h*.06,w*.8,h*.92);
        ctx.fillStyle='#b94cff';ctx.fillRect(x+w*.18,y+h*.22,w*.45,h*.12);
        ctx.fillStyle='#caa7ff';ctx.fillRect(x+w*.45,y-h*.18,w*.04,h*.24);
        break;
      case 'tree':
        ctx.fillStyle='#5b4328';ctx.fillRect(x+w*.46,y+h*.42,w*.1,h*.34);
        ctx.fillStyle='#2f8a2f';
        [[.35,.44,.2],[.56,.36,.24],[.64,.55,.18],[.42,.6,.18]].forEach(([px,py,pr])=>{
          ctx.beginPath();ctx.arc(x+w*px,y+h*py,Math.max(1.1,w*pr),0,Math.PI*2);ctx.fill();
        });
        break;
      case 'grass':
        ctx.fillStyle='#2d7d2a';
        for(let i=0;i<6;i++)ctx.fillRect(x+w*(.12+i*.12),y+h*(.22+(i%2)*.18),Math.max(1,w*.08),Math.max(1,h*.14));
        break;
      case 'house':
        shadow(w*.76,h*.62);
        ctx.fillStyle='#cfbfaa';ctx.fillRect(x+w*.12,y+h*.3,w*.76,h*.5);
        ctx.fillStyle='#994b36';
        ctx.beginPath();
        ctx.moveTo(x+w*.06,y+h*.36);
        ctx.lineTo(x+w*.5,y+h*.06);
        ctx.lineTo(x+w*.94,y+h*.36);
        ctx.closePath();
        ctx.fill();
        break;
      case 'solar':
        shadow(w*.86,h*.54);
        ctx.fillStyle='#122742';ctx.fillRect(x+w*.08,y+h*.28,w*.86,h*.54);
        ctx.strokeStyle='rgba(131,184,255,.42)';
        ctx.lineWidth=.5;
        for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+w*.08+i*w*.2,y+h*.28);ctx.lineTo(x+w*.08+i*w*.2,y+h*.82);ctx.stroke();}
        ctx.beginPath();ctx.moveTo(x+w*.08,y+h*.55);ctx.lineTo(x+w*.94,y+h*.55);ctx.stroke();
        break;
      case 'filter':
        shadow(w*.78,h*.72);
        ctx.fillStyle='#2a7cb5';ctx.fillRect(x+w*.12,y+h*.2,w*.78,h*.62);
        ctx.fillStyle='#9cdcff';
        ctx.beginPath();ctx.arc(x+w*.5,y+h*.38,Math.max(1.2,w*.18),0,Math.PI*2);ctx.fill();
        break;
      case 'market':
        shadow(w*.84,h*.64);
        ctx.fillStyle='#8f5c24';ctx.fillRect(x+w*.08,y+h*.26,w*.84,h*.56);
        ctx.fillStyle='#d98930';ctx.fillRect(x+w*.08,y+h*.16,w*.84,h*.16);
        ctx.fillStyle='rgba(255,237,202,.85)';
        for(let i=0;i<4;i++)ctx.fillRect(x+w*(.14+i*.18),y+h*.2,w*.08,h*.12);
        break;
      case 'hospital':
        shadow(w*.82,h*.7);
        ctx.fillStyle='#d7dbe3';ctx.fillRect(x+w*.09,y+h*.2,w*.82,h*.62);
        ctx.fillStyle='#b14f4f';
        ctx.fillRect(x+w*.42,y+h*.3,w*.12,h*.28);
        ctx.fillRect(x+w*.34,y+h*.38,w*.28,h*.12);
        break;
      case 'wind':
        ctx.strokeStyle='#d9d7ce';
        ctx.lineWidth=1.1;
        ctx.beginPath();ctx.moveTo(x+w*.5,y+h*.15);ctx.lineTo(x+w*.5,y+h*.82);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+w*.5,y+h*.15);ctx.lineTo(x+w*.25,y+h*.34);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+w*.5,y+h*.15);ctx.lineTo(x+w*.76,y+h*.26);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+w*.5,y+h*.15);ctx.lineTo(x+w*.48,y+h*.42);ctx.stroke();
        break;
      case 'school':
        shadow(w*.82,h*.7);
        ctx.fillStyle='#b48d2d';ctx.fillRect(x+w*.09,y+h*.2,w*.82,h*.62);
        ctx.fillStyle='#73581a';ctx.fillRect(x+w*.16,y+h*.08,w*.68,h*.18);
        ctx.fillStyle='#efe1ae';ctx.fillRect(x+w*.42,y+h*.42,w*.12,h*.2);
        break;
      case 'construction':
        shadow(w*.86,h*.32);
        ctx.fillStyle='#8a5f28';ctx.fillRect(x+w*.07,y+h*.42,w*.86,h*.22);
        ctx.strokeStyle='#f7d451';ctx.lineWidth=.8;
        ctx.beginPath();ctx.moveTo(x+w*.12,y+h*.42);ctx.lineTo(x+w*.88,y+h*.64);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+w*.12,y+h*.64);ctx.lineTo(x+w*.88,y+h*.42);ctx.stroke();
        break;
      case 'ruin':
        shadow(w*.76,h*.56);
        ctx.fillStyle='#4d3827';ctx.fillRect(x+w*.12,y+h*.32,w*.34,h*.36);
        ctx.fillRect(x+w*.48,y+h*.22,w*.28,h*.46);
        break;
    }
  }
  // Camera viewport
  ctx.strokeStyle='rgba(230,230,230,.55)';ctx.lineWidth=1.2;
  const tl=camSW(0,0),br=camSW(window.innerWidth,window.innerHeight);
  const vpx=((tl.x+GW*CELL/2)/CELL)*sx,vpy=((tl.z+GH*CELL/2)/CELL)*sy;
  const vpw=((br.x-tl.x)/CELL)*sx,vph=((br.z-tl.z)/CELL)*sy;
  ctx.strokeRect(vpx,vpy,vpw,vph);
}
function camSW(sx,sy){
  // Approximate screenâ†’world for minimap viewport box
  const fov=camera.fov*Math.PI/180;
  const h2=Math.tan(fov/2)*camRadius;
  const w2=h2*camera.aspect;
  const rightV=new THREE.Vector3(-Math.sin(camTheta),0,Math.cos(camTheta));
  const fwdV=new THREE.Vector3(-Math.sin(camTheta)*Math.cos(camPhi),0,-Math.cos(camTheta)*Math.cos(camPhi));
  const ndcX=(sx/window.innerWidth)*2-1, ndcY=-((sy/window.innerHeight)*2-1);
  return {x:camTgt.x+ndcX*w2*Math.sin(camTheta)+camTgt.y*0,z:camTgt.z+ndcY*h2*0.5};
}

// FACTORY PANEL
function buildFactoryPanel(){
  const list=document.getElementById('fp-list');
  const own=document.getElementById('ub-list');
  list.innerHTML='';
  own.innerHTML='';

  const makeRow=(record,host,user=false)=>{
    const row=document.createElement('div');
    row.className='fp-row';
    const isActive=record.status==='active';
    const coords=record.cellKey?record.cellKey.split('_').map(Number):null;
    const displayCoords=coords?`SECTOR ${coords[1]+1}-${coords[0]+1}`:'LAST SEEN';
    row.innerHTML=`<div class="fp-dot" style="background:${isActive?(user?'#8fda7f':'#dd6e43'):'#5c5c5c'}"></div><div class="fp-name${user?' user':''}">${record.label}</div><div class="fp-meta"><span class="fp-status ${isActive?'on':'off'}">${isActive?'ACTIVE':'DESTROYED'}</span><div class="fp-coord">${displayCoords}</div></div>`;
    row.onclick=()=>{
      const target=isActive&&record.cellKey&&cells[record.cellKey]?.mesh
        ? cells[record.cellKey].mesh.position
        : record.lastPos;
      focusWorld(target.x,target.z);
      toast(`Jumped to ${record.label}.`);
    };
    host.appendChild(row);
  };

  const factories=factoryRegistry.slice().sort((a,b)=>{
    if(a.status!==b.status)return a.status==='active'?-1:1;
    return a.label.localeCompare(b.label);
  });
  if(!factories.length){
    const empty=document.createElement('div');
    empty.className='fp-row';
    empty.innerHTML=`<div class="fp-dot" style="background:#444"></div><div class="fp-name">No factories tracked yet</div><div class="fp-meta"><span class="fp-status off">IDLE</span></div>`;
    list.appendChild(empty);
  } else factories.forEach(record=>makeRow(record,list,false));

  const buildings=userBuildingRegistry.slice().sort((a,b)=>{
    if(a.status!==b.status)return a.status==='active'?-1:1;
    return a.label.localeCompare(b.label);
  });
  if(!buildings.length){
    const empty=document.createElement('div');
    empty.className='fp-row';
    empty.innerHTML=`<div class="fp-dot" style="background:#444"></div><div class="fp-name user">No civic buildings yet</div><div class="fp-meta"><span class="fp-status off">EMPTY</span></div>`;
    own.appendChild(empty);
  } else buildings.forEach(record=>makeRow(record,own,true));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MISSIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function startM(idx){
  if(idx>=MISSIONS.length){endGame(true);return;}
  curMission=idx;mActive=true;
  const m=MISSIONS[idx];
  document.getElementById('g-tag').textContent=m.tag;
  document.getElementById('g-text').innerHTML=m.guide;
  document.getElementById('g-prog').textContent=m.prog(GS);
  document.getElementById('guide').style.display='block';
  document.getElementById('v-timer').closest('.pill').querySelector('.pval').style.color='#ffaa00';
  // Update top bar mission display
}
function checkM(){
  if(!mActive||curMission>=MISSIONS.length)return;
  const m=MISSIONS[curMission];
  document.getElementById('g-prog').textContent=m.prog(GS);
  if(m.check(GS)){
    mActive=false;
    const mf=document.getElementById('mflash');mf.style.display='flex';
    document.getElementById('mf-text').textContent='MISSION COMPLETE';
    setTimeout(()=>{mf.style.display='none';if(curMission+1>=MISSIONS.length)endGame(true);else startM(curMission+1);},2200);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RAYCASTING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getTile(e){
  const rect=canvas3.getBoundingClientRect();
  mouse2.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse2.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse2,camera);
  const th=raycaster.intersectObjects(tiles,false);
  if(th.length>0){const ud=th[0].object.userData;return{r:ud.r,c:ud.c};}
  const ah=raycaster.intersectObjects(scene.children,true);
  for(const h of ah){const pt=h.point;const c2=Math.floor((pt.x+GW*CELL/2)/CELL);const r2=Math.floor((pt.z+GH*CELL/2)/CELL);if(r2>=0&&r2<GH&&c2>=0&&c2<GW)return{r:r2,c:c2};}
  return null;
}
function getSewageHit(e){
  const rect=canvas3.getBoundingClientRect();
  mouse2.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse2.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse2,camera);
  // Only check polluted pond water meshes - no pipes/tubes
  const pondMeshes=ponds.filter(p=>p.polluted).map(p=>p.water);
  const pondHits=raycaster.intersectObjects(pondMeshes,false);
  if(pondHits.length>0){
    const hitMesh=pondHits[0].object;
    return {isPond:true,pond:ponds.find(p=>p.water===hitMesh)};
  }
  return null;
}
function cleanSewagePipe(hit){
  if(!hit)return false;
  if(hit.isPond){
    const pond=hit.pond;
    if(!pond)return true;
    if(!pond.polluted){toast('This pond is already clean!');return true;}
    if(GS.coins<30){toast('Need 30 coins!','warn');return true;}
    pond.polluted=false;
    pond.permanentDirty=false;
    updatePondVisual(pond);
    GS.coins-=30;
    GS.sewCleaned++;
    GS.water=clamp(GS.water+10,0,100);
    GS.pollution=clamp(GS.pollution-8,0,100);
    spawnFX(pond.group.position.x,pond.group.position.z,0x29aeff);
    spawnFX(pond.group.position.x,pond.group.position.z,0x88ffee);
    toast('Polluted pond purified! +10 Water');
    setStatus('Pond cleaned - the water is clearing.','clean');
    // Remove streams flowing into this pond
    sewageMeshes.filter(s=>s.userData.pondId===pond.id).forEach(s=>destroyStream(s));
    refreshPondPollution();
    updateUI();drawMinimap();checkM();
    return true;
  }
  return false;
}
canvas3.addEventListener('click',e=>{
  if(!running)return;
  const dx=Math.abs(e.clientX-mDown.x),dy=Math.abs(e.clientY-mDown.y);
  if(dx>9||dy>9)return;
  if(cleanMode){
    const sewageHit=getSewageHit(e);
    if(cleanSewagePipe(sewageHit))return;
  }
  const t2=getTile(e);if(t2)onTileClick(t2.r,t2.c);
});
let hoverThrottle=0;
canvas3.addEventListener('mousemove',e=>{
  const now=Date.now();if(now-hoverThrottle<50)return;hoverThrottle=now;
  if(!(selB||demoMode||cleanMode)){hoverMeshInst.visible=false;return;}
  const rect=canvas3.getBoundingClientRect();
  mouse2.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse2.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse2,camera);
  const th=raycaster.intersectObjects(tiles,false);
  if(th.length>0){
    const {r,c}=th[0].object.userData;
    hoverMeshInst.position.x=th[0].object.position.x;
    hoverMeshInst.position.z=th[0].object.position.z;
    hoverMeshInst.material.color.setHex(selB&&roadCellKeys.has(`${r}_${c}`)?0xff6633:(demoMode?0xff3322:cleanMode?0x1188cc:0x50ff30));
    hoverMeshInst.visible=true;
  }
  else hoverMeshInst.visible=false;
});

// Minimap click
document.getElementById('mm-canvas').addEventListener('click',e=>{
  const rect=e.target.getBoundingClientRect();
  const fx=(e.clientX-rect.left)/rect.width;const fy=(e.clientY-rect.top)/rect.height;
  camTgt.x=(fx*GW-GW/2+.5)*CELL;camTgt.y=.8;camTgt.z=(fy*GH-GH/2+.5)*CELL;updateCam();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  KEYBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function onKey(e){
  if(!running)return;
  switch(e.key){
    case 'ArrowUp':    camPhi=Math.max(CAM_MIN_PHI,camPhi-.06);updateCam();break;
    case 'ArrowDown':  camPhi=Math.min(CAM_MAX_PHI,camPhi+.06);updateCam();break;
    case 'ArrowLeft':  {const rv=new THREE.Vector3(-Math.sin(camTheta),0,Math.cos(camTheta));camTgt.addScaledVector(rv,-2);updateCam();}break;
    case 'ArrowRight': {const rv=new THREE.Vector3(-Math.sin(camTheta),0,Math.cos(camTheta));camTgt.addScaledVector(rv,2);updateCam();}break;
    case 'd':case 'D': toggleDemo();break;
    case 'Escape': selB=null;demoMode=false;cleanMode=false;document.getElementById('btn-demo').classList.remove('on');document.getElementById('btn-clean').classList.remove('on');document.querySelectorAll('.bbt').forEach(b=>b.classList.remove('sel'));hoverMeshInst.visible=false;setStatus('Mode cancelled');break;
    case '1':case '2':case '3':case '4':case '5':case '6':case '7':case '8':{const idx=parseInt(e.key)-1;if(idx<BUILDS.length){const b=BUILDS[idx];if(b.skyReq&&skyPhase<b.skyReq){toast(`${b.nm} needs grey sky first.`,'warn');return;}selectB(b.id);}}break;
    case 'Home': camTheta=DEFAULT_CAM.theta;camPhi=DEFAULT_CAM.phi;camRadius=DEFAULT_CAM.radius;camTgt.copy(DEFAULT_CAM.target);updateCam();break;
    case '+':case '=': camRadius=Math.max(8,camRadius*.88);updateCam();break;
    case '-': camRadius=Math.min(72,camRadius*1.14);updateCam();break;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GAME FLOW
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function clearGameTimers(){
  clearInterval(gTimer);
  clearInterval(dayTimer);
  clearInterval(aiTimer);
  clearInterval(raidTimer);
  clearTimeout(raidStartTimer);
  raidTimer=null;
  raidStartTimer=null;
}
function startGame(){
  document.getElementById('splash').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('end').style.display='none';
  selB=null;demoMode=false;cleanMode=false;
  camTheta=DEFAULT_CAM.theta;camPhi=DEFAULT_CAM.phi;camRadius=DEFAULT_CAM.radius;camTgt.copy(DEFAULT_CAM.target);
  GS={air:15,water:8,happy:20,pop:30,pollution:80,coins:800,day:1,timeLeft:600,eco:0,sewCleaned:0,facDest:0,greenBuilt:0,filterBuilt:0};
  skyPhase=0;treesBuilt=0;demoUsed=0;demoResetTimer=60;gameSeconds=0;animT=0;curMission=0;mActive=false;
  clearGameTimers();
  initScene();buildBuildBar();updateUI();updateTimer();updateCam();rsz();
  setStatus('Restore the city | build beside roads | click the minimap or side panels to jump');
  setCitizenMaskState(true);
  running=true;clock.start();animate();
  gTimer=setInterval(()=>{
    if(!running)return;
    GS.timeLeft--;gameSeconds++;updateTimer();
    demoResetTimer--;if(demoResetTimer<=0){demoUsed=0;demoResetTimer=60;document.getElementById('v-demo').textContent=4;}
    let decay=0;Object.values(cells).forEach(c=>{if(c?.bd?.polD<0)decay+=Math.abs(c.bd.polD)*.01;});
    GS.pollution=clamp(GS.pollution-decay,0,100);
    checkSkyPhase();updateUI();
    if(GS.timeLeft<=0)endGame(false,'Time expired. The machines won.');
  },1000);
  dayTimer=setInterval(()=>{
    if(!running)return;GS.day++;
    let inc=0;Object.values(cells).forEach(c=>{if(c?.bd)inc+=c.bd.cpd;});
    if(inc>0){GS.coins+=inc;toast(`+${inc} income for Day ${GS.day}`);}
    const fc=Object.values(cells).filter(c=>c?.type==='factory').length;
    GS.pollution=clamp(GS.pollution+fc*.48,0,100);GS.air=clamp(GS.air-fc*.05,0,100);
    updateUI();checkM();drawMinimap();
  },6000);
  aiTimer=setInterval(()=>{if(running)aiTurn();},22000);
  raidStartTimer=setTimeout(()=>{
    if(!running)return;
    aiDestroyBuilding();
    raidTimer=setInterval(()=>{if(running)aiDestroyBuilding();},90000);
  },50000);
  drawGuideAvatar();
  setTimeout(()=>startM(0),1000);
}
function restartGame(){running=false;clearGameTimers();setTimeout(startGame,100);}
function endGame(won,reason=''){
  running=false;clearGameTimers();
  const eco=calcEco(GS);const built=Object.values(cells).filter(c=>c?.bd).length;
  const el=document.getElementById('end');el.className=won?'win':'lose';el.style.display='flex';
  document.getElementById('e-ttl').textContent=won?'CITY RESTORED':'CITY LOST';
  document.getElementById('e-ttl').className='ettl '+(won?'win':'lose');
  document.getElementById('e-body').textContent=`${reason||'All missions complete!'}\n\nEco Score: ${eco}% | Day: ${GS.day}\nPollution: ${Math.round(GS.pollution)}%\nBuildings: ${built}\nFactories demolished: ${GS.facDest}\nSewage cleaned: ${GS.sewCleaned}\nPopulation: ${GS.pop}\n\nBy Niketh K, Class X-D`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ANIMATION LOOP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const clock=new THREE.Clock();
function animate(){
  if(!running)return;
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.08);
  animT+=dt;
  smoothFrame=lerp(smoothFrame,dt,.08);
  if(animT-perfTuneClock>.6){
    const cap=Math.min(window.devicePixelRatio || 1,DPR_CAP);
    let next=dynamicPixelRatio;
    if(smoothFrame>1/54&&dynamicPixelRatio>.82)next=Math.max(.82,dynamicPixelRatio-.05);
    else if(smoothFrame<1/63&&dynamicPixelRatio<cap)next=Math.min(cap,dynamicPixelRatio+.03);
    if(Math.abs(next-dynamicPixelRatio)>.01){
      dynamicPixelRatio=next;
      syncRendererSize();
    }
    perfTuneClock=animT;
  }
  const airN=GS.air/100,polN=GS.pollution/100;
  const sp=SKY[clamp(skyPhase,0,4)];

  // Three.js lighting/fog
  scene.fog.color.setHex(sp.fog);scene.fog.near=sp.fN;scene.fog.far=sp.fF;
  ambL.color.setHex(sp.aC);ambL.intensity=sp.aI;
  sunL.color.setHex(sp.sC);sunL.intensity=sp.sI;
  toxL.intensity=sp.tI;toxL.color.setRGB(lerp(1,.1,airN),lerp(.27,.5,airN),0);
  toxL.position.x=Math.sin(animT*.3)*6;toxL.position.z=Math.cos(animT*.24)*6;
  if(skyDome){
    skyDome.position.copy(camera.position);
    skyUniforms.topColor.value.set(sp.s1);
    skyUniforms.midColor.value.copy(new THREE.Color(sp.s1)).lerp(new THREE.Color(sp.s2),.55);
    skyUniforms.bottomColor.value.set(sp.s2);
    const blueSky=skyPhase>=4;
    sunOrb.visible=blueSky;
    sunGlow.visible=blueSky;
    if(sunOrb.userData.corona)sunOrb.userData.corona.visible=blueSky;
    if(sunOrb.userData.rays)sunOrb.userData.rays.forEach(r=>r.visible=blueSky);
    if(blueSky){
      sunGlow.material.opacity=.28+.28*Math.sin(animT*.6)*airN;
      sunOrb.material.color.set(0xfff1c2);
      // Pulse corona
      if(sunOrb.userData.coronaMat){
        sunOrb.userData.coronaMat.opacity=.12+.08*Math.sin(animT*1.1);
      }
      // Slowly rotate rays
      if(sunOrb.userData.rays){
        sunOrb.userData.rays.forEach((ray,i)=>{
          ray.material.opacity=.06+.07*Math.sin(animT*.7+i*.9);
          ray.rotation.z=i*Math.PI/4+animT*.04;
        });
      }
    }
    skyClouds.forEach((cloud,index)=>{
      cloud.mesh.position.x=Math.sin(animT*cloud.speed+cloud.phase)*34;
      cloud.mesh.position.z=Math.cos(animT*cloud.speed*.7+cloud.phase)*22;
      cloud.mesh.material.opacity=blueSky ? .08 : .14+(index%2)*.03;
    });
  }

  // Hover pulse
  if(hoverMeshInst.visible)hoverMeshInst.material.opacity=.35+.2*Math.sin(animT*5);

  // Rise-from-ground buildings
  Object.values(cells).forEach(c=>{
    if(c?.mesh?.userData.rising){
      c.mesh.position.y=Math.min(0,c.mesh.position.y+dt*4.5);
      if(c.mesh.position.y>=-.05){c.mesh.position.y=0;c.mesh.userData.rising=false;}
    }
  });

  // Windmill blades
  windmills.forEach(w=>w.rotation.z+=dt*(.65+airN*1.6));

  // Factory smokes
  smokes.forEach(s=>{s.mesh.position.y=s.base+Math.sin(animT*.7+s.phase)*.48;s.mesh.material.opacity=clamp((.5+.15*Math.sin(animT*1.1+s.phase))*polN,0,.68);s.mesh.scale.setScalar(1+.22*Math.sin(animT+s.phase));});

  // Factory drips
  drips.forEach(d=>{d.mesh.position.y=.1+Math.abs(Math.sin(animT*2.3+d.phase))*.22;});

  // Filter rings
  rings.forEach(r=>{r.mesh.scale.setScalar(1+.09*Math.sin(animT*2+r.phase));r.mesh.material.emissiveIntensity=.4+.32*Math.sin(animT*1.5+r.phase);});

  // Rivers shimmer in animate loop (no tube particles)

  ponds.forEach((pond,index)=>{
    pond.group.position.y=.042+Math.sin(animT*1.2+index)*.006;
    pond.rim.scale.setScalar(1+.022*Math.sin(animT*2.0+index));
    if(!pond.polluted){
      // Blue clean water - gentle shimmer
      pond.water.material.opacity=.80+.10*Math.sin(animT*2.2+index*1.2);
      pond.water.material.color.setHex(0x3a9fd4);
      pond.rim.material.opacity=.24+.08*Math.sin(animT*1.7+index*.6);
    } else {
      // Dark green toxic - sluggish pulse
      pond.water.material.opacity=.88+.04*Math.sin(animT*.8+index);
      pond.water.material.color.setHex(0x1a4a1a);
    }
  });

  // Grass patches grow
  grassPts.forEach(gp=>{if(gp.s<1){gp.s=Math.min(1,gp.s+dt*.42);gp.mesh.scale.set(gp.s,gp.s,gp.s);}});

  // Atm smog
  atmParts.forEach(a=>{a.mesh.position.y=a.baseY+Math.sin(animT*a.spd+a.phase)*.38;a.mesh.position.x+=dt*.045;if(a.mesh.position.x>GW*CELL*.62)a.mesh.position.x=-GW*CELL*.62;a.mesh.material.opacity=lerp(.13,.01,airN)*(0.58+0.42*Math.sin(animT*.4+a.phase));});

  // FX particles
  for(let i=fxParts.length-1;i>=0;i--){const p=fxParts[i];p.position.x+=p.userData.vx;p.position.y+=p.userData.vy;p.position.z+=p.userData.vz;p.userData.vy-=dt*.2;p.userData.life-=dt*2;p.material.opacity=Math.max(0,p.userData.life);if(p.userData.life<=0){scene.remove(p);fxParts.splice(i,1);}}

  // Humans walk
  humans.forEach(h=>{h.userData.angle+=dt*h.userData.speed;h.position.x=h.userData.cx+Math.cos(h.userData.angle)*h.userData.radius;h.position.z=h.userData.cz+Math.sin(h.userData.angle)*h.userData.radius;h.position.y=Math.abs(Math.sin(animT*3+h.userData.bob))*.055;h.rotation.y=-h.userData.angle+Math.PI/2;});

  // Construction workers animate - hammer swinging
  workerObjs.forEach(w=>{
    w.userData.phase+=dt*4.5;
    const ph=w.userData.phase;
    // Left arm slight sway
    if(w.userData.la)w.userData.la.rotation.x=Math.sin(ph*.4)*.18;
    // Right arm swings hammer up and down hard
    if(w.userData.ra){
      const swing=Math.max(0,Math.sin(ph));
      w.userData.ra.rotation.x=-swing*1.85; // overhead swing
      // Impact thud: snap down hard
      if(w.userData.ra.rotation.x>-0.1&&Math.sin(ph-dt*4.5)<0){
        // moment of impact - slight forward lurch
        w.userData.ra.rotation.x=-0.05;
      }
    }
    // Bob body slightly
    w.position.y=Math.abs(Math.sin(ph*.35))*.025;
  });

  // Bomb demolition
  for(let i=bombObjs.length-1;i>=0;i--){
    const bomb=bombObjs[i];
    bomb.time+=dt;
    const parts=bomb.mesh.userData;
    if(!bomb.exploded){
      parts.led.intensity=1.1+.9*Math.sin(bomb.time*12);
      parts.ring.scale.setScalar(1+.18*Math.sin(bomb.time*9));
      parts.body.position.y=.26+.03*Math.sin(bomb.time*16);
      if(bomb.time>=1.0){
        bomb.exploded=true;
        parts.body.visible=false;
        parts.ring.visible=false;
        parts.led.intensity=2.8;
        parts.shock.material.opacity=.8;
        spawnFX(bomb.x,bomb.z,0xff8844);
        spawnFX(bomb.x,bomb.z,0xffd27a);
        const cell=cells[bomb.cellKey];
        if(cell){
          if(cell.type==='factory'){
            GS.facDest++;
            GS.air=clamp(GS.air+8,0,100);
            GS.pollution=clamp(GS.pollution-12,0,100);
            toast('Factory destroyed. Its dirty runoff was cut off.');
          } else if(cell.bd){
            GS.coins+=bomb.refund;
            GS.air=clamp(GS.air-cell.bd.aD*.4,0,100);
            GS.water=clamp(GS.water-cell.bd.wD*.4,0,100);
            GS.happy=clamp(GS.happy-cell.bd.hD*.35,0,100);
            GS.pop=clamp(GS.pop-cell.bd.pD,0,1000);
            toast(`Structure cleared. Refund: ${bomb.refund} coins.`);
          } else toast('Site cleared.');
          removeCellRecord(bomb.cellKey);
          updateUI();checkM();drawMinimap();buildFactoryPanel();
        }
      }
    } else {
      parts.shock.scale.setScalar(1+bomb.time*2.3);
      parts.shock.material.opacity=Math.max(0,.95-bomb.time*1.05);
      if(bomb.time>=1.7){
        scene.remove(bomb.mesh);
        bombObjs.splice(i,1);
      }
    }
  }

  // Children run to school
  for(let i=children.length-1;i>=0;i--){
    const ch=children[i];if(ch.userData.arrived)continue;
    const dx=ch.userData.tx-ch.position.x,dz=ch.userData.tz-ch.position.z;
    const dist=Math.sqrt(dx*dx+dz*dz);
    if(dist<.5){ch.userData.arrived=true;scene.remove(ch);children.splice(i,1);continue;}
    const spd=ch.userData.speed*dt;
    ch.position.x+=dx/dist*spd;ch.position.z+=dz/dist*spd;
    ch.position.y=Math.abs(Math.sin(animT*7+ch.userData.bob))*.12;
    ch.rotation.y=Math.atan2(-dx,-dz);
  }

  // Cars drive straight along segments. When segment ends, pick a new random one.
  carObjs.forEach(car=>{
    car.t+=car.speed*dt;
    if(car.t>=1){
      car.t=0;
      // Pick a random segment from the road network and drive it forward
      const newIdx=Math.floor(R()*roadNetwork.length);
      car.segIndex=newIdx;
      car.dir=R()>.5?1:-1;
    }
    const seg=roadNetwork[car.segIndex];
    const fromX=car.dir===1?seg.ax:seg.bx;
    const fromZ=car.dir===1?seg.az:seg.bz;
    const toX=car.dir===1?seg.bx:seg.ax;
    const toZ=car.dir===1?seg.bz:seg.az;
    const dx=toX-fromX, dz=toZ-fromZ;
    const len=Math.hypot(dx,dz)||1;
    const nx=-dz/len, nz=dx/len;
    car.mesh.position.x=lerp(fromX,toX,car.t)+nx*car.laneOffset;
    car.mesh.position.z=lerp(fromZ,toZ,car.t)+nz*car.laneOffset;
    car.mesh.position.y=0;
    car.mesh.rotation.y=Math.atan2(dz,dx);
  });

  // Missiles fly parabolic arc
  for(let i=missileObjs.length-1;i>=0;i--){
    const m=missileObjs[i];if(m.done)continue;
    m.t+=m.speed*dt;
    const mt=clamp(m.t,0,1);
    m.mesh.position.x=lerp(m.src.x,m.dst.x,mt);
    m.mesh.position.y=lerp(m.src.y,m.dst.y,mt)+200*Math.sin(mt*Math.PI)/60;
    m.mesh.position.z=lerp(m.src.z,m.dst.z,mt);
    // Point missile toward target
    const dx=m.dst.x-m.src.x,dy=m.dst.y-m.src.y+200*Math.cos(mt*Math.PI)/60,dz=m.dst.z-m.src.z;
    m.mesh.rotation.y=Math.atan2(-dx,-dz);m.mesh.rotation.z=Math.atan2(dy,Math.sqrt(dx*dx+dz*dz));
    if(m.t>=1){
      m.done=true;
      const cell=cells[m.key];
      if(cell&&!cell.removed){cell.removed=true;const bd=cell.bd;removeCellRecord(m.key);
        if(bd){GS.air=clamp(GS.air-bd.aD*.7,0,100);GS.pop=clamp(GS.pop-bd.pD,0,1000);GS.pollution=clamp(GS.pollution-bd.polD*.7,0,100);}
        spawnFX(m.dst.x,m.dst.z,0xff2200);
      }
      setTimeout(()=>{scene.remove(m.mesh);missileObjs.splice(i,1);},200);
      updateUI();drawMinimap();buildFactoryPanel();
    }
  }

  renderer.render(scene,camera);
}

rsz();
document.getElementById('btn-start')?.addEventListener('click',startGame);
document.getElementById('btn-demo')?.addEventListener('click',toggleDemo);
document.getElementById('btn-clean')?.addEventListener('click',toggleClean);
document.getElementById('btn-guide-ok')?.addEventListener('click',hideGuide);
document.getElementById('btn-restart')?.addEventListener('click',restartGame);
Object.assign(window,{startGame,restartGame,toggleDemo,toggleClean,hideGuide});
