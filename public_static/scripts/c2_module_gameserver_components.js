c2.register.register('Page', {
	name: 'GameServer Management',
	icon: 'server',
	componentName: 'gameserver-management'
})

c2.register.register('VueComponent', {
	name: 'gameserver-management',
	options: {
		data: function (){
			return {
				isGameServerRunningFake: false
			}
		},
		computed: {
			isGameServerRunning (){
				return this.isGameServerRunningFake
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
					<button @click="isGameServerRunningFake = !isGameServerRunningFake">Toggle running</button>
					<spacer-horizontal/>
					<gameserver-status/>
				</division>
			</module-enableable>
		</div>`,
		methods: {
			startServer (){
				alert('not implement')
			},
			restartServer (){
				alert('not implement')
			},
			stopServer (){
				alert('not implement')
			}
		},
		mixins: []
	}
})

c2.register.register('VueComponent', {
	name: 'gameserver-status',
	options: {
		computed: {
			gameserverStdout (){
				return this.$store.getters['gameserver-stdout']
			}
		},
		template: `<div class="gameserver_status">
			<textarea v-model="gameserverStdout"/>
		</div>`
	}
})

c2.register.register('MessageHandler', {
	messageType: 'gameserver-stdout',
	callback: (data)=>{
		c2.store.dispatch('set_gameserver-stdout', data)
	}
})

c2.register.register('Storable', 'gameserver-stdout')
