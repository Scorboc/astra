import * as T from 'three';

/** Fixed for the lifetime of the scene: never selected by camera or distance. */
export function originTextureWidth(maxTextureSize: number) {
  return [16384, 8192, 4096, 2048].find(width => width <= maxTextureSize) ?? 0;
}

export function configureOriginFullTexture(texture: T.Texture, anisotropy: number) {
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = T.RepeatWrapping;
  texture.anisotropy = Math.min(8, anisotropy);
  // Mips filter subpixel detail, not a camera-triggered download or tile swap.
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
}
