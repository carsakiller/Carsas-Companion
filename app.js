const express = require('express')
const app = express()
const PORT = 3001

var expressWs = require('express-ws')(app)

app.listen(PORT, () => {
  console.log(`  listening at port :${PORT} (C2WebService)`)
  c2.onAppServerListening(PORT)
})

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
  res.setHeader('Content-Security-Policy', `default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval';style-src 'self' 'unsafe-inline';font-src 'self';connect-src 'self' ws://*;img-src 'self' data:;sandbox allow-forms allow-scripts allow-same-origin;object-src 'none';frame-src 'self';frame-ancestors 'self';`)//`default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval';style-src 'self' 'unsafe-inline';font-src 'self';connect-src 'self' ws://*;img-src 'self' data:;sandbox allow-forms allow-scripts allow-same-origin;object-src 'none';frame-ancestors 'self';`
  next()
})


// Register '.handlebars' extension with Handlebars
app.engine('handlebars', handlebars({defaultLayout: 'default', helpers: require('./handlebar_helpers.js')}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

app.use(morgan('dev', {
  skip: function(req, res){
    if(req.originalUrl.startsWith('/static/')){// hide http request to static assets because the are just spamming!
      return true
    } else if (req.originalUrl.startsWith('/game-api')){// hide http requests from game, they are logged elsewhere
      return true
    }
  }
}))

app.use('/static', serveStatic(path.join(__dirname, 'public_static'), {
  maxAge: '6h'
}))

app.get('/', (req, res, next)=>{
  res.render('index', {title: 'Carsa\'s Companion'})
})

app.get('/documentation', (req, res, next)=>{
  res.render('documentation', {title: 'Carsa\'s Companion - Documentation'})
})


let C2 = require('./c2/c2.js')

c2 = new C2( typeof args.loglevel === 'number' ? args.loglevel : (app.get('env') === 'production' ? 2 : 3) /* production default loglevel "warn", dev default loglevel "info" */, app)

app.get('/c2', (req, res, next)=>{

  if(c2.isAccessAllowedForIp(req.ip)){
    res.render('c2', {title: 'Carsa\'s Companion'});
  } else {
    let err = new Error('Forbidden: The games owner has not allowed external access.');
    err.status = 403;

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(403)
    res.render('error')
  }
});

app.get('/ws', (req, res, next)=>{
  if(c2.isAccessAllowedForIp(req.ip)){
    next()
  } else {
    let err = new Error('Forbidden: The games owner has not allowed external access.');
    err.status = 403;

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.locals.title = 'Error'

    res.status(403)
    res.render('error')
  }
})


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.locals.title = 'Error'

  res.status(404);
  res.render('error');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error('C2WebService', err)

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
