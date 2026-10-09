/** Edge contrast, not extra source pixels or a claim of 19x image resolution. */
export const GOLD_EDGE_CONTRAST=19;
export const originGoldGLSL=`
  float goldSoft=smoothstep(.06,.28,diffuseColor.r-diffuseColor.b);
  // Narrow the tonal transition; screen-space AA keeps subpixel veins stable.
  float goldEdge=(goldSoft-.5)*${GOLD_EDGE_CONTRAST.toFixed(1)};
  float goldAA=max(fwidth(goldEdge)*.75,.015);
  float gold=smoothstep(-goldAA,goldAA,goldEdge);
  // Remove the muddy transition without widening the vein or recolouring teal.
  diffuseColor.rgb=max(vec3(0.),diffuseColor.rgb+
    vec3(.38,.18,-.06)*(gold-goldSoft));
`;
