const C2LoggingUtility = require('./c2utility.js').C2LoggingUtility

module.exports = class C2Module_Core extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.registerWebClientMessageHandler('*', (client, data, messageType)=>{
			if(messageType.startsWith('command-')){
				return new Promise((fulfill, reject)=>{
					let commandname = messageType.substring('command-'.length)
					this.log('(?)', 'executing command:', commandname, data)
					this.c2.sendMessageToGame(commandname, data).then((res)=>{
						this.log('command', commandname, 'success:', res)
						fulfill(res)
					}).catch((err)=>{
						this.log('command', commandname, 'unsuccessful:', err)
						reject(err)
					})
				})
			} else {
				this.error('unsupported type by client', messageType)
				return new Promise((fulfill, reject)=>{
					reject('unsupported type', message.type)
				})
			}
		})

		this.c2.registerGameMessageHandler('heartbeat', (data)=>{
			// ne need to do anything
		})
	}
}
