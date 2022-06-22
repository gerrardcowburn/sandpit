{
  "Comment": "A description of my state machine",
  "StartAt": "ExecuteStatement",
  "States": {
    "ExecuteStatement": {
      "Type": "Task",
      "Parameters": {
        "Database": "dev",
        "ClusterIdentifier": "redshift-datashare-demo",
        "DbUser": "awsuser",
        "Sql": "SELECT * FROM factset_supply_chain.ent_v1.ent_scr_address LIMIT 10",
        "WithEvent": true
      },
      "Resource": "arn:aws:states:::aws-sdk:redshiftdata:executeStatement",
      "Next": "DynamoDB PutItem"
    },
    "DynamoDB PutItem": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:dynamodb:putItem.waitForTaskToken",
      "Parameters": {
        "TableName": "redshiftDataTracker",
        "Item": {
          "taskToken": {
            "S.$": "$$.Task.Token"
          },
          "statementId": {
            "S.$": "$.Id"
          }
        }
      },
      "Next": "Pass"
    },
    "Pass": {
      "Type": "Pass",
      "End": true
    }
  }
}
