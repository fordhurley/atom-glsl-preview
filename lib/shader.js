const THREE = require("three");
const {debounce, difference} = require("underscore");

function parseLineNumberFromErrorMsg(msg) {
  const match = /ERROR: \d+:(\d+)/.exec(msg);
  let lineNumber = null;
  if (match && match[1]) {
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

module.exports = class Shader {
  constructor({buildTextureURL}) {
    if (typeof buildTextureURL !== "function") {
      throw new Error("missing required argument: buildTextureURL(filePath)");
    }
    this.buildTextureURL = buildTextureURL;

    this.onShaderLoad = null;
    this.onShaderError = null;
    this.onTextureLoad = null;
    this.onTextureError = null;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(devicePixelRatio());
    this.domElement = this.renderer.domElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer.render(this.scene, this.camera);

    this.clock = new THREE.Clock(true);

    this.uniforms = {
      iGlobalTime: {value: 0},
      iResolution: {value: new THREE.Vector2()},
      iMouse: {value: new THREE.Vector2()},
      u_time: {value: 0},
      u_resolution: {value: new THREE.Vector2()},
      u_mouse: {value: new THREE.Vector2()},
    };

    this.textures = [];

    this.mesh = null;
    this.geometry = new THREE.PlaneBufferGeometry(2, 2);

    this.swapMesh = debounce(this.swapMesh.bind(this), 250);

    this.renderer.domElement.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    // Don't need to remove this, because we'll just remove the element.

    this._update = this._update.bind(this);
    requestAnimationFrame(this._update);
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
        if (this.onShaderError) {
          const msg = diagnostics.fragmentShader.log;
          this.onShaderError(msg, parseLineNumberFromErrorMsg(msg));
        }
        tmpMesh.material.dispose();
        this.scene.remove(tmpMesh);
      } else {
        if (this.onShaderLoad) {
          this.onShaderLoad();
        }
        if (this.mesh) {
          // console.log("removing old mesh")
          this.mesh.material.dispose();
          this.scene.remove(this.mesh);
        }
        this.mesh = tmpMesh;
      }
    }, 100);
  }

  setSize(width, height) {
    const dpr = devicePixelRatio();

    this.uniforms.iResolution.value.x = width * dpr;
    this.uniforms.iResolution.value.y = height * dpr;
    this.uniforms.u_resolution.value.x = this.uniforms.iResolution.value.x;
    this.uniforms.u_resolution.value.y = this.uniforms.iResolution.value.y;

    this.renderer.setSize(width, height);
  }

  _onMouseMove() {
    const {width, height} = this.renderer.getSize();

    this.uniforms.iMouse.value.x = event.offsetX / width;
    this.uniforms.iMouse.value.y = 1 - (event.offsetY / height);
    this.uniforms.u_mouse.value.x = this.uniforms.iMouse.value.x;
    this.uniforms.u_mouse.value.y = this.uniforms.iMouse.value.y;
  }

  _update() {
    if (this.IS_DESTROYED) { return; }
    requestAnimationFrame(this._update);
    this.render();
  }

  render() {
    this.uniforms.iGlobalTime.value = this.clock.getElapsedTime();
    this.uniforms.u_time.value = this.uniforms.iGlobalTime.value;

    this.renderer.render(this.scene, this.camera);
  }

  updateShader(source) {
    const parsedTextures = parseTextureDirectives(source);
    const oldTextures = difference(this.textures, parsedTextures);
    const newTextures = difference(parsedTextures, this.textures);
    oldTextures.forEach(texture => this.removeTexture(texture.textureId));
    newTextures.forEach(texture => this.addTexture(texture.filePath, texture.textureId));
    this.fragShader = defaultUniforms + source;
    this.swapMesh();
  }

  addTexture(filePath, textureId) {
    const textureURL = this.buildTextureURL(filePath);

    const onLoad = () => {
      if (this.onTextureLoad) {
        this.onTextureLoad();
      }
      // TODO: might be good to swap the mesh immediately, whether or not it loads
      setTimeout(this.swapMesh, 100);
    };

    const onError = () => {
      if (this.onTextureError) {
        this.onTextureError(textureURL);
      }
    };

    const texture = new THREE.TextureLoader().load(textureURL, onLoad, null, onError);
    this.uniforms[textureId] = {value: texture};
    this.textures.push({textureURL, textureId});
  }

  removeTexture(textureId) {
    // TODO: keep textures in an object
    const index = this.textures.findIndex(tex => tex.textureId === textureId);
    if (index === -1) {
      throw new Error("tried to remove a texture that doesn't exist");
    }
    this.textures.splice(index, 1);

    this.uniforms[textureId].value.dispose();
    this.uniforms[textureId].value.needsUpdate = true;

    delete this.uniforms[textureId];

    this.mesh.material.needsUpdate = true;
  }

  dispose() {
    cancelAnimationFrame(this._update);
    this.domElement = null;

    // TODO: dispose of the THREE stuff
  }
};
