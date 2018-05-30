
import Express from 'express';
import compression from 'compression';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import IntlWrapper from '../client/modules/Intl/IntlWrapper';

import { configureStore } from '../client/store';
import { Provider } from 'react-redux';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RouterContext } from 'react-router';
import Helmet from 'react-helmet';

import serverConfig from './config';
import routes from '../client/routes';
import { fetchComponentData } from './util/fetchData';
import posts from './routes/post.routes';

import assetsManifest from '../assets/manifest.json';
import chunksManifest from '../assets/chunk-manifest.json';


mongoose.Promise = global.Promise;

mongoose.connect(serverConfig.mongoURL, error => {
    if(error) {
        throw error;
    }
});


const renderPage = (html, initialState) => {

    const head = Helmet.rewind();

    return `
        <!doctype html>
        <html>
            <head>
                ${head.base.toString()}
                ${head.title.toString()}
                ${head.meta.toString()}
                ${head.link.toString()}
                ${head.script.toString()}

                <link rel="stylesheet" href="${assets['/app.css']}" />
            </head>
            <body>
                <div id="root">${html}</div>
                <script>
                    window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};

                    //<![CDATA[
                        window.webpackManifest = ${JSON.stringify(chunksManifest)};
                    //]]>

                </script>
                <script src="${assetsManifest['/vendor.js']}"></script>
                <script src="${assetsManifest['/app.js']}"></script>
            </body>
        </html>
    `;
};


const app = new Express();

app.use(compression());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ 
    extended: false 
}));

app.use(Express.static(path.resolve(__dirname, '../assets')));


app.use((req, res, next) => {

    match({ routes, location: req.url }, 

        (err, redirectLocation, renderProps) => {

            if(err) { 
                return res.status(500)
                    .end(renderPage(err.stack.replace(/\n/g, `<br>`)));
            }
            if(redirectLocation) {
                return res.redirect(302, redirectLocation.pathname + redirectLocation.search);
            }
            if(!renderProps) {
                return next();
            }

            const store = configureStore();

            return fetchComponentData(store, renderProps.components, renderProps.params)
                .then(() => {

                    const initialView = renderToString(
                        <Provider store={store}>
                            <IntlWrapper>
                                <RouterContext {...renderProps} />
                            </IntlWrapper>
                        </Provider>
                    );
                    const finalState = store.getState();

                    res.status(200)
                        .set('Content-Type', 'text/html')
                        .end(renderPage(initialView, finalState));
                })
                .catch(error => next(error));
        }
    );
});


app.use('/api', posts);


app.listen(serverConfig.port, error => {
    if(!error) {
        console.log(`Server is running on port: ${serverConfig.port}`); 
    }
});
