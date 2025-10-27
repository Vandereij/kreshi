// vertex.glsl for THREE.ShaderMaterial (no built-in redefs)
#ifdef GL_ES
precision highp float;
precision highp int;
#endif

varying vec2 vUv;
varying vec3 vPosition;   // view-space position
varying vec3 vNormalView; // view-space normal

void main() {
  vUv = uv;

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vPosition   = mvPos.xyz;
  vNormalView = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPos;
}
