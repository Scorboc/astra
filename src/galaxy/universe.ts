import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLANETS } from './journey';
import type { PlanetId } from './journey';
import { WORLDS, flightPose, finiteFlight, wrapFlight, flightWorld, FLIGHT_STOPS, OBSERVATORY_POSITION, OBSERVATORY_LOAD_DISTANCE, OBSERVATORY_ROTATION } from './universe-path';
import { atlasWidthForDiameter, renderPixelRatio } from './surface-resolution';
import { createPlanetColorDetail } from './planet-color-detail';
import { configureOriginFullTexture, originTextureWidth } from './origin-full-texture';
import { createAsteroidStream, createAsteroidWeather } from './asteroid-stream';
import { WORLD_THEMES } from './world-themes';
import { createHazeTextures, createPlanetHaze, HAZE_PALETTES, HAZE_FORMS } from './origin-haze';
import { createStarfieldClose } from './starfield-close';
import { nebulaColor } from './space-color';
import type { ObservatoryWorld } from './observatory-world.js';

type Mode = 'flight' | 'focus' | 'map' | 'surface' | 'observatory';
type Callbacks = { pick:(id:PlanetId)=>void; observatory:()=>void; landed:(yes:boolean)=>void; failed:()=>void };
const V = (p:readonly number[])=>new T.Vector3(p[0],p[1],p[2]);
const mix = T.MathUtils.lerp;
function random(seed=8714) { return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296); }
function glowTexture() {
  const c=document.createElement('canvas');c.width=c.height=128;
  const x=c.getContext('2d')!,g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'#ffffff');g.addColorStop(.12,'#ffffffb0');g.addColorStop(.35,'#ffffff20');g.addColorStop(1,'#ffffff00');
  x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);
}
function cloudTexture() {
  // A soft gas particle, not an image of the world. Each particle occupies a
  // different physical position and is occluded by opaque meshes.
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!,rand=random(293);
  for(let i=0;i<48;i++) {const cx=64+rand()*128,cy=64+rand()*128,r=20+rand()*65,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.065)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,256,256);}
  return new T.CanvasTexture(c);
}
function inscriptionTexture() {
  const c=document.createElement('canvas');c.width=1536;c.height=1200;const x=c.getContext('2d')!;
  x.textAlign='center';x.shadowColor='#10232c';x.shadowBlur=4;
  x.fillStyle='#e9d2a4';x.font='26px Arial';x.fillText('A S T R A   /   НАЧАЛО ПУТИ',768,150);
  x.font='74px Georgia';x.fillText('Не найти себя.',768,300);x.fillText('А узнать в движении.',768,395);
  x.fillStyle='#e8e3d6';x.font='34px Arial';
  ['Маленькие реальные действия.','30 дней проб и наблюдений.','Твои ресурсы. Твой темп.','', 'Несколько объяснимых маршрутов','и предварительный план на 90 дней.','Направление выбираешь ты.'].forEach((line,i)=>x.fillText(line,768,540+i*61));
  x.fillStyle='#d2bd96';x.font='25px Arial';x.fillText('Космос — образ пути, а не предсказание судьбы.',768,1090);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
const noiseGLSL=`float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}float fbm(vec3 p){return noise3(p)*.5+noise3(p*2.02)*.25+noise3(p*4.03)*.125+noise3(p*8.01)*.0625;}`;

export type GalaxyScene=ReturnType<typeof createGalaxyScene>;
export function createGalaxyScene(host:HTMLElement,labelHost:HTMLElement,callbacks:Callbacks) {
  const benchmark=true; // About is a landing site on Istok, not another planet.
  host.dataset.benchmark=String(benchmark);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=host.clientWidth<700,rand=random();
  let disposed=false,paused=reduced.matches,stage=0,mode:Mode='flight',width=1,height=1,elapsed=0,weatherTime=0,last=performance.now();
  try{paused=paused||sessionStorage.getItem('astra.motion-paused')==='true';}catch{/* Motion controls also work without storage. */}
  document.body.classList.toggle('motion-paused',paused);
  let travel=0,desiredTravel=0,fps=0,frames=0,fpsAt=last,raf=0,dirty=true,lastRender=0;
  let focused:PlanetId='origin',isLanded=false,dragged=false,press={x:0,y:0},touchY=0;
  let transition:{from:T.Vector3;to:T.Vector3;lookFrom:T.Vector3;lookTo:T.Vector3;start:number;duration:number;done?:()=>void}|undefined;
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'default'});
  renderer.setPixelRatio(renderPixelRatio(host.clientWidth,host.clientHeight,devicePixelRatio));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Трёхмерная вселенная. Колесо или свайп — полёт. Нажми на планету, чтобы открыть её. Стрелки вверх и вниз — движение по маршруту.');host.append(canvas);
  const scene=new T.Scene();scene.background=new T.Color('#02040c');scene.fog=new T.FogExp2('#030a18',.00065);
  const environmentGenerator=new T.PMREMGenerator(renderer),environmentRoom=new RoomEnvironment();
  const environment=environmentGenerator.fromScene(environmentRoom,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.18;
  environmentRoom.dispose();environmentGenerator.dispose();
  const camera=new T.PerspectiveCamera(48,1,.025,1800);scene.add(camera);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  for(const target of [composer.renderTarget1,composer.renderTarget2])target.depthTexture=new T.DepthTexture(target.width,target.height,T.UnsignedIntType);
  const bloom=new UnrealBloomPass(new T.Vector2(1,1),.34,.55,.9);composer.addPass(bloom);composer.addPass(new OutputPass());
  const start=flightPose(0);camera.position.copy(start.position);camera.lookAt(start.target);
  const closeStars=createStarfieldClose(camera,mobile,reduced.matches,renderer.getPixelRatio());
  host.dataset.starfieldClose=`${closeStars.count}:mint-jade-bone`;
  const controls=new OrbitControls(camera,canvas);controls.target.copy(start.target);controls.enabled=false;
  controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.rotateSpeed=.55;
  controls.minDistance=7;controls.maxDistance=340;controls.zoomSpeed=.75;controls.maxPolarAngle=Math.PI*.95;
  scene.add(new T.HemisphereLight('#b1dbff','#17142a',.55));
  const sun=new T.DirectionalLight('#fff0d5',2.8);sun.position.set(-25,45,15);scene.add(sun);
  if(benchmark){renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:85});sun.shadow.bias=-.0002;sun.shadow.normalBias=.012;sun.target.position.set(-8,5.5,0);scene.add(sun.target);}
  const rim=new T.DirectionalLight('#697bff',1.3);rim.position.set(30,10,-150);scene.add(rim);
  const glow=glowTexture(),cloud=cloudTexture(),extraTextures:T.Texture[]=[glow,cloud];
  const loader=new T.TextureLoader(),loadedMaps=new Map<string,T.Texture>();
  const textures=new Map<string,Promise<T.Texture>>();
  const detailMapUniform={value:null as T.Texture|null},detailReadyUniform={value:0},surfaceClock={value:0};
  const hazeTextures=createHazeTextures();extraTextures.push(...hazeTextures);
  const planetFogTextures=createHazeTextures(true);extraTextures.push(...planetFogTextures);
  const planetMists=PLANETS.map((p,i)=>{
    const spec=WORLDS[p.id],mist=createPlanetHaze(V(spec.position),spec.radius,mobile,planetFogTextures,HAZE_PALETTES[p.id],i*1.37,p.id);
    scene.add(mist.group);return mist;
  });
  host.dataset.originHaze='irregular-soft-v2';
  host.dataset.planetHaze=PLANETS.map(p=>p.id).join(',');
  host.dataset.hazeForms=PLANETS.map(p=>`${p.id}:${HAZE_FORMS[p.id].name}`).join(',');
  const detailPromise=loader.loadAsync('/benchmark-origin/stone.webp').then(t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(disposed)t.dispose();else {extraTextures.push(t);detailMapUniform.value=t;detailReadyUniform.value=1;host.dataset.detailTexture='ready';dirty=true;}return t;}).catch(()=>{host.dataset.detailTexture='failed';return null;});
  function loadMap(id:string) {
    if(!textures.has(id))textures.set(id,loader.loadAsync(`/universe/${WORLD_THEMES[id as keyof typeof WORLD_THEMES].asset}.webp`).catch(error=>{
      if(id==='origin')return loader.loadAsync('/universe/origin.webp');
      throw error;
    }).then(t=>{
      t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      if(disposed)t.dispose();else {loadedMaps.set(id,t);dirty=true;}return t;
    }));return textures.get(id)!;
  }
  // Stars and dust are distributed throughout space: moving the camera changes
  // parallax, scale, occlusion and which side of a planet is visible.
  const starP:number[]=[],starC:number[]=[],starS:number[]=[];
  for(let i=0;i<(mobile?2500:4400);i++) {const a=rand()*6.283,r=120+rand()*700,y=(rand()-.5)*600;starP.push(Math.cos(a)*r,y,Math.sin(a)*r-70);const c=new T.Color().setHSL(.53+rand()*.18,.15+rand()*.3,.62+rand()*.34);starC.push(c.r,c.g,c.b);starS.push(rand()*6.28);}
  const starG=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starP,3)).setAttribute('color',new T.Float32BufferAttribute(starC,3)).setAttribute('aPhase',new T.Float32BufferAttribute(starS,1));
  const starM=new T.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uRatio:{value:renderer.getPixelRatio()}},vertexShader:`attribute float aPhase;uniform float uTime,uRatio;varying vec3 vColor;varying float vA;void main(){vColor=color;vA=.65+.2*sin(uTime*.4+aPhase);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=uRatio*(1.+mod(aPhase,1.8));gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 vColor;varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vColor,vA*smoothstep(.5,.03,d));}`});scene.add(new T.Points(starG,starM));
  const gas=new T.Group();scene.add(gas);
  for(let i=0;i<30;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:cloud,color:i%3===0?'#8870cf':i%3===1?'#167f92':'#3856a3',transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));sprite.position.set((rand()-.5)*170,(rand()-.5)*90,-20-rand()*240);sprite.scale.set(70+rand()*70,30+rand()*65,1);sprite.material.rotation=rand()*6.28;gas.add(sprite);}
  for(const [i,object] of gas.children.entries()){
    const sprite=object as T.Sprite;
    sprite.material.color.copy(nebulaColor('#'+sprite.material.color.getHexString()));sprite.material.opacity=.18;
    // Owner: blue/cyan background banks must not blanket the planets.
    if(i%3!==0){sprite.scale.x*=.62;sprite.scale.y*=.62;}
  }
  const dustP:number[]=[],dustC:number[]=[];
  for(let i=0;i<(mobile?4500:8000);i++){const arm=i%3,t=rand(),a=t*10+arm*2.094,r=12+t*115;dustP.push(Math.cos(a)*r+(rand()-.5)*7,-19+(rand()-.5)*(3+t*8),-80+Math.sin(a)*r*.82);const c=new T.Color().setHSL(.52+t*.2,.4,.33+rand()*.35);dustC.push(c.r,c.g,c.b);}
  const dust=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(dustP,3)).setAttribute('color',new T.Float32BufferAttribute(dustC,3)),new T.PointsMaterial({size:.16,map:glow,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));scene.add(dust);
  const planets=PLANETS.map(p=>{
    const spec=WORLDS[p.id],group=new T.Group();group.position.copy(V(spec.position));scene.add(group);
    const geo=new T.SphereGeometry(spec.radius,p.id==='origin'?(mobile?256:384):p.id==='aurora'?192:96,p.id==='origin'?(mobile?160:256):p.id==='aurora'?128:64);
    const theme=WORLD_THEMES[p.id];
    // Reuse the existing reflection environment; no extra maps or render passes.
    const material=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:theme.roughness,metalness:theme.metalness,
      clearcoat:theme.clearcoat,clearcoatRoughness:theme.clearcoatRoughness,
      envMap:environment.texture,envMapIntensity:theme.reflection,side:T.FrontSide});
    if(p.id==='origin')material.onBeforeCompile=shader=>{
      shader.uniforms.uMoonClock=surfaceClock;
      shader.fragmentShader='uniform float uMoonClock;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        // Orange emissive fissures only; grey regolith and the single oasis stay unlit.
        float lava=smoothstep(.13,.38,diffuseColor.r-max(diffuseColor.g,diffuseColor.b));
        totalEmissiveRadiance+=vec3(1.,.17,.015)*lava*(.2+.025*sin(uMoonClock*.7));
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=mix(.62,.3,lava);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',
        '#include <lights_physical_fragment>\nmaterial.clearcoat*=mix(.35,1.,lava);');
    };
    if(!['origin','aurora','about'].includes(p.id)){
      material.onBeforeCompile=shader=>{
        shader.uniforms.uDetailMap=detailMapUniform;shader.uniforms.uDetailReady=detailReadyUniform;
        shader.vertexShader='varying vec3 vSurface,vSurfaceNormal;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=position;vSurfaceNormal=normal;');
        shader.fragmentShader='varying vec3 vSurface,vSurfaceNormal;uniform sampler2D uDetailMap;uniform float uDetailReady;\n'+noiseGLSL+'\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          vec3 w=pow(abs(normalize(vSurfaceNormal)),vec3(4.));w/=max(.001,w.x+w.y+w.z);
          vec3 detail=vec3(.5);if(uDetailReady>.5)detail=texture2D(uDetailMap,vSurface.yz*1.6).rgb*w.x+texture2D(uDetailMap,vSurface.xz*1.6).rgb*w.y+texture2D(uDetailMap,vSurface.xy*1.6).rgb*w.z;
          float grain=dot(detail,vec3(.33));diffuseColor.rgb*=.95+grain*.10;
          ${p.id==='solis'?'float neon=smoothstep(.12,.42,max(diffuseColor.r,diffuseColor.b));totalEmissiveRadiance+=diffuseColor.rgb*neon*.9;':''}`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          float h=grain*.002*(1.-smoothstep(.003,.02,length(fwidth(vSurface))));
          vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),r1=cross(q1,normal),r2=cross(normal,q0);
          float det=dot(q0,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(h)*r1+dFdy(h)*r2));`);
      };
    }
    const body=new T.Mesh(geo,material);body.userData.planet=p.id;group.add(body);
    // All planets use irregular surrounding haze instead of a uniform neon rim.
    const label=document.createElement('button');label.className='planet-label';label.style.setProperty('--planet',p.color);label.innerHTML=`<i></i><span>${p.name}<small>${p.subtitle}</small></span>`;label.setAttribute('aria-label',`${p.name} — ${p.subtitle}`);label.addEventListener('click',()=>callbacks.pick(p.id));labelHost.append(label);
    return {id:p.id as PlanetId,group,body,material,label,radius:spec.radius,spin:.0025+(rand()*.002),rings:[] as T.Object3D[]};
  });
  const pickMeshes:T.Object3D[]=planets.map(p=>p.body);
  let observatoryWorld:ObservatoryWorld|undefined;
  // Separate destination opposite the Velir–Nereya sector, not a planetary moon.
  const stationPosition=new T.Vector3(...OBSERVATORY_POSITION);
  const stationLabel=document.createElement('button');stationLabel.className='planet-label observatory-label';stationLabel.style.setProperty('--planet','#9cdbef');stationLabel.innerHTML='<i></i><span>Обсерватория<small>Твои наблюдения и открытия</small></span>';stationLabel.setAttribute('aria-label','Открыть обсерваторию');stationLabel.hidden=true;stationLabel.addEventListener('click',callbacks.observatory);labelHost.append(stationLabel);
  host.dataset.observatory='deferred';
  let observatoryLoading:Promise<void>|undefined;
  function loadObservatory(){
    if(disposed||observatoryWorld||observatoryLoading||host.dataset.observatory==='failed')return;
    host.dataset.observatory='loading';
    observatoryLoading=import('./observatory-world.js').then(({createObservatoryWorld})=>{
      if(disposed)return;
      return createObservatoryWorld(scene,renderer,composer,camera,{mobile,position:stationPosition,rotation:OBSERVATORY_ROTATION,onState:value=>{host.dataset.observatory=value;dirty=true;},onDirty:()=>{dirty=true;}});
    }).then(world=>{if(!world)return;if(disposed){world.dispose();return;}observatoryWorld=world;dirty=true;}).catch(error=>{host.dataset.observatory='failed';console.error('Observatory loading failed',error);});
  }
  let detailAnimating=false;
  const crystalGeo=new T.CylinderGeometry(0,.24,1,5,1);
  crystalGeo.translate(0,.5,0);
  const dummy=new T.Object3D();
  const aurora=planets.find(p=>p.id==='aurora')!;
  // Lush archipelagos: preserve generated albedo, separate water from forest.
  aurora.body.userData.surface='green-paradise';host.dataset.aurora='green-paradise';
  aurora.material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float paradiseSea=smoothstep(.0,.07,diffuseColor.b-diffuseColor.r)
        *(1.-smoothstep(.015,.09,diffuseColor.g-diffuseColor.b));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=mix(.76,.16,paradiseSea);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',
      '#include <lights_physical_fragment>\nmaterial.clearcoat*=mix(.06,1.,paradiseSea);');
  };
  // Istok has one persistent full atlas; it must never receive partial RGB tiles.
  const colorDetail=createPlanetColorDetail(planets.filter(p=>p.id!=='origin'),renderer,host);
  // Grade the surface only, after base/16K color composition and before lighting.
  // Keep the UI, space haze, emissive lava/neon and highlight exposure unchanged.
  for(const p of planets){
    const original=p.material.onBeforeCompile,key=p.material.customProgramCacheKey();
    p.material.customProgramCacheKey=()=>key+'-surface-contrast-v1';
    p.material.onBeforeCompile=(shader,r)=>{
      original.call(p.material,shader,r);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
        float surfaceLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=max(vec3(0.),mix(vec3(surfaceLuma),diffuseColor.rgb,1.16));
        diffuseColor.rgb=clamp((diffuseColor.rgb-vec3(.18))*1.10+vec3(.18),0.,1.);
        #include <roughnessmap_fragment>`);
    };
  }
  const asteroidGeo=new T.IcosahedronGeometry(1,1),asteroidM=new T.MeshStandardMaterial({color:'#9e958c',roughness:.95,metalness:.12});
  const moonDebrisMaterial=new T.MeshStandardMaterial({color:'#a3a5a8',roughness:1,metalness:0,flatShading:true});
  const moonDebris=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),moonDebrisMaterial,mobile?28:52);
  for(let i=0;i<moonDebris.count;i++){
    const a=rand()*Math.PI*2,r=planets[0].radius*(1.18+rand()*.55);
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r*.72+1.3,(rand()-.5)*2.1-1.0);
    const size=.025+Math.pow(rand(),3)*.23;dummy.scale.set(size,size*(.55+rand()*.7),size*(.6+rand()*.5));
    dummy.rotation.set(rand()*6,rand()*6,rand()*6);dummy.updateMatrix();moonDebris.setMatrixAt(i,dummy.matrix);
  }
  planets[0].group.add(moonDebris);host.dataset.moonDebris=String(moonDebris.count);
  // Nested orbits contain real scattered rocks; not a picture of a ring.
  host.dataset.solisRing='soft-nebula-no-asteroids';
  for(const [id,tilt,color] of [['velir',-.42,'#b9d7e4']] as const) {
    const planet=planets.find(p=>p.id===id)!,ring=new T.Group();ring.rotation.set(1.25,tilt,.22);planet.group.add(ring);planet.rings.push(ring);
    const ringGeo=new T.RingGeometry(planet.radius*1.4,planet.radius*2,192,1);
    const pos=ringGeo.getAttribute('position'),uv=ringGeo.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,Math.hypot(pos.getX(i),pos.getY(i))/planet.radius,0);
    const ringMat=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{uColor:{value:new T.Color(color)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 uColor;varying vec2 vUv;void main(){float r=vUv.x;float stripes=.35+.35*sin(r*260.)+.15*sin(r*93.);float a=smoothstep(1.4,1.44,r)*smoothstep(2.,1.92,r)*(.11+stripes*.18);gl_FragColor=vec4(uColor,a);}`});ring.add(new T.Mesh(ringGeo,ringMat));
    const rocks=new T.InstancedMesh(asteroidGeo,asteroidM,mobile?120:240);
    for(let i=0;i<rocks.count;i++){const a=rand()*6.283,r=planet.radius*(1.42+rand()*.57);dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,(rand()-.5)*.17);dummy.rotation.set(rand()*6,rand()*6,rand()*6);dummy.scale.setScalar(.016+rand()*.06);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}ring.add(rocks);
  }
  // Near-field debris makes motion through the world perceptible even between planets.
  const debris=new T.InstancedMesh(asteroidGeo,asteroidM,mobile?130:240);
  for(let i=0;i<debris.count;i++){const side=rand()<.5?-1:1;dummy.position.set(side*(24+rand()*35),-16+rand()*28,-15-rand()*190);dummy.rotation.set(rand()*6,rand()*6,rand()*6);dummy.scale.set(.08+rand()*.25,.06+rand()*.3,.08+rand()*.2);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);}scene.add(debris);
  const asteroidStream=createAsteroidStream(mobile);scene.add(asteroidStream);
  host.dataset.asteroidStream=`dark-serpent-${asteroidStream.count}`;
  const asteroidWeather=createAsteroidWeather(mobile,hazeTextures);scene.add(asteroidWeather.group);
  host.dataset.asteroidWeather='pink-full-envelope-local-spirals-recurring-flashes';
  // Tiny autonomous courier passing through the same coordinates as the worlds.
  const courier=new T.Group(),hull=new T.Mesh(new T.ConeGeometry(.10,.55,5),new T.MeshStandardMaterial({color:'#cad7dc',metalness:.75,roughness:.3}));hull.rotation.x=Math.PI/2;courier.add(hull);
  const engine=new T.Sprite(new T.SpriteMaterial({map:glow,color:'#65d9ef',blending:T.AdditiveBlending,depthWrite:false}));engine.scale.setScalar(.8);engine.position.z=.3;courier.add(engine);scene.add(courier);

  // Landing site attached to the real description planet. There is no scene
  // replacement, hidden photo, or coordinate teleport when the camera lands.
  const surfaceScale=.22;
  const about=planets.find(p=>p.id==='origin')!,site=new T.Group();site.position.set(0,about.radius+.14,0);about.group.add(site);site.visible=false;
  const groundG=new T.PlaneGeometry(7,7,48,48);groundG.rotateX(-Math.PI/2);const gp=groundG.getAttribute('position');
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i),d=x*x+z*z;gp.setY(i,-d/(2*about.radius)+.035*Math.sin(x*8)*Math.cos(z*6));}groundG.computeVertexNormals();
  const groundMaterial=new T.MeshStandardMaterial({color:'#4d5154',roughness:.95,metalness:.12});site.add(new T.Mesh(groundG,groundMaterial));
  const rockShape=new T.Shape();rockShape.moveTo(-1.28,-.08);rockShape.lineTo(-1.4,.6);rockShape.lineTo(-1.15,1.6);rockShape.lineTo(-.65,1.81);rockShape.lineTo(.25,1.73);rockShape.lineTo(.9,1.86);rockShape.lineTo(1.38,1.28);rockShape.lineTo(1.45,.3);rockShape.lineTo(1.1,-.1);rockShape.closePath();
  const rock=new T.Mesh(new T.ExtrudeGeometry(rockShape,{depth:.55,bevelEnabled:true,bevelSize:.11,bevelThickness:.12,bevelSegments:2,steps:1}),new T.MeshStandardMaterial({color:'#58616b',roughness:.95,metalness:.12}));rock.position.z=-.58;site.add(rock);
  const rockUV=rock.geometry.getAttribute('uv');for(let i=0;i<rockUV.count;i++)rockUV.setXY(i,(rockUV.getX(i)+1.6)/3.2,(rockUV.getY(i)+.2)/2.2);
  const cliffPieces=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),rock.material,24);
  for(let i=0;i<24;i++){const side=i%2?1:-1,x=side*(1.15+rand()*1.5),z=-.6-rand()*.65;dummy.position.set(x,-x*x/(2*about.radius)+rand()*.55,z);dummy.rotation.set(rand()*.7,rand()*6,rand()*.8);dummy.scale.set(.35+rand()*.55,.6+rand()*1.1,.3+rand()*.55);dummy.updateMatrix();cliffPieces.setMatrixAt(i,dummy.matrix);}site.add(cliffPieces);
  const inscription=inscriptionTexture();extraTextures.push(inscription);
  const text=new T.Mesh(new T.PlaneGeometry(2.5,1.95),new T.MeshBasicMaterial({map:inscription,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));text.position.set(0,.9,.107);site.add(text);
  const siteCrystals=new T.InstancedMesh(crystalGeo,new T.MeshStandardMaterial({color:'#789eb7',roughness:.3,metalness:.5,emissive:'#12324b',emissiveIntensity:.3}),36);
  for(let i=0;i<siteCrystals.count;i++){const x=(i%2?1:-1)*(1.8+rand()*1.5),z=-1.6+rand()*3;dummy.position.set(x,-(x*x+z*z)/(2*about.radius),z);dummy.rotation.set((rand()-.5)*.5,rand()*6,(rand()-.5)*.45);dummy.scale.set(.3+rand()*.9,.5+rand()*1.5,.3+rand()*.9);dummy.updateMatrix();siteCrystals.setMatrixAt(i,dummy.matrix);}site.add(siteCrystals);
  const siteLight=new T.PointLight('#c6dcff',24,14,2);siteLight.position.set(-2,4,5);site.add(siteLight);
  let landscapePromise:Promise<void>|undefined;
  const waterTime={value:0};
  function loadLandscape(){
    if(!benchmark)return Promise.resolve();
    return landscapePromise??=Promise.all([new GLTFLoader().loadAsync('/benchmark-origin/coast.glb'),detailPromise]).then(([gltf,stoneMap])=>{
      if(!stoneMap)throw new Error('Материал поверхности недоступен');
      if(disposed){gltf.scene.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>v.dispose());});return;}
      const excluded:T.Object3D[]=[];
      const calibrated=new Set<T.Material>();
      gltf.scene.traverse(o=>{if((o as T.Light).isLight||(o as T.Camera).isCamera)excluded.push(o);const m=o as T.Mesh;if(m.isMesh){m.receiveShadow=true;m.castShadow=!m.name.includes('pool')&&!m.name.includes('coast');for(const mat of (Array.isArray(m.material)?m.material:[m.material])){
        if(calibrated.has(mat))continue;calibrated.add(mat);
        const standard=mat as T.MeshStandardMaterial;
        if(standard.name.startsWith('Limestone')){
          standard.color.set('#b8c3bb');standard.onBeforeCompile=shader=>{
            shader.uniforms.uStoneMap={value:stoneMap};
            shader.vertexShader='varying vec3 vStone,vStoneNormal;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;vStoneNormal=normal;');
            shader.fragmentShader='varying vec3 vStone,vStoneNormal;uniform sampler2D uStoneMap;\n'+noiseGLSL+'\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
              vec3 blend=pow(abs(normalize(vStoneNormal)),vec3(4.));blend/=max(.001,blend.x+blend.y+blend.z);
              vec3 rockColor=texture2D(uStoneMap,vStone.yz*.42).rgb*blend.x+texture2D(uStoneMap,vStone.xz*.42).rgb*blend.y+texture2D(uStoneMap,vStone.xy*.42).rgb*blend.z;
              diffuseColor.rgb*=rockColor*1.5;`);
            shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
              float grain=dot(rockColor,vec3(.33));vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);
              normal=normalize(normal+(cross(q1,normal)*dFdx(grain)+cross(normal,q0)*dFdy(grain))*2.);`);
          };
        }
        if(standard.name.startsWith('Turquoise')){
          standard.onBeforeCompile=shader=>{
            shader.uniforms.uWaterTime=waterTime;
            shader.vertexShader='varying vec3 vWater;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWater=position;');
            shader.fragmentShader='varying vec3 vWater;uniform float uWaterTime;\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
              normal=normalize(normal+vec3(sin(vWater.x*28.+uWaterTime*.65)*.075,cos(vWater.y*34.-uWaterTime*.4)*.075,0.));`);
          };
        }
      }}});
      excluded.forEach(o=>o.removeFromParent());
      // Re-fit the small landscape to the planet's curvature. A local cliff
      // must not retain the original nine-unit blockout's monumental scale.
      const curvedGeometries=new Set<T.BufferGeometry>();
      gltf.scene.traverse(o=>{const m=o as T.Mesh;if(!m.isMesh)return;
        if(m.userData.role==='shore rubble; shared geometry'){m.position.y+=(1-surfaceScale)*(m.position.x*m.position.x+m.position.z*m.position.z)/11;return;}
        if(curvedGeometries.has(m.geometry))return;curvedGeometries.add(m.geometry);
        const position=m.geometry.getAttribute('position');for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i);position.setY(i,position.getY(i)+(1-surfaceScale)*(x*x+z*z)/11);}position.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();
      });
      // Repeated shore fragments share one GPU draw instead of 86 objects.
      gltf.scene.updateMatrixWorld(true);
      const repeated=new Map<T.BufferGeometry,T.Mesh[]>();
      gltf.scene.traverse(o=>{const m=o as T.Mesh;if(m.isMesh&&!Array.isArray(m.material)){const group=repeated.get(m.geometry)??[];group.push(m);repeated.set(m.geometry,group);}});
      const inverseRoot=gltf.scene.matrixWorld.clone().invert();
      for(const [geometry,meshes] of repeated){if(meshes.length<3)continue;const batch=new T.InstancedMesh(geometry,meshes[0].material,meshes.length);batch.name='Shared coastal fragments';batch.castShadow=true;batch.receiveShadow=true;meshes.forEach((mesh,i)=>batch.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverseRoot,mesh.matrixWorld)));meshes.forEach(m=>m.removeFromParent());batch.computeBoundingSphere();gltf.scene.add(batch);}
      [site.children[0],rock,cliffPieces,siteCrystals].forEach(o=>{o.visible=false;});
      gltf.scene.scale.setScalar(surfaceScale);site.add(gltf.scene);
      text.scale.setScalar(surfaceScale);text.position.set(0,1.12*surfaceScale,-.96*surfaceScale);
      siteLight.color.set('#ffe0aa');siteLight.intensity=.12;siteLight.distance=2;siteLight.position.set(-.4,.66,.66);
      const waterFill=new T.PointLight('#4de6db',.08,2,2);waterFill.position.set(.44,.18,.4);site.add(waterFill);
      host.dataset.landscape='ready';dirty=true;
    }).catch(()=>{host.dataset.landscape='failed';landscapePromise=undefined;throw new Error('Не удалось загрузить берег Истока');});
  }
  scene.updateMatrixWorld(true);

  function updateMode(next:Mode) {
    bloom.strength=benchmark&&next==='surface'?.10:.34;
    mode=next;host.dataset.cameraMode=mode;document.body.dataset.cameraMode=mode;controls.enabled=mode!=='flight';
    controls.enableRotate=mode==='map'||mode==='surface'||mode==='observatory';
    document.querySelector('[data-action="flight"]')?.setAttribute('aria-pressed',String(mode==='flight'));
    document.querySelector('[data-action="map"]')?.setAttribute('aria-pressed',String(mode==='map'));
    dirty=true;
  }
  function fly(to:T.Vector3,target:T.Vector3,duration=1600,done?:()=>void) {
    transition={from:camera.position.clone(),to,lookFrom:controls.target.clone(),lookTo:target,start:performance.now(),duration:reduced.matches||paused?1:duration,done};controls.enabled=false;dirty=true;
  }
  let landingRequest=0;
  function leaveSurface(){landingRequest++;isLanded=false;callbacks.landed(false);camera.up.set(0,1,0);controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI*.95;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;}
  function home(forceFlight=false) {
    if(stage===4&&!forceFlight){overview();return;}
    leaveSurface();updateMode('flight');desiredTravel=FLIGHT_STOPS[Math.min(stage,4)];travel=desiredTravel;
    const pose=flightPose(travel);if(width<700)pose.position.z+=1.5;
    fly(pose.position,pose.target,1800);
  }
  function overview() {loadObservatory();leaveSurface();updateMode('map');controls.minDistance=45;controls.maxDistance=340;fly(new T.Vector3(width<700?100:74,72,width<700?128:48),new T.Vector3(-10,0,-66),2300);}
  function present(){
    leaveSurface();focused='origin';updateMode('focus');controls.minDistance=12;controls.maxDistance=80;
    // The approved window sits in the centre, with Istok cropped at the left.
    // A fixed composition prevents a planet from covering its text after a lap.
    fly(new T.Vector3(-1,4,19),new T.Vector3(4,4,-25),1400);
  }
  function observatory(){
    loadObservatory();
    leaveSurface();updateMode('observatory');controls.minDistance=10;controls.maxDistance=40;
    controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.6;controls.minAzimuthAngle=-.6;controls.maxAzimuthAngle=.6;
    const entranceOffset=new T.Vector3(0,1.35,width<700?31:23.4).applyAxisAngle(new T.Vector3(0,1,0),OBSERVATORY_ROTATION);
    fly(stationPosition.clone().add(entranceOffset),stationPosition.clone().add(new T.Vector3(0,5.76,0)),1600);
  }
  function focus(id:PlanetId) {
    if(id==='about'){land();return;}leaveSurface();focused=id;updateMode('focus');const p=planets.find(p=>p.id===id)!;
    controls.minDistance=p.radius*1.18;controls.maxDistance=p.radius*9;
    const offset=new T.Vector3(p.radius*.9,p.radius*.65,p.radius*(width<700?4.9:3.7));
    const target=p.group.position.clone();if(width>=700)target.x+=p.radius*.8;
    fly(p.group.position.clone().add(offset),target,1800);
  }
  function land(){
    leaveSurface();focused=about.id;updateMode('surface');controls.minDistance=benchmark?.28:1.4;controls.maxDistance=benchmark?2:10;
    const request=landingRequest;
    // Move first to the outward approach, then descend to the actual rock.
    const approach=about.group.localToWorld(new T.Vector3(0,about.radius+7,11));
    const target=site.localToWorld(new T.Vector3(0,.9,0));
    const descend=()=>{if(mode!=='surface'||disposed||request!==landingRequest)return;
      const to=site.localToWorld(new T.Vector3(benchmark?(width<700?0:.06):(width<700?0:.22),benchmark?.34:1.45,benchmark?(width<700?1.10:.88):(width<700?5.1:3.8)));
      if(benchmark)target.copy(site.localToWorld(new T.Vector3(0,.24,-.9*surfaceScale)));
      fly(to,target,2200,()=>{isLanded=true;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.48;if(benchmark){controls.minAzimuthAngle=-.7;controls.maxAzimuthAngle=.7;}callbacks.landed(true);});
    };
    const loaded=loadLandscape().then(()=>true,()=>false);
    fly(approach,target,1900,()=>{void loaded.then(ok=>{if(ok)descend();else {host.dataset.landscape='failed';const status=document.getElementById('landing-status');if(status)status.textContent='Берег не загрузился. Вернись к звёздам и попробуй посадку ещё раз.';callbacks.landed(false);}});});
  }
  function setMode(next:'flight'|'map') {
    if(next==='map')overview();else home(true);
  }
  // Keep travel unwrapped during easing: wrapping the destination alone would
  // send the camera backwards across the entire path at every lap boundary.
  function scrub(value:number){if(mode!=='flight'){leaveSurface();updateMode('flight');}transition=undefined;desiredTravel=finiteFlight(value);dirty=true;}
  function onWheel(e:WheelEvent){if(mode!=='flight')return;e.preventDefault();scrub(desiredTravel+T.MathUtils.clamp(e.deltaY,-180,180)*.00032);}
  function onDown(e:PointerEvent){press={x:e.clientX,y:e.clientY};touchY=e.clientY;dragged=false;if(mode==='flight')canvas.setPointerCapture(e.pointerId);if(mode!=='flight'){transition=undefined;controls.enabled=true;} }
  function onMove(e:PointerEvent){const rect=canvas.getBoundingClientRect();closeStars.pointerMove((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));if(!e.buttons){dirty=true;return;}const distance=Math.hypot(e.clientX-press.x,e.clientY-press.y);if(distance>5)dragged=true;if(mode==='flight'&&dragged){scrub(desiredTravel+(touchY-e.clientY)*.0011);touchY=e.clientY;}dirty=true;}
  function onLeave(){closeStars.pointerLeave();dirty=true;}
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  function onUp(e:PointerEvent){if(dragged||mode==='surface')return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickMeshes,false)[0];const stationHit=observatoryWorld?.root.visible?ray.intersectObject(observatoryWorld.pickRoot,true)[0]:undefined;if(stationHit&&(!hit||stationHit.distance<hit.distance)){if(mode!=='observatory')callbacks.observatory();return;}if(hit)callbacks.pick(hit.object.userData.planet as PlanetId);}
  function onKey(e:KeyboardEvent){if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)){e.preventDefault();scrub(e.key==='Home'?0:e.key==='End'?1:desiredTravel+(['ArrowDown','PageDown'].includes(e.key)?.025:-.025));}}
  canvas.addEventListener('wheel',onWheel,{passive:false});canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerleave',onLeave);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('keydown',onKey);
  controls.addEventListener('change',()=>{dirty=true;});
  function onLoss(e:Event){e.preventDefault();host.dataset.originFullStatus='context-lost';callbacks.failed();}canvas.addEventListener('webglcontextlost',onLoss);
  function onMotion(){paused=reduced.matches;dirty=true;}reduced.addEventListener('change',onMotion);
  const projected=new T.Vector3(),anchor=new T.Vector3(),cameraDirection=new T.Vector3(),toAnchor=new T.Vector3(),occlusionSphere=new T.Sphere(),occlusionPoint=new T.Vector3();
  function updateLabels() {
    camera.getWorldDirection(cameraDirection);
    anchor.copy(stationPosition).add(new T.Vector3(0,12.7,0));projected.copy(anchor).project(camera);
    stationLabel.hidden=!observatoryWorld||!observatoryWorld.root.visible||!['flight','map'].includes(mode)||projected.z>1||Math.abs(projected.x)>.87||Math.abs(projected.y)>.75;
    if(!stationLabel.hidden)stationLabel.style.transform=`translate(${(projected.x*.5+.5)*width}px,${(-projected.y*.5+.5)*height}px) translate(-50%,0)`;
    for(const p of planets){anchor.copy(p.group.position).add(new T.Vector3(0,-p.radius*1.12,0));projected.copy(anchor).project(camera);
      const distance=camera.position.distanceTo(p.group.position),inFront=toAnchor.copy(anchor).sub(camera.position).dot(cameraDirection)>0;
      // Test occlusion against actual geometry instead of leaving a label on a
      // planet hidden behind another world. Keep the introductory text clear.
      ray.set(camera.position,toAnchor.copy(p.group.position).sub(camera.position).normalize());
      const occluded=planets.some(other=>{if(other===p)return false;occlusionSphere.set(other.group.position,other.radius);const hit=ray.ray.intersectSphere(occlusionSphere,occlusionPoint);return hit!==null&&hit.distanceTo(camera.position)<distance-p.radius*.5;});
      const onIntro=mode==='flight'&&wrapFlight(travel)<.025;
      const shown=mode!=='surface'&&!occluded&&inFront&&projected.z<1&&Math.abs(projected.x)<.92&&Math.abs(projected.y)<.79&&(mode==='map'||distance<65)&&!(onIntro&&p.id!=='origin');
      p.label.hidden=!shown;if(shown){p.label.style.transform=`translate(${(projected.x*.5+.5)*width}px,${(-projected.y*.5+.5)*height}px) translate(-50%,0)`;}
    }
  }
  function resize(){width=host.clientWidth;height=host.clientHeight;camera.aspect=width/height;camera.updateProjectionMatrix();const ratio=renderPixelRatio(width,height,devicePixelRatio);renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);closeStars.setPixelRatio(ratio);renderer.setSize(width,height);composer.setSize(width,height);host.dataset.pixelRatio=ratio.toFixed(2);host.dataset.atlasTarget=String(atlasWidthForDiameter(width,ratio));dirty=true;}
  const ro=new ResizeObserver(resize);ro.observe(host);resize();updateMode('flight');
  if(width<700)camera.position.z+=1.5;
  const stats={fps:0,calls:0,triangles:0,surface:false};
  function tick(now:number) {
    if(disposed)return;raf=requestAnimationFrame(tick);const wallDt=(now-last)/1000,dt=Math.min(wallDt,.045);last=now;
    if(document.hidden)return;
    if(!paused)weatherTime+=wallDt;
    // No idle GPU work while paused. User-controlled flight still responds.
    const moving=transition||Math.abs(travel-desiredTravel)>.00003||(!paused)||detailAnimating;
    if(!moving&&!dirty)return;
    if(now-lastRender<(width<700?30:15))return;lastRender=now;
    closeStars.update(elapsed,dt,Math.abs(desiredTravel-travel),paused);
    if(!paused){elapsed+=dt;waterTime.value=elapsed;surfaceClock.value=elapsed;for(const p of planets)if(p.id!=='about'){p.body.rotation.y+=dt*p.spin;for(const ring of p.rings)ring.rotation.z+=dt*.008;}starM.uniforms.uTime.value=elapsed;gas.rotation.z=Math.sin(elapsed*.009)*.018;
      courier.position.set(Math.sin(elapsed*.09)*18,2+Math.cos(elapsed*.13)*6,-(elapsed*1.1%170));courier.rotation.y=Math.sin(elapsed*.09)*.4;}
    if(transition){const f=transition,raw=Math.min(1,(now-f.start)/f.duration),t=raw*raw*(3-2*raw);camera.position.lerpVectors(f.from,f.to,t);controls.target.lerpVectors(f.lookFrom,f.lookTo,t);camera.lookAt(controls.target);if(raw===1){transition=undefined;controls.enabled=mode!=='flight';f.done?.();}}
    else if(mode==='flight'){travel=mix(travel,desiredTravel,reduced.matches?1:1-Math.exp(-dt*5));const pose=flightPose(travel);if(width<700)pose.position.z+=1.5;camera.position.copy(pose.position);controls.target.copy(pose.target);camera.lookAt(pose.target);}
    else controls.update();
    site.visible=benchmark?host.dataset.landscape==='ready'&&mode==='surface'&&camera.position.distanceTo(site.getWorldPosition(anchor))<2.4:mode==='surface'||camera.position.distanceTo(about.group.position)<12;
    planetMists.forEach(mist=>mist.update(elapsed,mode==='surface',camera.position));
    host.dataset.lightningPulse=asteroidWeather.update(weatherTime,camera.position,paused||mode==='surface').toFixed(3);
    detailAnimating=colorDetail.update(camera,dt,mode==='surface');
    if(mode!=='surface'&&camera.position.distanceTo(stationPosition)<OBSERVATORY_LOAD_DISTANCE)loadObservatory();
    observatoryWorld?.update(elapsed,camera.position,mode);
    renderer.info.autoReset=false;renderer.info.reset();composer.render();updateLabels();dirty=false;frames++;
    if(now-fpsAt>1000){fps=Math.round(frames*1000/(now-fpsAt));frames=0;fpsAt=now;stats.fps=fps;stats.calls=renderer.info.render.calls;stats.triangles=renderer.info.render.triangles;stats.surface=isLanded;
      host.dataset.fps=String(stats.fps);host.dataset.calls=String(stats.calls);host.dataset.triangles=String(stats.triangles);host.dataset.cameraPosition=camera.position.toArray().map(n=>n.toFixed(2)).join(',');host.dataset.flight=travel.toFixed(3);host.dataset.surface=String(isLanded);
    }
    const current=document.getElementById('flight-world');if(current)current.textContent=mode==='observatory'?'Обсерватория':mode==='surface'?'На поверхности':mode==='map'?'Вся галактика':mode==='focus'?(PLANETS.find(p=>p.id===focused)?.name??'Планета'):flightWorld(travel);
    const exploring=mode!=='flight'||wrapFlight(travel)>.025;document.body.classList.toggle('exploring',exploring);const intro=document.getElementById('intro');if(intro)intro.inert=exploring;
  }
  raf=requestAnimationFrame(tick);
  function setProgress(value:number){stage=value;planets.forEach((p,i)=>{p.label.classList.toggle('unexplored',i>stage&&p.id!=='about');p.label.dataset.unlocked=String(i<=stage||p.id==='about');});dirty=true;}
  const ready=loadMap('origin').then(t=>{if(disposed)return;planets[0].material.map=t;planets[0].material.bumpScale=0;planets[0].material.needsUpdate=true;
    // Keep a smooth planetary shell; landing scenery is a separate local scene.
    planets[0].body.rotation.set(-.70,-.40,.10);
    planets[0].material.bumpMap=t;planets[0].material.bumpScale=.025;
    moonDebrisMaterial.map=t;moonDebrisMaterial.needsUpdate=true;
    const previewImage=t.image as HTMLImageElement;
    host.dataset.originTexture=`${previewImage.width}x${previewImage.height}`;host.dataset.clouds='none';host.dataset.originAtmosphere='space-nebula';
    host.dataset.originMaterial='destroyed-moon-lava-oasis';host.dataset.worldThemes=Object.entries(WORLD_THEMES).map(([id,t])=>`${id}:${t.name}`).join(',');host.dataset.planetCount=String(planets.length);host.dataset.aboutLocation='origin';
    host.dataset.originTexturePolicy='full-atlas-no-camera-switch';
    host.dataset.originSource='generated-1774x887-upscaled-moon';
    const fullWidth=originTextureWidth(renderer.capabilities.maxTextureSize);
    host.dataset.originRequested=String(fullWidth);host.dataset.originGpuLimit=String(renderer.capabilities.maxTextureSize);
    host.dataset.originFullStatus=fullWidth?'loading':'unsupported';
    if(fullWidth)void loader.loadAsync(`/universe/origin-moon-v1-${fullWidth}.jpg`).then(full=>{
      if(disposed){full.dispose();return;}
      const image=full.image as HTMLImageElement;
      if(image.width!==fullWidth||image.height!==fullWidth/2){full.dispose();throw new Error('Unexpected origin atlas dimensions');}
      configureOriginFullTexture(full,renderer.capabilities.getMaxAnisotropy());
      full.onUpdate=()=>{
        host.dataset.originFullStatus=fullWidth===16384?'uploaded-16k':'uploaded-hardware-fallback';
        host.dataset.originTexture=`${image.width}x${image.height}`;
      };
      planets[0].material.map=full;planets[0].material.bumpMap=full;planets[0].material.needsUpdate=true;
      loadedMaps.set('origin',full);extraTextures.push(t); // shared by lunar debris
      host.dataset.originMaterial='destroyed-moon-lava-oasis-full';dirty=true;
    }).catch(()=>{if(!disposed)host.dataset.originFullStatus='failed-preview-retained';});
    // First world is ready before requesting the remaining detail maps.
    for(const p of planets.slice(1)){void loadMap(p.id).then(map=>{if(disposed)return;p.material.map=map;p.material.bumpMap=p.id==='aurora'?null:map;p.material.bumpScale=.006;p.material.needsUpdate=true;dirty=true;}).catch(()=>{host.dataset.materialFallback='true';});}
    dirty=true;
  }).catch(()=>{if(!disposed)callbacks.failed();});
  function dispose(){disposed=true;observatoryWorld?.dispose();stationLabel.remove();colorDetail.dispose();closeStars.dispose();cancelAnimationFrame(raf);ro.disconnect();controls.dispose();reduced.removeEventListener('change',onMotion);canvas.removeEventListener('wheel',onWheel);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerleave',onLeave);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('webglcontextlost',onLoss);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>materials.add(v));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());loadedMaps.forEach(t=>t.dispose());extraTextures.forEach(t=>t.dispose());environment.dispose();composer.passes.forEach(p=>p.dispose());composer.dispose();renderer.dispose();canvas.remove();planets.forEach(p=>p.label.remove());delete document.body.dataset.cameraMode;}
  return {ready,home,overview,present,focus,land,observatory,setProgress,setMode,scrub,stats,
    zoom(direction:number){if(mode==='flight'){scrub(desiredTravel+direction*.035);return;}transition=undefined;const offset=camera.position.clone().sub(controls.target);offset.setLength(T.MathUtils.clamp(offset.length()*(direction>0?.85:1.18),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);dirty=true;},
    pause(value:boolean){paused=value;if(value&&transition)transition.duration=1;document.body.classList.toggle('motion-paused',value);try{sessionStorage.setItem('astra.motion-paused',String(value));}catch{/* Keep the current session usable. */}dirty=true;},get paused(){return paused;},dispose};
}
