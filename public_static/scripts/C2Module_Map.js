class C2Module_Map extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2


		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('map', {})
		})

		this.c2.on('can-register-syncable', ()=>{
			this.c2.registerSyncable('TILE_POSITIONS')
		})

		this.c2.on('can-register-component', ()=>{
			this.c2.registerComponent('map-view', {
				template: `<div class="map_view" style="height: 100%; width: 100%">
					<div class="controls">

					</div>
					<map-2d/>
				</div>`
			})

			this.c2.registerComponent('map-2d', {
				data: function (){
					return {
						playerIdToMarkerIdMap: {},
						vehicleIdToMarkerIdMap: {},

						currentInfoComponent: undefined,
						currentInfoData: undefined,
						currentInfoDataType: undefined,
						currentInfoDataId: undefined,
						currentInfoStyle: undefined,

						uuid: C2.uuid()
					}
				},
				template: `<div class="map_2d">
					<component v-if="currentInfoComponent" :is="currentInfoComponent" :data="currentInfoData" :data-id="currentInfoDataId" :style="currentInfoStyle" @close="hideInfo"/>
				</div>`,
				methods: {
					getLivePlayers (){
						return this.$store.state.map ? this.$store.state.map.players : undefined
					},
					getLiveVehicles (){
						return this.$store.state.map ? this.$store.state.map.vehicles : undefined
					},

					refreshLivePlayers (){
						let livePlayers = this.getLivePlayers()
						this.log('refreshLivePlayers', livePlayers, this.playerIdToMarkerIdMap)
						this.log('markers', this.getMap().markers)

						if(!livePlayers){
							livePlayers = []
						}

						//delete markers of non existent players
						for(let playerId of Object.keys(this.playerIdToMarkerIdMap)){
							if(!livePlayers[playerId]){
								this.getMap().removeMarker(this.playerIdToMarkerIdMap[playerId])
								delete this.playerIdToMarkerIdMap[playerId]
							}
						}

						for(let playerId of Object.keys(livePlayers)){
							let player = livePlayers[playerId]
							if(player.x && player.y){

								if(this.playerIdToMarkerIdMap[playerId]){
									// update marker
									let marker = this.getMap().markers[this.playerIdToMarkerIdMap[playerId]]
									marker.dispatch('change')
									marker.gpsX = player.x
									marker.gpsY = player.y
								} else {
									//create new marker
									let marker = this.getMap().createMarker(player.x, player.y, 'map_player.png', 30, player.name, '#36BCFF')
									this.playerIdToMarkerIdMap[playerId] = marker.id

									marker.on('click', (pos)=>{
										this.log('clicked player marker', player)
										this.clickPlayer(player, playerId, pos.x, pos.y)
									})
								}
							}
						}
					},
					refreshLiveVehicles (){
						let liveVehicles = this.getLiveVehicles()
						this.log('refreshLiveVehicles', liveVehicles, this.vehicleIdToMarkerIdMap)
						this.log('markers', this.getMap().markers)

						if(!liveVehicles){
							return
						}

						//delete markers of non existent players
						for(let vehicleId of Object.keys(this.vehicleIdToMarkerIdMap)){
							if(!liveVehicles[vehicleId]){
								this.getMap().removeMarker(this.vehicleIdToMarkerIdMap[vehicleId])
								delete this.vehicleIdToMarkerIdMap[vehicleId]
							}
						}

						for(let vehicleId of Object.keys(liveVehicles)){
							let vehicle = liveVehicles[vehicleId]
							if(vehicle.x && vehicle.y){

								if(this.vehicleIdToMarkerIdMap[vehicleId]){
									// update marker
									let marker = this.getMap().markers[this.vehicleIdToMarkerIdMap[vehicleId]]
									marker.dispatch('change')
									marker.gpsX = vehicle.x
									marker.gpsY = vehicle.y
								} else {
									let marker = this.getMap().createMarker(vehicle.x, vehicle.y, 'map_vehicle.png', 30, vehicle.name, '#FF7E33')
									this.vehicleIdToMarkerIdMap[vehicleId] = marker.id

									marker.on('click', (pos)=>{
										this.log('clicked vehicle marker', vehicle)
										this.clickVehicle(vehicle, vehicleId, pos.x, pos.y)
									})
								}
							}
						}
					},
					showInfo (type, data, dataId, pageX, pageY){
						this.log('showInfo', type)
						this.debug(data, pageX, pageY)
						this.currentInfoComponent = 'map-view-info-' + type
						this.currentInfoData = data
						this.currentInfoDataType = type
						this.currentInfoDataId = dataId
						this.currentInfoStyle = 'top: ' + pageY +'px; left: ' + pageX + 'px;'
					},
					hideInfo (){
						this.log('hideInfo')
						this.currentInfoComponent = undefined
						this.currentInfoData = undefined
						this.currentInfoDataType = undefined
						this.currentInfoDataId = undefined
						this.currentInfoStyle = undefined
					},
					updateInfo (){
						this.log('updateInfo', this.currentInfoDataType, this.currentInfoDataId)
						if(this.currentInfoDataType && this.currentInfoDataId){
							switch(this.currentInfoDataType){
								case 'player': {
									let livePlayers = this.getLivePlayers()
									let newData = livePlayers ? livePlayers[this.currentInfoDataId] : undefined
									if(newData){
										this.currentInfoData = newData
									} else {
										this.hideInfo()
									}
								}; break;

								case 'vehicle': {
									let liveVehicles = this.getLiveVehicles()
									let newData = liveVehicles ? liveVehicles[this.currentInfoDataId] : undefined
									if(newData){
										this.currentInfoData = newData
									} else {
										this.hideInfo()
									}
								}; break;
							}
						}
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

					this.onLiveCallbackId = c2.on('map-update', ()=>{
						this.refreshLivePlayers()
						this.refreshLiveVehicles()

						this.updateInfo()
					})

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
				unmounted: function(){
					c2.off('map-update', this.onLiveCallbackId)
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
				data: function(){
					return {
						syncables: []
					}
				},
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
					thePlayer (){
						return this.$store.state.players ? this.$store.state.players[this.dataId] : undefined
					},
					playerName (){
						return this.thePlayer ? this.thePlayer.name : ''
					},
					playerPeerID (){
						return this.thePlayer ? this.thePlayer.peerID : ''
					}
				},
				template: `<map-view-info class="player" :title="'Player'" @close="$emit('close')">
					<div>Name: {{playerName}}</div>
					<div>GPS: X {{Math.floor(data.x)}}, Y {{Math.floor(data.y)}}</div>
					<div>Altitude: {{Math.floor(data.alt)}}</div>
					<div>Peer Id: {{playerPeerID}}</div>
					<div>SteamId: <steamid :steamid="dataId"/></div>
					<div><confirm-button class="small_button" @click="kick" :disabled="isComponentLocked">Kick</confirm-button></div>
					<div><confirm-button class="small_button" @click="ban" :time="2" :disabled="isComponentLocked">Ban</confirm-button></div>
				</map-view-info>`,
				methods: {
					kick (){
						this.callGameCommand('kickPlayer', this.dataId).then(_=>{
							this.$emit('close')
						})
					},
					ban (){
						this.callGameCommand('banPlayer', this.dataId).then(_=>{
							this.$emit('close')
						})
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('map-view-info-vehicle', {
				data: function(){
					return {
						syncables: []
					}
				},
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
					theVehicle (){
						return this.$store.state.vehicles ? this.$store.state.vehicles[this.dataId] : undefined
					},
					vehicleName (){
						return this.theVehicle ? this.theVehicle.name : undefined
					},
					ownerName (){
						return this.theVehicle && this.$store.state.players && this.$store.state.players[this.theVehicle.owner] ? this.$store.state.players[this.theVehicle.owner].name : ( this.theVehicle ? '<steamid:' + this.theVehicle.owner + '>' : '')
					}
				},
				template: `<map-view-info class="vehicle" :title="'Vehicle'" @close="$emit('close')">
					<div>Name: {{vehicleName}}</div>
					<div>GPS: X {{Math.floor(data.x)}}, Y {{Math.floor(data.y)}}</div>
					<div>Altitude: {{Math.floor(data.alt)}}</div>
					<div>Owner: {{ownerName}}</div>
					<div>Vehicle Id: {{dataId}}</div>
					<div><confirm-button class="small_button" @click="despawn" :disabled="isComponentLocked">Despawn</confirm-button></div>
				</map-view-info>`,
				methods: {
					despawn (){
						this.callGameCommand('clearVehicle', [this.dataId]).then(_=>{
							this.$emit('close')
						})
					}
				},
				mixins: [componentMixin_gameCommand]
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('live-map', 'Map', 'map-o', 'map-view')
		})

		this.c2.on('can-register-messagehandler', ()=>{
			this.c2.registerMessageHandler('stream-map', (data)=>{
				if(data){
					this.c2.store.state.map.players = data.playerPositions
					this.c2.store.state.map.vehicles = data.vehiclePositions
					this.c2.dispatch('map-update')
				}
			})
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

		this.isDebugMode = true

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

		// the center of the canvas is at gps (0,0) when dragOffsetGps = (0,0). Can be used to set an initial gps position (but then you must use * -1)
		this.dragOffsetGps = {
			x: 7000,
			y: 3000
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

			for(let id of Object.keys(this.markers)){
				let marker = this.markers[id]
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
		this.ctx.globalAlpha = 0.5

		this.ctx.font = '1.5em sans-serif'

		this.cachedFontLineHeight = this.calcFontLineHeight(this.ctx.font).height

		this.iconsDirectory = iconsDirectory

		this.markers = {}

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
			this.timesBetweenDraws = [0]
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

		for(let id of Object.keys(this.markers)){
			this.drawMarker(this.markers[id])
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

		if(p.x + marker.iconWidth/2 < 0 || p.x - marker.iconWidth/2 > this.canvas.width ||
			p.y + marker.iconHeighth/2 < 0 || p.y - marker.iconHeighth/2 > this.canvas.height){
			//not in visible area
			return
		}


		if(marker.iconImage){
			this.ctx.drawImage(marker.iconImage, p.x - marker.iconWidth / 2, p.y - marker.iconHeight/2, marker.iconWidth, marker.iconHeight)
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
		this.tilemanager.redraw(canvasPosition.x, canvasPosition.y, this.metersToPixelRatio)
	}

	createMarker(gpsX, gpsY, iconImageName, /* optional */iconWidth, /* optional */label, /* optional */labelColor){
		let marker = new C2CanvasMapMarker(gpsX, gpsY, this.iconsDirectory + iconImageName, iconWidth, label, labelColor)

		marker.on('change', ()=>{
			this.requestDraw()
		})

		this.log('createMarker', gpsX, gpsY, iconImageName, iconWidth, label, labelColor)

		this.markers[marker.id] = marker

		this.requestDraw()

		return marker
	}

	removeMarker(markerId){
		for(let id of Object.keys(this.markers)){
			if(this.markers[id]){
				this.markers[id].off('change')

				delete this.markers[id]

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

		if(!window.C2CanvasMapMarker_image_cache){
			window.C2CanvasMapMarker_image_cache = {}
		}

		if(this.iconImageUrl){
			this.loadImage(this.iconImageUrl)
		}

		this.id = C2.uuid()
	}

	loadImage(url){
		if(window.C2CanvasMapMarker_image_cache[url]){
			this.debug('loaded icon image from cache', url)
			this.iconImage = window.C2CanvasMapMarker_image_cache[url]
			this.dispatch('change')
		} else {

			let image = new Image()

			image.onload = ()=>{
				this.debug('loaded icon image', url)
				this.iconImage = image

				C2CanvasMapMarker_image_cache[url] = image

				this.dispatch('change')
			}

			image.onerror = (err)=>{
				this.error('unable to load icon image', url, err)
			}

			image.src = url
		}
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

		this.isDebugMode = true

		this.tilesDirectory = tilesDirectory
		this.tilePixelSize = tilePixelSize
		this.tileMeterSize = tileMeterSize
		this.tileResolution = tilePixelSize / tileMeterSize

		this.tiles = []
		this.allTilesLoaded = false

		this.imageCacheContainer = $('<div style="display: none" class="image-cache-container">')
		this.imageCacheContainer.appendTo(canvasMap.dom)

		this.patchContainer = $('<div style="display: none" class="patch-container">')
		this.patchContainer.appendTo(canvasMap.dom)

		this.canvasMap = canvasMap
		this.canvas = canvasMap.mapCanvas
		this.ctx = this.canvas.getContext('2d')

		this.patches = undefined
	}

	/* right now this can only be used once*/
	setTilesDefinition(tilesDefinition){
		if(this.tiles.length > 0){
			console.info('C2TileManager is ignoring new tilesDefinition')
			return
		}

		if(tilesDefinition instanceof Array === false){
			return
		}

		this.info('setTilesDefinition', tilesDefinition)

		this.tilesDefinition = tilesDefinition // only required for debugging count in createPatches()

		for(let t of tilesDefinition){
			this.addTile(t.name, t.x - this.tileMeterSize/2, t.y + this.tileMeterSize/2)//convert center x,y to top left x,y
		}

		this.createPatches()

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

				this.drawTilesOntoPatches()
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
			rotationInDeg: rotationInDeg,
			neighbours: {}
		}

		this.tiles.push(tile)

		this.findNeighboursForTile(tile)

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

	findNeighboursForTile(tile){
		for(let t of this.tiles){
			let borders = {//relative to t
				right: false,
				left: false,
				top: false,
				bottom: false,
			}

			if(t.x + this.tilePixelSize === tile.x){
				if(t.y === tile.y){
					t.neighbours.right = tile
					tile.neighbours.left = t
				}
			} else if(t.x - this.tilePixelSize === tile.x){
				if(t.y === tile.y){
					t.neighbours.left = tile
					tile.neighbours.right = t
				}
			}

			if(t.y + this.tilePixelSize === tile.y){
				if(t.x === tile.x){
					t.neighbours.bottom = tile
					tile.neighbours.top = t
				}
			} else if(t.y - this.tilePixelSize === tile.y){
				if(t.x === tile.x){
					t.neighbours.top = tile
					tile.neighbours.bottom = t
				}
			}
		}
	}

	calculateTileId(tile){
		return tile.gpsX + 'x' + tile.gpsY
	}

	createPatches(){
		this.patches = []

		this.patchContainer.html('')

		const patchGroups = []

		const groupedTiles = {}

		let that = this

		for(let t of this.tiles){

			if(Object.keys(t.neighbours).length > 0){//has neighbours

				if(groupedTiles[this.calculateTileId(t)] !== true){//skip tiles that are already part of a group
					groupedTiles[this.calculateTileId(t)] = true

					const myGroup = [[t]]

					addNeighboursToGroupRecursive(myGroup, t, 0,0)

					patchGroups.push(myGroup)
				}
			} else {// single tile patch
				patchGroups.push([[t]])
			}
		}

		// axis: x points to right, y points upwards (like canvas)
		function addNeighboursToGroupRecursive(group, tile, x, y){
			for(let dir of Object.keys(tile.neighbours)){

				//because recursive function might have manipulated the group array, find the real x/y again
				for(let _x = 0; _x < group.length; _x++){
					for(let _y = 0; _y < group[_x].length; _y++){
						if(group[_x][_y] === tile){
							/*if(_x !== x || _y !== y){
								this.warn('fixed tile x/y in group after recursive change (from ', x, y, 'to', _y, _y)
							}*/
							x = _x
							y = _y
						}
					}
				}

				let neighbourTile = tile.neighbours[dir]

				if(groupedTiles[that.calculateTileId(neighbourTile)] !== true){
					groupedTiles[that.calculateTileId(neighbourTile)] = true

					let xDiff = 0
					let yDiff = 0

					switch(dir){
						case 'top': {
							yDiff = 1
						}; break;
						case 'topRight': {
							xDiff = 1
							yDiff = 1
						}; break;
						case 'right': {
							xDiff = 1
						}; break;
						case 'bottomRight': {
							xDiff = 1
							yDiff = -1
						}; break;
						case 'bottom': {
							yDiff = -1
						}; break;
						case 'bottomLeft': {
							xDiff = -1
							yDiff = -1
						}; break;
						case 'left': {
							xDiff = -1
						}; break;
						case 'topLeft': {
							xDiff = -1
							yDiff = 1
						}; break;
						default: {
							that.error('unsupported dir type', dir)
						}
					}

					let targetX = x + xDiff
					let targetY = y + yDiff

					while(targetX >= group.length){
						// extend x+
						group.push(new Array(group[0].length))
					}

					while(targetX < 0){
						// extend x-
						group.splice(0, 0, new Array(group[0].length))
						targetX++
					}

					while(targetY >= group[0].length){
						// extend y+
						for(let xg of group){
							xg.push(undefined)
						}
					}

					while(targetY < 0){
						// extend y-
						for(let xg of group){
							xg.splice(0, 0, undefined)
						}
						targetY++
					}

					if(group[targetX][targetY] !== undefined){
						if(group[targetX][targetY].name !== neighbourTile.name){//TODO: can we ignore those? Or will they messup recursiveness?
							that.warn('overwriting existing tile in patch', group, targetX, targetY, neighbourTile.name, 'overwrites', group[targetX][targetY].name, 'caused by being neighbour of', tile, 'which is at <' + dir + '>')
						}
					}

					group[targetX][targetY] = neighbourTile
					neighbourTile.placedFrom = {
						tile: tile,
						dir: dir
					}

					addNeighboursToGroupRecursive(group, neighbourTile, targetX, targetY)
				}
			}
		}

		let totalTilesInsidePatchGroups = 0
		for(let group of patchGroups){
			for(let x of group){
				for(let y of x){
					if(y !== undefined){
						totalTilesInsidePatchGroups ++
					}
				}
			}
		}

		console.info(`TileDefinitions: ${this.tilesDefinition.length}, tiles: ${this.tiles.length}, grouped tiles: ${Object.keys(groupedTiles).length}, patch groups: ${patchGroups.length}, total tiles inside patch groups: ${totalTilesInsidePatchGroups}`)

		//make patches from patchGroups
		this.log('patchGroups', patchGroups)

		for(let group of patchGroups){
			let patch = {
				canvas: document.createElement('canvas'),
				x : undefined,
				y: undefined,
				width: group.length * this.tilePixelSize,
				height: group[0].length * this.tilePixelSize,
				group: group
			}
			patch.canvas.width = patch.width
			patch.canvas.height = patch.height
			this.patchContainer.append(patch.canvas)

			// find x/y of first tile inside patch
			for(let x = 0; x < group.length; x++){
				let firstTile = group[x][0]
				if(firstTile){
					let left = firstTile.x - x * this.tilePixelSize
					let centerX = left + group.length * this.tilePixelSize + this.tilePixelSize * 0.5
					patch.x = left

					let gpsX = firstTile.gpsX - x * this.tileMeterSize
					let centerGpsX = gpsX + group.length * this.tileMeterSize + this.tileMeterSize * 0.5
					patch.gpsX = gpsX

					let top = firstTile.y
					let centerY = top - group[0].length * this.tilePixelSize + this.tilePixelSize * 0.5
					patch.y = top

					let gpsY = firstTile.gpsY
					let centerGpsY = gpsY - group[0].length * this.tileMeterSize + this.tileMeterSize * 0.5
					patch.gpsY = gpsY
				}
			}



			if(patch.x === undefined){
				this.warn('patch.x undefined', patch)
				continue
			}

			if(patch.y === undefined){
				this.warn('patch.y undefined', patch)
				continue
			}

			$(patch.canvas).attr('x', patch.x).attr('y', patch.y)

			this.patches.push(patch)
		}
	}

	drawTilesOntoPatches(){
		for(let patch of this.patches){
			let ctx = patch.canvas.getContext('2d')

			for(let x = 0; x < patch.group.length; x++){
				for(let y = 0; y < patch.group[x].length; y++){
					let tile = patch.group[x][y]

					if(tile){

						if(!tile.image){
							this.error('tile image not loaded, cannot draw tile onto patch')
							continue
						}

						let left = x*this.tilePixelSize
						let top = y*this.tilePixelSize

						if(tile.rotationInDeg === undefined){
							ctx.drawImage(tile.image, 0,0,tile.width,tile.height, left,top,tile.width,tile.height)
						} else {
							ctx.save()

							ctx.translate(left + tile.width/2, top + tile.height/2)
			    			ctx.rotate(tile.rotationInDeg * Math.PI / 180)

			    			ctx.drawImage(tile.image, 0,0,tile.width,tile.height, -tile.width/2,-tile.height/2,tile.width,tile.height)

							ctx.restore()
						}

						if(this.isDebugMode){
							ctx.fillStyle = 'white'

							let lines = [
								tile.name,
								Math.floor(tile.x) + ',' + Math.floor(tile.y),
								'gps ' + Math.floor(tile.gpsX) + ',' + Math.floor(tile.gpsY),
								tile.rotationInDeg !== undefined ? 'rot ' + Math.floor(tile.rotationInDeg) : '',
							]
							for(let i = 0; i < lines.length; i++){
								ctx.fillText(lines[i], left, top + (i + 1) * 10)
							}

							ctx.strokeStyle = 'black'
							ctx.strokeRect(left, top, tile.width, tile.height)

							if(tile.placedFrom){

								ctx.strokeStyle = 'blue'
								ctx.beginPath()
								ctx.moveTo(left + tile.width/2, top + tile.height/2)

								const LINE_LENGTH = this.tilePixelSize / 3

								switch(tile.placedFrom.dir){
									case 'top': {
										ctx.lineTo(left + tile.width/2, top + tile.height/2 - LINE_LENGTH)
									}; break;
									case 'right': {
										ctx.lineTo(left + tile.width/2 - LINE_LENGTH, top + tile.height/2)
									}; break;
									case 'bottom': {
										ctx.lineTo(left + tile.width/2, top + tile.height/2 + LINE_LENGTH)
									}; break;
									case 'left': {
										ctx.lineTo(left + tile.width/2 + LINE_LENGTH, top + tile.height/2)
									}; break;
								}

								ctx.stroke()
								ctx.fillStyle = 'blue'
								ctx.fillText(tile.placedFrom.tile.name, left + tile.width/2, top + tile.height - 5)
							}
						}


					}
				}
			}


			if(this.isDebugMode){
				ctx.fillStyle = 'red'

				let lines = [
					'patch',
					Math.floor(patch.x) + ',' + Math.floor(patch.y),
					'gps ' + Math.floor(patch.gpsX) + ',' + Math.floor(patch.gpsY),
					'' + Math.floor(patch.width) + ' x ' + Math.floor(patch.height)
				]
				for(let i = 0; i < lines.length; i++){
					ctx.fillText(lines[i], this.tilePixelSize*0.5, 0 + (i + 1) * 10)
				}

				ctx.strokeStyle = 'red'
				ctx.strokeRect(0, 0, patch.width, patch.height)
			}

			//convert canvas into image
			patch.image = new Image
			patch.image.src = patch.canvas.toDataURL()
		}
	}

	redraw(gps0XasCanvasX, gps0YasCanvasY, zoom){
		this.log('redraw')

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		if(!this.allTilesLoaded){
			this.setLoadingMessage('waiting for tile positions from game ...')
		} else {

			let invertedZoom = 1 / zoom

			for(let patch of this.patches){
				let width = patch.width / zoom / this.tileResolution
				let height = patch.height / zoom / this.tileResolution
				let left = gps0XasCanvasX + patch.x / zoom / this.tileResolution
				let top = gps0YasCanvasY - patch.y / zoom / this.tileResolution //minus because canvas y axis is inverted

				// check if patch is in visible area
				if(left < this.canvas.width && left + width > 0 && top < this.canvas.height && top + height > 0){
					try {
						this.ctx.drawImage(patch.image, 0,0,patch.width,patch.height, left, top, width, height)
					} catch (err){
						this.info('error drawing patch', patch, err)
					}
				}
			}
		}
	}
}
