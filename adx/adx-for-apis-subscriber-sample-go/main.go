/*
Please see the README.md on the GitHub AWS Data Exchange Samples repository for a more detailed overview with links to relevant AWS documentation.

This code is provided as a sample of how to use the AWS Data Exchange Client Software Development Kit (SDK) to connect to Data Exchange For APIs
based Data Sets.  This will typically consist of three main stages:
1. Import relevant SDK Clients, establish base Client configuration, and instantiate the Client.
    (This stage will remain consistent across all potential AWS Data Exchange for APIs use cases)
2. Define the relevant Provider / Product specific identities)
    (This stage will remain consistent across all uses of a given Product.
3. Define the request-specific parameters based on your business need.
    (This stage will likely change for every request)

To get started, sign in to the AWS Management Console, browse to AWS Data Exchange, search for the "AWS Data Exchange for APIs (Test product)"
Product, and subscribe.
Copy the relevant DataSetId, RevisionId, and AssetId from the Entitled Data page and paste them into the productInfo constant below

Familiarity with go programming language is assume. For go programming language documentation visit: https://go.dev/doc/tutorial/getting-started

To assist with finding the necessary inputs for the productInfo and sendApiAssetInput values, the Data Exchange console provides
Sample CLI requests as shown below.  The first 3 parameters map to the productInfo constant, and the rest map to sendApiAssetInput
aws dataexchange send-api-asset \
  --data-set-id 8d494cba5e4720e5f6072e280daf70a8 \
  --revision-id 32559097c7d209b02af6de5cad4385fe \
  --asset-id 4e94198cfdb8400793fb3f0411861960 \
  --method POST \
  --path "/" \
  --query-string-parameters 'param1=value1,param2=value2' \
  --request-headers 'header=header_value' \
  --body "{\"body_param\":\"body_param_value\"}"

By default, this code will authenticate against AWS Data Exchange using the configuration of the environment in which it runs.
For local development purposes, this will typically use credentials provided to the AWS CLI by `aws configure`
When running on Amazon EC2 it will typically use the EC2 Instance Profile, and for AWS Lambda it will use the Lambda Execution Role.
*/

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	//    "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dataexchange"
)

var (
	assetId    = "4e94198cfdb8400793fb3f0411861960"
	revisionId = "32559097c7d209b02af6de5cad4385fe"
	dataSetId  = "8d494cba5e4720e5f6072e280daf70a8"
	method     = "POST"
	path       = "/"
)

func main() {
	// Using the SDK's default configuration, loading additional config
	// and credentials values from the environment variables, shared
	// credentials, and shared configuration files
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("us-east-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	// Using the Config value, create the Data Exchange client
	svc := dataexchange.NewFromConfig(cfg)

	var body = map[string]string{"body_param": "body_param_value"}
	jsonBody, err := json.Marshal(body)

	if err != nil {
		log.Fatalf("Unable to marshal body to json.")
	}

	jsonBodyString := string(jsonBody)

	var queryStringParameters = map[string]string{
		"param1": "value1",
		"param2": "value2",
	}

	requestHeaders := map[string]string{"Content-Type": "application/json"}

	sendApiAssetInput := dataexchange.SendApiAssetInput{
		AssetId:               &assetId,
		RevisionId:            &revisionId,
		DataSetId:             &dataSetId,
		Body:                  &jsonBodyString,
		Method:                &method,
		Path:                  &path,
		QueryStringParameters: queryStringParameters,
		RequestHeaders:        requestHeaders,
	}

	sendApiAssetOutput, err := svc.SendApiAsset(context.TODO(), &sendApiAssetInput)

	if err != nil {
		log.Fatalf("SendApiAsset call failed.", err)
	}

	fmt.Println("Response Body:")
	fmt.Println()
	fmt.Println(*sendApiAssetOutput.Body)

	fmt.Println()
	fmt.Println("Response Headers:")
	fmt.Println()
	for key, value := range sendApiAssetOutput.ResponseHeaders {
		fmt.Println(key, " = ", value)
	}
}
