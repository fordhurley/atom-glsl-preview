happens = require 'happens'

module.exports = class BindingsView
  constructor: ->
    happens @

    @isOpen = false

    @element = document.createElement('div')
    @element.classList.add('glsl-preview-bindings-view')

    @toggleButton = document.createElement('button')
    @toggleButton.innerHTML = 'Textures +'

    @toggleButton.addEventListener('click', @onTextureButtonClicked, false)

    @list = document.createElement('ul')
    @list.classList.add('hide')
    @element.appendChild(@list)
    @element.appendChild(@toggleButton)

  onTextureButtonClicked: =>
    cls  = if @isOpen then 'hide' else 'show'
    symb = if @isOpen then '+' else '-'

    @list.classList.remove('hide', 'show')
    @list.classList.add(cls)

    @toggleButton.innerHTML = "Textures #{symb}"

    @isOpen = !@isOpen

  addTexture: (file, textureId) ->
    li = document.createElement('li')
    li.setAttribute('data-file', file)

    img = document.createElement('img')
    img.setAttribute('src', file)

    li.appendChild(img)

    removeBtn = document.createElement('div')
    removeBtn.innerHTML = 'X'

    li.appendChild(removeBtn)
    @list.appendChild(li)

    li.addEventListener('click', @onTextureClick, false)

  removeTexture: (filePath) ->
    li = document.querySelector('li[data-file="'+filePath+'"]')
    @list.removeChild(li) if li

  onTextureClick: (event) =>
    filePath = event.currentTarget.getAttribute('data-file')
    @emit('removeTexture', filePath)

  destroy: ->
    for li in @list.children
      li.removeEventListener('click', @onTextureClick)

    @element.innerHTML = ''
