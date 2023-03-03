import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'yaml';
import { scripthome } from '../info';
import Db from '../lib/Db';

export async function create(name = null) {
    const questions = [
        {
            type: 'input',
            name: 'name',
            message: 'What is the name of the script?(with extension)',
            validate: async (value) => {
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
    ];
    if (name) {
        if (name.length > 0 && !await Db.getScriptByName(name)) {
            questions.shift();
        } else {
            console.log(chalk.red('This name is already existed in your scripts.'));
            return;
        }
    }
    inquirer
        .prompt(questions)
        .then(async (answers) => {
            // create a new file with the name  in the home folder
            let filename = answers.name ?? name;
            if (filename.split('.').length === 1) {
                filename += '.cmd';
            }
            const nameWithoutExtension = path.basename(
                filename,
                path.extname(filename)
            );
            const scriptpath = path.join(scripthome(), filename);
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

export async function createTask(taskname, contents) {
    if (!fs.existsSync('./cmand.yml')) {
        fs.writeFileSync('./cmand.yml', '');
        console.log(chalk.yellow('cmand.yml not found, creating a new one.'));
    }
    const scripts = yaml.parse(fs.readFileSync('./cmand.yml', 'utf8')) || {};
    scripts[taskname] = contents;
    fs.writeFileSync('./cmand.yml', yaml.stringify(scripts));
    console.log(chalk.green('Task added into cmand.yml, run "cmand task ' + taskname + '" to run it.'));
}

export async function makeProxyScript(filename, alias=null, runner=null) {
    const sourcepath = path.resolve(process.cwd(), filename);
    
    if (!fs.existsSync(sourcepath)) {
        console.log(chalk.red(`Path ${sourcepath} not found.`));
        return;
    }
    console.log(chalk.blue(`Creating proxy script for ${filename}`));

    let info = {
        name: alias,
        description: '',
        sourcepath,
        batchcontent: '',
    }
    if (alias) {
        info.name = alias.trim().replace(/\s/, '_');
    } else {
        info.name = path.basename(sourcepath);
        console.log(chalk.yellow(`Alias not specified, using filename ${info.name} as alias.`));
    }
    if (fs.statSync(sourcepath).isFile()) {
        info.description = `Proxy script for file ${filename}`;
        if (runner) {
            info.batchcontent = `@${runner} "${sourcepath}" %*`;
        } else {
            info.batchcontent = `@"${sourcepath}" %*`;
        }
    } else {
        info.description = `Proxy script for folder ${filename}`;
        if (runner) {
            info.batchcontent = `@${runner} "${sourcepath}" %*`;
        } else {
            info.batchcontent = `@cmd /k cd /d "${sourcepath}"`;
        }
    }
    const scriptpath = path.join(scripthome(), info.name + ".cmd");
    if (fs.existsSync(scriptpath)) {
        console.log(chalk.red(`Script ${info.name}.cmd already exists.`));
        return;
    }
    fs.writeFileSync(scriptpath, info.batchcontent);
    await Db.addScript({
        name: info.name,
        description: info.description,
        aliases: [filename],
        path: scriptpath,
        reqAdmin: false,
        enabled: true,
    });
    console.log(chalk.green(`Proxy script ${info.name}.cmd created.`));
}