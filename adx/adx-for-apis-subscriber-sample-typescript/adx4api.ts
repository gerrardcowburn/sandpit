//Import all relevant Clients and Interfaces from the @aws-sdk/client-dataexchange SDK
import { DataExchangeClient, DataExchangeClientConfig, SendApiAssetCommand, SendApiAssetCommandInput, SendApiAssetCommandOutput } from "@aws-sdk/client-dataexchange";

//Define Interface for base ProductInfo which will remain consistent across all API calls to the same Product
interface ProductInfo {
    AssetId: string | undefined;
    DataSetId: string | undefined;
    RevisionId: string | undefined;
}

//Define Interface for Request Parameters which will likely vary across API calls
interface RequestParams {
    Method: undefined | string;
    Path: undefined | string;
    QueryStringParameters: undefined | {};
    RequestHeaders: undefined | {};
    Body: undefined | string;
}

//Sample CLI request
// aws dataexchange send-api-asset \
//   --data-set-id 8d494cba5e4720e5f6072e280daf70a8 \
//   --revision-id 32559097c7d209b02af6de5cad4385fe \
//   --asset-id 4e94198cfdb8400793fb3f0411861960 \
//   --method POST \
//   --path "/" \
//   --query-string-parameters 'param1=value1,param2=value2' \
//   --request-headers 'header=header_value' \
//   --body "{\"body_param\":\"body_param_value\"}"


//Populate productInfo object based on ProductInfo interface
const productInfo: ProductInfo = {
    DataSetId: "8d494cba5e4720e5f6072e280daf70a8",
    RevisionId: "32559097c7d209b02af6de5cad4385fe",
    AssetId: "4e94198cfdb8400793fb3f0411861960"
}

//Populate requestParams object based on RequestParams interface
const requestParams: RequestParams = {
    Method: "GET",
    Path: "/"
    QueryStringParameters: "param1=value1,param2=value2",
    RequestHeaders: "header=header_value",
    Body: "{\"body_param\":\"body_param_value\"}"
}

//Configure API Region
const REGION = "us-east-1";

//Populate DataExchangeClientConfig
const dataExchangeClientConfig: DataExchangeClientConfig = {
    region: REGION
}

//Instantiate DataExchangeClient
const dataExchangeClient = new DataExchangeClient(dataExchangeClientConfig);

//Create asynchronous function to make an ADX for APIs Subscriber Call
async function makeAdxForApiSubscriberCall (requestParams, productInfo) {
    //Populate sendApiAssetCommandInput object based on SendApiAssetCommand interface by merging requestParams and productInfo objects from above
    const sendApiAssetCommandInput: SendApiAssetCommandInput = {
        ...requestParams,
        ...productInfo
    };
    console.log(sendApiAssetCommandInput);
    //Instantiate SendApiAssetCommand
    const sendApiAssetCommand = new SendApiAssetCommand(sendApiAssetCommandInput);
    console.log(sendApiAssetCommand)
    //Send command using DataExchangeClient
    try {
        const sendApiAssetCommandOutput: SendApiAssetCommandOutput = await dataExchangeClient.send(sendApiAssetCommand);
        //Log output
        console.log(sendApiAssetCommandOutput);
    } catch (err) {
        //Log errors
        console.error(err);
    }
}

//Invoke function to make ADX for APIs Subscriber Call
makeAdxForApiSubscriberCall(requestParams, productInfo);