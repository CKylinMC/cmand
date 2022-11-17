import fs from 'fs';
import chalk from 'chalk';
import Db, { Script } from '../lib/Db';
import { exceptSync } from '../lib/utils';

export async function setprop(name,props) {
    //check if existed
    const script = await Db.getScriptByName(name);
    if (!script) {
        console.log(chalk.red(`Script ${name} not found.`));
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

    if (propList.includes('enabled')) {
        const scriptpath = script.path;
        const isEnabled = props.enabled;
        try{
            if (fs.existsSync(scriptpath) && fs.statSync(scriptpath).isFile()) {
                if (isEnabled) {
                    console.log(chalk.green(`Script ${name} already enabled.`));
                } else {
                    exceptSync(()=>fs.unlinkSync(scriptpath + '.disabled'));
                    fs.renameSync(scriptpath, scriptpath + '.disabled');
                    console.log(chalk.yellow(`Script ${name} disabled.`));
                }
            } else if (fs.existsSync(scriptpath + '.disabled')&& fs.statSync(scriptpath + '.disabled').isFile()) {
                if (isEnabled) {
                    exceptSync(()=>fs.unlinkSync(scriptpath));
                    fs.renameSync(scriptpath + '.disabled', scriptpath);
                    console.log(chalk.green(`Script ${name} enabled.`));
                } else {
                    console.log(chalk.yellow(`Script ${name} already disabled.`));
                }
            } else {
                console.log(chalk.red(`Script ${name} not found. Is this script still valid?`));
            }
        } catch (e) {
            console.error(chalk.red('Error while setting script enabled property:'), e.message);
        }
    }

    // update the db
    await Db.updateScript(name, obj);
}
