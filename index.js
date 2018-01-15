'use strict';

const express = require('express');
const qs = require('querystring');
const server = express();

/////////////////////////////
////////// MODULES //////////
/////////////////////////////

const bodyParser = require('body-parser');
server.use(bodyParser.json({
    verify: function (req, res, buf, encoding) {
        // raw body for signature check
        req.rawBody = buf.toString();
    }
}));

const REST_PORT = (process.env.PORT || 5000);

const DialogflowApp = require('actions-on-google').DialogflowApp;
server.post('/webhook', (request, response) => {
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    if (request.body.result) {
        processV1Request(request, response);
    } else if (request.body.queryResult) {
        console.log('Invalid Request: V2 webhook requests is not supported');
        response.status(400).end('Invalid Webhook Request (v2 requests is not supported)');
    } else {
        console.log('Invalid Request');
        return response.status(400).end('Invalid Webhook Request (v1 webhook request)');
    }
});

function processV1Request(request, response) {
    let action = request.body.result.action;
    let requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;
    const googleAssistantRequest = 'google';
    const app = new DialogflowApp({
        request: request,
        response: response
    });

    ///////////////////////////////////////////
    ////////// ACTIONS (ENTRY POINT) //////////
    ///////////////////////////////////////////
    const actionHandlers = {
        'default': () => {
            responseWith({
                speech: "Unsupported operation",
                text: "Unsupported operation"
            });
        }
    };

    if (!actionHandlers[action]) {
        console.error(`Action with name ${action} is not found`);
        action = 'default';
    }

    actionHandlers[action]();

    ///////////////////////////////////////
    ////////// RESPONSE CREATORS //////////
    ///////////////////////////////////////
    function sendGoogleResponse(responseToUser) {
        if (typeof responseToUser === 'string') {
            app.ask(responseToUser);
        } else {
            let googleResponse = app.buildRichResponse().addSimpleResponse({
                speech: responseToUser.speech || responseToUser.displayText,
                displayText: responseToUser.displayText || responseToUser.speech
            });
            console.log('Response to Dialogflow (AoG): ' + JSON.stringify(googleResponse));
            app.ask(googleResponse);
        }
    }

    function sendResponse(responseToUser) {
        if (typeof responseToUser === 'string') {
            let responseJson = {};
            responseJson.speech = responseToUser;
            responseJson.displayText = responseToUser;
            response.json(responseJson);
        } else {
            let responseJson = {};
            responseJson.speech = responseToUser.speech || responseToUser.displayText;
            responseJson.displayText = responseToUser.displayText || responseToUser.speech;
            console.log('Response to Dialogflow: ' + JSON.stringify(responseJson));
            response.json(responseJson);
        }
    }

    function responseWith(response) {
        if (requestSource === googleAssistantRequest) {
            sendGoogleResponse(response);
        } else {
            sendResponse(response);
        }
    }
}

server.listen(REST_PORT, function () {
    console.log(`Service is ready on port ${REST_PORT}`);
});
