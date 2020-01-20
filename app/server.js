/**
 * Autor: Andre Sieverding
 * Copyright © 2020
 */

// Include required packages
import express from 'express'
import tumblr from 'tumblr.js'

// Get App configurations
import config from '../config'

// Get App routes
import routes from './routes'

// Get template
import template from './template.marko'

// Create Express App
var app = express()

// Get node environment
const { NODE_ENV } = process.env
const isDev = NODE_ENV === 'development'

// Include webpack middleware for development
if (isDev) {
    var webpackConfig = require('../webpack.config.js')[1]
    var webpack = require('webpack')
    var webpackDevMiddleware = require('webpack-dev-middleware')
    var webpackHotMiddleware = require('webpack-hot-middleware')

    // Remove first plugin from webpack config -> pre-build plugin
    webpackConfig.plugins.shift()

    var compiler = webpack(webpackConfig)

    app.use(webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: 'minimal'
    }))

    app.use(webpackHotMiddleware(compiler, {
        log: console.log
    }))
}

// Grant access for static files
app.use(config.path + '/assets', express.static('dist'), (req, res, next) => {
    next()
})

// Include Routes / Views
routes.forEach(route => {
    // Create route parameters array & push the route to it
    var routeParameters = []
    routeParameters.push(config.path + route.route)

    // Push view or function to route parameters array
    if (typeof route.view !== 'undefined') {
        routeParameters.push(async (req, res) => {
            // Get quote from Tumblr
            var client = tumblr.createClient({
                consumer_key: process.env.TUMBLR_CONSUMER_KEY,
                consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
                token: process.env.TUMBLR_TOKEN,
                token_secret: process.env.TUMBLR_TOKEN_SECRET
            })

            client.blogPosts('spacev7bes.tumblr.com', { type: 'quote', limit: 100 }, (err, data) => {
                const post = data.posts[Math.floor(Math.random() * data.posts.length)]

                res.setHeader("Content-Type", "text/html; charset=utf-8")
                template.render({
                    $global: {
                        title: route.title,
                        view: route.view,
                        route: route.route,
                        path: config.path,
                        params: req.params,
                        query: req.query,
                        quote: post.body || post.text || post.summary,
                        source: post.source,
                        tags: post.tags,
                        serializedGlobals: {
                            view: true,
                            title: true,
                            route: true,
                            path: true,
                            params: true,
                            query: true,
                            quote: true,
                            source: true,
                            tags: true
                        }
                    }
                }, res)
            })
        })
    } else {
        routeParameters.push(route.function)
    }

    // Define route
    app.get(...routeParameters)
})

var port = process.env.PORT || config.port

app.listen(port)

console.log(`Server is listening on port ${port}!`)
console.log('Press Ctrl+C to quit.')
