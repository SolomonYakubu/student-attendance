const path = require("path");

module.exports = {
  mode: "development",
  // watch: false,
  // hot: true,

  entry: [
    "core-js/modules/es.promise",
    "core-js/modules/es.array.iterator",
    "./src/js/index.js",
  ],
  devtool: "inline-source-map",
  target: "electron-renderer",
  watchOptions: {
    ignored: [".exec/**", ".db/**", "node_modules/**", "src/img/**"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    esmodules: true,
                  },
                },
              ],
              "@babel/preset-react",
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        // include: path.resolve(__dirname, 'src/js'),
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      // {
      //   test: [/\.s[ac]ss$/i, /\.css$/i],
      //   use: [
      //     // Creates `style` nodes from JS strings
      //     "style-loader",
      //     // Translates CSS into CommonJS
      //     "css-loader",
      //     // Compiles Sass to CSS
      //     "sass-loader",
      //   ],
      // },
      {
        test: /\.(png|bmp|svg|jpg|jpeg|gif|tiff)$/,
        use: ["file-loader?name=src/img/[name].[ext]"],
      },
      // {
      //   test: /\.(png|woff|woff2|eot|ttf)$/,
      //   use: [
      //     {
      //       loader: "url-loader?limit=100000",
      //       options: {
      //         outputPath: "src/fonts",
      //       },
      //     },
      //   ],
      // },
      {
        test: /\.(svg|woff|woff2|eot|ttf|otf)$/i,
        type: "asset/inline",
    },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  output: {
    filename: "app.js",
    path: path.resolve(__dirname),
    publicPath: "/",
  },
};