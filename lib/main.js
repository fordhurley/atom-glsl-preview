const url = require("url");

const GlslPreviewView = require("./glsl-preview-view");
const Config = require("./config");

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
  config: Config.schema,

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

    const grammars = Config.grammars();
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
    if (Config.openPreviewInSplitPane()) {
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
