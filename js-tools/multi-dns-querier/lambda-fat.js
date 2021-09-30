//MERGE GOOD BITS FROM THIS INTO SLIM

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Resolver } = require('dns').promises;
const resolver = new Resolver();
const AWS = require('aws-sdk');
const http = require('http');

const lambdaParams = {
    DeploymentRegions: [
        "us-west-2",
        "eu-west-1"
    ],
    VpcIds: [
        "vpc-09099ef3b09cacc8a",
        "vpc-03359daf3e2329e9f"
    ]
};


const ec2client = {};
const instantiateClients = () => {
    lambdaParams.DeploymentRegions.forEach(deploymentRegion => {
        ec2client[deploymentRegion] = new AWS.EC2({ region: deploymentRegion });
    });
};
instantiateClients();


exports.handler = async (event) => {
    console.log(event);
    let response = {
        "statusCode": null,
        "statusDescription": null,
        "body": null,
        "isBase64Encoded": false,
        "headers": {
            "content-type": "text/html; charset=utf-8"
        }
    };

    console.log(event.path);
    switch (event.path) {
        case '/':
            console.log("constructHttpResponse");
            response = await constructHttpResponse(response, event);
            break;
        case '/dyn/':
            console.log("constructHttpResponse");
            response = await constructDynamicResponse(response, event);
            break;
        case '/api/':
            console.log("constructApiResponse");
            response = await constructEniBasedApiResponse(response, event);
            break;
        case '/api-h/':
                console.log("constructApiResponse");
                response = await constructHttpBasedApiResponse(response, event);
                break;
        case '/sh/': 
            console.log("constructOutOfService");
            response = constructOutOfService(response);
            break;
        default: 
            console.log("default");
            response = constructBlankResponse(response);
    }

    console.log("response");
    console.log(response);
    return response;
};

/*
http.createServer(async (req, res) =>  {
    console.log("START");
    const queryString = url.parse(req.url, true).query;
    if (queryString.action == "query") {
        const event = {};
        event.queryStringParameters = queryString;
        const response = await constructHttpResponse(event);
        console.log("responsebody");
        console.log(response.body)
        res.write(response.body);
    } else {
        console.log("Dunno what to do with this");
    }
}).listen(8080);
*/

const constructBlankResponse = (response) => {
    response.body = "";
    response.statusCode = 500;
    response.statusDescription = "500 Internal Server Error";

    return response;
};

const constructOutOfService = (response) => {
    response.body = "OutOfService";
    response.statusCode = 404;
    response.statusDescription = "404 Page Not Found";

    return response;
};

const constructHttpResponse = async (response,event) => {
    let responsebody = '';
    const queryString = event.queryStringParameters;

    const resolvers = queryString.resolvers ? queryString.resolvers : "10.0.0.2";
    const dns = queryString.dns ? queryString.dns : "app.blog.com";
    const iter = queryString.iter ? queryString.iter : 10;
    const host = queryString.host ? queryString.host : "app.blog.com";
    const path = queryString.path ? queryString.path+"/" : "sh/";
    const protocol = queryString.protocol ? queryString.protocol : "http";
    const httpcheck = queryString.httpcheck ? queryString.httpcheck : "on";
    const refreshCount = queryString.refreshCount ? queryString.refreshCount : 5;
    const hideMetadata = true;
    const hideResponseDetail = true;

    console.log("Performing query for "+dns+", "+iter+" times");

    responsebody += '<html><title>Multi-DNS-Query Lambda</title>';
    refreshCount > 0 && (responsebody += '<head><meta http-equiv="refresh" content="'+refreshCount+'"></head>');
    responsebody += constructStyle();
    responsebody += '<body><h1>Multi-DNS-Query Lambda</h1>';
    refreshCount > 0 && (responsebody += '<div class="fixed">This page will reload in '+refreshCount+' Seconds</div>');

    responsebody += constructResponseMetadata(hideMetadata, resolvers, dns, iter, host, path, httpcheck);

    resolver.setServers([resolvers]);
    const dnsQueryArray = await buildDnsQueryArray(dns,iter);

    const httpResponseDetails = await buildHttpResponseDetails(protocol,host,path,dnsQueryArray);

    //CONSIDER WHETHER THESE ARRAYS WILL ALWAYS BE ORDERED THE SAME?
    if ((httpResponseDetails.httpResponseArray.length != dnsQueryArray.length) && httpcheck == "on") {
        response.statusCode = 500;
        response.statusDescription = "500 ERROR";
        console.error("something went wrong");
        responsebody += '<h2>Error, please check console.</h2>';
        responsebody += '</body></html>';
    } else {

        if (httpcheck == "on") {
            responsebody += '<h2>Response Summary for '+dns+'</h2>';
            responsebody += '<table class="center"><tr><th>Availability Zone</th><th>Ratio</th><th>Status Code</th>';
            for (let [key, value] of Object.entries(httpResponseDetails.httpResponseBodyCounts)) {
                const backgroundColour = httpResponseDetails.httpResponseStatusCodes[key] == 200 ? "#80C904" : "#FF0000";
                const ratio = value / iter * 100; 
                responsebody += '<tr style="background-color:'+backgroundColour+'"><td>'+key+'</td><td>'+ratio+'%</td><td>'+httpResponseDetails.httpResponseStatusCodes[key]+'</td></tr>';
            }
            responsebody += '</table>';
        }

        responsebody += constructResponseDetail(hideResponseDetail, dnsQueryArray, httpResponseDetails);

        responsebody += '</body></html>';
    
        response.statusCode = 200;
        response.statusDescription = "200 OK";
    }

    response.body = responsebody;

    return response;
};

const constructStyle = () => {
    let style = "<style> \
    body { \
        font-family: Arial, sans-serif; \
    } \
    h1,h2 { \
        text-align: center; \
    } \
    td { \
        text-align: center; \
    } \
    .center { \
        margin-left: auto; \
        margin-right: auto; \
        width: 100%; \
    } \
    div.fixed { \
        position: fixed; \
        bottom: 0; \
        right: 0; \
        width: 275px; \
        border: 3px solid #FF9900; \
    } \
    </style>";

    return style;
};

const constructResponseMetadata = (hideMetadata, resolvers, dns, iter, host, path, httpcheck) => {
    let metadata = '';
    hideMetadata == true && (metadata = '<!--');
    metadata += '<h2>Resolver: '+resolvers+'</h2>';
    metadata += '<h2>DNS Lookup: '+dns+'</h2>';
    metadata += '<h2>Iterations: '+iter+'</h2>';
    metadata += '<h2>HTTP Host: '+host+'</h2>';
    metadata += '<h2>Path: '+path+'</h2>';
    metadata += '<h2>HTTP Check: '+httpcheck+'</h2>';
    hideMetadata == true && (metadata += '-->');

    return metadata;
};

const constructResponseDetail = (hideResponseDetail, dnsQueryArray, httpResponseDetails) => {
    let responsedetail = '';
    hideResponseDetail == true && (responsedetail += '<!--');

    //MAKE THIS SECTION HTTPCHECK AWARE
    responsedetail += '<h2>Response Detail</h2>';
    responsedetail += '<table class="center"><tr><th>Iteration</th><th>Target IP</th><th>StatusCode</th><th>Body</th>';
    for (let i = 0; i < dnsQueryArray.length; i++) {
        //console.log(`ResultProcessingLoop Iteration ${i}`);

        const statusCode = httpResponseDetails.httpResponseArray[i].statusCode ? httpResponseDetails.httpResponseArray[i].statusCode : "fail";
        const backgroundColour = statusCode == 200 ? "#80C904" : "#FF0000";
        const body = httpResponseDetails.httpResponseArray[i].body != "" ? httpResponseDetails.httpResponseArray[i].body : "Fail";

        responsedetail += '<tr style="background-color:'+backgroundColour+'"><td>'+i+'</td><td>';
        if (Array.isArray(dnsQueryArray[i])) {
            for (let ii = 0; ii < dnsQueryArray[i].length; ii++) {
                responsedetail += dnsQueryArray[i][ii]+'<br />';
            }
        } else {
            responsedetail += dnsQueryArray[i]+'<br />';
        }
        //FIX THIS TO HANDLE MULTIPLE HTTP RESPONSE BODIES
        responsedetail += '</td><td>'+statusCode+'</td><td>'+body+'</td></tr>';
    }
    responsedetail += '</table><br /><table>';

    hideResponseDetail == true && (responsedetail += '-->');
    return responsedetail;
};

const buildDnsQueryArray = async (dns, iter) => {
    console.log(`triggered buildDnsQueryArray, ${dns}, ${iter}`);
    let dnsQueryFunctions = [];
    const dnsQueryOptions = {
        ttl: false
    };
    
    for (let i = 0; i < iter; i++) {
        const thisDnsQueryFunction = resolver.resolve4(dns, dnsQueryOptions);
        dnsQueryFunctions.push(thisDnsQueryFunction);
    }
    let dnsQueryArray = [];    
    try {
        dnsQueryArray = await Promise.all(dnsQueryFunctions);
        console.log('DNS resolution succeeded');
    } catch (error) {
        console.error('DNS resolution failed'+error);
    }
    
    console.log(`dnsQueryArray: ${JSON.stringify(dnsQueryArray)}`);
    return dnsQueryArray;
};

const buildEniAZMapping = async () => {
    const IpArray = {};
    
    for (let i = 0; i < lambdaParams.DeploymentRegions.length; i++) {
        const describeNetworkInterfacesParams = {
        };
        const describeNetworkInterfacesResponse = await ec2client[lambdaParams.DeploymentRegions[i]].describeNetworkInterfaces(describeNetworkInterfacesParams).promise();
        //console.log(describeNetworkInterfacesResponse);
        
        describeNetworkInterfacesResponse.NetworkInterfaces.forEach(interface => {
            (lambdaParams.VpcIds.includes(interface.VpcId)) && (IpArray[interface.PrivateIpAddress] = interface.AvailabilityZone);
        });
    }
    console.log(`IpArray: ${JSON.stringify(IpArray)}`);
    return IpArray;
};

const buildHttpResponseDetails = async (host,path,dnsQueryArray) => {
    console.log("triggered buildHttpResponseDetails");
    const httpResponseFunctions = [];
    for (let i = 0; i < dnsQueryArray.length; i++) {
        //FIX THIS TO DO SOMETHING ABOUT MULTIPLE DNS QUERY RESPONSES?
        const url = 'http://'+dnsQueryArray[i][0]+'/'+path;
        const options = {
            method: 'GET',
            host: host
        };
        const thisHttpResponseFunction = httpGet(url, options);

        httpResponseFunctions.push(thisHttpResponseFunction);
    }
    const httpResponseArray = await Promise.all(httpResponseFunctions);
    console.log('httpResponseArray');
    console.log(httpResponseArray);

    const httpResponseBodyCounts = [];
    const httpResponseStatusCodes = [];
    httpResponseArray.forEach((el) => {
        el.body = el.body.split(" ")[0];
        httpResponseBodyCounts[el.body] = httpResponseBodyCounts[el.body] ? (httpResponseBodyCounts[el.body] += 1) : 1;
        httpResponseStatusCodes[el.body] = el.statusCode;
    });

    const httpResponseDetails = {
        httpResponseArray: httpResponseArray,
        httpResponseBodyCounts: httpResponseBodyCounts,
        httpResponseStatusCodes: httpResponseStatusCodes
    };

    console.log('httpResponseDetails');
    console.log(httpResponseDetails);

    return httpResponseDetails;
};

function httpGet(url, options) {
    return new Promise((resolve, reject) => {
        http.get(url, options, (resp,error) => {
            let response = {
                statusCode: resp.statusCode,
                body: []
            };

            if (error) {
                console.error(error);
                return reject(error);
            } else {
                resp.on('data', (chunk) => {
                    response.body.push(chunk);
                });
                resp.on('end', () => {
                    if (response.body.length) {
                        response.body = response.body.join();

                        try {
                            response.body = JSON.parse(response.body);
                        } catch (e) {
                            reject(e);
                        }
                        //console.log(response.body);
                    }
                    resolve(response);
                });
                resolve(response);
            }
        });
    });
}

const constructEniBasedApiResponse = async (response,event) => {
    const queryString = event.queryStringParameters;

    const resolvers = queryString.resolvers ? queryString.resolvers : "10.0.0.2";
    const dns = queryString.dns ? queryString.dns : "app.blog.com";
    const iter = queryString.iter ? queryString.iter : 1;
    const host = queryString.host ? queryString.host : "app.blog.com";
    const path = queryString.path ? queryString.path+"/" : "sh/";

    console.log("Performing query for "+dns+", "+iter+" times");

    resolver.setServers([resolvers]);
    //EDIT THIS FUNCTION TO CHANGE IT FROM AN ARRAY TO A STRING FOR NLB USE CASE
    const dnsQueryArray = await buildDnsQueryArray(dns,iter);

    const eniAZMapping = await buildEniAZMapping();

    for (let i = 0; i < dnsQueryArray.length; i++) {
        response.body = `{ "responseBody": "${eniAZMapping[dnsQueryArray[i][0]]}", "statusCode": "600" }`;
    }

    response.statusCode = 200;
    response.statusDescription = "200 OK";

    return response;
};

const constructHttpBasedApiResponse = async (response,event) => {
    const queryString = event.queryStringParameters;

    const resolvers = queryString.resolvers ? queryString.resolvers : "10.0.0.2";
    const dns = queryString.dns ? queryString.dns : "app.blog.com";
    const iter = queryString.iter ? queryString.iter : 1;
    const host = queryString.host ? queryString.host : "app.blog.com";
    const path = queryString.path ? queryString.path+"/" : "sh/";

    console.log("Performing query for "+dns+", "+iter+" times");

    resolver.setServers([resolvers]);
    const dnsQueryArray = await buildDnsQueryArray(dns,iter);

    const httpResponseDetails = await buildHttpResponseDetails(host,path,dnsQueryArray);

//        console.error("something went wrong");
//        response.statusCode = 500;
//        response.statusDescription = "500 ERROR";
//        response.body = '{ "statusCode": 500 }';
// THIS LOOP ONLY WORKS FOR 1 ITER DUE TO = not +=
    for (let [key, value] of Object.entries(httpResponseDetails.httpResponseBodyCounts)) {
        response.body = `{ "responseBody": "${key}", "statusCode": ${httpResponseDetails.httpResponseStatusCodes[key]} }`;
    };

    response.statusCode = 200;
    response.statusDescription = "200 OK";

    return response;
};

const constructDynamicResponse = async (response,event) => {
    let responsebody = '';
    const queryString = event.queryStringParameters;
    const dns = queryString.dns ? queryString.dns : "app.arcblog.com";
    const maxRows = queryString.maxRows ? queryString.maxRows : 30;
    const checkInterval = queryString.checkInterval ? queryString.checkInterval : 5;
    const apiver = queryString.apiver ? queryString.apiver : "api";

    const resolvers = queryString.resolvers ? queryString.resolvers : "10.0.0.2";
    const iter = queryString.iter ? queryString.iter : 10;
    const host = queryString.host ? queryString.host : "app.blog.com";
    const path = queryString.path ? queryString.path+"/" : "sh/";
    const protocol = queryString.protocol ? queryString.protocol : "http";
    const httpcheck = queryString.httpcheck ? queryString.httpcheck : "on";
    const refreshCount = queryString.refreshCount ? queryString.refreshCount : 5;


    responsebody += '<html><title>Multi-DNS-Query Lambda</title>';
    responsebody += constructStyle();
    responsebody += '<body><h1>Multi-DNS-Query Lambda</h1>';

    responsebody += '<h2>Response Summary for '+dns+'</h2>';
    responsebody += `<table id="response-table" class="center"><thead><tr><th>Timestamp</th><th>Status Code</th><th>${lambdaParams.DeploymentRegions[0]+'a'}</th><th>${lambdaParams.DeploymentRegions[0]+'b'}</th><th>${lambdaParams.DeploymentRegions[0]+'c'}</th><th>${lambdaParams.DeploymentRegions[1]+'a'}</th><th>${lambdaParams.DeploymentRegions[1]+'b'}</th><th>${lambdaParams.DeploymentRegions[1]+'c'}</th><th>OutOfService</th></thead><tbody>`;
    responsebody += '</tbody></table>';
    responsebody += constructResponseDynamicScript(apiver, dns, maxRows, checkInterval);
    responsebody += '</body></html>';
    
    response.statusCode = 200;
    response.statusDescription = "200 OK";
    response.body = responsebody;

    return response;
};

const constructResponseDynamicScript = (apiver,dns,maxRows,checkInterval) => {
    let responseScript = '<script>';
    responseScript += "const table = document.querySelector('#response-table');";
    responseScript += "const tbody = table.querySelector('tbody');";
    responseScript += "const insertRow = (response) => {";
    responseScript += "    const row = tbody.insertRow(0);";
    responseScript += "    row.innerHTML = `<td class=\"p-2\">${response.date}</td>`;";
    responseScript += "    row.innerHTML += `<td class=\"p-2\">${response.statusCode}</td>`;";
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[0]+'a'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[0]+'b'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[0]+'c'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[1]+'a'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[1]+'b'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.DeploymentRegions[1]+'c'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "OutOfService" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += "};";
    responseScript += "const removeRow = () => {";
    responseScript += `    if (table.rows.length > ${maxRows}) {`;
    responseScript += `        table.deleteRow(${maxRows});`;
    responseScript += "    }";
    responseScript += "};";
    responseScript += "const getUpdate = () => {";
    responseScript += `    fetch('/${apiver}/?dns=${dns}')`;
    responseScript += "    .then(response => response.json())";
    responseScript += "    .then(json => {";
    responseScript += "        const responseBody = json?.responseBody;";
    responseScript += "        const statusCode = json?.statusCode;";
    responseScript += "        const date = new Date;";
    responseScript += "        const time = date.toTimeString().split(\" \")[0];";
    responseScript += "        insertRow({";
    responseScript += "            date: time,";
    responseScript += "            responseBody: responseBody,";
    responseScript += "            statusCode: statusCode";
    responseScript += "        });";
    responseScript += "        removeRow();";
    responseScript += "    })";
    responseScript += "};";
    responseScript += "getUpdate();";
    responseScript += "setInterval(() => {";
    responseScript += "    getUpdate();";
    responseScript += `    }, ${checkInterval * 1000});`;
    responseScript += "</script>";

    return responseScript;
};


