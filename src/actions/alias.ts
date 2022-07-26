import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { home } from '../info';
import Db from '../lib/Db';

export async function alias(name = '', commands) {
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
    const scriptpath = path.join(home, 'scripts', name);
    fs.writeFileSync(scriptpath, (path.extname(name)=='cmd'?'@':'')+commands.join(' ')+(path.extname(name)=='cmd'?'%*':''));
    // add to db
    await Db.addScript({
        name: nameWithoutExtension,
        description: "Alias script",
        aliases: [name],
        path: scriptpath,
        reqAdmin: false,
        enabled: true,
    });
    console.log(chalk.green('Your script is done.'));
}
