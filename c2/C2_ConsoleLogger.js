const fs = require('fs')
const path = require('path')

module.exports = class ConsoleLogger {

	constructor(){
		this.LOG_FILE_PATH = path.join(process.cwd(), 'log.txt')


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

		this.originalFunctions = {}

		for(let stream of ['error', 'warn', 'info', 'log', 'debug']){
			this.originalFunctions[stream] = console[stream]
			console[stream] = function(...args){
				that.appendLog(stream, this.cleanupArgs(args))

				that.originalFunctions[stream].apply(undefined, args)
			}
		}

		console.logAlways = that.originalFunctions['log']
	}

	cleanupArgs(args){
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
					cleanArgs.push(JSON.stringify(arg, null, 2))
				} catch (thrown){
					cleanArgs.push('[object]')
				}
			}
		}

		return cleanArgs
	}

	log(type, args, displayInConsole){
		if(displayInConsole === true){
			this.originalFunctions[type].apply(undefined, args)
		}

		this.appendLog(type, this.cleanupArgs(args))
	}

	appendLog(type, args){
		this.filestream.write(
			`${new Date().toLocaleTimeString()} [${type}] ${args.join(' ')}\n`
		)
	}
}