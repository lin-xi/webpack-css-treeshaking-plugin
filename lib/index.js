'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var classNameRegex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)(?![^\{]*\})/gi;
var classInJSRegex = function classInJSRegex(className) {
  var re = new RegExp('(\'|")([-_a-zA-Z0-9-\\s]*)?' + className + '([-_a-zA-Z0-9-\\s]*)(\'|")', 'g');
  return re;
};
var classInCSSRegex = function classInCSSRegex(className) {
  var re = RegExp('.' + className + '(\\s)?{[^}]*}');
  return re;
};

var WebpackCssTreeShakingPlugin = exports.WebpackCssTreeShakingPlugin = function () {
  function WebpackCssTreeShakingPlugin(options) {
    _classCallCheck(this, WebpackCssTreeShakingPlugin);

    this.options = Object.assign({}, { remove: true, showInfo: true }, options);
  }

  _createClass(WebpackCssTreeShakingPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      compiler.plugin('emit', function (compilation, callback) {
        var styleFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.css$/.test(asset)
          );
        });

        var jsFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.(js|jsx)$/.test(asset)
          );
        });

        var classNamesInStyles = styleFiles.reduce(function (acc, filename) {
          var source = compilation.assets[filename].source();
          var match = source.match(classNameRegex).map(function (str) {
            return str.slice(1);
          });
          acc = acc.concat(match);
          return acc;
        }, []);

        var jsContents = jsFiles.reduce(function (acc, filename) {
          var contents = compilation.assets[filename].source();
          acc += contents;
          return acc;
        }, '');

        var classesNotInJS = classNamesInStyles.filter(function (className) {
          if (_this.options.ignore && _this.options.ignore.indexOf(className) !== -1) {
            return false;
          }
          return !classInJSRegex(className).test(jsContents);
        });

        var classesDeduped = classesNotInJS.reduce(function (acc, cur) {
          if (acc.indexOf(cur) === -1) {
            acc.push(cur);
          }
          return acc;
        }, []);

        if (_this.options.showInfo) {
          console.log('Removing css classes:[' + moduleName + ']', classesDeduped);
        }

        if (!_this.options.remove) {
          callback();
          return;
        }

        var updatedStyles = styleFiles.map(function (filename) {
          var source = compilation.assets[filename].source();

          var replaced = classesDeduped.reduce(function (acc, className) {
            return acc.replace(classInCSSRegex(className), '');
          }, source);

          return replaced;
        });

        styleFiles.forEach(function (filename, i) {
          compilation.assets[filename] = {
            source: function source() {
              return updatedStyles[i];
            },
            size: function size() {
              return updatedStyles[i].length;
            }
          };
        });
        callback();
      });
    }
  }]);

  return WebpackCssTreeShakingPlugin;
}();