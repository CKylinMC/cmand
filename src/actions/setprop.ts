import fs from 'fs';
import chalk from 'chalk';
import Db, { Script } from '../lib/Db';

export async function setprop(name,props) {
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
    // get all prop from props which in interface Script
    const propList = Object.keys(props);
    const availabledProps = Object.keys(script);
    const obj: unknown | Script = {};
    for (const prop of propList) {
        if (availabledProps.includes(prop)) {
            obj[prop] = props[prop];
        }
    }
    // update the db
    await Db.updateScript(name, obj);
}
