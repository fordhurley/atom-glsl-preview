#pragma glslify: map = require("./map")

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution;

  vec3 color = vec3(0.0);
  color.r = map(uv.x, 0.0, 1.0, 0.2, 0.7);
  color.g = map(uv.x, 0.0, 1.0, 0.0, 0.1);
  color.b = map(uv.x + uv.y, 2.0, 0.0, 0.1, 0.4);

  gl_FragColor = vec4(color, 1.0);
}
