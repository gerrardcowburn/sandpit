# Route 53 ARC Blog Post - App Stack Code

This CloudFormation (CFN) Template supports the requirements of an AWS Blog Post on Route 53 Application Recovery Controller. It is the second of a three CFN Deployment. Deploy the *[1-infra-stackset]*(https://github.com/harshawsharma/sandpit/edit/master/arc-blog/single-region/1-infra-stackset/) before deploying this stack. 


This *2-arc-stack* should be deployed as a standard Stack in us-east-1, within a single AWS account.  It will deploy the following Route 53 Application Recovery Controller components:  
* Recovery Readiness Groups, Cells, and Resource Sets  
* Routing Control Clusters, Control Panels, Routing Controls, Safety Rules, and Healthchecks  
* Route 53 DNS Private Hosted Zone and associated DNS entries  

**This sample is provided for demonstration and learning purposes only, and should be reviewed for alignment with organisational policies and best practices before any production use.**
