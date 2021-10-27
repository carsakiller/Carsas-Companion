module.exports = (()=>{

	let webSocks

	function setWebSocks(_webSocks){
		webSocks = _webSocks
		webSocks.setMessageCallback(handleClientMessage)
	}

	function handleClientMessage(client, message){
		return new Promise((fulfill, reject)=>{
			console.log('c2 client message (', client.token, ')', message)

			if(message === 'test'){
				fulfill('yes')

				setTimeout(()=>{
					webSocks.send(client, 'test-back').then((res)=>{
						console.log('test-back response success', res)
					}).catch((err)=>{
						console.warn('test-back response unsuccessful', err)
					})
				}, 5000)
			}
		})
	}

	return {
		setWebSocks: setWebSocks
	}
})()