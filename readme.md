**A detailed manual (for users and coders) can be found in [manual.html](https://htmlpreview.github.io/?https://github.com/carsakiller/Carsas-Companion/blob/master/manual.html) or at [http://localhost:3366/manual](http://localhost:3366/manual) when the program is running**


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
* command line tool 2 : `nodemon` or for debugging `nodemon -- loglevel=3` (3 = info, 4 = log, 5= debug)


### Upgrading the version
Just edit the file `public_static/version.txt`

### Upgrading vue.js library
Visit https://unpkg.com/browse/vue@3.2.29/dist/ and select the most recent version. Download the vue.global.js (for testing) or vue.global.prod.js (for production). Replace `/public_static/scripts/lib/vue.js` with whatever you downloaded.

Procedure is similar for vuex (https://unpkg.com/browse/vuex@4.0.2/dist/).

## Updating manual
Simply edit manual.html directly.
If you make any changes to the styling (inside compass/sass/manual.scss) you must recompile the stylesheets, take the output from public_static/stylesheets/manual.css and replace the &lt;style&gt; tag inside the manual.html file.

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
