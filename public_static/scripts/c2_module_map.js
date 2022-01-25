class C2Module_Map extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{

		})

		this.c2.on('can-register-component', ()=>{
			this.c2.registerComponent('map-view', {
				template: `<div class="map_view" style="height: 100%; width: 100%">
					<module-enableable :name="'map'" style="height: 100%; width: 100%">
						<div class="controls">

						</div>
						<map-2d/>
					</module-enableable>
				</div>`
			})

			this.c2.registerComponent('map-2d', {
				data: function (){
					return {
						map: undefined,
						playerMarkers: [],
						vehicleMarkers: [],

						currentInfoComponent: undefined,
						currentInfoData: undefined,
						currentInfoDataId: undefined,
						currentInfoStyle: undefined
					}
				},
				computed: {
					livePlayers (){
						return this.$store.getters.livePlayers
					},
					liveVehicles (){
						return this.$store.getters.liveVehicles
					}
				},
				template: `<div class="map_2d">
					<component v-if="currentInfoComponent" :is="currentInfoComponent" :data="currentInfoData" :data-id="currentInfoDataId" :style="currentInfoStyle" @close="hideInfo"/>
				</div>`,
				methods: {
					refreshLivePlayers (){
						this.log('refreshLivePlayers', this.livePlayers)

						for(let marker of this.playerMarkers){
							map.removeMarker(marker)
						}

						for(let p of Object.keys(this.livePlayers)){
							let player = this.livePlayers[p]
							if(player.x && player.y){
								let marker = this.map.createMarker(player.x, player.y, 'map_player.png', 30, player.name, '#36BCFF')
								this.playerMarkers.push(marker)

								marker.on('click', (pos)=>{
									this.log('clicked player marker', player)
									this.clickPlayer(player, p, pos.x, pos.y)
								})
							}
						}

					},
					refreshLiveVehicles (){
						this.log('refreshLiveVehicles', this.liveVehicles)

						for(let marker of this.vehicleMarkers){
							this.map.removeMarker(marker)
						}

						for(let v of Object.keys(this.liveVehicles)){
							let vehicle = this.liveVehicles[v]
							if(vehicle.x && vehicle.y){
								let marker = this.map.createMarker(vehicle.x, vehicle.y, 'map_vehicle.png', 30, vehicle.name, '#FF7E33')
								this.vehicleMarkers.push(marker)

								marker.on('click', (pos)=>{
									this.log('clicked vehicle marker', vehicle)
									this.clickVehicle(vehicle, v, pos.x, pos.y)
								})
							}
						}

					},
					showInfo (type, data, dataId, pageX, pageY){
						this.log('showInfo', type)
						this.debug(data, pageX, pageY)
						this.currentInfoComponent = 'map-view-info-' + type
						this.currentInfoData = data
						this.currentInfoDataId = dataId
						this.currentInfoStyle = 'top: ' + pageY +'px; left: ' + pageX + 'px;'
					},
					hideInfo (){
						this.log('hideInfo')
						this.currentInfoComponent = undefined
						this.currentInfoData = undefined
						this.currentInfoStyle = undefined
					},
					clickPlayer (player, id, pageX, pageY){
						this.showInfo('player', player, id, pageX, pageY)
					},
					clickVehicle (vehicle, id, pageX, pageY){
						this.showInfo('vehicle', vehicle, id, pageX, pageY)
					}
				},
				mounted: function (){
					this.map = new C2CanvasMap(loglevel, this.$el, '/static/tiles/', '/static/icons/')

					this.refreshLivePlayers()
					this.refreshLiveVehicles()
				},
				watch: {
					livePlayers (){
						this.refreshLivePlayers()
					},
					liveVehicles (){
						this.refreshLiveVehicles()
					}
				}
			})

			this.c2.registerComponent('map-view-info', {
				emits: ['close'],
				props: {
					title: {
						type: String,
						required: true
					}
				},
				template: `<div class="map_view_info">
					<div class="title">{{title}}<icon :icon="'x-mark'" class="close" @click="$emit('close')"/></div>
					<slot/>
				</div>`
			})

			this.c2.registerComponent('map-view-info-player', {
				emits: ['close'],
				props: {
					data: {
						type: Object,
						required: true
					},
					'data-id': {
						required: true
					}
				},
				template: `<map-view-info class="player" :title="'Player'" @close="$emit('close')">
					<div>Name: {{data.name}}</div>
					<div>GPS: ({{data.x}}, {{data.y}})</div>
					<div>Altitude: {{data.z}}</div>
					<div>Peer Id: {{data.peer_id}}</div>
					<div>SteamId: <steamid :steamid="dataId"/></div>
					<div><confirm-button class="small_button" @click="kick" :disabled="isComponentLocked">Kick</confirm-button></div>
					<div><confirm-button class="small_button" @click="ban" :time="2" :disabled="isComponentLocked">Ban</confirm-button></div>
				</map-view-info>`,
				methods: {
					kick (){
						//TODO implement (requires new command)
						//this.callGameCommand('kickPlayer', this.dataId)
						alert('not implemented')
						this.$emit('close')
					},
					ban (){
						this.callGameCommand('banPlayer', this.dataId)
						this.$emit('close')
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('map-view-info-vehicle', {
				emits: ['close'],
				props: {
					data: {
						type: Object,
						required: true
					},
					'data-id': {
						required: true
					}
				},
				computed: {
					ownerName (){
						return this.$store.state.players[this.data.owner] ? this.$store.state.players[this.data.owner].name : this.data.owner
					}
				},
				template: `<map-view-info class="vehicle" :title="'Vehicle'" @close="$emit('close')">
					<div>Name: {{data.name}}</div>
					<div>GPS: ({{data.x}}, {{data.y}})</div>
					<div>Altitude: {{data.z}}</div>
					<div>Owner: {{ownerName}}</div>
					<div>Vehicle Id: {{dataId}}</div>
					<div><confirm-button class="small_button" @click="despawn" :disabled="isComponentLocked">Despawn</confirm-button></div>
				</map-view-info>`,
				methods: {
					despawn (){
						//TODO implement
						//this.callGameCommand()
						alert('not implemented')
						this.$emit('close')
					}
				},
				mixins: [componentMixin_gameCommand]
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('Map', 'map-o', 'map-view')
		})

		this.c2.on('can-register-messagehandler', ()=>{

		})

		this.c2.on('setup-done', ()=>{

		})
	}
}

class C2CanvasMap extends C2LoggingUtility {

	constructor(loglevel, el, tilesDirectory, iconsDirectory){
		super(loglevel)

		this.container = $(el)

		this.log('container', el)

		this.dom = $('<div>').css({
			position: 'relative',
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			background: '#40535f'
		})

		this.dom.append(
			$('<div class="zoom_hint" style="position: absolute; z-index: 4; top: 0; left: 0; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; background: #fffa; color: #222; font-size: 2em;">Use <span style="font-weight: 800; margin: 0 1em;">ctrl + scroll</span> to zoom</div>').css({
				display: 'flex'
			}).hide()
		)

		this.dom.appendTo(this.container)

		this.offset = {// offset for center of the map (of the canvas)
			x: 0,
			y: 0
		}

		/* zooming */
		this.zoomValue = 1

		this.dom.bind('mousewheel DOMMouseScroll', (evt)=>{
			if(evt.ctrlKey == true){
				evt.preventDefault();
				evt.stopImmediatePropagation()
				this.dom.find('.zoom_hint').hide()

				if(evt.originalEvent instanceof WheelEvent){
					//chrome
					if(evt.originalEvent.deltaY > 0) {
						 this.zoomOut()
					} else {
						this.zoomIn()
					}
				} else {
					if(evt.originalEvent.detail > 0) {
						 this.zoomOut()
					} else {
						this.zoomIn()
					}
				}

			} else {
				this.dom.find('.zoom_hint').fadeIn()
				setTimeout(()=>{
					this.dom.find('.zoom_hint').fadeOut()
				}, 4 * 1000)
			}
		});

		/* dragging */

		this.dragOffset = {
			x: 0,
			y: 0
		}

		this.mouseDown =false
		this.lastMouseDownX = 0
		this.lastMouseDownY = 0

		this.touchDown = false
		this.lastTouches = []

		this.dom.on('mousedown', (evt)=>{
			evt.preventDefault()
			evt.stopImmediatePropagation()
			this.mouseDown = true
			this.lastMouseDownX = evt.pageX
			this.lastMouseDownY = evt.pageY
		})

		this.dom.on('mousemove', (evt)=>{
			if(!this.mouseDown){
				return
			}

			evt.preventDefault()
			evt.stopImmediatePropagation()

			this.dragOffset.x -= this.unzoom(this.lastMouseDownX - evt.pageX)
			this.dragOffset.y -= this.unzoom(this.lastMouseDownY - evt.pageY)

			this.lastMouseDownX = evt.pageX
			this.lastMouseDownY = evt.pageY
			this.requestDraw()
		})

		this.dom.on('mouseup', (evt)=>{
			evt.preventDefault()
			evt.stopImmediatePropagation()
			this.mouseDown = false
			this.lastMouseDownX = 0
			this.lastMouseDownY = 0
		})

		this.dom.on('touchstart', (evt)=>{
			if(evt.touches.length <= 2){
				evt.preventDefault()
				evt.stopImmediatePropagation()
				this.touchDown = true
				this.lastTouches = evt.touches
			}
		})

		this.dom.on('touchmove', (evt)=>{
			if(!this.touchDown){
				return
			}

			if(evt.touches.length === this.lastTouches.length){
				evt.preventDefault()
				evt.stopImmediatePropagation()

				if(evt.touches.length === 1){
					this.dragOffset.x -= this.unzoom(this.lastTouches[0].pageX - evt.touches[0].pageX)
					this.dragOffset.y -= this.unzoom(this.lastTouches[0].pageY - evt.touches[0].pageY)
				} else if (evt.touches.length === 2){
					let oldDeltaX = this.lastTouches[0].pageX - this.lastTouches[1].pageX
					let oldDeltaY = this.lastTouches[0].pageY - this.lastTouches[1].pageY
					let oldDistance = Math.sqrt(oldDeltaX ** 2 + oldDeltaY ** 2)

					let newDeltaX = evt.touches[0].pageX - evt.touches[1].pageX
					let newDeltaY = evt.touches[0].pageY - evt.touches[1].pageY
					let newDistance = Math.sqrt(newDeltaX ** 2 + newDeltaY ** 2)

					this.setZoom(this.zoomValue * (newDistance / oldDistance) )
				}

				this.lastTouches = evt.touches
				this.requestDraw()
			}
		})

		this.dom.on('touchend touchcancel', (evt)=>{
			evt.preventDefault()
			evt.stopImmediatePropagation()
			this.touchDown = false
			this.lastTouches = []
		})

		$(window).on('blur', (evt)=>{
			this.mouseDown = false
			this.lastMouseDownX = 0
			this.lastMouseDownY = 0
			this.touchDown = false
			this.lastTouches = []
		})

		/* clicking markers */
		this.dom.bind('click', (evt)=>{
			evt.preventDefault()
			evt.stopImmediatePropagation()

			let p = {
				x: evt.offsetX,
				y: evt.offsetY
			}

			for(let m of Object.keys(this.markers).reverse()){
				let marker = this.markers[m]
				let markerPos = this.relativePosition(marker.x, marker.y)
				if(p.x >= markerPos.x - marker.iconWidth/2 && p.x <= markerPos.x + marker.iconWidth/2
					&& p.y >= markerPos.y - marker.iconHeight/2 && p.y <= markerPos.y + marker.iconHeight/2){

					marker.dispatch('click', {
						x: evt.pageX,
						y: evt.pageY
					})

					return
				}
			}
		})

		/* markers layer */
		this.canvas = document.createElement('canvas')
		this.canvas.style = 'background: transparent; position: relative; z-index: 2;'
		this.resizeCanvas()
		$(window).on('resize', ()=>{
			this.resizeCanvas()
		})
		this.dom.append(this.canvas)

		this.ctx = this.canvas.getContext('2d')

		this.ctx.font = '1.5em sans-serif'

		this.cachedFontLineHeight = this.calcFontLineHeight(this.ctx.font).height

		this.iconsDirectory = iconsDirectory

		this.markers = []

		/* FPS layer */
		this.timesBetweenDraws = [0]
		this.lastDrawTime = performance.now()

		this.fpsCanvas = document.createElement('canvas')
		this.fpsCanvas.style = 'background: transparent; position: absolute; top: 0; left: 0; z-index: 5;'
		this.fpsCanvas.width = 100
		this.fpsCanvas.height = 50
		this.fpsContext = this.fpsCanvas.getContext('2d')
		this.fpsContext.font = '10px sans-serif'
		this.dom.append(this.fpsCanvas)

		/* map layer */
		this.mapCanvas = document.createElement('canvas')
		this.mapCanvas.style = 'background: url("/static/images/tile_placeholder.png"); position: absolute; top: 0; left: 0; z-index: 1;'
		this.dom.append(this.mapCanvas)

		this.tilemanager = new C2TileManager(loglevel, this, tilesDirectory)

		this.mustDraw = true

		this.queueDraw()
	}

	resizeCanvas(){
		this.canvas.width = this.dom.width()
		this.canvas.height = this.dom.height()
		this.offset = {
			x: this.canvas.width / 2,
			y: this.canvas.height / 2
		}
		this.requestDraw()
	}

	queueDraw(){
		window.requestAnimationFrame(()=>{
			this.draw()
		})
	}

	requestDraw(){
		this.mustDraw = true
	}

	draw(){
		this.drawFpsCanvas()

		if(!this.mustDraw){
			this.queueDraw()
			return
		}

		this.mustDraw = false

		this.timesBetweenDraws.push(performance.now())
		if(this.timesBetweenDraws.length > 5){
			this.timesBetweenDraws.splice(0, 1)
		}

		//clear
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		this.drawMap()

		for(let m of this.markers){
			this.drawMarker(m)
		}

		// crosshair
		this.setStrokeColor('red')
		this.drawLine(this.percentagePosition(0.5,0), this.percentagePosition(0.5,1))
		this.drawLine(this.percentagePosition(0,0.5), this.percentagePosition(1,0.5))

		this.queueDraw()
	}

	drawFpsCanvas(){
		//clear
		this.fpsContext.clearRect(0, 0, this.fpsCanvas.width, this.fpsCanvas.height)

		this.fpsContext.fillStyle = 'yellow'
		this.fpsContext.fillText(Math.floor(this.calcFps()) + 'FPS', 1, 1 + 10)
	}

	drawLine(p1, p2){
		this.ctx.beginPath()
		this.ctx.moveTo(p1.x, p1.y)
		this.ctx.lineTo(p2.x, p2.y)
		this.ctx.closePath()
		this.ctx.stroke()
	}

	drawText(p, text){
		//instead of p being in the bottom left corner of the text, we convert it to top left corner
		this.ctx.fillText(text, p.x, p.y + this.cachedFontLineHeight)
	}

	drawMarker(marker){
		if(typeof marker.x !== 'number' || typeof marker.y !== 'number'){
			return
		}

		let p = this.relativePosition(marker.x, marker.y)

		this.debug('drawMarker', p, marker)

		if(marker.iconImageData){
			this.ctx.putImageData(marker.iconImageData, p.x - marker.iconWidth / 2, p.y - marker.iconHeight/2)
		} else {
			this.setFillColor(marker.labelColor)
			this.ctx.fillRect(p.x - marker.iconWidth/2, p.y - marker.iconHeight/2, marker.iconWidth, marker.iconHeight)
		}

		if(marker.label){
			this.setFillColor(marker.labelColor)
			this.drawText({
				x: p.x + marker.iconWidth/1.5,
				y: p.y - marker.iconHeight/2
			}, marker.label)
		}
	}

	drawMap(){
		let offset = this.relativePosition(0,0)
		this.tilemanager.setPositionAndZoom(offset.x, offset.y, this.zoomValue)
	}

	totalOffset(){
		return {
			x: this.offset.x + this.dragOffset.x,
			y: this.offset.y + this.dragOffset.y
		}
	}

	createMarker(gpsX, gpsY, iconImageName, /* optional */iconWidth, /* optional */label, /* optional */labelColor){
		let marker = new C2CanvasMapMarker(gpsX, gpsY, this.iconsDirectory + iconImageName, iconWidth, label, labelColor)

		marker.on('change', ()=>{
			this.requestDraw()
		})

		this.log('createMarker', gpsX, gpsY, iconImageName, iconWidth, label, labelColor)

		this.markers.push(marker)

		this.requestDraw()

		return marker
	}

	removeMarker(marker){
		for(let i in this.markers){
			if(this.markers[i] === marker){
				this.markers[i].off('change')

				delete this.markers[i]

				this.requestDraw()

				return
			}
		}
	}

	/* please always use this function!! */
	setFont(value){
		this.ctx.font = value
		this.cachedFontLineHeight = this.calcFontLineHeight(value).height
	}

	setFillColor(value){
		this.ctx.fillStyle = value
	}

	setStrokeColor(value){
		this.ctx.strokeStyle = value
	}

	/* from top left, depending on canvas size. 0,0 is top left 0.5,1 is bottom center */
	percentagePosition(x,y){
		return {
			x: this.canvas.width * x,
			y: this.canvas.height * y
		}
	}

	/* from top left, depending on offset, zoom and canvas size. 0,0 is top left canvas.width/2,canvas.height is bottom center */
	relativePosition(x,y){
		return {
			x: this.zoom(x + this.dragOffset.x) + this.offset.x,
			y: this.zoom(y + this.dragOffset.y) + this.offset.y
		}
	}

	/* inverts relativePosition() */
	absolutePosition(x,y){
		return {
			x: this.unzoom(x - this.offset.x) - this.dragOffset.x,
			y: this.unzoom(y - this.offset.y) - this.dragOffset.y
		}
	}

	/* absolute position in em fontsize */
	emPositon(x,y){
		return {
			x: this.cachedFontLineHeight * x,
			y: this.cachedFontLineHeight * y
		}
	}

	/* transform any zoomed length into the length it would have without current zoom */
	unzoom(value){
		return value / this.zoomValue
	}

	/* transform any length into the length it would have whith current zoom */
	zoom(value){
		return value * this.zoomValue
	}

	zoomIn(){
		this.setZoom(this.zoomValue * 1.1)
	}

	zoomOut(){
		this.setZoom(this.zoomValue * 0.9)
	}

	setZoom(value){
		this.zoomValue = value
		this.requestDraw()
	}

	calcFps(){
		let diff = performance.now() - this.timesBetweenDraws[0]

		return this.timesBetweenDraws.length / (diff/1000)
	}

	calcFontLineHeight(font) {
		let text = $('<span>Hg</span>').css({ fontFamily: font });
		let block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');

		let div = $('<div></div>');
		div.append(text, block);

		let body = $('body');
		body.append(div);

		let result = {};

		try {

			block.css({ verticalAlign: 'baseline' });
			result.ascent = block.offset().top - text.offset().top;

			block.css({ verticalAlign: 'bottom' });
			result.height = block.offset().top - text.offset().top;

			result.descent = result.height - result.ascent;
		} catch (ex){
			console.error(ex)
		} finally {
			div.remove();
		}

		return result;
	}
}

class C2CanvasMapMarker extends C2EventManagerAndLoggingUtility {

	/* events:

		on('click', (pageX, pageY)=>{})

		on('change', ()=>{})

	*/

	constructor(absX, absY, /* optional */ iconImageUrl, /* optional */ iconWidth, /* optional */ label, /* optional */ labelColor){
		super()

		this.x = absX
		this.y = absY
		this.iconImageUrl = iconImageUrl
		this.iconWidth = iconWidth || 10
		this.iconHeight = this.iconWidth
		this.label = label || undefined
		this.labelColor = labelColor || 'white'

		if(this.iconImageUrl){
			this.loadImage(this.iconImageUrl)
		}

	}

	loadImage(url){
		let image = new Image

		image.onload = ()=>{
			this.debug('loaded icon image', url)
			this.iconImage = image
			this.iconImageData = this.generateIconImageData(this.iconImage)

			this.dispatch('change')
		}

		image.onerror = (err)=>{
			this.error('unable to load icon image', url, err)
		}

		image.src = url
	}

	generateIconImageData(image){
		let canvas = document.createElement('canvas')
		canvas.width = this.iconWidth
		this.iconHeight = (image.width / image.height) * this.iconWidth
		canvas.height = this.iconHeight

		canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height)

		return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
	}

	setPosition(absX, absY){
		this.x = absX
		this.y = absY
		this.dispatch('change')
	}

	setLabel(label, /* optional */ labelColor){
		this.label = label
		this.labelColor = labelColor || 'white'
		this.dispatch('change')
	}
}

class C2TileManager extends C2LoggingUtility {

	constructor(loglevel, canvasMap, tilesDirectory){
		super(loglevel)

		this.tilesDirectory = tilesDirectory

		/*
			x & y can be negative
		*/
		this.TILE_DEFINITIONS = [{
			name: 'island_33_tile_21.png',
			x: 0,
			y: 0
		},{
			name: 'island_33_tile_22.png',
			x: 500,
			y: 0
		},{
			name: 'island_33_tile_32.png',
			x: 500,
			y: 500
		}]

		//Test
		for(let y = 0; y < 10; y++){
			for(let x = 0; x < 20; x++){
				this.TILE_DEFINITIONS.push({
					name: 'island_33_tile_32.png',
					x: 500 + x * 500,
					y: 1000 + y * 500
				})
			}
		}

		this.tiles = []
		this.allTilesLoaded = false

		this.imagesContainer = $('<div>').hide()
		canvasMap.dom.append(this.imagesContainer)

		this.canvas = canvasMap.mapCanvas
		this.canvas.width = 1
		this.canvas.height = 1

		this.tileCanvas = document.createElement('canvas')
		this.tileCanvas.style = 'background: transparent; display: none; position: absolute; bottom: 0; right: 0; z-index: 3;'
		canvasMap.dom.append(this.tileCanvas)

		this.canvasOffset = {
			x: 0,
			y: 0
		}

		this.ctx = this.canvas.getContext('2d')

		for(let t of this.TILE_DEFINITIONS){
			this.addTile(t.name, t.x, t.y, t.name)
		}


		setInterval(()=>{
			if(this.allTilesLoaded){
				return
			}

			for(let tile of this.tiles){
				if(!tile.image){
					return
				}
			}

			this.allTilesLoaded = true
			// all tile images loaded
			this.redrawAllTiles()
		}, 50)
	}

	setPositionAndZoom(offsetX,offsetY, zoom){
		//this.debug('setPositionAndZoom', x, y, zoom)

		$(this.canvas).css({
			width: zoom * this.canvas.width,
			height: zoom * this.canvas.height,
			left: offsetX + this.canvasOffset.x / zoom,
			top: offsetY + this.canvasOffset.y / zoom
		})
	}

	addTile(name, x, y, url){
		this.debug('addTile', name, x, y)

		let tile = {
			name: name,
			x: x,
			y: y,
			url: url
		}

		this.tiles.push(tile)

		this.allTilesLoaded = false

		this.loadTile(tile)
	}

	loadTile(tile){
		let image = new Image

		image.onload = ()=>{
			this.debug('loaded tile', tile.name)
			tile.image = image
			tile.width = image.width
			tile.height = image.height

			this.imagesContainer.append(image)

			this.checkTileBoundaries(tile.x, tile.y, tile.width, tile.height)
		}

		image.onerror = (err)=>{
			this.error('unable to load tile', tile.name, err)
		}

		image.src = this.tilesDirectory + tile.url
	}

	generateTileImageData(tile, image){

		this.tileCanvas.width = tile.width
		this.tileCanvas.height = tile.height

		this.tileCanvas.getContext('2d').drawImage(image, 0, 0)

		let imageData = this.tileCanvas.getContext('2d').getImageData(0, 0, this.tileCanvas.width, this.tileCanvas.height)

		//debug: mark tile border
		this.drawBorderOntoImageDate(imageData, tile.width, tile.height, this.generateRandomColor(), 5)

		return imageData
	}

	drawTile(tile, imageData){


		let x = tile.x + this.canvasOffset.x
		let y = tile.y + this.canvasOffset.y


		this.debug('drawTile', tile, x, y)

		this.ctx.putImageData(imageData, x, y)
	}

	redrawAllTiles(){
		this.log('redrawAllTiles')

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		for(let tile of this.tiles){
			setTimeout(()=>{// when drawing all at the same time, we freeze the UI
				this.drawTile(tile, this.generateTileImageData(tile, tile.image))
			}, 1)
		}
	}

	/* checks if tile can be fitted into the canvas. If not, it will adjist the canvas */
	checkTileBoundaries(x, y, width, height){
		let overflow = {
			left: Math.max(0, - x - this.canvasOffset.x),
			top: Math.max(0, - y - this.canvasOffset.y),
			right: Math.max(0, x + width + this.canvasOffset.x - this.canvas.width),
			bottom: Math.max(0,  y + height + this.canvasOffset.y - this.canvas.height)
		}

		this.debug('checkTileBoundaries', x, y, width, height, overflow)

		let mustRecreateCanvas = overflow.left > 0 || overflow.top > 0
		let mustResizeCanvas = overflow.right > 0 || overflow.bottom > 0

		if(mustRecreateCanvas){
			this.canvasOffset.x += overflow.left
			this.canvasOffset.y += overflow.top
			this.canvas.width += overflow.right
			this.canvas.height += overflow.bottom
			this.log('mustRecreateCanvas to', this.canvas.width, this.canvas.height, this.canvasOffset.x, this.canvasOffset.y)
		} else if(mustResizeCanvas){
			this.canvas.width += overflow.right
			this.canvas.height += overflow.bottom
			this.log('mustResizeCanvas to', this.canvas.width, this.canvas.height)
		}
	}

	/* color: {r: 0, g: 0, b: 0} */
	drawBorderOntoImageDate(imageData, width, height, color, borderWidth){
		for(let x = 0; x < width; x++){
			// top border
			for(let y = 0; y < borderWidth; y++){
				let index = (x + y * height) * 4
				imageData.data[index + 0] = color.r
				imageData.data[index + 1] = color.g
				imageData.data[index + 2] = color.b
			}

			// bottom border
			for(let y = height - 1; y > height - borderWidth; y--){
				let index = (x + (y) * height) * 4
				imageData.data[index + 0] = color.r
				imageData.data[index + 1] = color.g
				imageData.data[index + 2] = color.b
			}
		}

		for(let y = 0; y < height; y++){
			// left border
			for(let x = 0; x < borderWidth; x++){
				let index = (x + y * height) * 4
				imageData.data[index + 0] = color.r
				imageData.data[index + 1] = color.g
				imageData.data[index + 2] = color.b
			}

			//right border
			for(let x = (width - 1); x > width - borderWidth; x--){
				let index = (x + y * height) * 4
				imageData.data[index + 0] = color.r
				imageData.data[index + 1] = color.g
				imageData.data[index + 2] = color.b
			}
		}
	}

	generateRandomColor(){
		return {
			r: Math.random() * 255,
			g: Math.random() * 255,
			b: Math.random() * 255
		}
	}
}