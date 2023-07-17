import chalk from 'chalk';
import { Settings } from "../lib/Db";

function isBlocked(key) {
    switch (key) {
        case 'repos':
            console.log(chalk.red('Please use "cmand repo" to manage repositories.'));
            return true;
    }
    return false;
}

export async function setConfig(key, value) {
    if(isBlocked(key)) return;
    Settings.set(key, value);
    console.log(chalk.green(`Config ${key} added.`));
    return;
}

export async function removeConfig(key) {
    if(isBlocked(key)) return;
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
    if(isBlocked(key)) return;
    const value = await Settings.get(key);
    console.log(chalk.yellow(key),'=',chalk.green(value));
    return;
}