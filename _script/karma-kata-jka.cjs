module.exports = config => {
  require('../karma.conf.js')({ set: options => config.set({
    ...options,
    customLaunchers: { ChromeHeadlessKata: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--in-process-gpu'] } }
  }) });
};
