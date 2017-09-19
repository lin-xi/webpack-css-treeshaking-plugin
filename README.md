<p style="text-align: center; width: 128px;">
  <img src="css-tree-shaking.png"/>
</p>

# webpack-css-treeshaking-plugin

[![Build Status](https://travis-ci.org/lin-xi/webpack-css-treeshaking-plugin.svg?branch=master)](https://travis-ci.org/lin-xi/webpack-css-treeshaking-plugin)
[![Coverage Status](https://coveralls.io/repos/github/lin-xi/webpack-css-treeshaking-plugin/badge.svg?branch=master)](https://coveralls.io/github/lin-xi/webpack-css-treeshaking-plugin?branch=master)
[![npm package](https://img.shields.io/npm/v/webpack-css-treeshaking-plugin.svg)](https://www.npmjs.org/package/webpack-css-treeshaking-plugin)
[![NPM downloads](http://img.shields.io/npm/dm/webpack-css-treeshaking-plugin.svg)](https://npmjs.org/package/webpack-css-treeshaking-plugin)

a webpack plugin to shake unused css code

-------

## how to use

```javascript
npm install webpack-css-treeshaking-plugin -D
```

config it in your webpack configuration file, it depends on extracting styles to a file, so please use ExtractTextPlugin first. 

```javascript
var ExtractTextPlugin = require('extract-text-webpack-plugin')
const CssTreeShakingPlugin = require("webpack-css-treeshaking-plugin")

module.exports = {
  plugins: [
    new CssTreeShakingPlugin({
      remove: false,
      ignore: ['state-\d']
    }),
    new ExtractTextPlugin({
      filename: 'build/style.css'
    })
  ]
};
```

## configuration
+ remove  [boolean]

  remove unused css

+ ignore  [array]

  items can be a string or a regexp
  

## architechture
<img src="architechture.png">


