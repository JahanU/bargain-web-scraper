const webpack = require('webpack');

module.exports = {
  webpack: {
    alias: {
      'react-native$': 'react-native-web',
    },
    configure: (webpackConfig) => {
      // Handle .mjs files for Tamagui
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      });

      // Add DefinePlugin for Tamagui polyfills
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
        })
      );

      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
    ],
  },
};
