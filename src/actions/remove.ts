import fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Db from '../lib/Db';

export async function remove(name, yes = false) {
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
    const doRemove = async () => {
        //remove the file
        fs.unlinkSync(script.path);
        //remove from db
        await Db.removeScriptByName(script.name);
        console.log(chalk.green(`Script ${name} removed.`));
    };
    if (yes) doRemove();
    else
        inquirer
            .prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure to remove script ${name}?`,
                    default: false,
                },
            ])
            .then(async (answers) => {
                if (answers.confirm) {
                    await doRemove();
                }
            });
}
