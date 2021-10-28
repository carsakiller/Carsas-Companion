let C2Web = (()=>{
	let ws = new WebSock('ws://' + window.location.host + '/ws', 'XYZ')

	ws.on('open', ()=>{
		log('is now open')

		setTimeout(()=>{
			ws.send(JSON.stringify({
				requestType: 'rtt',
				data: new Date().getTime()
			})).then((res)=>{
				let parsed = JSON.parse(res)
				log('rtt response success', parsed)
			}).catch((err)=>{
				warn('rtt response unsuccessful', err)
			})
		}, 1000)
	})

	ws.on('close', ()=>{
		log('is now closed')
	})

	ws.on('message', (data)=>{
		return new Promise((fulfill, reject)=>{
			log('received message', data)

			let parsed
			try {
				parsed = JSON.parse(data)
			} catch (ex){
				error('error parsing message', ex)
				reject('error parsing message: ' + ex)
				return
			}

			switch(parsed.requestType){
				case 'rtt-response': {
					log('RoundTripTime:', new Date().getTime() - parsed.data, 'ms')
					fulfill()
				}; break;

				default: {
					reject('unsupported request type', parsed.requestType)
				}
			}
		})
	})

	function log(...args){
		console.log.apply(null, ['C2Client:'].concat(args))
	}

	function error(...args){
		console.error.apply(null, ['C2Client Error:'].concat(args))
	}

	return {}
})()