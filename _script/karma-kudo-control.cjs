const path = require('node:path');
module.exports = config => {
  require('../karma.conf.js')(config);
  config.set({
    basePath: path.resolve(__dirname, '..'),
    customLaunchers: {
      ChromeHeadlessKudo: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox']
      }
    }
  });
};
