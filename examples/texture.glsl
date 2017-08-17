uniform sampler2D u_mainTex; // ../assets/grace_hopper.jpg

void main() {
  vec2 uv = gl_FragCoord.xy/iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  // Preserve aspect ratio of the image:
  uv.x *= aspect;
  // Center:
  uv.x += (1.0 - aspect) / 2.0;
  // Tile:
  uv = fract(uv);

  vec3 tex = texture2D(u_mainTex, uv).rgb;

  gl_FragColor = vec4(tex, 1.0);
}
