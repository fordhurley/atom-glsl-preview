uniform sampler2D u_mainTex; // grace_hopper.jpg

void main()
{
  vec2 uv = gl_FragCoord.xy/iResolution.xy;

  vec3 tex = texture2D(u_mainTex, uv).rgb;

  gl_FragColor = vec4(tex, 1.0);
}
