const express = require('express')
const app = express()
const PORT = 3366

const expressWs = require('express-ws')(app)

app.listen(PORT, () => {
  c2.onAppWebServerListening(PORT)
})


const fsPromises = require('fs/promises')
const path = require('path')
const handlebars = require('express-handlebars')
const morgan = require('morgan')
const serveStatic = require('serve-static')


let args = {}
for(let i=2; i < process.argv.length; i++){
  let arg = process.argv[i]

  if(arg.indexOf('=') < 0){
    continue
  }

  let argSplit = arg.split('=')

  let asInt = parseInt(argSplit[1])
  args[argSplit[0]] = isNaN(asInt) ? argSplit[1] : asInt
}

/* because of a problem with probably express-ws we cannot use the global production mode (because this fucks up chromes security policies somehow) */
let IS_IN_PRODUCTION = false
if(typeof args.loglevel === 'number'){
  IS_IN_PRODUCTION = false
  //process.env.NODE_ENV = 'development';
} else {
  IS_IN_PRODUCTION = true
  //process.env.NODE_ENV = 'production';
}
//app.set('env', process.env.NODE_ENV)

console.log('starting in', IS_IN_PRODUCTION ? 'production' : 'development' /* app.get('env')*/ , 'mode')

/* security */
app.disable('x-powered-by');//dont tell client that i use express
//http://expressjs.com/de/advanced/best-practice-security.html#helmet-verwenden
const helmet = require('helmet');
app.use(helmet());

const ienoopen = require('ienoopen')
app.use(ienoopen())

const nosniff = require('dont-sniff-mimetype')
app.use(nosniff())

const frameguard = require('frameguard')
// Only let me be framed by people of the same origin:
app.use(frameguard({ action: 'sameorigin' }))


const cors = require('cors')
app.use(
  cors({
    origin: '*',//must be * because we use localhost
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
)


app.use((req, res, next)=>{
  res.setHeader('Content-Security-Policy',
    `default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://cdn.iconmonstr.com/;
    font-src 'self' https://cdn.iconmonstr.com/;
    connect-src 'self';
    img-src 'self' data: https://avatars.cloudflare.steamstatic.com/ https://cdn.cloudflare.steamstatic.com/;
    sandbox allow-forms allow-scripts allow-same-origin allow-popups;
    object-src 'none';
    frame-src 'self';
    frame-ancestors 'self';`.replaceAll('\n', ''))
  next()
})


// Register '.handlebars' extension with Handlebars
app.engine('handlebars', handlebars({defaultLayout: 'default', helpers: require('./handlebar_helpers.js')}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

app.use(morgan(':remote-addr :method :url :status', {
  skip: function(req, res){
    if(req.originalUrl.startsWith('/static/')){// hide http request to static assets because the are just spamming!
      return true
    } else if (req.originalUrl.startsWith('/game-api')){// hide http requests from game, they are logged elsewhere
      return true
    }
  }
}))

app.get('*', (req, res, next)=>{
  res.locals.title = `Carsa's Companion`
  res.locals.baseurl = `${req.protocol}://${req.hostname}:${PORT}/`
  next()
})

// 403 check if is allowed to access
app.get('*', (req, res, next)=>{
  if(c2.isAccessAllowedForIp(req.ip)){
    next()
  } else {
    let err = new Error('Forbidden: The games owner has not allowed external access.');
    err.status = 403;
    handleError(err, req, res, true)
  }
})

app.use('/static', serveStatic(path.join(__dirname, 'public_static'), {
  maxAge: '6h'
}))

app.get('/manual', (req, res, next)=>{

  res.removeHeader('Content-Security-Policy')

  fsPromises.readFile(path.join(__dirname, 'manual.html'), {encoding: 'utf8'}).then((html)=>{

    res.locals.title = `Carsa's Companion - Manual`

    res.type('html')
    res.send(html.replace('<!-- META_PLACEHOLDER -->', `
    <meta property="og:title" content="${res.locals.title}">
    <meta property="og:site_name" content="${res.locals.title}">
    <meta property="og:url" content="${res.locals.baseurl}">
    <meta property="og:description" content="Companion webapp for Carsa's Commands, an addon for Stormworks.">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${res.locals.baseurl}static/images/c2_banner.jpg">
    <meta property="theme-color" content="#07c5cb">
    `))
  }).catch(err => {
    handleError(err, req, res)
  })
})

app.get('/favicon.ico', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public_static/favicon/favicon.ico'))
})

let C2 = require('./c2/c2.js')

try {
  c2 = new C2( typeof args.loglevel === 'number' ? args.loglevel : (IS_IN_PRODUCTION ? 2 : 3) /* production default loglevel "warn", dev default loglevel "info" */, app)
} catch (err) {
  console.error('Error when initializing C2', err)
}

app.get('/', (req, res, next)=>{
  res.render('index');
})


// catch 404 and forward to error handler
app.use(function(req, res) {
  let err = new Error(`Not Found: "${req.path}"`)
  res.locals.message = 'Not found'
  err.status = 404
  handleError(err, req, res, true)
})

// finally threat it as an error
app.use(function(err, req, res, next) {
  handleError(err, req, res)
});

function handleError(err, req, res, doNotLog){
  // set locals, only providing error in development
  if(!IS_IN_PRODUCTION){
    res.locals.message = err.message
    res.locals.error = err
  }

  let status = err.status || 500

  res.locals.title = 'Error: ' + status

  if(doNotLog !== true){
    console.error('C2WebServer/app.js [Error]', err)
  }

  // render the error page
  res.status(status)
  res.render('error')
}
