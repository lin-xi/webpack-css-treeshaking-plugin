var postcss = require('postcss')
var treeShakingPlugin = require('./treeShakingPlugin')

class CSSTreeShakingPlugin {
  constructor (options) {
    this.options = Object.assign({}, {remove: false, ignore: []}, options)
  }

  apply (compiler) {
    compiler.plugin('after-emit', (compilation, callback) => {
      let styleFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.css$/.test(asset)
      })

      let jsFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.(js|jsx)$/.test(asset)
      })

      let jsContents = jsFiles.reduce((acc, filename) => {
        let contents = compilation.assets[filename].source()
        acc += contents
        return acc
      }, '')

      let tasks = []
      styleFiles.forEach((filename) => {
        const source = compilation.assets[filename].source()
        let listOpts = {
          include: '',
          source: jsContents,
          opts: this.options
        }
        tasks.push(postcss(treeShakingPlugin(listOpts)).process(source).then(result => {
          let css = result.toString()
          compilation.assets[filename] = {
            source: () => css,
            size: () => css.length
          }
          return result
        }))
      })

      Promise.all(tasks).then((data) => {
        callback()
      })
    })
  }
}

module.exports = CSSTreeShakingPlugin
