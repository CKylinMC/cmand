import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { scripthome } from '../info';
import Db from '../lib/Db';

export async function alias(name = '', runathere = false, commands) {
    if (name.length === 0) {
        console.log(chalk.red('Alias name can NOT be empty.'));
        return;
    }
    if (await Db.getScriptByName(name)) {
        console.log(chalk.red('This name is already existed in your scripts.'));
        return;
    }
    if (name.split('.').length === 1) {
        name += '.cmd';
    }
    const nameWithoutExtension = path.basename(
        name,
        path.extname(name)
    );
    const scriptpath = path.join(scripthome(), name);
    // remove first two items
    commands.splice(0, 2);
    if (runathere) {
        const content = [
            (path.extname(name) == '.cmd' ? '@echo off' : ''),
            "set cmandaliasorgdir=%CD%",
            `cd /d "${process.execPath}"`,
            commands.join(' ')+(path.extname(name)=='.cmd'?'%*':'')
        ].filter(i => i.length).join('\n');
        fs.writeFileSync(scriptpath, content);
    } else {
        fs.writeFileSync(scriptpath, (path.extname(name)=='.cmd'?'@':'')+commands.join(' ')+(path.extname(name)=='.cmd'?'%*':''));
    }
    // add to db
    await Db.addScript({
        name: nameWithoutExtension,
        description: `Alias script of '${commands.join(' ').substring(0,20)}...'`,
        aliases: [name],
        path: scriptpath,
        reqAdmin: false,
        enabled: true,
    });
    console.log(chalk.green('Your script is done.'));
}
