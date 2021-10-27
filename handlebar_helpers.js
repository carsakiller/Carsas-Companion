module.exports = {
  'vue-js': function(options){// a helper to prevent vue.js markup to be evaluated by handlebars
    return options.fn();
  }
}