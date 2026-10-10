const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Single authoritative travel coordinate: no independent XYZ chase camera.
export function advanceTravel(current,destination,velocity,dt){
 const delta=clamp(dt,0,.05),gap=destination-current;
 if(Math.abs(gap)<.00002)return {travel:destination,velocity:0};
 if(gap*velocity<0)velocity=0;
 const wanted=clamp(gap*18,-.12,.12);
 velocity+=(wanted-velocity)*(1-Math.exp(-delta*24));
 let step=velocity*delta;
 if(Math.sign(step)===Math.sign(gap)&&Math.abs(step)>Math.abs(gap)){step=gap;velocity=0;}
 if(Math.abs(gap)<.00002&&Math.abs(velocity)<.0002)return {travel:destination,velocity:0};
 return {travel:current+step,velocity};
}
export function gestureAxis(dx,dy){return Math.abs(dx)>Math.abs(dy)*1.2?'look':'travel';}
// Retain a requested step even while heading restoration holds velocity at zero.
export function settleTravel(current,destination,velocity){
 const gap=destination-current;
 return current+Math.sign(gap)*Math.min(Math.abs(gap),Math.max(Math.abs(velocity)*.08,.025));
}
