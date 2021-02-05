# Multi-Region Prefix List Auto-Updater for AWS

### Use Case
Secure random stuff I chuck in AWS to reduce the attack surface for trolls scanning the Internet, but have a dynamic IP at home

### Prerequisites
1. Create a Managed Prefix List called ‘gc-access’ (or something) in any Regions stuff is deployed in
1. Use this as a source in Security Groups for stuff to protect
1. Create an initial manual entry with a description starting #autoupdated

### Script Function
1. Grabs the current public IP of the computer it's run on
1. Scans through all listed regions searching for the named PL
1. Finds the last updated IP and replaces it with the current one

### Usage

```
$ npm install
$ node index.js
```

### Potential Improvements
* Command line arguments to pass prefix-list name / region targets
* Manual CIDR add/remove capability e.g. to provide access to other sources besides the current IP
* Initial creation of the prefix-list in all desired regions
* Better error handling
* Code comments :smile: