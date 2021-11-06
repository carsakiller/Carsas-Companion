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
				template: `<div class="gameserver_management">
					<module-enableable :name="'gameserver'">
						<division class="controls" :name="'Control GameServer'" :always-extended="true">
							<gameserver-control/>
						</division>

						<division :name="'Console Output'" :start-extended="true">
							<gameserver-status/>
						</division>
					</module-enableable>
				</div>`
			})

			this.c2.registerComponent('gameserver-control', {
				computed: {
					isGameServerRunning (){
						return this.$store.getters['gameserver-state']
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
						this.sendServerMessageAndWaitForSync('gameserver-start')
					},
					stopServer (){
						this.sendServerMessageAndWaitForSync('gameserver-stop')
					}
				},
				mixins: [componentMixin_serverMessage]
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
