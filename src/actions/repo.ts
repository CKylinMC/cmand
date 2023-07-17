import chalk from 'chalk';
import { Settings } from '../lib/Db';
import got from 'got';

export async function listRepos() {
    console.log('Package repositories:');
    console.log('='.repeat(24));
    const repos = await Settings.get('repos', []);
    if (repos.length) {
        for (const repo of repos) {
            console.log(chalk.bold(chalk.cyan(repo.name)),' - ',repo.tag);
            console.log('\tDescription:', repo.desc);
            console.log('\tList file:', repo.json);
            console.log('\tLoad:', chalk.bold(repo.load ? (chalk.green('Yes')) : (chalk.red('No'))));
            console.log('');
        }
    } else {
        console.log(chalk.yellow('No repositories found. Try adding one with "cmand repo add" or "cmand repo import".'));
    }
}

export async function removeRepo(tagname) {
    const repos = await Settings.get('repos', []);
    const repo = repos.find(r => r.tag === tagname);
    if (!repo) {
        console.log(chalk.red(`Repository ${tagname} not found.`));
        return;
    }
    repos.splice(repos.indexOf(repo), 1);
    await Settings.set('repos', repos);
    console.log(chalk.green(`Repository ${tagname} removed.`));
    return;
}

export async function enableRepo(tagname) {
    const repos = await Settings.get('repos', []);
    const repo = repos.find(r => r.tag === tagname);
    if (!repo) {
        console.log(chalk.red(`Repository ${tagname} not found.`));
        return;
    }
    repo.load = true;
    await Settings.set('repos', repos);
    console.log(chalk.green(`Repository ${tagname} enabled.`));
    return;
}

export async function disableRepo(tagname) {
    const repos = await Settings.get('repos', []);
    const repo = repos.find(r => r.tag === tagname);
    if (!repo) {
        console.log(chalk.red(`Repository ${tagname} not found.`));
        return;
    }
    repo.load = false;
    await Settings.set('repos', repos);
    console.log(chalk.green(`Repository ${tagname} disabled.`));
    return;
}

export async function addRepo(tagname, name, json, desc) {
    const repos = await Settings.get('repos', []);
    if (repos.find(r => r.tag === tagname)) {
        console.log(chalk.red(`Repository ${tagname} already exists.`));
        return;
    }
    repos.push({
        tag: tagname,
        name,
        json,
        desc,
        load: true
    });
    await Settings.set('repos', repos);
    console.log(chalk.green(`Repository ${tagname} added.`));
    return;
}

async function importRepo(importData) {
    if (!importData.tag || !importData.name || !importData.json || !importData.desc) {
        console.log(chalk.red(`Invalid import data. (Missing fields)`));
        return;
    }
    if (!importData.json.startsWith('http')) {
        console.log(chalk.red(`Invalid import data. (Field json must be full path)`));
        return;
    }
    if (!/^[a-z0-9]{3,30}$/gm.test(importData.tag)) {
        console.log(chalk.red(`Invalid import data. (Field tag must be 3-30 characters long and only contains lowercase letters and numbers)`));
        return;
    }
    return addRepo(importData.tag, importData.name, importData.json, importData.desc);
}

export async function importFromUrl(url) {
    /*
    url=> https://some/path/to/import.json
    import.json: {
        tag: 'cmdpkg',
        name: 'ckylinmc/cmdpkg_repo',
        json: 'https://cdn.staticaly.com/gh/ckylinmc/cmdpkg_repo/main/list.json',
        desc: 'CKylinMC\'s repo'
    }
    */
    let importData;
    try {
        importData = await got(url).json();
    } catch (e) {
        console.log(chalk.red(`Failed to import from ${url}.`));
        return;
    }
    return importRepo(importData);
}

export async function importFromB64(b64) {
    let importData;
    try {
        importData = JSON.parse(Buffer.from(b64, 'base64').toString());
    } catch (e) {
        console.log(chalk.red(`Failed to import from base64.`));
        return;
    }
    return importRepo(importData);
}


export async function deleteRepo(tag) {
    const repos = await Settings.get('repos', []);
    const repo = repos.find(r => r.tag === tag);
    if (!repo) {
        console.log(chalk.red(`Repository ${tag} not found.`));
        return;
    }
    repos.splice(repos.indexOf(repo), 1);
    await Settings.set('repos', repos);
    console.log(chalk.green(`Repository ${tag} deleted.`));
    return;
}