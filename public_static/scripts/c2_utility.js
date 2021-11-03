let mixin_LoggingUtility = Base => class extends Base {

	/*
		loglevels: 1 = error, 2 = warn, 3 = info, 4 = log, 5 = debug
	*/

	constructor(loglevel){
		super()

		this.loglevel = 5 //The browser can filter it by himself

		let loglevelValue = Math.max(0, typeof loglevel === 'number' ? loglevel : 4)
		this.log("loglevel", loglevelValue)
		this.loglevel =loglevelValue
	}

	error(...args){
		if(this.loglevel < 1){
			return
		}
		console.error.apply(null, [
				'%c-{%c'
				+ this.constructor.name
				+ '%c}-%c Error',

				'color: #364CC4', 'color: initial',
				'color: #364CC4', 'color: red'
			].concat(args)
		)
	}

	warn(...args){
		if(this.loglevel < 2){
			return
		}
		console.warn.apply(null, [
				'%c-{%c'
				+ this.constructor.name
				+ '%c}-%c Warning',

				'color: #364CC4', 'color: initial',
				'color: #364CC4', 'color: orang'
			].concat(args)
		)
	}

	info(...args){
		if(this.loglevel < 3){
			return
		}
		console.info.apply(null, [
				'%c-{%c'
				+ this.constructor.name
				+ '%c}-%c Info',

				'color: #364CC4', 'color: initial',
				'color: #364CC4', 'color: magenta'
			].concat(args)
		)
	}

	log(...args){
		if(this.loglevel < 4){
			return
		}
		console.log.apply(null, [
				'%c-{%c'
				+ this.constructor.name
				+ '%c}-%c',

				'color: #364CC4', 'color: initial',
				'color: #364CC4', 'color: initial'
			].concat(args)
		)
	}

	debug(...args){
		if(this.loglevel < 5){
			return
		}
		console.debug.apply(null, [
				'%c-{%c'
				+ this.constructor.name
				+ '%c}-%c',

				'color: #364CC4', 'color: initial',
				'color: #364CC4', 'color: initial',

				this
			].concat(args)
		)
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

	/*
		the first registered event listener can return something and this will be forwarded to the caller of dispatch()

		e.g.

		let res = this.dispatch('example')
	*/
	dispatch(eventname, ...data){
		let ret
		if(this.eventListeners[eventname]){
			for(let l of this.eventListeners[eventname]){
				ret = l.apply(null, data)
			}
		}
		return ret
	}
}



class C2BaseClass {
	//nothing
}

class C2LoggingUtility extends mixin_LoggingUtility(C2BaseClass) {
	constructor(loglevel){
		super(loglevel)
	}
}

class C2EventManager extends mixin_EventManager(C2BaseClass) {
	constructor(){
		super()
	}
}

class C2EventManagerAndLoggingUtility extends mixin_EventManager(mixin_LoggingUtility(C2BaseClass)) {
	constructor(){
		super()
	}
}