import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

const config = {
    "region": "us-east-1",
    "logging": console
}
const ddb = new DynamoDBClient(config);
const sfn = new SFNClient(config);
 
// async function run (event) {
exports.handler = async (event) => {
    console.log(event);
    
    const ddbParams = {
        "TableName": "redshiftDataTracker",
        "Key": {
            "statementId": {
                "S": event.detail.statementId
            }
        }
    }
    const getItemCommand = new GetItemCommand(ddbParams);
    let returnBody = {};
    try {
        const getItemCommandOutput = await ddb.send(getItemCommand);
        const sfnParams = {
            "output": JSON.stringify(event),
            "taskToken": getItemCommandOutput.Item.taskToken.S
        }
        const sendTaskSuccessCommand = new SendTaskSuccessCommand(sfnParams);
        try {
            const sendTaskSuccessCommandOutput = await sfn.send(sendTaskSuccessCommand);
            returnBody = sendTaskSuccessCommandOutput;
        } catch (err) {
            console.error(err);
        }
    } catch (err) {
        console.error(err);
    }

    const response = {
        statusCode: 200,
        body: JSON.stringify(returnBody),
    };
    return response;
};