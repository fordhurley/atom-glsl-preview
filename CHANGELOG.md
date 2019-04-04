# Unreleased

- [#51](https://github.com/fordhurley/atom-glsl-preview/issues/51): Fix "uniform
  location" error when uniform is defined but unused.

# v2.0.0

- Upgrade shader-canvas to v0.8.0, with no dependency on Threejs, for a much
  smaller package and better performance. NOTE: this may be a breaking change
  for some shaders. In most cases, you can fix your shader by simply declaring
  the uniforms you are using and/or adding precision qualifiers (see the
  examples).

# v1.5.0

- Add constrainToSquare option.
- Remove includeDefaultUniforms option, because shader-canvas can detect this
  pretty well. It might be necessary to add an option or support a `#pragma`
  if auto-detecting doesn't work well enough, but that can be added later.

# v1.4.6

- Upgrade ESLint (Lodash) in response to Github security alert. [CVE-2018-3721](https://nvd.nist.gov/vuln/detail/CVE-2018-3721)

# v1.4.5

- Upgrade dependencies in response to Github security alert. [CVE-2017-16226](https://nvd.nist.gov/vuln/detail/CVE-2017-16226)

# v1.4.4

- Skip that last version of broken shader-canvas as well.

# v1.4.3 [broken]

- Update shader-canvas to skip version that doesn't use node-style exports.

# v1.4.2

- More accurate line numbers in error messages, even when using glslify.

# v1.4.1

- Fixed a bug where the preview wouldn't activate for the first editor.
- Previous shader isn't removed if the new shader has errors.

# v1.4.0

- Make default uniforms optional. (@andystanton)
- Better shader error handling. (@andystanton)

# v1.3.0

- Add glslify support.

# v1.2.3

- Fixed an event listener leak in shader-canvas.

# v1.2.2

- Optimize activation time.
- Extracted [shader-canvas](https://github.com/fordhurley/shader-canvas).

# v1.2.1

- Fixed an exception when shader error doesn't contain a line number.

# v1.2.0

- Close the preview when the editor closes.
- Center the preview canvas.
- Resize the canvas by dragging the edges.
- Simpler line number error indicator.

# v1.1.0

- Added commands to copy and save still images of previews.
- Fixed preview tab titles updating.

# v1.0.0

- Load textures by specifying file path in comments.
- Removed texture loading via commands or menus.
- Show shader errors as notifications.
- Rewritten in Javascript.
- Added examples. (@mysteryDate)

# v0.16.0

- Added Book of Shaders style uniforms as aliases. (@mysteryDate)
- Added max size config to limit the size of the preview.
- Highlight the line with the error.

# v0.15.0

- Fixed treeView.serialize error.
