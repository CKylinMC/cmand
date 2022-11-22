import chalk from 'chalk';
import { Settings } from "../lib/Db";

export async function setConfig(key, value) {
    Settings.set(key, value);
    console.log(chalk.green(`Config ${key} added.`));
    return;
}

export async function removeConfig(key) {
    Settings.remove(key);
    console.log(chalk.green(`Config ${key} removed.`));
    return;
}

export async function listConfig() {
    const configs = await Settings.list();
    for (const id of Object.keys(configs)) {
        const cfg = configs[id]
        console.log(chalk.green(`${cfg.key} = ${cfg.value}`));
    }
    return;
}

export async function getConfig(key) {
    const value = await Settings.get(key);
    console.log(chalk.yellow(key),'=',chalk.green(value));
    return;
}