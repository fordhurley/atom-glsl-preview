const ProgressBar = require("./progress-bar");

module.exports = class StatusOverlay {
  constructor() {
    this.domElement = document.createElement("div");
    this.domElement.classList.add("status-overlay");

    this.progressBar = new ProgressBar();
    this.domElement.appendChild(this.progressBar.domElement);

    this.message = document.createElement("div");
    this.message.classList.add("message");
    this.domElement.appendChild(this.message);
  }

  setMessage(message) {
    this.message.textContent = message;
  }

  setProgress(progress) {
    this.progressBar.setProgress(progress);
  }
};
