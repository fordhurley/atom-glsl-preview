const path = require("path");
const {Emitter, CompositeDisposable, Disposable} = require("atom");
const {clipboard, nativeImage} = require("electron");
const {dialog} = require("remote");
const fs = require("fs");

const {debounce} = require("underscore");
const interact = require("interactjs");
const glslify = require("glslify");
const {ShaderCanvas} = require("shader-canvas/dist/shader-canvas.umd");

const Config = require("./config");
const translateShaderErrors = require("./translate-shader-errors");

function getActiveTab() {
  return document.querySelector(".tab[data-type=\"GlslPreviewView\"]");
}

function editorForId(editorId) {
  const editors = atom.workspace.getTextEditors();
  return editors.find((editor) => editor.id == editorId); // eslint-disable-line eqeqeq
}

function getFileURI(editorPath, filePath) {
  const dirname = path.dirname(editorPath);
  const absPath = path.resolve(dirname, filePath);
  return `file://${absPath}`;
}

function elementSize(elem) {
  const rect = elem.getBoundingClientRect();
  return [rect.width, rect.height];
}

function shaderSetsPrecision(source) {
  return /^\s*precision\s+\w+\s+float/m.test(source);
}

const precisionPrefix = `
  precision highp float;
`;

function parseTextureDirectives(source) {
  // Looking for lines of the form:
  // uniform sampler2D foo; // ../textures/foo.png
  const re = /^\s*uniform\s+sampler2D\s+(\S+)\s*;\s*\/\/\s*(\S+)\s*$/gm;
  const out = [];
  let match = re.exec(source);
  while (match !== null) {
    const name = match[1];
    const filePath = match[2];
    out.push({name, filePath});
    match = re.exec(source);
  }
  return out;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => { resolve(img); };
    img.onerror = reject;
    img.onabort = reject;
  });
}

module.exports = class GlslPreviewView {
  constructor({editorId}) {
    this.editorId = editorId;

    this.element = document.createElement("div");
    this.element.classList.add("glsl-preview");
    this.element.classList.add("native-key-bindings");
    this.element.tabIndex = -1;

    this.isDestroyed = false;

    this.emitter = new Emitter();
    this.disposables = new CompositeDisposable();

    this.shaderError = null;
    this.textureError = null;

    this.lastSavePath = null;

    this.markers = [];

    this.source = "";
    this.compiledSource = this.source;

    this.shader = new ShaderCanvas();
    this.element.appendChild(this.shader.domElement);

    this.userSize = {};
    interact(this.shader.domElement).resizable({
      edges: {left: true, right: true, bottom: true, top: true},
      square: Config.constrainToSquare(),
    }).on("resizemove", (event) => {
      const {width, height} = event.rect;
      this.userSize = {width, height};
      this._onResize();
    });

    this._onResize = this._onResize.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._animate = this._animate.bind(this);

    this.animationRequest = window.requestAnimationFrame(this._animate);
    this.disposables.add(new Disposable(() => {
      window.cancelAnimationFrame(this.animationRequest);
    }));
  }

  _onResize() {
    let {width, height} = this.userSize;

    // TODO: always keep it smaller than the element?

    if (!width || !height) {
      [width, height] = elementSize(this.element);
      const defaultSize = Config.defaultSize();
      if (defaultSize > 0) {
        width = Math.min(width, defaultSize);
        height = Math.min(height, defaultSize);
      }
    }

    if (Config.constrainToSquare()) {
      width = Math.min(width, height);
      height = width;
    }

    this.shader.setSize(width, height);
    this.setResolutionUniform();
  }

  _onMouseMove(e) {
    this.setMouseUniform(
        e.offsetX / this.shader.width,
        1 - (e.offsetY / this.shader.height)
    );
  }

  _animate(timestamp) {
    this.animationRequest = window.requestAnimationFrame(this._animate);
    this.setTimeUniform(timestamp / 1000);
    this.shader.render();
  }

  attached() {
    if (this.isAttached) { return; }
    if (this.editorId === null) { return; }
    this.isAttached = true;

    const paneElement = atom.views.getView(atom.workspace.paneForItem(this));
    paneElement.classList.add("glsl-preview-pane");

    this.resolveEditor(this.editorId);
  }

  destroy() {
    if (this.isDestroyed) { return; }
    this.isDestroyed = true;

    this.disposables.dispose();
    this.element.innerHTML = "";
  }

  resolveEditor(editorId) {
    const resolve = () => {
      this.editor = editorForId(editorId);
      if (this.editor) {
        this.emitter.emit("did-change-title", this.getTitle());
        this.subscribeToEvents();
        this._onResize();
        this.updateView();
      } else if (atom.workspace) {
        // The editor this preview was created for has been closed so close
        // this preview since a preview cannot be rendered without an editor
        const pane = atom.workspace.paneForItem(this);
        if (pane) {
          pane.destroyItem(this);
        }
      }
    };

    if (atom.workspace) {
      resolve();
    } else {
      this.disposables.add(atom.packages.onDidActivateInitialPackages(resolve));
    }
  }

  subscribeToEvents() {
    // FIXME: this is only fired for resizing the whole window, not just the panel.
    window.addEventListener("resize", this._onResize, false);
    this.disposables.add(new Disposable(() => {
      window.removeEventListener("resize", this._onResize);
    }));

    this.shader.domElement.addEventListener("mousemove", this._onMouseMove, false);
    this.disposables.add(new Disposable(() => {
      window.removeEventListener("mousemove", this._onMouseMove);
    }));

    this.disposables.add(this.editor.onDidChangePath(() => {
      this.emitter.emit("did-change-title", this.getTitle());
    }));

    this.disposables.add(this.editor.onDidDestroy(() => {
      const pane = atom.workspace.paneForItem(this);
      if (pane) {
        pane.destroyItem(this);
      }
    }));

    const changeHandler = debounce(() => {
      // To handle pane resizes, because the window resize event doesn't fire for that:
      this._onResize();

      this.updateView();

      const pane = atom.workspace.paneForItem(this);
      if (pane && pane !== atom.workspace.getActivePane()) {
        pane.activateItem(this);
      }
    }, 250);

    this.disposables.add(this.editor.getBuffer().onDidSave(changeHandler));
    this.disposables.add(this.editor.getBuffer().onDidReload(changeHandler));

    this.disposables.add(this.editor.getBuffer().onDidStopChanging(() => {
      if (Config.liveUpdate()) {
        changeHandler();
      }
    }));
  }

  updateView() {
    if (this.isDestroyed) { return; }
    if (!this.editor) { return; }
    this.updateShader(this.editor.getText());
  }

  setResolutionUniform() {
    if (this.shader.testUniform("u_resolution")) {
      this.shader.setUniform("u_resolution", this.shader.getResolution());
    }
    if (this.shader.testUniform("iResolution")) {
      this.shader.setUniform("iResolution", this.shader.getResolution());
    }
  }

  setTimeUniform(timeSeconds) {
    if (this.shader.testUniform("u_time")) {
      this.shader.setUniform("u_time", timeSeconds);
    }
    if (this.shader.testUniform("iGlobalTime")) {
      this.shader.setUniform("iGlobalTime", timeSeconds);
    }
  }

  setMouseUniform(x, y) {
    if (this.shader.testUniform("u_mouse")) {
      this.shader.setUniform("u_mouse", [x, y]);
    }
    if (this.shader.testUniform("iMouse")) {
      this.shader.setUniform("iMouse", [x, y]);
    }
  }

  setTextures(textures) {
    if (this.textureError) {
      this.textureError.dismiss();
    }

    const promises = textures.map(({name, filePath}) => {
      const uri = getFileURI(this.getPath(), filePath);
      return loadImage(uri).then((img) => {
        this.shader.setTexture(name, img);
      }).catch(() => {
        if (Config.showErrorMessage()) {
          // TODO: show multiple texture errors
          this.showTextureError({name, filePath});
        }
        // Rethrow to reject Promise.all:
        throw new Error("failed to load texture: " + uri);
      });
    });

    return Promise.all(promises);
  }

  updateShader(source) {
    this.source = source;
    this.compiledSource = source;

    if (!shaderSetsPrecision(this.compiledSource)) {
      this.compiledSource = precisionPrefix + this.compiledSource;
    }

    try {
      this.clearMarkers();
      const basedir = this.getPath();
      this.compiledSource = glslify.compile(this.compiledSource, {
        basedir: basedir ? path.dirname(basedir) : null,
      });
    } catch (e) {
      this.showShaderErrors([{lineNumber: -1, text: `glslify: ${e}`}]);
      return;
    }

    const errs = this.shader.setShader(this.compiledSource); // TODO: check returned errors
    if (errs) {
      this.showShaderErrors(translateShaderErrors(errs, this.source, this.compiledSource));
    } else {
      this.hideShaderErrors();
    }

    this.setResolutionUniform();

    const textures = parseTextureDirectives(this.source);
    this.setTextures(textures).then(() => {
      this.shader.render();
    }).catch((reason) => {
      console.error(reason); // eslint-disable-line no-console
    });
  }

  onDidChangeTitle(callback) {
    return this.emitter.on("did-change-title", callback);
  }

  getTitle() {
    let title = "GLSL";
    if (this.editor) {
      title = this.editor.getTitle();
    }
    return `${title} Preview`;
  }

  getURI() {
    return `glsl-preview://editor/${this.editorId}`;
  }

  getPath() {
    if (this.editor) {
      return this.editor.getPath();
    }
    return null;
  }

  getGrammar() {
    if (this.editor) {
      return this.editor.getGrammar();
    }
    return null;
  }

  showShaderErrors(errors) {
    const tab = getActiveTab();
    if (tab) {
      tab.classList.add("shader-compile-error");
    }

    if (Config.showErrorMessage()) {
      if (this.shaderError) {
        this.shaderError.dismiss();
      }
      const errorOutput = errors.map((error) => error.text).join("\n");
      const opts = {detail: errorOutput, dismissable: true};
      this.shaderError = atom.notifications.addError("Shader error", opts);
    }

    this.clearMarkers();

    this.markers = errors.map((error) => {
      const lineNumber = error.lineNumber;
      const buffer = this.editor.getBuffer();
      const marker = buffer.markRange(buffer.rangeForRow(lineNumber - 1));
      this.editor.decorateMarker(marker, {type: "line-number", class: "glsl-preview-error"});
      return marker;
    });
  }

  hideShaderErrors() {
    getActiveTab().classList.remove("shader-compile-error");

    if (this.shaderError) {
      this.shaderError.dismiss();
      this.shaderError = null;
    }

    this.clearMarkers();
  }

  showTextureError({name, filePath}) {
    // TODO: show error on the line with the texture
    if (this.textureError) {
      this.textureError.dismiss();
    }
    const opts = {detail: filePath, dismissable: true};
    this.textureError = atom.notifications.addError("Error loading texture", opts);
  }

  clearMarkers() {
    this.markers.splice(0, this.markers.length).forEach((marker) => marker.destroy());
  }

  getImage() {
    this.shader.render();
    const dataURL = this.shader.domElement.toDataURL();
    return nativeImage.createFromDataURL(dataURL);
  }

  copyImage() {
    const img = this.getImage();
    clipboard.writeImage(img);
  }

  saveImage() {
    let defaultPath = this.lastSavePath;
    if (!defaultPath) {
      defaultPath = this.getPath();
      const {dir, name} = path.parse(defaultPath);
      defaultPath = path.format({dir, name, ext: ".png"});
    }

    dialog.showSaveDialog({defaultPath}, (filePath) => {
      if (!filePath) { return; }
      this.lastSavePath = filePath;
      const img = this.getImage();
      fs.writeFile(filePath, img.toPNG(), (err) => {
        if (err) { throw err; }
      });
    });
  }
};
