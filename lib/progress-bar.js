module.exports = class ProgressBar {
  constructor() {
    this.domElement = document.createElement("div");
    this.domElement.classList.add("progress-bar");

    this.span = document.createElement("span");
    this.domElement.appendChild(this.span);

    this.setProgress(0);
  }

  setProgress(progress) {
    this.span.style.width = `${(progress * 100).toFixed(0)}%`;
  }
};
