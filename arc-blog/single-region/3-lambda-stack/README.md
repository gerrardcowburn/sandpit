# Route 53 ARC Blog Post - Lambda Stack Code

This CloudFormation (CFN) Template supports the requirements of an AWS Blog Post on Route 53 Application Recovery Controller. It is the third and the final CFN. Deploy the *[1-infra-stackset]*(https://github.com/harshawsharma/sandpit/edit/master/arc-blog/single-region/1-infra-stackset/) and the *[2-arc-stack](https://github.com/harshawsharma/sandpit/tree/master/arc-blog/single-region/2-arc-stack)* before deploying this stack.

This CFN will deploy a Lambda function that serves a basic web page via an Internet facing ALB. This CFN will also deploy all required supporting components such as Lambda Layers, Application Load Balancers, Security Groups, Roles, Policies, LambdaPermissions, and CloudWatch Scheduled Rules.  

Technical Prerequisites:
* Perform the `Build Activities` outlined below.  This simply zips the Lambda function into a zip file for use during Lambda deployment
* Upload this Lambda zip file and the js-sdk-2.958.zip in this repository, to a S3 bucket. These buckets must either be public, or accessible via the IAM credentials used for the StackSet deployment.
* Update the `LambdaCodeS3Bucket` mapping of the RegionalParameters Mappings section of the template, based on the S3 buckets used in the step above.

### Build Activities
```
$ chmod 700 build.sh
$ ./build.sh
```

**Note:**

* Sensible defaults for almost all configuration options are provided in the "Mappings" section of the `stack-lambdas.yml` template to accelerate deployment of the collective infrastructure. These may be edited prior to deployment but doing so may result in unexpected behaviour.
* These templates assume familiarity and experience with AWS products and features such as CloudFormation StackSets, and prior account preparation according to the [guidelines available on this documentation is required](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html).  If you have not used CloudFormation StackSets in your account prior to deploying these templates, please refer to this documentation before commencing.

**This sample is provided for demonstration and learning purposes only, and should be reviewed for alignment with organisational policies and best practices before any production use.**
