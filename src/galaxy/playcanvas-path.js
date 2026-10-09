import {Vec3} from 'playcanvas';
// Same physical coordinates and centripetal curve as the preserved renderer.
export const WORLDS={origin:{position:[-8,0,0],radius:5.5},aurora:{position:[7,14,-34],radius:4.5},velir:{position:[-7,-1,-68],radius:4.2},nereya:{position:[8,2,-106],radius:4.8},solis:{position:[-4,4,-145],radius:5.8},about:{position:[-16,9,-21],radius:3.2}};
export const FLIGHT_STOPS=[0,.25,.5,.75,1];
// Place the observatory opposite Velir, directly on the nebula fold.
export const OBSERVATORY_POSITION=[-40,-6,-68];
export const OBSERVATORY_ROTATION=Math.PI/2;
// The return arc passes in front of the observatory at podest height, so the
// pink envelope and black reflection are readable while the camera goes by.
const points=[[-1,5,18],[3,6,-9],[15,17,-17],[16,17,-39],[2,6,-51],[3,5,-73],[17,6,-89],[18,6,-111],[6,8,-126],[2,12,-152],[-24,22,-174],[-58,26,-145],[-62,16,-113],[-14,4,-68],[-52,10,-45],[-29,12,33],[2,6,45]];
const targets=[[-7,5,-13],[1,12,-31],[5,13,-37],[-4,0,-65],[-6,0,-71],[7,1,-102],[6,1,-109],[-3,4,-141],[-4,4,-148],[-4,4,-145],[-4,4,-143],[-32,3,-82],[-40,3,-68],[-40,0,-68],[-25,3,-65],[-8,1,0],[-8,2,-4]];
export const FLIGHT_PERIOD=points.length/8;
export function wrapFlight(value){const t=(Number.isFinite(value)?value:0)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t;}
export function flightWorld(value){const t=wrapFlight(value);return t>1?'Возвращение к Истоку':['Исток','Аврора','Велир','Нерея','Солис'][Math.min(4,Math.round(t*4))];}
export function pointAt(data,t,closed=true){
 const n=data.length,p=t*(closed?n:n-1);let index=Math.floor(p),u=p-index;if(!closed&&index===n-1){index=n-2;u=1;}
 const get=i=>closed?data[(i%n+n)%n]:i<0?data[0].map((x,j)=>2*x-data[1][j]):i>=n?data[n-1].map((x,j)=>2*x-data[n-2][j]):data[i],p0=get(index-1),p1=get(index),p2=get(index+1),p3=get(index+2);
 const interval=(a,b)=>Math.pow(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0),.25);
 let dt0=interval(p0,p1),dt1=interval(p1,p2),dt2=interval(p2,p3);if(dt1<1e-4)dt1=1;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;
 const out=[];for(let i=0;i<3;i++){
  const x0=p0[i],x1=p1[i],x2=p2[i],x3=p3[i];
  const m1=((x1-x0)/dt0-(x2-x0)/(dt0+dt1)+(x2-x1)/dt1)*dt1;
  const m2=((x2-x1)/dt1-(x3-x1)/(dt1+dt2)+(x3-x2)/dt2)*dt1;
  out.push(x1+m1*u+(-3*x1+3*x2-2*m1-m2)*u*u+(2*x1-2*x2+m1+m2)*u*u*u);
 }return new Vec3(...out);
}
export function flightPose(value){const t=wrapFlight(value)/FLIGHT_PERIOD;return {position:pointAt(points,t),target:pointAt(targets,t)};}
