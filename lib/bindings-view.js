const happens = require("happens");

module.exports = class BindingsView {
  constructor() {
    happens(this);

    this.isOpen = false;

    this.element = document.createElement("div");
    this.element.classList.add("glsl-preview-bindings-view");

    this.toggleButton = document.createElement("button");
    this.toggleButton.innerHTML = "Textures +";

    this.toggleButton.addEventListener("click", this.onTextureButtonClicked.bind(this), false);

    this.list = document.createElement("ul");
    this.list.classList.add("hide");
    this.element.appendChild(this.list);
    this.element.appendChild(this.toggleButton);
  }

  onTextureButtonClicked() {
    const cls = this.isOpen ? "hide" : "show";
    const symb = this.isOpen ? "+" : "-";

    this.list.classList.remove("hide", "show");
    this.list.classList.add(cls);

    this.toggleButton.innerHTML = `Textures ${symb}`;

    this.isOpen = !this.isOpen;
  }

  addTexture(file) { // TODO: accept textureId argument
    const li = document.createElement("li");
    li.setAttribute("data-file", file);

    const img = document.createElement("img");
    img.setAttribute("src", file);

    li.appendChild(img);

    const removeBtn = document.createElement("div");
    removeBtn.innerHTML = "X";

    li.appendChild(removeBtn);
    this.list.appendChild(li);

    li.addEventListener("click", this.onTextureClick.bind(this), false);
  }

  removeTexture(filePath) {
    const li = document.querySelector(`li[data-file="${filePath}"]`);
    if (li) {
      this.list.removeChild(li);
    }
  }

  onTextureClick(event) {
    const filePath = event.currentTarget.getAttribute("data-file");
    this.emit("removeTexture", filePath);
  }

  destroy() {
    this.element.removeChild(this.list);
    this.list = null;
    this.element.removeChild(this.toggleButton);
    this.toggleButton = null;
    this.element.innerHTML = "";
  }
};
