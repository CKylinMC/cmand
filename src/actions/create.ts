import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { home } from '../info';
import Db from '../lib/Db';

export async function create() {
    inquirer
        .prompt([
            {
                type: 'input',
                name: 'name',
                message: 'What is the name of the script?(with extension)',
                validate: async(value) => {
                    if (value.length) {
                        return true;
                    }
                    if (await Db.getScriptByName(value)) {
                        return 'Script with this name already exists.';
                    }
                    return 'Please enter a name.';
                },
            },
            {
                type: 'input',
                name: 'description',
                message: 'What is the description of the script?',
            },
            {
                type: 'confirm',
                name: 'reqAdmin',
                message: 'Does the script require admin rights?',
                default: false,
            },
        ])
        .then(async (answers) => {
            // create a new file with the name  in the home folder
            const filename = answers.name;
            const nameWithoutExtension = path.basename(
                filename,
                path.extname(filename)
            );
            const scriptpath = path.join(home, 'scripts', filename);
            fs.writeFileSync(scriptpath, 'echo This script isn\'t yet implemented.');
            // add to db
            await Db.addScript({
                name: nameWithoutExtension,
                description: answers.description,
                aliases: [filename],
                path: scriptpath,
                reqAdmin: answers.reqAdmin,
                enabled: true,
            });
            inquirer.prompt({
                type: 'confirm',
                name: 'editNow',
                message: 'Do you want to edit the script now?',
                default: true,
            }).then(async (answer) => {
                if (answer.editNow) {
                    await inquirer.prompt([{
                        name: 'scriptcontent',
                        message: 'edit your content!',
                        type: 'editor',
                        default: 'echo Input your script here, then save and close the editor.',
                        postfix: path.extname(filename),
                    }]).then(answers => {
                        //overrite the file with the new content
                        fs.writeFileSync(scriptpath, answers.scriptcontent);
                    })
                }
                //output : your script is done.
                console.log(chalk.green('Your script is done.'));
            });
        });
}
