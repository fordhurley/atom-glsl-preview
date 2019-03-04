const url = require("url");
const {CompositeDisposable, Disposable} = require("atom");

const Config = require("./config");

let GlslPreviewView = null;

function isGlslPreviewView(object) {
  // Deferred loading, as an optimization for package activation:
  if (!GlslPreviewView) {
    GlslPreviewView = require("./glsl-preview-view"); // eslint-disable-line global-require
  }
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

  // Deferred loading, as an optimization for package activation:
  if (!GlslPreviewView) {
    GlslPreviewView = require("./glsl-preview-view"); // eslint-disable-line global-require
  }

  return new GlslPreviewView({editorId: pathname.substring(1)});
}

module.exports = {
  config: Config.schema,

  activate() {
    this.disposables = new CompositeDisposable();

    this.disposables.add(atom.commands.add("atom-workspace", {
      "glsl-preview:toggle": this.toggle.bind(this),
      "glsl-preview:copy-image": this.copyImage.bind(this),
      "glsl-preview:save-image": this.saveImage.bind(this),
      "glsl-preview:save-video": this.saveVideoStream.bind(this),
    }));

    this.disposables.add(atom.workspace.addOpener(opener));
  },

  toggle() {
    const preview = this.getActivePreview();
    if (preview) {
      const pane = atom.workspace.paneForItem(preview);
      pane.destroyItem(preview);
      return;
    }

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return; // TODO: show notification
    }

    const grammars = Config.grammars();
    if (!grammars.includes(editor.getGrammar().scopeName)) {
      return; // TODO: show notification
    }

    this.addPreviewForEditor(editor);
  },

  getActivePreview() {
    const activeItem = atom.workspace.getActivePaneItem();
    if (isGlslPreviewView(activeItem)) {
      return activeItem;
    }

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) { return null; }

    const uri = this.uriForEditor(editor);
    const pane = atom.workspace.paneForURI(uri);
    if (!pane) { return null; }

    return pane.itemForURI(uri);
  },

  uriForEditor(editor) {
    return `glsl-preview://editor/${editor.id}`;
  },

  addPreviewForEditor(editor) {
    this.upgradeCheck();
    const uri = this.uriForEditor(editor);
    const previousActivePane = atom.workspace.getActivePane();
    const options = {searchAllPanes: true};
    if (Config.openInSplitPane()) {
      options.split = "right";
    }
    atom.workspace.open(uri, options).then((view) => {
      previousActivePane.activate();
      view.attached();
    });
  },

  copyImage() {
    const preview = this.getActivePreview();
    if (!preview) { return; } // TODO: show notification
    preview.copyImage();
  },

  saveImage() {
    const preview = this.getActivePreview();
    if (!preview) { return; } // TODO: show notification
    preview.saveImage();
  },

  saveVideoStream() {
    const preview = this.getActivePreview();
    if (!preview) { return; } // TODO: show notification
    preview.saveVideoStream();
  },

  upgradeCheck() {
    const upgraded = Config.upgrade();
    if (upgraded) {
      // Note that this detects the upgrade from v0 to v1, but having the
      // message say "v1" would be confusing on v2.
      const n = atom.notifications.addSuccess("glsl-preview has been upgraded to v2!", {
        dismissable: true,
        description: "Check out the " +
          "[README](https://github.com/fordhurley/atom-glsl-preview/blob/master/README.md) " +
          "for updated documentation on uniforms, textures, and errors.\n\n" +
          "As always, feedback and bug reports are much appreciated!",
      });
      this.disposables.add(new Disposable(n.dismiss.bind(n)));
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
