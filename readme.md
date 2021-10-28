# Setup build system
- install node (e.g. v12)
- install compass `$ gem install compass`



# TODO
* check what the char limit for responses for server.httpGet() requests is!
* version check with the script running in the game
* detect game restart / script reload

# Before going into production:
* check app.js for necessary adjustments

# Building a standalone .exe
## install pkg
`npm i pkg -g`
## configure your package.json
```
    "bin": "index.js",
    "main": "index.js",
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