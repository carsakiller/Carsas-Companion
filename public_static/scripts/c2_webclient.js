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

	sendMessage(messageType, data){//TODO: we always encode to lua JSON (e.g. nil insteda of null), we might need to adjust this for edge cases at some point
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

			this.log('sendMessage', messageType, dataString )

			this.ws.send({
				type: messageType,
				data: dataString
			}).then((res)=>{
				this.log('received response for', messageType, res)
				fulfill(res)
			}).catch((err)=>{
				this.log('received error for', messageType, err)
				reject(err)
			})
		})
	}
}