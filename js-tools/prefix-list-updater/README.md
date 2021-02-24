# Multi-Region Prefix List Auto-Updater for AWS

### Use Case
Secure random stuff I chuck in AWS to reduce the attack surface for trolls scanning the Internet, but have a dynamic IP at home

### Prerequisites
1. Create a Managed Prefix List called ‘gc-access’ (or something) in any Regions stuff is deployed in
1. Use this as a source in Security Groups for stuff to protect
1. Create an initial manual entry with a description starting #autoupdated for the 'Refresh' capability to use

### Script Function
1. Automatically refresh prefix-list entry based on current public IP of source machine
1. Add new Prefix-List entry on demand
1. Remove existing prefix-list entry on demand

### Usage
1. Download the script / clone the repo
1. Edit index.js to update the PREFIX_LIST_NAME and REGIONS variables
1. Install package dependencies and run the script
```
$ npm install
$ node index.js [refresh | add -a c.i.d.r/l | remove -r c.i.d.r/l]
```

### Command Line Parameters
1. No parameters provided, or 'refresh' command - runs automatic refresh
1. 'add' command, with -a flag for a given CIDR
1. 'remove' command, with -r flag for a given CIDR
1. -p or --prefixlist flag: the name of the prefix-list to hunt for and update

Note that all parameters can be used simultaneously, e.g. the below command will search across regions for a prefix list called secure-pl, refresh your current public IP as a /32 within it, add 1.2.3.4/32, and remove 4.3.2.1/32
```
$ node index.js refresh -p secure-pl add -a 1.2.3.4/32 remove -r 4.3.2.1/32
```

### Potential Improvements
* Command line arguments to pass region targets
* Initial creation of the prefix-list in all desired regions
* Better error handling
* Code comments :smile: