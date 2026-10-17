export const compactViewport=(width,height)=>Math.min(width,height)<700;
export const clampDistance=(distance,min,max)=>Math.max(min,Math.min(max,distance));
export const originTextureSize=(_compact,maxSize)=>maxSize>=4096?4096:2048;
// First view gets a lighter Origin map; the full size loads only when the camera approaches Origin.
export const originPreviewSize=(compact,maxSize)=>Math.min(compact?2048:4096,originTextureSize(compact,maxSize));
