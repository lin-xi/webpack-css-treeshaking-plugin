# webpack-css-treeshaking-plugin

a webpack plugin to shake unused css code

-------

## how to use

```javascript
npm install webpack-css-treeshaking-plugin -D
```

config it in your webpack config file

```javascript
const webpack = require("webpack");
const CssTreeShakingPlugin = require("wepack-css-treeshaking-plugin")

module.exports = {
  plugins: [
    new CssTreeShakingPlugin({}),
    ...
  ]
};
```

