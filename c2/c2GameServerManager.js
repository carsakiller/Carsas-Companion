const { spawn } = require('child_process');
const { C2EventManagerAndLoggingUtility } = require('./c2utility.js')
const ps = require('ps-node');
const path = require('path')

module.exports = class c2GameServerManager extends C2EventManagerAndLoggingUtility {
	
	constructor(loglevel){
		super(loglevel)

		this.isRunning = false
		this.pid = undefined // '12345'
		this.type = undefined // 'x64' or 'x32'

		this.pathToServerExecutable = "C:\\condenser\\server\\stormworks_dedicated_server"
		this.executableName32 = 'server.exe'
		this.executableName64 = 'server64.exe'

		this.autoRestartServer = false


		this.isGameServerRunning((err, isRunning)=>{
			if(!isRunning && this.autoRestartServer){
				this.spawnGameServer()
			}
		})

		setInterval(()=>{
			this.checkIfGameServerIsRunning()
		}, 1000 * 10)
	}

	spawnGameServer(){
		return new Promise((fulfill, reject)=>{
			try {
				this.childProcess = spawn('cmd.exe', {// TODO: we are not able to get stdout from the server using the cmd.exe, thats bad. Maybe we need to spawn a seperate node.js process that directly executes the server.exe (and then unref that nodejs subprocess so it can survive when the main process exits)
					cwd: this.pathToServerExecutable,
					windowsHide: false,
					/*stdio: 'ignore',*/
					detached: true
				})

				this.childProcess.on('spawn', ()=>{
					this.info('Spawned child process', this.childProcess.pid)

					this.childProcess.stdin.write(path.join(this.pathToServerExecutable, this.executableName64) + '\r\n')

					this.childProcess.stdout.on('data', (data) => {
						this.debug('Received chunk', data.toString());
						this.dispatch('stdout', data.toString())
					});

					this.childProcess.unref()
				})

				this.childProcess.on('error', (err)=>{
					this.error('child process error', err)
				})

				this.childProcess.on('close', ()=>{
					this.info('child process has ended')
				})

			} catch (ex){
				this.error('error spawning child process')
				reject(ex)
			}
		})
	}

	checkIfGameServerIsRunning(){
		this.isGameServerRunning((err, isRunning, pid, type)=>{
			if(err){ return }

			if(this.isRunning && !isRunning){
				this.info('Game Server not running anymore')
				this.dispatch('game-server-stopped')
			}

			if(!this.isRunning && isRunning){
				this.info('Game Server running again')
				this.dispatch('game-server-started')
			}

			if(this.isRunning){
				this.log('checkIfGameServerIsRunning: yes')
			} else {
				this.log('checkIfGameServerIsRunning: no')
			}

			this.isRunning = isRunning
			this.pid = pid
			this.type = type
		})
	}

	/*
		callback(err, isRunning, pid, type)
	*/
	isGameServerRunning(callback){
		let promises = []

		let x32
		let x64

		/*
			TODO: when we start the executable, we include the full path name, but others might not do that

			since the executable name is not exactly unique, it's bad to only use that name as an identifier

			cool in windows: if you double click the executable, it also includes the full path name.
			So only when someone starts the server like via cmd.exe `server64.exe` we cannot be sure.
		*/
		this.isProcessRunning(this.executableName32, path.join(this.pathToServerExecutable, this.executableName32), (err, isRunning, task)=>{
			if(!err && isRunning){
				x32 = task.pid
			}

			this.isProcessRunning(this.executableName64, path.join(this.pathToServerExecutable, this.executableName64), (err, isRunning, task)=>{
				if(!err && isRunning){
					x64 = task.pid
				}

				if(x32 && x64){
					this.warn('32bit and 64bit version of server running, we will use 64bit')
				} else if(x64){
					this.log('found x64 version running')
					callback(false, true, x64, 'x64')
				} else if (x32){
					this.log('found x32 version running')
					callback(false, true, x32, 'x32')
				} else {
					callback(false, false)
				}
			})
		})
	}

	/*
		callback(err, sucess)
	*/
	killProcess(pid, callback){
		ps.kill(pid, (err)=>{
			if(err){
				this.error('error while killing process', err)
				callback(err)
			} else {
				fulfill(false, true)
			}
		})
	}

	/*
		callback(err, isRunning, taskInformation)
	*/
	isProcessRunning(name, fullpath, callback){
	    ps.lookup({
			command: name
		}, (err, resultList)=>{
			this.log('isProcessRunning', name, resultList)
			if(err){
				this.error('error when checking if process is running', err)
				callback(err)
			} else {
				if(fullpath){
					for(let r of resultList){
						if(r.command === fullpath){
							//this.log('found fullpath', fullpath)
							callback(false, true, r)
							return
						}
					}
					//this.log('could not find fullpath', fullpath, resultList)
					callback(false, false)
				} else {
					callback(false, resultList.length > 0, resultList[0])
				}
			}
		})
	}
}