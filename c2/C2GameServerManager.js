const { fork } = require('child_process');
const { C2EventManagerAndLoggingUtility } = require('./C2_Utility.js')
const ps = require('ps-node');
const fs = require('fs')
const path = require('path')

module.exports = class C2GameServerManager extends C2EventManagerAndLoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.isRunning = false
		this.pid = undefined // '12345'

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

	getExecutableFullPath(){
		let pathSetting = this.c2.c2Module_Core.getCurrentServerSetting('gameserver-executable-path')
		return pathSetting ? path.normalize(pathSetting) : undefined
	}

	getExecutableName(){
		return this.getExecutableFullPath() ? path.basename(this.getExecutableFullPath()) : undefined
	}

	spawnGameServer(){
		if(!this.getExecutableFullPath()){
			// executable not set
			return new Promise((resolve, reject)=>{
				reject('executable path not set')
			})
		}


		let prom = this.makeQuerablePromise( new Promise((resolve, reject)=>{
			this.info('spawnGameServer')
			this.isGameServerRunning((err, isRunning)=>{
				if(err){
					return reject('error: check server logs')
				}

				if(isRunning){
					return reject('GameServer already running')
				}


				let executableFullPath = this.getExecutableFullPath()
				try {
					fs.accessSync(executableFullPath, fs.constants.R_OK)
				} catch (err){
					return reject('Executable not existing: ' + executableFullPath)
				}

				try {
					fs.accessSync(executableFullPath, fs.constants.X_OK)
				} catch (err){
					return reject('Executable can not be executed (windows user has no permission): ' + executableFullPath)
				}


				try {
					this.childProcess = fork(path.join(__dirname, './c2GameServerProcess.js'),
						['executableFullPath=' + executableFullPath],
						{
							detached: true
						}
					)
				} catch (ex){
					this.error(ex)
					return reject()
				}

				this.childProcess.on('spawn', ()=>{
					this.info('fork process spawned')

					this.childProcess.unref()
				})

				this.childProcess.on('close', ()=>{
					this.info('fork process closed')

					if(prom.isPending()){
						reject('fork process closed')
					}
				})

				this.childProcess.on('exit', ()=>{
					this.info('fork process exited')

					if(prom.isPending()){
						reject('fork process exited')
					}
				})

				this.childProcess.on('error', (err)=>{
					this.error('fork process error', err)
				})

				this.childProcess.on('message', (message)=>{
					this.debug('got message from fork process', message)

					switch(message.type){

						case 'spawn': {
							this.dispatch('spawn')

							if(prom.isPending()){
								resolve('fork process spawned successful')
							}
						}; break;

						case 'stdout': {

							let str = '' + message.data

							//fix that the text will not arrive in one nice piece, instead it will arrive as multiple copies in random positions
							let start = str.indexOf('Server Version')
							let end = str.indexOf('Server Version', start + 1)

							if(start < 0 || end < 0){
								return
							}

							let fixed = str.substring(start, end)

							if(fixed.trim() === ''){

							}

							this.dispatch('stdout', fixed)
						}; break;

						case 'error': {
							this.dispatch('error', '' + message.data)
						}; break;

						case 'close': {
							this.dispatch('close')
						}; break;

						case 'exit': {
							this.dispatch('exit')
						}; break;

						default: {
							this.error('fork process sent unsupported message type', message.type)
						}
					}
				})
			})
		}))

		return prom
	}

	//force kills child processes
	forceExit(){
		if(this.childProcess){
			this.childProcess.kill()
		}
	}

	killGameServer(){
		return new Promise((resolve, reject)=>{
			this.info('killGameServer')
			this.isGameServerRunning((err, isRunning, pid)=>{
				if(err){
					reject('error: check server logs')
					return
				}

				if(!isRunning){
					reject('GameServer not running')
					return
				}

				this.killProcess(pid).then(()=>{
					resolve()
				}).catch(()=>{
					reject('error check server logs')
				})
			})
		})
	}

	checkIfGameServerIsRunning(){
		this.isGameServerRunning((err, isRunning, pid)=>{
			if(err){ return }

			if(this.isRunning && !isRunning){
				this.info('Game Server not running anymore')
				this.dispatch('gameserver-state', false)
			}

			if(!this.isRunning && isRunning){
				this.info('Game Server running again')
				this.dispatch('gameserver-state', true)
			}

			if(this.isRunning){
				this.log('checkIfGameServerIsRunning: yes')
			} else {
				this.log('checkIfGameServerIsRunning: no')
			}

			this.isRunning = isRunning
			this.pid = pid
		})
	}

	/*
		callback(err, isRunning, pid)
	*/
	isGameServerRunning(callback){
		/*
			when we start the executable, we include the full path name, but others might not do that

			since the executable name is not exactly unique, it's bad to only use that name as an identifier

			cool in windows: if you double click the executable, it also includes the full path name.
			So only when someone starts the server like via cmd.exe `server64.exe` we cannot be sure.
		*/

		if(!this.getExecutableFullPath()){
			return callback('executable path not set', false)
		}

		this.isProcessRunning(this.getExecutableName(), this.getExecutableFullPath(), (err, isRunning, task)=>{
			if(!err && isRunning){
				this.log('found running server executable')
				callback(false, true, task.pid)
			} else {
				callback(false, false)
			}
		})
	}

	killProcess(pid){
		let prom = this.makeQuerablePromise( new Promise((resolve, reject)=>{
			ps.kill(pid, (err)=>{
				if(prom.isPending()){//fixes a bug of ps-node where it might call the error callback even thouhg process is already dead
					if(err){
						this.error('error while killing process', err)
						reject()
					} else {
						resolve()
					}
				}
			})
		}))

		return prom
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


	/**
	 * This function allow you to modify a JS Promise by adding some status properties.
	 * Based on: http://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
	 * But modified according to the specs of promises : https://promisesaplus.com/
	 */
	makeQuerablePromise(promise) {
	    // Don't modify any promise that has been already modified.
	    if (promise.isResolved) return promise;

	    // Set initial state
	    var isPending = true;
	    var isRejected = false;
	    var isResolved = false;

	    // Observe the promise, saving the resolvement in a closure scope.
	    var result = promise.then(
	        function(v) {
	            isResolved = true;
	            isPending = false;
	            return v;
	        },
	        function(e) {
	            isRejected = true;
	            isPending = false;
	            throw e;
	        }
	    );

	    result.isResolved = function() { return isResolved; };
	    result.isPending = function() { return isPending; };
	    result.isRejected = function() { return isRejected; };
	    return result;
	}
}