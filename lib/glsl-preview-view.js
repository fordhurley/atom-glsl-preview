const path = require("path");
const {Emitter, CompositeDisposable, Disposable} = require("atom");
const {clipboard, nativeImage} = require("electron");
const {dialog} = require("remote");
const fs = require("fs");

const {debounce} = require("underscore");
const {ffmpeg} = require("ffmpeg-stream");
const glslify = require("glslify");
const interact = require("interactjs");
const ShaderCanvas = require("shader-canvas");

const Config = require("./config");
const Prompt = require("./prompt");

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

function elementSize(elem) {
  const rect = elem.getBoundingClientRect();
  return [rect.width, rect.height];
}

module.exports = class GlslPreviewView {
  constructor({editorId}) {
    this.editorId = editorId;

    this.element = document.createElement("div");
    this.element.classList.add("glsl-preview");
    this.element.classList.add("native-key-bindings");
    this.element.tabIndex = -1;

    this.IS_DESTROYED = false;

    this.emitter = new Emitter();
    this.disposables = new CompositeDisposable();

    this.shaderError = null;
    this.textureError = null;

    this.lastSavePath = null;

    this.shader = new ShaderCanvas();
    this.shader.buildTextureURL = filePath => getFileURI(this.getPath(), filePath);
    this.shader.onShaderLoad = this.hideError.bind(this);
    this.shader.onShaderError = this.showError.bind(this);
    this.shader.onTextureLoad = () => {
      // TODO: make errors not dismissable, relying on the error indicator in the editor
      if (this.textureError) {
        this.textureError.dismiss();
      }
    };
    this.shader.onTextureError = (textureURL) => {
      // TODO: set error on the line number of the texture
      if (Config.showErrorMessage()) {
        if (this.textureError) {
          this.textureError.dismiss();
        }
        const opts = {detail: textureURL, dismissable: true};
        this.textureError = atom.notifications.addError("Error loading texture", opts);
      }
    };
    this.element.appendChild(this.shader.domElement);
    this.disposables.add(this.shader);

    this.prompt = new Prompt();

    this.userSize = {};
    interact(this.shader.domElement).resizable({
      edges: {left: true, right: true, bottom: true, top: true},
    }).on("resizemove", (event) => {
      const {width, height} = event.rect;
      this.userSize = {width, height};
      this._onResize();
    });

    this._onResize = this._onResize.bind(this);
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

    this.shader.setSize(width, height);
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
    if (this.IS_DESTROYED) { return; }
    this.IS_DESTROYED = true;

    this.prompt.destroy();

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

  subscribeToEvents() {
    // FIXME: this is only fired for resizing the whole window, not just the panel.
    window.addEventListener("resize", this._onResize, false);
    this.disposables.add(new Disposable(() => {
      window.removeEventListener("resize", this._onResize);
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

      this.renderView();

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

  renderView() {
    if (this.IS_DESTROYED) { return; }
    this.getShaderSource().then(this.updateShader.bind(this));
  }

  getShaderSource() {
    if (this.editor) {
      return Promise.resolve(this.editor.getText());
    }
    return Promise.resolve(null);
  }

  updateShader(source) {
    let compiledSource;

    try {
      compiledSource = glslify.compile(source, {
        basedir: path.dirname(this.getPath()),
      });
    } catch (e) {
      this.showError(`glslify: ${e}`, null);
      return;
    }

    this.shader.setShader(compiledSource);
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

  showError(error, lineNumber) {
    const tab = getActiveTab();
    if (tab) {
      tab.classList.add("shader-compile-error");
    }

    if (Config.showErrorMessage()) {
      if (this.shaderError) {
        this.shaderError.dismiss();
      }
      const opts = {detail: error, dismissable: true};
      this.shaderError = atom.notifications.addError("Shader error", opts);
    }

    if (this.marker) {
      this.marker.destroy();
    }
    if (lineNumber !== null) {
      const buffer = this.editor.getBuffer();
      this.marker = buffer.markRange(buffer.rangeForRow(lineNumber - 1));
      this.editor.decorateMarker(this.marker, {type: "line-number", class: "glsl-preview-error"});
    }
  }

  hideError() {
    getActiveTab().classList.remove("shader-compile-error");

    if (this.shaderError) {
      this.shaderError.dismiss();
      this.shaderError = null;
    }

    if (this.marker) {
      this.marker.destroy();
    }
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

  getSavePath(extension, callback) {
    let defaultPath = this.lastSavePath;
    if (!defaultPath) {
      if (this.editor) {
        defaultPath = this.editor.getPath();
      }
    }
    const {dir, name} = path.parse(defaultPath);
    defaultPath = path.format({dir, name, ext: extension});

    dialog.showSaveDialog({defaultPath}, (filePath) => {
      if (!filePath) { return; }
      this.lastSavePath = filePath;
      callback(filePath);
    });
  }

  saveImage() {
    this.getSavePath(".png", (filePath) => {
      if (!filePath) { return; }
      const img = this.getImage();
      fs.writeFile(filePath, img.toPNG(), (err) => {
        if (err) { throw err; }
      });
    });
  }

  recordVideoStream(seconds, framesPerSecond) {
    this.getSavePath(".mp4", (outputPath) => {
      const pausedAtStart = this.shader.paused;
      this.shader.paused = true;

      const encoder = ffmpeg();
      const frameStream = encoder.input({
        f: "image2pipe",
        vcodec: "mjpeg",
        framerate: framesPerSecond,
      });

      encoder.output(outputPath, {
        f: "mp4",
        r: framesPerSecond,
        y: true, // overwrite
      });

      const numFrames = Math.ceil(seconds * framesPerSecond);
      let frameNum = 0;

      const estimatedEncodingSecondsPerFrame = 0.2; // TODO: auto adjust based on history?
      const estimatedSeconds = estimatedEncodingSecondsPerFrame * numFrames;
      const startTimeSeconds = performance.now() / 1000;

      let renderTimeout;

      const renderFrame = () => {
        this.shader.setTime(frameNum / framesPerSecond);
        this.shader.render();
        frameStream.write(this.getImage().toJPEG(85));
        frameNum += 1;
        if (frameNum < numFrames) {
          renderTimeout = setTimeout(renderFrame, 0);
        } else {
          frameStream.end();
        }
      };

      renderTimeout = setTimeout(renderFrame, 0);

      atom.notifications.addInfo("Recording video", {
        detail: estimatedSeconds > 20 ? "This could take a while..." : null,
        dismissable: false,
      });

      encoder.run().then(() => {
        const elapsedSeconds = (performance.now() / 1000) - startTimeSeconds;
        const n = atom.notifications.addSuccess("Video saved", {
          detail: `Saved to: ${outputPath} in ${elapsedSeconds.toFixed(2).replace(/\.?0*$/, "")} seconds.`,
          dismissable: true,
        }); // TODO: dispose?
        this.disposables.add(new Disposable(n.dismiss.bind(n)));
      }).error((e) => {
        clearTimeout(renderTimeout);
        const opts = {
          detail: e,
          dismissable: true,
        };
        if (e.message === "spawn ffmpeg ENOENT") {
          opts.detail = "ffmpeg not found, is it installed?";
        }
        const n = atom.notifications.addError("Video recording failed", opts);
        this.disposables.add(new Disposable(n.dismiss.bind(n)));
      }).finally(() => {
        if (!pausedAtStart) {
          // We could unpause this as soon as we're finished recording, but I kind
          // of like the subtle feedback that you get from seeing that the shader
          // is still paused, helping to enforce that glsl-preview is busy while
          // it encodes your video.
          this.shader.togglePause();
        }
      });
    });
  }

  saveVideoStream() {
    const defaultDuration = "2";
    const message = "Enter video duration in seconds";
    this.prompt.open(message, defaultDuration).then((value) => {
      const durationString = value || defaultDuration;
      const duration = parseFloat(durationString);
      if (isNaN(duration)) {
        const n = atom.notifications.addError("Unable to parse duration", {
          detail: "Duration should be a float in seconds.",
          dismissable: true,
        });
        this.disposables.add(new Disposable(n.dismiss.bind(n)));
        return;
      }
      this.recordVideoStream(duration, 60);
    });
  }
};
