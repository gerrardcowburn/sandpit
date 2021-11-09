# Route 53 Application Recovery Controller Blog Post Code

This CloudFormation Template supports the requirements of an AWS Blog Post on Route 53 Application Recovery Controller.  
It is the first part of a three part CloudFormation Deployment.  It is intended to be followed by (2) Route53 ARC and (3) supporting Lambda CloudFormation deployments.  
It should be deployed as a StackSet with us-east-1 as the first region and us-west-2 as the second region, within a single AWS account.  
It uses the CloudFormation Nested Stack approach, with 3 child stacks to deploy the following components across each target region:  
a. Network Stack - Base level infrastructure including public/private subnets, Internet gateway, NAT gateway, route tables, etc.  
b. Application Stack - Application level infrastructure including Network Load Balancers, AutoScaling Groups, etc.  
c. Database Stack - Database level infrastructure including KMS Keys, Secrets, Database clusters and nodes, etc.  

Please be mindful that the resources deployed for the purposes of this sample will cost approx. $2/hr.  Please be sure to clean up all resources by deleting the CloudFormation Stacks when they are no longer required.

Technical Prerequisites:
* The three nested stack templates, `stack-network.yml`, `stack-app.yml`, and `stack-network.yml` must be uploaded to an S3 Bucket which is either public, or accessible via the IAM credentials used for the StackSet deployment.
* The name of this S3 Bucket must be updated in the `TemplatePath` mapping in the `stack-master.yml` file prior to initiation of deployment.  The name should be in the format _bucketname_.s3._region_

> Sensible defaults for almost all configuration options are provided in the "Mappings" section of the `stack-master.yml` template to accelerate deployment of the collective infrastructure. These may be edited prior to deployment but doing so may result in unexpected behaviour.

> These templates assume familiarity and experience with AWS products and features such as CloudFormation StackSets, and prior account preparation according to the [guidelines available on this documentation is required](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html).  If you have not used CloudFormation StackSets in your account prior to deploying these templates, please refer to this documentation before commencing.

**Please note that this sample is provided for demonstration and learning purposes only, and should be reviewed for alignment with organisational policies and best practices before any production use.**
