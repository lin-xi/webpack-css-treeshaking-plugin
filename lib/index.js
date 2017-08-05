'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var classNameRegex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)(?![^\{]*\})/gi;
var classInJSRegex = /class(?:Name)?\s*=\s*(?:'|")(.*?)(?:'|")/g;
// const classInJSRegex = className => {
//   const re = new RegExp(
//     `class(Name)?\s*=\s*('|")([-_a-zA-Z0-9-\\s]*)?` + className + `([-_a-zA-Z0-9-\\s]*)('|")`,
//     'g'
//   )
//   return re
// }
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
        // css文件
        var styleFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.css$/.test(asset)
          );
        });
        // js文件
        var jsFiles = Object.keys(compilation.assets).filter(function (asset) {
          return (/\.(js|jsx)$/.test(asset)
          );
        });

        // 获取所有的className数组
        var classNamesInStyles = styleFiles.reduce(function (acc, filename) {
          var source = compilation.assets[filename].source();
          var match = source.match(classNameRegex).map(function (str) {
            return str.slice(1);
          });
          acc = acc.concat(match);
          return acc;
        }, []);

        // 获取所有js的代码字符串
        var jsContents = jsFiles.reduce(function (acc, filename) {
          var contents = compilation.assets[filename].source();
          acc += contents;
          return acc;
        }, '');

        // 获取所有js中没有出现的className
        var classesNotInJS = classNamesInStyles.filter(function (className) {
          if (_this.options.ignore && _this.options.ignore.indexOf(className) !== -1) {
            return false;
          }
          var result = jsContents.match(classInJSRegex).some(function (str) {
            var mats = str.match(classInJSRegex);
            if (mats && mats.length === 2) {
              var cn = mats[1];
              return cn === className || new RegExp(cn + 's*:').test(className);
            }
          });
          return !!result;
        });

        // 重复className删除
        var classesDeduped = classesNotInJS.reduce(function (acc, cur) {
          if (acc.indexOf(cur) === -1) {
            acc.push(cur);
          }
          return acc;
        }, []);

        if (_this.options.showInfo) {
          console.log('Removing css classes:[' + classesDeduped + ']');
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