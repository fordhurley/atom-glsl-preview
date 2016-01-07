{View} = require 'atom'

module.exports = class StatusView

    constructor: ->

        @element = document.createElement('div')
        @element.classList.add('glsl-preview-status-view')

    update: (text) ->
        # Update the message
        @element.innerHTML = text

    getElement: ->
        @element
