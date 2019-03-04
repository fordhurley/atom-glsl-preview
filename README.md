# GLSL Preview package

Live preview fragment shaders in the Atom editor, with `ctrl-shift-G`.

<img width="800" alt="screenshot" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/screenshot.png">

Make sure you install [language-glsl](https://atom.io/packages/language-glsl)
for syntax highlighting.


## Uniforms

The following uniforms are available to your shader.

```glsl
uniform vec2 u_resolution; // size of the preview
uniform vec2 u_mouse; // cursor in normalized coordinates [0, 1)
uniform float u_time; // clock in seconds
```

The variants `iResolution`, `iMouse` and `iGlobalTime` can also be used for
legacy reasons.


## Textures

Textures can be loaded by defining a uniform with a comment containing the path
to the file. The syntax is:

```glsl
uniform sampler2D <texture_name>; // <path_to_file>
```

For example:

```glsl
uniform sampler2D inThisDirectory; // foo.jpg
uniform sampler2D inOtherDirectory; // ../other_textures/bar.png
uniform sampler2D withAbsolutePath; // /Users/ford/textures/blah.bmp
```


## Shader errors

If the shader fails to compile, the tab and line number will subtly highlight in
red.

<img width="264" alt="error" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error.png">

<img width="375" alt="error line" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-line.png">

If enabled in the package settings, a notification will show the error message:

<img width="461" alt="error notification" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-notification.png">


## Capture images

Right click on the preview to copy or save a still image of the shader. This can
also be done by running the command "Glsl Preview: Copy Image" or
"Glsl Preview: Save Image" from the command palette (`cmd-shift-P`).


## Examples

Example shaders can be found in the `examples/` directory.


## glslify

Supports [glslify](https://github.com/glslify/glslify) for importing glsl
modules.

```glsl
// Import from local file:
#pragma glslify: map = require('./map')

// Import from npm installed module:
#pragma glslify: rainbow = require('glsl-colormap/rainbow')
```


## Frag snippet

Create a new .glsl file, type `frag`, and hit enter. This will output the base
fragment shader code to get started from:

```glsl
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec3 color = vec3(uv.x, 0.0, uv.y);

  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;

  vec2 mouse = u_mouse;
  mouse.x *= aspect;

  float radius = map(sin(u_time), -1.0, 1.0, 0.25, 0.3);

  if (distance(uv, mouse) < radius){
    color.r = 1.0 - color.r;
    color.b = 1.0 - color.b;
  }

  gl_FragColor = vec4(color, 1.0);
}
```


## Credits

[@amelierosser](https://github.com/amelierosser) for starting the project.

[Markdown Preview](https://github.com/atom/markdown-preview) for the boilerplate
code.


[![Greenkeeper badge](https://badges.greenkeeper.io/fordhurley/atom-glsl-preview.svg)](https://greenkeeper.io/)
