/** Texture density at the centre of a projected spherical surface.
 * An equirectangular map needs about pi * physical diameter texels there.
 * Near the ground, use a local repeating material rather than a huge atlas.
 */
export function atlasWidthForDiameter(cssDiameter:number,pixelRatio:number){
  if(!Number.isFinite(cssDiameter)||!Number.isFinite(pixelRatio)||cssDiameter<=0||pixelRatio<=0)return 1024;
  const needed=Math.PI*cssDiameter*pixelRatio;
  return 2**Math.ceil(Math.log2(Math.max(1024,needed)));
}
export function renderPixelRatio(width:number,height:number,deviceRatio:number){
  if(width<=0||height<=0)return 1;
  return Math.max(1,Math.min(Math.max(deviceRatio,1.5),2,Math.sqrt(3_000_000/(width*height))));
}
export function localSurfaceTexels(mapWidth:number,repeatsPerUnit:number){
  return mapWidth*repeatsPerUnit;
}
function lattice(x:number,y:number,z:number){
  let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
function smoothNoise(x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const ease=(f:number)=>f*f*(3-2*f),fx=ease(x-ix),fy=ease(y-iy),fz=ease(z-iz);
  const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
  return mix(mix(mix(lattice(ix,iy,iz),lattice(ix+1,iy,iz),fx),mix(lattice(ix,iy+1,iz),lattice(ix+1,iy+1,iz),fx),fy),mix(mix(lattice(ix,iy,iz+1),lattice(ix+1,iy,iz+1),fx),mix(lattice(ix,iy+1,iz+1),lattice(ix+1,iy+1,iz+1),fx),fy),fz);
}
export function rockRelief(x:number,y:number,z:number,land:number){
  return Math.max(0,Math.min(1,land))*(.02+.075*smoothNoise(x*3.5,y*3.5,z*3.5)+.022*smoothNoise(x*7,y*7,z*7));
}
