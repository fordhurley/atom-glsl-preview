const path = require("path");
const THREE = require("three");
const { Emitter, CompositeDisposable, File } = require("atom"); // eslint-disable-line
const { debounce, difference } = require("underscore");

function parseLineNumberFromErrorMsg(msg) {
  const match = /ERROR: \d+:(\d+)/.exec(msg);
  let lineNumber;
  if (match[1]) {
    lineNumber = parseInt(match[1], 10);
  }
  if (lineNumber !== null) {
    const prologueLines = 107; // lines added before the user's shader code, by us or by THREE
    return lineNumber - prologueLines;
  }
  return null;
}

function parseTextureDirectives(source) {
  // Looking for lines of the form:
  // uniform sampler2D foo; // ../textures/bar.jpg
  const test = /^uniform sampler2D (\S+);\s*\/\/\s*(.+)$/gm;
  const textureDirectives = [];
  let match = test.exec(source);
  while (match !== null) {
    textureDirectives.push({
      textureId: match[1],
      filePath: match[2],
    });
    match = test.exec(source);
  }
  return textureDirectives;
}

function getActiveTab() {
  return document.querySelector(".tab[data-type=\"GlslPreviewView\"]");
}

function editorForId(editorId) {
  const editors = atom.workspace.getTextEditors();
  return editors.find(editor => editor.id && editor.id.toString() === editorId.toString());
}

function getFileURI(editorPath, filePath) {
  const dirname = path.dirname(editorPath);
  const absPath = path.resolve(dirname, filePath);
  return `file://${absPath}`;
}

function devicePixelRatio() {
  return window.devicePixelRatio || 1;
}

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const defaultUniforms = `
  uniform vec2 iResolution;
  uniform vec2 iMouse;
  uniform float iGlobalTime;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
`;

module.exports = class GlslPreviewView {
  constructor({ editorId, filePath }) {
    this.editorId = editorId;
    this.filePath = filePath;

    this.element = document.createElement("div");
    this.element.classList.add("glsl-preview");
    this.element.classList.add("native-key-bindings");
    this.element.tabIndex = -1;

    this.IS_DESTROYED = false;

    this.emitter = new Emitter();
    this.disposables = new CompositeDisposable();
    this.loaded = false;

    this.errorNotification = null;

    // Setup webgl
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(devicePixelRatio());

    const [width, height] = this._getPaneSize();

    this.renderer.setSize(width, height);
    this.element.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer.render(this.scene, this.camera);

    this.clock = new THREE.Clock(true);

    this.uniforms = {
      iGlobalTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
      iMouse: { value: new THREE.Vector2() },
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2() },
      u_mouse: { value: new THREE.Vector2() },
    };

    this.textures = [];

    this.mesh = null;
    this.geometry = new THREE.PlaneBufferGeometry(2, 2);

    this._update = this._update.bind(this);
    this._update();

    this._onMouseMove = this._onMouseMove.bind(this);
    this.element.addEventListener("mousemove", this._onMouseMove, false);

    // FIXME: this is only fired for resizing the whole window, not just the panel
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize, false);
  }

  swapMesh() {
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader: this.fragShader,
    });

    const tmpMesh = new THREE.Mesh(this.geometry, material);

    this.scene.add(tmpMesh);

    setTimeout(() => {
      let diagnostics;
      if (tmpMesh.material.program) {
        diagnostics = tmpMesh.material.program.diagnostics;
      }
      if (diagnostics && !diagnostics.runnable) {
        const msg = diagnostics.fragmentShader.log;
        this.showError(msg, parseLineNumberFromErrorMsg(msg));
        tmpMesh.material.dispose();
        this.scene.remove(tmpMesh);
      } else {
        this.hideError();
        if (this.mesh) {
          // console.log("removing old mesh")
          this.mesh.material.dispose();
          this.scene.remove(this.mesh);
        }
        this.mesh = tmpMesh;
      }
    }, 100);
  }

  _getPaneSize() {
    const rect = this.element.getBoundingClientRect();
    const paneWidth = rect.width;
    const paneHeight = rect.height;

    let width = paneWidth < 1 ? 500 : paneWidth;
    let height = paneHeight < 1 ? 500 : paneHeight;

    const maxSize = atom.config.get("glsl-preview.maxSize");
    if (maxSize > 0) {
      width = Math.min(width, maxSize);
      height = Math.min(height, maxSize);
    }

    return [width, height];
  }

  _onResize() {
    const [width, height] = this._getPaneSize();
    const ratio = devicePixelRatio();

    this.uniforms.iResolution.value.x = width * ratio;
    this.uniforms.iResolution.value.y = height * ratio;
    this.uniforms.u_resolution.value.x = this.uniforms.iResolution.value.x;
    this.uniforms.u_resolution.value.y = this.uniforms.iResolution.value.y;

    this.renderer.setSize(width, height);
  }

  _onMouseMove() {
    const [width, height] = this._getPaneSize();

    this.uniforms.iMouse.value.x = event.offsetX / width;
    this.uniforms.iMouse.value.y = 1 - (event.offsetY / height);
    this.uniforms.u_mouse.value.x = this.uniforms.iMouse.value.x;
    this.uniforms.u_mouse.value.y = this.uniforms.iMouse.value.y;
  }

  _update() {
    if (this.IS_DESTROYED) {
      return;
    }

    requestAnimationFrame(this._update);

    this.uniforms.iGlobalTime.value = this.clock.getElapsedTime();
    this.uniforms.u_time.value = this.uniforms.iGlobalTime.value;

    this.renderer.render(this.scene, this.camera);
  }

  attached() {
    if (this.isAttached) { return; }
    this.isAttached = true;

    const paneElement = atom.views.getView(atom.workspace.paneForItem(this));
    paneElement.classList.add("glsl-preview-pane");

    if (this.editorId !== null) {
      this.resolveEditor(this.editorId);
    } else if (atom.workspace !== null) {
      this.subscribeToFilePath(this.filePath);
    } else {
      this.disposables.add(atom.packages.onDidActivateInitialPackages(() => {
        this.subscribeToFilePath(this.filePath);
      }));
    }
  }

  destroy() {
    this.IS_DESTROYED = true;

    cancelAnimationFrame(this._update);

    // remove listeners
    this.element.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("resize", this._onResize);

    // remove all children
    this.scene.children.forEach((child) => {
      child.parent.remove(child);
    });

    // FIXME: Figure out this mysterious line and comment:
    this.renderer.domElement.addEventListener("dblclick", null, false); // remove listener to render

    this.renderer.domElement = null;

    this.renderer = null;
    this.scene = null;

    this.element.innerHTML = "";

    this.disposables.dispose();
  }

  subscribeToFilePath(filePath) {
    this.file = new File(filePath);
    this.emitter.emit("did-change-title");
    this.handleEvents();
    this.renderView();
  }

  resolveEditor(editorId) {
    const resolve = () => {
      this.editor = editorForId(editorId);
      if (this.editor) {
        this.emitter.emit("did-change-title");
        this.handleEvents();
        this.renderView();
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

  handleEvents() {
    const debouncedRender = debounce(this.renderView.bind(this), 250);
    this.disposables.add(atom.grammars.onDidAddGrammar(debouncedRender));
    this.disposables.add(atom.grammars.onDidUpdateGrammar(debouncedRender));
    this.disposables.add(atom.config.onDidChange("glsl-preview.maxSize", this._onResize));

    const changeHandler = () => {
      this.renderView();

      const pane = atom.workspace.paneForItem(this);
      if (pane && pane !== atom.workspace.getActivePane()) {
        pane.activateItem(this);
      }
    };

    function changeIfLiveUpdate() {
      if (atom.config.get("glsl-preview.liveUpdate")) { changeHandler(); }
    }
    function changeIfNotLiveUpdate() {
      if (!atom.config.get("glsl-preview.liveUpdate")) { changeHandler(); }
    }

    if (this.file) {
      this.disposables.add(this.file.onDidChange(changeHandler));
    } else if (this.editor) {
      this.disposables.add(this.editor.getBuffer().onDidStopChanging(changeIfLiveUpdate));
      this.disposables.add(this.editor.onDidChangePath(() => this.emitter.emit("did-change-title")));
      this.disposables.add(this.editor.getBuffer().onDidSave(changeIfNotLiveUpdate));
      this.disposables.add(this.editor.getBuffer().onDidReload(changeIfNotLiveUpdate));
    }
  }

  renderView() {
    this._onResize();
    if (!this.loaded) {
      this.showLoading();
    }
    this.getShaderSource().then(this.updateShader.bind(this));
  }

  getShaderSource() {
    if (this.file && this.file.getPath()) {
      return this.file.read();
    } else if (this.editor) {
      return Promise.resolve(this.editor.getText());
    }
    return Promise.resolve(null);
  }

  updateShader(source) {
    if (source !== null && source.length > 0) {
      const parsedTextures = parseTextureDirectives(source);
      const oldTextures = difference(this.textures, parsedTextures);
      const newTextures = difference(parsedTextures, this.textures);
      oldTextures.forEach(texture => this.removeTexture(texture.textureId));
      newTextures.forEach(texture => this.addTexture(texture.filePath, texture.textureId));
      this.fragShader = defaultUniforms + source;
    }
    this.swapMesh();
  }

  getTitle() {
    if (this.file) {
      const basename = path.basename(this.getPath());
      return `${basename} Preview`;
    } else if (this.editor) {
      const title = this.editor.getTitle();
      return `${title} Preview`;
    }
    return "GLSL Preview";
  }

  getPath() {
    if (this.file) {
      return this.file.getPath();
    } else if (this.editor) {
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

  showError(error, lineNumber) {
    getActiveTab().classList.add("shader-compile-error");

    if (atom.config.get("glsl-preview.showErrorMessage")) {
      if (this.errorNotification) {
        this.errorNotification.dismiss();
      }
      const opts = { detail: error, dismissable: true };
      this.errorNotification = atom.notifications.addError("Shader compile error", opts);
    }

    if (this.marker) {
      this.marker.destroy();
    }
    if (lineNumber !== null) {
      const buffer = this.editor.getBuffer();
      this.marker = buffer.markRange(buffer.rangeForRow(lineNumber - 1));
      this.editor.decorateMarker(this.marker, { type: "line-number", class: "glsl-preview-error" });
    }
  }

  hideError() {
    getActiveTab().classList.remove("shader-compile-error");

    if (this.errorNotification) {
      this.errorNotification.dismiss();
      this.errorNotification = null;
    }

    if (this.marker) {
      this.marker.destroy();
    }
  }

  showLoading() {
    this.loading = true;
  }

  addTexture(filePath, textureId) {
    const fileURI = getFileURI(this.getPath(), filePath);

    const success = () => {
      setTimeout(() => {
        this.swapMesh();
      }, 100);
    };

    const error = (err) => {
      // TODO: show error
      console.warn("[glsl-preview] texture couldnt load:", err); // eslint-disable-line
    };

    const texture = new THREE.TextureLoader().load(fileURI, success, error);
    this.uniforms[textureId] = { value: texture };
    this.textures.push({ filePath, textureId });
  }

  removeTexture(textureId) {
    const index = this.textures.findIndex(tex => tex.textureId === textureId);
    if (index === -1) {
      throw new Error("tried to remove a texture that doesn't exist");
    }
    this.textures.splice(index, 1);

    this.uniforms[textureId].value.dispose();
    this.uniforms[textureId].value.needsUpdate = true;

    delete this.uniforms[textureId];

    this.mesh.material.needsUpdate = true;

    this.swapMesh();
  }
};
