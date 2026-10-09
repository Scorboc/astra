import { Color, MathUtils } from 'three';

// Saturate existing hues without adding white light or changing their palette.
export function nebulaColor(source:string){
  const color=new Color(source),luma=color.r*.2126+color.g*.7152+color.b*.0722;
  const channel=(v:number)=>MathUtils.clamp(luma+(v-luma)*1.22,0,1);
  return color.setRGB(channel(color.r),channel(color.g),channel(color.b));
}

// Transparent fringes stay transparent; denser cores separate from faint wisps.
export function contrastMist(density:number){
  return Math.min(1,Math.pow(MathUtils.clamp(density,0,1),1.16)*1.17);
}
