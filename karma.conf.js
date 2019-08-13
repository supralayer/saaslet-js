module.exports = function (config) {
    config.set({
        frameworks: ['mocha', 'chai'],
        files: [
            'saaslet.js',
            'test/test-js/*.js'
        ],
        reporters: ['progress'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['Chrome'],
        autoWatch: true,
        concurrency: 0,
        hostname: 'devapp.saaslet.com',
        // protocol: 'https',
        // httpsServerOptions: {
        //     key: fs.readFileSync('server.key', 'utf8'),
        //     cert: fs.readFileSync('server.crt', 'utf8')
        // }
    })
}