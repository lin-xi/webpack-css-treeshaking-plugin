'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var postcss = require('postcss');
var cssshaking = require('postcss-tree-shaking');
var fs = require('fs');
var loaderUtils = require('loader-utils');

var NS = fs.realpathSync(__dirname);

function cleanMap(map) {
  if (map.sources) {
    map.sources = map.sources.map(function (url) {
      return url.split('://').pop();
    });
  }
  return map;
}

function filterModules(module) {
  return module.loaders && module.loaders.reduce(function (r, l) {
    return r || l.loader.includes('/css-treeshaking-loader/');
  }, false);
}

var CSSTreeshakingLoader = function () {
  function CSSTreeshakingLoader(compilation, query) {
    var _this = this;

    _classCallCheck(this, CSSTreeshakingLoader);

    this.options = {
      plugins: false,
      spinalCase: false,
      ignore: [],
      allowIds: false,
      allowNonClassSelectors: false,
      allowNonClassCombinators: false
    };
    if (query) {
      Object.assign(this.options, query);
    }
    this.modules = [];

    var options = Object.assign({}, compilation.compiler.options);
    options.output = Object.assign({}, options.output);
    if (!this.options.plugin) {
      options.plugins = [];
    }
    delete options.devtool;

    var childCompiler = require('webpack/lib/webpack')(options);
    // Increment recursion counter
    childCompiler[NS] = compilation.compiler[NS] + 1;

    // Save our modules
    childCompiler.plugin('compilation', function (comp) {
      comp.plugin('after-optimize-modules', function (modules) {
        _this.modules = modules.filter(filterModules);
        console.log('👠👠👠👠👠👠', _this.modules);
      });
    });
    childCompiler.plugin('after-compile', function (comp, callback) {
      // Remove all chunk assets
      comp.chunks.forEach(function (chunk) {
        chunk.files.forEach(function (file) {
          delete comp.assets[file];
        });
      });
      callback();
    });
    this.childCompiler = childCompiler;
  }

  _createClass(CSSTreeshakingLoader, [{
    key: 'doChildCompilation',
    value: function doChildCompilation() {
      var _this2 = this;

      if (!this.compilePromise) {
        this.compilePromise = new Promise(function (resolve, reject) {
          _this2.childCompiler.run(function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      return this.compilePromise;
    }
  }, {
    key: 'filterCSS',
    value: function filterCSS(loaderContext, source, sourceMap) {
      var _this3 = this;

      console.log('👠👠👠👠👠👠', sourceMap);
      return new Promise(function (resolve, reject) {
        _this3.doChildCompilation().then(function () {
          var module = _this3.getModule(loaderContext.request);

          if (module.error) {
            return reject(module.error);
          }

          if (module.usedExports === true || module.usedExports === false || module.usedExports.indexOf('default') !== -1) {
            return resolve({ source: source, map: sourceMap });
          }
          console.log(module.usedExports);
          var usedSelectors = module.usedExports.filter(function (selector) {
            return selector !== '$css';
          });

          if (_this3.options.spinalCase) {
            usedSelectors = usedSelectors.concat(usedSelectors.map(function (selector) {
              return selector.replace(/([a-z0-9])([A-Z])/g, function (match, p1, p2) {
                return p1 + '-' + p2.toLowerCase();
              });
            }));
          }

          postcss([cssshaking({
            used: usedSelectors,
            ignore: _this3.options.ignore,
            allowIds: _this3.options.allowIds,
            allowNonClassSelectors: _this3.options.allowNonClassSelectors,
            allowNonClassCombinators: _this3.options.allowNonClassCombinators
          })]).process(source, {
            from: loaderUtils.getRemainingRequest(loaderContext),
            to: loaderUtils.getCurrentRequest(loaderContext),
            map: {
              prev: sourceMap,
              sourcesContent: true,
              inline: false,
              annotation: false
            }
          }).then(function (result) {
            resolve({ source: result.css, map: cleanMap(result.map.toJSON()) });
          }).catch(function (error) {
            reject(error);
          });
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'getModule',
    value: function getModule(request) {
      return this.modules.filter(function (module) {
        return module.request.includes(request);
      })[0];
    }
  }]);

  return CSSTreeshakingLoader;
}();

function loader(source, map) {
  console.log('👠👠👠👠👠👠', 'css-treeshaking-loader');
  if (this.cacheable) this.cacheable();

  var query = loaderUtils.parseQuery(this.query);

  if (typeof query.recursion === 'undefined') {
    query.recursion = 1;
  }

  if (typeof this._compiler[NS] === 'undefined') {
    this._compiler[NS] = 0;
  }
  // Don't apply transform to final recursion
  if (this._compiler[NS] === query.recursion) {
    this.callback(null, source, map);
  } else {
    var callback = this.async();

    // Save loader instance on the compilation
    var loaderId = 'CSSTreeShakingLoader' + (typeof this.query === 'string' ? this.query : '?' + JSON.stringify(this.query));
    this._compilation[loaderId] = this._compilation[loaderId] || new CSSTreeshakingLoader(this._compilation, query);

    this._compilation[loaderId].filterCSS(this, source, map).then(function (result) {
      callback(null, result.source, result.map);
    }).catch(function (err) {
      return callback(err);
    });
  }
}

loader.extract = function (options) {
  return { loader: require.resolve('./extract'), query: options };
};