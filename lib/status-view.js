module.exports = class StatusView {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('glsl-preview-status-view');
  }

  update(text) {
    // Update the message
    this.element.innerHTML = text;
  }

  getElement() {
    return this.element;
  }
}
