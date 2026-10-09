import * as T from 'three';

type Slot={mesh:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;samples:T.Vector3[];key:string;fade:{value:number}};
type Entry={texture?:T.Texture;pending:boolean;failed:boolean;used:number};

/** Small bounded cache of native normal tiles. The approved albedo stays intact. */
export function createOriginDetail(body:T.Mesh,radius:number,renderer:T.WebGLRenderer,host:HTMLElement,invalidate:()=>void){
  const slots:Slot[]=[],cache=new Map<string,Entry>(),loader=new T.TextureLoader();
  let disposed=false,downloads=0,clock=0;
  let wanted=new Set<string>();
  const grain={value:null as T.Texture|null};let grainRequested=false,grainReady=false;
  function requestGrain(){
    if(grainRequested)return;grainRequested=true;
    void loader.loadAsync('/universe/origin-detail/crystal-grain-v1.webp').then(t=>{
      if(disposed){t.dispose();return;}t.colorSpace=T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
      t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());grain.value=t;grainReady=true;host.dataset.detailGrain='ready';invalidate();
    }).catch(()=>{host.dataset.detailGrain='failed';invalidate();});
  }
  const eye=new T.Vector3(),direction=new T.Vector3(),projected=new T.Vector3();
  const frustum=new T.Frustum(),viewProjection=new T.Matrix4(),localProjection=new T.Matrix4();
  for(let y=0;y<4;y++)for(let x=0;x<8;x++){
    // Offset above the base's triangle chords; equal radii cause interleaved
    // depth strips because the two meshes use different tessellations.
    const geometry=new T.SphereGeometry(radius+.006,48,64,x*Math.PI/4,Math.PI/4,y*Math.PI/4,Math.PI/4);
    const uv=geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+uv.getX(i))/8,(3-y+uv.getY(i))/4);
    const material=new T.MeshStandardMaterial({roughness:.62,metalness:.08,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    material.normalScale.set(.18,.18);
    const fade={value:0},tile={value:new T.Vector2(x,3-y)};
    material.onBeforeCompile=shader=>{
      shader.uniforms.uPatchFade=fade;shader.uniforms.uPatchTile=tile;shader.uniforms.uCrystalGrain=grain;
      shader.vertexShader='varying vec2 vPatchUv;uniform vec2 uPatchTile;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPatchUv=uv*vec2(8.,4.)-uPatchTile;');
      shader.fragmentShader='varying vec2 vPatchUv;uniform float uPatchFade;uniform sampler2D uCrystalGrain;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float crystalGrain=texture2D(uCrystalGrain,vPatchUv*2.).r;
        diffuseColor.rgb*=mix(1.,.28+crystalGrain*1.8,.8);
        float gold=smoothstep(.06,.28,diffuseColor.r-diffuseColor.b);
        float luminous=smoothstep(.42,.9,diffuseColor.r)*gold;
        totalEmissiveRadiance+=diffuseColor.rgb*luminous*.32;
        vec2 border=min(vPatchUv,1.-vPatchUv);
        diffuseColor.a*=uPatchFade*smoothstep(0.,.055,min(border.x,border.y));`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float grainHeight=crystalGrain*.0012;
        vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),r1=cross(q1,normal),r2=cross(normal,q0);
        float det=dot(q0,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(grainHeight)*r1+dFdy(grainHeight)*r2));`);
    };
    const mesh=new T.Mesh(geometry,material);mesh.visible=false;mesh.renderOrder=1;body.add(mesh);
    const samples:T.Vector3[]=[];
    for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){
      const phi=(x+i/8)*Math.PI/4,theta=(y+j/8)*Math.PI/4;
      samples.push(new T.Vector3(-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta)));
    }
    slots.push({mesh,key:`${x}-${y}`,samples,fade});
  }
  function detach(key:string){
    const slot=slots.find(s=>s.key===key)!;slot.mesh.material.normalMap=null;slot.mesh.material.needsUpdate=true;
    cache.get(key)?.texture?.dispose();cache.delete(key);
  }
  function request(slot:Slot,maxCache:number){
    if(cache.has(slot.key)||[...cache.values()].filter(e=>e.pending).length>=2)return;
    if(cache.size>=maxCache){
      const victim=[...cache.entries()].filter(([k,e])=>!wanted.has(k)&&!e.pending&&slots.find(s=>s.key===k)!.fade.value<.002).sort((a,b)=>a[1].used-b[1].used)[0];
      if(!victim)return;detach(victim[0]);
    }
    const entry:Entry={pending:true,failed:false,used:clock};cache.set(slot.key,entry);downloads++;
    void loader.loadAsync(`/universe/origin-detail/${slot.key}.webp`).then(texture=>{
      if(disposed){texture.dispose();return;}
      // Camera may have moved while the (at most two) requests were in flight.
      // Do not upload a now-invisible result to the GPU or let it displace useful tiles.
      if(!wanted.has(slot.key)){texture.dispose();cache.delete(slot.key);invalidate();return;}
      texture.colorSpace=T.NoColorSpace;texture.repeat.set(8,4);
      const [x,y]=slot.key.split('-').map(Number);texture.offset.set(-x,-(3-y));
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      entry.texture=texture;entry.pending=false;slot.mesh.material.normalMap=texture;slot.mesh.material.needsUpdate=true;invalidate();
    }).catch(()=>{entry.pending=false;entry.failed=true;invalidate();});
  }
  return {
    setMap(map:T.Texture){for(const s of slots){s.mesh.material.map=map;s.mesh.material.needsUpdate=true;}},
    update(camera:T.Camera,dt:number,surface:boolean){
      clock++;body.updateWorldMatrix(true,true);camera.updateMatrixWorld();camera.getWorldPosition(eye);body.worldToLocal(eye);
      frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      localProjection.multiplyMatrices(viewProjection,body.matrixWorld);
      const distance=eye.length(),altitude=distance-radius;direction.copy(eye).normalize();
      const mobile=host.clientWidth<700,maxActive=mobile?2:4,maxCache=mobile?4:6;
      // Request only on approach; retain a small LRU cache across threshold crossings.
      const close=!surface&&altitude<3.4;
      const horizon=radius/Math.max(radius,distance);
      const chosen=close?slots.map(slot=>{
        let score=Infinity;
        if(frustum.intersectsObject(slot.mesh))for(const normal of slot.samples){
          // A bounding sphere alone admits hidden-side and off-screen patches.
          if(normal.dot(direction)<=horizon)continue;
          projected.copy(normal).multiplyScalar(radius+.006).applyMatrix4(localProjection);
          if(Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&projected.z>=-1&&projected.z<=1)
            score=Math.min(score,projected.x*projected.x+projected.y*projected.y);
        }
        return {slot,score};
      }).filter(s=>Number.isFinite(s.score)).sort((a,b)=>a.score-b.score).slice(0,maxActive).map(s=>s.slot):[];
      wanted=new Set(chosen.map(s=>s.key));
      if(chosen.length)requestGrain();
      for(const s of chosen){const entry=cache.get(s.key);if(entry)entry.used=clock;else request(s,maxCache);}
      const strength=1-T.MathUtils.smoothstep(altitude,1.1,3.4);let animating=false;
      for(const s of slots){
        const target=grainReady&&wanted.has(s.key)&&cache.get(s.key)?.texture?strength:0;
        s.fade.value=T.MathUtils.damp(s.fade.value,target,7,Math.max(.001,dt));
        if(Math.abs(s.fade.value-target)<.002)s.fade.value=target;else animating=true;
        s.mesh.visible=s.fade.value>.002;
      }
      // Shrink the cache after a viewport change; never drop a visible tile.
      if(cache.size>maxCache){const victim=[...cache.entries()].filter(([k,e])=>!e.pending&&!wanted.has(k)&&slots.find(s=>s.key===k)!.fade.value===0).sort((a,b)=>a[1].used-b[1].used)[0];if(victim)detach(victim[0]);}
      host.dataset.originLod=slots.some(s=>s.mesh.visible)?'detail':'base';
      host.dataset.detailTiles=slots.filter(s=>s.mesh.visible).map(s=>s.key).join(',');
      host.dataset.detailWanted=[...wanted].join(',');
      host.dataset.detailPolicy='visible-front-only';
      host.dataset.detailResident=String([...cache.values()].filter(e=>e.texture).length);
      host.dataset.detailDownloads=String(downloads);host.dataset.detailFailures=String([...cache.values()].filter(e=>e.failed).length);
      host.dataset.detailBlend=strength.toFixed(2);
      return animating||[...cache.values()].some(e=>e.pending);
    },
    dispose(){disposed=true;grain.value?.dispose();for(const e of cache.values())e.texture?.dispose();cache.clear();}
  };
}
