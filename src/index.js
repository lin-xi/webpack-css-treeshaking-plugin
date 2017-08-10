const postcss = require('postcss')
const cssshaking = require('postcss-tree-shaking')
const fs = require('fs')
const loaderUtils = require('loader-utils')

const NS = fs.realpathSync(__dirname)

function cleanMap (map) {
  if (map.sources) {
    map.sources = map.sources.map((url) => url.split('://').pop())
  }
  return map
}

function filterModules (module) {
  return module.loaders && module.loaders.reduce((r, l) => (r || l.loader.includes('/css-treeshaking-loader/')), false)
}

class CSSTreeshakingLoader {
  constructor (compilation, query) {
    this.options = {
      plugins: false,
      spinalCase: false,
      ignore: [],
      allowIds: false,
      allowNonClassSelectors: false,
      allowNonClassCombinators: false
    }
    if (query) {
      Object.assign(this.options, query)
    }
    this.modules = []

    const options = Object.assign({}, compilation.compiler.options)
    options.output = Object.assign({}, options.output)
    if (!this.options.plugin) {
      options.plugins = []
    }
    delete options.devtool

    const childCompiler = require('webpack/lib/webpack')(options)
    // Increment recursion counter
    childCompiler[NS] = compilation.compiler[NS] + 1

    // Save our modules
    childCompiler.plugin('compilation', (comp) => {
      comp.plugin('after-optimize-modules', (modules) => {
        this.modules = modules.filter(filterModules)
      })
    })
    childCompiler.plugin('after-compile', (comp, callback) => {
      // Remove all chunk assets
      comp.chunks.forEach(function (chunk) {
        chunk.files.forEach(function (file) {
          delete comp.assets[file]
        })
      })
      callback()
    })
    this.childCompiler = childCompiler
  }

  doChildCompilation () {
    if (!this.compilePromise) {
      this.compilePromise = new Promise((resolve, reject) => {
        this.childCompiler.run((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
    return this.compilePromise
  }

  filterCSS (loaderContext, source, sourceMap) {
    return new Promise((resolve, reject) => {
      this.doChildCompilation().then(() => {
        const module = this.getModule(loaderContext.request)

        if (module.error) {
          return reject(module.error)
        }

        if (module.usedExports === true || module.usedExports === false || module.usedExports.indexOf('default') !== -1) {
          return resolve({ source: source, map: sourceMap })
        }
        console.log(module.usedExports)
        let usedSelectors = module.usedExports.filter((selector) => selector !== '$css')

        if (this.options.spinalCase) {
          usedSelectors = usedSelectors.concat(
                        usedSelectors.map((selector) => selector.replace(/([a-z0-9])([A-Z])/g, (match, p1, p2) => p1 + '-' + p2.toLowerCase()))
                    )
        }

        postcss([
          cssshaking({
            used: usedSelectors,
            ignore: this.options.ignore,
            allowIds: this.options.allowIds,
            allowNonClassSelectors: this.options.allowNonClassSelectors,
            allowNonClassCombinators: this.options.allowNonClassCombinators
          })
        ]).process(source, {
          from: loaderUtils.getRemainingRequest(loaderContext),
          to: loaderUtils.getCurrentRequest(loaderContext),
          map: {
            prev: sourceMap,
            sourcesContent: true,
            inline: false,
            annotation: false
          }
        }).then((result) => {
          resolve({ source: result.css, map: cleanMap(result.map.toJSON())})
        }).catch((error) => {
          reject(error)
        })
      }).catch((err) => reject(err))
    })
  }

  getModule (request) {
    return this.modules.filter((module) => module.request.includes(request))[0]
  }
}

function loader (source, map) {
  if (this.cacheable) this.cacheable()

  const query = loaderUtils.parseQuery(this.query)

  if (typeof query.recursion === 'undefined') {
    query.recursion = 1
  }

  if (typeof this._compiler[NS] === 'undefined') {
    this._compiler[NS] = 0
  }
    // Don't apply transform to final recursion
  if (this._compiler[NS] === query.recursion) {
    this.callback(null, source, map)
  } else {
    const callback = this.async()

        // Save loader instance on the compilation
    const loaderId = 'CSSTreeShakingLoader' + (typeof this.query === 'string' ? this.query : '?' + JSON.stringify(this.query))
    this._compilation[loaderId] = this._compilation[loaderId] || new CSSTreeshakingLoader(this._compilation, query)

    this._compilation[loaderId].filterCSS(this, source, map).then((result) => {
      callback(null, result.source, result.map)
    }).catch((err) => callback(err))
  }
}

loader.extract = function (options) {
  return { loader: require.resolve('./extract'), query: options }
}
