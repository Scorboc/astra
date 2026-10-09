// Planar reflection of the actual scene, not a baked image of the building.
// The mirror has its own layer and is excluded from its camera to avoid recursion.
export function createObservatoryMirror(pc,app,device,station,mainCamera,effectsLayer){
 const rebuiltMeshes=[];
 // Remove the old opaque horizontal caps underneath the replacement deck.
 for(const render of station.findComponents('render'))for(const instance of render.meshInstances){if(instance.node.name!=='Titanium')continue;const p=[],n=[],source=[];instance.mesh.getPositions(p);instance.mesh.getNormals(n);instance.mesh.getIndices(source);const keep=[];for(let i=0;i<source.length;i+=3){const a=source[i]*3,b=source[i+1]*3,c=source[i+2]*3,flat=Math.abs(p[a+1]-p[b+1])<1e-5&&Math.abs(p[a+1]-p[c+1])<1e-5,ny=(p[b+2]-p[a+2])*(p[c]-p[a])-(p[b]-p[a])*(p[c+2]-p[a+2]);if(flat&&p[a+1]<=.28&&ny>0)continue;keep.push(source[i],source[i+1],source[i+2]);}if(keep.length<source.length){const mesh=new pc.Mesh(device);mesh.setPositions(p);mesh.setNormals(n);mesh.setIndices(keep);mesh.update();instance.mesh=mesh;rebuiltMeshes.push(mesh);}}
 for(const render of station.findComponents('render'))if(render.meshInstances.some(instance=>instance.node.name==='Floor'||instance.material.name==='Floor'||instance.material.name==='ASTRA black translucent floor'))render.entity.removeComponent('render');
 for(const render of station.findComponents('render'))for(const instance of render.meshInstances){if(!['Silver','Champagne'].includes(instance.node.name))continue;const p=[],n=[],source=[],keep=[];instance.mesh.getPositions(p);instance.mesh.getNormals(n);instance.mesh.getIndices(source);for(let i=0;i<source.length;i+=3){const v=source.slice(i,i+3);if(v.every(j=>p[j*3+1]<.235&&p[j*3+2]>3.8&&Math.abs(p[j*3])<4.55))continue;keep.push(...v);}if(keep.length<source.length){const replacement=new pc.Mesh(device);replacement.setPositions(p);replacement.setNormals(n);replacement.setIndices(keep);replacement.update();instance.mesh=replacement;rebuiltMeshes.push(replacement);}}
 const material=new pc.ShaderMaterial({uniqueName:'astra-black-reflective-podium',attributes:{aPosition:pc.SEMANTIC_POSITION},vertexGLSL:'attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;uniform mat4 reflectionViewProjection;varying vec4 reflected;void main(){vec4 world=matrix_model*vec4(aPosition,1.);reflected=reflectionViewProjection*world;gl_Position=matrix_viewProjection*world;}',fragmentGLSL:'varying vec4 reflected;uniform sampler2D reflectionMap;void main(){vec2 uv=reflected.xy/max(reflected.w,.0001)*.5+.5;float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.)*step(.001,reflected.w);vec3 reflection=texture2D(reflectionMap,clamp(uv,vec2(.001),vec2(.999))).rgb;gl_FragColor=vec4(mix(vec3(.002,.002,.003),reflection,.72*valid),.78);}'});material.name='ASTRA rebuilt black translucent podium';material.blendType=pc.BLEND_NORMAL;material.depthWrite=true;material.cull=pc.CULLFACE_NONE;
 // Shared edge between pavilion and bridge: no stacked transparent faces.
 const positions=[0,.28,0],normals=[0,1,0],indices=[],start=Math.acos(2.415/9.675),segments=96;
 for(let i=0;i<=segments;i++){const angle=start-(Math.PI+2*start)*i/segments;positions.push(9.675*Math.cos(angle),.28,4.48*Math.sin(angle));normals.push(0,1,0);if(i>0)indices.push(0,i+1,i);}
 indices.push(0,1,segments+1);const left=segments+1,right=1,base=positions.length/3;positions.push(-4.5885,.28,35.01,4.5885,.28,35.01);normals.push(0,1,0,0,1,0);indices.push(left,base,right,base,base+1,right);
 const mesh=new pc.Mesh(device);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setIndices(indices);mesh.update();const entity=new pc.Entity('ASTRA rebuilt podium');entity.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});station.addChild(entity);
 const reflection=createLegacyObservatoryMirror(pc,app,device,station,mainCamera,effectsLayer,entity,material);
 return {update(mode){reflection.update(mode);},dispose(){reflection.dispose();entity.destroy();mesh.destroy();material.destroy();for(const mesh of rebuiltMeshes)mesh.destroy();}};
}

// One reflection pass for the rebuilt deck; never creates a second floor.
function createLegacyObservatoryMirror(pc,app,device,station,mainCamera,effectsLayer,surface,material){
 const size=innerWidth<700?384:768;
 const texture=new pc.Texture(device,{name:'observatory-planar-reflection',width:size,height:size*2,format:pc.PIXELFORMAT_RGBA8,mipmaps:false,addressU:pc.ADDRESS_CLAMP_TO_EDGE,addressV:pc.ADDRESS_CLAMP_TO_EDGE});
 const target=new pc.RenderTarget({colorBuffer:texture,depth:true});
 const layer=new pc.Layer({name:'Observatory mirror'});app.scene.layers.insertTransparent(layer,app.scene.layers.getTransparentIndex(effectsLayer));surface.render.layers=[layer.id];
 mainCamera.camera.layers=[...mainCamera.camera.layers,layer.id];
 const reflectedLayer=new pc.Layer({name:'Observatory reflection content'});app.scene.layers.push(reflectedLayer);
 const reflectedRenders=station.findComponents('render').filter(render=>render.entity!==surface);for(const render of reflectedRenders)render.layers=[...render.layers,reflectedLayer.id];
 const camera=new pc.Entity('Observatory reflection camera');camera.addComponent('camera',{priority:-1,renderTarget:target,fov:mainCamera.camera.fov,nearClip:.05,farClip:mainCamera.camera.farClip,clearColor:mainCamera.camera.clearColor.clone(),layers:mainCamera.camera.layers.filter(id=>id!==layer.id&&id!==effectsLayer.id)});camera.camera.gammaCorrection=pc.GAMMA_NONE;camera.camera.toneMapping=pc.TONEMAP_NONE;app.root.addChild(camera);camera.enabled=false;
 material.setParameter('reflectionMap',texture);material.cull=pc.CULLFACE_NONE;
 const matrix=new pc.Mat4(),view=new pc.Mat4();let ticks=0,rendered=false;
 const projection=new pc.Mat4();camera.camera.calculateProjection=out=>out.copy(projection);
 camera.camera.layers=[reflectedLayer.id];
 // The rebuilt deck's vertices lie on local y=.28.
 surface.setLocalPosition(0,0,0);
 return {update(mode){surface.enabled=station.enabled&&mode!=='surface';camera.enabled=false;if(!surface.enabled)return;
  // Keep the projective matrix and captured image from the same frame.
  const cadence=1;if(rendered&&ticks++%cadence!==0)return;
  const plane=surface.getWorldTransform().transformPoint(new pc.Vec3(0,.28,0)).y,pos=mainCamera.getPosition().clone(),look=pos.clone().add(mainCamera.forward),up=mainCamera.up.clone();pos.y=2*plane-pos.y;look.y=2*plane-look.y;up.y=-up.y;camera.setPosition(pos);camera.lookAt(look,up);camera.camera.aspectRatio=mainCamera.camera.aspectRatio;camera.camera.aspectRatioMode=pc.ASPECT_MANUAL;view.copy(camera.getWorldTransform()).invert();
  // Oblique near plane removes the underside of the bridge from the reflection.
  projection.setPerspective(camera.camera.fov,camera.camera.aspectRatio,camera.camera.nearClip,camera.camera.farClip);
  const world=camera.getWorldTransform().data,d=projection.data,c=[world[1],world[5],world[9],pos.y-plane],q=[(Math.sign(c[0])+d[8])/d[0],(Math.sign(c[1])+d[9])/d[5],-1,(1+d[10])/d[14]],s=2/(c[0]*q[0]+c[1]*q[1]+c[2]*q[2]+c[3]*q[3]);
  d[2]=c[0]*s;d[6]=c[1]*s;d[10]=c[2]*s+1-.004;d[14]=c[3]*s;matrix.mul2(projection,view);material.setParameter('reflectionViewProjection',matrix.data);
  camera.enabled=true;rendered=true;
 },dispose(){for(const render of reflectedRenders)render.layers=render.layers.filter(id=>id!==reflectedLayer.id);camera.destroy();target.destroy();texture.destroy();app.scene.layers.remove(layer);app.scene.layers.remove(reflectedLayer);}};
}
