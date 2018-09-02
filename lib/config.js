const packageKey = "glsl-preview";

function copyConfig(fromKey, toKey) {
  let copied = false;
  const configs = atom.config.get(packageKey);
  if (Object.prototype.hasOwnProperty.call(configs, fromKey)) {
    atom.config.unset(`${packageKey}.${fromKey}`);
    atom.config.set(`${packageKey}.${toKey}`, configs[fromKey]);
    copied = true;
  }
  return copied;
}

module.exports = {
  schema: {
    liveUpdate: {
      type: "boolean",
      default: true,
      description: "Live reload the shader when the source changes, without " +
        "requiring the source buffer to be saved. If disabled, the " +
        "shader is re-loaded only when the buffer is saved to disk.",
    },
    showErrorMessage: {
      type: "boolean",
      default: true,
      description: "Show shader error notifications.",
    },
    openInSplitPane: {
      type: "boolean",
      default: true,
      description: "Open the preview in a split pane. If disabled, the preview " +
        "is opened in a new tab in the same pane.",
    },
    defaultSize: {
      type: "number",
      default: 0,
      description: "Default size for the preview (width and height). Leave " +
        "blank to fill the pane.",
    },
    constrainToSquare: {
      type: "boolean",
      default: true,
      description: "Maintain a square aspect ratio for the preview instead of " +
        "filling the pane completely.",
    },
    grammars: {
      type: "array",
      default: [
        "source.glsl",
        "text.plain.null-grammar",
      ],
      description: "List of scopes for languages for which previewing is " +
        "enabled. See [this README](https://github.com/atom/spell-check#spell-check-package-) " +
        "for more information on finding the correct scope for a specific language.",
    },
    includeDefaultUniforms: {
      type: "boolean",
      default: true,
      description: "Include default uniforms as part of the shader so they " +
        "don't have to be declared manually.",
    },
  },

  liveUpdate() {
    return atom.config.get(`${packageKey}.liveUpdate`);
  },

  showErrorMessage() {
    return atom.config.get(`${packageKey}.showErrorMessage`);
  },

  openInSplitPane() {
    return atom.config.get(`${packageKey}.openInSplitPane`);
  },

  defaultSize() {
    return atom.config.get(`${packageKey}.defaultSize`);
  },

  constrainToSquare() {
    return atom.config.get(`${packageKey}.constrainToSquare`);
  },

  grammars() {
    return atom.config.get(`${packageKey}.grammars`) || [];
  },

  includeDefaultUniforms() {
    return atom.config.get(`${packageKey}.includeDefaultUniforms`);
  },

  upgrade() {
    copyConfig("maxSize", "defaultSize"); // This change happened post-v1, so ignore the return value
    const upgraded = copyConfig("openPreviewInSplitPane", "openInSplitPane");
    return upgraded;
  },
};
