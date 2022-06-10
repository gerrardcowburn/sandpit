"use strict";
/*jshint esversion: 8 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// Require dependencies
var client_route53_recovery_cluster_1 = require("@aws-sdk/client-route53-recovery-cluster");
var cluster_endpoints_1 = require("./cluster-endpoints");
var routing_controls_1 = require("./routing-controls");
var readline = require('readline');
var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
var prompt = function (query) { return new Promise(function (resolve) { return rl.question(query, resolve); }); };
// Instantiate required AWS SDK Clients:
// Route 53 Application Recovery Controller Data Plane client for all 5 dataplane endpoint regions
var r53rcc = {};
var instantiatedClients = 0;
function instantiateClients() {
    for (var _i = 0, _a = Object.entries(cluster_endpoints_1.clusterEndpoints); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        r53rcc[key] = new client_route53_recovery_cluster_1.Route53RecoveryClusterClient({
            region: key,
            endpoint: value
            // logger: console
        });
        instantiatedClients++;
    }
}
;
instantiateClients();
// Get Routing Control States:
function getRoutingControlStates(routingControlMap) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, _b, rcSystem, rcDetails, _c, _d, _e, epRegion, epUrl, getRoutingControlStateCommandInput, getRoutingControlStateCommand, getRoutingControlStateCommandOutput, error_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _i = 0, _a = Object.entries(routingControlMap);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    _b = _a[_i], rcSystem = _b[0], rcDetails = _b[1];
                    _c = 0, _d = Object.entries(cluster_endpoints_1.clusterEndpoints);
                    _f.label = 2;
                case 2:
                    if (!(_c < _d.length)) return [3 /*break*/, 7];
                    _e = _d[_c], epRegion = _e[0], epUrl = _e[1];
                    getRoutingControlStateCommandInput = {
                        RoutingControlArn: rcDetails.routingControlArn
                    };
                    getRoutingControlStateCommand = new client_route53_recovery_cluster_1.GetRoutingControlStateCommand(getRoutingControlStateCommandInput);
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, r53rcc[epRegion].send(getRoutingControlStateCommand)];
                case 4:
                    getRoutingControlStateCommandOutput = _f.sent();
                    //console.log(`getRoutingControlStateCommandOutput: ${JSON.stringify(getRoutingControlStateCommandOutput)}`);
                    routingControlMap[rcSystem].currentState = getRoutingControlStateCommandOutput.RoutingControlState;
                    // Successfully received a response, exit loop
                    return [3 /*break*/, 7];
                case 5:
                    error_1 = _f.sent();
                    console.error('getRoutingControlStateCommandOutput Error ' + error_1);
                    return [3 /*break*/, 6];
                case 6:
                    _c++;
                    return [3 /*break*/, 2];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: 
                // console.log(`getRoutingControlStates routingControlMap: `,routingControlMap);
                return [2 /*return*/, routingControlMap];
            }
        });
    });
}
;
// Update Routing Control States:
function updateRoutingControlStates(routingControlChanges) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, _b, rcArn, rcTargetState, _c, _d, _e, epRegion, epUrl, updateRoutingControlStateCommandInput, updateRoutingControlStateCommand, updateRoutingControlStateOutput, error_2;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _i = 0, _a = Object.entries(routingControlChanges);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    _b = _a[_i], rcArn = _b[0], rcTargetState = _b[1];
                    _c = 0, _d = Object.entries(cluster_endpoints_1.clusterEndpoints);
                    _f.label = 2;
                case 2:
                    if (!(_c < _d.length)) return [3 /*break*/, 7];
                    _e = _d[_c], epRegion = _e[0], epUrl = _e[1];
                    updateRoutingControlStateCommandInput = {
                        RoutingControlArn: rcArn,
                        RoutingControlState: rcTargetState
                    };
                    updateRoutingControlStateCommand = new client_route53_recovery_cluster_1.UpdateRoutingControlStateCommand(updateRoutingControlStateCommandInput);
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, r53rcc[epRegion].send(updateRoutingControlStateCommand)];
                case 4:
                    updateRoutingControlStateOutput = _f.sent();
                    //console.log(`updateRoutingControlStateOutput: ${JSON.stringify(updateRoutingControlStateOutput)}`);
                    // Successfully received a response, exit loop
                    return [3 /*break*/, 7];
                case 5:
                    error_2 = _f.sent();
                    console.error('updateRoutingControlStateResponse Error ' + error_2);
                    return [3 /*break*/, 6];
                case 6:
                    _c++;
                    return [3 /*break*/, 2];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: 
                // console.log(`updateRoutingControlStates routingControlMap: `, routingControlMap);
                return [2 /*return*/, routing_controls_1.routingControlMap];
            }
        });
    });
}
;
function deltaState(routingControlMap) {
    var routingControlChanges = {};
    // Iterate through a loop of Routing Controls and Details
    for (var _i = 0, _a = Object.entries(routingControlMap); _i < _a.length; _i++) {
        var _b = _a[_i], rcSystem = _b[0], rcDetails = _b[1];
        if (rcDetails.currentState !== rcDetails[routing_controls_1.applicationMode]) {
            routingControlChanges[rcDetails.routingControlArn] = rcDetails[routing_controls_1.applicationMode];
        }
    }
    // Log changes
    console.log("deltaState routingControlChanges: ", routingControlChanges);
    return routingControlChanges;
}
// Main
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var routingControlStates, routingControlChanges, proceed, updateRoutingControls, newRoutingControlStates, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Immediately return and log if missing regions / clients
                    if (instantiatedClients !== 5) {
                        console.error("clients are missing, aborting");
                        return [2 /*return*/, "CLIENTS_MISSING"];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    console.log("Failover function triggered, target application mode: ".concat(routing_controls_1.applicationMode));
                    return [4 /*yield*/, getRoutingControlStates(routing_controls_1.routingControlMap)];
                case 2:
                    routingControlStates = _a.sent();
                    routingControlChanges = deltaState(routingControlStates);
                    console.log(routingControlChanges);
                    if (!Object.keys(routingControlChanges).length) return [3 /*break*/, 8];
                    return [4 /*yield*/, prompt("Changes required, do you wish to continue? (yes/no) ")];
                case 3:
                    proceed = _a.sent();
                    rl.close();
                    if (!(proceed == "yes")) return [3 /*break*/, 6];
                    return [4 /*yield*/, updateRoutingControlStates(routingControlChanges)];
                case 4:
                    updateRoutingControls = _a.sent();
                    return [4 /*yield*/, getRoutingControlStates(routing_controls_1.routingControlMap)];
                case 5:
                    newRoutingControlStates = _a.sent();
                    //Actually perform validation and handle errors here 
                    return [2 /*return*/, "ROUTING_CONTROLS_UPDATED"];
                case 6:
                    console.log("Aborting update");
                    rl.close();
                    return [2 /*return*/, "ROUTING_CONTROL_UPDATE_ABORTED"];
                case 7: return [3 /*break*/, 9];
                case 8:
                    // No action required
                    console.log("No routing control updates required, exiting");
                    rl.close();
                    return [2 /*return*/, "NO_ACTION_REQUIRED"];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_3 = _a.sent();
                    // Typically this is a failure case which should be alerted on and handled accordingly
                    console.error('Handler error ' + error_3);
                    rl.close();
                    return [2 /*return*/, error_3];
                case 11: return [2 /*return*/];
            }
        });
    });
}
;
run();
