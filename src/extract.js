const loaderUtils = require('loader-utils')
const fs = require('fs')
const SimpleCompiler = require('./compiler')

const NS = fs.realpathSync(__dirname)

function filterModules (module) {
  return module.loaders && module.loaders.reduce((r, l) => (r || l.loader.includes('/css-loader/')), false)
}

module.exports = function (source, map) {
    // Once all modules are loaded, store CSS modules on the compilation
  this._compilation.plugin('seal', () => {
    this._compilation[NS] = this._compilation.modules.filter(filterModules).map((module) => ({
      index: module.index,
      _source: module._source,
      context: module.context
    }))
  })

  const extractPlugin = Object.keys(this).filter((key) => key.includes('extract-text-webpack-plugin'))[0]

  const query = loaderUtils.parseQuery(this.query)

  if (this._compiler[NS] > 0 || !this[extractPlugin](null, query) || !this._compilation[NS]) {
    this.callback(null, source, map)
  } else {
        // When extract-text-webpack-plugin triggers module rebuild, use the loaded modules to extract exports
    if (Array.isArray(this._compilation[NS])) {
      this._compilation[NS] = new SimpleCompiler(this._compilation[NS])
    }

    let resultSource = '// removed by dead-css-loader extracting loader'

    const callback = this.async()

    this._compilation[NS].compile(this.request).then((exports) => {
      if (!exports.default) {
        callback(new Error('Not a css module'))
      }

      this[extractPlugin](exports, query)

      resultSource = Object.keys(exports).reduce((result, key) => {
        switch (key) {
          case 'default':
            return result + '\nexport default ' + JSON.stringify(exports.default) + ';'
          case '$css':
            return result
          default:
            return result + '\nexport const ' + key + ' = ' + JSON.stringify(exports[key]) + ';'
        }
      }, resultSource)

      if (resultSource) { callback(null, resultSource) } else { callback() }
    }).catch((err) => callback(err))
  }
}
