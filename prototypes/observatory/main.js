import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {membraneFrame} from '../../src/galaxy/membrane.ts';
import telescopeUrl from './telescope-optimized.glb?url';

// This scene has no access to account stores, forms, or application state.
const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
$('detail').insertAdjacentHTML('afterbegin',membraneFrame());
 let paused=reduced.matches,inside=false,angle=.38,drag=null,elapsed=0,last=performance.now();
const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,180);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{ $('status').textContent='3D недоступно в этом браузере. Описания витрин доступны кнопками.';$('rooms').hidden=false;}
if(renderer)start();
const contents={
 telescope:['Что хочется исследовать?','<p>Вымышленный вопрос: <strong>мне нравится фотография или возможность побыть без рабочих задач?</strong></p><p>Телескоп обозначает вопрос, а не предсказание ответа.</p>'],
 atlas:['Атлас наблюдений','<p><strong>Наблюдение:</strong> после двух коротких прогулок участник отметил интерес к свету и деталям.</p><p><strong>Ограничение:</strong> двух записей недостаточно для вывода об устойчивом интересе. Это самоотчёт, не проверка способностей.</p>'],
 workshop:['Мастерская навыков','<p><strong>Фотография · знакомство.</strong> Пример небольшой пробы: снять один предмет при двух вариантах света.</p><p>Попробовать — не значит освоить. Здесь будут работы и отметки о практике, а не назначенный уровень таланта.</p>'],
 gallery:['Галерея открытий','<p><strong>«Мне нравится замечать детали, но я пока не хочу делать это работой».</strong></p><p>Пример личного открытия. Витрина хранит его основание, а не награждает за правильный ответ. Сейчас все экспонаты демонстрационные.</p>']};
let opener=null;
function showRoom(key){opener=document.activeElement;$('detail').querySelector('h2').textContent=contents[key][0];$('detail-body').innerHTML=contents[key][1];$('detail').showModal();}
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>showRoom(b.dataset.room));
$('close').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>opener?.focus());
function setView(){inside=location.hash==='#inside';document.body.classList.toggle('inside',inside);$('enter').hidden=inside;$('outside').hidden=!inside;$('rooms').hidden=!inside;$('title').innerHTML=inside?'Твоя обсерватория':'Место для<br>твоих открытий';$('eyebrow').textContent=inside?'ОПЫТ / ПРОБЫ / ОТКРЫТИЯ':'ТВОЁ МЕСТО В ГАЛАКТИКЕ';}
$('enter').onclick=()=>location.hash='inside';$('outside').onclick=()=>location.hash='outside';addEventListener('hashchange',setView);setView();
$('rotate').onclick=()=>{angle+=Math.PI/4;};
function syncPause(){$('pause').textContent=paused?'Включить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').onclick=()=>{paused=!paused;syncPause();};reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});syncPause();

function start(){
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('scene').append(renderer.domElement);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xb9d6ff,0x29223e,.9));
 const sun=new T.DirectionalLight(0xffe4bf,2.6);sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10});sun.shadow.bias=-.001;scene.add(sun);
 const rim=new T.DirectionalLight(0x8b8fff,3);rim.position.set(8,4,-8);scene.add(rim);
 const warm=new T.PointLight(0xffc274,12,13,2);warm.position.set(0,3,0);scene.add(warm);
 const ivory=new T.MeshStandardMaterial({color:0x9b978c,roughness:.42,metalness:.12,side:T.DoubleSide});
 const dark=new T.MeshStandardMaterial({color:0x101b2c,metalness:.8,roughness:.27});
 const gold=new T.MeshStandardMaterial({color:0xb89a62,metalness:.8,roughness:.25});
 const glow=new T.MeshStandardMaterial({color:0xffd597,emissive:0xffbc66,emissiveIntensity:2.4});
 const glass=new T.MeshStandardMaterial({color:0x436483,metalness:.55,roughness:.14,transparent:true,opacity:.19,side:T.DoubleSide,depthWrite:false});
 const building=new T.Group();scene.add(building);
 function mesh(g,m,x=0,y=0,z=0,parent=building){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function cylinder(r,h,y,m=ivory){return mesh(new T.CylinderGeometry(r,r,h,96),m,0,y,0);}
 function ring(r,y,m=gold,t=.025){const o=mesh(new T.TorusGeometry(r,t,8,128),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
 cylinder(5.8,.32,-.18);cylinder(5.5,.28,.05);ring(5.65,-.12,glow,.026);cylinder(4.8,.08,.24,dark);
 for(const r of [1.3,3,4.7,5.25])ring(r,.29,gold,.015);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.34,x=Math.sin(a)*4.55,z=Math.cos(a)*4.55;
 mesh(new T.CylinderGeometry(.14,.18,3.35,24),dark,x,1.96,z);
 for(const y of [.37,.52,3.36,3.53])mesh(new T.CylinderGeometry(.23,.23,.1,24),gold,x,y,z);
 }
 // Open entrance faces +Z; window segments do not cross the doorway.
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;if(Math.cos(a)>.86)continue;const win=mesh(new T.CylinderGeometry(4.53,4.53,2.8,12,1,true,a,.48),glass,0,1.96,0);win.castShadow=false;}
 cylinder(4.95,.22,3.7);ring(4.98,3.66,glow,.018);cylinder(4.78,.12,3.88,dark);
 const roof=new T.Group();roof.position.y=3.93;building.add(roof);
 // An actual open dome slit, not a textured sphere.
 const dome=mesh(new T.SphereGeometry(4.68,80,32,.28,Math.PI*2-.56,0,Math.PI/2),ivory,0,0,0,roof);
 dome.rotation.y=Math.PI/2;
 for(let i=0;i<=8;i++){const a=.28+(Math.PI*2-.56)*i/8;const points=[];for(let j=0;j<=32;j++){const t=j/32*Math.PI/2;points.push(new T.Vector3(Math.cos(a)*Math.sin(t)*4.7,Math.cos(t)*4.7,Math.sin(a)*Math.sin(t)*4.7));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.023,6,false),gold,0,0,0,roof);}
 for(let i=0;i<3;i++)mesh(new T.BoxGeometry(2.2,.14,1.0-i*.15),ivory,0,-.16+i*.14,5.65-i*.4);
 // Open luminous doorway and its curved lintel.
 for(const x of [-.87,.87])mesh(new T.CylinderGeometry(.035,.035,2.15,12),glow,x,1.38,4.59);
 const arch=mesh(new T.TorusGeometry(.87,.035,8,40,Math.PI),glow,0,2.45,4.59);
 // Telescope, visible both through the entrance and from the room.
 const originalTelescope=new T.Group();building.add(originalTelescope);
 mesh(new T.CylinderGeometry(.8,.8,.14,48),dark,0,.39,0,originalTelescope);mesh(new T.CylinderGeometry(.16,.28,1.65,24),gold,0,1.23,0,originalTelescope);
 const tube=new T.Group();tube.position.set(0,2.2,0);tube.rotation.x=-.85;originalTelescope.add(tube);
 mesh(new T.CylinderGeometry(.35,.45,2.7,48),dark,0,.6,0,tube);
 for(const y of [-.68,.2,1.8])mesh(new T.CylinderGeometry(.47,.47,.12,48),gold,0,y,0,tube);
 const lens=mesh(new T.CircleGeometry(.33,48),new T.MeshStandardMaterial({color:0x72c1e0,metalness:.85,roughness:.08,emissive:0x143a63,emissiveIntensity:.6}),0,1.965,0,tube);lens.rotation.x=-Math.PI/2;
 const legacyTelescope=new URLSearchParams(location.search).get('telescope')==='original';
 $('scene').dataset.telescopeMode=legacyTelescope?'original-procedural':'optimized-glb-loading';
 if(!legacyTelescope)new GLTFLoader().load(telescopeUrl,gltf=>{building.add(gltf.scene);originalTelescope.traverse(object=>{if(object.isMesh)object.geometry.dispose();});originalTelescope.removeFromParent();gltf.scene.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});$('scene').dataset.telescopeMode='optimized-glb';},undefined,()=>{$('scene').dataset.telescopeMode='original-fallback';});
 const targets=[];
 for(const [i,key] of ['atlas','workshop','gallery'].entries()){
 const a=Math.PI+(i-1)*.72,x=Math.sin(a)*3.65,z=Math.cos(a)*3.65;
 const g=new T.Group();g.position.set(x,0,z);g.rotation.y=a;building.add(g);
 mesh(new T.BoxGeometry(1.4,2.2,.2),dark,0,1.4,0,g);mesh(new T.BoxGeometry(1.17,1.8,.06),gold,0,1.48,-.13,g);
 mesh(new T.BoxGeometry(1.07,1.65,.08),dark,0,1.48,-.18,g);
 mesh(new T.BoxGeometry(1.15,.07,.55),ivory,0,.65,-.25,g);
 mesh(new T.BoxGeometry(1.05,.025,.05),glow,0,2.34,-.23,g);
 const artifact=mesh(i===0?new T.TorusKnotGeometry(.23,.025,64,8):i===1?new T.BoxGeometry(.36,.46,.09):new T.IcosahedronGeometry(.27,0),i===1?ivory:gold,0,1.18,-.32,g);artifact.userData.room=key;targets.push(artifact);
 }
 // Deterministic star field and layered, irregular procedural cloud sprites.
 let seed=1825;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const pos=[];for(let i=0;i<1700;i++){const a=random()*Math.PI*2,u=random()*2-1,r=65+random()*30;pos.push(Math.cos(a)*Math.sqrt(1-u*u)*r,u*r,Math.sin(a)*Math.sqrt(1-u*u)*r);}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(pos,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0xbbccec,size:.1,sizeAttenuation:true,transparent:true,opacity:.8})));
 function cloudMap(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');for(let i=0;i<48;i++){const a=random()*6.28,r=random()*65,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r,sz=25+random()*38;const grad=ctx.createRadialGradient(x,y,0,x,y,sz);grad.addColorStop(0,'rgba(255,255,255,.13)');grad.addColorStop(.5,'rgba(228,238,255,.065)');grad.addColorStop(1,'rgba(210,230,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);}return new T.CanvasTexture(c);}
 const map=cloudMap(),clouds=new T.Group();scene.add(clouds);
 const originalClouds=new URLSearchParams(location.search).get('cloud')==='original';
 $('scene').dataset.cloudMode=originalClouds?'original-110-sprites':'instanced-1-draw';
 const cloudSpecs=[];
 for(let i=0;i<110;i++){const a=random()*Math.PI*2,r=random()*7,rotation=random()*6.28,size=3.5+random()*3;
   const position=new T.Vector3(Math.sin(a)*r,-.8-random()*1.1,Math.cos(a)*r),color=i%3?0xdbe4ff:0x929fd0;
   cloudSpecs.push({position,rotation,size,color});
   if(originalClouds){const m=new T.SpriteMaterial({map,color,transparent:true,opacity:.65,depthWrite:false,rotation});const s=new T.Sprite(m);s.position.copy(position);s.scale.set(size,size*.75,1);clouds.add(s);}
 }
 const cloudMesh=originalClouds?null:new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide}),cloudSpecs.length);
 if(cloudMesh){cloudMesh.frustumCulled=false;cloudSpecs.forEach((spec,i)=>cloudMesh.setColorAt(i,new T.Color(spec.color)));clouds.add(cloudMesh);}
 const cloudTransform=new T.Object3D(),cloudRotation=new T.Quaternion(),cloudSpin=new T.Quaternion(),cloudAxis=new T.Vector3(0,0,1);
 // Distant colour without large planet textures.
 const nebula=new T.Sprite(new T.SpriteMaterial({map,color:0x593598,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending}));nebula.position.set(-22,9,-34);nebula.scale.set(80,40,1);scene.add(nebula);
 const ray=new T.Raycaster(),pointer=new T.Vector2();renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,angle};});
 renderer.domElement.addEventListener('pointermove',e=>{if(drag&&!inside)angle=drag.angle+(e.clientX-drag.x)*.006;});
 renderer.domElement.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);if(inside){const hit=ray.intersectObjects(targets)[0];if(hit)showRoom(hit.object.userData.room);}else if(ray.intersectObject(building,true).length)location.hash='inside';}drag=null;});
 renderer.domElement.addEventListener('pointercancel',()=>drag=null);
 const look=new T.Vector3(0,2,0),dest=new T.Vector3(),aim=new T.Vector3();camera.position.set(14,9,20);
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);
 let metricAt=performance.now(),metricFrames=0;
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;if(!paused)elapsed+=dt;
 const fov=inside?68:44;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
 if(inside){dest.set(2.3,2.6,3.2);aim.set(-.7,2.65,-2);}else{const r=innerWidth<700?29:22;dest.set(Math.sin(angle)*r,10,Math.cos(angle)*r);aim.set(innerWidth<700?0:-3,innerWidth<700?4:2.1,0);}
 const k=paused||reduced.matches?1:1-Math.exp(-dt*3);camera.position.lerp(dest,k);look.lerp(aim,k);camera.lookAt(look);
 clouds.rotation.y=elapsed*.012;clouds.position.y=Math.sin(elapsed*.3)*.07;clouds.visible=!inside;
 if(cloudMesh&&!inside){cloudRotation.copy(clouds.quaternion).invert().multiply(camera.quaternion);
   cloudSpecs.forEach((spec,i)=>{cloudSpin.setFromAxisAngle(cloudAxis,spec.rotation);cloudTransform.position.copy(spec.position);cloudTransform.quaternion.copy(cloudRotation).multiply(cloudSpin);cloudTransform.scale.set(spec.size,spec.size*.75,1);cloudTransform.updateMatrix();cloudMesh.setMatrixAt(i,cloudTransform.matrix);});cloudMesh.instanceMatrix.needsUpdate=true;}
 renderer.render(scene,camera);
 metricFrames++;
 if(now-metricAt>=2000){const sample=metricFrames*1000/(now-metricAt);const node=$('scene');node.dataset.fps=sample.toFixed(1);node.dataset.calls=String(renderer.info.render.calls);node.dataset.triangles=String(renderer.info.render.triangles);node.dataset.textures=String(renderer.info.memory.textures);node.dataset.geometries=String(renderer.info.memory.geometries);metricAt=now;metricFrames=0;}
 }requestAnimationFrame(frame);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('status').textContent='Графика приостановлена. Перезагрузи страницу; описания остаются доступны.';});
}
