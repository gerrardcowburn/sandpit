const { EC2Client, describeManagedPrefixLists } = require("@aws-sdk/client-ec2");

async function export() {

    var REGION = "us-east-2";
    var PREFIX_LIST_NAME = "gc-access";

    const ec2 = new EC2Client({ region: REGION });

    var describePrefixListParams = {
        Filters: [{
            Name: 'prefix-list-name',
            Values: [PREFIX_LIST_NAME]
        }]
    };
    var command = new describeManagedPrefixLists(describePrefixListParams);

    try {
        const data = await ec2C.send(command);
        console.log(data);
    } catch (error) {
        console.error(error);
    } finally {
        console.log("done");
    }
};

export();
