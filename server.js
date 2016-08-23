var extConf = require('./config.json');
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
    "prot": "http",
    "port": 8080,
    "host": "localhost",
    "workers": 10,
    "tmpFolder": "./tmp/",
    "route": "/VermUnterlagenPortalOfflineAdapter/services/PortaladapterWebservice"
};

var conf = {
    "prot": extConf.prot || defaults.prot,
    "port": extConf.port || defaults.port,
    "host": extConf.host || defaults.host,
    "workers": extConf.workers || defaults.workers,
    "tmpFolder": extConf.tmpFolder || defaults.tmpFolder,
    "route": extConf.route || defaults.route
};


var soapHeader = {
    "Username": "foo",
    "Password": "bar"
};

function logFile(action, ending, content) {
    var fname = conf.tmpFolder + "/" + action + "." + new Date().toISOString() + "." + Math.floor(Math.random() * 10000) +"."+ ending;
    fs.writeFile(fname, content);
    console.log("wrote " + fname);
}

var myService = {
    PortaladapterWebserviceService: {
        PortaladapterWebservice: {
            executeJob: function (args) {
                var actionName = "executeJob";
                fig(actionName);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));
                return {
                    "executeJobReturn": {
                        "$value": "1234567890"
                    }
                };
            },
            getJobStatus: function (args) {
                var actionName = "getJobStatus";
                fig(actionName);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));
                return {
                    "getJobStatusReturn": {
                        "enumJobStatus": {
                            "$value": "OK"
                        },
                        "geschaeftsbuchnummer": {
                            "$value": "4711-test-geschaeftsbuchnummer"
                        }
                    }
                };
            },
            getJobResult: function (args) {
                var actionName = "getJobResult";
                fig(actionName);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));
                return {
                    "getJobResultReturn": {
                        "$value": "4711-test.zip"
                    }
                };
            },
            getJobError: function (args) {
                var actionName = "getJobError";
                fig(actionName);
                logFile(actionName, "json", JSON.stringify(args, undefined, 2));
                return {
                    "getJobErrorReturn": {
                        "$value": "PseudoErrorMessage"
                    }
                };

            }

        }
    }
};
var serviceUrl = conf.prot + "://" + conf.host + ":" + conf.port + conf.route;
var rawxml = fs.readFileSync('service.wsdl', 'utf8');
var wsdlDefinition = rawxml.replace(/{{soap-facade-url}}/g, serviceUrl);


//http server example  
var server = http.createServer(function (request, response) {
    response.end("404: Not Found: " + request.url);
});


soap.listen(server, {
    path: conf.route,
    services: myService,
    xml: wsdlDefinition,
    // WSDL options.
    attributesKey: 'attttr',
    valueKey: "$value"
});

server.log = function (type, data) {
    // type is 'received' or 'replied'
    console.log('Log' + type);
};


//either as single node
//server.listen(8080);

// or as a clustered node
clustered_node.listen({port: conf.port, host: "0.0.0.0", workers: conf.workers}, server);


console.log('SOAP Server started on ' + serviceUrl);
