const packageKey = "glsl-preview";

module.exports = {
  schema: {
    liveUpdate: {
      type: "boolean",
      default: true,
      description: "Live reload the shader when the source changes, without requiring the source buffer to be saved. If disabled, the shader is re-loaded only when the buffer is saved to disk.",
    },
    showErrorMessage: {
      type: "boolean",
      default: true,
      description: "Show shader error notifications.",
    },
    openPreviewInSplitPane: {
      type: "boolean",
      default: true,
      description: "Open the preview in a split pane. If disabled, the preview is opened in a new tab in the same pane.",
    },
    maxSize: {
      type: "number",
      default: 0,
      description: "Maximum size for the preview (width and height). Leave blank to fill the split pane.",
    },
    grammars: {
      type: "array",
      default: [
        "source.glsl",
        "text.plain.null-grammar",
      ],
      description: "List of scopes for languages for which previewing is enabled. See [this README](https://github.com/atom/spell-check#spell-check-package-) for more information on finding the correct scope for a specific language.",
    },
  },

  liveUpdate() {
    return atom.config.get(`${packageKey}.liveUpdate`);
  },

  showErrorMessage() {
    return atom.config.get(`${packageKey}.showErrorMessage`);
  },

  openPreviewInSplitPane() {
    return atom.config.get(`${packageKey}.openPreviewInSplitPane`);
  },

  maxSize() {
    return atom.config.get(`${packageKey}.maxSize`);
  },

  onDidChangeMaxSize(callback) {
    return atom.config.onDidChange(`${packageKey}.maxSize`, callback);
  },

  grammars() {
    return atom.config.get(`${packageKey}.grammars`) || [];
  },
};
