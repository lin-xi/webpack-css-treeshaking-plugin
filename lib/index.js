'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var postcss = require('postcss');
var treeShakingPlugin = require('./treeShakingPlugin');

var CSSTreeShakingPlugin = exports.CSSTreeShakingPlugin = function () {
  function CSSTreeShakingPlugin(options) {
    _classCallCheck(this, CSSTreeShakingPlugin);

    this.options = Object.assign({}, { remove: true, showInfo: true }, options);
  }

  _createClass(CSSTreeShakingPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      compiler.plugin('emit', function (compilation, callback) {
        var styleFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.css$/.test(asset)
          );
        });

        var jsFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.(js|jsx)$/.test(asset)
          );
        });

        var jsContents = jsFiles.reduce(function (acc, filename) {
          var contents = compilation.assets[filename].source();
          acc += contents;
          return acc;
        }, '');

        var tasks = [];
        styleFiles.forEach(function (filename) {
          var source = compilation.assets[filename].source();
          var listOpts = {
            include: 'ids',
            source: jsContents
          };
          tasks.push(postcss(treeShakingPlugin(listOpts, function (src) {
            compilation.assets[filename] = {
              source: function source() {
                return src;
              },
              size: function size() {
                return src.length;
              }
            };
          })).process(source));
        });

        Promise.all(tasks).then(function () {
          callback();
        });
      });
    }
  }]);

  return CSSTreeShakingPlugin;
}();