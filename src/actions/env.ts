import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { scripthome } from '../info';
import Db from '../lib/Db';

export async function exportEnv(name: string, prefixed: boolean = true) {
    if(prefixed) name = `env-${name}`;
    if (await Db.getScriptByName(name)) {
        console.log(chalk.red('Script already existed.'));
        return;
    }
    // execute SET command to get all current environments and parse
    let envs;
    try {
        envs = await new Promise<string[]>((resolve, reject) => {
            const cp = require('child_process');
            cp.exec('SET', (err, stdout, stderr) => {
                if (err) {
                    reject([err, stderr]);
                } else {
                    const envs = stdout.split('\r').map(line => line.trim()).filter(line=>line.length>0);
                    resolve(envs);
                }
            });
        });
    } catch (e) {
        console.log(chalk.red('Failed to get environment variables.'));
        console.log(e);
        return;
    }
    const setcmd = envs.map((env) => `@SET ${env}`).join('\r');
    // create a new file with the name  in the home folder
    const scriptpath = path.join(scripthome(), `${name}.cmd`);
    
    if (fs.existsSync(scriptpath)) {
        console.log(chalk.red(`Script ${name}.cmd already exists.`));
        return;
    }

    // write setcmd to the file
    
    fs.writeFileSync(scriptpath, setcmd);

    await Db.addScript({
        name: name,
        description: "Exported environment variables",
        aliases: [`${name}.cmd`],
        path: scriptpath,
        reqAdmin: false,
        enabled: true,
    });
    console.log(chalk.green(`Script ${name}.cmd created. Run it anywhere to import environment variables like current session.`));
    console.log(chalk.yellow("Noticed that it will not delete or change any variables if not existed at this time."));
}