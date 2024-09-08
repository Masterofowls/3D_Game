// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js', // Entry point for your code
  output: {
    filename: 'bundle.js', // Output file
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  mode: 'development', // Set the mode to development
  module: {
    rules: [
      {
        test: /\.js$/, // For JavaScript files
        exclude: /node_modules/, // Exclude the node_modules directory
        use: {
          loader: 'babel-loader', // Use Babel loader for transpiling
        },
      },
    ],
  },
  devtool: 'inline-source-map', // For easier debugging in development
};
