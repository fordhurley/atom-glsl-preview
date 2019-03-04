precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

uniform sampler2D u_mainTex; // ../assets/barns_grand_tetons.jpg

/*
https://en.wikipedia.org/wiki/YCoCg
Drag your mouse to see the different representations

  Co --------------- Cg
   |                  |
   |                  |
   |                  |
  RGB ------------luminance
*/
void main() {
  // A matrix that transforms rgb color to yCgCo
  mat3 rgb2YCgCo = mat3(0.25, -0.25, 0.5, 0.5, 0.5, 0.0, 0.25, -0.25, -0.5);
  // The inverse
  mat3 yCgCo2rgb = mat3(1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 0.0, -1.0);

  vec2 uv = gl_FragCoord.xy/u_resolution.xy;
  vec3 tex = texture2D(u_mainTex, uv).rgb;

  vec3 yCgCo = rgb2YCgCo * tex;

  // Isolate the components in rgb-space
  vec3 luminance = yCgCo2rgb * vec3(yCgCo.r, 0.0, 0.0);
  // Add gray to the chrominance components
  vec3 Cg = yCgCo2rgb * vec3(0.0, yCgCo.g, 0.0) + vec3(0.5);
  vec3 Co = yCgCo2rgb * vec3(0.0, 0.0, yCgCo.b) + vec3(0.5);

  vec2 mouseControl = clamp(3.0 * u_mouse - 1.0, 0.0, 1.0);
  vec3 outputColor = mix(
      mix(tex, luminance, mouseControl.x),
      mix(Co, Cg, mouseControl.x),
    mouseControl.y);
  gl_FragColor = vec4(outputColor, 1.0);
}
