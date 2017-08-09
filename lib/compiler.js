'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var babel = require('babel-core');
var vm = require('vm');

var SimpleCompiler = function () {
  function SimpleCompiler(modules) {
    _classCallCheck(this, SimpleCompiler);

    this.modules = modules;
    this.compiledModules = {};
    this.compiledById = {};
  }

  _createClass(SimpleCompiler, [{
    key: 'compile',
    value: function compile(request) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.compileModules().then(function () {
          resolve(_this.compiledModules[request.split('!').pop()]);
        }).catch(function (err) {
          reject(err);
        });
      });
    }
  }, {
    key: 'compileRequire',
    value: function compileRequire(context) {
      var _this2 = this;

      return function (moduleName) {
        if (moduleName.indexOf('css-base') >= 0) {
          return require('css-loader/lib/css-base');
        }
        moduleName = path.join(context, moduleName.split('!').pop());
        return _this2.compiledModules[moduleName];
      };
    }

    // Keep trying to compile modules until all imports are resolved

  }, {
    key: 'compileModules',
    value: function compileModules() {
      var _this3 = this;

      return this.compilePromise || (this.compilePromise = new Promise(function (resolve, reject) {
        var compiled = void 0;
        var loop = 0;
        do {
          if (loop > _this3.modules.length) {
            reject(_this3.lastError);
            return;
          }
          loop += 1;

          compiled = true;
          _this3.lastError = false;
          for (var i = 0; i < _this3.modules.length; i++) {
            compiled = _this3.compileModule(_this3.modules[i]) && compiled;
          }
        } while (!compiled);
        resolve();
      }));
    }

    // Compile CSS module in order to extract $css object

  }, {
    key: 'compileModule',
    value: function compileModule(module) {
      var name = module._source._name.split('!').pop();

      if (Object.prototype.hasOwnProperty.call(this.compiledModules, name)) return true;

      var source = module._source.source();

      var m = { exports: {}, id: module.index };
      try {
        var result = babel.transform(source, {
          presets: ['es2015']
        });
        var fn = vm.runInThisContext('(function(module, exports, require) {' + result.code + '\n})', 'module.js');
        fn(m, m.exports, this.compileRequire(module.context).bind(this));
      } catch (e) {
        this.lastError = e;
        return false;
      }

      this.compiledById[module.index] = m.exports;
      this.compiledModules[name] = m.exports;

      return true;
    }
  }]);

  return SimpleCompiler;
}();

module.exports = SimpleCompiler;