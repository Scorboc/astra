export const compactViewport=(width,height)=>Math.min(width,height)<700;
export const clampDistance=(distance,min,max)=>Math.max(min,Math.min(max,distance));
// Phones get 2048 everywhere; desktops get 4096 (quality checked: q60 4096 ≈ q85 4096 at screen size).
export const detailSize=(compact)=>compact?2048:4096;
export const originTextureSize=(compact,maxSize)=>compact?2048:maxSize>=4096?4096:2048;
// First view gets a lighter Origin map; the full size loads only when the camera approaches Origin.
export const originPreviewSize=(compact,maxSize)=>Math.min(compact?2048:4096,originTextureSize(compact,maxSize));
