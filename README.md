# css-treeshaking-loader

a webpack loader to shake unused css code

-------

## how to use

```javascript
npm install css-treeshaking-loader -D
```

config it in your webpack config file

```javascript
const webpack = require("webpack");
const CssTreeShakingPlugin = require("css-treeshaking-loader")

module.exports = {
  plugins: [
    new CssTreeShakingPlugin({}),
    ...
  ]
};
```