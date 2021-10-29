const C2GameInterface = require('./c2gameinterface.js')
const C2WebInterface = require('./c2webinterface.js')

const C2LoggingUtility = require('./c2utility.js').C2LoggingUtility

module.exports = class C2 extends C2LoggingUtility {

	constructor(app){
		super()

		this.c2GameInterface = new C2GameInterface(app)
		this.c2WebInterface = new C2WebInterface(app)

		this.syncedData = {}

		if(true){
			setTimeout(()=>{//test performance of http transmission
				let messageSize = 4000
				let amountOfMessages = 4

				let message = ""
				for(let i=0;i<messageSize;i++){
					message += "Y"
				}

				let beginTime = new Date().getTime()

				let promises = []

				for(let i=0; i<amountOfMessages; i++){
					promises.push(this.c2GameInterface.sendCommand('test', message))
				}

				Promise.all(promises).then((res)=>{
					let endTime = new Date().getTime()

					this.info('Performance Test Result: took', Math.floor((endTime - beginTime) / 100) / 10, 's for',amountOfMessages, 'messages with', messageSize, 'chars each') 
				}).catch((err)=>{
					this.error('Performance Test Failed:', err)
				})
			}, 1000)
		}

		this.c2WebInterface.on('message', (...args)=>{
			this.handleWebClientMessage.apply(this, args)
		})

		this.c2GameInterface.on('message', (...args)=>{
			this.handleGameMessage.apply(this, args)
		})
	}

	handleWebClientMessage(client, message){
		this.log('handleWebClientMessage', client.token, message.type)

		switch(message.type){
			case 'rtt': {
				this.c2WebInterface.sendDataTo(client.token, 'rtt-response', message.data).then((res)=>{
					this.log('rtt-response success:', res)
				}).catch((err)=>{
					this.log('rtt-response unsuccessful:', err)
				})

				return message.data
			}; break;

			case 'test': {
				return new Promise((fulfill, reject)=>{
					this.c2GameInterface.sendCommand('test', message.data).then((res)=>{
						this.log('test success:', res)
						fulfill(res)
					}).catch((err)=>{
						this.log('test unsuccessful:', err)
						reject(err)
					})			
				})
			}; break;

			default: {

				if(message.type.startsWith('command-')){
					return new Promise((fulfill, reject)=>{
						let commandname = message.type.substring('command-'.length)
						this.log('(?)', 'executing command:', commandname)
						this.c2GameInterface.sendCommand(commandname, message.data).then((res)=>{
							this.log('command', commandname, 'success:', res)
							fulfill(res)
						}).catch((err)=>{
							this.log('command', commandname, 'unsuccessful:', err)
							reject(err)
						})
					})
				} else {
					this.error('unsupported type by client', message.type)
					return new Promise((fulfill, reject)=>{
						reject('unsupported type', message.type)
					})
				}
			}
		}
	}

	handleGameMessage(message){
		this.log('handleGameMessage', message.type)

		switch(message.type){
			case 'heartbeat': {
				this.c2WebInterface.sendDataTo('all', 'alive').then((res)=>{
					this.log('alive success:', res)
				}).catch((err)=>{
					this.log('alive unsuccessful:', err)
				})

				return 'good to know!'
			}; break;

			case 'test-performance': {
				return ''
			}; break;

			default: {

				if(message.type.startsWith('sync-')){
					let dataname = message.type.substring('sync-'.length)
					this.log('(§)', 'syncing data with web clients:', dataname)
					this.c2WebInterface.sendDataTo('all', message.type, message.data)

					return 'ok'
				} else {
					this.error('unsupported type by game', message.type)
					return 'unsupported type:' + message.type
				}
			}
		}
	}
}
