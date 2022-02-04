const C2LoggingUtility = require('./utility.js').C2LoggingUtility

module.exports = class C2Module_Core extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.registerWebClientMessageHandler('*', (client, data, messageType)=>{
			if(messageType.startsWith('command-')){
				return new Promise((fulfill, reject)=>{
					let commandname = messageType.substring('command-'.length)
					this.log('(?)', 'executing command:', commandname, data)
					this.c2.sendMessageToGame(client.token, messageType, data).then((res)=>{
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
					reject('unsupported type: ' + messageType)
				})
			}
		})

		this.c2.registerWebClientMessageHandler('companion-login', (client, data, messageType)=>{
			return this.c2.sendMessageToGame(client.token, messageType, data)//TODO: rate limit this
		})

		this.c2.registerGameMessageHandler('heartbeat', (data, messageType)=>{
			if(data === 'first'){
				//script has just reloaded
				this.info('Game script has restarted, force reloading all webclients ...')
				c2.c2WebInterface.c2WebSocketHandler.forceReloadAll()
			}

			return this.c2.sendMessageToWebClient('all', messageType, data)
		})

		this.c2.registerGameMessageHandler('*', (data, messageType)=>{
			if(messageType.startsWith('sync-')){
				return new Promise((fulfill, reject)=>{
					let syncname = messageType.substring('sync-'.length)
					this.info('(%)', 'syncing', syncname)
					this.log(data)
					this.c2.sendMessageToWebClient('all', messageType, data).then((res)=>{
						this.log('sync', syncname, 'success:', res)
						fulfill()
					}).catch((err)=>{
						this.log('sync', syncname, 'unsuccessful:', err)
						reject(err)
					})
				})
			} else {
				this.error('unsupported type by game', messageType)
				return new Promise((fulfill, reject)=>{
					reject('unsupported type: ' + messageType)
				})
			}
		})
	}
}
