const C2GameHttpHandler = require('./c2gamehttphandler.js')
const C2Interface = require('./c2utility.js').C2Interface

module.exports = class C2GameInterface extends C2Interface {

	/* events:
		message callback({type: [string], data: [string,number,object,...]})

		(only the first registered callback can respond to a message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
	*/

	constructor(app){
		super()

		this.c2GameHttpHandler = new C2GameHttpHandler()

		app.use('/game-api', (req, res)=>{
			this.c2GameHttpHandler.onGameHTTP(req,res)
		});

		this.c2GameHttpHandler.setMessageCallback((message)=>{
			this.log('<- ', 'got game message', message)
			let promise = this._dispatch('message', message)

			if(promise instanceof Promise){
				return promise
			} else {
				return new Promise((fulfill, reject)=>{
					fulfill(promise)
				})
			}
		})
	}
	
	sendCommand(command, data){
		this.log(' ->', 'sending command', command, data)
		return new Promise((fulfill, reject)=>{
			this.c2GameHttpHandler.sendCommandToGame(command, data, (res)=>{
				this.log('received result from command ', command, res)

				if(res === 'ok'){
					fulfill(res)
				} else {
					reject(res)
				}

				return 'ok'
			})
		})
	}

	cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}
}