import fs from 'fs';
import { addDirToEnvPath } from '@pnpm/os.env.path-extender';
import { home, scripthome, setHome, setScriptHome } from '../info';

export function init(): Promise<any> {
    if (process.env.CMAND_HOME) {
        if (fs.existsSync(process.env.CMAND_HOME))
            setHome(process.env.CMAND_HOME);
    } else if (!fs.existsSync(home)) {
        fs.mkdirSync(home);
    }
    if (!fs.existsSync(scripthome())) {
        fs.mkdirSync(scripthome());
    }
    const cmdpath = process.env.PATH;
    const nocheck = process.env.CMAND_NOPATHCHECK;
    if (!nocheck&&(!cmdpath || cmdpath.toLowerCase().indexOf('cmand')==-1))
        return addDirToEnvPath(scripthome(), {
            position: 'start',
            proxyVarName: 'CMAND_SCRIPTS',
            overwrite: true,
            configSectionName: 'cmand-scripts',
        }).then(() => {
            console.log("[FIRST RUN] Added CMAND_SCRIPTS variable into your PATH variable. Remeber to remove it if you dont use cmand any more.");
            return Promise.resolve();
        });
    const scriptpath = process.env.CMAND_SCRIPTS;
    if (scriptpath&&fs.existsSync(scriptpath)) setScriptHome(scriptpath);
    return Promise.resolve();
}
