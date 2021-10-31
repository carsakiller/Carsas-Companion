let C2WebClient = (()=>{
	
	let ws = new WebSock('ws://' + window.location.host + '/ws', 'XYZ')

	/*
		loglevels: 1 = error, 2 = warn, 3 = info, 4 = log
	*/
	const LOGLEVEL = 4

	ws.on('open', ()=>{
		log('is now open')
		setStatus('Server Connected', 'success')
		setTimeout(()=>{
			setStatus(undefined, undefined)
		}, 2000)

		if(false){
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
		}
	})

	ws.on('close', ()=>{
		log('is now closed')
		setStatus('Server Connection Lost', 'error')
	})

	ws.on('message', (message)=>{
		return new Promise((fulfill, reject)=>{
			if(message.type === 'heartbeat'){
				log('received message', message)
			} else {
				info('received message', message)
			}

			switch(message.type){
				case 'heartbeat': {
					//TODO
					fulfill()
				}; break;

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
			let dataString = toString(data)

			function toString(it){
				if(it === undefined || it === null){
					return 'nil'
				} else if (it instanceof Array){
					let all = ''
					for(let i in it){
						all += toString(it[i]) + (i < it.length - 1 ? ' ' : '')
					}
					return all
				} else {
					return '' + it
				}
			}

			log('sendCommand', command, dataString )

			ws.send({
				type: 'command-' + command,
				data: dataString
			}).then((res)=>{
				log('received response for command', command, res)
				fulfill(res)
			}).catch((err)=>{
				log('received error for command', command, err)
				reject(err)
			})
		})
	}

	function setStatus(message, clazz){
		store.dispatch('setStatus', {
			message: message,
			clazz: clazz
		})
	}

	function error(...args){
		if( LOGLEVEL < 1){
			return
		}
		console.error.apply(null, ['C2WebClient Error:'].concat(args))
	}

	function warn(...args){
		if( LOGLEVEL < 2){
			return
		}
		console.warn.apply(null, ['C2WebClient Warn:'].concat(args))
	}

	function info(...args){
		if( LOGLEVEL < 3){
			return
		}
		console.info.apply(null, ['C2WebClient:'].concat(args))
	}

	function log(...args){
		if( LOGLEVEL < 4){
			return
		}
		console.log.apply(null, ['C2WebClient:'].concat(args))
	}

	

	return {
		sendCommand: sendCommand
	}
})()