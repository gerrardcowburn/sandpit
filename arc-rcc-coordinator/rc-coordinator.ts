/*jshint esversion: 8 */

// Require dependencies
import { Route53RecoveryClusterClient, GetRoutingControlStateCommand, GetRoutingControlStateCommandInput, GetRoutingControlStateCommandOutput, UpdateRoutingControlStateCommand, UpdateRoutingControlStateCommandInput, UpdateRoutingControlStateCommandOutput } from "@aws-sdk/client-route53-recovery-cluster";
import { clusterEndpoints } from "./cluster-endpoints";
import { RoutingControlMap, routingControlMap, applicationMode } from "./routing-controls";

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

// Instantiate required AWS SDK Clients:
// Route 53 Application Recovery Controller Data Plane client for all 5 dataplane endpoint regions
const r53rcc = {};
let instantiatedClients = 0;
function instantiateClients() {
    for (let [key, value] of Object.entries(clusterEndpoints)) {
        r53rcc[key] = new Route53RecoveryClusterClient({
            region: key,
            endpoint: value
            // logger: console
        });
        instantiatedClients++;
    }
};
instantiateClients();

// Get Routing Control States:
async function getRoutingControlStates(routingControlMap: RoutingControlMap) {
    // Iterate through a loop of Routing Controls and Details
    for (let [rcSystem, rcDetails] of Object.entries(routingControlMap)) {
        
        // Iterate through Endpoint array
        for (let [epRegion, epUrl] of Object.entries(clusterEndpoints)) {
            // console.log(`getRoutingControlStates in region ${epRegion}`);
            const getRoutingControlStateCommandInput: GetRoutingControlStateCommandInput = {
                RoutingControlArn: rcDetails.routingControlArn
            };
            const getRoutingControlStateCommand = new GetRoutingControlStateCommand(getRoutingControlStateCommandInput);
            //console.log(`getRoutingControlStateParams: ${rcRegion} : ${JSON.stringify(getRoutingControlStateParams)}`);
            try {
                const getRoutingControlStateCommandOutput: GetRoutingControlStateCommandOutput = await r53rcc[epRegion].send(getRoutingControlStateCommand);
                //console.log(`getRoutingControlStateCommandOutput: ${JSON.stringify(getRoutingControlStateCommandOutput)}`);

                routingControlMap[rcSystem].currentState = getRoutingControlStateCommandOutput.RoutingControlState;
                // Successfully received a response, exit loop
                break;
            } 
            // If response is not successful, log error and continue iterating through endpoints seeking successful response
            catch (error) {
                console.error('getRoutingControlStateCommandOutput Error '+error);
            }
        }
        //Do something to catch if all 5 attempts fail

    }
    
    // console.log(`getRoutingControlStates routingControlMap: `,routingControlMap);
    return routingControlMap;
};


// Update Routing Control States:
async function updateRoutingControlStates(routingControlChanges: RoutingControlChanges) {
    // Iterate through a loop of Routing Controls and Details
    for (let [rcArn, rcTargetState] of Object.entries(routingControlChanges)) {
        
        // Iterate through Endpoint array
        for (let [epRegion, epUrl] of Object.entries(clusterEndpoints)) {
            //console.log(`updateRoutingControlStates in region ${epRegion}`);
            const updateRoutingControlStateCommandInput: UpdateRoutingControlStateCommandInput = {
                RoutingControlArn: rcArn,
                RoutingControlState: rcTargetState
            };
            const updateRoutingControlStateCommand = new UpdateRoutingControlStateCommand(updateRoutingControlStateCommandInput);
            //console.log(`updateRoutingControlStateCommand: ${rcRegion} : ${JSON.stringify(updateRoutingControlStateCommand)}`);
            try {
                const updateRoutingControlStateOutput: UpdateRoutingControlStateCommandOutput = await r53rcc[epRegion].send(updateRoutingControlStateCommand);
                //console.log(`updateRoutingControlStateOutput: ${JSON.stringify(updateRoutingControlStateOutput)}`);

                // Successfully received a response, exit loop
                break;
            } 
            // If response is not successful, log error and continue iterating through endpoints seeking successful response
            catch (error) {
                console.error('updateRoutingControlStateResponse Error '+error);
            }
        }
        //Do something to catch if all 5 attempts fail

    }
    
    // console.log(`updateRoutingControlStates routingControlMap: `, routingControlMap);
    return routingControlMap;
};

interface RoutingControlChanges {
    [rcArn: string]: "On" | "Off";
}
function deltaState(routingControlMap: RoutingControlMap) {
    const routingControlChanges: RoutingControlChanges = {};
    // Iterate through a loop of Routing Controls and Details
    for (let [rcSystem, rcDetails] of Object.entries(routingControlMap)) {
        if (rcDetails.currentState !== rcDetails[applicationMode]) {
            routingControlChanges[rcDetails.routingControlArn] = rcDetails[applicationMode]
        }
    }
    // Log changes
    console.log(`deltaState routingControlChanges: `,routingControlChanges);
    return routingControlChanges;
}


// Main
async function run () {
    // Immediately return and log if missing regions / clients
    if (instantiatedClients !== 5) {
        console.error(`clients are missing, aborting`);
        return "CLIENTS_MISSING";
    }
    try {
        console.log(`Failover function triggered, target application mode: ${applicationMode}`);
        
        // Next, query the Route 53 Application Recovery Controller Routing Control States
        const routingControlStates = await getRoutingControlStates(routingControlMap);
        const routingControlChanges = deltaState(routingControlStates);
        console.log(routingControlChanges);
        if (Object.keys(routingControlChanges).length) {
            const proceed = await prompt("Changes required, do you wish to continue? (yes/no) ");
            rl.close();
            if (proceed == "yes") {
                // Update routing controls to match intended state
                //console.log(`Routing Control Changes Required: ${JSON.stringify(routingControlChanges)}`);
                const updateRoutingControls = await updateRoutingControlStates(routingControlChanges);

                // Check routing control updates performed successfully
                const newRoutingControlStates = await getRoutingControlStates(routingControlMap);
                //Actually perform validation and handle errors here 
                return "ROUTING_CONTROLS_UPDATED";
            } else {
                console.log("Aborting update");
                rl.close();
                return "ROUTING_CONTROL_UPDATE_ABORTED";
            }
        } else {
            // No action required
            console.log(`No routing control updates required, exiting`);
            rl.close();
            return "NO_ACTION_REQUIRED";
        }

    } catch (error) {
        // Typically this is a failure case which should be alerted on and handled accordingly
        console.error('Handler error '+error);
        rl.close();
        return error;
    }

};

run();