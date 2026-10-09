import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LEGACY_PLANETS as PLANETS } from './journey';
import type { PlanetId } from './journey';

const noiseGLSL = `
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.37,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(3.1,1.7,5.2);a*=.5;}return v;}`;
const planetVertex = `varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;void main(){vLocal=position;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
const planetFragment = `precision highp float;
varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;
uniform vec3 uColor;uniform float uKind;uniform float uTime;uniform float uOpen;
${noiseGLSL}
void main(){
 vec3 p=normalize(vLocal);float n=fbm(p*4.1+uKind*3.);float detail=fbm(p*32.);float land=smoothstep(.45,.58,n);
 vec3 ocean=uColor*.36;vec3 terrain=mix(vec3(.15,.21,.23),vec3(.79,.77,.64),detail);vec3 c=mix(ocean,terrain,land);
 float edge=1.-smoothstep(.005,.04,abs(n-.49));vec3 emission=vec3(.8,.47,.13)*edge*.25;
 if(uKind>.5&&uKind<1.5){
  float cavity=smoothstep(.67,.8,p.z+sin(p.x*4.)*.1);float facet=noise(floor(p*48.)*.7);
  vec3 gem=mix(vec3(.20,.07,.36),vec3(.77,.45,.97),facet);gem=mix(gem,vec3(1.,.64,.22),smoothstep(.54,.79,n));
  c=mix(vec3(.09,.095,.13)*(detail+.6),gem,cavity);emission=gem*cavity*.22+vec3(.6,.32,.9)*edge*.11;
 }else if(uKind>1.5&&uKind<2.5){float crack=1.-smoothstep(.012,.065,abs(p.y+sin(p.x*7.)*.035));c=mix(mix(vec3(.065,.19,.35),vec3(.8,.88,.93),smoothstep(.38,.59,n)),vec3(.95,.43,.09),crack);emission=vec3(1.,.3,.035)*crack*.7;
 }else if(uKind>2.5&&uKind<3.5){c=mix(vec3(.025,.23,.16),vec3(.69,.37,.23),land);emission=vec3(.06,.64,.39)*pow(abs(p.y),12.)*.25;
 }else if(uKind>3.5&&uKind<4.5){c=mix(vec3(.11,.32,.39),mix(vec3(.51,.055,.19),vec3(.89,.75,.60),detail),land);}
 else if(uKind>4.5){c=mix(vec3(.10,.22,.28),vec3(.74,.59,.35),land);emission=vec3(.9,.6,.2)*edge*.3;}
 float cloud=smoothstep(.59,.73,fbm(p*7.+vec3(uTime*.006,0,0)));c=mix(c,vec3(.84,.91,.91),cloud*.58);
 vec3 N=normalize(vNormal);vec3 light=normalize(vec3(-.8,.65,1.2));float lit=max(dot(N,light),0.);float rim=pow(1.-max(dot(N,normalize(cameraPosition-vWorld)),0.),3.);
 c=c*(.17+lit*1.25)+emission+uColor*rim*.3; c=mix(c*.31,c,uOpen);
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function random(seed = 731) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.15,'rgba(255,255,255,.32)');g.addColorStop(.5,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
function inscriptionTexture(){
 const c=document.createElement('canvas');c.width=1536;c.height=1280;const x=c.getContext('2d')!;
 x.textAlign='center';x.fillStyle='#c8b180';x.font='26px Arial';x.fillText('A S T R A   /   И С Т О Р И Я   П У Т И',768,130);
 x.fillStyle='#fff2d9';x.shadowColor='#d7b879';x.shadowBlur=9;x.font='78px Georgia';x.fillText('Твоё направление.',768,280);x.fillText('Твой путь.',768,375);x.shadowBlur=0;
 x.strokeStyle='#c6a36b';x.lineWidth=2;x.beginPath();x.moveTo(615,440);x.lineTo(920,440);x.stroke();
 x.fillStyle='#f4ead8';x.font='37px Arial';
 ['Исследуй желания через маленькие','реальные действия. Не ищи готовый ярлык.','', '30 дней коротких проб и наблюдений.','Твой график. Твои ресурсы. Твой темп.','', 'Несколько объяснимых маршрутов —','и предварительный план на 90 дней.','Направление выбираешь ты.'].forEach((line,i)=>x.fillText(line,768,550+i*56));
 x.fillStyle='#bbaf9b';x.font='27px Arial';x.fillText('Космос — образ пути, а не предсказание судьбы.',768,1150);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
export type GalaxyScene = ReturnType<typeof createGalaxyScene>;
export function createGalaxyScene(host: HTMLElement, labelHost: HTMLElement, callbacks:{pick:(id:PlanetId)=>void; landed:(surface:boolean)=>void; failed:()=>void}) {
 const mobile=innerWidth<650;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.6));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Галактика: потяните для поворота, используйте колесо или кнопки масштаба. Выберите планету кнопкой с её названием.');host.append(canvas);
 const scene=new T.Scene();scene.background=new T.Color('#040a15');
 const camera=new T.PerspectiveCamera(43,1,.05,850);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=8;controls.maxDistance=68;controls.rotateSpeed=.5;controls.zoomSpeed=.7;controls.autoRotateSpeed=.13;
 const galaxy=new T.Group();scene.add(galaxy);
 const surface=new T.Group();surface.position.y=-230;surface.visible=false;scene.add(surface);
 scene.add(new T.HemisphereLight('#a7d4ef','#1b112d',2));const sun=new T.DirectionalLight('#fff0d8',3);sun.position.set(-15,25,20);scene.add(sun);
 const glow=glowTexture(), rand=random();
 const starGeo=new T.BufferGeometry(), positions:number[]=[], seeds:number[]=[], colors:number[]=[];
 for(let i=0;i<(mobile?1000:1900);i++){const radius=80+rand()*120,a=rand()*Math.PI*2,y=(rand()-.5)*150;positions.push(Math.cos(a)*radius,y,Math.sin(a)*radius);seeds.push(rand()*6.28);const c=new T.Color().setHSL(.52+rand()*.16,.25,.6+rand()*.3);colors.push(c.r,c.g,c.b);}
 starGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));starGeo.setAttribute('aPhase',new T.Float32BufferAttribute(seeds,1));starGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const starMat=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:`attribute float aPhase;varying float vAlpha;varying vec3 vColor;uniform float uTime;void main(){vColor=color;vAlpha=.5+.22*sin(uTime*.65+aPhase);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=(1.3+sin(aPhase)*.5)*min(2.,160./-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor,vAlpha*smoothstep(.5,.06,r));}`});
 const stars=new T.Points(starGeo,starMat);scene.add(stars);
 // A volumetric spiral uses inexpensive points and broad transparent dust, not a flat wallpaper.
 const dustPositions:number[]=[],dustColors:number[]=[];
 for(let i=0;i<(mobile?2300:4000);i++){const arm=i%3,t=rand(),a=t*7+arm*Math.PI*2/3,r=3+t*35;dustPositions.push(Math.cos(a)*r+(rand()-.5)*4,(rand()-.5)*2-5,Math.sin(a)*r*.65-10);const c=new T.Color().setHSL(.52+t*.22,.4,.35+rand()*.25);dustColors.push(c.r,c.g,c.b);}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(dustPositions,3));dustGeo.setAttribute('color',new T.Float32BufferAttribute(dustColors,3));
 const dust=new T.Points(dustGeo,new T.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));galaxy.add(dust);
 for(let i=0;i<11;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:glow,color:i%2?'#414694':'#216c80',transparent:true,opacity:.18,depthWrite:false,blending:T.AdditiveBlending}));sprite.position.set((rand()-.5)*55,-4-rand()*6,-20+rand()*20);sprite.scale.set(14+rand()*18,10+rand()*8,1);galaxy.add(sprite);}
 const planets=PLANETS.map((p,i)=>{
  const group=new T.Group();group.position.fromArray([...p.position]);galaxy.add(group);
  const geometry=new T.SphereGeometry(p.radius,64,48);
  if(i===1){const attr=geometry.getAttribute('position');for(let v=0;v<attr.count;v++){const x=attr.getX(v),y=attr.getY(v),z=attr.getZ(v);const d=Math.max(0,z/p.radius-.73);attr.setXYZ(v,x*(1-d*.45),y*(1-d*.45),z*(1-d*.55));}geometry.computeVertexNormals();}
  const material=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(p.color)},uKind:{value:i},uTime:{value:0},uOpen:{value:1}},vertexShader:planetVertex,fragmentShader:planetFragment});
  const body=new T.Mesh(geometry,material);body.userData.planet=p.id;group.add(body);
  const atmosphere=new T.Mesh(new T.SphereGeometry(p.radius*1.035,40,28),new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(p.color)}},vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vec4 v=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vP=v.xyz;gl_Position=projectionMatrix*v;}`,fragmentShader:`varying vec3 vN;varying vec3 vP;uniform vec3 uColor;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(-vP))),3.);gl_FragColor=vec4(uColor,rim*.32);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.BackSide}));group.add(atmosphere);
  let ring:T.Mesh|undefined;
  if(i===2||i===4||i===5){ring=new T.Mesh(new T.RingGeometry(p.radius*1.34,p.radius*1.9,112,1),new T.MeshBasicMaterial({color:i===4?'#e9beab':'#9bc7cd',transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));ring.rotation.set(1.0,.1,i===4?.4:-.2);group.add(ring);const r2=new T.Mesh(new T.TorusGeometry(p.radius*1.78,.012,5,100),new T.MeshBasicMaterial({color:p.color,transparent:true,opacity:.5}));r2.rotation.copy(ring.rotation);group.add(r2);}
  const label=document.createElement('button');label.className='planet-label';label.dataset.planet=p.id;label.innerHTML=`<i style="--planet:${p.color}"></i><span>${p.name}<small>${p.subtitle}</small></span>`;label.setAttribute('aria-label',`Планета ${p.name}`);label.addEventListener('click',()=>callbacks.pick(p.id));labelHost.append(label);
  return{...p,group,body,material,ring,label,base:group.position.clone()};
 });
 const routeCurve=new T.CatmullRomCurve3(planets.slice(0,5).map(p=>p.base.clone()));
 const routeGeometry=new T.BufferGeometry().setFromPoints(routeCurve.getPoints(120));
 const routeLine=new T.Line(routeGeometry,new T.LineBasicMaterial({color:'#dec89b',transparent:true,opacity:.28}));galaxy.add(routeLine);
 const marker=new T.Mesh(new T.SphereGeometry(.075,12,8),new T.MeshBasicMaterial({color:'#ffdda0'}));galaxy.add(marker);
 const beacon=new T.Sprite(new T.SpriteMaterial({map:glow,color:'#ffe2a9',blending:T.AdditiveBlending,depthWrite:false}));beacon.scale.setScalar(.95);marker.add(beacon);
 const asteroidGeo=new T.IcosahedronGeometry(.12,0),asteroidMat=new T.MeshStandardMaterial({color:'#62737d',roughness:.94});
 const asteroids=new T.InstancedMesh(asteroidGeo,asteroidMat,mobile?90:160);const dummy=new T.Object3D();for(let i=0;i<asteroids.count;i++){const a=rand()*6.28,r=15+rand()*9;dummy.position.set(Math.cos(a)*r,-3+(rand()-.5)*4,Math.sin(a)*r-4);dummy.rotation.set(rand()*6,rand()*6,0);dummy.scale.setScalar(.5+rand()*1.8);dummy.updateMatrix();asteroids.setMatrixAt(i,dummy.matrix);}galaxy.add(asteroids);
 // Real geometry at a separate local coordinate: the camera flies down to this landing site.
 const floorGeo=new T.PlaneGeometry(110,95,64,60);floorGeo.rotateX(-Math.PI/2);const floorPos=floorGeo.getAttribute('position');for(let i=0;i<floorPos.count;i++){const x=floorPos.getX(i),z=floorPos.getZ(i);floorPos.setY(i,Math.sin(x*.31)*Math.cos(z*.21)*.8+Math.sin(z*.8+x*.42)*.18);}floorGeo.computeVertexNormals();
 surface.add(new T.Mesh(floorGeo,new T.MeshStandardMaterial({color:'#182b34',roughness:.83,metalness:.22})));
 const outline=new T.Shape();outline.moveTo(-7.4,0);outline.lineTo(-8.1,3);outline.lineTo(-7.4,10.9);outline.lineTo(-4.1,13.1);outline.lineTo(-.8,12.6);outline.lineTo(3.3,13.5);outline.lineTo(7.8,11.3);outline.lineTo(8.2,5.7);outline.lineTo(7.4,0);outline.closePath();
 const cliff=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:2.4,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.4,bevelThickness:.5}),new T.MeshStandardMaterial({color:'#32464d',roughness:.9,metalness:.22}));cliff.position.set(0,0,-3);surface.add(cliff);
 const text=new T.Mesh(new T.PlaneGeometry(14.4,12),new T.MeshBasicMaterial({map:inscriptionTexture(),transparent:true,depthWrite:false,toneMapped:false}));text.position.set(0,6.6,.03);surface.add(text);
 const veinMaterial=new T.MeshBasicMaterial({color:'#ccb57c',transparent:true,opacity:.55});
 for(let i=0;i<9;i++){const x=(i<5?-1:1)*(7+rand());const pts=[new T.Vector3(x,.3,.1),new T.Vector3(x+rand()*.4,3+rand()*2,.2),new T.Vector3(x-.4,7+rand()*5,.15)];surface.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),veinMaterial));}
 for(let i=0;i<38;i++){const x=(rand()>.5?1:-1)*(9+rand()*22),z=(rand()-.5)*32;const crystal=new T.Mesh(new T.ConeGeometry(.5+rand()*1.5,2+rand()*6,5),new T.MeshStandardMaterial({color:i%3?'#705993':'#368f9b',emissive:i%3?'#201032':'#073039',emissiveIntensity:.7,metalness:.45,roughness:.28}));crystal.position.set(x,1,z);crystal.rotation.z=(rand()-.5)*.3;surface.add(crystal);}
 const surfaceMoon=new T.Mesh(new T.SphereGeometry(5,48,32),planets[0].material);surfaceMoon.position.set(-22,22,-34);surface.add(surfaceMoon);
 const motesPositions:number[]=[];for(let i=0;i<130;i++)motesPositions.push((rand()-.5)*70,rand()*21,(rand()-.5)*40);
 const motes=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(motesPositions,3)),new T.PointsMaterial({size:.045,color:'#b6e6f0',transparent:true,opacity:.7}));surface.add(motes);
 const landingLight=new T.PointLight('#dabefa',45,42,2);landingLight.position.set(0,11,9);surface.add(landingLight);
 let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=0,dirty=true,surfaceMode=false,stage=0,disposed=false,current:'overview'|PlanetId='overview';
 let transition:null|{start:number;duration:number;from:T.Vector3;to:T.Vector3;targetFrom:T.Vector3;targetTo:T.Vector3;done?:()=>void}=null;
 let flightToken=0,flightTimer:ReturnType<typeof setTimeout>|undefined;
 function travel(position:T.Vector3,target:T.Vector3,duration=1500,done?:()=>void){
  if(paused){camera.position.copy(position);controls.target.copy(target);controls.update();done?.();dirty=true;return;}
  transition={start:performance.now(),duration,from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target,done};dirty=true;
 }
 function exitSurface(){surfaceMode=false;surface.visible=false;galaxy.visible=true;controls.minDistance=8;controls.maxDistance=68;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;callbacks.landed(false);}
 function overview(instant=false){flightToken++;clearTimeout(flightTimer);transition=null;exitSurface();current='overview';controls.enabled=true;const target=new T.Vector3(-.4,1.3,-4);const offset=new T.Vector3(1,9,innerWidth<650?47:31);if(instant){camera.position.copy(target.clone().add(offset));controls.target.copy(target);controls.update();}else travel(target.clone().add(offset),target,1250);dirty=true;}
 function focus(id:PlanetId){flightToken++;clearTimeout(flightTimer);transition=null;exitSurface();current=id;controls.enabled=true;const p=planets.find(p=>p.id===id)!;const target=p.group.position.clone();travel(target.clone().add(new T.Vector3(0,p.radius*.65,p.radius*(innerWidth<650?5.4:4.4))),target);}
 function land(){
  const token=++flightToken;clearTimeout(flightTimer);transition=null;exitSurface();current='about';controls.enabled=false;const p=planets.find(p=>p.id==='about')!;const center=p.group.position.clone();
  travel(center.clone().add(new T.Vector3(0,.45,p.radius*1.035)),center,1900,()=>{
   if(token!==flightToken)return;
   surfaceMode=true;surface.visible=true;galaxy.visible=false;controls.minDistance=9;controls.maxDistance=48;controls.minPolarAngle=1.05;controls.maxPolarAngle=1.65;
   const target=surface.position.clone().add(new T.Vector3(0,6,.2));const distance=innerWidth<650?34:24;
   camera.position.copy(target.clone().add(new T.Vector3(-7,6,distance+15)));controls.target.copy(target);controls.update();
   travel(target.clone().add(new T.Vector3(0,1.2,distance)),target,1350,()=>{if(token!==flightToken)return;controls.enabled=true;callbacks.landed(true);});
  });
 }
 function setProgress(value:number){stage=value;planets.forEach((p,i)=>{p.material.uniforms.uOpen.value=p.id==='about'||i<=value?1:.3;p.label.classList.toggle('unexplored',p.id!=='about'&&i>value);});dirty=true;}
 const pointer=new T.Vector2(),ray=new T.Raycaster();let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let multitouch=false;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.add(e.pointerId);if(pointers.size>1)multitouch=true;down={x:e.clientX,y:e.clientY};if(controls.enabled)transition=null;});
 canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(down&&!multitouch&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<7&&controls.enabled&&!surfaceMode){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(planets.map(p=>p.body))[0];if(hit)callbacks.pick(hit.object.userData.planet as PlanetId);}if(!pointers.size){down=null;multitouch=false;}});
 canvas.addEventListener('pointercancel',()=>{pointers.clear();down=null;multitouch=false;});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);callbacks.failed();});
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);dirty=true;}
 const ro=new ResizeObserver(resize);ro.observe(host);resize();overview(true);setProgress(0);
 const project=new T.Vector3();
 const onVisibility=()=>{last=0;dirty=true;};document.addEventListener('visibilitychange',onVisibility);
 let samples=0,totalFrame=0,fps=0;
 renderer.setAnimationLoop((time:number)=>{
  if(disposed||document.hidden)return;
  const dt=last?Math.min((time-last)/1000,.06):0;last=time;
  if(!paused){elapsed+=dt;starMat.uniforms.uTime.value=elapsed;stars.rotation.y=elapsed*.0012;dust.rotation.y=elapsed*.003;asteroids.rotation.y=elapsed*.007;motes.rotation.y=elapsed*.016;
   planets.forEach((p,i)=>{p.body.rotation.y=elapsed*(i===1?.018:.033)+i*.06;p.group.position.y=p.base.y+Math.sin(elapsed*.22+i)*.09;p.material.uniforms.uTime.value=elapsed;});
   marker.position.copy(routeCurve.getPointAt(((elapsed*.015)%1)*Math.max(.12,stage/4)));beacon.material.opacity=.6+Math.sin(elapsed*1.7)*.15;dirty=true;
  }
  controls.autoRotate=!paused&&!surfaceMode&&!transition&&current==='overview';
  if(transition){const tr=transition,t=Math.min(1,(time-tr.start)/tr.duration),s=t*t*(3-2*t);camera.position.lerpVectors(tr.from,tr.to,s);controls.target.lerpVectors(tr.targetFrom,tr.targetTo,s);if(t>=1){transition=null;tr.done?.();}dirty=true;}
  if(controls.update(dt))dirty=true;
  if(dirty){scene.updateMatrixWorld();camera.updateMatrixWorld();for(const p of planets){project.copy(p.group.position).add(new T.Vector3(p.radius*.65,p.radius*.8,0)).project(camera);const x=(project.x*.5+.5)*host.clientWidth,y=(-project.y*.5+.5)*host.clientHeight;p.label.hidden=surfaceMode||!controls.enabled||project.z>1||project.z< -1||x<50||x>host.clientWidth-80||y<90||y>host.clientHeight-100;if(!p.label.hidden)p.label.style.transform=`translate(${x}px,${y}px)`;}renderer.render(scene,camera);dirty=false;}
  if(dt){samples++;totalFrame+=dt;if(samples>=45){fps=Math.round(samples/totalFrame);samples=0;totalFrame=0;}}
 });
 function rotate(x:number,y=0){if(!controls.enabled)return;transition=null;controls.rotateLeft(x);controls.rotateUp(y);controls.update();dirty=true;}
 function zoom(direction:number){if(!controls.enabled)return;transition=null;if(direction>0)controls.dollyIn(1.2);else controls.dollyOut(1.2);controls.update();dirty=true;}
 function pause(value:boolean){paused=value;controls.enableDamping=!value;dirty=true;}
 const key=(e:KeyboardEvent)=>{if(e.target!==canvas)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')rotate(.15);if(e.key==='ArrowRight')rotate(-.15);if(e.key==='ArrowUp')rotate(0,.12);if(e.key==='ArrowDown')rotate(0,-.12);if(e.key==='+')zoom(1);if(e.key==='-')zoom(-1);if(e.key==='Home')overview();};canvas.addEventListener('keydown',key);
 function dispose(){disposed=true;flightToken++;clearTimeout(flightTimer);renderer.setAnimationLoop(null);ro.disconnect();controls.dispose();document.removeEventListener('visibilitychange',onVisibility);const materials=new Set<T.Material>(),textures=new Set<T.Texture>(),geometries=new Set<T.BufferGeometry>();scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material){for(const mat of Array.isArray(m.material)?m.material:[m.material])materials.add(mat);}});materials.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();canvas.remove();labelHost.replaceChildren();}
 return{overview,focus,land,setProgress,zoom,rotate,pause,dispose,get paused(){return paused;},get stats(){return {fps,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,surface:surfaceMode};}};
}
