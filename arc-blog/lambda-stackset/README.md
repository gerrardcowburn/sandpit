# Route 53 Application Recovery Controller Blog Post Code

This CloudFormation Template supports the requirements of an AWS Blog Post on Route 53 Application Recovery Controller.  
It is the third part of a three part CloudFormation Deployment.  It has dependencies on the preceeding (1) base infrastructure deployment, and (2) Route 53ARC deployment.  
It should be deployed as a StackSet with us-east-1 as the first region and us-west-2 as the second region, within a single AWS account.  
It will deploy the following Lambda functions:  
a. Infrastructure Status Dashboard Lambda, serving a basic web page via an Internet facing ALB  
b. Database Failover Lambda, running on a scheduled rule to carry out database failovers when required  
It will also deploy all required supporting components such as Lambda Layers, Application Load Balancers, Security Groups, Roles, Policies, LambdaPermissions, and CloudWatch Scheduled Rules.  

Technical Prerequisites:
* Perform the `Build Activities` outlined below.  This simply zips the two Lambda scripts included in this folder into zip files for use during Lambda deployment.
* Upload the two Lambda deployment zip files created above, and the js-sdk-2.958.zip in this repository, to S3 buckets in both deployment regions.  These buckets must either be public, or accessible via the IAM credentials used for the StackSet deployment.
* Update the `LambdaCodeS3Bucket` mapping in both regions of the RegionalParameters Mappings section of the template, based on the S3 buckets used in the step above.

### Build Activities
```
$ chmod 700 build.sh
$ ./build.sh
```

> Sensible defaults for almost all configuration options are provided in the "Mappings" section of the `stack-lambdas.yml` template to accelerate deployment of the collective infrastructure. These may be edited prior to deployment but doing so may result in unexpected behaviour.

> These templates assume familiarity and experience with AWS products and features such as CloudFormation StackSets, and prior account preparation according to the [guidelines available on this documentation is required](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html).  If you have not used CloudFormation StackSets in your account prior to deploying these templates, please refer to this documentation before commencing.

**Please note that this sample is provided for demonstration and learning purposes only, and should be reviewed for alignment with organisational policies and best practices before any production use.**
