/*jshint multistr: true */
/*jshint esversion: 8 */

const { Resolver } = require('dns').promises;
const AWS = require('aws-sdk');

const lambdaParams = {};
let paramErrors = "";
process.env.DeploymentRegions !== null ? (lambdaParams.deploymentRegions = JSON.parse(process.env.DeploymentRegions)) : paramErrors += "DeploymentRegions"; //"[\"us-east-1\", \"us-west-2\" ]";
process.env.VpcIds ? (lambdaParams.vpcIds = JSON.parse(process.env.VpcIds)) : paramErrors += ", VpcIds"; //"[ \"vpc-09099ef3b09cacc8a\", \"vpc-03359daf3e2329e9f\" ]";
process.env.Resolvers ? (lambdaParams.resolvers = process.env.Resolvers) : "10.0.0.2";
process.env.Dns ? (lambdaParams.dns = process.env.Dns) : "app.arcblog.aws";
process.env.MaxRows ? (lambdaParams.maxRows = process.env.MaxRows) : 30;
process.env.CheckInterval ? (lambdaParams.checkInterval = process.env.CheckInterval) : 5;

const ec2client = {};
const instantiateClients = () => {
    lambdaParams.deploymentRegions.forEach(deploymentRegion => {
        ec2client[deploymentRegion] = new AWS.EC2({ region: deploymentRegion });
    });
};
instantiateClients();

const resolver = new Resolver();
resolver.setServers([lambdaParams.resolvers]);

exports.handler = async (event) => {
    if (paramErrors !== "") {
        console.error(paramErrors+" parameters are missing, aborting");
        return "PARAMETERS_MISSING";
    }
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
            console.log("constructDynamicResponse");
            response = await constructDynamicResponse(response, event);
            break;
        case '/api/':
            console.log("constructApiResponse");
            response = await constructEniBasedApiResponse(response, event);
            break;
        default: 
            console.log("default");
            response = constructBlankResponse(response);
    }

    console.log("response");
    console.log(response);
    return response;
};

const constructBlankResponse = (response) => {
    response.body = "";
    response.statusCode = 500;
    response.statusDescription = "500 Internal Server Error";

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

const buildDnsQueryResponse = async (dns) => {
    console.log(`triggered buildDnsQueryArray, ${dns}`);
    const dnsQueryOptions = {
        ttl: false
    };
    
    let dnsQueryResponse = [];
    try {
        dnsQueryResponse = await resolver.resolve4(dns, dnsQueryOptions);
        console.log('DNS resolution succeeded');
    } catch (error) {
        console.error('DNS resolution failed '+error);
    }
    
    console.log(`dnsQueryResponse: ${JSON.stringify(dnsQueryResponse)}`);
    return dnsQueryResponse;
};

const buildEniAZMapping = async () => {
    const ipArray = {};
    const describeNetworkInterfacesParams = {
    };    
    
    for (let i = 0; i < lambdaParams.deploymentRegions.length; i++) {
        try {
            const describeNetworkInterfacesResponse = await ec2client[lambdaParams.deploymentRegions[i]].describeNetworkInterfaces(describeNetworkInterfacesParams).promise();
            describeNetworkInterfacesResponse.NetworkInterfaces.forEach(interface => {
                (lambdaParams.vpcIds.includes(interface.VpcId)) && (interface.InterfaceType == "network_load_balancer") && (ipArray[interface.PrivateIpAddress] = interface.AvailabilityZone);
            });
        } catch (error) {
            console.error('ENI AZ Mapping failed '+error);
        }
    }
    console.log(`ipArray: ${JSON.stringify(ipArray)}`);
    return ipArray;
};

const constructEniBasedApiResponse = async (response) => {
    console.log("Performing query for "+lambdaParams.dns);

    const dnsQueryResponse = await buildDnsQueryResponse(lambdaParams.dns);

    const eniAZMapping = await buildEniAZMapping();

    (eniAZMapping[dnsQueryResponse[0]] == null) ? (response.body = `{ "responseBody": "Maintenance" }`) : (response.body = `{ "responseBody": "${eniAZMapping[dnsQueryResponse[0]]}" }`);
    response.statusCode = 200;
    response.statusDescription = "200 OK";

    return response;
};

const constructDynamicResponse = async (response) => {
    let responsebody = '';
    responsebody += '<html><title>Dashboard Lambda</title>';
    responsebody += constructStyle();
    responsebody += '<body><h1>Dashboard Lambda</h1>';
    responsebody += '<h2>Response Summary for '+lambdaParams.dns+'</h2>';
    responsebody += `<table id="response-table" class="center"><thead><tr><th>Timestamp</th><th>${lambdaParams.deploymentRegions[0]+'a'}</th><th>${lambdaParams.deploymentRegions[0]+'b'}</th><th>${lambdaParams.deploymentRegions[0]+'c'}</th><th>${lambdaParams.deploymentRegions[1]+'a'}</th><th>${lambdaParams.deploymentRegions[1]+'b'}</th><th>${lambdaParams.deploymentRegions[1]+'c'}</th><th>Maintenance</th></thead><tbody>`;
    responsebody += '</tbody></table>';
    responsebody += constructResponseDynamicScript();
    responsebody += '</body></html>';
    
    response.statusCode = 200;
    response.statusDescription = "200 OK";
    response.body = responsebody;

    return response;
};

const constructResponseDynamicScript = () => {
    let responseScript = '<script>';
    responseScript += "const table = document.querySelector('#response-table');";
    responseScript += "const tbody = table.querySelector('tbody');";
    responseScript += "const insertRow = (response) => {";
    responseScript += "    const row = tbody.insertRow(0);";
    responseScript += "    row.innerHTML = `<td class=\"p-2\">${response.date}</td>`;";
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[0]+'a'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[0]+'b'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[0]+'c'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[1]+'a'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[1]+'b'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "${lambdaParams.deploymentRegions[1]+'c'}" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += `    response.responseBody == "Maintenance" ? row.innerHTML += \`<td class=\"p\-2\">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";`;
    responseScript += "};";
    responseScript += "const removeRow = () => {";
    responseScript += `    if (table.rows.length > ${lambdaParams.maxRows}) {`;
    responseScript += `        table.deleteRow(${lambdaParams.maxRows});`;
    responseScript += "    }";
    responseScript += "};";
    responseScript += "const getUpdate = () => {";
    responseScript += `    fetch('/api/')`;
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
    responseScript += `    }, ${lambdaParams.checkInterval * 1000});`;
    responseScript += "</script>";

    return responseScript;
};
