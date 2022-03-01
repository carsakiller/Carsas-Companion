"use strict";

$(window).on('load', ()=>{

	// init custom elements

	$('c2-page').each((i, el)=>{

		const PAGE_ICONS = {
	    	home: 'home',
	    	players: 'users',
	    	vehicles: 'car',
	    	roles: 'crown',
	    	rules: 'task-o',
	    	preferences: 'control-panel',
	    	'gamesettings': 'wrench',
	    	logs: 'note-o',
	    	settings: 'gear',
	    	map: 'map-o',
	    	'gameserver': 'server',
	    	'tests': 'flask'
	    }

	    let inner = $(el).text()

		$(el).addClass('im im-' + PAGE_ICONS[inner] )
		$(el).html('')
		$(el).append(
			$('<span>').text( inner.charAt(0).toUpperCase() + inner.substring(1) + ' Page' )
		)
	})


	// create anchors and navigation sidebar
	$('.division').each((i, divisionEl)=>{
		if($(divisionEl).find('h2').length === 0){
			return
		}

		let title = $(divisionEl).find('h2').text()

		let id = titleToId(title)

		$(divisionEl).find('h2').attr('id', id).attr('prefix', `${i+1}.`)

		$('.sidebar .inner').append(
			$(`<a href="#${id}">${title}</a>`).attr('prefix', `${i+1}.`)
		)

		$(divisionEl).find('h3').each((ii, h3El)=>{
			let title2 = $(h3El).text()
			let id2 = titleToId(title2)

			$(h3El).attr('id', id2).attr('prefix', `${i+1}.${ii+1}.`)

			$('.sidebar .inner').append(
				$(`<a depth="1" href="#${id2}">${title2}</a>`).attr('prefix', `${i+1}.${ii+1}.`)
			)

			if($(h3El).next().hasClass('subdivision')){
				$(h3El).next().find('h4').each((iii, h4El)=>{
					let title3 = $(h4El).text()
					let id3 = titleToId(title3)

					$(h4El).attr('id', id3).attr('prefix', `${i+1}.${ii+1}.${iii+1}.`)

					$('.sidebar .inner').append(
						$(`<a depth="2" href="#${id3}">${title3}</a>`).attr('prefix', `${i+1}.${ii+1}.${iii+1}.`)
					)
				})
			}
		})
	})

	function titleToId(title){
		return title.toLowerCase().replaceAll(' ', '-')
	}

	// check for #anchor param and try to focus it
	let hashPos = document.location.href.lastIndexOf('#')
	if(hashPos >= 0){
		let anchor = document.location.href.substring(hashPos + 1)
		$(`.sidebar a[href="${anchor}"]`).click()
	}
})