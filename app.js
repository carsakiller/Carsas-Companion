const express = require('express')
const app = express()
const PORT = 3000

var expressWs = require('express-ws')(app)

app.listen(PORT, () => {
  console.log(`C2WebService listening at http://localhost:${PORT}`)
})

const path = require('path')
const handlebars = require('express-handlebars')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const express_json = require('express-json')
const serveStatic = require('serve-static')


/* security */
app.disable('x-powered-by');//dont tell client that i use express
//http://expressjs.com/de/advanced/best-practice-security.html#helmet-verwenden
const helmet = require('helmet');
app.use(helmet());

const hsts = require('hsts')
app.use(hsts({
  maxAge: 15552000  // 180 days in seconds
}))

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

const csp = require('helmet-csp')

// set production only settings
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy (if we have a nginx between)
  //sessionOptions.secure = true // serve secure cookies (only works with https, else cookies wont work!)
  //sessionOptions.proxy = true // serve secure cookies (only works with https, else cookies wont work!)

  app.use(csp({
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],//unsafe-eval required for vue.js only
      'style-src': ["'self'", "'unsafe-inline'"],//unsafe-inline required only for anticlickjack right now
      'font-src': ["'self'"],
      'img-src': ["'self'", 'data:'],
      'sandbox': ['allow-forms', 'allow-scripts'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
      upgradeInsecureRequests: []
    },

    // Set to true if you only want browsers to rePORT errors, not block them.
    // You may also set this to a function(req, res) in order to decide dynamically
    // whether to use rePORTOnly mode, e.g., to allow for a dynamic kill switch.
    rePORTOnly: false
  }))
} else {//we need to completely disable csp in order for the vue.js devtools to work
  app.use((req, res, next)=>{
    res.removeHeader('Content-Security-Policy')
    next()
  })
}



//app.use(session(sessionOptions))

// Register '.handlebars' extension with Handlebars
app.engine('handlebars', handlebars({defaultLayout: 'default', helpers: require('./handlebar_helpers.js')}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express_json())

app.use('/static', serveStatic(path.join(__dirname, 'public_static'), {
  maxAge: '6h'
}))

/* load routes */
function dontCacheThisRoute(req, res, next){
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', 0)
  next()
}


app.get('/', (req, res, next)=>{
  res.render('index', {
    players: c2.getPlayers()
  });
});

app.get('/c2', (req, res, next)=>{
  res.render('c2');
});


const webSocks = require('./websocks.js')
const c2companion = require('./c2companion.js')
c2companion.setWebSocks(webSocks)

app.ws('/ws', (ws, req) => {
  webSocks.addClient(ws, req)
});
app.use('/game-api', require('./routes/game-api.js'));

/*
app.use('/', index);
app.use('/login', dontCacheThisRoute);
app.use('/register', dontCacheThisRoute);
app.use('/login', login);
app.use('/logout', logout);
app.use('/register', register);
app.use('/imprint', imprint);
app.use('/about', about);
app.use('/user', user);
app.use('/drinks', drinks);
*/

c2 = require('./c2.js');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(404);
  res.render('error');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error(err)

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
