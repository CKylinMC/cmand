import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { home } from '../info';
import Db from "../lib/Db";

export async function add(scriptpath='', name=null, description='',reqAdmin=false) {
    // convert scriptpath to full path
    scriptpath = path.resolve(process.cwd(), scriptpath);
    // check if script exists and is a executable file
    if (!fs.existsSync(scriptpath)) {
        console.log(chalk.red(`Script ${scriptpath} not found.`));
        return;
    }
    if (!fs.statSync(scriptpath).isFile()) {
        console.log(chalk.red(`${scriptpath} is not a file.`));
        return;
    }
    // get filename without extension
    const filename = path.basename(scriptpath, path.extname(scriptpath));
    const callname = name??filename;
    // check if script already exists by name
    if (await Db.getScriptByName(filename)) {
        console.log(chalk.red(`Script ${filename} already exists.`));
        return;
    }
    // check if script already exists by path
    if (await Db.getScriptByPath(scriptpath)) {
        console.log(chalk.red(`Script ${scriptpath} already exists.`));
        return;
    }
    // copy to home
    const newpath = path.join(home, 'scripts', `${filename}${path.extname(scriptpath)}`);
    fs.copyFileSync(scriptpath, newpath);
    // add to db
    await Db.addScript({
        name: callname,
        description,
        aliases: [filename, `${filename}${path.extname(scriptpath)}`],
        path: newpath,
        reqAdmin,
        enabled: true
    });
    console.log(chalk.green(`Script ${filename} added.`));
    return;
}