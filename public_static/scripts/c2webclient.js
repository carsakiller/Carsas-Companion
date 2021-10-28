let C2WebClient = (()=>{
	
	let ws = new WebSock('ws://' + window.location.host + '/ws', 'XYZ')

	let vueData

	let syncedData = {}

	ws.on('open', ()=>{
		log('is now open')

		setTimeout(()=>{
			ws.send({
				type: 'rtt',
				data: new Date().getTime()
			}).then((res)=>{
				log('rtt response success', res)
			}).catch((err)=>{
				log('rtt response unsuccessful', err)
			})
		}, 1000)

		setTimeout(()=>{
			ws.send({
				type: 'test',
				data: 'hello?'
			}).then((res)=>{
				log('test response success', res)
			}).catch((err)=>{
				log('test response unsuccessful', err)
			})
		}, 10000)
	})

	ws.on('close', ()=>{
		log('is now closed')
	})

	ws.on('message', (message)=>{
		return new Promise((fulfill, reject)=>{
			log('received message', message)

			switch(message.type){
				case 'rtt-response': {
					let rtt = new Date().getTime() - message.data
					log('RoundTripTime:', rtt, 'ms')
					fulfill(rtt + 'ms')
				}; break;

				case 'sync-players': {					
					syncedData['players'] = message.data
					//TODO: now update vueData
					vueData['players'] = (()=>{
						let ret = []


						return ret
					})()
				}; break;

				case 'alive': {
					//TODO
				}; break;

				default: {

					if(message.type.indexOf('sync-') === 0){
						let dataname = message.type.substring('sync-'.length)

						log('got some sync message',dataname)

						//TODO
					} else {
						reject('unsupported request type: ' + message.type)
					}
				}
			}
		})
	})

	function setVueData(_vueData){
		vueData = _vueData
	}

	function log(...args){
		console.log.apply(null, ['C2WebClient:'].concat(args))
	}

	function error(...args){
		console.error.apply(null, ['C2WebClient Error:'].concat(args))
	}

	return {
		setVueData: setVueData
	}
})()