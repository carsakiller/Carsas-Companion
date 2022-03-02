const { exec } = require('child_process');
const path = require('path');

class C2GameServerProcess {
	
	constructor(loglevel, executableFullPath){
		this.loglevel = loglevel

		if(!executableFullPath){
			this.error('executableFullPath is not defined')
			return
		}

		this.info('executableFullPath:', executableFullPath)


		this.childProcess = exec(executableFullPath, {
			cwd: path.dirname(executableFullPath),
			windowsHide: false
		})

		this.childProcess.on('spawn', ()=>{
			this.sendToParentProcess('spawn')

			this.childProcess.stdout.on('data', (data) => {
				let str = data.toString()
				this.debug('Received chunk ', str);
				this.sendToParentProcess('stdout', str)
			});
		})

		this.childProcess.on('error', (err)=>{
			this.sendToParentProcess('error', err)
			this.error('child process error', err)
		})

		this.childProcess.on('close', ()=>{
			this.sendToParentProcess('close')
			this.info('child process has closed')
		})

		this.childProcess.on('exit', ()=>{
			this.sendToParentProcess('exit')
			this.info('child process has ended')
		})
	}

	sendToParentProcess(type, data){
		process.send({
			type: type,
			data: data
		})
	}


	error(...args){
		if(this.loglevel < 1){
			return
		}

		console.error.apply(null, [this.constructor.name, 'Error'].concat(args))
	}

	warn(...args){
		if(this.loglevel < 2){
			return
		}

		console.warn.apply(null, [this.constructor.name, 'Warn'].concat(args))
	}

	info(...args){
		if(this.loglevel < 3){
			return
		}

		console.info.apply(null, [this.constructor.name, 'Info'].concat(args))
	}

	log(...args){
		if(this.loglevel < 4){
			return
		}

		console.log.apply(null, [this.constructor.name, 'Log'].concat(args))
	}

	debug(...args){
		if(this.loglevel < 5){
			return
		}

		console.debug.apply(null, [this.constructor.name, 'Debug'].concat(args))
	}
}


let args = {}

for(let i=2; i<process.argv.length; i++){
	let arg = process.argv[i].split('=')
	args[arg[0]] = arg[1]
}

let c2GameServerProcess = new C2GameServerProcess(2, args.executableFullPath)