// fragment.glsl
#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform float time;
uniform vec3  color1;
uniform vec3  color2;
uniform vec3  color3;
uniform vec3  color4;

// Tunables
uniform float shadowStrength; // 0.0–1.0
uniform float shadowSoftness; // 0.0–1.0
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

  // secondary microflow for shimmer
  float micro = 0.5 + 0.5 * sin(6.0 * (uv.x + uv.y) + t * 1.2 + warp * 0.5);
  float flowPattern = clamp(mix(bands, micro, 0.35), 0.0, 1.0);

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

  // dynamic luminance lift (silk sheen)
  float lift = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(qy * 0.8 + t * 0.4), 3.0);
  vec3 silk = baseColor * lift;

  // --- iridescence via fresnel-driven hue travel ---
  float F = pow(1.0 - abs(dot(n, v)), 2.0); // fresnel term
  vec3 iriA = mix(color2, color3, 0.5 + 0.5 * sin(t * 0.5 + warp * 0.2));
  vec3 iriB = mix(color1, color4, 0.5 + 0.5 * cos(t * 0.4 + qx * 0.7));
  vec3 iridescence = mix(iriA, iriB, 0.5 + 0.5 * sin(qy * 0.5 + t * 0.6));
  vec3 coat = mix(silk, iridescence, clamp(F * 0.85, 0.0, 1.0));

  // --- lighting: diffuse, specular (Blinn), and rim ---
  float ndl = max(dot(n, l), 0.0);
  vec3  h   = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 72.0);

  // subtle sparkles (procedural flicker, filtered by ndl)
  float sparkle = 0.5 + 0.5 * sin(20.0 * (uv.x + uv.y) + t * 3.0 + warp * 1.5);
  sparkle *= 0.25 + 0.75 * ndl;
  float specMix = mix(spec, spec * (0.7 + 0.3 * sparkle), 0.8);

  float rim = pow(1.0 - abs(dot(n, v)), 3.0);

  // soft ambient wrap to keep depth without flattening
  float wrap = clamp((ndl + 0.35) / (1.0 + 0.35), 0.0, 1.0);

  vec3 lit = coat * (0.35 + 0.85 * wrap) + specMix * (0.35 + 0.65 * bands) + rim * 0.25;

  // gentle tone shaping
  vec3 finalColor = lit;
  finalColor = mix(finalColor, finalColor * finalColor, 0.2); // soft contrast curve

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
