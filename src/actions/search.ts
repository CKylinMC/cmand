import chalk from 'chalk';
import got from 'got/dist/source';
import Db, { CONSTS, Settings } from "../lib/Db";
import { proxyedUrl } from '../lib/utils';

export async function search(searchText) {
    const scripts = await Db.searchScripts(new RegExp(searchText,'ig'));
    if (scripts.length === 0) {
        console.log(chalk.yellow('No script match your input.'));
    } else {
        console.log('Scripts matched "'+searchText+'":');
        scripts.forEach(script => {
            console.log(chalk[script.enabled ? 'green' : 'red'](script.reqAdmin?`*`:' ',`${chalk.bold(script.name)}${script.description.length?chalk.magenta(' - '+script.description):''} (${chalk.gray(script.path)})`));
        });
    }
    searchRemote(searchText);
}

export async function searchRemote(searchText):Promise<any> {
    const allowedRepofileVerion = [1];
    const log = console.log;
    if (!(await Settings.get('allowRemoteInstall', true))) {
        return;
    }
    let listurl = await Settings.get('repolist', CONSTS.REPO_LIST);
    if (listurl != CONSTS.REPO_LIST) {
        log(chalk.yellow('Using custom repo list url: ' + listurl));
    }
    if(!listurl||listurl.length===0) {
        log(chalk.red('No repo list url found.'));
        return;
    }
    let cfproxy = await Settings.get('cfproxy', '');
    listurl = proxyedUrl(cfproxy, listurl);
    let list;
    try {
        list = await got(listurl).json();
    } catch (e) {
        log(chalk.red('Failed to get repo list.'));
        return;
    }
    if (!list) {
        log(chalk.red('Repolist file is invalid.'));
        return;
    }
    if (!(('repofile' in list) && ('version' in list) && ('urlbase' in list) && ('reposource' in list) && ('pkgs' in list))) {
        log(chalk.red('Repolist file is invalid.'));
        return;
    }
    if (!allowedRepofileVerion.includes(list.version)) {
        log(chalk.red('Repolist file version is not supported.'));
        return [false,'',''];
    }
    // const urlbase = list.urlbase.endsWith('/') ? list.urlbase : list.urlbase + '/';
    // const reposource = list.reposource;
    // const repo = list.repofile;
    const pkgs = list.pkgs;
    // if ('banner' in list) {
    //     log(`========================[BANNER]========================`)
    //     log(list.banner);
    //     log(`========================================================`)
    // }
    // log(chalk.gray(`Searching ${searchText} in ${repo}...`));
    const matches = pkgs.filter(pkg => pkg.name.indexOf(searchText)>-1);
    if (!matches || matches.length === 0) {
        // log(chalk.red(`Package ${searchText} not found in current repo.`));
        return;
    }
    log(`\nRemote results matched your input:`)
    for (const pkg of matches) {
        log(`  ${chalk.green(pkg.name)} (${pkg.fullname}) - ${pkg.description ?? 'No description'} (${pkg.author ?? ''}) - ${pkg.size}`);
    }
    return;
}