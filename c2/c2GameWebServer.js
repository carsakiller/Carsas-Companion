const express = require('express')
const app = express()
const PORT = 3000

app.listen(PORT, () => {
  console.log(`C2GameService listening at http://localhost:${PORT}`)
})

const morgan = require('morgan')

app.use(morgan('dev'))

app.finishSetup = ()=>{

  app.use(function(req, res, next) {
    res.status(404);
    res.send('Error: Not Found');
  });

  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    console.error('C2GameService', err)

    // render the error page
    res.status(err.status || 500);
    res.send('Error: ' + err.message)
  });
}

module.exports = app