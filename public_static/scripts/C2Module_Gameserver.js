class C2Module_Gameserver extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('gameserverStdout')
			this.c2.registerStorable('gameserverState')
		})

		this.c2.on('can-register-component', ()=>{
			this.c2.registerComponent('gameserver-management', {
				computed: {
					settingsOkay (){
						return this.$store.state.settings && this.$store.state.settings['gameserver-executable-path'] && this.$store.state.settings['gameserver-executable-path'].value != ''
					}
				},
				template: `<div class="gameserver_management">
					<division v-if="!settingsOkay" :name="'Error'" :always-extended="true">
						<p>Executable path not set (please do this on the settings page).</p>
					</division>

					<division v-if="settingsOkay" class="controls" :name="'Control GameServer'" :always-extended="true">
						<gameserver-control/>
					</division>

					<division v-if="settingsOkay" :name="'Console Output'" :start-extended="true">
						<gameserver-status/>
					</division>
				</div>`
			})

			this.c2.registerComponent('gameserver-control', {
				data (){
					return {
						syncables: []
					}
				},
				computed: {
					isGameServerRunning (){
						return this.$store.state.gameserverState
					}
				},
				template: `<div class="gameserver_control">
					<lockable/>
					<span v-if="isGameServerRunning" class="state running"><icon :icon="'power'"/> Running</span>
					<span v-if="!isGameServerRunning" class="state"><icon :icon="'power'"/> Not Running</span>

					<confirm-button v-if="!isGameServerRunning" @click="startServer" :disabled="isComponentLocked">Start</confirm-button>
					<confirm-button v-if="isGameServerRunning" @click="stopServer" :disabled="isComponentLocked">Stop</confirm-button>
				</div>`,
				methods: {
					startServer (){
						this.sendServerMessage('gameserver-start', undefined, true).then(res => {
							this.showNotificationSuccess('gameserver-start', res)
						}).catch(err => {
							this.showNotificationFailed('gameserver-start', err)
						})
					},
					stopServer (){
						this.sendServerMessage('gameserver-stop').then(res => {
							this.showNotificationSuccess('gameserver-stop', res)
						}).catch(err => {
							this.showNotificationFailed('gameserver-stop', err)
						})
					}
				},
				watch: {
					isGameServerRunning (){
						this.unlockComponent()
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			this.c2.registerComponent('gameserver-status', {
				computed: {
					gameserverStdout (){
						return this.$store.state.gameserverStdout
					}
				},
				template: `<div class="gameserver_status">
					<textarea v-model="gameserverStdout"/>
				</div>`
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('gameserver-management', 'GameServer Management', 'server', 'gameserver-management')
		})

		this.c2.on('can-register-messagehandler', ()=>{
			this.c2.registerMessageHandler('gameserver-stdout', (data)=>{
				this.c2.store.state.gameserverStdout = data
			})

			this.c2.registerMessageHandler('gameserver-state', (data)=>{
				this.c2.store.state.gameserverState = data
			})
		})

		this.c2.on('setup-done', ()=>{

		})
	}
}
