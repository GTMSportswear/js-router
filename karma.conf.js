module.exports = function (config) {
    config.set({
        frameworks: ['systemjs', 'qunit'],
        files: [
        'node_modules/handlebars/dist/handlebars.js',
        'dist/*.test.js',
        { pattern: 'dist/**/*!(.test).js', included: false }
        ],
        plugins: ['karma-systemjs', 'karma-qunit', 'karma-chrome-launcher'],
        systemjs: {
        configFile: 'system.conf.js'
        },
        browsers: ['Chrome'],
        browserNoActivityTimeout: 15000,
        browserDisconnectTolerance: 10,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        concurrency: Infinity
    });
}
