const classNameRegex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)(?![^\{]*\})/gi
const classInJSRegex = /class(?:Name)?\s*=\s*(?:'|")(.*?)(?:'|")/g
// const classInJSRegex = className => {
//   const re = new RegExp(
//     `class(Name)?\s*=\s*('|")([-_a-zA-Z0-9-\\s]*)?` + className + `([-_a-zA-Z0-9-\\s]*)('|")`,
//     'g'
//   )
//   return re
// }
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
      // css文件
      const styleFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.css$/.test(asset)
      })
      // js文件
      const jsFiles = Object.keys(compilation.assets).filter(asset => {
        return /\.(js|jsx)$/.test(asset)
      })

      // 获取所有的className数组
      const classNamesInStyles = styleFiles.reduce((acc, filename) => {
        const source = compilation.assets[filename].source()
        const match = source.match(classNameRegex).map(str => str.slice(1))
        acc = acc.concat(match)
        return acc
      }, [])

      // 获取所有js的代码字符串
      const jsContents = jsFiles.reduce((acc, filename) => {
        const contents = compilation.assets[filename].source()
        acc += contents
        return acc
      }, '')

      // 获取所有js中没有出现的className
      const classesNotInJS = classNamesInStyles.filter(className => {
        if (
          this.options.ignore &&
          this.options.ignore.indexOf(className) !== -1
        ) {
          return false
        }
        let result = jsContents.match(classInJSRegex).some((str) => {
          let mats = str.match(classInJSRegex)
          if (mats && mats.length === 2) {
            let cn = mats[1]
            return cn === className || new RegExp(`${cn}\s*:`).test(className)
          }
        })
        return !!result
      })

      // 重复className删除
      const classesDeduped = classesNotInJS.reduce((acc, cur) => {
        if (acc.indexOf(cur) === -1) {
          acc.push(cur)
        }
        return acc
      }, [])

      if (this.options.showInfo) {
        console.log(`Removing css classes:[${classesDeduped}]`)
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
