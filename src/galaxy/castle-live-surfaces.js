// Ported from Claude's owner-approved castle-live V8 scene (PR #10).
// Source: public/castle-live/assets/index-CLca2w5b.js
// SHA256: 81f04dc2030b56c0b073bb46d259a01d1eb8ecdf25d939d0bb627c669b190289
// Engine, standalone controls, planets and backdrop are deliberately excluded.
var Vy = `
#ifndef ASTRA_CASTLE_GRAIN
#define ASTRA_CASTLE_GRAIN
uniform sampler2D castleGrain;
float castleField(vec3 p,vec3 n){
  vec3 w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);
  return dot(vec3(texture2D(castleGrain,p.yz*.18).r,
    texture2D(castleGrain,p.xz*.18).g,
    texture2D(castleGrain,p.xy*.18).b),w);
}
#endif
`;
function Hy(e) {
  return `${Vy}
void getNormal(){
  vec3 n=normalize(dVertexNormalW),p=vPositionW;
  float h=castleField(p,n)*${e};
  vec3 sx=dFdx(p),sy=dFdy(p),r1=cross(sy,n),r2=cross(n,sx);
  float det=dot(sx,r1);
  vec3 slope=sign(det)*(dFdx(h)*r1+dFdy(h)*r2)/max(abs(det),.000001);
  dNormalW=normalize(n-slope);
}`;
}
function Uy(e, t, n) {
  return `${Vy}
uniform vec3 material_emissive;
uniform float material_emissiveIntensity;
void getEmission(){
 vec3 p=vPositionW,n=normalize(dVertexNormalW);
 float f=castleField(p*.55,n);
 float h=clamp(p.y/26.,0.,1.);
 vec3 c=mix(vec3(${e}),vec3(${t}),smoothstep(0.,.62,h+.30*(f-.5)));
 c=mix(c,vec3(${n}),smoothstep(.60,.94,f)*.6);
 dEmission=c*material_emissive*material_emissiveIntensity;
}`;
}
var Wy = `
vec3 combineColor(vec3 albedo,vec3 sheenSpecularity,float clearcoatSpecularity){
  vec3 ret=albedo*dDiffuseLight*.34;
#ifdef LIT_SPECULAR
  ret+=dSpecularLight;
#endif
#ifdef LIT_REFLECTIONS
  ret+=dReflection.rgb*dReflection.a;
#endif
#ifdef LIT_SHEEN
  float scaling=1.-max(max(sheenSpecularity.r,sheenSpecularity.g),sheenSpecularity.b)*.157;
  ret=ret*scaling+(sSpecularLight+sReflection.rgb)*sheenSpecularity;
#endif
#ifdef LIT_CLEARCOAT
  ret=ret*(1.-ccFresnel*clearcoatSpecularity)+(ccSpecularLight+ccReflection)*clearcoatSpecularity;
#endif
  return ret;
}`,
  Gy = true,
  Ky = {
    night: {
      stone: `.56,.60,.80`,
      gamma: `1.35`,
      albedo: `.30,.32,.42`,
      metal: [1, 0.76, 0.3],
      crystal: [0.56, 0.34, 1],
      glassD: `.04,.10,.62`,
      glassL: `.28,.40,1.`,
      glassF: `.78,.84,1.`,
      glassC: [0.18, 0.3, 0.95],
      lancet: [1, 0.68, 0.28],
    },
    ruby: {
      stone: `.95,.52,.54`,
      gamma: `1.28`,
      albedo: `.42,.22,.24`,
      metal: [1, 0.72, 0.36],
      crystal: [1, 0.3, 0.46],
      glassD: `.46,.02,.10`,
      glassL: `1.,.44,.20`,
      glassF: `1.,.88,.62`,
      glassC: [0.95, 0.24, 0.26],
      lancet: [1, 0.72, 0.32],
    },
    sapphire: {
      stone: `.60,.74,1.`,
      gamma: `1.30`,
      albedo: `.30,.38,.56`,
      metal: [0.86, 0.9, 1],
      crystal: [0.4, 0.7, 1],
      glassD: `.02,.10,.55`,
      glassL: `.14,.64,1.`,
      glassF: `.85,.97,1.`,
      glassC: [0.14, 0.5, 1],
      lancet: [0.8, 0.9, 1],
    },
    marble: {
      stone: `1.06,1.03,.97`,
      gamma: `1.55`,
      albedo: `.88,.86,.80`,
      metal: [1, 0.8, 0.4],
      crystal: [0.95, 0.55, 1],
      glassD: `.02,.20,.70`,
      glassL: `.05,.74,.90`,
      glassF: `.90,1.,1.`,
      glassC: [0.15, 0.6, 0.95],
      lancet: [1, 0.86, 0.6],
    },
  },
  qy = {
    metal: [1, 0.78, 0.32],
    crystal: [0.6, 0.4, 1],
    gamma: `1.25`,
    stone: `1.,1.,1.`,
    albedo: `.30,.30,.34`,
    glassD: `.03,.14,.60`,
    glassL: `.10,.62,.95`,
    glassF: `.78,.95,1.`,
    glassC: [0.16, 0.42, 0.95],
    lancet: [1, 0.72, 0.3],
    tile: 6.5,
    gain: `6.0`,
    nstr: `1.15`,
  };
((Ky.game = { ...qy, tex: `basalt` }),
  (Ky.game2 = { ...qy, tex: `violet`, gain: `4.6` }),
  (Ky.v8 = {
    ...qy,
    tex: `violet`,
    mono: !0,
    gain: `1.7`,
    gamma: `1.0`,
    nstr: `1.6`,
    tile: 4.2,
    v8: !0,
    glassC: [0.82, 0.93, 1],
    lancet: [1, 0.93, 0.76],
  }));
var Jy = (e) => {
    let t = $?.mono
      ? `col=vec3(dot(col,vec3(.2126,.7152,.0722)))*vec3(.62,.64,.70);`
      : ``;
    return `
#ifndef ASTRA_TRI
#define ASTRA_TRI
uniform sampler2D stoneAlbedo;uniform sampler2D stoneNormal;
vec3 triW(vec3 n){vec3 w=pow(abs(n),vec3(5.));return w/dot(w,vec3(1.));}
vec3 triAlbedo(vec3 p,vec3 n){vec3 w=triW(n);float s=${(1 / e).toFixed(5)};
 vec3 col=texture2D(stoneAlbedo,p.zy*s).rgb*w.x+texture2D(stoneAlbedo,p.xz*s).rgb*w.y+texture2D(stoneAlbedo,p.xy*s).rgb*w.z;
 ${t}
 return col;}
#endif
`;
  },
  Yy = (e, t) => `${Jy(e)}
void getNormal(){
 vec3 n=normalize(dVertexNormalW),p=vPositionW,w=triW(n);float s=${(1 / e).toFixed(5)};
 vec3 tx=texture2D(stoneNormal,p.zy*s).xyz*2.-1.,ty=texture2D(stoneNormal,p.xz*s).xyz*2.-1.,tz=texture2D(stoneNormal,p.xy*s).xyz*2.-1.;
 tx=vec3(tx.xy*${t}+n.zy,abs(tx.z)*n.x);ty=vec3(ty.xy*${t}+n.xz,abs(ty.z)*n.y);tz=vec3(tz.xy*${t}+n.xy,abs(tz.z)*n.z);
 dNormalW=normalize(tx.zyx*w.x+ty.xzy*w.y+tz.xyz*w.z);
}`,
  $ = Ky.v8;
function Xy(e, t, n, r, i, a) {
  let o = [];
  for (let t of n.findComponents(`render`))
    for (let n of t.meshInstances) {
      let t = n.material;
      if (!o.includes(t.name)) {
        if (
          (o.push(t.name),
          (t.specularAntialias = !0),
          t.name === `Control pearl stone`)
        )
          ((t.useMetalness = !0),
            (t.metalness = 0.04),
            (t.diffuseVertexColor = !1),
            t.diffuse.set(
              ...($ ? $.albedo.split(`,`).map(Number) : [0.88, 0.86, 0.8]),
            ),
            (t.glossInvert = !1),
            (t.gloss = 0.8),
            (t.clearCoat = 0.38),
            (t.clearCoatGloss = 0.88),
            t.setParameter(`castleGrain`, r),
            $?.tex &&
              a &&
              (t.setParameter(`stoneAlbedo`, a.albedo),
              t.setParameter(`stoneNormal`, a.normal)),
            t.shaderChunks.glsl.set(
              `normalMapPS`,
              $?.tex && a ? Yy($.tile, $.nstr) : Hy(`.0035`),
            ),
            t.shaderChunks.glsl.set(
              `glossPS`,
              `${Vy}
void getGlossiness(){dGlossiness=mix(.77,.87,castleField(vPositionW,normalize(dVertexNormalW)));}`,
            ),
            t.shaderChunks.glsl.set(
              `diffusePS`,
              $?.tex && a
                ? `${Vy}${Jy($.tile)}
void getAlbedo(){dAlbedo=pow(triAlbedo(vPositionW,normalize(dVertexNormalW)),vec3(2.2));}`
                : `${Vy}
void getAlbedo(){
 float f=castleField(vPositionW*.23,normalize(dVertexNormalW));
 float vein=sin(vPositionW.y*3.1+sin(vPositionW.x*1.7)+f*2.);
 dAlbedo=vec3(${$ ? $.albedo : `.88,.86,.80`})*(.982+.018*vein);
}`,
            ),
            i &&
              (t.shaderChunks.glsl.set(`combinePS`, Wy),
              t.shaderChunks.glsl.set(
                `emissivePS`,
                `${Vy}${$?.tex ? Jy($.tile) : ``}
void getEmission(){
 vec3 b=${i.encoding === `sqrt-normalized` ? `pow(vVertexColor.rgb,vec3(2.))` : `vVertexColor.rgb`}*${Number(i.linearGain).toFixed(1)};
 // V7: soft knee. Below .5 nothing changes; above it the bright end is pressed down so broad
 // smooth surfaces (flying arches) stay mid-tone and only fine edges reach full highlight.
 ${$ ? `b=pow(max(b,vec3(0.)),vec3(${$.gamma}));` : ``}
 b=b/(1.+1.1*max(b-.5,vec3(0.)));
 float l=dot(b,vec3(.2126,.7152,.0722));
 float shade=mix(.84,1.,l/(l+.12));
 float f=castleField(vPositionW*.23,normalize(dVertexNormalW));
 // Pearl-ivory: warm highlights, faint cool shadows, lifted overall (V7 look pass).
 vec3 tint=mix(vec3(.94,.97,1.05),vec3(1.01,.99,.95),l/(l+.35));
 ${$?.tex && a ? `dEmission=pow(triAlbedo(vPositionW,normalize(dVertexNormalW)),vec3(2.2))*b*shade*${$.gain};` : `dEmission=b*tint*shade*(.97+.03*f)*1.45${$ ? `*vec3(${$.stone})` : ``};`}
}`,
              )));
        else if (t.name === `Control polished electrum`)
          ((t.useMetalness = !0),
            (t.metalness = 0.96),
            t.diffuse.set(...($ ? $.metal : [0.96, 0.82, 0.58])),
            (t.glossInvert = !1),
            (t.gloss = 0.88),
            (t.clearCoat = 0.25),
            (t.clearCoatGloss = 0.93),
            t.setParameter(`castleGrain`, r),
            t.shaderChunks.glsl.set(`normalMapPS`, Hy(`.0008`)),
            t.shaderChunks.glsl.set(
              `glossPS`,
              `${Vy}
void getGlossiness(){dGlossiness=mix(.855,.92,castleField(vPositionW,normalize(dVertexNormalW)));}`,
            ));
        else if (t.name === `Control mineral crystal`) {
          if (
            (t.diffuse.set(0.97, 0.96, 1),
            t.emissive.set(...($ ? $.crystal : [1, 0.74, 1])),
            (t.emissiveIntensity = 0.62),
            $?.v8)
          ) {
            (t.diffuse.set(0.02, 0.55, 0.46),
              t.emissive.set(0.02, 0.84, 0.64),
              (t.emissiveIntensity = 1.5),
              (t.bumpiness = 0.32),
              (t.clearCoat = 0.82),
              (t.clearCoatGloss = 0.94),
              t.update());
            continue;
          }
          (t.shaderChunks.glsl.set(
            `emissivePS`,
            `
uniform vec3 material_emissive;
uniform float material_emissiveIntensity;
void getEmission(){
 dEmission=material_emissive*material_emissiveIntensity;
 #ifdef STD_EMISSIVE_TEXTURE
 dEmission*={STD_EMISSIVE_TEXTURE_DECODE}(texture2DBias({STD_EMISSIVE_TEXTURE_NAME},{STD_EMISSIVE_TEXTURE_UV},{STD_TEXTURE_BIAS})).{STD_EMISSIVE_TEXTURE_CHANNEL};
 #endif
 #ifdef STD_EMISSIVE_VERTEX
 dEmission*=saturate(vVertexColor.{STD_EMISSIVE_VERTEX_CHANNEL});
 #endif
 float l=dot(dEmission,vec3(.2126,.7152,.0722));
 dEmission=mix(vec3(l)*vec3(1.02,.97,1.04),dEmission,.62);
}`,
          ),
            t.shaderChunks.glsl.set(
              `diffusePS`,
              `
uniform vec3 material_diffuse;
void getAlbedo(){
 dAlbedo=material_diffuse.rgb;
 #ifdef STD_DIFFUSE_TEXTURE
 dAlbedo*={STD_DIFFUSE_TEXTURE_DECODE}(texture2DBias({STD_DIFFUSE_TEXTURE_NAME},{STD_DIFFUSE_TEXTURE_UV},{STD_TEXTURE_BIAS})).{STD_DIFFUSE_TEXTURE_CHANNEL};
 #endif
 #ifdef STD_DIFFUSE_VERTEX
 dAlbedo*=saturate(vVertexColor.{STD_DIFFUSE_VERTEX_CHANNEL});
 #endif
 float l=dot(dAlbedo,vec3(.2126,.7152,.0722));
 dAlbedo=mix(vec3(l),dAlbedo,.68);
}`,
            ),
            (t.bumpiness = 0.32),
            (t.clearCoat = 0.82),
            (t.clearCoatGloss = 0.94));
        } else
          t.name === `Control clear glazing` && $?.v8
            ? ((t.opacity = 0.16),
              (t.blendType = e.BLEND_NORMAL),
              (t.metalness = 0.1),
              (t.glossInvert = !1),
              (t.gloss = 0.98),
              (t.clearCoat = 0.8),
              (t.clearCoatGloss = 0.98),
              t.diffuse.set(0.82, 0.93, 1),
              t.emissive.set(0, 0, 0))
            : t.name === `Control celestial apse` && $?.v8
              ? (t.diffuse.set(0.1, 0.2, 0.42),
                t.emissive.set(0.22, 0.38, 0.8),
                (t.emissiveIntensity = 0.9),
                (t.glossInvert = !1),
                (t.gloss = 0.9))
              : t.name === `Control clear glazing`
                ? ((t.opacity = 0.3),
                  (t.blendType = e.BLEND_ADDITIVEALPHA),
                  (t.metalness = 0.08),
                  (t.glossInvert = !1),
                  (t.gloss = 0.96),
                  (t.clearCoat = 0.7),
                  (t.clearCoatGloss = 0.97),
                  t.diffuse.set(
                    ...($
                      ? $.glassC
                      : Gy
                        ? [0.22, 0.86, 0.8]
                        : [0.3, 0.78, 0.98]),
                  ),
                  t.emissive.set(1, 1, 1),
                  (t.emissiveIntensity = 0.95),
                  t.setParameter(`castleGrain`, r),
                  t.shaderChunks.glsl.set(
                    `emissivePS`,
                    $
                      ? Uy($.glassD, $.glassL, $.glassF)
                      : Gy
                        ? Uy(`.02,.44,.58`, `.12,.90,.76`, `.80,1.,.94`)
                        : Uy(`.03,.36,.86`, `.10,.86,.94`, `.74,.98,1.`),
                  ))
                : t.name === `Control celestial apse`
                  ? (t.diffuse.set(
                      ...($
                        ? $.glassC
                        : Gy
                          ? [0.22, 0.8, 0.82]
                          : [0.3, 0.7, 0.98]),
                    ),
                    t.emissive.set(1, 1, 1),
                    (t.emissiveIntensity = 0.55),
                    (t.glossInvert = !1),
                    (t.gloss = 0.9),
                    (t.metalness = 0.14),
                    (t.clearCoat = 0.7),
                    (t.clearCoatGloss = 0.95),
                    t.setParameter(`castleGrain`, r),
                    t.shaderChunks.glsl.set(
                      `emissivePS`,
                      $
                        ? Uy($.glassD, $.glassL, $.glassF)
                        : Gy
                          ? Uy(`.03,.48,.62`, `.14,.92,.80`, `.86,1.,.96`)
                          : Uy(`.04,.42,.92`, `.14,.92,.95`, `.84,1.,1.`),
                    ))
                  : t.name === `Control light` && $?.v8
                    ? (t.diffuse.set(0.9, 0.85, 0.7),
                      t.emissive.set(1, 0.93, 0.76),
                      (t.emissiveIntensity = 14))
                    : t.name === `Control warm lancets` &&
                      (t.diffuse.set(0.62, 0.53, 0.37),
                      t.emissive.set(...($ ? $.lancet : [1, 0.92, 0.74])),
                      (t.emissiveIntensity = $?.v8 ? 26 : 3.8),
                      (t.glossInvert = !1),
                      (t.gloss = 0.7),
                      (t.clearCoat = 0.22));
        t.update();
      }
    }
  for (let [e, n] of [
    [`Warm key`, 0.85],
    [`Cool fill`, 0.42],
    [`Rear rim`, 1.1],
    [`Upper warm`, 0.5],
  ]) {
    let r = t.root.findByName(e);
    r?.light && (r.light.intensity = n);
  }
  for (let e of t.root.findComponents(`light`))
    e.entity.name === `Local gold` && (e.intensity = 3.4);
  return { profile: `v6-surfaces`, materials: o, geometryChanged: !1 };
}

export { Xy as applyCastleSurfaces };
