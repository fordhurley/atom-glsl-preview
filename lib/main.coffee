url = require 'url'
fs = require 'fs-plus'

GlslPreviewView = null # Defer until used

createGlslPreviewView = (state) ->
	GlslPreviewView ?= require './glsl-preview-view'
	new GlslPreviewView(state)

isGlslPreviewView = (object) ->
	GlslPreviewView ?= require './glsl-preview-view'
	object instanceof GlslPreviewView

module.exports =
	config:
		liveUpdate:
			type: 'boolean'
			default: true
			description: 'Live reload the shader when the source changes, without requiring the source buffer to be saved. If disabled, the shader is re-loaded only when the buffer is saved to disk.'
		openPreviewInSplitPane:
			type: 'boolean'
			default: true
			description: 'Open the preview in a split pane. If disabled, the preview is opened in a new tab in the same pane.'
		grammars:
			type: 'array'
			default: [
				'source.glsl'
				'text.plain.null-grammar'
			]
			description: 'List of scopes for languages for which previewing is enabled. See [this README](https://github.com/atom/spell-check#spell-check-package-) for more information on finding the correct scope for a specific language.'

	activate: ->
		atom.deserializers.add
			name: 'GlslPreviewView'
			deserialize: (state) ->
				if state.editorId or fs.isFileSync(state.filePath)
					createGlslPreviewView(state)

		atom.commands.add 'atom-workspace',
			'glsl-preview:toggle': =>
				@toggle()

		previewFile = @previewFile.bind(this)
		atom.commands.add '.tree-view .file .name[data-name$=\\.glsl]', 'glsl-preview:preview-file', previewFile

		atom.workspace.addOpener (uriToOpen) ->
			try
				{protocol, host, pathname} = url.parse(uriToOpen)
			catch error
				return

			return unless protocol is 'glsl-preview:'

			try
				pathname = decodeURI(pathname) if pathname
			catch error
				return

			if host is 'editor'
				createGlslPreviewView(editorId: pathname.substring(1))
			else
				createGlslPreviewView(filePath: pathname)

		@toggle()

	toggle: ->

		if isGlslPreviewView(atom.workspace.getActivePaneItem())
			atom.workspace.destroyActivePaneItem()
			return

		editor = atom.workspace.getActiveTextEditor()
		return unless editor?

		grammars = atom.config.get('glsl-preview.grammars') ? []

		return unless editor.getGrammar().scopeName in grammars

		@addPreviewForEditor(editor) unless @removePreviewForEditor(editor)

	uriForEditor: (editor) ->
		"glsl-preview://editor/#{editor.id}"

	removePreviewForEditor: (editor) ->
		uri = @uriForEditor(editor)
		previewPane = atom.workspace.paneForURI(uri)
		if previewPane?
			previewPane.destroyItem(previewPane.itemForURI(uri))
			true
		else
			false

	addPreviewForEditor: (editor) ->
		uri = @uriForEditor(editor)
		previousActivePane = atom.workspace.getActivePane()
		options =
			searchAllPanes: true
		if atom.config.get('glsl-preview.openPreviewInSplitPane')
			options.split = 'right'
		atom.workspace.open(uri, options).then (GlslPreviewView) ->
			if isGlslPreviewView(GlslPreviewView)
				previousActivePane.activate()

	previewFile: ({target}) ->

		filePath = target.dataset.path
		return unless filePath

		for editor in atom.workspace.getTextEditors() when editor.getPath() is filePath
			@addPreviewForEditor(editor)
			return

		atom.workspace.open "glsl-preview://#{encodeURI(filePath)}", searchAllPanes: true
