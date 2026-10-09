import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import telescopeUrl from '../observatory/telescope-optimized.glb?url';

// An isolated visual prototype: no account, profile, storage or external requests.
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let inside=location.hash==='#inside',paused=reduced.matches,angle=.31,drag=null;
const examples={
  observations:{title:'Атлас наблюдений',body:'Здесь могли бы находиться собственные записи человека и основания осторожных промежуточных выводов. В этом прототипе записи не загружаются.'},
  practice:{title:'Пробы и навыки',body:'Небольшая проба помогает проверить интерес в реальной жизни. Она не доказывает способность и не становится обязательным заданием. Эта витрина пока демонстрационная.'},
  discoveries:{title:'Открытия',body:'Сюда можно было бы вернуться к вопросам и замеченным изменениям. Сейчас здесь только пример расположения пространства, без личных результатов.'}
};
let dialogOpener=null;
for(const button of document.querySelectorAll('[data-room]'))button.addEventListener('click',()=>{
  const item=examples[button.dataset.room];if(!item)return;
  dialogOpener=document.activeElement;$('detail-title').textContent=item.title;
  $('detail-body').replaceChildren(Object.assign(document.createElement('p'),{textContent:item.body}));
  $('detail').showModal();
});
$('close').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('close',()=>dialogOpener?.focus());
function setView(){inside=location.hash==='#inside';document.body.classList.toggle('inside',inside);$('enter').hidden=inside;$('outside').hidden=!inside;$('rooms').hidden=!inside;$('title').innerHTML=inside?'Внутри<br>обсерватории':'Обсерватория<br>на облаке';}
addEventListener('hashchange',setView);setView();
$('enter').addEventListener('click',()=>location.hash='inside');
$('outside').addEventListener('click',()=>location.hash='outside');
$('rotate').addEventListener('click',()=>angle+=Math.PI/4);
function syncPause(){$('pause').textContent=paused?'Включить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').addEventListener('click',()=>{paused=!paused;syncPause();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});syncPause();

let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{
  $('status').textContent='3D недоступно в этом браузере. Витрины можно открыть кнопками.';$('rooms').hidden=false;
}
if(renderer)buildScene();

function buildScene(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.3:1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('scene').append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,160);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xd9e4ff,0x1d1138,1.15));
  const sun=new T.DirectionalLight(0xffe6bd,3.6);sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:32});sun.shadow.bias=-.0002;scene.add(sun);
  const blue=new T.DirectionalLight(0x4cb8ff,3.2);blue.position.set(7,6,-7);scene.add(blue);
  const violet=new T.PointLight(0xc644ff,35,14,2);violet.position.set(-3,3,-2);scene.add(violet);
  const warm=new T.PointLight(0xffbd74,21,14,2);warm.position.set(0,2,1);scene.add(warm);

  const station=new T.Group();scene.add(station);
  const dark=new T.MeshStandardMaterial({color:0x101622,metalness:.72,roughness:.29});
  const floor=new T.MeshStandardMaterial({color:0x222632,metalness:.53,roughness:.42});
  const ivory=new T.MeshStandardMaterial({color:0xe2dfdf,metalness:.12,roughness:.56});
  const gold=new T.MeshStandardMaterial({color:0xd1a966,metalness:1,roughness:.22});
  const lightGold=new T.MeshStandardMaterial({color:0xffe0a7,emissive:0xffbb66,emissiveIntensity:1.7,metalness:.48,roughness:.21});
  function mesh(geometry,material,x=0,y=0,z=0,parent=station){const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  function disc(radius,height,y,material){return mesh(new T.CylinderGeometry(radius,radius,height,96),material,0,y);}
  function ring(radius,y,material,tube=.025){const object=mesh(new T.TorusGeometry(radius,tube,8,128),material,0,y);object.rotation.x=Math.PI/2;return object;}
  disc(5.28,.32,-.38,ivory);disc(5.36,.18,-.14,ivory);disc(5.12,.18,.04,ivory);
  disc(4.48,.42,.29,dark);disc(4.29,.045,.51,floor);
  ring(5.16,.14,gold,.025);ring(4.49,.52,lightGold,.045);
  for(const r of [1.03,2.43,3.71])ring(r,.543,gold,.013);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;station.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(Math.sin(a)*1.15,.55,Math.cos(a)*1.15),new T.Vector3(Math.sin(a)*4.1,.55,Math.cos(a)*4.1)]),new T.LineBasicMaterial({color:0x956f4b,transparent:true,opacity:.65})));}
  for(let i=0;i<3;i++)mesh(new T.BoxGeometry(1.72,.12,.95-i*.12),i===1?gold:ivory,0,-.32+i*.13,5.45-i*.34);
  for(let i=0;i<8;i++){const a=(i+.5)/8*Math.PI*2,x=Math.sin(a)*4.16,z=Math.cos(a)*4.16;
    mesh(new T.CylinderGeometry(.095,.14,.95,12),dark,x,1.02,z);
    mesh(new T.CylinderGeometry(.14,.14,.10,16),gold,x,1.53,z);
    mesh(new T.BoxGeometry(.075,.5,.08),lightGold,x,1.01,z+.12).castShadow=false;
  }
  ring(4.2,1.6,gold,.036);
  // Each nebula sail is a curved, depth-sorted 3D mesh, not a slice of the concept image.
  const sailTexture=makeNebulaTexture();
  const sailMaterial=new T.MeshPhysicalMaterial({map:sailTexture,color:0xd8eeff,transparent:true,opacity:.77,side:T.DoubleSide,depthWrite:false,metalness:.08,roughness:.22,clearcoat:1,clearcoatRoughness:.09,emissive:0x281846,emissiveIntensity:.2});
  const sails=new T.Group();station.add(sails);
  const configs=[{angle:-.91,height:5.4,width:1.47,sweep:.22},{angle:-2.35,height:6.55,width:1.36,sweep:-.34},{angle:2.28,height:7.05,width:1.33,sweep:.34},{angle:.92,height:4.45,width:1.62,sweep:-.22}];
  for(const conf of configs){
    const rows=30,cols=12,vertices=[],uv=[],indices=[];
    function point(t,s){const width=(Math.pow(Math.sin(Math.PI*t),.72)*conf.width+.1*(1-t))*s;
      const a=conf.angle+conf.sweep*t*t+width/4.3;
      const radius=4.18-.52*t+.24*Math.sin(Math.PI*t)+.08*(1-s*s);
      return new T.Vector3(Math.sin(a)*radius,.72+conf.height*t,Math.cos(a)*radius);
    }
    for(let j=0;j<=rows;j++){const t=j/rows;for(let k=0;k<=cols;k++){const s=k/cols*2-1,p=point(t,s);vertices.push(p.x,p.y,p.z);uv.push(k/cols,t);}}
    for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const n=j*(cols+1)+k;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const sail=mesh(geometry,sailMaterial,0,0,0,sails);sail.castShadow=false;sail.receiveShadow=false;sail.renderOrder=2;
    for(const side of [-1,1]){const path=[];for(let j=0;j<=30;j++)path.push(point(j/30,side));
      const edge=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(path),50,.026,6,false),lightGold,0,0,0,sails);edge.castShadow=false;edge.renderOrder=3;
    }
    const p=point(0,0);mesh(new T.CylinderGeometry(.17,.24,.56,16),gold,p.x,.77,p.z,sails);
  }
  const telescope=new T.Group();telescope.rotation.y=1.05;station.add(telescope);
  $('scene').dataset.telescope='loading';
  new GLTFLoader().load(telescopeUrl,gltf=>{gltf.scene.scale.setScalar(1.23);gltf.scene.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});telescope.add(gltf.scene);$('scene').dataset.telescope='loaded-glb';},undefined,()=>{$('scene').dataset.telescope='fallback';mesh(new T.CylinderGeometry(.28,.38,2,18),gold,0,1.7,0,telescope);});

  const cloudTexture=makeCloudTexture();
  const cloudMaterial=new T.MeshBasicMaterial({map:cloudTexture,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide});
  let seed=58219;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const cloudCount=innerWidth<700?70:112,cloud=new T.InstancedMesh(new T.PlaneGeometry(1,1),cloudMaterial,cloudCount);cloud.frustumCulled=false;scene.add(cloud);
  const cloudSpecs=[];for(let i=0;i<cloudCount;i++){const a=random()*Math.PI*2,r=2.6+random()*5.8,scale=3.2+random()*3.5;cloudSpecs.push({position:new T.Vector3(Math.sin(a)*r,-.72-random()*1.28,Math.cos(a)*r),scale,twist:random()*6.28});cloud.setColorAt(i,new T.Color(i%4===0?0xc8d8fa:0xf3f0f5));}
  const cloudObject=new T.Object3D(),cloudSpin=new T.Quaternion(),cloudAxis=new T.Vector3(0,0,1);
  const stars=new T.BufferGeometry(),positions=[];for(let i=0;i<700;i++){const a=random()*6.28,u=random()*2-1,r=42+random()*32;positions.push(Math.cos(a)*Math.sqrt(1-u*u)*r,u*r,Math.sin(a)*Math.sqrt(1-u*u)*r);}stars.setAttribute('position',new T.Float32BufferAttribute(positions,3));scene.add(new T.Points(stars,new T.PointsMaterial({color:0xcbd8ff,size:.1,sizeAttenuation:true,transparent:true,opacity:.72})));

  const destination=new T.Vector3(),target=new T.Vector3(),look=new T.Vector3(-2.9,2.15,0);
  camera.position.set(Math.sin(angle)*20,8.8,Math.cos(angle)*20);
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.3:1.6));renderer.setSize(innerWidth,innerHeight);$('scene').dataset.viewport=`${innerWidth}x${innerHeight}`;}
  addEventListener('resize',resize);resize();
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,angle};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(drag)angle=drag.angle+(event.clientX-drag.x)*.006;});
  canvas.addEventListener('pointerup',event=>{if(drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!inside)location.hash='inside';drag=null;});
  canvas.addEventListener('pointercancel',()=>drag=null);
  addEventListener('pointermove',event=>{if(reduced.matches)return;document.documentElement.style.setProperty('--bg-x',`${(event.clientX/innerWidth-.5)*-7}px`);document.documentElement.style.setProperty('--bg-y',`${(event.clientY/innerHeight-.5)*-5}px`);},{passive:true});
  let last=performance.now(),elapsed=0,metricAt=last,metricFrames=0;
  function frame(now){requestAnimationFrame(frame);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)elapsed+=dt;
    const nextFov=inside?66:42;if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
    if(inside){destination.set(Math.sin(angle)*3.1,2.15,Math.cos(angle)*3.1);target.set(0,2.15,0);}else{const radius=innerWidth<700?24:20;destination.set(Math.sin(angle)*radius,8.8,Math.cos(angle)*radius);target.set(innerWidth<700?-1.3:-2.9,2.15,0);}
    const factor=paused||reduced.matches?1:1-Math.exp(-dt*3.5);camera.position.lerp(destination,factor);look.lerp(target,factor);camera.lookAt(look);
    if(!paused){sails.rotation.y=Math.sin(elapsed*.14)*.027;cloud.position.y=Math.sin(elapsed*.29)*.055;}
    cloud.visible=!inside;
    if(!inside){for(let i=0;i<cloudCount;i++){const spec=cloudSpecs[i];cloudSpin.setFromAxisAngle(cloudAxis,spec.twist);cloudObject.position.copy(spec.position);cloudObject.quaternion.copy(camera.quaternion).multiply(cloudSpin);cloudObject.scale.set(spec.scale,spec.scale*.69,1);cloudObject.updateMatrix();cloud.setMatrixAt(i,cloudObject.matrix);}cloud.instanceMatrix.needsUpdate=true;}
    renderer.render(scene,camera);metricFrames++;
    if(now-metricAt>=2000){const node=$('scene');node.dataset.fps=(metricFrames*1000/(now-metricAt)).toFixed(1);node.dataset.calls=String(renderer.info.render.calls);node.dataset.triangles=String(renderer.info.render.triangles);node.dataset.textures=String(renderer.info.memory.textures);node.dataset.mode=inside?'inside':'outside';metricAt=now;metricFrames=0;}
  }
  requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('status').textContent='3D приостановлено. Обнови страницу; витрины доступны кнопками.';$('rooms').hidden=false;});
}

function makeNebulaTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const c=canvas.getContext('2d');
  const base=c.createLinearGradient(0,0,512,1024);base.addColorStop(0,'rgba(12,29,79,.45)');base.addColorStop(.33,'rgba(32,78,181,.56)');base.addColorStop(.64,'rgba(98,26,164,.67)');base.addColorStop(1,'rgba(10,28,83,.38)');c.fillStyle=base;c.fillRect(0,0,512,1024);
  let seed=6924;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<90;i++){const x=random()*512,y=random()*1024,r=25+random()*150;const hue=i%3===0?'199,239,255':i%3===1?'232,99,255':'79,174,255';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${hue},${.14+random()*.25})`);g.addColorStop(.35,`rgba(${hue},.08)`);g.addColorStop(1,`rgba(${hue},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<260;i++){const x=random()*512,y=random()*1024,r=random()*1.6+.3;c.fillStyle=`rgba(231,243,255,${.28+random()*.64})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function makeCloudTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=91;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<54;i++){const a=random()*6.28,r=random()*54,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r,s=28+random()*50;const g=c.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.5,'rgba(247,247,255,.075)');g.addColorStop(1,'rgba(230,235,255,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}
  return new T.CanvasTexture(canvas);
}
