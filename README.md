# cmand

A simple command-line tool for `Windows` managing small scripts. No creative idea or tech in it, just a simple command-line tool built on the top of serval giants.

## Why I built this

I usually write some simple batch scripts to do some simple but repeating work on Windows. After a long time period, I forgot what I was wrote and where I put theme in. After that, I created a folder named `CMD_PATH` and add it into PATH and put all scripts I could found which wrote by me into it. But it still hard to managing these files. So, I built this tool, just for managing my scripts and keeping them available in PATH so I could use them anywhere.

## Installation

This tool built with Node.JS, so you can easily get it if you have NPM installed on your system:

```
npm install -g cmand
```

Or you can download the prebuilt version of this tool from [Github actions](https://github.com/CKylinMC/cmand/actions/workflows/build-exe.yml) artifacts and put it in a folder which contained in your PATH environment variable, but it will be a little slow and big.

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
  run|start <name>                             run an existing script
  run-as-admin|adminrun <name>                 run an existing script as admin
  help [command]                               display help for command
```


## License  

MIT License

