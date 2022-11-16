import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';
import { exec as sudo } from 'sudo-prompt';
import Db, { Script } from '../lib/Db';

export async function run(name, args, forceAdmin = false) {
    
    if (await runLocalScripts(name, args)) {
        return;// run local script
    }

    //check if existed
    const script = await Db.getScriptByNameOrAlias(name);
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
    if (!Array.isArray(args)) args = [];
    if (script.reqAdmin||forceAdmin) executeAsAdmin(script, args.slice(2));
    else execute(script, args.slice(2));
}

export async function runLocalScripts(taskname, args, output=true):Promise<any> {// return script found, not script successfully executed
    if (!fs.existsSync('./cmand.yml')) {
        if(output)console.log(chalk.red('cmand.yml not found.'));
        return false;
    }
    const scripts = yaml.parse(fs.readFileSync('./cmand.yml').toString());
    if (!scripts[taskname]) {
        if(output)console.log(chalk.red(`Task ${taskname} not found.`));
        return false;
    }
    try {
        fs.mkdtemp(path.join(os.tmpdir(), "cmand-local-run-"), async (err, dir) => {
            if (err) {
                if (output) console.error(chalk.red('Error creating temp dir to run script:'), err);
                return;
            }
            const scriptName = path.join(dir, 'script.cmd');
            fs.writeFileSync(scriptName, scripts[taskname].toString());
            console.log(chalk.gray('> Task: ' + taskname));
            await execute({
                name: taskname,
                aliases: [],
                description: '',
                path: scriptName,
                reqAdmin: false,
                enabled: true,
            }, args);
        });
    } catch (e) {
        if(output)console.error(chalk.red('Error running script:'), e);
    }
    return true;
}

export async function executeAsAdmin(script: Script, args) {
    const { path } = script;
    const cmd = `${path} ${args.join(' ')}`;
    const starttime = new Date().getTime();
    sudo(cmd, {
        name: "CMAND Script Manager",
    }, function (error, stdout, stderr) {
        const endtime = new Date().getTime();
        if (error) {
            console.error(chalk.red('Error running script:'), error);
            return;
        }
        console.log(stdout);
        console.error(stderr);
        console.log(chalk.gray(`script executed in ${Math.floor((endtime - starttime)/100000)*100}ms.`));
    });
}

export async function execute(script: Script, args) {
    // execute script in current cd
    const { path } = script;
    const starttime = new Date().getTime();
    const child = spawn(path, args);
    child.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    child.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    child.on('close', (code) => {
        const endtime = new Date().getTime();
        console.log(chalk.gray(`script exited with code ${code} in ${Math.floor((endtime - starttime)/100000)*100}ms.`));
    });
}
