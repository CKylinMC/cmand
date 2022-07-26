import fs from 'fs';
import path from 'path';
import { addDirToEnvPath } from '@pnpm/os.env.path-extender';
import { home } from '../info';

export function init() {
    // create dir if not existed
    if (!fs.existsSync(home)) {
        fs.mkdirSync(home);
    }
    if (!fs.existsSync(path.join(home, 'scripts'))) {
        fs.mkdirSync(path.join(home, 'scripts'));
    }
    return addDirToEnvPath(scripthome, {
        position: 'start',
        proxyVarName: 'CMAND_SCRIPTS',
        overwrite: true,
        configSectionName: 'cmand-scripts',
    });
}
