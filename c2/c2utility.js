let mixin_LoggingUtility = Base => class extends Base {

	/*
		loglevels: error, warn, info, log
	*/

	constructor(loglevel){
		super()

		this.LOGLEVEL = {		
			log: 4,
			info: 3,
			warn: 2,
			error: 1
		}

		this.CONSOLE_COLORS = {
			'Reset': '[0m',
			'Bright': '[1m',
			'Dim': '[2m',
			'Underscore': '[4m',
			'Blink': '[5m',
			'Reverse': '[7m',
			'Hidden': '[8m',

			'FgBlack': '[30m',
			'FgRed': '[31m',
			'FgGreen': '[32m',
			'FgYellow': '[33m',
			'FgBlue': '[34m',
			'FgMagenta': '[35m',
			'FgCyan': '[36m',
			'FgWhite': '[37m',

			'BgBlack': '[40m',
			'BgRed': '[41m',
			'BgGreen': '[42m',
			'BgYellow': '[43m',
			'BgBlue': '[44m',
			'BgMagenta': '[45m',
			'BgCyan': '[46m',
			'BgWhite': '[47m',
		}

		for(let key of Object.keys(this.CONSOLE_COLORS)){
			this.CONSOLE_COLORS[key] = '\x1b' + this.CONSOLE_COLORS[key]
		}

		this.loglevel = typeof loglevel === 'string' ? this.LOGLEVEL[loglevel.toLowerCase()] | this.LOGLEVEL.log : this.LOGLEVEL.log
	}

	colorizeConsole(text, color){
		return this.CONSOLE_COLORS[color] + text + this.CONSOLE_COLORS.Reset
	}

	error(...args){
		if(this.loglevel < this.LOGLEVEL.error){
			return
		}
		console.error.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Error:', 'FgRed')
		].concat(args))
	}

	warn(...args){
		if(this.loglevel < this.LOGLEVEL.warn){
			return
		}
		console.error.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Warning:', 'FgYellow')
		].concat(args))
	}

	info(...args){
		if(this.loglevel < this.LOGLEVEL.info){
			return
		}
		console.error.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Info:', 'FgMagenta')
		].concat(args))
	}

	log(...args){
		if(this.loglevel < this.LOGLEVEL.log){
			return
		}
		console.error.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
		].concat(args))
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