let C2Web = (()=>{
	let ws = new WebSock('ws://' + window.location.host + '/ws', 'XYZ')

	ws.on('open', ()=>{
		log('is now open')

		setTimeout(()=>{
			ws.send({
				requestType: 'rtt',
				data: new Date().getTime()
			}).then((res)=>{
				let parsed = JSON.parse(res)
				log('rtt response success', parsed)
			}).catch((err)=>{
				log('rtt response unsuccessful', err)
			})
		}, 1000)
	})

	ws.on('close', ()=>{
		log('is now closed')
	})

	ws.on('message', (message)=>{
		return new Promise((fulfill, reject)=>{
			log('received message', message)

			switch(message.requestType){
				case 'rtt-response': {
					let rtt = new Date().getTime() - message.data
					log('RoundTripTime:', rtt, 'ms')
					fulfill(rtt + 'ms')
				}; break;

				default: {
					reject('unsupported request type', message.requestType)
				}
			}
		})
	})

	function log(...args){
		console.log.apply(null, ['C2WebClient:'].concat(args))
	}

	function error(...args){
		console.error.apply(null, ['C2WebClient Error:'].concat(args))
	}

	return {}
})()