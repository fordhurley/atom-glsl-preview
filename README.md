# GLSL Preview package

Live code fragment shaders in the atom editor by using `ctrl-shift-g`.

File types supported: `.glsl` files.

Make sure you install [language-glsl](https://github.com/hughsk/language-glsl)
for syntax highlighting.

![screenshot](https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/screenshot.jpg)


## Uniforms

List of default uniforms included. No need to add these into your fragment
shaders.

```glsl
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float iGlobalTime;
```

The variants `u_resolution`, `u_mouse` and `u_time` can also be used to match
the style found in [The Book of Shaders](http://thebookofshaders.com/).


## Shader errors

If the shader can't compile, the tab and line number will subtly highlight in red.

<img width="175" alt="error" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error.jpg">

<img width="375" alt="error line" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-line.png">

If enabled in the package settings, a notification will show the error message:

<img width="461" alt="error notification" src="https://cdn.rawgit.com/fordhurley/atom-glsl-preview/master/assets/error-notification.png">


## Frag snippet

Create a new .glsl file and type `frag` and hit enter. This will output the base
fragment shader code to get started from.


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


## Credits

[Markdown Preview](https://github.com/atom/markdown-preview) for the boilerplate
code.

[three.js](http://threejs.org/) for simplifying WebGL.
