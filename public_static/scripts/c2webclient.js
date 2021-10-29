let C2WebClient = (()=>{
	
	let ws = new WebSock('ws://' + window.location.host + '/ws', 'XYZ')

	let vueData

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

				case 'test-timeout': {
					//ignore so it runs into a timeout
				}; break;

				case 'sync-players': {
					store.dispatch('setPlayers', message.data)
					fulfill()
				}; break;

				case 'alive': {
					//TODO
					fulfill()
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

	function sendCommand(command, data){
		return new Promise((fulfill, reject)=>{
			log('sendCommand', command, data)
			ws.send({
				type: 'command-' + command,
				data: data
			}).then((res)=>{
				log('received response for command', command, res)
				fulfill(res)
			}).catch((err)=>{
				log('received error for command', command, err)
				reject(err)
			})
		})
	}

	function setVueData(_vueData){
		vueData = _vueData
	}

	function log(...args){
		console.log.apply(null, ['C2WebClient:'].concat(args))
	}

	function warn(...args){
		console.warn.apply(null, ['C2WebClient Warn:'].concat(args))
	}

	function error(...args){
		console.error.apply(null, ['C2WebClient Error:'].concat(args))
	}

	return {
		sendCommand: sendCommand,
		setVueData: setVueData
	}
})()