// fragment.glsl
#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform float time;
uniform vec3  color1, color2, color3, color4;
uniform float shadowStrength, shadowSoftness;
uniform bool  debugShadow;

varying highp vec2 vUv;
varying highp vec3 vPosition;
varying highp vec3 vNormalView;

// sRGB OETF (linear -> sRGB)
vec3 linearToSRGB(vec3 c) {
  vec3 a = 12.92 * c;
  vec3 b = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(b, a, step(c, vec3(0.0031308)));
}

void main() {
  // --- coordinate setup ---
  vec3 p  = vPosition;
  vec2 uv = vUv;
  float t = time;

  // view-space normal & view/lighting vectors
  vec3 n = normalize(vNormalView);
  vec3 v = vec3(0.0, 0.0, 1.0);
  float ang = time * 0.25;                         
  vec3 l = normalize(vec3(cos(ang)*0.9, 1.2, sin(ang)*2.0));

  // --- animated domain warp (cheap FBM-ish) ---
  float w1 = sin(p.y * 2.35 + t * 0.60) + sin(p.x * 1.75 - t * 0.35);
  float w2 = sin((p.x + p.y) * 1.10 + t * 0.25) + sin((p.x - p.y) * 1.30 - t * 0.20);
  float warp = w1 * 0.6 + w2 * 0.4;

  // silky band coordinates (warped)
  float qy = p.y * 3.2 + warp * 0.9;
  float qx = p.x * 2.1 + warp * 0.6;

  // base flowing pattern: ridged sin with soft sharpening
  float bands = 0.5 + 0.5 * sin(qy + 0.25 * sin(qx + t * 0.35));
  bands = smoothstep(0.15, 0.85, pow(bands, 1.8));

  // secondary microflow for shimmer (reduced for matte look)
  float micro = 0.5 + 0.5 * sin(6.0 * (uv.x + uv.y) + t * 1.2 + warp * 0.5);
  float flowPattern = clamp(mix(bands, micro, 0.15), 0.0, 1.0); // reduced from 0.35 to 0.15

  // --- palette across 4 colors (branchless, segment-consistent) ---
  // Map flowPattern in [0,1] to 4 segments of length 0.25
  float seg = clamp(flowPattern, 0.0, 1.0) * 4.0;

  // Per-segment local t in [0,1]
  float t0 = clamp(seg - 0.0, 0.0, 1.0);
  float t1 = clamp(seg - 1.0, 0.0, 1.0);
  float t2 = clamp(seg - 2.0, 0.0, 1.0);
  float t3 = clamp(seg - 3.0, 0.0, 1.0);

  // Smooth per-segment interpolation
  float k0 = smoothstep(0.0, 1.0, t0);
  float k1 = smoothstep(0.0, 1.0, t1);
  float k2 = smoothstep(0.0, 1.0, t2);
  float k3 = smoothstep(0.0, 1.0, t3);

  // Segment masks (exactly one is 1.0 except at boundaries where two sum to 1.0)
  float m0 = 1.0 - step(1.0, seg);
  float m1 = step(1.0, seg) * (1.0 - step(2.0, seg));
  float m2 = step(2.0, seg) * (1.0 - step(3.0, seg));
  float m3 = step(3.0, seg);

  vec3 baseColor =
      m0 * mix(color1, color4, k0) +
      m1 * mix(color4, color2, k1) +
      m2 * mix(color2, color3, k2) +
      m3 * mix(color3, color1, k3);

  // dynamic luminance lift (reduced for matte look)
  float lift = 0.70 + 0.30 * pow(0.5 + 0.5 * sin(qy * 0.8 + t * 0.4), 2.0); // flatter curve
  vec3 silk = baseColor * lift;

  // --- reduced iridescence for matte look ---
  float F = pow(1.0 - abs(dot(n, v)), 3.5); // softer fresnel (was 2.0)
  vec3 iriA = mix(color2, color3, 0.5 + 0.5 * sin(t * 0.5 + warp * 0.2));
  vec3 iriB = mix(color1, color4, 0.5 + 0.5 * cos(t * 0.4 + qx * 0.7));
  vec3 iridescence = mix(iriA, iriB, 0.5 + 0.5 * sin(qy * 0.5 + t * 0.6));
  vec3 coat = mix(silk, iridescence, clamp(F * 0.25, 0.0, 1.0)); // reduced from 0.85 to 0.25

  // --- matte lighting: mostly diffuse, minimal specular ---
  float ndl = max(dot(n, l), 0.0);
  vec3  h   = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 120.0); // increased power for tighter, subtler highlight

  // remove sparkles for matte look
  float specMix = spec * 0.15; // greatly reduced specular intensity

  float rim = pow(1.0 - abs(dot(n, v)), 4.0) * 0.08; // softer, subtler rim

  // soft ambient wrap to keep depth without flattening
  float wrap = clamp((ndl + 0.45) / (1.0 + 0.45), 0.0, 1.0); // more ambient fill

  vec3 lit = coat * (0.55 + 0.45 * wrap) + specMix * (0.2 + 0.3 * bands) + rim; // reduced specular influence

  // gentle tone shaping (reduced for flatter matte look)
  vec3 finalColor = lit;
  finalColor = mix(finalColor, finalColor * finalColor, 0.08); // reduced contrast curve

  // ---------- bottom shadow mask (view-space) ----------
  float down = clamp(-n.y, 0.0, 1.0);

  // Derivative-aware epsilon keeps neighboring fragments in agreement
  float eps = 0.75 * fwidth(down) + 1e-4;
  float start = max(shadowSoftness - 0.25, 0.0);
  float end   = min(shadowSoftness + 0.45, 1.0);
  float mask  = smoothstep(start - eps, end + eps, down);

  if (debugShadow) {
    gl_FragColor = vec4(vec3(mask), 1.0);
    return;
  }

  // palette-tinted shadow (lean toward deeper palette tones)
  vec3 shadowColor = mix(color2, color1, 0.75);
  finalColor = mix(finalColor, shadowColor, mask * shadowStrength);

  gl_FragColor = vec4(linearToSRGB(max(finalColor, 0.0)), 1.0);
}