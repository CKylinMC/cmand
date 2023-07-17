import chalk from 'chalk';
import got from 'got/dist/source';
import Db, { Settings } from "../lib/Db";
import { Spinner } from '../lib/Spinner';
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
    if (!(await Settings.get('allow_remote_install', true))) {
        return;
    }

    let repos = await Settings.get('repos', []);
    if (repos.length === 0) {
        log(chalk.red('No repository found.'));
        return;
    }

    const results = [
        /*{
            name: 'reponame',
            results: []
        }*/
    ];
    const spinner = new Spinner("Searching on remote repostory...").start();

    for (const repo of repos) {
        if (!repo.load) continue;
        let listurl = repo.json;
        let cfproxy = await Settings.get('cfproxy', '');
        listurl = proxyedUrl(cfproxy, listurl);
        let list;
        try {
            list = await got(listurl).json();
            spinner.replace();
        } catch (e) {
            log(chalk.red('Failed to get repo list.','repo =',repo.tag??repo.json??'?'));
            continue;
        }
        if (!list) {
            log(chalk.red('Repolist file is invalid.','repo =',repo.tag??repo.json??'?'));
            continue;
        }
        if (!(('repofile' in list) && ('version' in list) && ('urlbase' in list) && ('reposource' in list) && ('pkgs' in list))) {
            log(chalk.red('Repolist file is invalid.','repo =',repo.tag??repo.json??'?'));
            continue;
        }
        if (!allowedRepofileVerion.includes(list.version)) {
            log(chalk.red('Repolist file version is not supported.','repo =',repo.tag??repo.json??'?'));
            continue;
        }
        const pkgs = list.pkgs;
        const matches = pkgs.filter(pkg => pkg.name.indexOf(searchText)>-1);
        if (!matches || matches.length === 0) {
            // log(chalk.red(`Package ${searchText} not found in current repo.`));
            continue;
        }
        results.push({
            name: repo.name ?? repo.tag ?? repo.json ?? '?',
            results: matches
        });
    }
    log(`\nRemote results matched your input:\n`);
    for (const result of results) {
        console.log(chalk.bold(chalk.cyan(result.name)));
        for (const pkg of result.result) {
            log(`\t${chalk.green(pkg.name)} (${pkg.fullname}) - ${pkg.description ?? 'No description'} (${pkg.author ?? ''}) - ${pkg.size}`);
        }
        console.log('');
    }
    return;
}