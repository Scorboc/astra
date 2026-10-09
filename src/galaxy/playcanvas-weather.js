import {Vec3} from 'playcanvas';
import {pointAt} from './playcanvas-path.js';
const points=[[4,-3,-10],[18,2,-28],[8,-8,-49],[-20,-6,-73],[-7,-10,-93],[22,-6,-112],[15,4,-140],[2,12,-164]];
export const STORM_CLUSTERS=[.015,.105,.25,.325,.49,.61,.735,.86,.975];
export const MIST_SHAPES=[[17,3,.018,.30,.24],[4,6,.008,.40,-.72],[9,3.8,.025,.22,.85],[23,4.8,.043,.34,-.35],[5.5,2.5,.011,.26,1.12],[13,8,.032,.38,.52],[7,5.5,.016,.24,-1.04],[19,2.4,.038,.29,-.18],[3.8,4.6,.007,.36,.69]];
export const SERPENT_SPIRALS=[{from:.08,to:.25,turns:1.5,radius:2.7},{from:.42,to:.61,turns:1.8,radius:3.5},{from:.76,to:.94,turns:1.4,radius:2.9}];
export const asteroidPoint=t=>pointAt(points,Math.max(0,Math.min(1,t)),false);
const lengths=[0];let previous=asteroidPoint(0);
for(let i=1;i<=200;i++){const next=asteroidPoint(i/200);lengths.push(lengths[i-1]+previous.distance(next));previous=next;}
export const ASTEROID_LENGTH=lengths[200];
export function arcParameter(u){const distance=Math.max(0,Math.min(1,u))*ASTEROID_LENGTH;let lo=0,hi=200;while(lo<=hi){const mid=(lo+hi)>>1;if(lengths[mid]<distance)lo=mid+1;else if(lengths[mid]>distance)hi=mid-1;else return mid/200;}const i=Math.max(0,hi);return (i+(distance-lengths[i])/(lengths[i+1]-lengths[i]))/200;}
export const asteroidPointAt=u=>asteroidPoint(arcParameter(u));
export function serpentSpiralPose(u,phase=0){const center=asteroidPointAt(u),section=SERPENT_SPIRALS.find(s=>u>=s.from&&u<=s.to);if(!section)return {position:center,weight:0};const local=(u-section.from)/(section.to-section.from),weight=Math.sin(Math.PI*local)**2,t=arcParameter(u),tangent=asteroidPoint(Math.min(1,t+.0001)).sub(asteroidPoint(Math.max(0,t-.0001))).normalize(),side=new Vec3().cross(tangent,new Vec3(0,1,0)).normalize(),up=new Vec3().cross(side,tangent).normalize(),angle=local*Math.PI*2*section.turns+phase,radius=section.radius*weight;return {position:center.add(side.mulScalar(Math.cos(angle)*radius)).add(up.mulScalar(Math.sin(angle)*radius)),weight};}
export function asteroidMistDensity(t){let density=.055;for(let i=0;i<STORM_CLUSTERS.length;i++){const offset=(t-STORM_CLUSTERS[i])/MIST_SHAPES[i][2];density+=Math.exp(-offset*offset)*(.48+(i%4)*.16);}return Math.min(1,density);}
export function createFlashSchedule(random=Math.random,offset=0){const gap=()=>2+random()*4;let start=gap()+offset,event=0;return {sample(time){while(time>=start+1){start+=1+gap();event++;}const age=time-start;return {event,start,pulse:age>=0&&age<1?Math.sin(Math.PI*age)**2:0};}};}
