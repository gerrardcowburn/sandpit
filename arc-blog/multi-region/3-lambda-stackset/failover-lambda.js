/*jshint esversion: 8 */
const AWS = require('aws-sdk');

const REGION = process.env.AWS_REGION ? process.env.AWS_REGION : "us-east-1";

// Set up required parameters for Lambda operation based on environment variables
const lambdaParams = {};
lambdaParams.deploymentRegions = process.env.DeploymentRegions ? JSON.parse(process.env.DeploymentRegions) : null;
lambdaParams.auroraGlobalClusterId = process.env.AuroraGlobalClusterId ? process.env.AuroraGlobalClusterId : null;
lambdaParams.auroraClusterArns = process.env.AuroraClusterArns ? JSON.parse(process.env.AuroraClusterArns) : null;
lambdaParams.routingControlArns = process.env.RoutingControlArns ? JSON.parse(process.env.RoutingControlArns) : null;
lambdaParams.clusterEndpoints = process.env.ClusterEndpoints ? JSON.parse(process.env.ClusterEndpoints) : null;

// Catch errors in missing parameters for logging and exit
let paramErrors = [];
if (!lambdaParams.deploymentRegions) {
    paramErrors.push("DeploymentRegions");
}
if (!lambdaParams.auroraGlobalClusterId) {
    paramErrors.push("AuroraGlobalClusterId");
}
if (!lambdaParams.auroraClusterArns) {
    paramErrors.push("AuroraClusterArns");
}
if (!lambdaParams.routingControlArns) {
    paramErrors.push("RoutingControlArns");
}
if (!lambdaParams.clusterEndpoints) {
    paramErrors.push("ClusterEndpoints");
}

// Instantiate required AWS SDK Clients:
// RDS Client in the region local to this Lambda
const rdsclient = new AWS.RDS({ region: REGION }); 
// Route 53 Application Recovery Controller Data Plane client for all 5 dataplane endpoint regions
const r53rcd = {};
const instantiateClients = () => {
    for (let [key, value] of Object.entries(lambdaParams.clusterEndpoints)) {
        r53rcd[key] = new AWS.Route53RecoveryCluster({
            region: key,
            endpoint: value
        });
    }
};
instantiateClients();

// Lambda Event Handler
exports.handler = async (event, context) => {
    // Immediately return and log if missing parameters
    if (paramErrors.length !== 0) {
        console.error(`${paramErrors.join(", ")} parameters are missing, aborting`);
        return "PARAMETERS_MISSING";
    }
    try {
        console.log(`Global Cluster failover function triggered`);
        console.log(`AWS SDK Version: ${AWS.VERSION}`);
        console.log(`Context: ${JSON.stringify(context)}`);
        console.log(`Event: ${JSON.stringify(event)}`);
        
        // First, query the Aurora Global Cluster Status
        const globalClusterStatus = await queryGlobalClusterStatus();
        //console.log(`globalClusterStatus: ${JSON.stringify(globalClusterStatus)}`);

        // Exit if the Cluster is in a failing-over or error state
        if (globalClusterStatus.state === "failing-over") {
            console.log("Database cluster already failing over, taking no action");
            return "DATABASE_ALREADY_FAILING_OVER";
        } else if (globalClusterStatus.state === "error") {
            console.log("Database cluster status error, taking no action");
            return "DATABASE_STATUS_ERROR";
        }

        // Next, query the Route 53 Application Recovery Controller Routing Control States
        const routingControlStates = await queryRoutingControlStates();

        // Exit if the target database is unclear due to Routing Control configuration
        if (routingControlStates.numRegions !== 1) {
            console.log("Target database cluster unclear, taking no action");
            return "TARGET_DATABASE_UNCLEAR";
        } else {
            // Check whether the globalClusterStatus Writer node ARN aligns with the routingControlStates Target Region, initiate failover if not
            if (!globalClusterStatus[lambdaParams.auroraClusterArns[routingControlStates.targetRegion]]) {
                console.log("Database is not active in target region, initiating failover");
                const failoverRequestParams = {
                    GlobalClusterIdentifier: lambdaParams.auroraGlobalClusterId,
                    TargetDbClusterIdentifier: lambdaParams.auroraClusterArns[routingControlStates.targetRegion]
                };
                //console.log(`failoverRequestParams: ${JSON.stringify(failoverRequestParams)}`);
    
                try {
                    const failoverResponse = await rdsclient.failoverGlobalCluster(failoverRequestParams).promise();
                    console.log(`Failover Response: ${JSON.stringify(failoverResponse)}`);
                    return "REQUESTED_FAILOVER";
                } catch (error) {
                    console.error(error);
                    return "ERROR_REQUESTING_FAILOVER";
                }

            } else {
                console.log("Database is active in target region, taking no action");
                return "NO_ACTION_REQUIRED";
            }
        }

    } catch (error) {
        console.error('Handler error '+error);
    }
    
};

// Query Global Cluster Status:
const queryGlobalClusterStatus = async () => {
    const globalClusterStatus = {
        state: null
    };
    const describeRequestParams = {
        GlobalClusterIdentifier: lambdaParams.auroraGlobalClusterId
    };
    //console.log(`describeRequestParams: ${describeRequestParams}`);
    
    try {
        const describeResponse = await rdsclient.describeGlobalClusters(describeRequestParams).promise();
        //console.log(`DescribeResponse: ${JSON.stringify(describeResponse)}`);
        
        // Ensure only a single GlobalClusters entry is returned for the provided auroraGlobalClusterId
        if (describeResponse.GlobalClusters.length != 1) {
            console.error("Unexpected Global Cluster count");
            globalClusterStatus.state = "error";
        } else {
            // Track GlobalCluster Status and build array of members indicating which is the Writer
            globalClusterStatus.state = describeResponse.GlobalClusters[0].Status;
            //console.log(`GlobalClusterMembers: ${JSON.stringify(describeResponse.GlobalClusters[0].GlobalClusterMembers)}`);
            describeResponse.GlobalClusters[0].GlobalClusterMembers.forEach(member => {
                globalClusterStatus[member.DBClusterArn] = member.IsWriter;
            });
        }
    } catch (error) {
        console.error('Error querying global clusters status '+error);
        globalClusterStatus.state = "error";
    }

    //console.log(`globalClusterStatus: ${JSON.stringify(globalClusterStatus)}`);
    return globalClusterStatus;
};

// Query Routing Control States:
const queryRoutingControlStates = async () => {
    let routingControlStates = {
        numRegions: 0,
        targetRegion: null,
        state: null
    };

    // Iterate through a loop of Routing Control Regions / ARNs
    for (let [rcRegion, rcArn] of Object.entries(lambdaParams.routingControlArns)) {

        // In each case iterate through Endpoint Regions
        for (let [epRegion, epURL] of Object.entries(lambdaParams.clusterEndpoints)) {
            //console.log(`queryRoutingControlStates in region ${epRegion}`);
            const getRoutingControlStateParams = {
                RoutingControlArn: rcArn
            };
            //console.log(`getRoutingControlStateParams: ${rcRegion} : ${JSON.stringify(getRoutingControlStateParams)}`);
            try {
                const getRoutingControlStateResponse = await r53rcd[epRegion].getRoutingControlState(getRoutingControlStateParams).promise();
                //console.log(`getRoutingControlStateResponse: ${JSON.stringify(getRoutingControlStateResponse)}`);

                // If this Routing Control is On, set activeRegion to this region.  Also, increment numRegions for validation checks before failover
                if (getRoutingControlStateResponse.RoutingControlState === "On") {
                    routingControlStates.numRegions++;
                    routingControlStates.targetRegion = rcRegion;
                }
            } catch (error) {
                console.error('getRoutingControlStateResponse Error '+error);
                routingControlStates.state = "error";
            }

            // Break the loops if a successful response is received, otherwise continue through Endpoint Regions until a successful response is received
            if (routingControlStates.state !== "error") { break; }
        }
    }
    
    //console.log(`routingControlStates: ${JSON.stringify(routingControlStates)}`);
    return routingControlStates;
};
