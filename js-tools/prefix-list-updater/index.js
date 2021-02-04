const { EC2Client,
    DescribeManagedPrefixListsCommand,
    GetManagedPrefixListEntriesCommand,
    ModifyManagedPrefixListCommand } = require('@aws-sdk/client-ec2');
const moment = require('moment')
const axios = require('axios');
    
const PREFIX_LIST_NAME = "gc-access"; //Name of target prefix list
const REGIONS = ['us-east-2', 'us-east-1']; //List of Regions to search through when making updates

const CONFIRMDONE = true; //Tells the script whether to wait 2 seconds after attempting an update to validate success, or whether to just crack on and assume everything's fine

function wait (timeout) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, timeout);
    });
  }
  
async function getMyPublicIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json')
        //console.log(response);
        return(response);
    } catch (error) {
        console.log(error);
    }
};

async function getPrefixList(ec2) { 
    const getPrefixListIdParams = {
        Filters: [{
            Name: 'prefix-list-name',
            Values: [PREFIX_LIST_NAME]
        }]
    };
    const command = new DescribeManagedPrefixListsCommand(getPrefixListIdParams);

    try {
        const data = await ec2.send(command);
        //console.log(data);
        return (data);
    } catch (error) {
        console.error(error);
    } 
};

async function getPrefixListContent(ec2, prefixListId) {
    const getPrefixListContentParams = {
        PrefixListId: prefixListId
    }
    const command = new GetManagedPrefixListEntriesCommand(getPrefixListContentParams);

    try {
        const data = await ec2.send(command);
        //console.log(data);
        return (data);
    } catch (error) {
        console.error(error);
    } 
}

async function modifyPrefixList(ec2, prefixListId, currentVersion, oldCidr, newCidr) {
    const modifyPrefixListParams = {
        PrefixListId: prefixListId,
        CurrentVersion: currentVersion,
        AddEntries: [
            {
                Cidr: newCidr,
                Description: `#autoupdated ${moment().format()}`
            }
        ],
        RemoveEntries: [
            {
                Cidr: oldCidr
            }
        ]
    }
    const command = new ModifyManagedPrefixListCommand(modifyPrefixListParams);

    try {
        const data = await ec2.send(command);
        //console.log(data);
        return (data);
    } catch (error) {
        console.error(error);
    } 
}


const regionLoop = async _ => {
    console.log('Starting...');

    console.log('Getting current Public IP...');
    const newCidrCall = await getMyPublicIP();
    const newCidr = newCidrCall.data.ip + '/32';
    console.log(`Current Public IP identified as ${newCidr}`);

    for (let index = 0; index < REGIONS.length; index++) {
        const REGION = REGIONS[index];
        const ec2 = new EC2Client({ region: REGION });

        console.log(`Scanning ${REGION}...`);

        const currentPrefixList = await getPrefixList(ec2);

        if (currentPrefixList.PrefixLists.length == 1) {
            
            console.log(`Found ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`);

            const currentPrefixListContent = await getPrefixListContent(ec2, currentPrefixList.PrefixLists[0].PrefixListId);

            const oldCidr = currentPrefixListContent.Entries.filter(entry => entry.Description.match(/#autoupdate.*/));

            if (oldCidr.length == 1) {
                console.log(`Found ${oldCidr[0].Cidr} in ${currentPrefixList.PrefixLists[0].PrefixListId}, updating...`)
                const modifyPrefixListResponse = await modifyPrefixList(ec2, currentPrefixList.PrefixLists[0].PrefixListId, currentPrefixList.PrefixLists[0].Version, oldCidr[0].Cidr, newCidr);

                if (CONFIRMDONE) {
                    console.log('Waiting for confirmation...');
    
                    await wait(2000);
    
                    const updatedPrefixListContent = await getPrefixListContent(ec2, currentPrefixList.PrefixLists[0].PrefixListId);

                    const updatedCidr = updatedPrefixListContent.Entries.filter(entry => entry.Description.match(/#autoupdate.*/));

                    if (updatedCidr.length == 1) {
                        if (updatedCidr[0].Cidr == newCidr) {
                            console.log(`Successfully updated ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`);
                        } else {
                            console.log(`Update failed for ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`)
                        }
                    } else {
                        console.log(`Found ${updatedCidr.length} #autoupdated CIDRs in ${currentPrefixList.PrefixLists[0].PrefixListId} after update, please investigate...`)
                    }
                }
            } else {
                console.log(`Found ${oldCidr.length} #autoupdated CIDRs in ${currentPrefixList.PrefixLists[0].PrefixListId}, please investigate. Skipping...`)
            }

        } else {
            console.log(`${currentPrefixList.PrefixLists.length} prefix lists found in ${REGION}.  Skipping...`);
        }
    }

    console.log('Done!');

}

regionLoop();