const url = require("url");

const GlslPreviewView = require("./glsl-preview-view");

function isGlslPreviewView(object) {
  return object instanceof GlslPreviewView;
}

function opener(uriToOpen) {
  let parsedURL;
  try {
    parsedURL = url.parse(uriToOpen);
  } catch (error) {
    return null;
  }

  if (parsedURL.protocol !== "glsl-preview:") {
    return null;
  }

  let pathname = parsedURL.pathname;
  try {
    if (pathname) {
      pathname = decodeURI(pathname);
    }
  } catch (error) {
    return null;
  }

  if (parsedURL.host !== "editor") {
    return null;
  }
  return new GlslPreviewView({ editorId: pathname.substring(1) });
}

module.exports = {
  config: {
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

  activate() {
    // TODO: CompositeDisposable for these?
    atom.commands.add("atom-workspace", "glsl-preview:toggle", this.toggle.bind(this));

    atom.workspace.addOpener(opener);
  },

  toggle() {
    if (isGlslPreviewView(atom.workspace.getActivePaneItem())) {
      atom.workspace.destroyActivePaneItem();
      return;
    }

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }

    const grammars = atom.config.get("glsl-preview.grammars") || [];
    if (!grammars.includes(editor.getGrammar().scopeName)) {
      return;
    }

    const removed = this.removePreviewForEditor(editor);
    if (!removed) {
      this.addPreviewForEditor(editor);
    }
  },

  uriForEditor(editor) {
    return `glsl-preview://editor/${editor.id}`;
  },

  removePreviewForEditor(editor) {
    const uri = this.uriForEditor(editor);
    const previewPane = atom.workspace.paneForURI(uri);
    if (previewPane) {
      previewPane.destroyItem(previewPane.itemForURI(uri));
      return true;
    }
    return false;
  },

  addPreviewForEditor(editor) {
    const uri = this.uriForEditor(editor);
    const previousActivePane = atom.workspace.getActivePane();
    const options = { searchAllPanes: true };
    if (atom.config.get("glsl-preview.openPreviewInSplitPane")) {
      options.split = "right";
    }
    atom.workspace.open(uri, options).then((view) => {
      this.GlslPreviewView = view;
      if (isGlslPreviewView(this.GlslPreviewView)) {
        previousActivePane.activate();
        this.GlslPreviewView.attached();
      }
    });
  },
};
