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
        console.log(data)
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

var myService = {
    PortaladapterWebserviceService: {
        PortaladapterWebservice: {
            executeJob: function (args) {
                fig('executeJob');
                //console.log(util.inspect(args, false, null,true));
                console.log(JSON.stringify(args, undefined, 2));
                return {
                    "executeJobReturn": {
                        "attributes": {
                            "xsi:type": "xsd:string"
                        },
                        "$value": "1234567890"
                    }
                };
            },
            getJobStatus: function (args) {
                fig('getJobStatus');
                console.log(JSON.stringify(args, undefined, 2));
                return {
                    "getJobStatusReturn": {
                        "attributes": {
                            "xsi:type": "com:JobStatusBean",
                            "xmlns:com": "http://common.portaladapter.vermunterlagenportal.aedsicad.de"
                        },
                        "enumJobStatus": {
                            "attributes": {
                                "xsi:type": "com:EnumJobStatus",
                            },
                            "$value": "OK"
                        },
                        "geschaeftsbuchnummer": {
                            "attributes": {
                                "xsi:type": "xsd:string",
                            },
                            "$value": "4711-test-geschaeftsbuchnummer"
                        }
                    }
                };
            },
            getJobResult: function (args) {
                fig('getJobResult');
                console.log(JSON.stringify(args, undefined, 2));
                return {
                    "getJobResultReturn": {
                        "attributes": {
                            "xsi:type": "xsd:string"
                        },
                        "$value": "4711-test.zip"
                    }
                };
            },
            getJobError: function (args) {
                fig('getJobError');
                console.log(JSON.stringify(args, undefined, 2));
                return {
                    "getJobErrorReturn": {
                        "$value": "PseudoErrorMessage",
                        "attributes": {
                            "xsi:type": "xsd:string"

                        },
                    }
                };

            }

        }
    }
};
var serviceUrl = conf.prot + "//" + conf.host + ":" + conf.port + conf.route;
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



// WSDL options.
//        attributesKey: 'theAttrs',
//        valueKey: 'theVal',
//        xmlKey: 'theXml'   

server.log = function (type, data) {
    // type is 'received' or 'replied'
    console.log('Log' + type);
};


//either as single node
//server.listen(8080);

// or as a clustered node
clustered_node.listen({port: conf.port, host: conf.host, workers: conf.workers}, server);


console.log('SOAP Server started');
