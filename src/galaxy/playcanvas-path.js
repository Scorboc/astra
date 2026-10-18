import {Vec3} from 'playcanvas';
import {LIVE_CASTLE_CENTER as CASTLE_CENTER,LIVE_CASTLE_EYE,LIVE_CASTLE_AIM,LIVE_CASTLE_RADIUS as CASTLE_CLOSE_RADIUS,LIVE_CASTLE_PHONE_RADIUS as CASTLE_PHONE_RADIUS} from './castle-live-model.ts';

// Preserved spatial route from the camera used before the observatory build.
export const WORLDS={origin:{position:[-8,0,0],radius:5.5},aurora:{position:[7,14,-34],radius:4.5},velir:{position:[-7,-1,-68],radius:4.2},nereya:{position:[8,2,-106],radius:4.8},solis:{position:[-4,4,-145],radius:5.8},about:{position:[-16,9,-21],radius:3.2}};
export const OBSERVATORY_POSITION=[-40,-6,-68];
export const OBSERVATORY_ROTATION=Math.PI/2;
// Nodes 0..10 (all five planets) retain their previous positions and targets.
// Only the return through the observatory is moved in front of the rendered arc.
const points=[[-1,5,18],[3,6,-9],[15,17,-17],[16,18,-39],[2,3,-51],[3,3,-73],[17,6,-89],[18,6,-111],[6,8,-126],[2,12,-152],[-24,22,-174],[-45,12,-140],[9,-12,-104],[-9,-6.5,-86],[-17.5,-4.6,-68],[-15,-5.6,-56],[9,-12,-32],[-29,12,33],[2,6,45]];
const targets=[[-7,5,-13],[1,12,-31],[5,13,-37],[-4,0,-65],[-6,0,-71],[7,1,-102],[6,1,-109],[-3,4,-141],[-4,4,-148],[-4,4,-145],[-4,4,-143],[-24,5,-102],[...CASTLE_CENTER],[...CASTLE_CENTER],[...CASTLE_CENTER],[...CASTLE_CENTER],[-24,5,-48],[-8,1,0],[-8,2,-4]];
export const FLIGHT_PERIOD=points.length/8;
export function wrapFlight(value){const t=(Number.isFinite(value)?value:0)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t;}
export function pointAt(data,t){
 const n=data.length,p=t*n,index=Math.floor(p),u=p-index,get=i=>data[(i%n+n)%n],p0=get(index-1),p1=get(index),p2=get(index+1),p3=get(index+2);
 const interval=(a,b)=>Math.pow(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0),.25);
 let dt0=interval(p0,p1),dt1=interval(p1,p2),dt2=interval(p2,p3);if(dt1<1e-4)dt1=1;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;
 const out=[];for(let i=0;i<3;i++){const x0=p0[i],x1=p1[i],x2=p2[i],x3=p3[i],m1=((x1-x0)/dt0-(x2-x0)/(dt0+dt1)+(x2-x1)/dt1)*dt1,m2=((x2-x1)/dt1-(x3-x1)/(dt1+dt2)+(x3-x2)/dt2)*dt1;out.push(x1+m1*u+(-3*x1+3*x2-2*m1-m2)*u*u+(2*x1-2*x2+m1+m2)*u*u*u);}return new Vec3(...out);
}
function smooth(a,b,value){const x=Math.max(0,Math.min(1,(value-a)/(b-a)));return x*x*(3-2*x);}
function routePosition(t,compact){
 const position=pointAt(points,t),node=t*points.length;
 const weight=smooth(11.2,12,node)*(1-smooth(16,17,node));
 if(weight){
  const x=position.x-CASTLE_CENTER[0],z=position.z-CASTLE_CENTER[2],r=Math.hypot(x,z);
  const minimum=compact?CASTLE_PHONE_RADIUS:CASTLE_CLOSE_RADIUS;
  const radius=r+(Math.max(r,minimum)-r)*weight;
  const angle=Math.atan2(z,x);
  // A portrait-safe distance puts Velir between the eye and the frontal castle.
  // A narrower, off-axis pass avoids a showcase orbit. Both use existing views.
  const passingAngle=compact?angle*.2+24*Math.PI/180:angle*.6;
  const viewAngle=angle+(passingAngle-angle)*weight;
  position.x=CASTLE_CENTER[0]+Math.cos(viewAngle)*radius;position.z=CASTLE_CENTER[2]+Math.sin(viewAngle)*radius;
  // A real floor has depth: keep the eye above the bridge, never below it as
  // the former distant-image capture cone did on the compact rail.
  const y=LIVE_CASTLE_EYE;
  position.y+=(y-position.y)*weight;
 }
 // Preserve the previous phone rail's 1.5-unit safety offset at the planets.
 // Fade it out only inside the calibrated castle section.
 if(compact)position.z+=1.5*(1-weight);
 // Only the observatory detour needs renewed clearance after raising its eye
 // above the real bridge. Preserve all original planet stops and the first view.
 const clearance=smooth(10.5,11.2,node)*(1-smooth(17,17.5,node));
 if(clearance)for(const [id,world] of Object.entries(WORLDS))if(id!=='about'){
  const away=position.clone().sub(new Vec3(...world.position)),distance=away.length(),minimum=world.radius+1.6;
  if(distance<minimum+1&&distance>.00001){const safe=distance<=minimum-1?minimum:minimum+(distance-minimum+1)**2/4;position.add(away.mulScalar((safe-distance)/distance*clearance));}
 }
 return position;
}
const ARC_SAMPLES=3600;
function makeArc(compact){const samples=[{t:0,length:0}];let length=0,last=routePosition(0,compact);for(let i=1;i<=ARC_SAMPLES;i++){const at=routePosition(i/ARC_SAMPLES,compact);length+=at.distance(last);samples.push({t:i/ARC_SAMPLES,length});last=at;}return {samples,length};}
const arcs=[makeArc(false),makeArc(true)];
const ENTRY_NODE=10.2,HERO_NODE=12.5,EXIT_NODE=15.5,RETURN_NODE=18.1;
function boundaryShot(node,compact){const t=node/points.length,position=routePosition(t,compact),direction=pointAt(targets,t).sub(position),distance=direction.length();return {direction:direction.normalize(),distance};}
const shots=[false,true].map(compact=>({entry:boundaryShot(ENTRY_NODE,compact),exit:boundaryShot(RETURN_NODE,compact),
 entryTravel:flightAtNode(ENTRY_NODE,compact),heroTravel:flightAtNode(HERO_NODE,compact),exitTravel:flightAtNode(EXIT_NODE,compact),returnTravel:flightAtNode(RETURN_NODE,compact)}));
function parameter(value,compact){const {samples:arc,length}=arcs[compact?1:0],distance=wrapFlight(value)/FLIGHT_PERIOD*length;let lo=0,hi=arc.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid].length<distance)lo=mid;else hi=mid;}const a=arc[lo],b=arc[hi];return a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length||1);}
export function flightAtNode(index,compact=false){const {samples:arc,length}=arcs[compact?1:0],at=index/points.length*ARC_SAMPLES,lo=Math.floor(at),a=arc[lo],b=arc[Math.min(lo+1,arc.length-1)];return (a.length+(b.length-a.length)*(at-lo))/length*FLIGHT_PERIOD;}
export function flightStops(compact=false){return [0,2,4,6,8].map(i=>flightAtNode(i,compact));}
export const FLIGHT_STOPS=flightStops();
export function flightWorld(value,compact=false){const stops=flightStops(compact),t=wrapFlight(value);if(t>stops[4])return 'Возвращение к Истоку';const names=['Исток','Аврора','Велир','Нерея','Солис'];let nearest=0;for(let i=1;i<stops.length;i++)if(Math.abs(t-stops[i])<Math.abs(t-stops[nearest]))nearest=i;return names[nearest];}
export function flightPose(value,compact=false){
 const t=parameter(value,compact),node=t*points.length,position=routePosition(t,compact),target=pointAt(targets,t);
 // A short dolly shot, not an orbit with the building mechanically pinned to
 // the crosshair. A stable world heading lets it enter and leave the frame.
 const heading=compact?24*Math.PI/180:0;
 if(node>ENTRY_NODE&&node<RETURN_NODE){
  const shot=new Vec3(-Math.cos(heading),(LIVE_CASTLE_AIM-LIVE_CASTLE_EYE)/(compact?CASTLE_PHONE_RADIUS:CASTLE_CLOSE_RADIUS),-Math.sin(heading)).normalize(),boundary=shots[compact?1:0];
  // Rotation is eased over physical travel too. Node indices compress on the
  // phone's wide-radius arc and would otherwise produce a sudden head turn.
  const leaving=node>EXIT_NODE,at=wrapFlight(value);
  const framing=leaving?smooth(boundary.exitTravel,boundary.returnTravel,at):smooth(boundary.entryTravel,boundary.heroTravel,at);
  const from=leaving?shot:boundary.entry.direction,to=leaving?boundary.exit.direction:shot;
  const distance=leaving?60:boundary.entry.distance,endDistance=leaving?boundary.exit.distance:60;
  const angle=Math.acos(Math.max(-1,Math.min(1,from.dot(to)))),sine=Math.sin(angle);
  let forward;
  if(angle<.0001)forward=from.clone().lerp(from,to,framing).normalize();
  else if(Math.abs(sine)<.0001){const tangent=new Vec3(-from.z,0,from.x);if(tangent.length()<.0001)tangent.set(1,0,0);tangent.normalize();forward=from.clone().mulScalar(Math.cos(Math.PI*framing)).add(tangent.mulScalar(Math.sin(Math.PI*framing)));}
  else forward=from.clone().mulScalar(Math.sin((1-framing)*angle)/sine).add(to.clone().mulScalar(Math.sin(framing*angle)/sine));
  target.copy(position).add(forward.mulScalar(distance+(endDistance-distance)*framing));
 }
 return {position,target};
}
