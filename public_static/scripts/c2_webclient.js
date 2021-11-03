class C2WebClient extends C2EventManagerAndLoggingUtility {

	/*
		events:

		connected
		disconnected
		message
	*/

	constructor(c2){
		super(4)

		this.c2 = c2

		this.ws = new C2WebSock('ws://' + window.location.host + '/ws', 'XYZ')

		this.ws.on('open', ()=>{
			this.log('is now open')

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

			this.dispatch('connected')
		})

		this.ws.on('close', ()=>{
			this.log('is now closed')
			this.dispatch('disconnected')
		})

		this.ws.on('message', (message)=>{
			return this.dispatch('message', message)
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
}