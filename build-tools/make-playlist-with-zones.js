/*

- reads %AppData%Roaming/Stormworks/data/missions/Carsa's Commands/playlist.xml
- replaces all locations with locations that each contain only a zone (at a predefined position)
- saves new xml to playlist_with_zones.xml (in the same folder)



*/


const fs = require('fs')
const path = require('path')
const os = require("os");

const {XMLParser, XMLBuilder} = require('fast-xml-parser')
const he = require('he')

let filePath = path.normalize(path.join(os.homedir(), '/AppData/Roaming/Stormworks/data/missions/Carsa\'s Commands/playlist.xml'))
let newFilePath = path.normalize(path.join(os.homedir(), '/AppData/Roaming/Stormworks/data/missions/Carsa\'s Commands/playlist_with_zones.xml'))

try {
	fs.accessSync(filePath, fs.constants.W_OK)
} catch (err){
	return console.error('Unable to convert', filePath, err)
}


/* tiles */
let tileDirPath = 'C:/Program Files (x86)/Steam/steamapps/common/Stormworks/rom/data/tiles'

let tileList = []

try {
	let files = fs.readdirSync(path.normalize(tileDirPath))

	for(let file of files){
		if(file.endsWith('.xml') && file.indexOf('instances') < 0){
			tileList.push(file.substring(0, file.length - '.xml'.length))
		}
	}
} catch (err){
	return console.error('unable to read tiles', err)
}

console.log('found', tileList.length, 'tiles')

let xmlString = fs.readFileSync(filePath, {encoding: 'utf-8'})

let parsedPlaylist = parsePlayList(xmlString)

function parsePlayList(xmlString){
	const options = {
        attributeNamePrefix : "@_",
        ignoreAttributes : false,
        ignoreNameSpace : false,
        allowBooleanAttributes : true,
        parseNodeValue : true,
        parseAttributeValue : false,
        trimValues: true,
        parseTrueNumberOnly: false,
        attrProcessor: (tag, value) => {return tag},
        tagValueProcessor : (tag, value) => {return value}
    }

	const parser = new XMLParser(options);

	return parser.parse(xmlString)
}

for(let tile of tileList){
	let myId = ++ parsedPlaylist.playlist.locations['@_location_id_counter']
	let myComponentId = ++ parsedPlaylist.playlist.locations['@_component_id_counter']
	parsedPlaylist.playlist.locations.locations.l.push({
		'@_id': '' + myId,
		'@_tile': 'data/tiles/' + tile + '.xml',
		'@_name': tile,
		'@_is_env_mod': 'true',
		'@_env_mod_spawn_num': '0',
		components: {
			c: {
				'@_component_type': '10',
				'@_id': '' + myComponentId,
				'@_vehicle_parent_id': '0',
				'@_cargo_zone_import_cargo_type': 'CARSAS_COMMANDS_COMPANION_TILE_POSITIONING_ZONE',
				'@_display_name': tile,
				'@_is_sea_floor_object': 'false',
				'@_show_zone_on_map': 'false',
				'@_zone_type': '0',
				'@_zone_radius': '1',
				'@_dynamic_object_type': '2',
				'@_loot_type': '0',
				'@_character_outfit_category': '11',
				'@_character_type': '1',
				'@_character_special_outfit': '0',
				'@_vehicle_file_name': '',
				'@_vehicle_file_store': '1',
				'@_vehicle_is_static': 'false',
				'@_vehicle_is_no_sleep': 'false',
				'@_vehicle_is_editable': 'false',
				'@_vehicle_is_invulnerable': 'false',
				'@_vehicle_is_show_on_map': 'false',
				'@_vehicle_is_transponder_active': 'false',
				'@_is_fire_lit': 'true',
				'@_is_explosion': 'false',
				'@_explosion_magnitude': '1',
				'@_flare_hue': '0',
				'@_is_flare_lit': 'true',
				'@_vehicle_button_name': '',
				'@_ice_type': '0',
				'@_ice_scale': '1',
				'@_animal_type': '0',

				spawn_transform: {
					'@_00': '1',
					'@_01': '0',
					'@_02': '0',
					'@_03': '0',
					'@_10': '0',
					'@_11': '1',
					'@_12': '0',
					'@_13': '0',
					'@_20': '0',
					'@_21': '0',
					'@_22': '1',
					'@_23': '0',
					'@_30': '0',
					'@_31': '0',
					'@_32': '0',
					'@_33': '1'
				},
				spawn_bounds: {
					min: {
						'@_x': '-1',
						'@_y': '-1',
						'@_z': '-1'
					},
					max: {
						'@_x': '1',
						'@_y': '1',
						'@_z': '1'
					}
				},
				vehicle_parent_transform: {
					'@_00': '1',
					'@_01': '0',
					'@_02': '0',
					'@_03': '0',
					'@_10': '0',
					'@_11': '1',
					'@_12': '0',
					'@_13': '0',
					'@_20': '0',
					'@_21': '0',
					'@_22': '1',
					'@_23': '0',
					'@_30': '0',
					'@_31': '0',
					'@_32': '0',
					'@_33': '1'
				},
				spawn_local_offset: {
					'@_x': '-0',
					'@_y': '-0',
					'@_z': '-0'
				},
				graph_links: ''
			}
		}
	})
}

let newXMLString = xmlify(parsedPlaylist)

function xmlify(obj){
	let options = {
		format: true,
    	ignoreAttributes : false,
        attributeNamePrefix : '@_',
        processEntities: false,
        suppressBooleanAttributes: false
	}

	const builder = new XMLBuilder(options)

	return builder.build(obj)
}

try {
	fs.writeFileSync(newFilePath, newXMLString)
} catch (err){
	return console.error('Error when writing to file', err)
}

