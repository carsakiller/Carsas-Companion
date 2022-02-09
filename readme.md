# How to code

## Setup build tools
* if you are on windows you will need a command line tool, i suggest the official one from git: https://gitforwindows.org/
* install node (e.g. v12)
* install compass (stylesheet parsing): `$ gem install compass`
* install nodemon (restart node server on code changes): `npm install -g nodemon`

### git hooks for versioning
After you cloned this repository, run
`sh setup_git_hooks.sh`
This will enable the git hooks, so it triggers the update of version.js to be set to the current commit hash.
You can also trigger it manually by doing a checkout on the current select branch (e.g. `git checkout master`)

## Coding
* command line tool 1 : `cd compass & compass watch`
* command line tool 2 : `nodemon` or `nodemon --trace-warnings`

### Upgrading the version
Just edit the file `public_static/version.txt`

### Upgrading vue.js library
Visit https://unpkg.com/browse/vue@3.2.29/dist/ and select the most recent version. Download the vue.global.js (for testing) or vue.global.prod.js (for production). Replace `/public_static/scripts/lib/vue.js` with whatever you downloaded.

Procedure is similar for vuex (https://unpkg.com/browse/vuex@4.0.2/dist/).

## Creating executables
### install pkg
`npm i pkg -g`
### configure your package.json
```
    "bin": "app.js",
    "main": "app.js",
    "pkg": {
        "assets": [
            "views/**/*",
            "public_static/**/*"
        ],
        "outputPath": "dist"
    },
```
## run
`pkg .`

# Update playlist.xml (locations)

For every tile, we define a zone, which is required to show the tiles in the webclient live map at the right position. The ingame script finds all those zones and their positions. In case new tiles are added (game update), you need to update the playlist.xml (automated with a script of course).

After you did build the playlist.xml (see Readme of Carsas-CommandsV2) then you can run
`node build-tools/make-playlist-with-zones.js`
The above command will read `%appdata%/Roaming/Stormworks/data/missions/Carsa's Commands/playlist.xml` inject the env_mods/locations and write the ouput to `%appdata%/Roaming/Stormworks/data/missions/Carsa's Commands/playlist_with_zones.xml`
Now you have to replace the original `playlist.xml` with the `playlist_with_zones.xml`.

# Documentation (haha)

## Workflow for data sync from browser to game:
Component defines methods (e.g. a button that triggers revoking a rule from a player) which will be called on button press.
The method then sends that command to the game, if game responds with success, wait until game syncs new player data (game triggers that by itself ^^ or do we do that from the website?)), if fails, do nothing and show error message.
