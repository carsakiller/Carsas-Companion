const fs = require('fs')
const path = require('path')

class ConsoleLogger {

	constructor(){
		this.LOG_FILE_PATH = path.join(__dirname, '..', 'log.txt')


		try {
			fs.accessSync(this.LOG_FILE_PATH, fs.constants.W_OK)

			try {
				fs.unlinkSync(this.LOG_FILE_PATH)
			} catch (err){
				console.log('unable to empty log.txt')
			}
		} catch (err){
			//all good, logfile not existing
		}

		this.filestream = fs.createWriteStream(this.LOG_FILE_PATH, {flags: 'a'})

		const that = this

		for(let stream of ['error', 'warn', 'info', 'log', 'debug']){
			const originalFunction = console[stream]
			console[stream] = function(...args){
				let cleanArgs = []

				for(let arg of args){
					if(typeof arg === 'string'){
						if(arg.match(/color:[\s]*[a-zA-Z0-9#]*/)){
							//ignore coloring agruments
						} else if(arg.indexOf('%c') >= 0) {
							cleanArgs.push(arg.replaceAll('%c', ''))
						} else if(arg.indexOf('\x1b') === 0) {
							//skip
						} else {
							cleanArgs.push(arg)
						}
					} else {
						try {
							cleanArgs.push('' + arg)
						} catch (thrown){
							cleanArgs.push('[object]')
						}
					}
				}


				that.appendLog(stream,cleanArgs)

				originalFunction.apply(undefined, args)
			}
		}
	}

	appendLog(type, args){
		this.filestream.write(
			`${new Date().toLocaleTimeString()} [${type}] ${args.join(' ')}\n`
		)
	}
}

new ConsoleLogger();

let mixin_LoggingUtility = Base => class extends Base {

	/*
		loglevels: 1 = error, 2 = warn, 3 = info, 4 = log, 5 = debug
	*/

	constructor(loglevel){
		super()

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

		this.loglevel = Math.max(0, typeof loglevel === 'number' ? loglevel : 4)
		this.log("loglevel", this.loglevel)
	}

	colorizeConsole(text, color){
		return this.CONSOLE_COLORS[color] + text + this.CONSOLE_COLORS.Reset
	}

	error(...args){
		if(this.loglevel < 1){
			return
		}
		console.error.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Error', 'FgRed')
		].concat(args))
	}

	warn(...args){
		if(this.loglevel < 2){
			return
		}
		console.warn.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Warning', 'FgYellow')
		].concat(args))
	}

	info(...args){
		if(this.loglevel < 3){
			return
		}
		console.info.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Info', 'FgMagenta')
		].concat(args))
	}

	log(...args){
		if(this.loglevel < 4){
			return
		}
		console.log.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Log', 'FgWhite')
		].concat(args))
	}

	debug(...args){
		if(this.loglevel < 5){
			return
		}
		console.debug.apply(null, [
			this.colorizeConsole('-{', 'FgBlue')
			+ this.constructor.name
			+ this.colorizeConsole('}-', 'FgBlue')
			+ ' '
			+ this.colorizeConsole('Debug', 'FgWhite')
		].concat(args))
	}
}

let mixin_EventManager = Base => class extends Base {

	constructor(loglevel){
		super(loglevel)
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

}

class C2EventManager extends mixin_EventManager(C2BaseClass) {

}

class C2EventManagerAndLoggingUtility extends mixin_LoggingUtility(mixin_EventManager(C2BaseClass)) {

}

class C2Handler extends mixin_LoggingUtility(mixin_EventManager(C2BaseClass)) {

	constructor(loglevel){
		super(loglevel)

		this.messageCallback = undefined
	}

	setMessageCallback(callback){
		if(typeof callback !== 'function'){
			this.error('callback must be a function')
		}
		this.messageCallback = callback
	}

}


class C2Interface extends mixin_LoggingUtility(mixin_EventManager(C2BaseClass)) {

}


module.exports = {
	C2LoggingUtility: C2LoggingUtility,
	C2EventManager: C2EventManager,
	C2EventManagerAndLoggingUtility: C2EventManagerAndLoggingUtility,
	C2Handler: C2Handler,
	C2Interface: C2Interface,
	ConsoleLogger: ConsoleLogger
}