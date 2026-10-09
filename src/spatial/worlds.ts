import * as T from 'three';
import type { WorldId, SectionId } from './navigation';

export interface Place { id: SectionId; object: T.Group; anchor: T.Vector3; focus: T.Vector3 }
export interface World {
  root: T.Group; places: Place[]; walkSurface: T.Mesh; avatar: T.Group; spark: T.Mesh;
  home: T.Vector3; target: T.Vector3; background: string; accent: string;
  title: string; description: string; kicker: string; radius: number;
  update: (time: number) => void; dispose: () => void;
}
type Parent = T.Object3D;
const mat = (color: T.ColorRepresentation, metalness = 0, roughness = .55) => new T.MeshStandardMaterial({color, metalness, roughness});
function mesh(parent: Parent, geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) {
  const item = new T.Mesh(geometry, material); item.position.set(x,y,z);
  item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
}
const box = (p: Parent, m: T.Material, w: number,h: number,d: number,x=0,y=0,z=0) => mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
const cylinder = (p: Parent,m: T.Material,r: number,h: number,x=0,y=0,z=0) => mesh(p,new T.CylinderGeometry(r,r,h,48),m,x,y,z);
const ball = (p: Parent,m: T.Material,r: number,x=0,y=0,z=0) => mesh(p,new T.SphereGeometry(r,24,16),m,x,y,z);
function ring(p: Parent,m:T.Material,r:number,t:number,x=0,y=0,z=0) {
  return mesh(p,new T.TorusGeometry(r,t,10,72),m,x,y,z);
}
function group(p:Parent,x=0,y=0,z=0) { const g = new T.Group(); g.position.set(x,y,z); p.add(g); return g; }
function tree(p:Parent,x:number,z:number,size=1) {
  const g = group(p,x,0,z); g.scale.setScalar(size);
  cylinder(g,mat('#88715a'),.10,1.9,0,.85);
  ball(g,mat('#769983'),.78,0,1.98).scale.set(.8,1.35,.85);
  ball(g,mat('#8ba995'),.54,.4,1.66,.1);
  return g;
}
function planter(p:Parent,x:number,z:number,scale=1) {
  const g=group(p,x,0,z); g.scale.setScalar(scale);
  cylinder(g,mat('#d69d78'),.42,.55,0,.25);
  const leaf=mat('#426e59');
  for(let i=0;i<6;i++) { const b=ball(g,leaf,.24,Math.cos(i)*.24,.9+Math.sin(i)*.15,Math.sin(i)*.2); b.scale.set(.5,2,.7); b.rotation.z=Math.cos(i)*.45; }
}
function arch(p:Parent,color:string) {
  const m=mat(color,.15,.38);
  cylinder(p,m,.24,1.85,-1.25,.925); cylinder(p,m,.24,1.85,1.25,.925);
  mesh(p,new T.TorusGeometry(1.25,.24,16,48,Math.PI),m,0,1.85);
}
function avatar(p:Parent,x=0,z=3.8) {
  const g=group(p,x,0,z); const suit=mat('#ec754a'); const dark=mat('#203a38',.2);
  cylinder(g,suit,.18,.45,0,.38); ball(g,suit,.21,0,.77);
  const visor=ball(g,dark,.145,0,.8,.14); visor.scale.set(1,.55,.5);
  box(g,mat('#e4dfc6'),.26,.3,.15,0,.4,-.2);
  ball(g,dark,.10,-.105,.1,.05).scale.set(1,.7,1.4);
  ball(g,dark,.10,.105,.1,.05).scale.set(1,.7,1.4);
  return g;
}
function path(p:Parent,a:T.Vector3,b:T.Vector3,color:string) {
  const distance=a.distanceTo(b); const count=Math.floor(distance/.62);
  const stone=mat(color);
  for(let i=0;i<=count;i++) {
    const point=a.clone().lerp(b,i/Math.max(1,count));
    const s=box(p,stone,.43,.06,.36,point.x,.04,point.z); s.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
  }
}
function place(root:T.Group,id:SectionId,x:number,z:number): Place {
  const object=group(root,x,0,z); object.userData.section=id;
  return {id,object,anchor:new T.Vector3(x,3.7,z),focus:new T.Vector3(x,1.2,z)};
}
function garden(root:T.Group,places:Place[]) {
  const cream=mat('#eae3d3'), sand=mat('#d5cebd');
  const floor=cylinder(root,cream,9.3,.4,0,-.23); floor.userData.walk=true;
  cylinder(root,sand,9.45,.12,0,-.48);
  for(let i=0;i<64;i++) { const a=i/64*Math.PI*2; cylinder(root,sand,.035,.20,Math.cos(a)*9.28,-.04,Math.sin(a)*9.28); }
  const center=ring(root,mat('#cac5b5'),2.15,.025,0,.015); center.rotation.x=-Math.PI/2;
  const center2=ring(root,mat('#cac5b5'),2.65,.018,0,.015); center2.rotation.x=-Math.PI/2;
  const coords:[SectionId,number,number][]=[['today',-4.5,2],['route',-3,-4.3],['discoveries',3.9,-3.4],['profile',4.8,2.7]];
  coords.forEach(([id,x,z])=>{ const point=place(root,id,x,z); places.push(point); cylinder(point.object,sand,1.9,.16,0,.06); path(root,new T.Vector3(x,0,z),new T.Vector3(), '#c1c8b4'); });
  const today=places[0].object; arch(today,'#ec784f');
  const inner=ring(today,mat('#f7c789',.3),.64,.04,0,1.54); inner.rotation.y=.35;
  const todayOrb=mesh(today,new T.IcosahedronGeometry(.43,1),mat('#f6b26b',.4),0,1.5);
  const route=places[1].object;
  for(let i=0;i<5;i++) box(route,mat(i%2?'#8da591':'#a6b8a1'),1.5,.3*(i+1),.47,0,.15*(i+1),1-i*.48);
  const routeArch=group(route,0,1.5,-.9); routeArch.scale.setScalar(.57); arch(routeArch,'#688b79');
  const discoveries=places[2].object; cylinder(discoveries,cream,.85,.45,0,.25);
  const crystal=mesh(discoveries,new T.OctahedronGeometry(1.0),mat('#789dab',.48,.25),0,1.65); crystal.scale.y=1.22;
  const halo=ring(discoveries,mat('#d7b777',.6),1.2,.025,0,1.4); halo.rotation.set(1.1,.2,.4);
  const profile=places[3].object;
  box(profile,mat('#bd9772'),2,.18,.68,0,.6); box(profile,cream,.18,.65,.6,-.75,.28); box(profile,cream,.18,.65,.6,.75,.28);
  const personal=avatar(profile,.4,.1); personal.position.y=.64; personal.scale.setScalar(.8);
  planter(profile,-1,-.65,.9);
  tree(root,-6,-2,1.1); tree(root,1.3,-6.8,1.2); tree(root,6.8,-.6,1.0); tree(root,-1.7,6.5,.85);
  const green=mat('#a5b59b');
  for(let i=0;i<11;i++) { const a=i*2.4; ball(root,green,.28+((i*7)%4)*.1,Math.cos(a)*7.5,.22,Math.sin(a)*7.5).scale.y=.65; }
  return { floor, animate:(t:number)=>{ todayOrb.rotation.y=t*.32; inner.rotation.y=t*.2; crystal.rotation.y=-t*.15; } };
}
function orbit(root:T.Group,places:Place[]) {
  const graphite=mat('#253747',.65,.33), ivory=mat('#d1e0e0',.5,.3), accent=mat('#a8e6d0',.4);
  const floor=cylinder(root,graphite,9.4,.28,0,-.23); floor.userData.walk=true;
  const grid=new T.PolarGridHelper(9.1,32,8,96,'#4b727d','#344e60'); grid.position.y=-.07; root.add(grid);
  for(const r of [2.4,8.8,9.15]) { const line=ring(root,accent,r,.025,0,-.03); line.rotation.x=-Math.PI/2; }
  const core=group(root,0,1.4); ball(core,mat('#c7e8df',.5,.18),.9);
  const bands:T.Mesh[]=[];
  for(let i=0;i<3;i++) { const band=ring(core,mat(i===0?'#eeb66e':'#8bcecf',.7,.22),1.6+i*.17,.065); band.rotation.set(i*.9,.35+i*.5,.3); bands.push(band); }
  const coords:[SectionId,number,number][]=[['today',-5,2.5],['route',-4,-4],['discoveries',3.8,-4.1],['profile',5,2.5]];
  coords.forEach(([id,x,z],i)=>{
    const point=place(root,id,x,z); point.anchor.y=3.6; places.push(point);
    path(root,new T.Vector3(x,0,z),new T.Vector3(), '#486573');
    cylinder(point.object,ivory,1.6,.22,0,.1);
    const baseRing=ring(point.object,mat(i===0?'#f0b677':'#97dccb',.45),1.5,.065,0,.26); baseRing.rotation.x=-Math.PI/2;
  });
  const gate=places[0].object; arch(gate,'#bdcbd0'); const gateRing=ring(gate,mat('#ffc28a',.5),.94,.07,0,1.75); ball(gate,mat('#eba876',.2),.33,0,1.75);
  const route=places[1].object;
  for(let i=0;i<4;i++) { const node=ball(route,accent,.20,-.9+i*.6,.8+i*.4,0); cylinder(route,graphite,.045,node.position.y/2*2,node.position.x,node.position.y/2); }
  const disc=places[2].object;
  const specimen=mesh(disc,new T.IcosahedronGeometry(.88,0),mat('#a4d6be',.7,.18),0,1.5);
  const specRing=ring(disc,ivory,1.08,.03,0,1.5); specRing.rotation.x=Math.PI/2;
  const prof=places[3].object; box(prof,ivory,1.1,1.65,.65,0,.88); box(prof,mat('#74a3b4',.7,.2),.83,.9,.05,0,1.1,.36);
  const randomPositions=[];
  for(let i=0;i<140;i++){ const a=i*2.39996,r=18+(i*13%35); randomPositions.push(Math.cos(a)*r,4+(i*7%22),Math.sin(a)*r); }
  const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(randomPositions,3));
  root.add(new T.Points(geo,new T.PointsMaterial({color:'#94c3cf',size:.065,sizeAttenuation:true})));
  return { floor, animate:(t:number)=>{ bands.forEach((band,i)=>{band.rotation.y=t*.12*(i%2?-1:1)+i;}); specimen.rotation.y=t*.17; gateRing.rotation.y=Math.sin(t*.4)*.18; } };
}
function room(root:T.Group,places:Place[]) {
  const wood=mat('#c8ab88'), wall=mat('#e6ddcb'), blue=mat('#527c98'), paper=mat('#f0e8d5');
  const floor=box(root,wood,16,.3,13,0,-.23); floor.userData.walk=true;
  for(let i=0;i<19;i++) box(root,mat('#ad957a'),.018,.015,12.9,-7.5+i*.82,-.071);
  box(root,wall,16,4.5,.2,0,2.05,-6.5); box(root,wall,.2,4.5,13,-8,2.05);
  const windowMat=mat('#a7c1b3');
  const window=ring(root,paper,1.35,.17,-4,2.55,-6.32); ball(root,windowMat,1.25,-4,2.55,-6.43).scale.z=.02;
  window.castShadow=false; box(root,paper,2.6,.10,.12,-4,2.55,-6.17); box(root,paper,.10,2.6,.12,-4,2.55,-6.17);
  const carpet=box(root,mat('#c6cbb8'),8.3,.04,7,0,-.05,0); carpet.rotation.y=.07;
  const coords:[SectionId,number,number][]=[['today',-3.3,2.3],['route',-4,-3.4],['discoveries',3,-3.6],['profile',4.7,2.3]];
  coords.forEach(([id,x,z])=>{const point=place(root,id,x,z); point.anchor.y=id==='route'?3.1:3.7; places.push(point);});
  const desk=places[0].object; box(desk,blue,3.6,.2,1.7,0,1.2);
  for(const x of [-1.4,1.4])for(const z of [-.55,.55])cylinder(desk,blue,.09,1.15,x,.57,z);
  const book=group(desk,0,1.36); box(book,paper,1.08,.09,.78); box(book,mat('#e77d4b'),.10,.02,.86,.12,.06); book.rotation.y=-.3;
  cylinder(desk,mat('#e68b51'),.3,.06,1.13,1.35,-.3); cylinder(desk,wood,.035,.8,1.13,1.74,-.3);
  mesh(desk,new T.ConeGeometry(.40,.45,32,1,true),mat('#e68b51'),1.13,2.1,-.3);
  const route=places[1].object; box(route,wood,2.9,2.25,.12,0,1.75,-.35);
  for(let i=0;i<4;i++){ const card=box(route,mat(['#cc9973','#b7c4a4','#eee7d2','#9baeb9'][i]),.78,.71,.025,(i%2-.5)*1.13,1.24+Math.floor(i/2)*1.0,-.26); card.rotation.z=(i%2?1:-1)*.06; }
  const shelf=places[2].object;
  for(let i=0;i<3;i++){box(shelf,paper,3,.13,.7,0,.5+i*.87); for(const x of [-1.4,1.4])box(shelf,wood,.1,.84,.65,x,.88+i*.87);}
  const relic=mesh(shelf,new T.OctahedronGeometry(.45),mat('#91acb0',.35),-.8,1.04);
  mesh(shelf,new T.TorusKnotGeometry(.28,.085,48,8),mat('#dfad75'),.6,1.82);
  ball(shelf,mat('#8daa78'),.3,-.6,2.48);
  const profile=places[3].object; cylinder(profile,mat('#c88c69'),1.12,.48,0,.23);
  const chair=box(profile,mat('#d5a37e'),1.1,.15,.9,0,.64); chair.rotation.y=-.2;
  box(profile,mat('#d5a37e'),1.1,.8,.16,0,1.08,-.4);
  planter(root,6,-5,1.65); tree(root,-6.8,3.6,.9); planter(root,6.8,4.6,.95);
  return { floor, animate:(t:number)=>{relic.rotation.y=t*.18;} };
}
export function buildWorld(id:WorldId): World {
  const root=new T.Group(), places:Place[]=[];
  const made=id==='garden'?garden(root,places):id==='orbit'?orbit(root,places):room(root,places);
  const explorer=avatar(root,0,3.6);
  const spark=mesh(root,new T.IcosahedronGeometry(.26,0),new T.MeshStandardMaterial({color:'#ffce77',emissive:'#ff9b42',emissiveIntensity:.9,metalness:.3,roughness:.35}),id==='room'?1.7:0,1.1,id==='room'?1.4:.1);
  spark.userData.spark=true; spark.visible=false;
  const configs = {
    garden: {background:'#e8e6dd',accent:'#bb5b38',home:new T.Vector3(15,15,21),target:new T.Vector3(0,.2,0),title:'У каждого шага<br>есть своё место.',description:'Исследуйте сад. Нажмите на любой объект,<br>чтобы войти в раздел.',kicker:'01 / открытый мир',radius:8.8},
    orbit: {background:'#10202c',accent:'#b8dec8',home:new T.Vector3(15,16,23),target:new T.Vector3(0,.3,0),title:'Ваша собственная<br>система координат.',description:'Перелетайте между модулями.<br>Каждый из них — часть вашего пути.',kicker:'02 / орбитальная навигация',radius:8.8},
    room: {background:'#e7ddcc',accent:'#436a81',home:new T.Vector3(17,15,22),target:new T.Vector3(-.4,.6,-.4),title:'Здесь начинается<br>что-то ваше.',description:'Блокнот, доска, полка открытий.<br>Вся комната — интерфейс.',kicker:'03 / личное пространство',radius:5.6},
  };
  return {
    root,places,walkSurface:made.floor,avatar:explorer,spark,...configs[id],
    update:(time:number)=>{made.animate(time); spark.rotation.y=time*.6; spark.position.y=1.25+Math.sin(time*1.6)*.13;},
    dispose:()=>{
      const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
      root.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line||object instanceof T.Points){geometries.add(object.geometry); for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
      geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
    },
  };
}

