const C2LoggingUtility = require('./utility.js').C2LoggingUtility

module.exports = class C2Module_Map extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.registerGameMessageHandler('stream-map', (data)=>{
			this.c2.sendMessageToWebClient('all', 'stream-map', data)
		})
	}
}
