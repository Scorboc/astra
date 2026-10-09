import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import telescopeUrl from '../observatory/telescope-optimized.glb?url';

// Isolated visual prototype. It never reads the ASTRA account or storage.
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let inside=location.hash==='#inside',paused=reduced.matches,angle=.38,drag=null;
const examples={
  observations:{title:'Атлас наблюдений',body:'<p>Здесь могли бы появляться <strong>твои собственные записи</strong> и причины промежуточных предположений.</p><p>В этом отдельном прототипе нет доступа к профилю. Пространство показывает только возможное расположение атласа.</p>'},
  practice:{title:'Пробы и навыки',body:'<p>Короткая проба помогает проверить интерес в реальной жизни. Попробовать — не значит освоить навык.</p><p>Эта витрина пока демонстрационная: она не отмечает выполненные действия.</p>'},
  discoveries:{title:'Открытия',body:'<p>Здесь можно было бы возвращаться к тому, что человек сам заметил за время исследования.</p><p>Один ответ не превращается в вывод о способностях или предназначении.</p>'}
};
let dialogOpener=null;
function openDetail(key){const item=examples[key];if(!item)return;dialogOpener=document.activeElement;$('detail-title').textContent=item.title;$('detail-body').innerHTML=item.body;$('detail').showModal();}
document.querySelectorAll('[data-room]').forEach(button=>button.addEventListener('click',()=>openDetail(button.dataset.room)));
$('close').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('close',()=>dialogOpener?.focus());
function setView(){inside=location.hash==='#inside';document.body.classList.toggle('inside',inside);$('enter').hidden=inside;$('outside').hidden=!inside;$('rooms').hidden=!inside;$('title').innerHTML=inside?'Внутри<br>астролябии':'Обсерватория<br>открытий';}
addEventListener('hashchange',setView);setView();
$('enter').addEventListener('click',()=>{location.hash='inside';});
$('outside').addEventListener('click',()=>{location.hash='outside';});
$('rotate').addEventListener('click',()=>{angle+=Math.PI/4;});
function syncPause(){$('pause').textContent=paused?'Включить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').addEventListener('click',()=>{paused=!paused;syncPause();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});syncPause();

let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{
  $('status').textContent='3D недоступно в этом браузере. Пространства можно открыть кнопками.';
  $('rooms').hidden=false;
}
if(renderer)buildScene();

function buildScene(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.6));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  $('scene').append(renderer.domElement);

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,170);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xbed6ff,0x141021,1.05));
  const sun=new T.DirectionalLight(0xffe0aa,3.0);sun.position.set(-6,12,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});sun.shadow.bias=-.0002;scene.add(sun);
  const rim=new T.DirectionalLight(0x856bff,3.4);rim.position.set(8,5,-8);scene.add(rim);
  const cyan=new T.DirectionalLight(0x35a3ff,1.5);cyan.position.set(-8,3,-5);scene.add(cyan);
  const warm=new T.PointLight(0xffbd72,18,16,2);warm.position.set(0,2.4,0);scene.add(warm);

  const stoneTexture=makeStoneTexture();
  const stone=new T.MeshStandardMaterial({map:stoneTexture,color:0x485263,metalness:.37,roughness:.64});
  const edge=new T.MeshStandardMaterial({color:0x141820,metalness:.58,roughness:.47});
  const gold=new T.MeshStandardMaterial({color:0x957043,metalness:.9,roughness:.29});
  const bright=new T.MeshStandardMaterial({color:0xffdda2,emissive:0xffba69,emissiveIntensity:2.8,metalness:.45,roughness:.22});
  const glass=new T.MeshPhysicalMaterial({color:0x688ab2,metalness:.35,roughness:.12,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});
  const station=new T.Group();scene.add(station);
  function mesh(geometry,material,x=0,y=0,z=0,parent=station){const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  function disc(radius,height,y,material){return mesh(new T.CylinderGeometry(radius,radius,height,96),material,0,y);}
  function ring(radius,y,material,tube=.024,parent=station){const object=mesh(new T.TorusGeometry(radius,tube,8,128),material,0,y,0,parent);object.rotation.x=Math.PI/2;return object;}

  disc(5.35,.56,-.12,edge);
  disc(5.47,.13,.19,gold);
  disc(5.32,.11,.29,edge);
  disc(5.06,.055,.38,stone);
  ring(5.28,.36,bright,.038);
  for(const radius of [1.05,2.45,3.65,4.73])ring(radius,.423,gold,.013);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;
    const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(Math.sin(a)*1.1,.429,Math.cos(a)*1.1),new T.Vector3(Math.sin(a)*4.7,.429,Math.cos(a)*4.7)]),new T.LineBasicMaterial({color:0x806548,transparent:true,opacity:.55}));station.add(line);
  }
  for(let i=0;i<3;i++){const stair=mesh(new T.BoxGeometry(1.95,.14,1.1-i*.17),i===1?gold:stone,0,-.05+i*.12,5.75-i*.38);stair.castShadow=false;}
  for(let i=0;i<6;i++){const a=(i+.5)/6*Math.PI*2,x=Math.sin(a)*4.53,z=Math.cos(a)*4.53;
    mesh(new T.CylinderGeometry(.17,.34,1.45,8),edge,x,1.14,z);
    mesh(new T.CylinderGeometry(.24,.24,.13,16),gold,x,1.88,z);
    mesh(new T.BoxGeometry(.10,.75,.11),bright,x,1.12,z+.17).castShadow=false;
  }
  ring(4.66,1.98,gold,.09);
  ring(4.73,1.99,bright,.017);
  // Three real arches, not a flat image of the chosen JPEG.
  const arches=new T.Group();station.add(arches);
  for(const [rotation,radius,tilt] of [[.08,4.2,-.08],[1.25,4.48,.12]]){
    const arch=new T.Group();arch.rotation.set(0,rotation,tilt);arches.add(arch);
    mesh(new T.TorusGeometry(radius,.16,12,128,Math.PI),gold,0,.39,0,arch);
    mesh(new T.TorusGeometry(radius+.15,.018,6,128,Math.PI),bright,0,.39,0,arch).castShadow=false;
  }
  mesh(new T.SphereGeometry(.18,16,12),gold,0,4.6,0,station);
  // A few translucent sections suggest a guardrail without closing the entry.
  for(let i=0;i<11;i++){const a=(i+1.25)/12*Math.PI*2;if(Math.cos(a)>.82)continue;
    const panel=mesh(new T.CylinderGeometry(4.58,4.58,1.0,12,1,true,a,.37),glass,0,1.06);panel.castShadow=false;
  }
  const telescope=new T.Group();telescope.rotation.y=1.08;station.add(telescope);
  $('scene').dataset.telescope='loading';
  new GLTFLoader().load(telescopeUrl,gltf=>{gltf.scene.scale.setScalar(1.18);gltf.scene.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});telescope.add(gltf.scene);$('scene').dataset.telescope='loaded-glb';},undefined,()=>{$('scene').dataset.telescope='fallback';mesh(new T.CylinderGeometry(.25,.4,2,18),gold,0,1.45,0,telescope);});

  const cloudTexture=makeCloudTexture();
  const cloudMaterial=new T.MeshBasicMaterial({map:cloudTexture,transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide});
  let seed=84723;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const cloudCount=innerWidth<700?68:100;
  for(const [x,z,scale] of [[-2,-.5,13],[2.6,-1,14],[0,2,15]]){const halo=new T.Sprite(new T.SpriteMaterial({map:cloudTexture,color:0xe9e7f8,opacity:.36,transparent:true,depthWrite:false}));halo.position.set(x,-1.2,z);halo.scale.set(scale,scale*.7,1);scene.add(halo);}
  const cloudMesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),cloudMaterial,cloudCount);
  cloudMesh.frustumCulled=false;scene.add(cloudMesh);
  const cloudSpecs=[];
  for(let i=0;i<cloudCount;i++){const a=random()*Math.PI*2,r=3.2+random()*5.8,scale=3.0+random()*3.4;
    cloudSpecs.push({position:new T.Vector3(Math.sin(a)*r,-.9-random()*1.1,Math.cos(a)*r),scale,twist:random()*6.28});
    cloudMesh.setColorAt(i,new T.Color(i%4===0?0xd8d7fa:i%5===0?0xc4d4f6:0xf4f1f5));
  }
  const cloudObject=new T.Object3D(),cloudSpin=new T.Quaternion(),cloudAxis=new T.Vector3(0,0,1);
  const backgroundStars=new T.BufferGeometry(),positions=[];
  for(let i=0;i<780;i++){const a=random()*6.28,u=random()*2-1,r=42+random()*35;positions.push(Math.cos(a)*Math.sqrt(1-u*u)*r,u*r,Math.sin(a)*Math.sqrt(1-u*u)*r);}
  backgroundStars.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  scene.add(new T.Points(backgroundStars,new T.PointsMaterial({color:0xb7d5ff,size:.12,sizeAttenuation:true,transparent:true,opacity:.7})));

  const target=new T.Vector3(),destination=new T.Vector3(),look=new T.Vector3(-2.8,2,0);
  camera.position.set(Math.sin(angle)*19.5,8,Math.cos(angle)*19.5);
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.6));renderer.setSize(innerWidth,innerHeight);$('scene').dataset.viewport=`${innerWidth}x${innerHeight}`;}
  addEventListener('resize',resize);resize();
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,angle};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(drag)angle=drag.angle+(event.clientX-drag.x)*.006;});
  canvas.addEventListener('pointerup',event=>{if(drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!inside)location.hash='inside';drag=null;});
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  addEventListener('pointermove',event=>{if(reduced.matches)return;document.documentElement.style.setProperty('--bg-x',`${(event.clientX/innerWidth-.5)*-8}px`);document.documentElement.style.setProperty('--bg-y',`${(event.clientY/innerHeight-.5)*-5}px`);},{passive:true});
  let last=performance.now(),elapsed=0,metricAt=last,metricFrames=0;
  function frame(now){requestAnimationFrame(frame);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)elapsed+=dt;
    const nextFov=inside?68:44;if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
    if(inside){destination.set(Math.sin(angle)*3.6,2.2,Math.cos(angle)*3.6);target.set(0,2.3,0);}else{const radius=innerWidth<700?23:19.5;destination.set(Math.sin(angle)*radius,8,Math.cos(angle)*radius);target.set(innerWidth<700?-1.7:-2.8,2,0);}
    const factor=paused||reduced.matches?1:1-Math.exp(-dt*3.6);
    camera.position.lerp(destination,factor);look.lerp(target,factor);camera.lookAt(look);
    arches.rotation.y=paused?arches.rotation.y:Math.sin(elapsed*.12)*.055;
    cloudMesh.position.y=paused?cloudMesh.position.y:Math.sin(elapsed*.28)*.07;
    cloudMesh.visible=!inside;
    if(!inside){for(let i=0;i<cloudCount;i++){const spec=cloudSpecs[i];cloudSpin.setFromAxisAngle(cloudAxis,spec.twist);cloudObject.position.copy(spec.position);cloudObject.quaternion.copy(camera.quaternion).multiply(cloudSpin);cloudObject.scale.set(spec.scale,spec.scale*.66,1);cloudObject.updateMatrix();cloudMesh.setMatrixAt(i,cloudObject.matrix);}cloudMesh.instanceMatrix.needsUpdate=true;}
    renderer.render(scene,camera);metricFrames++;
    if(now-metricAt>=2000){const node=$('scene');node.dataset.fps=(metricFrames*1000/(now-metricAt)).toFixed(1);node.dataset.calls=String(renderer.info.render.calls);node.dataset.triangles=String(renderer.info.render.triangles);node.dataset.textures=String(renderer.info.memory.textures);node.dataset.mode=inside?'inside':'outside';metricAt=now;metricFrames=0;}
  }
  requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('status').textContent='3D приостановлено. Обнови страницу; описания доступны кнопками.';$('rooms').hidden=false;});
}

function makeStoneTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d');context.fillStyle='#3a4352';context.fillRect(0,0,512,512);
  let seed=719;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<13000;i++){const shade=rand()>.5?'rgba(210,212,225,.035)':'rgba(0,0,0,.06)';context.fillStyle=shade;context.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*3);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function makeCloudTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d');let seed=22;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<45;i++){const a=rand()*6.28,r=rand()*58,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r,s=27+rand()*43;const gradient=context.createRadialGradient(x,y,0,x,y,s);gradient.addColorStop(0,'rgba(255,255,255,.16)');gradient.addColorStop(.48,'rgba(247,246,255,.07)');gradient.addColorStop(1,'rgba(232,234,255,0)');context.fillStyle=gradient;context.fillRect(0,0,256,256);}
  return new T.CanvasTexture(canvas);
}
