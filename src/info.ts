import path from 'path';
import homedir from 'homedir';

export const Info = {
    name: 'cmand',
    version: '0.5.2',
    description: 'A command line tool for managing your script snippets on Windows.',
    author: 'CKylinMC',
}
export const userhome = homedir();
export const home = path.join(userhome, '.cmand');
export const scripthome = path.join(home, 'scripts');
export const dbpath = path.join(home, 'data.db');
export const settingspath = path.join(home, 'settings.db');