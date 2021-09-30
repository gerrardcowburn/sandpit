process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Resolver } = require('dns').promises;
const http = require('http');
const https = require('https');
const url = require('url');


http.createServer(async (req, res) =>  {
    console.log("START");
    const queryString = url.parse(req.url, true).query;
    if (queryString.action == "query") {
	    const resolvers = queryString.resolvers ? queryString.resolvers : "10.0.0.2";
        const dns = queryString.dns ? queryString.dns : "google.com";
        const iter = queryString.iter ? queryString.iter : 10;
        const host = queryString.host ? queryString.host : "www.google.com";
        const path = queryString.path ? queryString.path+"/" : "";
        const protocol = queryString.protocol ? queryString.protocol : "http";
        const httpcheck = queryString.httpcheck ? queryString.httpcheck : "on";
        const refreshCount = queryString.refreshCount ? queryString.refreshCount : 0;

        const resolver = new Resolver();
        resolver.setServers([resolvers]);
	
        console.log("Performing query for "+ dns+", "+iter+" times");

        res.write('<html><title>Multi-DNS-Query Viewer</title>');
        refreshCount > 0 && res.write('<head><meta http-equiv="refresh" content="'+refreshCount+'"></head>');
        res.write('<body><h1>Multi-DNS-Query Viewer</h1>');
	    res.write('<h2>Resolver: '+resolvers+'</h2>');
        res.write('<h2>DNS Lookup: '+dns+'</h2>');
        res.write('<h2>Iterations: '+iter+'</h2>');
        res.write('<h2>HTTP Host: '+host+'</h2>');
        res.write('<h2>Path: '+path+'</h2>');
        res.write('<h2>HTTP Check: '+httpcheck+'</h2>');
        refreshCount > 0 && res.write('<div>This page will reload in <span id="cnt" style="color:red;">'+refreshCount+'</span> Seconds</div>');
        
        let dnsQueryFunctions = [];
        const dnsQueryOptions = {
            ttl: false
        };

        for (let i = 0; i < iter; i++) {
            //console.log(`Iteration: ${i}`);
            const thisDnsQueryFunction = resolver.resolve4(dns, dnsQueryOptions);
            //console.log('newResult is %s',newResult[0]);
            dnsQueryFunctions.push(thisDnsQueryFunction);
        }
        const dnsQueryArray = await Promise.all(dnsQueryFunctions);
        console.log('dnsQueryArray');
        console.log(dnsQueryArray);

        let httpResponseFunctions = [];
        for (let i = 0; i < dnsQueryArray.length; i++) {
            //console.log(`dnsQueryArray ${i}`);
            //console.log(dnsQueryArray[i][0]);
            //FIX THIS TO DO SOMETHING ABOUT MULTIPLE DNS QUERY RESPONSES?
            const url = protocol+'://'+dnsQueryArray[i][0]+'/'+path;
            const options = {
                method: 'GET',
                host: dns
            }
                if (protocol == "http") {
                        thisHttpResponseFunction = httpGet(url, options);
                } else if (protocol == "https") {
                        thisHttpResponseFunction = httpsGet(url, options);
                } else {
                        console.error("no protocol handler for ", protocol);
                }
            //const thisHttpResponseFunction = httpsGet(url, options);
            httpResponseFunctions.push(thisHttpResponseFunction);
        }
        const httpResponseArray = await Promise.all(httpResponseFunctions);
        console.log('httpResponseArray');
        console.log(httpResponseArray);

        const httpResponseBodyCounts = {};
        httpResponseArray.forEach((el) => {
                httpResponseBodyCounts[el.body] = httpResponseBodyCounts[el.body] ? (httpResponseBodyCounts[el.body] += 1) : 1;
        });
        console.log('httpResponseBodyCounts');
        console.log(httpResponseBodyCounts);
//CONSIDER WHETHER THESE ARRAYS WILL ALWAYS BE ORDERED THE SAME?
        if ((httpResponseArray.length != dnsQueryArray.length) && httpcheck == TRUE) {
            console.error("something went wrong");
            res.write('<h2>Error, please check console.</h2>');
            res.write('</body></html>');
            res.end();
        } else {

            if (httpcheck == "on") {
                res.write('<h2>HTTP Response Summary</h2>')
                res.write('<table><tr><th>HTTP Response Body</th><th>Count</th>');
                for (let [key, value] of Object.entries(httpResponseBodyCounts)) {
                    res.write('<tr><td>'+key+'</td><td>'+value+'</td></tr>');
                }
                res.write('</table>');
            }


            //MAKE THIS SECTION HTTPCHECK AWARE
            res.write('<h2>Response Detail</h2>');
            res.write('<table><tr><th>Iteration</th><th>Target IP</th><th>StatusCode</th><th>Body</th>');
            for (let i = 0; i < dnsQueryArray.length; i++) {
                //console.log(`ResultProcessingLoop Iteration ${i}`);

                const statusCode = httpResponseArray[i].statusCode ? httpResponseArray[i].statusCode : "fail";
                const backgroundColour = statusCode == 200 ? "#80C904" : "#FF0000";
                const body = statusCode == 200 ? httpResponseArray[i].body.split(" ")[0] : "Fail";

                res.write('<tr style="background-color:'+backgroundColour+'"><td>'+i+'</td><td>');
                if (Array.isArray(dnsQueryArray[i])) {
                    for (let ii = 0; ii < dnsQueryArray[i].length; ii++) {
                        res.write(dnsQueryArray[i][ii]+'<br />');
                    }
                } else {
                    res.write(dnsQueryArray[i]+'<br />');
                }
                //FIX THIS TO HANDLE MULTIPLE HTTP RESPONSE BODIES
                res.write('</td><td>'+statusCode+'</td><td>'+body+'</td></tr>');
            }
            res.write('</table><br /><table>');

            res.write('</body></html>');
            res.end();
        }

    } else {
        console.log("Dunno what to do with this");
    }
}).listen(8080);

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
                })
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
                })
                resolve(response);
            }
        })
    })
}

function httpsGet(url, options) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (resp,error) => {
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
                })
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
                })
                resolve(response);
            }
        })
    })
}
