import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { originTextureWidth, configureOriginFullTexture } from '../src/galaxy/origin-full-texture.ts';

test('Istok full atlas selection depends only on device capability',()=>{
  assert.equal(originTextureWidth(32768),16384);
  assert.equal(originTextureWidth(16384),16384);
  assert.equal(originTextureWidth(8192),8192);
  assert.equal(originTextureWidth(4096),4096);
  assert.equal(originTextureWidth(2048),2048);
  assert.equal(originTextureWidth(1024),0);
});
test('Istok full atlas preserves sRGB and stable mip filtering',()=>{
  const texture=new T.Texture();configureOriginFullTexture(texture,16);
  assert.equal(texture.colorSpace,T.SRGBColorSpace);
  assert.equal(texture.wrapS,T.RepeatWrapping);
  assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);
  assert.equal(texture.generateMipmaps,true);assert.equal(texture.anisotropy,8);
});
test('Istok is excluded from the camera-selected tile manager',()=>{
  const source=readFileSync(new URL('../src/galaxy/universe.ts',import.meta.url),'utf8');
  assert.match(source,/createPlanetColorDetail\(planets\.filter\(p=>p\.id!=='origin'\)/);
  assert.match(source,/full\.onUpdate/);
  assert.match(source,/failed-preview-retained/);
});
test('delivered JPEG files contain the declared pixel dimensions',()=>{
  for(const width of [16384,8192,4096,2048]){
    const bytes=readFileSync(new URL(`../public/universe/origin-moon-v1-${width}.jpg`,import.meta.url));
    assert.equal(bytes.readUInt16BE(0),0xffd8);
    let position=2,found=false;
    while(position<bytes.length){
      assert.equal(bytes[position++],0xff);
      const marker=bytes[position++],length=bytes.readUInt16BE(position);
      if(marker===0xc0||marker===0xc2){
        assert.equal(bytes.readUInt16BE(position+3),width/2);
        assert.equal(bytes.readUInt16BE(position+5),width);found=true;break;
      }
      position+=length;
    }
    assert.ok(found,'JPEG frame header must exist');
  }
});
