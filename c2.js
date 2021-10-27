const c2 = (()=>{

	let players = []

	let commandIdCounter = 0;
	let commandsToTransferToGame = []
	let pendingCommandResponses = []


	function getPlayers(){
		return cloneObject(players);
	}

	function updatePlayers(newPlayers){
		players = newPlayers;
	}

	setTimeout(()=>{
		sendCommandToGame('test', '', (res)=>{
			console.log('received result from command test:', res)
		})
	}, 1000 * 10)

	function sendCommandToGame(command, content, callback){
		const myCommandId = commandIdCounter++;

		commandsToTransferToGame.push({
			id: myCommandId,
			command: command,
			content: content
		})

		pendingCommandResponses.push({
			id: myCommandId,
			callback: callback,
			timeScheduled: new Date().getTime(),
			parts: []
		})
	}

	function handleCommandResponse(commandId, content, contentPart){
		for(let i in pendingCommandResponses){
			let p = pendingCommandResponses[i];

			if(p.id === commandId){
				console.info('CommandResponseTiming: ', p.timeSent - p.timeScheduled, 'ms until sent | ', new Date().getTime() - p.timeScheduled, 'ms until answered')
				if(typeof p.callback === 'function'){
					p.callback(content);
				}
				delete pendingCommandResponses[i];
			}
		}

		console.warn('game sent a response for an unknown commandId', commandId, content)

		return 'ok'
	}

	function getNextCommandToTransfer(){
		let toSend = commandsToTransferToGame.splice(0, 1)[0];
		if(toSend){
			for(let p of pendingCommandResponses){
				if(p.id === toSend.id){
					p.timeSent = new Date().getTime();
				}
			}
		}
		return toSend;
	}

	function cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}

	return {
		getPlayers: getPlayers,
		updatePlayers: updatePlayers,
		handleCommandResponse: handleCommandResponse,
		getNextCommandToTransfer: getNextCommandToTransfer
	}
})()


module.exports = c2;