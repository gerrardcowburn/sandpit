/*jshint multistr: true */
/*jshint esversion: 8 */

const { Resolver } = require('dns').promises;
const AWS = require('aws-sdk');

const lambdaParams = {};
let paramErrors = [];
lambdaParams.deploymentRegions = process.env.DeploymentRegions ? JSON.parse(process.env.DeploymentRegions) : null;
lambdaParams.vpcIds = process.env.VpcIds ? JSON.parse(process.env.VpcIds) : null;
lambdaParams.resolvers = process.env.Resolvers || "10.0.0.2";
lambdaParams.dns = process.env.Dns || "app.arcblog.aws";
lambdaParams.maxRows = process.env.MaxRows || 30;
lambdaParams.checkInterval = process.env.CheckInterval || 5;

if (!lambdaParams.deploymentRegions) {
    paramErrors.push("DeploymentRegions");
}
if (!lambdaParams.vpcIds) {
    paramErrors.push("VpcIds");
}

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
    console.log(event);
    console.log(`HTTP Path: ${event.path}`);

    let response = {
        "statusCode": null,
        "statusDescription": null,
        "body": null,
        "isBase64Encoded": false,
        "headers": {
            "content-type": "text/html; charset=utf-8"
        }
    };

    if (paramErrors.length > 0) {
        console.error(`${paramErrors.join(", ")} parameters are missing, aborting`);
        response = constructBlankResponse(response);
        console.log(`response: ${JSON.stringify(response)}`);
        return response;
    }

    switch (event.path) {
        case '/':
            console.log("constructDynamicResponse");
            response = await constructDynamicResponse(response, event);
            break;
            case '/api':
            case '/api/':
            console.log("constructApiResponse");
            response = await constructEniBasedApiResponse(response, event);
            break;
        default: 
            console.log("default");
            response = constructBlankResponse(response);
    }

    console.log(`response: ${JSON.stringify(response)}`);
    return response;
};

const htmlStyle = `<style>
        body {
            font-family: Arial, sans-serif;
        }
        h1,h2 {
            text-align: center;
        }
        td {
            text-align: center;
        }
        .center {
            margin-left: auto;
            margin-right: auto;
            width: 100%;
        }
        div.fixed {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 275px;
            border: 3px solid #FF9900;
        }
    </style>`;

const responseScript = `<script>
            const table = document.querySelector('#response-table');
            const tbody = table.querySelector('tbody');
            const insertRow = (response) => {
                const row = tbody.insertRow(0);
                row.innerHTML = \`<td class="p-2">\${response.responseTime}</td>\`;
                response.responseBody === "${lambdaParams.deploymentRegions[0]+'a'}" ? row.innerHTML += \`<td class="p-2">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";
                response.responseBody === "${lambdaParams.deploymentRegions[0]+'b'}" ? row.innerHTML += \`<td class="p-2">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";
                response.responseBody === "${lambdaParams.deploymentRegions[0]+'c'}" ? row.innerHTML += \`<td class="p-2">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";
                response.responseBody === "Maintenance" ? row.innerHTML += \`<td class="p-2">\${response.responseBody}</td>\` : row.innerHTML += "<td></td>";
            };
            const removeRow = () => {
                if (table.rows.length > ${lambdaParams.maxRows}) {
                    table.deleteRow(${lambdaParams.maxRows});
                }
            };
            const getUpdate = () => {
                fetch('/api/')
                .then(response => response.json())
                .then(json => {
                    const responseTime = json?.responseTime;
                    const responseBody = json?.responseBody;
                    const statusCode = json?.statusCode;
                    const date = new Date;
                    const time = date.toTimeString().split(\" \")[0];
                    insertRow({
                        date: time,
                        responseBody: responseBody,
                        responseTime: responseTime,
                        statusCode: statusCode
                    });
                    removeRow();
                })
            };
            getUpdate();
            setInterval(() => {
                getUpdate();
            }, ${lambdaParams.checkInterval * 1000});
        </script>`;

const constructBlankResponse = (response) => {
    response.body = "";
    response.statusCode = 500;
    response.statusDescription = "500 Internal Server Error";

    return response;
};

const constructDynamicResponse = async (response) => {
    const responsebody = `
<html>
    <title>Dashboard Lambda</title>
    ${htmlStyle}
    <body>
        <h1>Dashboard Lambda</h1>
        <h2>Response Summary for ${lambdaParams.dns}</h2>
        <table id="response-table" class="center">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>${lambdaParams.deploymentRegions[0]+'a'}</th>
                    <th>${lambdaParams.deploymentRegions[0]+'b'}</th>
                    <th>${lambdaParams.deploymentRegions[0]+'c'}</th>
                    <th>Maintenance</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
        ${responseScript}
    </body>
</html>`;
    
    response.statusCode = 200;
    response.statusDescription = "200 OK";
    response.body = responsebody;

    return response;
};

const constructEniBasedApiResponse = async (response) => {
    console.log("Performing query for "+lambdaParams.dns);

    const dnsQueryResponse = await buildDnsQueryResponse(lambdaParams.dns);

    const eniAZMapping = await buildEniAZMapping();

    const responseDate = new Date;
    const responseTime = responseDate.toTimeString().split(" ")[0];
    console.log(`responseTime: ${responseTime}`);

    response.body = `{ "responseBody": "${eniAZMapping[dnsQueryResponse[0]] || "Maintenance" }", "responseTime": "${responseTime}" }`;
    response.statusCode = 200;
    response.statusDescription = "200 OK";

    return response;
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
                if (lambdaParams.vpcIds.includes(interface.VpcId) && interface.InterfaceType === "network_load_balancer") {
                    ipArray[interface.PrivateIpAddress] = interface.AvailabilityZone;
                }
            });
        } catch (error) {
            console.error('ENI AZ Mapping failed '+error);
        }
    }
    console.log(`ipArray: ${JSON.stringify(ipArray)}`);
    return ipArray;
};

