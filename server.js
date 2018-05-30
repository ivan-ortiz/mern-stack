require('babel-register')({
    presets: [
        "react", 
        "es2015", 
        "stage-0"
    ],
    plugins: [
        [
            "babel-plugin-webpack-loaders",
            {
                config: "./webpack.config-server.js",
                verbose: false
            }
        ]
    ]
});

require('babel-polyfill');

require('./server/server.js');