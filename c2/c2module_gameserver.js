const C2LoggingUtility = require('./utility.js').C2LoggingUtility
const C2GameServerManager = require('./C2GameServerManager.js')

module.exports = class C2Module_Gameserver extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2GameServerManager = new C2GameServerManager(loglevel)

		this.c2GameServerManager.on('stdout', (data)=>{
			this.c2.sendMessageToWebClient('all', 'gameserver-stdout', data)
		})

		this.c2GameServerManager.on('gameserver-state', (state)=>{
			this.c2.sendMessageToWebClient('all', 'gameserver-state', state)
		})

		this.c2.registerWebClientMessageHandler('gameserver-start', (client, data)=>{
			return new Promise((resolve, reject)=>{
				if(!this.clientHasPermission(client)){
					return reject('You are not allowed to do this')
				}

				this.c2GameServerManager.spawnGameServer().then(()=>{
					resolve()
				}).catch((err)=>{
					reject('Unable to start GameServer: ' + err)
				})
			})
		})

		this.c2.registerWebClientMessageHandler('gameserver-stop', (client, data)=>{
			return new Promise((resolve, reject)=>{
				if(!this.clientHasPermission(client)){
					return reject('You are not allowed to do this')
				}

				this.c2GameServerManager.killGameServer().then(()=>{
					resolve()
				}).catch((err)=>{
					reject('Unable to stop game server: ' + err)
				})
			})
		})
	}

	clientHasPermission(client){
		return this.c2.c2Module_Core.tokenHasRole(client.token, 'Owner')
	}
}
