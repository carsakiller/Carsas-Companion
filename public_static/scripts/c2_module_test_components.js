C2.registerVueComponent('todo', {
	computed: {
		status (){
			return this.$store.state.status
		}
	},
	template: `<div style="background: red; color: white; font-weight: bold;">
		<slot/>
	</div>`
})

C2.registerVueComponent('test-management', {
	template: `<div class="test_management">
		<todo/>
	</div>`
})