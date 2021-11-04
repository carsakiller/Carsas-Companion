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

		this.c2GameServerManager.on('gameserver-connected', ()=>{
			this.c2.sendMessageToWebClient('all', 'gameserver-state', true)
		})

		this.c2GameServerManager.on('gameserver-disconnected', (data)=>{
			this.c2.sendMessageToWebClient('all', 'gameserver-state', false)
		})
	}
}
