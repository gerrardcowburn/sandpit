const { EC2Client,
    DescribeManagedPrefixListsCommand,
    GetManagedPrefixListEntriesCommand,
    ModifyManagedPrefixListCommand } = require('@aws-sdk/client-ec2');
const moment = require('moment');
const axios = require('axios');
const yargs = require('yargs');
    
const PREFIX_LIST_NAME = "gc-access"; //Name of target prefix list
const REGIONS = ['us-east-2', 'us-east-1', 'us-west-2']; //List of Regions to search through when making updates

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

async function addPrefixListEntry(ec2, prefixListId, currentVersion, cidr) {
    const modifyPrefixListParams = {
        PrefixListId: prefixListId,
        CurrentVersion: currentVersion,
        AddEntries: [
            {
                Cidr: cidr,
                Description: `#autoadded ${moment().format()}`
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

async function removePrefixListEntry(ec2, prefixListId, currentVersion, cidr) {
    const modifyPrefixListParams = {
        PrefixListId: prefixListId,
        CurrentVersion: currentVersion,
        RemoveEntries: [
            {
                Cidr: cidr
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

const regionLoop = async (mode, cidr) => {
    console.log(`Starting hunt for ${PREFIX_LIST_NAME}...`);

    for (let index = 0; index < REGIONS.length; index++) {
        const REGION = REGIONS[index];
        const ec2 = new EC2Client({ region: REGION });

        console.log(`Scanning ${REGION}...`);

        const currentPrefixList = await getPrefixList(ec2);

        if (currentPrefixList.PrefixLists.length == 1) {
            
            console.log(`Found ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`);

            const currentPrefixListContent = await getPrefixListContent(ec2, currentPrefixList.PrefixLists[0].PrefixListId);

            if (mode == "add") {
                console.log(`Checking for ${cidr} in ${REGION}...`);
                
                const findCidr = currentPrefixListContent.Entries.filter(entry => entry.Cidr.match(cidr));

                if (findCidr.length != 0) {
                    console.log(`Found ${findCidr[0].Cidr} in ${REGION}, skipping...`);
                } else {
                    console.log(`Adding ${cidr} to ${REGION}...`)
                    const addPrefixListEntryResponse = await addPrefixListEntry(ec2, currentPrefixList.PrefixLists[0].PrefixListId, currentPrefixList.PrefixLists[0].Version, cidr);
                }

            }
            if (mode == "remove") {
                console.log(`Checking for ${cidr} in ${REGION}...`);

                const findCidr = currentPrefixListContent.Entries.filter(entry => entry.Cidr.match(cidr));

                if (findCidr.length == 0) {
                    console.log(`Didn't find ${cidr} in ${REGION}, skipping...`);
                } else {
                    console.log(`Removing ${cidr} from ${REGION}...`)
                    const removePrefixListEntryResponse = await removePrefixListEntry(ec2, currentPrefixList.PrefixLists[0].PrefixListId, currentPrefixList.PrefixLists[0].Version, cidr);
                }
            }
            if (mode == "refresh") {
                console.log(`Refreshing ${REGION}...`);
                
                const oldCidr = currentPrefixListContent.Entries.filter(entry => entry.Description.match(/#autoupdate.*/));

                if (oldCidr.length == 1) {
                    if (oldCidr[0].Cidr == cidr) {
                        console.log(`No change in CIDR.  Skipping...`);
                    } else {
                        console.log(`Found ${oldCidr[0].Cidr} in ${currentPrefixList.PrefixLists[0].PrefixListId}, updating...`)
                        const modifyPrefixListResponse = await modifyPrefixList(ec2, currentPrefixList.PrefixLists[0].PrefixListId, currentPrefixList.PrefixLists[0].Version, oldCidr[0].Cidr, cidr);

                        if (CONFIRMDONE) {
                            console.log('Waiting for confirmation...');
            
                            await wait(2000);
            
                            const updatedPrefixListContent = await getPrefixListContent(ec2, currentPrefixList.PrefixLists[0].PrefixListId);

                            const updatedCidr = updatedPrefixListContent.Entries.filter(entry => entry.Description.match(/#autoupdate.*/));

                            if (updatedCidr.length == 1) {
                                if (updatedCidr[0].Cidr == cidr) {
                                    console.log(`Successfully updated ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`);
                                } else {
                                    console.log(`Update failed for ${currentPrefixList.PrefixLists[0].PrefixListId} in ${REGION}`)
                                }
                            } else {
                                console.log(`Found ${updatedCidr.length} #autoupdated CIDRs in ${currentPrefixList.PrefixLists[0].PrefixListId} after update, please investigate...`)
                            }
                        }
                    }
                } else {
                    console.log(`Found ${oldCidr.length} #autoupdated CIDRs in ${currentPrefixList.PrefixLists[0].PrefixListId}, please investigate. Skipping...`)
                }
            }

        } else {
            console.log(`${currentPrefixList.PrefixLists.length} prefix lists found in ${REGION}.  Skipping...`);
        }
    }

    console.log('Done!');

}


const argv = yargs
    .command('refresh','Refresh current public IP /32')
    .command('add','Add new prefix-list entry', {
        cidra: {
            description: 'The CIDR range to add',
            alias: 'a',
            type: 'string'
        }
    })
    .command('remove','Remove existing prefix-list entry', {
        cidrr: {
            description: 'The CIDR range to remove',
            alias: 'r',
            type: 'string'
        }
    })
    .help()
    .alias('help', 'h')
    .argv;

const main = async function (argv) {
    if (argv._.includes('add')) {
        const mode = "add";
        const cidr = argv.cidra ? argv.cidra : argv.a
        if (cidr) {
            console.log(`Adding CIDR ${cidr}...`);
            await regionLoop(mode, cidr);
        } else {
            console.log(`CIDR not provided for addition, please check`);
        }
    }
    if (argv._.includes('remove')) {
        const mode = "remove"
        const cidr = argv.cidrr ? argv.cidrr : argv.r
        if (cidr) {
            console.log(`Removing CIDR ${cidr}...`);
            await regionLoop(mode, cidr);
        } else {
            console.log(`CIDR not provided for removal, please check`);
        }
    }
    if (argv._.includes('refresh') || argv._.length == 0) {
        const mode = "refresh";
        console.log(`Refreshing...`);

        console.log('Getting current Public IP...');
        const newCidrCall = await getMyPublicIP();
        const cidr = newCidrCall.data.ip + '/32';
        console.log(`Current Public IP identified as ${cidr}`);

        await regionLoop(mode, cidr);
    }
}

main(argv);