//Import all relevant Clients and Interfaces from the @aws-sdk/client-dataexchange SDK
import { DataExchangeClient, DataExchangeClientConfig, SendApiAssetCommand, SendApiAssetCommandInput, SendApiAssetCommandOutput } from "@aws-sdk/client-dataexchange";

//Populate DataExchangeClientConfig with Region and Logger requirements
const dataExchangeClientConfig: DataExchangeClientConfig = {
    region: "us-east-1",
    logger: { 
        debug: console.debug,
        info: console.log,
        warn: console.warn,
        error: console.error
    }
}

//Instantiate DataExchangeClient
const dataExchangeClient = new DataExchangeClient(dataExchangeClientConfig);

//Populate productInfo object based on SendApiAssetCommandInput interface, providing just the mandatory parameters which will be consistent across requests.  The examples below are the AWS Data Exchange for APIs (Test product)
const productInfo: SendApiAssetCommandInput = {
    DataSetId: "8d494cba5e4720e5f6072e280daf70a8",
    RevisionId: "32559097c7d209b02af6de5cad4385fe",
    AssetId: "4e94198cfdb8400793fb3f0411861960"
}

//Create asynchronous function to make an ADX for APIs Subscriber Call
async function makeAdxForApiSubscriberCall (productInfo) {

    //Populate sendApiAssetCommandInput object based on SendApiAssetCommand interface by merging productInfo object with additional request specific parameters
    const sendApiAssetCommandInput: SendApiAssetCommandInput = {
        ...productInfo,
        //This can be GET, PUT, POST, etc. depending on the Provider API
        Method: "GET",
        //This depends on the Provider API and data being requested
        Path: "/",
        //These depend on the Provider API and should be provided as a JSON Object
        QueryStringParameters: {
            param1: "value1",
            param2: "value2"
        },
        //These depend on the Provider API and should be provided as a JSON Object.  Note that the AWS Data Exchange Test API product requires "Content-Type": "application/json"
        RequestHeaders: {
            "Content-Type": "application/json"
        },
        //This depends on the Provider API
        Body: JSON.stringify({
            body_param: "body_param_value"
        })
    }

    //Log sendApiAssetCommandInput
    // console.log("sendApiAssetCommandInput");
    // console.log(sendApiAssetCommandInput);
    
    //Instantiate SendApiAssetCommand
    const sendApiAssetCommand = new SendApiAssetCommand(sendApiAssetCommandInput);
    
    //Log sendApiAssetCommand
    // console.log("sendApiAssetCommand")
    // console.log(sendApiAssetCommand)

    //Send command using DataExchangeClient
    try {
        const sendApiAssetCommandOutput: SendApiAssetCommandOutput = await dataExchangeClient.send(sendApiAssetCommand);
        //Log sendApiAssetCommandOutput
        // console.log("sendApiAssetCommandOutput");
        // console.log(sendApiAssetCommandOutput);
    } catch (err) {
        //Log errors
        console.log("Error")
        console.error(err);
    }
}

//Invoke function to make ADX for APIs Subscriber Call
makeAdxForApiSubscriberCall(productInfo);
