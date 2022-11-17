import chalk from 'chalk';
import Db from "../lib/Db";
import fs from 'fs';
import yaml from 'yaml';

export async function listAll(enabledOnly=false) {
    await listTasks(false);
    const scripts = await Db.listScripts(enabledOnly);
    if (scripts.length === 0) {
        console.log(chalk.yellow('No scripts found.'));
    } else {
        console.log('Scripts:');
        scripts.forEach(script => {
            console.log(chalk[script.enabled ? 'green' : 'red'](script.reqAdmin?`*`:' ',`${chalk.bold(script.name)}${script.description.length?chalk.magenta(' - '+script.description):''} (${chalk.gray(script.path)})`));
        });
    }
}

export async function listTasks(output = true) {
    if (!fs.existsSync('./cmand.yml')) {
        if(output)console.log(chalk.red('cmand.yml not found.'));
        return;
    }
    const scripts = yaml.parse(fs.readFileSync('./cmand.yml').toString());
    if (Object.keys(scripts).length === 0) {
        if (output) console.log("No tasks found in cmand.yml");
        return;
    }
    console.log("Tasks available in current directory:");
    for (let scriptName of Object.keys(scripts)) {
        console.log(' ',`${chalk.yellow(chalk.bold(scriptName))}`);
    }
}
