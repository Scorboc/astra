import {Vec3} from 'playcanvas';
// Same physical coordinates and centripetal curve as the preserved renderer.
export const WORLDS={origin:{position:[-8,0,0],radius:5.5},aurora:{position:[7,14,-34],radius:4.5},velir:{position:[-7,-1,-68],radius:4.2},nereya:{position:[8,2,-106],radius:4.8},solis:{position:[-4,4,-145],radius:5.8},about:{position:[-16,9,-21],radius:3.2}};

// Place the observatory opposite Velir, directly on the nebula fold.
export const OBSERVATORY_POSITION=[-40,-6,-68];
export const OBSERVATORY_ROTATION=Math.PI/2;
// The return arc passes in front of the observatory at podest height, so the
// pink envelope and black reflection are readable while the camera goes by.
const points=[[-1,5,18],[22,10,-10],[28,16,-34],[28,10,-68],[28,8,-106],[25,10,-145],[20,12,-174],[-6,12,-188],[-29,10,-166],[-25,5,-123],[-12,-1,-95],[-12,-4.5,-68],[-18,-5.35,-68],[-6,-3,-56],[-7,4,-35],[15,8,8],[15,7,36]];
const targets=[[-7,5,-13],[0,8,-26],[7,14,-34],[-7,-1,-68],[8,2,-106],[-4,4,-145],[-4,4,-145],[-4,4,-145],[-13,4,-125],[-33,2,-81],[-40,1,-68],[-40,2,-68],[-40,2,-68],[-40,2,-68],[-8,1,0],[-8,2,0],[-7,5,-13]];
export const FLIGHT_PERIOD=2.8;
export function wrapFlight(value){const t=(Number.isFinite(value)?value:0)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t;}
export function flightWorld(value){const t=parameter(value,false)*points.length;return t>=9&&t<=13?'Обсерватория':t>5?'Возвращение к Истоку':['Исток','Исток','Аврора','Велир','Нерея','Солис'][Math.min(5,Math.round(t))];}
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
const tables=new Map();
function rail(compact){if(tables.has(compact))return tables.get(compact);const p=points.map(v=>[...v]);if(compact){p[0]=[3.5,8.2,29.6];for(let i=1;i<=5;i++)p[i][0]+=14;}const samples=[{t:0,length:0}],n=1600;let length=0,last=pointAt(p,0);for(let i=1;i<=n;i++){const at=pointAt(p,i/n);length+=at.distance(last);samples.push({t:i/n,length});last=at;}const result={points:p,samples,length};tables.set(compact,result);return result;}
function parameter(value,compact){const r=rail(compact),d=wrapFlight(value)/FLIGHT_PERIOD*r.length;let lo=0,hi=r.samples.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(r.samples[m].length<d)lo=m;else hi=m;}const a=r.samples[lo],b=r.samples[hi];return a.t+(b.t-a.t)*(d-a.length)/(b.length-a.length||1);}
export function flightAtNode(index,compact=false){const r=rail(compact),a=r.samples[Math.round(index/points.length*1600)];return a.length/r.length*FLIGHT_PERIOD;}
export function flightPose(value,compact=false){const t=parameter(value,compact),position=pointAt(rail(compact).points,t);position.y=Math.max(-5.5,position.y);return {position,target:pointAt(targets,t)};}


export const FLIGHT_STOPS=[0,2,3,4,5].map(i=>flightAtNode(i));
