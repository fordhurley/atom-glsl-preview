const url = require("url");
const { CompositeDisposable } = require("atom");

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
    this.disposables = new CompositeDisposable();
    this.disposables.add(atom.commands.add("atom-workspace", "glsl-preview:toggle", this.toggle.bind(this)));
    // FIXME: review target for this command
    this.disposables.add(atom.commands.add("atom-workspace", "glsl-preview:copy-image", this.copyImage.bind(this)));
    this.disposables.add(atom.workspace.addOpener(opener));
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
    this.upgradeCheck();
    const uri = this.uriForEditor(editor);
    const previousActivePane = atom.workspace.getActivePane();
    const options = { searchAllPanes: true };
    if (Config.openInSplitPane()) {
      options.split = "right";
    }
    atom.workspace.open(uri, options).then((view) => {
      previousActivePane.activate();
      view.attached();
    });
  },

  copyImage() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) { return; }

    const uri = this.uriForEditor(editor);
    const pane = atom.workspace.paneForURI(uri);
    if (!pane) { return; }

    const preview = pane.itemForURI(uri);
    if (!preview) { return; }

    preview.copyImage();
  },

  upgradeCheck() {
    const upgraded = Config.upgrade();
    if (upgraded) {
      const n = atom.notifications.addSuccess("glsl-preview has been upgraded to v1!", {
        dismissable: true,
        description: `Check out the [README](https://github.com/fordhurley/atom-glsl-preview/blob/master/README.md) for updated documentation on uniforms, textures, and errors.

As always, feedback and bug reports are much appreciated!`,
      });
      this.disposables.add({
        dispose() { n.dismiss(); },
      });
    }
  },

  deactivate() {
    this.disposables.dispose();

    atom.workspace.getPaneItems().forEach((item) => {
      if (isGlslPreviewView(item)) {
        item.destroy();
      }
    });
  },
};
