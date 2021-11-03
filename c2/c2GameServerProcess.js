const { exec } = require('child_process');
const path = require('path');

const C2LoggingUtility = require('./c2utility.js').C2LoggingUtility

class C2GameServerProcess extends C2LoggingUtility {
	
	constructor(loglevel, executableDirectory, executableName){
		super(loglevel)

		if(!executableDirectory){
			this.error('executableDirectory is not defined')
			return
		}

		if(!executableName){
			this.error('executableName is not defined')
			return
		}

		this.info('executableDirectory:', executableDirectory)
		this.info('executableName:', executableName)

		this.executableDirectory = executableDirectory
		this.executableName = executableName


		this.childProcess = exec(path.join(this.executableDirectory, this.executableName), {
			cwd: this.executableDirectory,
			windowsHide: false
		})

		this.childProcess.on('spawn', ()=>{
			this.childProcess.stdout.on('data', (data) => {
				let str = data.toString()
				this.debug('Received chunk "', str, '"');
				this.sendToParentProcess('stdout', str)
			});
		})

		this.childProcess.on('error', (err)=>{
			this.error('child process error', err)
		})

		this.childProcess.on('close', ()=>{
			this.info('child process has closed')
		})

		this.childProcess.on('exit', ()=>{
			this.info('child process has ended')
		})
	}

	sendToParentProcess(type, data){
		process.send({
			type: type,
			data: data
		})
	}
}


let args = {}

for(let i=2; i<process.argv.length; i++){
	let arg = process.argv[i].split('=')
	args[arg[0]] = arg[1]
}

let c2GameServerProcess = new C2GameServerProcess(4, args.executableDirectory, args.executableName)