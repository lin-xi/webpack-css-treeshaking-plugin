'use strict';

var loaderUtils = require('loader-utils');
var fs = require('fs');
var SimpleCompiler = require('./compiler');

var NS = fs.realpathSync(__dirname);

function filterModules(module) {
  return module.loaders && module.loaders.reduce(function (r, l) {
    return r || l.loader.includes('/css-loader/');
  }, false);
}

module.exports = function (source, map) {
  var _this = this;

  // Once all modules are loaded, store CSS modules on the compilation
  this._compilation.plugin('seal', function () {
    _this._compilation[NS] = _this._compilation.modules.filter(filterModules).map(function (module) {
      return {
        index: module.index,
        _source: module._source,
        context: module.context
      };
    });
  });

  var extractPlugin = Object.keys(this).filter(function (key) {
    return key.includes('extract-text-webpack-plugin');
  })[0];

  var query = loaderUtils.parseQuery(this.query);

  if (this._compiler[NS] > 0 || !this[extractPlugin](null, query) || !this._compilation[NS]) {
    this.callback(null, source, map);
  } else {
    // When extract-text-webpack-plugin triggers module rebuild, use the loaded modules to extract exports
    if (Array.isArray(this._compilation[NS])) {
      this._compilation[NS] = new SimpleCompiler(this._compilation[NS]);
    }

    var resultSource = '// removed by dead-css-loader extracting loader';

    var callback = this.async();

    this._compilation[NS].compile(this.request).then(function (exports) {
      if (!exports.default) {
        callback(new Error('Not a css module'));
      }

      _this[extractPlugin](exports, query);

      resultSource = Object.keys(exports).reduce(function (result, key) {
        switch (key) {
          case 'default':
            return result + '\nexport default ' + JSON.stringify(exports.default) + ';';
          case '$css':
            return result;
          default:
            return result + '\nexport const ' + key + ' = ' + JSON.stringify(exports[key]) + ';';
        }
      }, resultSource);

      if (resultSource) {
        callback(null, resultSource);
      } else {
        callback();
      }
    }).catch(function (err) {
      return callback(err);
    });
  }
};