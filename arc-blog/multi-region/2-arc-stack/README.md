# Route 53 Application Recovery Controller Blog Post Code

This CloudFormation Template supports the requirements of an AWS Blog Post on Route 53 Application Recovery Controller.  
It is the second part of a three part CloudFormation Deployment.  It has dependencies on the preceeding (1) base infrastructure deployment, and is required for (3) supporting Lambda deployment.  
It should be deployed as a standard Stack in us-east-1, within a single AWS account.  
It will deploy the following Route 53 Application Recovery Controller components:  
a. Recovery Readiness Groups, Cells, and Resource Sets  
b. Routing Control Clusters, Control Panels, Routing Controls, Safety Rules, and Healthchecks  
c. Route 53 DNS Private Hosted Zone and associated DNS entries  

**Please note that this sample is provided for demonstration and learning purposes only, and should be reviewed for alignment with organisational policies and best practices before any production use.**
