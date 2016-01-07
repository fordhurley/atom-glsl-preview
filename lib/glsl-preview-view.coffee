path = require 'path'
THREE = require '../three.min'

{Emitter, Disposable, CompositeDisposable, File} = require 'atom'
{$, $$$, ScrollView} = require 'atom-space-pen-views'
_ = require 'underscore-plus'
fs = require 'fs-plus'
StatusView = require './status-view'

###
http://stackoverflow.com/questions/18663941/finding-closest-element-without-jquery
###
closest = (el, selector) ->
	matchesFn = undefined
	# find vendor prefix
	[
		'matches'
		'webkitMatchesSelector'
		'mozMatchesSelector'
		'msMatchesSelector'
		'oMatchesSelector'
	].some (fn) ->
		if typeof document.body[fn] == 'function'
			matchesFn = fn
			return true
		false
	# traverse parents
	while el != null
		parent = el.parentElement
		if parent != null and parent[matchesFn](selector)
			return parent
		el = parent
	null

module.exports =
class GlslPreviewView extends ScrollView
	@content: ->
		@div class: 'glsl-preview native-key-bindings', tabindex: -1

	constructor: ({@editorId, @filePath}) ->
		super

		@IS_DESTROYED = false

		@emitter = new Emitter
		@disposables = new CompositeDisposable
		@loaded = false

		# Create the status view
		@statusView = new StatusView()
		@modalPanel = atom.workspace.addModalPanel(item: @statusView.getElement(), visible: false)

		# Setup webgl
		@renderer = new THREE.WebGLRenderer()
		@renderer.setPixelRatio( @_devicePixelRatio() )

		[width, height] = @_getPaneSize()

		@renderer.setSize( width, height )
		@element.appendChild( @renderer.domElement )

		@scene = new THREE.Scene()

		@camera   = new THREE.Camera()
		@camera.position.z = 1

		@clock = new THREE.Clock( true )

		@uniforms = {
			iGlobalTime: { type: "f", value: 1.0 },
			iResolution: { type: "v2", value: new THREE.Vector2() },
			iMouse: { type: "v2", value: new THREE.Vector2() }
		}

		@mesh1 = null
		@mesh2 = null

		@renderShader()
		@_update()

		@element.addEventListener( 'mousemove', @_onMouseMove, false )
		window.addEventListener( 'resize', @_onResize, false )

	renderShader: ( text = null ) ->

		if text? and text.length > 0
			fragShader = @_defaultUniforms() + text
		else
			fragShader = @_fragmentShader()

		material = new THREE.ShaderMaterial( {
			uniforms: @uniforms,
			vertexShader: @_vertexShader()
			fragmentShader: fragShader
		} );

		@mesh2 = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), material )

		@scene.add( @mesh2 )

		setTimeout =>

			if(@mesh2.material.program?.diagnostics? and !@mesh2.material.program.diagnostics.runnable)
				@showError(@mesh2.material.program.diagnostics.fragmentShader.log)
			else
				@hideError()
				@scene.remove( @mesh1 )
				@mesh1 = @mesh2

		, 100

	_getActiveTab: () ->
		$('.tab[data-type="GlslPreviewView"]')

	_getPaneSize: ->
		$el = $(@element)

		paneWidth  = $el.width()
		paneHeight = $el.height()

		width  = if paneWidth < 1 then 500 else paneWidth
		height = if paneHeight < 1 then 500 else paneHeight

		[ width, height ]


	_onResize: ( event ) =>

		[width, height] = @_getPaneSize()

		ratio = @_devicePixelRatio()

		@uniforms.iResolution.value.x = width * ratio
		@uniforms.iResolution.value.y = height * ratio

		@renderer.setSize( width, height )

	_devicePixelRatio: -> window.devicePixelRatio or 1

	_onMouseMove: ( event ) =>

		[width, height] = @_getPaneSize()

		@uniforms.iMouse.value.x = event.offsetX / width
		@uniforms.iMouse.value.y = 1 - (event.offsetY / height)

	_update: =>

		return if @IS_DESTROYED

		requestAnimationFrame( @_update )

		@uniforms.iGlobalTime.value = @clock.getElapsedTime()

		@renderer.render( @scene, @camera )

	_vertexShader: ->
		return [
			'void main() {'
				'gl_Position = vec4( position, 1.0 );'
			'}'
		].join('\n')

	_defaultUniforms: ->
		return [
			'uniform vec2 iResolution;'
			'uniform vec2 iMouse;'
			'uniform float iGlobalTime;'
		].join('\n')

	_fragmentShader: ->
		return [
			@_defaultUniforms()

			'float map(float value, float inMin, float inMax, float outMin, float outMax) {'
				'return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);'
			'}'

			'void main() {'
				'vec2 uv = gl_FragCoord.xy/iResolution.xy;'
				'float aspect = iResolution.x / iResolution.y;'
				'vec3 color = vec3(uv.x,uv.y,0.0);'
				'uv.x *= aspect;'
				'vec2 mouse = vec2(iMouse.xy);'
				'mouse.x *= aspect;'
				'float radius = map(sin(iGlobalTime), -1.0, 1.0, 0.25, 0.3);'
				'if(distance(uv.xy, mouse) < radius){'
					'color.x = 1.0 - color.x;'
					'color.y = 1.0 - color.y;'
				'}'
				'gl_FragColor=vec4(color,1.0);'
			'}'
		].join('\n')

	attached: ->
		return if @isAttached
		@isAttached = true

		$(@element).closest('.pane').addClass('glsl-preview-pane')

		if @editorId?
			@resolveEditor(@editorId)
		else
			if atom.workspace?
				@subscribeToFilePath(@filePath)
			else
				@disposables.add atom.packages.onDidActivateInitialPackages =>
					@subscribeToFilePath(@filePath)

	serialize: ->
		deserializer: 'GlslPreviewView'
		filePath: @getPath() ? @filePath
		editorId: @editorId

	destroy: ->

		@IS_DESTROYED = true

		cancelAnimationFrame( @_update )

		@modalPanel.destroy()

		# remove listeners
		@element.removeEventListener( 'mousemove', @_onMouseMove )
		window.removeEventListener( 'resize', @_onResize )

		# remove all children
		child.remove() for child in @scene.children

		@renderer.domElement.addEventListener('dblclick', null, false) #remove listener to render
		@renderer.domElement = null

		@renderer = null
		@scene    = null

		@element.innerHTML = ''

		@disposables.dispose()

	subscribeToFilePath: (filePath) ->
		@file = new File(filePath)
		@emitter.emit 'did-change-title'
		@handleEvents()
		@renderView()

	resolveEditor: (editorId) ->
		resolve = =>
			@editor = @editorForId(editorId)
			if @editor?
				@emitter.emit 'did-change-title' if @editor?
				@handleEvents()
				@renderView()
			else
				# The editor this preview was created for has been closed so close
				# this preview since a preview cannot be rendered without an editor
				atom.workspace?.paneForItem(this)?.destroyItem(this)

		if atom.workspace?
			resolve()
		else
			@disposables.add atom.packages.onDidActivateInitialPackages(resolve)

	editorForId: (editorId) ->
		for editor in atom.workspace.getTextEditors()
			return editor if editor.id?.toString() is editorId.toString()
		null

	handleEvents: ->
		@disposables.add atom.grammars.onDidAddGrammar => _.debounce((=> @renderView()), 250)
		@disposables.add atom.grammars.onDidUpdateGrammar _.debounce((=> @renderView()), 250)

		changeHandler = =>
			@renderView()

			# TODO: Remove paneForURI call when ::paneForItem is released
			pane = atom.workspace.paneForItem?(this) ? atom.workspace.paneForURI(@getURI())
			if pane? and pane isnt atom.workspace.getActivePane()
				pane.activateItem(this)

		if @file?
			@disposables.add @file.onDidChange(changeHandler)
		else if @editor?
			@disposables.add @editor.getBuffer().onDidStopChanging ->
				changeHandler() if atom.config.get 'glsl-preview.liveUpdate'
			@disposables.add @editor.onDidChangePath => @emitter.emit 'did-change-title'
			@disposables.add @editor.getBuffer().onDidSave ->
				changeHandler() unless atom.config.get 'glsl-preview.liveUpdate'
			@disposables.add @editor.getBuffer().onDidReload ->
				changeHandler() unless atom.config.get 'glsl-preview.liveUpdate'


	renderView: ->
		@_onResize()
		@showLoading() unless @loaded
		@getShaderSource().then (source) => @renderShader(source) if source?

	getShaderSource: ->
		if @file?.getPath()
			@file.read()
		else if @editor?
			Promise.resolve(@editor.getText())
		else
			Promise.resolve(null)

	getTitle: ->
		if @file?
			"#{path.basename(@getPath())} Preview"
		else if @editor?
			"#{@editor.getTitle()} Preview"
		else
			"GLSL Preview"


	getURI: ->
		if @file?
			"glsl-preview://#{@getPath()}"
		else
			"glsl-preview://editor/#{@editorId}"

	getPath: ->
		if @file?
			@file.getPath()
		else if @editor?
			@editor.getPath()

	getGrammar: ->
		# console.log '@editor?.getGrammar()', @editor?.getGrammar()
		@editor?.getGrammar()

	showError: (error) ->
		@_getActiveTab().addClass('shader-compile-error')

		console.log 'error', error

		if atom.config.get 'glsl-preview.showErrorMessage'
			@modalPanel.show()
			@statusView.update "[glsl-preview] <span class='error'>#{error}</span>"

	hideError: (result) ->
		@_getActiveTab().removeClass('shader-compile-error')

		@modalPanel.hide()
		@statusView.update ""

	showLoading: ->
		@loading = true
