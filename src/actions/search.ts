import chalk from 'chalk';
import Db from "../lib/Db";

export async function search(searchText) {
    const scripts = await Db.searchScripts(new RegExp(searchText,'ig'));
    if (scripts.length === 0) {
        console.log(chalk.yellow('No script match your input.'));
    } else {
        console.log('Scripts matched "'+searchText+'":');
        scripts.forEach(script => {
            console.log(chalk[script.enabled ? 'green' : 'red'](script.reqAdmin?`*`:' ',`${chalk.bold(script.name)}${script.description.length?chalk.magenta(' - '+script.description):''} (${chalk.gray(script.path)})`));
        });
    }
}