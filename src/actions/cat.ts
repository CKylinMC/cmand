import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { highlight } from 'cli-highlight';
import Db from '../lib/Db';

export async function cat(name, color = true) {
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
    const contents = fs.readFileSync(script.path, 'utf8');
    const ext = path.extname(script.path);
    if (color)
        console.log(
            highlight(contents, {
                language: ext == '.cmd' ? 'dos' : ext.substring(1),
            })
        );
    else console.log(contents);
}
