var postcss = require('postcss')
var parser = require('postcss-selector-parser')
var _ = require('lodash')

const classInJSRegex = (className) => {
  const re = new RegExp(`('|")([-_a-zA-Z0-9-\\s]*)?` + className + `([-_a-zA-Z0-9-\\s]*)('|")`, 'g')
  return re
}

/**
 * The postcss plugin at the heart of everything.
 *
 * @param {object|function} [options] - If this is a function it's interpreted as the callback
 * @param {function} [callback] - Callback, which will receive the list of selectors as its argument
 */
module.exports = postcss.plugin('list-selectors', function (options) {
  let opts = options
  let notCache = {}

  return function (cssRoot, postcssResult) {
    // Run through all the rules and accumulate a list of selectors
    // parsed out by PostCSS

    let classInJs = (className) => {
      if (opts.ignore && opts.ignore.indexOf(className) !== -1) {
        return true
      }
      return classInJSRegex(className).test(opts.source)
    }

    let checkRule = (rule) => {
      return new Promise(resolve => {
        if (_.isEmpty(rule.selectors)) {
          postcssResult.warn(
            'Failed to find any selectors at all in the source files you provided. ' +
            'You are going to get an empty selector list.'
          )
          resolve(true)
        }
        let secs = rule.selectors.filter(function (selector) {
          let result = true
          let processor = parser(function (selectors) {
            for (let i = 0, len = selectors.nodes.length; i < len; i++) {
              let node = selectors.nodes[i]
              if (_.includes(['comment', 'combinator', 'pseudo'], node.type)) continue
              for (let j = 0, len2 = node.nodes.length; j < len2; j++) {
                let n = node.nodes[j]
                if (!notCache[n.toString()]) {
                  switch (n.type) {
                    case 'id':
                    case 'class':
                      if (!classInJs(n.toString())) {
                        notCache[n.toString()] = true
                        result = false
                        break
                      }
                      break
                  }
                } else {
                  result = false
                  break
                }
              }
            }
          })
          processor.process(selector)
          return result
        })
        resolve({
          selectors: secs
        })
      })
    }

    cssRoot.walkRules(function (rule) {
      // Ignore keyframes, which can log e.g. 10%, 20% as selectors
      if (rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return
      checkRule(rule).then(result => {
        if (result.selectors.length === 0) {
          let log = ' ✂️ [' + rule.selector + '] shaked'
          console.log(log)
          rule.remove()
        } else {
          let shaked = rule.selectors.filter(item => {
            return result.selectors.indeOf(item) > -1
          })
          let log = ' ✂️ [' + shaked.join(' ') + '] shaked'
          console.log(log)
          rule.selectors = result.selectors
        }
      })
    })
  }
})
