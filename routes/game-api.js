var express = require('express');
var router = express.Router();


let ongoingMessageTransfers = {};

router.get('/', (req, res) => {
	let data = req.query.data;
	let parsed
	try {
		parsed = JSON.parse(data);
	} catch (ex){
		console.log('user json bad format', ex)
		return res.json({
			result: false
		});
	}


	if(!ongoingMessageTransfers[parsed.messageId]){
		ongoingMessageTransfers[parsed.messageId] = [];
	}
	
	ongoingMessageTransfers[parsed.messageId].push(parsed.content);

	let contentPart = parsed.contentPart;

	if(contentPart === 0){//the signal, that this is the last part (yes we count upside down mate!)
		let content = ongoingMessageTransfers[parsed.messageId].join('');
	
		let type = parsed.type;

		switch(type){
			case 'live-update': {
				console.log(parsed.timeRunning, ' (', Math.floor(new Date().getTime()/1000) ,') - ', content)
				c2.updatePlayers(parsed.content.players)

				answer('ok')
			}; break;

			case 'basic-update': {
				console.log(parsed.timeRunning, ' (', Math.floor(new Date().getTime()/1000) ,') - ', content.length, 'chars' /*, content*/)

				answer('ok')
			}; break;

			case 'command-response': {
				console.log(parsed.timeRunning, ' (', Math.floor(new Date().getTime()/1000) ,') - ', content)
				
				let result = c2.handleCommandResponse(parsed.commandId, content)
				if(result === undefined){
					console.warn('you probably forgot to return "ok" or similar inside c2.handleCommandResponse()!')
				}
				answer(result)
			}; break;

			default: {
				console.log('unsupported game-api type', type)
				answer('unsupported game-api type ' + type)
			}
		}

		function answer(result){

			let nextCommand = c2.getNextCommandToTransfer()

			let resp = {
		    	result: result
		    }

		    if(nextCommand){
		    	resp.command = nextCommand.command;
		    	resp.commandId = nextCommand.id;
		    	resp.commandContent = nextCommand.content;
		    }

		    res.json(resp);
		}
	}
})

module.exports = router;