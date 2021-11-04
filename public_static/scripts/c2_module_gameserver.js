class C2Module_Gameserver extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('gameserver-stdout')

			this.c2.registerStorable('gameserver-state')
		})

		this.c2.on('can-register-component', ()=>{
			this.c2.registerComponent('gameserver-management', {
				computed: {
					isGameServerRunning (){
						return this.$store.getters['gameserver-state']
					}
				},
				template: `<div class="gameserver_management">
					<module-enableable :name="'gameserver'">
						<division class="controls" :name="'Control GameServer'" :always-extended="true">
							<confirm-button v-if="!isGameServerRunning" @click="startServer">Start</confirm-button>
							<confirm-button v-if="isGameServerRunning" @click="restartServer">Restart</confirm-button>
							<confirm-button v-if="isGameServerRunning" @click="stopServer">Stop</confirm-button>
						</division>

						<division>
							<gameserver-status/>
						</division>
					</module-enableable>
				</div>`,
				methods: {
					startServer (){
						alert('not implemented')
					},
					restartServer (){
						alert('not implemented')
					},
					stopServer (){
						alert('not implemented')
					}
				}
			})

			this.c2.registerComponent('gameserver-status', {
				computed: {
					gameserverStdout (){
						return this.$store.getters['gameserver-stdout']
					}
				},
				template: `<div class="gameserver_status">
					<textarea v-model="gameserverStdout"/>
				</div>`
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('GameServer Management', 'server', 'gameserver-management')
		})

		this.c2.on('can-register-messagehandler', ()=>{
			this.c2.registerMessageHandler('gameserver-stdout', (data)=>{
				this.c2.store.dispatch('set_gameserver-stdout', data)
			})

			this.c2.registerMessageHandler('gameserver-state', (data)=>{
				c2.store.dispatch('set_gameserver-state', data)
			})
		})

		this.c2.on('setup-done', ()=>{

		})
	}
}
