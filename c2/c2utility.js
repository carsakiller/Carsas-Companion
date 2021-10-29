let mixin_LoggingUtility = Base => class extends Base {
	constructor(){
		super()
	}

	error(...args){
		console.error.apply(null, ['\x1b[34m[' + this.constructor.name + '] \x1b[31mError:\x1b[37m'].concat(args))
	}

	warn(...args){
		console.warn.apply(null, ['\x1b[34m[' + this.constructor.name + '] \x1b[33mWarning:\x1b[37m'].concat(args))
	}

	info(...args){
		console.info.apply(null, ['\x1b[34m[' + this.constructor.name + '] \x1b[35mInfo:\x1b[37m'].concat(args))
	}

	log(...args){
		console.log.apply(null, ['\x1b[34m[' + this.constructor.name + ']\x1b[37m'].concat(args))
	}
}

let mixin_EventManager = Base => class extends Base {

	constructor(){
		super()
		this.eventListeners = {}
	}

	on(eventname, callback){
		if(! this.eventListeners[eventname]){
			this.eventListeners[eventname] = []
		}

		if(typeof eventname !== 'string'){
			throw new Error('eventname is not a string')
		}

		if(typeof callback === 'function'){
			this.eventListeners[eventname].push(callback)
		} else {
			throw new Error('callback is not a function')
		}
	}

	dispatch(eventname, ...data){
		if(this.eventListeners[eventname]){
			for(let l of this.eventListeners[eventname]){
				return l.apply(null, data)
			}
		}
	}
}



class C2BaseClass {
	//nothing
}






class C2LoggingUtility extends mixin_LoggingUtility(C2BaseClass) {
	constructor(){
		super()
	}
}

class C2EventManager extends mixin_EventManager(C2BaseClass) {
	constructor(){
		super()
	}
}


class C2Handler extends mixin_LoggingUtility(C2BaseClass) {

	constructor(){
		super()

		this.messageCallback = undefined
	}

	setMessageCallback(callback){
		if(typeof callback !== 'function'){
			this.error('callback must be a function')
		}
		this.messageCallback = callback
	}

}

let mixin_C2LoggingUtility = Base => class extends Base{

}

class C2Interface extends mixin_LoggingUtility(mixin_EventManager(C2BaseClass)) {

	constructor(){
		super()
	}
}


module.exports = {
	C2LoggingUtility: C2LoggingUtility,
	C2Handler: C2Handler,
	C2Interface: C2Interface
}