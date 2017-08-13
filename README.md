# GLSL Preview package

Live code fragment shaders in the atom editor by using `ctrl-shift-g`.

File types supported: `.glsl` files.

Make sure you install [language-glsl](https://github.com/hughsk/language-glsl)
for syntax highlighting.

![screenshot](https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/screenshot.jpg)

## Uniforms

List of default uniforms included. No need to add these into your fragment
shaders.

```
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float iGlobalTime;
```

The variants `u_resolution`, `u_mouse` and `u_time` can also be used to match
the style found in [The Book of Shaders](http://thebookofshaders.com/).

## Shader errors

If the shader can't compile then the tab and line number will subtly highlight in red.

![error](https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error.jpg)

![error line](https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-line.png)

For easier error debugging enable the `showErrorMessage` flag in the options.
This will show a panel with the error message from the shader compiler.

![error panel](https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-panel.png)

## Frag snippet

Create a new .glsl file and type `frag` and hit enter. This will output the base
fragment shader code to get started from.

## Credits

[Markdown Preview](https://github.com/atom/markdown-preview) for the boilerplate
code.

[three.js](http://threejs.org/) for simplifying WebGL.
