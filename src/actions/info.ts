import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Db from '../lib/Db';
import { dbpath, home, Info, scripthome, settingspath } from '../info';

export async function info(name) {
    if (!name) {
        return coreInfo();
    }
    //check if existed
    const script = await Db.getScriptByName(name);
    if (!script) {
        console.log();
        return;
    }
    // check file of the script path is still valid
    if (!fs.existsSync(script.path)) {
        console.log(chalk.red(`Script ${name} path not found.`));
        return;
    }
    if (!fs.statSync(script.path).isFile()) {
        console.log(chalk.red(`${script.path} is not a file.`));
        return;
    }
    // list all info from db and from file meta
    console.log(`Script: ${script.name}`);
    console.log(`Description: ${script.description}`);
    console.log(`Path: ${script.path}`);
    console.log(`Enabled: ${script.enabled}`);
    console.log(`Require Admin: ${script.reqAdmin}`);
    // created date and modified date
    const stat = fs.statSync(script.path);
    console.log(`Created: ${new Date(stat.birthtime).toLocaleString()}`);
    console.log(`Modified: ${new Date(stat.mtime).toLocaleString()}`);
    // filesize from stat in KB
    console.log(`Size: ${Math.round(stat.size / 1024)} KB`);
    // is shell or cmd or batch or python or executable or (extension)
    const ext = path.extname(script.path);
    console.log(`Type: ${ext.substring(1)}`);
}

export async function coreInfo() {
    const dump = (key, value) => console.log(chalk.blue(key), "=>", chalk.green(JSON.stringify(value, null, 2)));
    dump("[Internal] CMAND INFO",Info);
    dump("CMAND_HOME", process.env.CMAND_HOME);
    dump("[Internal] CMAND_HOME", home);
    dump("CMAND_SCRIPTS", process.env.CMAND_SCRIPTS);
    dump("[Internal] CMAND_SCRIPTS", scripthome());
    dump("[Internal] database", dbpath());
    dump("[Internal] settings", settingspath());
    console.log("\nFor configuration details please use 'cmand config list' command.");
    console.log("If you want to query informations of a script, please use 'cmand info <SCRIPT_NAME>'.");
    console.log("Use 'cmand [SUB_COMMAND] help [SECTION]' to check help documents.");
}
