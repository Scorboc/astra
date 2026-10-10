import {Vec3} from 'playcanvas';

// Preserved spatial route from the camera used before the observatory build.
export const WORLDS={origin:{position:[-8,0,0],radius:5.5},aurora:{position:[7,14,-34],radius:4.5},velir:{position:[-7,-1,-68],radius:4.2},nereya:{position:[8,2,-106],radius:4.8},solis:{position:[-4,4,-145],radius:5.8},about:{position:[-16,9,-21],radius:3.2}};
export const OBSERVATORY_POSITION=[-40,-6,-68];
export const OBSERVATORY_ROTATION=Math.PI/2;
const points=[[-1,5,18],[3,6,-9],[15,17,-17],[16,18,-39],[2,3,-51],[3,3,-73],[17,6,-89],[18,6,-111],[6,8,-126],[2,12,-152],[-24,22,-174],[-58,26,-145],[-55,17,-111],[-32,7,-91],[-17.5,-5.35,-68],[-27,1,-48],[-52,19,-38],[-29,12,33],[2,6,45]];
const targets=[[-7,5,-13],[1,12,-31],[5,13,-37],[-4,0,-65],[-6,0,-71],[7,1,-102],[6,1,-109],[-3,4,-141],[-4,4,-148],[-4,4,-145],[-4,4,-143],[-24,5,-102],[-40,3,-68],[-40,2,-68],[-40,2,-68],[-40,3,-68],[-24,5,-48],[-8,1,0],[-8,2,-4]];
export const FLIGHT_PERIOD=points.length/8;
export function wrapFlight(value){const t=(Number.isFinite(value)?value:0)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t;}
export function pointAt(data,t){
 const n=data.length,p=t*n,index=Math.floor(p),u=p-index,get=i=>data[(i%n+n)%n],p0=get(index-1),p1=get(index),p2=get(index+1),p3=get(index+2);
 const interval=(a,b)=>Math.pow(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0),.25);
 let dt0=interval(p0,p1),dt1=interval(p1,p2),dt2=interval(p2,p3);if(dt1<1e-4)dt1=1;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;
 const out=[];for(let i=0;i<3;i++){const x0=p0[i],x1=p1[i],x2=p2[i],x3=p3[i],m1=((x1-x0)/dt0-(x2-x0)/(dt0+dt1)+(x2-x1)/dt1)*dt1,m2=((x2-x1)/dt1-(x3-x1)/(dt1+dt2)+(x3-x2)/dt2)*dt1;out.push(x1+m1*u+(-3*x1+3*x2-2*m1-m2)*u*u+(2*x1-2*x2+m1+m2)*u*u*u);}return new Vec3(...out);
}
const ARC_SAMPLES=2400,arc=[{t:0,length:0}];let arcLength=0,arcLast=pointAt(points,0);
for(let i=1;i<=ARC_SAMPLES;i++){const at=pointAt(points,i/ARC_SAMPLES);arcLength+=at.distance(arcLast);arc.push({t:i/ARC_SAMPLES,length:arcLength});arcLast=at;}
function parameter(value){const distance=wrapFlight(value)/FLIGHT_PERIOD*arcLength;let lo=0,hi=arc.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid].length<distance)lo=mid;else hi=mid;}const a=arc[lo],b=arc[hi];return a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length||1);}
function travelAtNode(index){const target=index/points.length,entry=arc[Math.round(target*ARC_SAMPLES)];return entry.length/arcLength*FLIGHT_PERIOD;}
export const FLIGHT_STOPS=[0,2,4,6,8].map(travelAtNode);
export function flightWorld(value){const t=wrapFlight(value);if(t>FLIGHT_STOPS[4])return 'Возвращение к Истоку';const names=['Исток','Аврора','Велир','Нерея','Солис'];let nearest=0;for(let i=1;i<FLIGHT_STOPS.length;i++)if(Math.abs(t-FLIGHT_STOPS[i])<Math.abs(t-FLIGHT_STOPS[nearest]))nearest=i;return names[nearest];}
function smooth(a,b,value){const x=Math.max(0,Math.min(1,(value-a)/(b-a)));return x*x*(3-2*x);}
export function flightPose(value){const t=parameter(value),node=t*points.length,position=pointAt(points,t),target=pointAt(targets,t);const podiumLock=smooth(11.7,12.7,node)*(1-smooth(15.2,16.2,node));target.lerp(target,new Vec3(-40,2,-68),podiumLock);return {position,target};}
