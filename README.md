# cmand

[![Build Executable](https://github.com/CKylinMC/cmand/actions/workflows/build-exe.yml/badge.svg)](https://github.com/CKylinMC/cmand/actions/workflows/build-exe.yml)

A simple command-line tool for `Windows` managing small scripts. No creative idea or tech in it, just a simple command-line tool built on the top of serval giants.

`[WIP]`

## Why I built this

I usually write some simple batch scripts to do some simple but repeating work on Windows. After a long time period, I forgot what I was wrote and where I put theme in. After that, I created a folder named `CMD_PATH` and add it into PATH and put all scripts I could found which wrote by me into it. But it still hard to managing these files. So, I built this tool, just for managing my scripts and keeping them available in PATH so I could use them anywhere.

## Installation

<!--
This tool built with Node.JS, so you can easily get it if you have NPM installed on your system:

```
npm install -g cmand
```

Or you can download the prebuilt version of this tool from [Github actions](https://github.com/CKylinMC/cmand/actions/workflows/build-exe.yml) artifacts and put it in a folder which contained in your PATH environment variable, but it will be a little slow and big.
-->
Currently you can download the prebuilt version of this tool from [Releases page](https://github.com/CKylinMC/cmand/releases) or [Github actions (for dev build)](https://github.com/CKylinMC/cmand/actions/workflows/build-exe.yml) artifacts and put it in a folder which contained in your PATH environment variable. I'm preparing to push it to NPM registry so that you could use npm install directly.

## How to use

This script will create a directory in you home directory called `.cmand` on first run. It will contained a database file and a scripts folder which will contained all the scripts, and it will automatically add into your PATH environment variable.

```
Commands:
  ls|list [options]                            List all scripts you have added
  search|find <text>                           Search scripts by name
  register|reg [options] <path> [description]  Register an existing script. Script will be copied to cmand home folder
  create|new [name]                            Create a new script. Script will be created in cmand home folder
  alias [options] <alias>                      Create a alias script for your commands.
  modify|edit <name>                           Modify an existing script
  cat|get [options] <name>                     Get contents for a script
  remove|del [options] <name>                  Remove an existing script
  info|get <name>                              Get information of an existing script
  set|s [options] <name>                       change script settings
  enable|on <name>                             enable a script
  disable|off <name>                           disable a script
  run|start <name>                             run an existing script
  task|runtask [options] [name]                run task from cmand.yml in current directory
  run-as-admin|adminrun <name>                 run an existing script as admin
  help [command]                               display help for command
```

*// Detailed usage documents not ready yet* 

## Known issues
* If you want to remove cmand and dont want to leave any data in your disk, please remove `%USERPROFILE%\.cmand` folder manually.
  * ⚠️**Notice: This will remove cmand database and all your scripts created with cmand. Backup them first if you want keep them.**
  * And also you need to remove all cmand related path from your system environment variables, such as `%CMAND_SCRIPTS%`.


## License  

MIT License

