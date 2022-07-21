import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Db from '../lib/Db';

export async function edit(name) {
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
    inquirer.prompt([
        {
            type: 'editor',
            name: 'script',
            message: 'Edit script in your editor, save and close it when done.',
            default: fs.readFileSync(script.path, 'utf8'),
            postfix: path.extname(script.path),
        }
    ]).then(answers => {
        //overrite the file with the new content
        fs.writeFileSync(script.path, answers.script);
    });
}
