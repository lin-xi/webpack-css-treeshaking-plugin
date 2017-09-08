# webpack-css-treeshaking-plugin

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
    new CssTreeShakingPlugin(),
    new ExtractTextPlugin({
      filename: 'build/style.css'
    })
  ]
};
```

## architechture
<img src="architechture.png">


