const path = require('path')
const babel = require('babel-core')
const vm = require('vm')

class SimpleCompiler {
  constructor (modules) {
    this.modules = modules
    this.compiledModules = {}
    this.compiledById = {}
  }

  compile (request) {
    return new Promise((resolve, reject) => {
      this.compileModules().then(() => {
        resolve(this.compiledModules[request.split('!').pop()])
      }).catch((err) => {
        reject(err)
      })
    })
  }

  compileRequire (context) {
    return (moduleName) => {
      if (moduleName.indexOf('css-base') >= 0) {
        return require('css-loader/lib/css-base')
      }
      moduleName = path.join(context, moduleName.split('!').pop())
      return this.compiledModules[moduleName]
    }
  }

    // Keep trying to compile modules until all imports are resolved
  compileModules () {
    return this.compilePromise || (this.compilePromise = new Promise((resolve, reject) => {
      let compiled
      let loop = 0
      do {
        if (loop > this.modules.length) {
          reject(this.lastError)
          return
        }
        loop += 1

        compiled = true
        this.lastError = false
        for (let i = 0; i < this.modules.length; i++) {
          compiled = this.compileModule(this.modules[i]) && compiled
        }
      } while (!compiled)
      resolve()
    }))
  }

    // Compile CSS module in order to extract $css object
  compileModule (module) {
    const name = module._source._name.split('!').pop()

    if (Object.prototype.hasOwnProperty.call(this.compiledModules, name)) return true

    const source = module._source.source()

    const m = { exports: {}, id: module.index }
    try {
      const result = babel.transform(source, {
        presets: ['es2015']
      })
      const fn = vm.runInThisContext('(function(module, exports, require) {' + result.code + '\n})', 'module.js')
      fn(m, m.exports, this.compileRequire(module.context).bind(this))
    } catch (e) {
      this.lastError = e
      return false
    }

    this.compiledById[module.index] = m.exports
    this.compiledModules[name] = m.exports

    return true
  }
}

module.exports = SimpleCompiler
