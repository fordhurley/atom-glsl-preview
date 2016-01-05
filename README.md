# GLSL Preview package

Live code fragment shaders in the atom editor by using
`ctrl-shift-g`.

File types supported: `.glsl` files.

Make sure you install [language-glsl](https://github.com/hughsk/language-glsl) for syntax highlighting.

![glsl-preview](https://cdn.rawgit.com/davidpaulrosser/atom-glsl-preview/master/assets/screenshot.jpg)

## Uniforms

List of default uniforms included. No need to add these into your fragment shaders.

```
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float iGlobalTime;
```

## Shader errors

If the shader can't compile then the tab will subtly highlight in red.

![glsl-preview-error](https://cdn.rawgit.com/davidpaulrosser/atom-glsl-preview/master/assets/error.jpg)

For easier error debugging enable the ```showErrorMessage``` flag in the options. This will show a modal with the line the error was caused on.

![glsl-preview-error](https://cdn.rawgit.com/davidpaulrosser/atom-glsl-preview/master/assets/error-modal.jpg)

## Frag snippet

Create a new .glsl file and type frag and hit enter. This will output the base fragment shader code to get started from.

## Credits

[Markdown Preview](https://github.com/atom/markdown-preview) for the boilerplate code.

[three.js](http://threejs.org/) for simplifying WebGL.
