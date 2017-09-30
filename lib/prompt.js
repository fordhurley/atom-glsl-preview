const {TextEditor} = require("atom");

// Mostly stolen from https://github.com/kgrossjo/atom-man/blob/60a3c69b/lib/man-view.js

module.exports = class Prompt {
  constructor() {
    this.miniEditor = new TextEditor({mini: true});

    this.message = document.createElement("div");
    this.message.classList.add("message");

    this.element = document.createElement("div");
    this.element.appendChild(this.miniEditor.element);
    this.element.appendChild(this.message);

    this.panel = atom.workspace.addModalPanel({
      item: this,
      visible: false,
    });

    // TODO: CompositeDisposable
    atom.commands.add(this.miniEditor.element, "core:confirm", this.confirm.bind(this));
    atom.commands.add(this.miniEditor.element, "core:cancel", this.cancel.bind(this));

    this.resolve = null;
    this.reject = null;
  }

  cancel() {
    this.close();
    if (this.reject) {
      this.reject("canceled");
      this.reject = null;
      this.resolve = null;
    }
  }

  close() {
    if (!this.panel.isVisible()) return;
    this.miniEditor.setText("");
    this.panel.hide();
    if (this.miniEditor.element.hasFocus()) {
      this.restoreFocus();
    }
  }

  confirm() {
    const value = this.miniEditor.getText();
    this.close();
    this.resolve(value);
    this.resolve = null;
    this.reject = null;
  }

  storeFocusedElement() {
    this.previouslyFocusedElement = document.activeElement;
    return this.previouslyFocusedElement;
  }

  restoreFocus() {
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.parentElement) {
      return this.previouslyFocusedElement.focus();
    }
    return atom.views.getView(atom.workspace).focus();
  }

  open(message, placeholder) {
    if (this.panel.isVisible()) { return Promise.reject("already open"); }
    this.storeFocusedElement();
    this.panel.show();
    this.miniEditor.setPlaceholderText(placeholder);
    this.message.textContent = message;
    this.miniEditor.element.focus();
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  destroy() {
    this.element.remove();
  }
};
