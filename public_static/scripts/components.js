Vue.component('sidebar', {

})

Vue.component('tab', {

})

Vue.component('player-management', {
	props: ['players'],
	template: `<div class="player_management">
		<player-list v-bind:players="players"></player-list>
	</div>`
})

Vue.component('player-list', {
	props: ['players'],
	template: `<div class="player_list">
		<player v-for="player in players" v-bind:player="player"></player>
	</div>`
})

Vue.component('player', {
	data: ()=>{
		return {
			isExtended: false
		}
	},
	props: ['player'],
	template: `<div class="player" key="{{player.id}}">
		<div class="head" v-on:click="isExtended = !isExtended">
			<span class="id">{{player.id}}</span>
			<div class="name_container">
				<span class="name">{{player.name}}</span>
				<span class="steamid">{{player.steamid}}</span>
			</div>
			<div class="extend_arrow">
				<span class="im im-angle-up" v-if="isExtended"></span>
				<span class="im im-angle-down" v-else></span>
			</div>
			<div class="buttons">
				<button class="button" v-on:click="kick">Kick</button>
				<button class="button" v-on:click="ban">Ban</button>
			</div>
		</div>

		<div class="body" v-if="isExtended">
			<player-role v-for="role in player.roles" v-bind:role="role"></player-role>
		</div>
	</div>`,
	methods: {
		kick: ()=>{
			alert('not implemented')
		},
		ban: ()=>{
			alert('not implemented')
		}
	}
})

Vue.component('player-role', {
	data: ()=>{
		return {
			enabledClass: 'enabled',
			disabledClass: 'disabled'
		}
	},
	props: ['role'],
	template: `<div class="player_role" key="{{role.id}}" v-bind:class="role.isEnabled ? enabledClass : disabledClass">
		<span class="name">{{role.name}}</span>

		<button class="small_button" v-if="role.isEnabled" v-on:click.stop="role.isEnabled = false"><span class="im im-minus"></span></button>
		<button class="small_button" v-else v-on:click.stop="role.isEnabled = true"><span class="im im-plus"></span></button>
	</div>`
})

