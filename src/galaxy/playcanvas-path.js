import {Vec3} from 'playcanvas';
import {LIVE_CASTLE_EYE} from './castle-live-model.ts';

// The approved Origin -> Aurora passage and all scene objects stay in place.
export const WORLDS={origin:{position:[-8,0,0],radius:5.5},aurora:{position:[7,14,-34],radius:4.5},velir:{position:[-7,-1,-68],radius:4.2},nereya:{position:[8,2,-106],radius:4.8},solis:{position:[-4,4,-145],radius:5.8},about:{position:[-16,9,-21],radius:3.2}};
export const OBSERVATORY_POSITION=[-40,-6,-68];
export const OBSERVATORY_ROTATION=Math.PI/2;
// Knots 20,0,1,2,3 are the exact geometric support of the approved passage.
// Later planets have approach/reveal/departure shots, not alternating sideways
// dives. Immediately after the Solis reveal one bend leads to the castle.
const points=[[-1,5,18],[6,9,-1],[15,17,-17],[18,16,-39],[4,9,-46],[10,6,-66],[16,5,-82],[19,7,-104],[7,7,-120],[-18,10,-126],[-30,5,-107],[-28,1,-102],[-22,0,-97],[-18,-2,-91],[-16,-3.5,-82],[-16,LIVE_CASTLE_EYE,-68],[-18,-2.8,-45],[-40,2,-6],[-33,7,24],[-13,8,40],[0,6,40]];
const phonePoints=points.map(p=>[p[0],p[1],p[2]+1.5]);
// Portrait framing uses a distant southeast castle view, on the actual route
// from Solis. It no longer detours through the entire east side of the galaxy.
// The portrait reveal stays farther back, then the actual rail crosses the
// same bridge axis in front of its end, rather than passing Nereya/Velir.
for(const [index,p] of [[7,[25,10,-105]],[8,[18,15,-130]],[9,[-6,14,-141]],[10,[-14,10,-124]],[11,[-20,7,-116]],[12,[-22,4,-110]],[13,[-19,1,-106]],[14,[-16,-2,-102]],[15,[-14,LIVE_CASTLE_EYE,-96]],[16,[-14,LIVE_CASTLE_EYE,-68]],[17,[-24,2,-14]]])phonePoints[index]=p;
// Authored gaze, not a lookAt lock: planets pass through the composition and
// the castle does not swivel with the camera. Unwrapped yaw makes the loop
// cross -180/180 without a sudden turn; pitch never tilts the horizon sideways.
const yaw=[-Math.atan2(6,31)*180/Math.PI,-15,-24,-32,-26.6,-8,-18,-25,-44,-144,-166,-160.6,-148.2,-136.3,-120.3,-90,-43.7,80,46,8,-11];
const pitch=[0,-8,-9,-20,-22,-5,-7,-6,-6,-8,-7,-1.7,0,3.5,7.1,14,4.9,-4,-11,-10,-5];
const phoneYaw=[...yaw],phonePitch=[...pitch];
for(const [i,y,p] of [[7,-36,-8],[8,-56,-23],[9,-155,-10],[10,-155.1,-9.3],[11,-157.4,-7.7],[12,-156.8,-5.1],[13,-151.1,-1.4],[14,-144.8,2.7],[15,-137.1,10],[16,-90,14],[17,-220,-5],[18,-316,-11],[19,-352,-10],[20,-371,-5]]){phoneYaw[i]=y;phonePitch[i]=p;}
// Frozen angular derivatives in radians / scene-unit from 412e6ef. Keeping
// only the old knot values is insufficient: editing knot 3 or the return would
// otherwise alter the Hermite tangents of the already-approved first passage.
const approvedPrefixRates=[{"yaw":[-0.001614232726732691,-0.005569089410073828,-0.004881312823928736],"pitch":[-0.0012107409512750486,-0.003841947547707401,-0.0024406387761600483]},{"yaw":[-0.0016142263943062147,-0.005569091828195031,-0.004881315709401856],"pitch":[-0.001210742748587941,-0.0038419492336059656,-0.00244063848050581]}];
export const FLIGHT_PERIOD=points.length/8;
export function wrapFlight(value){const t=(Number.isFinite(value)?value:0)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t;}
export function pointAt(data,t){
 const n=data.length,p=t*n,index=Math.floor(p),u=p-index,get=i=>data[(i%n+n)%n],p0=get(index-1),p1=get(index),p2=get(index+1),p3=get(index+2);
 const interval=(a,b)=>Math.pow(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0),.25);
 let dt0=interval(p0,p1),dt1=interval(p1,p2),dt2=interval(p2,p3);if(dt1<1e-4)dt1=1;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;
 const out=[];for(let i=0;i<3;i++){const x0=p0[i],x1=p1[i],x2=p2[i],x3=p3[i],m1=((x1-x0)/dt0-(x2-x0)/(dt0+dt1)+(x2-x1)/dt1)*dt1,m2=((x2-x1)/dt1-(x3-x1)/(dt1+dt2)+(x3-x2)/dt2)*dt1;out.push(x1+m1*u+(-3*x1+3*x2-2*m1-m2)*u*u+(2*x1-2*x2+m1+m2)*u*u*u);}return new Vec3(...out);
}
function routePosition(t,compact){
 return pointAt(compact?phonePoints:points,t);
}
const ARC_SAMPLES=3600;
function makeArc(compact){const samples=[{t:0,length:0}];let length=0,last=routePosition(0,compact);for(let i=1;i<=ARC_SAMPLES;i++){const at=routePosition(i/ARC_SAMPLES,compact);length+=at.distance(last);samples.push({t:i/ARC_SAMPLES,length});last=at;}return {samples,length};}
const arcs=[makeArc(false),makeArc(true)];
function parameter(value,compact){const {samples:arc,length}=arcs[compact?1:0],distance=wrapFlight(value)/FLIGHT_PERIOD*length;let lo=0,hi=arc.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid].length<distance)lo=mid;else hi=mid;}const a=arc[lo],b=arc[hi];return a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length||1);}
export const flightLength=(compact=false)=>arcs[compact?1:0].length;
export const flightSpeed=(compact=false)=>14/flightLength(compact)*FLIGHT_PERIOD;
export function flightAtNode(index,compact=false){const {samples:arc,length}=arcs[compact?1:0],at=index/points.length*ARC_SAMPLES,lo=Math.floor(at),a=arc[lo],b=arc[Math.min(lo+1,arc.length-1)];return (a.length+(b.length-a.length)*(at-lo))/length*FLIGHT_PERIOD;}
const nodeTravel=[false,true].map(c=>points.map((_,i)=>flightAtNode(i,c)));
export function flightStops(compact=false){return [0,2,4,6,8].map(i=>flightAtNode(i,compact));}
export const FLIGHT_STOPS=flightStops();
export function flightWorld(value,compact=false){const stops=flightStops(compact),t=wrapFlight(value);if(t>stops[4])return 'Возвращение к Истоку';const names=['Исток','Аврора','Велир','Нерея','Солис'];let nearest=0;for(let i=1;i<stops.length;i++)if(Math.abs(t-stops[i])<Math.abs(t-stops[nearest]))nearest=i;return names[nearest];}
export function flightPose(value,compact=false){
 const t=parameter(value,compact),position=routePosition(t,compact);
 const angle=(data,turn,axis)=>{const n=data.length,i=Math.min(n-1,Math.floor(t*n)),at=nodeTravel[compact?1:0],time=j=>at[(j%n+n)%n]+Math.floor(j/n)*FLIGHT_PERIOD,get=j=>data[(j%n+n)%n]+Math.floor(j/n)*turn;
  const span=time(i+1)-time(i),u=(wrapFlight(value)-time(i))/span;
  const tangent=j=>{const fixed=approvedPrefixRates[compact?1:0][axis][(j%n+n)%n];return fixed===undefined?(get(j+1)-get(j-1))/(time(j+1)-time(j-1))*span:fixed*flightLength(compact)/FLIGHT_PERIOD*span*180/Math.PI;};
  const b=get(i),c=get(i+1),m=tangent(i),k=tangent(i+1);
  return (b+m*u+(-3*b+3*c-2*m-k)*u*u+(2*b-2*c+m+k)*u*u*u)*Math.PI/180;};
 const y=angle(compact?phoneYaw:yaw,compact?-360:0,'yaw'),p=angle(compact?phonePitch:pitch,0,'pitch'),cos=Math.cos(p);
 const target=position.clone().add(new Vec3(Math.sin(y)*cos,Math.sin(p),-Math.cos(y)*cos).mulScalar(32));
 const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
 const at=wrapFlight(value),wide=smooth(flightAtNode(13.2,compact),flightAtNode(14.5,compact),at)*(1-smooth(flightAtNode(15.7,compact),flightAtNode(16.8,compact),at));
 // The bridge end is close to the eye: a gradual wider lens keeps both its
 // reflection and the spires in frame. The original first-view lens is intact.
 return {position,target,fov:compact?58:48+10*wide};
}
