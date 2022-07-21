import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Db from '../lib/Db';

export async function info(name) {
    //check if existed
    const script = await Db.getScriptByName(name);
    if (!script) {
        console.log(chalk.red(`Script ${name} not found.`));
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
