/**
 * Kotatsu Compiler Creator
 * =========================
 *
 * Function in charge of creating the webpack compilers for the library.
 */
var webpack = require('webpack'),
    progress = require('./progress.js'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash');

/**
 * Constants.
 */
var NODE_ENVIRONMENT = {
  console: false,
  global: false,
  process: false,
  Buffer: false,
  __filename: true,
  __dirname: true,
  setImmediate: false
};

// NOTE: handling popular libraries issues with webpack compilation
var NO_PARSE = /node_modules\/json-schema\/lib\/validate\.js/;

/**
 * Main function.
 */
module.exports = function createCompiler(opts) {
  var frontEnd = opts.command === 'serve',
      backEnd = !frontEnd,
      monitor = opts.command === 'monitor';

  var entry = opts.entry,
      output = opts.output;

  // Building the entry
  var entries = [];

  if (backEnd)
    entries.push(path.join(__dirname, '..', 'hot', 'client.js'));

  if (frontEnd)
    entries.push('webpack-hot-middleware/client');

  entries.push(entry);

  // Creating the webpack config
  var config = {
    entry: entries,
    output: {
      path: frontEnd ? '/kotatsu' : output,
      filename: 'bundle.js',
      publicPath: '/build/'
    },
    plugins: [
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.HotModuleReplacementPlugin()
    ],
    module: {}
  };

  // Are we creating a config for backend?
  if (backEnd) {

    // Env
    config.target = 'node';
    config.node = NODE_ENVIRONMENT;
    config.module.noParse = NO_PARSE;

    // Source maps
    config.devtoolModuleFilenameTemplate = '[absolute-resource-path]';

    // Registering node_modules as externals
    config.externals = {};
    fs.readdirSync(path.join(process.cwd(), 'node_modules'))
      .filter(function(p) {
        return p !== '.bin';
      })
      .forEach(function(m) {
        config.externals[m] = 'commonjs ' + m;
      });
  }

  // Should we display a progress bar?
  if (opts.progress)
    config.plugins.push(progress());

  // Do we want sourcemaps
  if (opts.sourceMaps) {
    var sourceMapModulePath = require.resolve('source-map-support'),
        injectString = 'require(\'' + sourceMapModulePath + '\').install();';

    config.devtool = opts.devtool || 'source-map';
    config.plugins.push(new webpack.BannerPlugin(injectString, {
      raw: true,
      entryOnly: false
    }));
  }

  // Merging the user's config
  // NOTE: our config should take precedence over the user's one.
  config = _.merge({}, opts.config || {}, config);

  // Additional loaders
  var loaders = config.module.loaders || [];

  //- ES2015
  if (opts.es2015)
    loaders.push({
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: require.resolve('babel-loader'),
      query: {
        presets: ['es2015']
      }
    });

  config.module.loaders = loaders;

  return webpack(config);
};
