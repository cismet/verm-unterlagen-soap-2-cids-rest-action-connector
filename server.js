
/* global use */
/*jslint node:true */

'use strict';


var extConf = require('./config/config.json');
var fs = require('fs');
var soap = require('soap');
var http = require('http');
var util = require('util');
var request = require('request');
var clustered_node = require("clustered-node");
var figlet = require('figlet');

function fig(message) {
    figlet(message, function (err, data) {
        if (err) {
            console.log('Something went wrong with the figlet output...');
            console.dir(err);
            return;
        }
        console.log(data);
    });
}

var defaults = {
    "clustered": true,
    "workers": 10,
    "prot": "http",
    "port": 8080,
    "host": "localhost",
    "tmpFolder": "/tmp/verm-unterlagen-soap-2-cids-rest-action-connector",
    "route": "/VermUnterlagenPortalOfflineAdapter/services/PortaladapterWebservice",
    "cidsRestServerUrl": "http://localhost:8890/actions/",
    "cidsRestServerDomain": "WUNDA_BLAU",
    "cidsRestServerUser": "admin",
    "cidsRestServerUserPW": "leo",
    "cidsRestActionDefaultUrlParameter": "/tasks?role=all&resultingInstanceType=result",
    "cidsRestServerTLS": false,
    "cidsRestServerTLSClientAuth": false,
    "cidsRestServerClientCert": "./certs/client.crt",
    "cidsRestServerClientCertKey": "./certs/client.key",
    "cidsRestServerClientCertPassphrase": "***",
    "cidsRestServerCert": "./certs/server.cert.pem",
    "cidsRestServerRejectIfUnauthorizedCert": false,
    "getJobStatusTaskTemplate": {
        "key": "VUPgetJobStatusAction",
        "actionKey": "VUPgetJobStatusAction",
        "description": "legacy ServerAction",
        "parameters": null,
        "status": null
    },
    "getJobErrorTaskTemplate": {
        "key": "VUPgetJobErrorAction",
        "actionKey": "VUPgetJobErrorAction",
        "description": "legacy ServerAction",
        "parameters": null,
        "status": null
    },
    "getJobResultTaskTemplate": {
        "key": "VUPgetJobResultAction",
        "actionKey": "VUPgetJobResultAction",
        "description": "legacy ServerAction",
        "parameters": null,
        "status": null
    }
};

var conf = {
    "clustered": extConf.clustered || defaults.clustered,
    "port": extConf.port || defaults.port,
    "host": extConf.host || defaults.host,
    "workers": extConf.workers || defaults.workers,
    "tmpFolder": extConf.tmpFolder || defaults.tmpFolder,
    "route": extConf.route || defaults.route,
    "cidsRestServerUrl": extConf.cidsRestServerUrl || defaults.cidsRestServerUrl,
    "cidsRestServerDomain": extConf.cidsRestServerDomain || defaults.cidsRestServerDomain,
    "cidsRestServerUser": extConf.cidsRestServerUser || defaults.cidsRestServerUser,
    "cidsRestServerUserPW": extConf.cidsRestServerUserPW || defaults.cidsRestServerUserPW,
    "cidsRestActionDefaultUrlParameter": extConf.cidsRestActionDefaultUrlParameter || defaults.cidsRestActionDefaultUrlParameter,
    "cidsRestServerTLS": extConf.cidsRestServerTLS || defaults.cidsRestServerTLS,
    "cidsRestServerTLSClientAuth": extConf.cidsRestServerTLSClientAuth || defaults.cidsRestServerTLSClientAuth,
    "cidsRestServerClientCert": extConf.cidsRestServerClientCert || defaults.cidsRestServerClientCert,
    "cidsRestServerClientCertKey": extConf.cidsRestServerClientCertKey || defaults.cidsRestServerClientCertKey,
    "cidsRestServerClientCertPassphrase": extConf.cidsRestServerClientCertPassphrase || defaults.cidsRestServerClientCertPassphrase,
    "cidsRestServerCert": extConf.cidsRestServerCert || defaults.cidsRestServerCert,
    "cidsRestServerRejectIfUnauthorizedCert": extConf.cidsRestServerRejectIfUnauthorizedCert || defaults.cidsRestServerRejectIfUnauthorizedCert,
    "getJobStatusTaskTemplate": extConf.getJobStatusTaskTemplate || defaults.getJobStatusTaskTemplate,
    "getJobErrorTaskTemplate": extConf.getJobErrorTaskTemplate || defaults.getJobErrorTaskTemplate,
    "getJobResultTaskTemplate": extConf.getJobResultTaskTemplate || defaults.getJobResultTaskTemplate
};



if (conf.cidsRestServerTLSClientAuth) {
    var certFile = fs.readFileSync(conf.cidsRestServerClientCert);
    var keyFile = fs.readFileSync(conf.cidsRestServerClientCertKey);
    var caFile = fs.readFileSync(conf.cidsRestServerCert);

} else if (conf.cidsRestServerTLS && !conf.cidsRestServerTLSClientAuth) {
    var caFile = fs.readFileSync(conf.cidsRestServerCert);
}

if (!fs.existsSync(conf.tmpFolder)) {
    fs.mkdirSync(conf.tmpFolder);
}

//because of the logs
if (!fs.existsSync(conf.tmpFolder + "/xml")) {
    fs.mkdirSync(conf.tmpFolder + "/xml");
}

function logFile(action, ending, content) {
    var fname = conf.tmpFolder + "/" + action + "." + new Date().toISOString() + "." + Math.floor(Math.random() * 10000) + "." + ending;
    fs.writeFile(fname, content);
    console.log("wrote " + fname);
}


function callActionAndRespond(formData, actionKey, soapCallback) {
    var url = conf.cidsRestServerUrl + conf.cidsRestServerDomain + "." + actionKey + conf.cidsRestActionDefaultUrlParameter;
    if (conf.cidsRestServerTLSClientAuth) {
        var options = {
            url: url,
            formData: formData,
            agentOptions: {
                cert: certFile,
                key: keyFile,
                ca: caFile,
                passphrase: 'certpassvup1337',
                securityOptions: 'SSL_OP_NO_SSLv3',
                rejectUnauthorized: conf.cidsRestServerRejectIfUnauthorizedCert
            }
        };
    } else if (conf.cidsRestServerTLS && !conf.cidsRestServerTLSClientAuth) {
        var options = {
            url: url,
            formData: formData,
            agentOptions: {
                ca: fs.readFileSync(caFile),
                securityOptions: 'SSL_OP_NO_SSLv3',
                rejectUnauthorized: conf.cidsRestServerRejectIfUnauthorizedCert
            }
        };
    } else {
        var options = {
            url: url,
            formData: formData
        };
    }



    request.post(options, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        var jsonBody = JSON.parse(body);
        var responseJson = JSON.parse(jsonBody.res);
        soapCallback(responseJson);

    }).auth(conf.cidsRestServerUser + '@' + conf.cidsRestServerDomain, conf.cidsRestServerUserPW, true);
}

function callSimpleActionAndRespond(taskParameters, soapCallback) {
    var formData = {
        taskparams: {
            value: JSON.stringify(taskParameters),
            options: {
                contentType: 'application/json'
            }
        }
    };
    callActionAndRespond(formData, taskParameters.actionKey, soapCallback);
}

function callSimpleActionAndRespond(taskParameters, soapCallback) {
    var formData = {
        taskparams: {
            value: JSON.stringify(taskParameters),
            options: {
                contentType: 'application/json'
            }
        }
    };
    callActionAndRespond(formData, taskParameters.actionKey, soapCallback);
}


var myService = {
    PortaladapterWebserviceService: {
        PortaladapterWebservice: {
            executeJob: function (args, soapCallback) {
                var actionName = "executeJob";

                //Debug output and logging of the request
                fig(actionName);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));

                //Attach the whole json to the body
                var formData = {
                    file: {
                        value: JSON.stringify(args),
                        options: {
                            contentType: 'application/json'
                        }
                    }
                };

                // Call the cids Action
                callActionAndRespond(formData, "VUPexecuteJobAction", soapCallback);

            },
            getJobStatus: function (args, soapCallback) {
                var actionName = "getJobStatus";
                var jobNumber = args.in0.$value;

                //Clone the template to a new var
                var taskParameters = JSON.parse(JSON.stringify(conf.getJobStatusTaskTemplate));
                taskParameters.parameters = {"jobNumber": jobNumber};

                //Debug output and logging of the request
                fig(actionName + ": " + jobNumber);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));

                // Call the cids Action
                callSimpleActionAndRespond(taskParameters, soapCallback);
            },
            getJobResult: function (args, soapCallback) {
                var actionName = "getJobResult";
                var jobNumber = args.in0.$value;

                //Clone the template to a new var
                var taskParameters = JSON.parse(JSON.stringify(conf.getJobResultTaskTemplate));
                taskParameters.parameters = {"jobNumber": jobNumber};

                //Debug output and logging of the request
                fig(actionName + ": " + jobNumber);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));

                // Call the cids Action
                callSimpleActionAndRespond(taskParameters, soapCallback);

            },
            getJobError: function (args, soapCallback) {
                var actionName = "getJobError";
                var jobNumber = args.in0.$value;

                //Clone the template to a new var
                var taskParameters = JSON.parse(JSON.stringify(conf.getJobErrorTaskTemplate));
                taskParameters.parameters = {"jobNumber": jobNumber};

                //Debug output and logging of the request
                fig(actionName + ": " + jobNumber);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));

                // Call the cids Action
                callSimpleActionAndRespond(taskParameters, soapCallback);

            }

        }
    }
};
var serviceUrl = conf.prot + "://" + conf.host + ":" + conf.port + conf.route;
var rawxml = fs.readFileSync('wsdl/service.wsdl', 'utf8');
var wsdlDefinition = rawxml.replace(/{{soap-facade-url}}/g, serviceUrl);

var server = http.createServer(function (request, response) {
    response.end("404: Not Found: " + request.url);
});


var soapServer = soap.listen(server, {
    path: conf.route,
    services: myService,
    xml: wsdlDefinition
            // WSDL options.
            //attributesKey: 'attributes',
            //valueKey: "$value"
});


soapServer.log = function (type, data) {
    // type is 'received' or 'replied'
    if (type !== "info") {
        logFile("xml/" + type, "xml", data);
    }
};


if (!conf.clustered) {
    //either as single node
    server.listen(8080);
} else {
    // or as a clustered node
    clustered_node.listen({port: conf.port, host: "0.0.0.0", workers: conf.workers}, server);
}

console.log('SOAP Server started on ' + serviceUrl);
