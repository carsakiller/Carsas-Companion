const C2GameHttpHandler = require('./c2gamehttphandler.js')
const C2Interface = require('./c2utility.js').C2Interface

module.exports = class C2GameInterface extends C2Interface {

	/* events:
		message callback({type: [string], data: [string,number,object,...]})

		(only the first registered callback can respond to a message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
	*/

	constructor(loglevel,app){
		super(loglevel)

		this.c2GameHttpHandler = new C2GameHttpHandler(loglevel)

		app.use('/game-api', (req, res)=>{
			this.c2GameHttpHandler.onGameHTTP(req,res)
		});

		this.c2GameHttpHandler.setMessageCallback((message)=>{
			this.info('<- ', 'got game message', message.type)
			let promise = this.dispatch('message', message)

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
		this.info(' ->', 'sending command', command)
		this.log(data)
		return new Promise((fulfill, reject)=>{
			this.c2GameHttpHandler.sendCommandToGame(command, data).then((res)=>{
				this.info('received result from command ', command, res)

				fulfill(res)
			}).catch((err)=>{
				reject(err)
			})
		})
	}

	cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}
}