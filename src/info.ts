import path from 'path';
import homedir from 'homedir';

export const Info = {
    name: 'cmand',
    version: '0.8.1-beta',
    description: 'A command line tool for managing your script snippets on Windows.',
    author: 'CKylinMC',
}
const userhome = homedir();
export let home = path.join(userhome, '.cmand');
export let scripthome = () => path.join(home, 'scripts');
export let includeshome = () => path.join(scripthome(), 'include');
export const dbpath = () => path.join(home, 'data.db');
export const settingspath = () => path.join(home, 'settings.db');
export const setHome = (p) => home = p;
export const setScriptHome = (p) => scripthome = () => p;
