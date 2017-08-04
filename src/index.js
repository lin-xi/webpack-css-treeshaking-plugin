const classNameRegex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)(?![^\{]*\})/gi
const classInJSRegex = className => {
  const re = new RegExp(
    `('|")([-_a-zA-Z0-9-\\s]*)?` + className + `([-_a-zA-Z0-9-\\s]*)('|")`,
    'g'
  )
  return re
}
const classInCSSRegex = className => {
  const re = RegExp(`\.` + className + `(\\s)?{[^\}]*\}`)
  return re
}

export class WebpackCssTreeShakingPlugin {
  constructor (options) {
    this.options = Object.assign({}, { remove: true, showInfo: true }, options)
  }

  apply (compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      const styleFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.css$/.test(asset)
      })

      const jsFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.(js|jsx)$/.test(asset)
      })

      const classNamesInStyles = styleFiles.reduce((acc, filename) => {
        const source = compilation.assets[filename].source()
        const match = source.match(classNameRegex).map(str => str.slice(1))
        acc = acc.concat(match)
        return acc
      }, [])

      const jsContents = jsFiles.reduce((acc, filename) => {
        const contents = compilation.assets[filename].source()
        acc += contents
        return acc
      }, '')

      const classesNotInJS = classNamesInStyles.filter(className => {
        if (
          this.options.ignore &&
          this.options.ignore.indexOf(className) !== -1
        ) {
          return false
        }
        return !classInJSRegex(className).test(jsContents)
      })

      const classesDeduped = classesNotInJS.reduce((acc, cur) => {
        if (acc.indexOf(cur) === -1) {
          acc.push(cur)
        }
        return acc
      }, [])

      if (this.options.showInfo) {
        console.log(`Removing css classes:[${moduleName}]`, classesDeduped)
      }

      if (!this.options.remove) {
        callback()
        return
      }

      const updatedStyles = styleFiles.map(function (filename) {
        const source = compilation.assets[filename].source()

        let replaced = classesDeduped.reduce((acc, className) => {
          return acc.replace(classInCSSRegex(className), '')
        }, source)

        return replaced
      })

      styleFiles.forEach((filename, i) => {
        compilation.assets[filename] = {
          source: () => updatedStyles[i],
          size: () => updatedStyles[i].length
        }
      })
      callback()
    })
  }
}
