'use strict';

var postcss = require('postcss');
var parser = require('postcss-selector-parser');
var _ = require('lodash');

var classInJSRegex = function classInJSRegex(className) {
  var re = new RegExp('(\'|")([-_a-zA-Z0-9-\\s]*)?' + className + '([-_a-zA-Z0-9-\\s]*)(\'|")', 'g');
  var vre = new RegExp('({|,])?s*' + className + '([-_a-zA-Z0-9-\\s]*):', 'g');
  return [re, vre];
};

/**
 * The postcss plugin at the heart of everything.
 *
 * @param {object|function} [options] - If this is a function it's interpreted as the callback
 * @param {function} [callback] - Callback, which will receive the list of selectors as its argument
 */
module.exports = postcss.plugin('list-selectors', function (options) {
  var opts = options;
  var notCache = {};
  var config = options.opts;

  return function (cssRoot, postcssResult) {
    // Run through all the rules and accumulate a list of selectors
    // parsed out by PostCSS

    var classInJs = function classInJs(className) {
      var exist = false;
      if (!_.isEmpty(opts.ignore)) {
        exist = opts.ignore.some(function (item) {
          var re = new RegExp(item, 'g');
          return re.test(className);
        });
      }
      if (!exist) {
        return classInJSRegex(className).some(function (item) {
          return item.test(opts.source);
        });
      }
      return true;
    };

    var checkRule = function checkRule(rule) {
      return new Promise(function (resolve) {
        if (_.isEmpty(rule.selectors)) {
          postcssResult.warn('Failed to find any selectors at all in the source files you provided. ' + 'You are going to get an empty selector list.');
          resolve(true);
        }
        var secs = rule.selectors.filter(function (selector) {
          var result = true;
          var processor = parser(function (selectors) {
            for (var i = 0, len = selectors.nodes.length; i < len; i++) {
              var node = selectors.nodes[i];
              if (_.includes(['comment', 'combinator', 'pseudo'], node.type)) continue;
              for (var j = 0, len2 = node.nodes.length; j < len2; j++) {
                var n = node.nodes[j];
                if (!notCache[n.value]) {
                  switch (n.type) {
                    case 'tag':
                      // nothing
                      break;
                    case 'id':
                    case 'class':
                      if (!classInJs(n.value)) {
                        notCache[n.value] = true;
                        result = false;
                        break;
                      }
                      break;
                    default:
                      // nothing
                      break;
                  }
                } else {
                  result = false;
                  break;
                }
              }
            }
          });
          processor.process(selector);
          return result;
        });
        resolve({
          selectors: secs
        });
      });
    };

    var start = Date.now();
    cssRoot.walkRules(function (rule) {
      // Ignore keyframes, which can log e.g. 10%, 20% as selectors
      if (rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
      checkRule(rule).then(function (result) {
        if (result.selectors.length === 0) {
          var log = ' ✂️ [' + rule.selector + '] shaked, [1]';
          console.log(log);
          if (config.remove) {
            rule.remove();
          }
        } else {
          var shaked = rule.selectors.filter(function (item) {
            return result.selectors.indexOf(item) === -1;
          });
          if (shaked && shaked.length > 0) {
            var _log = ' ✂️ [' + shaked.join(' ') + '] shaked, [2]';
            console.log(_log);
          }
          if (config.remove) {
            rule.selectors = result.selectors;
          }
        }
      });
    });
    console.log('[total time]:', ((Date.now() - start) / 1000).toFixed(2) + 's');
  };
});