// Ported from Claude's owner-approved castle-live V8 scene (PR #10).
// Source: public/castle-live/assets/index-CLca2w5b.js
// SHA256: b916631198bd4ce5763b48d1f3c78f40c84c45a2f71d3d213e85599d7b4ba779
// Engine, standalone controls, planets and backdrop are deliberately excluded.
export function createCastleVolumes(e, t, n, r, i, a, o) {
  let s = [],
    c = new e.Mat4();
  for (let [r, c, l, u] of [
    [`Mint crown`, [0, 27.6, -1], [5.8, 25, 5.8], 0],
    [`Coral envelope`, [0, 16.396950442, -6], [26, 19.55599594, 6], 1],
  ]) {
    let d = new e.ShaderMaterial({
      uniqueName: `control-bounded-volume-` + u,
      attributes: { aPosition: e.SEMANTIC_POSITION },
      vertexGLSL: `attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec3 world;void main(){vec4 p=matrix_model*vec4(aPosition,1.);world=p.xyz;gl_Position=matrix_viewProjection*p;}`,
      fragmentGLSL: `
      varying vec3 world;uniform mat4 inverseModel;uniform vec3 view_position;uniform sampler2D densityMap;uniform float time;
      void main(){
        vec3 ro=(inverseModel*vec4(view_position,1.)).xyz,hit=(inverseModel*vec4(world,1.)).xyz;
        vec3 rd=normalize(hit-ro);vec3 safe=mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))*max(abs(rd),vec3(.00001));
        vec3 a=(-.5-ro)/safe,b=(.5-ro)/safe,lo=min(a,b),hi=max(a,b);
        float start=max(max(lo.x,lo.y),max(lo.z,0.)),stop=min(min(hi.x,hi.y),hi.z);if(stop<=start)discard;
        float stepSize=(stop-start)/${o ? 14 : 22}.,sum=0.;
        for(int i=0;i<${o ? 14 : 22};i++){
          vec3 p=ro+rd*(start+(float(i)+.5)*stepSize);
          float n=texture2D(densityMap,p.xy*2.8+vec2(p.z*1.2,time*.009)).r;
          float detail=texture2D(densityMap,p.zy*5.1+vec2(p.x*3.2,-time*.013)).b;
          float form;
          ${
            u === 0
              ? `
          vec2 warp=vec2(sin(p.y*23.-time*.15),cos(p.y*17.+time*.12))*.038;
          float radius=length(p.xz+warp),spread=.035+.040*(p.y+.5);
          form=exp(-radius*radius/(spread*spread))*.9+exp(-radius*radius/.036)*.18;
          form*=smoothstep(-.5,-.30,p.y)*(1.-smoothstep(.35,.5,p.y));
          `
              : `
          float angle=atan(p.y,p.x),wave=.010*sin(angle*7.+time*.08)+.008*sin(angle*19.-time*.09);
          float radial=length(p.xy)-.407-wave;
          form=exp(-radial*radial/ (.0012+.0008*n));
          form*=exp(-p.z*p.z*22.)*(.50+.50*pow(.5+.5*sin(angle*5.-time*.10),2.));
          `
          }
          sum+=form*(.08+pow(n,2.)*1.1+pow(detail,3.)*.6)*stepSize;
        }
        float alpha=1.-exp(-sum*${u === 0 ? `11.` : `14.`});
        vec3 color=${u === 0 ? `vec3(.09,1.,.52)` : `vec3(1.,.095,.16)`};
        gl_FragColor=vec4(color*${u === 0 ? `3.8` : `3.0`},alpha*${u === 0 ? `.88` : `.55`});
      }`,
    });
    ((d.blendType = e.BLEND_ADDITIVEALPHA),
      (d.depthWrite = !1),
      (d.cull = e.CULLFACE_FRONT),
      d.setParameter(`densityMap`, a),
      d.setParameter(`time`, 0));
    let f = e.Mesh.fromGeometry(t, new e.BoxGeometry()),
      p = new e.Entity(r);
    (p.addComponent(`render`, {
      meshInstances: [new e.MeshInstance(f, d)],
      layers: [i],
    }),
      n.addChild(p),
      p.setLocalPosition(...c),
      p.setLocalScale(...l),
      s.push({ e: p, mat: d }));
  }
  return {
    update(e) {
      for (let { e: t, mat: n } of s)
        (c.copy(t.getWorldTransform()).invert(),
          n.setParameter(`inverseModel`, c.data.slice()),
          n.setParameter(`time`, e));
    },
  };
}
export function createCastleGlows(e, t, n, r) {
  let i = (t) => {
      let n = new e.ShaderMaterial({
        uniqueName: `control-divine-glow-` + t,
        attributes: { aPosition: e.SEMANTIC_POSITION },
        vertexGLSL: `attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_view;uniform mat4 matrix_projection;
uniform vec2 glowSize;varying vec2 uv;
void main(){uv=aPosition.xz*2.;vec3 c=matrix_model[3].xyz;vec4 v=matrix_view*vec4(c,1.);v.xy+=aPosition.xz*2.*glowSize;gl_Position=matrix_projection*v;}`,
        fragmentGLSL: `varying vec2 uv;uniform vec3 glowColor;uniform float glowPower;uniform float glowShape;
void main(){
 vec2 q=uv;float r2=dot(q,q);
 float halo=exp(-r2*5.5)*.75+exp(-r2*1.6)*.25;
 float beam=exp(-q.x*q.x*14.)*exp(-q.y*q.y*1.4);
 float a=mix(halo,beam,glowShape)*smoothstep(1.,.6,length(q));
 gl_FragColor=vec4(glowColor*glowPower*a,a);
}`,
      });
      return (
        (n.blendType = e.BLEND_ADDITIVEALPHA),
        (n.depthWrite = !1),
        (n.cull = e.CULLFACE_NONE),
        n
      );
    },
    a = new e.Mesh(t);
  (a.setPositions([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5]),
    a.setIndices([0, 1, 2, 0, 2, 3]),
    a.update());
  let o = [1, 0.86, 0.6],
    s = [1, 0.95, 0.82],
    c = [0.05, 1, 0.78],
    l = [
      [`Nave inner glow`, [0, 7, 0.6], 15, 19, s, 0.3, 0],
      [`Nave inner shaft`, [0, 10, 0.4], 5, 26, o, 0.28, 1],
      [`Left dome inner`, [-9.5, 4, 0.4], 8, 8, o, 0.8, 0],
      [`Right dome inner`, [9.5, 4, 0.4], 8, 8, o, 0.8, 0],
      [`Left outer inner`, [-16.5, 4, 0.2], 6, 6, o, 0.6, 0],
      [`Right outer inner`, [16.5, 4, 0.2], 6, 6, o, 0.6, 0],
      [`Crown inner`, [0, 16, 0.2], 6, 14, s, 0.55, 1],
      [`Left tower inner`, [-9, 10, 0.2], 4, 17, c, 0.4, 1],
      [`Right tower inner`, [9, 10, 0.2], 4, 17, c, 0.4, 1],
      [`Left far tower inner`, [-15, 7, 0.2], 3, 12, c, 0.32, 1],
      [`Right far tower inner`, [15, 7, 0.2], 3, 12, c, 0.32, 1],
      [`Nave spill`, [0, 6.5, 3.8], 24, 24, s, 0.16, 0],
      [`Nave spill shaft`, [0, 9, 3.8], 7, 30, o, 0.14, 1],
      [`Left dome spill`, [-9.5, 4, 3.8], 13, 13, o, 0.5, 0],
      [`Right dome spill`, [9.5, 4, 3.8], 13, 13, o, 0.5, 0],
      [`Left outer spill`, [-16.5, 4, 3], 10, 10, o, 0.4, 0],
      [`Right outer spill`, [16.5, 4, 3], 10, 10, o, 0.4, 0],
      [`Left tower spill`, [-9, 10, 2.6], 8, 22, c, 0.28, 1],
      [`Right tower spill`, [9, 10, 2.6], 8, 22, c, 0.28, 1],
      [`Crown spill`, [0, 16, 2], 12, 16, s, 0.3, 0],
    ];
  for (let [t, o, s, c, u, d, f] of l) {
    let l = i(t);
    (l.setParameter(`glowSize`, [s * 0.5 * n.getLocalScale().x, c * 0.5 * n.getLocalScale().x]),
      l.setParameter(`glowColor`, u),
      l.setParameter(`glowPower`, d),
      l.setParameter(`glowShape`, f));
    let p = new e.Entity(`Divine ` + t);
    (p.addComponent(`render`, {
      meshInstances: [new e.MeshInstance(a, l)],
      layers: [r],
    }),
      n.addChild(p),
      p.setLocalPosition(...o));
  }
}
