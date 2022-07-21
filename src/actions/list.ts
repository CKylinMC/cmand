import chalk from 'chalk';
import Db from "../lib/Db";

export async function listAll(enabledOnly=false) {
    const scripts = await Db.listScripts(enabledOnly);
    if (scripts.length === 0) {
        console.log(chalk.yellow('No scripts found.'));
    } else {
        console.log('Scripts:');
        scripts.forEach(script => {
            console.log(chalk[script.enabled ? 'green' : 'red'](script.reqAdmin?`[*]`:`[ ]`,`${script.name} - ${script.description} (${script.path})`));
        });
    }
}