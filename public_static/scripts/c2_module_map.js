class C2Module_Map extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2


		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('livePlayers')
			this.c2.registerStorable('liveVehicles')
		})

		this.c2.on('can-register-syncable', ()=>{
			this.c2.registerSyncable('TILE_POSITIONS')
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
						currentInfoStyle: undefined,

						uuid: C2.uuid()
					}
				},
				computed: {
					livePlayers (){
						return this.$store.state.livePlayers
					},
					liveVehicles (){
						return this.$store.state.liveVehicles
					}
				},
				template: `<div class="map_2d">
					<component v-if="currentInfoComponent" :is="currentInfoComponent" :data="currentInfoData" :data-id="currentInfoDataId" :style="currentInfoStyle" @close="hideInfo"/>
				</div>`,
				methods: {
					refreshLivePlayers (){
						this.log('refreshLivePlayers', this.livePlayers)

						for(let marker of this.playerMarkers){
							this.getMap().removeMarker(marker)
						}

						if(!this.livePlayers){
							return
						}

						for(let p of Object.keys(this.livePlayers)){
							let player = this.livePlayers[p]
							if(player.x && player.y){
								let marker = this.getMap().createMarker(player.x, player.y, 'map_player.png', 30, player.name, '#36BCFF')
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
							this.getMap().removeMarker(marker)
						}

						if(!this.liveVehicles){
							return
						}

						for(let v of Object.keys(this.liveVehicles)){
							let vehicle = this.liveVehicles[v]
							if(vehicle.x && vehicle.y){
								let marker = this.getMap().createMarker(vehicle.x, vehicle.y, 'map_vehicle.png', 30, vehicle.name, '#FF7E33')
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
					},

					setMap (map){
						window['map_' + this.uuid] = map
					},
					getMap (){
						return window['map_' + this.uuid]
					}
				},
				mounted: function (){
					this.setMap( new C2CanvasMap(5, this.$el, '/static/tiles/', '/static/icons/') )

					this.refreshLivePlayers()
					this.refreshLiveVehicles()

					this.intervalTilePositions = setInterval(()=>{
						if(this.$store.state.TILE_POSITIONS){
							this.getMap().tilemanager.setTilesDefinition(this.$store.state.TILE_POSITIONS)
							clearInterval(this.intervalTilePositions)
							this.intervalTilePositions = undefined
						}
					}, 100)
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
						alert('not implemented')
						this.$emit('close')
					}
				},
				mixins: [componentMixin_gameCommand]
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('live-map', 'Map', 'map-o', 'map-view')
		})

		this.c2.on('can-register-messagehandler', ()=>{
			//TODO register handlers for liveplayers and livevehicles
		})

		this.c2.on('setup-done', ()=>{

		})
	}
}

class C2CanvasMap extends C2LoggingUtility {

	constructor(loglevel, el, tilesDirectory, iconsDirectory){
		super(loglevel)

		this.TILE_PIXEL_SIZE = 200
		this.TILE_METER_SIZE = 1000

		this.isDebugMode = false

		this.container = $(el)

		this.log('container', el)

		this.dom = $('<div>').css({
			position: 'relative',
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			background: '#40535f'
		})

		this.information = $('<div class="info">')
		this.dom.append(this.information)

		this.dom.append(
			$('<div class="zoom_hint" style="position: absolute; z-index: 4; top: 0; left: 0; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; background: #fffa; color: #222; font-size: 2em;">Use <span style="font-weight: 800; margin: 0 1em;">ctrl + scroll</span> to zoom</div>').css({
				display: 'flex'
			}).hide()
		)

		this.dom.appendTo(this.container)

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

		/* zooming
		must use this.setZoom() to change this value! */
		this.metersToPixelRatio = 30 // = ratio meter / pixel

		/* dragging */

		// the center of the canvas is at gps (0,0) when dragOffsetGps = (0,0). Can be used to set an initial gps position
		this.dragOffsetGps = {
			x: -7000,
			y: -3000
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

			this.dragOffsetGps.x -= this.pixelsToMeters(this.lastMouseDownX - evt.pageX)
			this.dragOffsetGps.y += this.pixelsToMeters(this.lastMouseDownY - evt.pageY)

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
					this.dragOffsetGps.x -= this.pixelsToMeters(this.lastTouches[0].pageX - evt.touches[0].pageX)
					this.dragOffsetGps.y += this.pixelsToMeters(this.lastTouches[0].pageY - evt.touches[0].pageY)
				} else if (evt.touches.length === 2){
					let oldDeltaX = this.lastTouches[0].pageX - this.lastTouches[1].pageX
					let oldDeltaY = this.lastTouches[0].pageY - this.lastTouches[1].pageY
					let oldDistance = Math.sqrt(oldDeltaX ** 2 + oldDeltaY ** 2)

					let newDeltaX = evt.touches[0].pageX - evt.touches[1].pageX
					let newDeltaY = evt.touches[0].pageY - evt.touches[1].pageY
					let newDistance = Math.sqrt(newDeltaX ** 2 + newDeltaY ** 2)

					this.setZoom(this.metersToPixelRatio * (newDistance / oldDistance) )
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

			if(evt.originalEvent.altKey && evt.originalEvent.ctrlKey){
				if(this.isDebugMode){
					if(this.tilemanager.isDebugMode){
						this.isDebugMode = false
						this.tilemanager.isDebugMode = false
					} else {
						this.tilemanager.isDebugMode = true
					}
				} else {
					this.isDebugMode = true
				}

				this.requestDraw()
			}

			let p = {
				x: evt.offsetX,
				y: evt.offsetY
			}

			for(let m of Object.keys(this.markers).reverse()){
				let marker = this.markers[m]
				let markerPos = this.convertGpsPositonToCanvasPosition(marker.gpsX, marker.gpsY)
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
		$(this.canvas).attr('id', 'canvas_canvasmap_canvas')
		this.canvas.style = 'background: transparent; position: relative; z-index: 2;'
		this.dom.append(this.canvas)

		this.ctx = this.canvas.getContext('2d')

		this.ctx.font = '1.5em sans-serif'

		this.cachedFontLineHeight = this.calcFontLineHeight(this.ctx.font).height

		this.iconsDirectory = iconsDirectory

		this.markers = []

		/* Debug layer */
		this.timesBetweenDraws = [0]
		this.lastDrawTime = performance.now()

		this.debugCanvas = document.createElement('canvas')
		$(this.debugCanvas).attr('id', 'canvas_canvasmap_debugcanvas')
		this.debugCanvas.style = 'background: transparent; position: absolute; top: 0; left: 0; z-index: 5;'
		this.debugCanvas.width = this.canvas.width
		this.debugCanvas.height = this.canvas.height
		this.debugContext = this.debugCanvas.getContext('2d')
		this.debugContext.font = '10px sans-serif'
		this.dom.append(this.debugCanvas)

		/* map layer */
		this.mapCanvas = document.createElement('canvas')
		$(this.mapCanvas).attr('id', 'canvas_canvasmap_mapcanvas')
		this.mapCanvas.style = 'position: absolute; top: 0; left: 0; z-index: 1;'
		this.dom.append(this.mapCanvas)

		this.tilemanager = new C2TileManager(loglevel, this, tilesDirectory, this.TILE_PIXEL_SIZE, this.TILE_METER_SIZE)

		this.mustDraw = true

		this.queueDraw()
		this.requestDraw()

		this.resizeCanvas()

		$(window).on('resize', ()=>{
			this.resizeCanvas()
		})
	}

	resizeCanvas(){
		let width = this.dom.width()
		let height = this.dom.height()
		for(let c of [this.canvas, this.debugCanvas, this.mapCanvas]){
			c.width = width
			c.height = height
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
		this.drawDebugCanvas()

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


		// crosshair
		this.setStrokeColor('white')
		let crosshairLength = 20
		let center = this.convertCanvasPercentagePositionToAbsolutePosition(0.5,0.5)
		this.drawLine({x: center.x - crosshairLength, y: center.y}, {x: center.x + crosshairLength, y: center.y}, )
		this.drawLine({x: center.x, y: center.y - crosshairLength}, {x: center.x, y: center.y + crosshairLength}, )


		this.drawMap()


		let centerGpsPosition = this.convertCanvasPercentagePositionToGpsPosition(0.5, 0.5)
		this.information.html(`<span>X ${Math.floor(centerGpsPosition.x)}</span><span>Y ${Math.floor(centerGpsPosition.y)}</span>`)

		for(let m of this.markers){
			this.drawMarker(m)
		}

		this.queueDraw()
	}

	drawDebugCanvas(){
		//clear
		this.debugContext.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height)

		if(this.isDebugMode){

			let measurePoints = [
				[0.25, 0.25],
				[0.75, 0.25],
				[0.75, 0.75],
				[0.25, 0.75]
			]

			this.setFillColor('orange', this.debugContext)
			for(let mp of measurePoints){
				let canvasPosition = this.convertCanvasPercentagePositionToAbsolutePosition(mp[0], mp[1])
				let gpsPosition = this.convertCanvasPositionToGpsPosition(canvasPosition.x, canvasPosition.y)

				this.drawText(canvasPosition, 'x ' + Math.floor(gpsPosition.x), this.debugContext)
				this.drawText({x: canvasPosition.x, y: canvasPosition.y + 10}, 'y ' + Math.floor(gpsPosition.y), this.debugContext)
			}

			let lines = [
				Math.floor(this.calcFps()) + ' FPS',
				'dX ' + Math.floor(this.dragOffsetGps.x),
				'dY ' + Math.floor(this.dragOffsetGps.y),
				'm/px ' + Math.floor(this.metersToPixelRatio * 100) / 100,
			]

			this.setFillColor('yellow', this.debugContext)
			for(let i=0; i < lines.length; i++){
				this.drawText({x: 1, y: 50 + 10 * (i-1)}, lines[i], this.debugContext)
			}
		}
	}

	drawLine(p1, p2, /* optional */ context){
		let theContext = context || this.ctx
		theContext.beginPath()
		theContext.moveTo(p1.x, p1.y)
		theContext.lineTo(p2.x, p2.y)
		theContext.closePath()
		theContext.stroke()
	}

	/* draw text at canvas coordinates */
	drawText(p, text, /* optional */ context){
		//instead of p being in the bottom left corner of the text, we convert it to top left corner
		(context || this.ctx).fillText(text, p.x, p.y + this.cachedFontLineHeight)
	}

	drawMarker(marker){
		if(typeof marker.gpsX !== 'number' || typeof marker.gpsY !== 'number'){
			return
		}

		let p = this.convertGpsPositonToCanvasPosition(marker.gpsX, marker.gpsY)

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
		let canvasPosition = this.convertGpsPositonToCanvasPosition(0, 0)
		this.tilemanager.redrawAllTiles(canvasPosition.x, canvasPosition.y, this.metersToPixelRatio)
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
		this.debugContext.font = value
		this.cachedFontLineHeight = this.calcFontLineHeight(value).height
	}

	setFillColor(value, /* optional */ context){
		let theContext = context || this.ctx
		theContext.fillStyle = value
	}

	setStrokeColor(value, /* optional */ context){
		let theContext = context || this.ctx
		theContext.strokeStyle = value
	}

	/* converts gps position to position relative to canvas top left corner */
	convertGpsPositonToCanvasPosition(gpsX, gpsY){
		return {
			x: this.metersToPixels(this.dragOffsetGps.x + gpsX) + this.canvas.width/2,
			y: - this.metersToPixels(this.dragOffsetGps.y + gpsY) + this.canvas.height/2,
		}
	}

	/* converts canvas position (relative to top left corner) into gps coordinates */
	convertCanvasPositionToGpsPosition(canvasX, canvasY){
		return {
			x: this.pixelsToMeters(canvasX - this.canvas.width/2) - this.dragOffsetGps.x,
			y:  - this.pixelsToMeters(canvasY - this.canvas.height/2) - this.dragOffsetGps.y
		}

		/* old and buggy
		return {
			x: this.pixelsToMeters(canvasX - this.canvas.width/2) - this.dragOffsetGps.x,
			y: this.pixelsToMeters(canvasY - this.canvas.height/2) - this.dragOffsetGps.y
		}*/
	}

	/* percentage of canvas width/height from 0-1. 0,0 is top left 0.5,1 is bottom center */
	convertCanvasPercentagePositionToAbsolutePosition(percentX, percentY){
		return {
			x: this.canvas.width * percentX,
			y: this.canvas.height * percentY
		}
	}


	/* percentage of canvas width/height from 0-1. 0,0 is top left 0.5,1 is bottom center */
	convertCanvasPercentagePositionToGpsPosition(percentX, percentY){
		let absolutePosition = this.convertCanvasPercentagePositionToAbsolutePosition(percentX, percentY)
		return this.convertCanvasPositionToGpsPosition(absolutePosition.x, absolutePosition.y)
	}

	/* transform any zoomed length into the length it would have without current zoom */
	metersToPixels(meters){
		return meters / this.metersToPixelRatio
	}

	/* transform any length into the length it would have whith current zoom */
	pixelsToMeters(pixels){
		return pixels * this.metersToPixelRatio
	}

	zoomIn(){
		this.setZoom(this.metersToPixelRatio * 0.9)
	}

	zoomOut(){
		this.setZoom(this.metersToPixelRatio * 1.1)
	}

	setZoom(value){
		this.metersToPixelRatio = Math.max(0.01, Math.min(10000, value))
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

	constructor(gpsX, gpsY, /* optional */ iconImageUrl, /* optional */ iconWidth, /* optional */ label, /* optional */ labelColor){
		super()

		this.gpsX = gpsX
		this.gpsY = gpsY
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
		let image = new Image()

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
		$(canvas).attr('id', 'canvas_mapmarker_icon')
		canvas.width = this.iconWidth
		this.iconHeight = (image.width / image.height) * this.iconWidth
		canvas.height = this.iconHeight

		canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height)

		return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
	}

	setPosition(gpsX, gpsY){
		this.gpsX = gpsX
		this.gpsY = gpsY
		this.dispatch('change')
	}

	setLabel(label, /* optional */ labelColor){
		this.label = label
		this.labelColor = labelColor || 'white'
		this.dispatch('change')
	}
}

class C2TileManager extends C2LoggingUtility {

	constructor(loglevel, canvasMap, tilesDirectory, tilePixelSize, tileMeterSize){
		super(loglevel)

		this.MAX_CANVAS_SIZE = 268435456

		this.isDebugMode = false

		this.tilesDirectory = tilesDirectory
		this.tilePixelSize = tilePixelSize
		this.tileMeterSize = tileMeterSize
		this.tileResolution = tilePixelSize / tileMeterSize

		this.tiles = []
		this.allTilesLoaded = false

		this.imageCacheContainer = $('<div style="display: none" image-cache-container>')
		this.imageCacheContainer.appendTo(canvasMap.dom)

		this.canvasMap = canvasMap
		this.canvas = canvasMap.mapCanvas
		this.ctx = this.canvas.getContext('2d')
	}

	/* right now this can only be used once*/
	setTilesDefinition(tilesDefinition){
		if(this.tiles.length > 0){
			console.info('C2TileManager is ignoring new tilesDefinition')
			return
		}

		this.info('setTilesDefinition')

		for(let t of tilesDefinition){
			this.addTile(t.name, t.x - this.tileMeterSize/2, t.y + this.tileMeterSize/2)//convert center x,y to top left x,y
		}

		setInterval(()=>{
			if(this.allTilesLoaded){
				return
			}

			let loadedTiles = 0
			let loadedTilesAndErrorTiles = 0
			let loadedTilesFromCache = 0

			for(let tile of this.tiles){
				if(tile.image){
					loadedTiles++
					loadedTilesAndErrorTiles++
					if(tile.fromCache){
						loadedTilesFromCache++
					}
				} else if (tile.loadingError){
					loadedTilesAndErrorTiles++
				}
			}

			if(loadedTilesAndErrorTiles === this.tiles.length){
				this.allTilesLoaded = true
				this.info('\nall Tiles have been loaded! ', loadedTiles, 'success, ', loadedTilesAndErrorTiles - loadedTiles, 'errors', loadedTilesFromCache, 'from cache')
				this.info('canvasOffset', this.canvasOffset)
				this.canvasMap.requestDraw()
			} else {
				this.setLoadingMessage(`${loadedTilesAndErrorTiles} / ${this.tiles.length} tiles loaded`)
			}
		}, 50)
	}

	setLoadingMessage(msg){
		if(this.allTilesLoaded){
			return
		}

		this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
		this.ctx.font = '12px sans-serif'
		this.ctx.fillStyle = 'black'
		this.ctx.fillText(msg, this.canvas.width/2 - msg.length * 3, this.canvas.height*0.75 + 6)
	}

	addTile(name, gpsX, gpsY, rotationInDeg){
		let matches = name.match(/^(.*)_rot_([0-9])$/)
		if(matches && matches[2]){
			this.addTile(matches[1], gpsX, gpsY, parseInt(matches[2]) * 90)
			return
		}

		this.debug('addTile', name, gpsX, gpsY, rotationInDeg)

		let tile = {
			name: name,
			gpsX: gpsX,
			gpsY: gpsY,//game y and canvas y are inverted
			x: gpsX * this.tileResolution,
			y: gpsY * this.tileResolution,//game y and canvas y are inverted
			url: name + '.png',
			rotationInDeg: rotationInDeg
		}

		this.tiles.push(tile)

		this.allTilesLoaded = false

		this.loadTile(tile)
	}

	loadTile(tile){
		if(!window.c2tilemanager_cache){
			window.c2tilemanager_cache = {}
		} else if(window.c2tilemanager_cache[tile.name]){
			tile.image = window.c2tilemanager_cache[tile.name]
			tile.width = tile.image.width
			tile.height = tile.image.height
			tile.fromCache = true
			return
		}


		let image = new Image

		image.onload = ()=>{
			this.debug('loaded tile', tile.name)
			tile.image = image
			tile.width = image.width
			tile.height = image.height

			if(!window.c2tilemanager_cache){
				window.c2tilemanager_cache = {}
			}

			window.c2tilemanager_cache[tile.name] = image
		}

		image.onerror = (err)=>{
			this.error('unable to load tile', tile.name, err)
			tile.loadingError = true
		}

		image.src = this.tilesDirectory + tile.url

		this.imageCacheContainer.append(image)
	}

	drawTile(tile, gps0XasCanvasX, gps0YasCanvasY, zoom){

		let invertedZoom = 1 / zoom

		let width = this.invertedTileResolution() * invertedZoom * tile.width
		let height = this.invertedTileResolution() * invertedZoom * tile.height
		let left = gps0XasCanvasX + this.invertedTileResolution() * invertedZoom * tile.x
		let top = gps0YasCanvasY - this.invertedTileResolution() * invertedZoom * tile.y //minus because canvas y axis is inverted


		// check if tile is in visible area
		if(left < this.canvas.width && left + width > 0 && top < this.canvas.height && top + height > 0){

			this.debug('drawTile', tile.name, left, top)
			try {
				if(tile.rotationInDeg === undefined){
					this.ctx.drawImage(tile.image, 0,0,tile.width,tile.height, left, top, width, height)
				} else {
					this.ctx.save()

					this.ctx.translate(left + width/2, top + height/2)
	    			this.ctx.rotate(tile.rotationInDeg * Math.PI / 180)

	    			this.ctx.drawImage(tile.image, 0,0,tile.width,tile.height, -width/2,-height/2,width,height)

					this.ctx.restore()
				}

				if(this.isDebugMode){
					this.ctx.fillStyle = 'white'

					let lines = [
						tile.name,
						Math.floor(tile.x) + ',' + Math.floor(tile.y),
						'gps ' + Math.floor(tile.gpsX) + ',' + Math.floor(tile.gpsY),
						tile.rotationInDeg !== undefined ? 'rot ' + Math.floor(tile.rotationInDeg) : '',
					]
					for(let i = 0; i < lines.length; i++){
						this.ctx.fillText(lines[i], left, top + (i + 1) * 10)
					}

					this.ctx.strokeStyle = 'black'
					this.ctx.strokeRect(left, top, width, height)
				}

			} catch (err){
				this.info('error drawing tile', tile.name, err)
			}
		}
	}

	redrawAllTiles(gps0XasCanvasX, gps0YasCanvasY, zoom){
		this.log('redrawAllTiles')

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		for(let tile of this.tiles){
			if(tile.image && !tile.loadingError){
				this.drawTile(tile, gps0XasCanvasX, gps0YasCanvasY, zoom)
			}
		}

		if(!this.allTilesLoaded){
			this.setLoadingMessage('waiting for tile positions from game ...')
		}
	}

	invertedTileResolution(){
		return 1 / this.tileResolution
	}
}