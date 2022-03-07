let ConsoleLogger = (()=>{
	const logs = []

	const MAX_LOG_Entries = 100

	const originalFunctions = {}

	for(let stream of ['error', 'warn', 'info', 'log', 'debug']){
		originalFunctions[stream] = console[stream]
		console[stream] = function(...args){
			let cleanArgs = []

			for(let arg of args){
				if(typeof arg === 'string'){
					if(arg.match(/color:[\s]*[a-zA-Z0-9#]*/)){
						//ignore coloring agruments
					} else if(arg.indexOf('%c') >= 0) {
						cleanArgs.push(arg.replaceAll('%c', ''))
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

			logs.push({
				timestamp: new Date().toLocaleTimeString(),
				type: stream,
				args: cleanArgs
			})

			if(logs.length > MAX_LOG_Entries){
				logs.splice(logs.length - 1, 1)
			}

			originalFunctions[stream].apply(undefined, args)
		}
	}

	console.logAlways = originalFunctions['log']

	return {
		getLatestLogAsString: ()=>{
			let str = ''

			for(let l of logs){
				str += `${l.timestamp} [${l.type}] ` + l.args.join(' ') + '\n'
			}

			return str
		}
	}
})()