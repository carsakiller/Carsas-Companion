C2.registerPage('Tests', 'flask', 'tests-management')

C2.registerVueComponent('todo', {
	computed: {
		status (){
			return this.$store.state.status
		}
	},
	template: `<div style="display: inline-block; padding: 0.5em 1em; background: red; color: white; font-weight: bold;">
		<span>TODO: </span><slot/>
	</div>`
})

C2.registerVueComponent('tests-management', {
	template: `<div class="tests_management">
		<todo>Implement</todo>
	</div>`
})