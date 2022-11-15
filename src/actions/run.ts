import { spawn } from 'child_process';
import fs from 'fs';
import chalk from 'chalk';
import { exec } from 'sudo-prompt';
import Db, { Script } from '../lib/Db';

export async function run(name, args, forceAdmin=false) {
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

export async function executeAsAdmin(script: Script, args) {
    const { path } = script;
    const cmd = `${path} ${args.join(' ')}`;
    exec(cmd, {
        name: "CMAND Script Manager",
    }, function (error, stdout, stderr) {
        if (error) throw error;
        console.log(stdout);
        console.error(stderr);
    });
}

export async function execute(script: Script, args) {
    // execute script in current cd
    const { path } = script;
    const child = spawn(path, args);
    child.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    child.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    child.on('close', (code) => {
        console.log(`script exited with code ${code}`);
    });
}
