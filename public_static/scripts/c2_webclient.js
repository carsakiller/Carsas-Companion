class C2WebClient {

	constructor(c2){
		this.c2 = c2

		/*
			loglevels: 1 = error, 2 = warn, 3 = info, 4 = log
		*/
		this.LOGLEVEL = 4

		this.ws = new C2WebSock('ws://' + window.location.host + '/ws', 'XYZ')

		this.ws.on('open', ()=>{
			this.log('is now open')
			this.setStatus('Server Connected', 'success')
			setTimeout(()=>{
				this.setStatus(undefined, undefined)
			}, 2000)

			if(false){
				setTimeout(()=>{
					ws.send({
						type: 'rtt',
						data: new Date().getTime()
					}).then((res)=>{
						this.log('rtt response success', res)
					}).catch((err)=>{
						this.log('rtt response unsuccessful', err)
					})
				}, 1000)

				setTimeout(()=>{
					ws.send({
						type: 'test',
						data: 'hello?'
					}).then((res)=>{
						this.log('test response success', res)
					}).catch((err)=>{
						this.log('test response unsuccessful', err)
					})
				}, 10000)
			}
		})

		this.ws.on('close', ()=>{
			this.log('is now closed')
			this.setStatus('Server Connection Lost', 'error')
		})

		this.ws.on('message', (message)=>{
			return new Promise((fulfill, reject)=>{
				if(message.type === 'heartbeat'){
					this.log('received message', message)
				} else {
					this.info('received message', message)
				}

				switch(message.type){
					case 'heartbeat': {
						//TODO
						fulfill()
					}; break;

					case 'rtt-response': {
						let rtt = new Date().getTime() - message.data
						this.log('RoundTripTime:', rtt, 'ms')
						fulfill(rtt + 'ms')
					}; break;

					case 'test-timeout': {
						//ignore so it runs into a timeout
					}; break;

					case 'sync-players': {
						this.c2.store.dispatch('setPlayers', message.data)
						fulfill()
					}; break;

					default: {

						if(message.type.indexOf('sync-') === 0){
							let dataname = message.type.substring('sync-'.length)

							this.log('got some sync message',dataname)

							//TODO
						} else {
							reject('unsupported request type: ' + message.type)
						}
					}
				}
			})
		})
	}

	sendCommand(command, data){
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

			this.log('sendCommand', command, dataString )

			this.ws.send({
				type: 'command-' + command,
				data: dataString
			}).then((res)=>{
				this.log('received response for command', command, res)
				fulfill(res)
			}).catch((err)=>{
				this.log('received error for command', command, err)
				reject(err)
			})
		})
	}

	setStatus(message, clazz){
		this.c2.store.dispatch('setStatus', {
			message: message,
			clazz: clazz
		})
	}

	error(...args){
		if( this.LOGLEVEL < 1){
			return
		}
		console.error.apply(null, ['C2WebClient Error:'].concat(args))
	}

	warn(...args){
		if( this.LOGLEVEL < 2){
			return
		}
		console.warn.apply(null, ['C2WebClient Warn:'].concat(args))
	}

	info(...args){
		if( this.LOGLEVEL < 3){
			return
		}
		console.info.apply(null, ['C2WebClient:'].concat(args))
	}

	log(...args){
		if( this.LOGLEVEL < 4){
			return
		}
		console.log.apply(null, ['C2WebClient:'].concat(args))
	}
}