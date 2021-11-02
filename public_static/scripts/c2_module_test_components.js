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
	data: function (){
		return {
			toggleState: false,
			isConfirmed: false
		}
	},
	template: `<div class="tests_management">
		<tabs>
			<tab :title="'Components'">
				<test-component :title="'toggleable-element'" :description="'TODO'">
					<toggleable-element :initial-value="false" :on-value-change="toggleStateChange">{{toggleState}}</toggleable-element>
				</test-component>

				<test-component :title="'confirm-button'" :description="'Button which requires to hover over it for a certain time'">
					<confirm-button @click="isConfirmed = !isConfirmed">
						<span v-if="isConfirmed">Unconfirm</span>
						<span v-else>Confirm</span>
					</confirm-button>
					<br>
					<span v-if="isConfirmed">Confirmed</span>
					<span v-else>Not confirmed</span>
				</test-component>

				<test-component :title="'confirm-button'" :description="'Serious version'">
					<confirm-button class="serious" @click="isConfirmed = !isConfirmed">
						<span v-if="isConfirmed">Unconfirm</span>
						<span v-else>Confirm</span>
					</confirm-button>
					<br>
					<span v-if="isConfirmed">Confirmed</span>
					<span v-else>Not confirmed</span>
				</test-component>

				<test-component :title="'confirm-button'" :description="'Small version of confirm-button'">
					<confirm-button class="small_button"><span class="im im-plus"/></confirm-button>
				</test-component>

				<test-component :title="'lockable'" :description="'TODO'">
					<todo/>
				</test-component>

				<test-component :title="'lockable-by-childs'" :description="'TODO'">
					<todo/>
				</test-component>

				<test-component :title="'lockable-by-parent'" :description="'TODO'">
					<todo/>
				</test-component>

				<test-component :title="'disabled-when-any-parent-locked'" :description="'TODO'">
					<todo/>
				</test-component>

				<test-component :title="'loading-spinner'">
					<loading-spinner/>
				</test-component>

				<test-component :title="'spacer-horizontal'" :description="'A simple horizontal block with a margin.'">
					<div style="display: flex; flex-direction: column;">
						<div style="background: grey">Before</div>
						<spacer-horizontal/>
						<div style="background: grey">After</div>
					</div>
				</test-component>

				<test-component :title="'spacer-vertical'" :description="'A simple vertical block with a margin.'">
					<div style="display: flex; flex-direction: row;">
						<div style="background: grey">Before</div>
						<spacer-vertical/>
						<div style="background: grey">After</div>
					</div>
				</test-component>

				<test-component :title="'steamid'">
					<steamid :steamid="'x42'"/>
				</test-component>

				<test-component :title="'tabs'">
					<tabs>
						<tab :title="'Tab A'">Content of A</tab>
						<tab :title="'Tab B'">Content of B</tab>
						<tab :title="'Tab C'">Content of C</tab>
					</tabs>
				</test-component>

				<test-component :title="'extendable'">
					<extendable>
						<extendable-trigger>
							<span>Click me to extend</span>
						</extendable-trigger>

						<extendable-body>
							This shows when extended.
						</extendable-body>

					</extendable>
				</test-component>

				<test-component :title="'division'">
					<division :name="'Name'" :startExtended="true">
						Some content.
					</division>
				</test-component>
			</tab>
		</tabs>
	</div>`,
	methods: {
		toggleStateChange (name, val){
			this.toggleState = val
		}
	}
})

C2.registerVueComponent('test-component', {
	props: {
		title: {
			type: String
		},
		description: {
			type: String
		}
	},
	template: `<div class="test_component">
		<h3 class="title" v-if="title">&lt;{{title}}&gt;</h3>
		<p class="description" v-if="description">{{description}}</p>
		<div class="the_component">
			<slot/>
		</div>
	</div>`
})