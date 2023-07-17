import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import AdmZip from 'adm-zip';
import { md5, exceptSync, except, randstr, proxyedUrl } from '../lib/utils';
import md5File from 'md5-file';
import inquirer from 'inquirer';
import Db, { Settings } from '../lib/Db';
import { scripthome } from '../info';
import os from 'os';
import { execute } from './run';
import got from 'got';
import { Spinner } from '../lib/Spinner';
import ping from 'ping';

export async function searchCloud(
    name,
    askdownload = false,
    download = false,
    output = true
) {
    const allowedRepofileVerion = [1];
    const err = (...msg) => output && console.log(...msg);
    const log = (...msg) => console.log(...msg);
    const asUrlbase = (url) => (url.endsWith('/') ? url : url + '/');
    if (!(await Settings.get('allow_remote_install', true))) {
        err(chalk.red('Remote install is disabled.'));
        return [false, '', ''];
    }

    let repos = await Settings.get('repos', []);
    if (repos.length === 0) {
        err(chalk.red('No repository found.'));
        return [false, '', ''];
    }

    let pkg;
    let userepo;
    let repolist;
    let repofile;
    let reposource;
    let cfproxy = await Settings.get('cfproxy', '');;

    for (const repoinfo of repos) {
        if (!repoinfo.load) continue;
        let listurl = repoinfo.json;
        listurl = proxyedUrl(cfproxy, listurl);
        let list;
        try {
            list = await got(listurl).json();
        } catch (e) {
            log(
                chalk.red(
                    'Failed to get repo list.',
                    'repo =',
                    repoinfo.tag ?? repoinfo.json ?? '?'
                )
            );
            continue;
        }
        if (!list) {
            log(
                chalk.red(
                    'Repolist file is invalid.',
                    'repo =',
                    repoinfo.tag ?? repoinfo.json ?? '?'
                )
            );
            continue;
        }
        if (
            !(
                'repofile' in list &&
                'version' in list &&
                'urlbase' in list &&
                'reposource' in list &&
                'pkgs' in list
            )
        ) {
            log(
                chalk.red(
                    'Repolist file is invalid.',
                    'repo =',
                    repoinfo.tag ?? repoinfo.json ?? '?'
                )
            );
            continue;
        }
        if (!allowedRepofileVerion.includes(list.version)) {
            log(
                chalk.red(
                    'Repolist file version is not supported.',
                    'repo =',
                    repoinfo.tag ?? repoinfo.json ?? '?'
                )
            );
            continue;
        }
        reposource = list.reposource;
        let repo = list.repofile;
        repofile = repo;
        const pkgs = list.pkgs;
        const disableBanner = await Settings.get('disable_banner', false);
        if (!disableBanner && 'banner' in list) {
            log(`========================[BANNER]========================`);
            log(list.banner);
            log(`========================================================`);
        }
        log(chalk.gray(`Searching ${name} in ${repo}...`));
        pkg = pkgs.find((pkg) => pkg.name === name);
        if (!pkg) {
            continue;
        }
        userepo = repoinfo;
        repolist = list;
    }
    if (!pkg) {
        log(chalk.red(`Package ${name} not found.`));
        return [true, '', ''];
    }
    log(chalk.green(`Package ${name} found.`));
    log(`=========================[INFO]=========================`);
    log(`${chalk.gray('Name:')} ${pkg.name}`);
    log(`${chalk.gray('Fullname:')} ${pkg.fullname}`);
    log(`${chalk.gray('Description:')} ${pkg.description ?? ''}`);
    log(`${chalk.gray('Size:')} ${pkg.size ?? ''}`);
    log(`${chalk.gray('Author:')} ${pkg.author ?? ''}`);
    log(`${chalk.gray('Repo:')} ${userepo.name ?? userepo.tag ?? ''}`);
    log(`========================================================`);
    if (askdownload) {
        const { download } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'download',
                message: 'Download?',
                default: true,
            },
        ]);
        if (!download) {
            return [true, '', ''];
        }
    } else if (!download) {
        return [true, '', ''];
    }
    const source_types = repolist.sources;
    // console.log({list})
    let urlbase = asUrlbase(repolist.urlbase);
    let source_type = 'default';
    if (source_types) {
        source_type = await Settings.get('source', '');
        if (!source_type || !source_types.hasOwnProperty(source_type)) {
            source_type = await determineSource(source_types, true);
            await Settings.set('source', source_type);
        }
        urlbase = asUrlbase(source_types[source_type]);
        // console.log({source_type,source_types,urlbase,listbase:list.urlbase});
    }
    console.log(chalk.gray(`Using ${source_type} as source.`));
    const temp = path.join(os.tmpdir(), 'cmand-dl-run-' + randstr());
    const spinner = new Spinner(chalk.gray(`Preparing to download...`)).start();
    try {
        exceptSync(() => fs.mkdirSync(temp));
        let downloadUrl = `${urlbase}${reposource}/${pkg.path}`;
        downloadUrl = proxyedUrl(cfproxy, downloadUrl);
        const filename = path.basename(pkg.path);
        const filepath = path.join(temp, filename);
        // console.log({ downloadUrl, filepath });
        spinner.text(chalk.gray(`Downloading ${pkg.name} from ${userepo.name}...`));
        await new Promise((r, j) => {
            const stream = got.stream(downloadUrl);
            stream.on('error', j);
            const writer = fs.createWriteStream(filepath);
            writer.on('error', j);
            writer.on('finish', r);

            let lastdata = 0;
            let lastTime = Date.now();
            let speed = 0;
            stream.on('downloadProgress', ({ transferred, total, percent }) => {
                const now = Date.now();
                const diff = transferred - lastdata;
                if (now - lastTime > 1000) {
                    speed = diff;
                    lastTime = now;
                    lastdata = transferred;
                }
                const speedKB = Math.round(speed / 1024);
                const percentage = isNaN(total)
                    ? '?'
                    : Math.round(percent * 100);
                const transferredMB = isNaN(total)
                    ? '?'
                    : Math.round(transferred / 1024 / 10.24) / 100;
                const totalMB = isNaN(total)
                    ? '?'
                    : Math.round(total / 1024 / 10.24) / 100;
                const speedTxt = speed != 0 ? ` - ${speedKB} KB/s` : '';
                spinner.text(
                    chalk.gray(
                        `Downloading... ${transferredMB} MB / ${totalMB} MB (${percentage}%)${speedTxt}`
                    )
                );
            });
            stream.pipe(writer);
        });
        spinner.text(chalk.gray(`Verifying...`));
        const md5sum = await md5File(filepath);
        if (md5sum !== pkg.md5) {
            spinner.fail(chalk.red(`Downloaded file is corrupted.`));
            throw new Error();
        }
        spinner.success(chalk.green(`Downloaded ${pkg.name} from ${userepo.name}.`));
        return [true, filepath, temp];
    } catch (e) {
        spinner.fail(chalk.red(`Failed to download ${pkg.name}.`));
        // console.log(e);
        try {
            exceptSync(() => fs.unlinkSync(temp));
        } catch (e) {}
        return [true, '', ''];
    }
}

export async function importPackage(targetpath, y = false) {
    const allowedPackageVersion = [1];
    let targetPath = targetpath;
    let removeTemp = false;
    let tempPath = '';
    const removeTempFile = () => {
        if (!removeTemp) return;
        try {
            exceptSync(() => fs.rmSync(tempPath, { recursive: true }));
        } catch (e) {}
    };
    if (!fs.existsSync(targetpath) || !fs.statSync(targetpath).isFile()) {
        if (
            fs.existsSync(targetpath + '.cmdpkg') &&
            fs.statSync(targetpath + '.cmdpkg').isFile()
        ) {
            targetPath = targetpath + '.cmdpkg';
        } else {
            const res = await searchCloud(targetPath, !y, y, false);
            if (!res[0]) {
                console.log(chalk.red(`Package ${targetpath} not found.`));
                return;
            }
            if ((res[1] as string).length == 0) {
                return;
            }
            tempPath = res[2] as string;
            targetPath = res[1] as string;
            removeTemp = true;
        }
    }

    console.log(chalk.gray(`Reading package ${targetPath}...`));

    const zip = new AdmZip(targetPath);
    const zipEntries = zip.getEntries();
    const fileList = {};
    for (const entry of zipEntries) {
        fileList[entry.entryName] = entry;
    }

    if (!fileList['metadata.json']) {
        console.log(chalk.red(`Package ${targetPath} is not a valid package.`));
        removeTempFile();
        return;
    }

    let metadata;
    try {
        metadata = JSON.parse(zip.readAsText(fileList['metadata.json']));
    } catch (e) {
        console.log(chalk.red(`Package ${targetPath} is not a valid package.`));
        removeTempFile();
        return;
    }

    if (
        !metadata.cmandpkgver ||
        !allowedPackageVersion.includes(metadata.cmandpkgver)
    ) {
        console.log(
            chalk.red(
                `Package ${targetPath} is not compatiable with current CMAND version.`
            )
        );
        removeTempFile();
        return;
    }

    if (
        !metadata.name ||
        !metadata.description ||
        !metadata.author ||
        !metadata.modified ||
        !metadata.size ||
        !metadata.type ||
        !metadata.include ||
        !metadata.scripts
    ) {
        console.log(chalk.red(`Metadata of package ${targetPath} is invalid.`));
        removeTempFile();
        return;
    }

    console.log(chalk.gray(`Preparing install package ${metadata.name}...`));
    let overrideList = [];
    for (let script of metadata.scripts) {
        if (
            !script.name ||
            !script.filename ||
            !script.description ||
            !script.md5
        ) {
            console.log(
                chalk.red(
                    `Metadata of script ${script.filename} in package ${metadata.name} is invalid.`
                )
            );
            removeTempFile();
            return;
        }
        if (!fileList['scripts/' + script.filename]) {
            console.log(
                chalk.red(
                    `Script ${script.filename} in package ${metadata.name} is not found.`
                )
            );
            removeTempFile();
            return;
        }
        const entry = fileList['scripts/' + script.filename];
        if (script.md5 != md5(zip.readAsText(entry))) {
            console.log(
                chalk.red(
                    `Script ${script.name} in package ${metadata.name} is corrupted.`
                )
            );
            removeTempFile();
            return;
        }
        if (await Db.getScriptByName(script.name)) {
            console.log(
                chalk.yellow(
                    `Script ${script.name} in package ${metadata.name} already exists, it will be overrided.`
                )
            );
            overrideList.push(script.name);
        }
    }

    for (let resource of metadata.include) {
        if (!resource.path || !resource.md5) {
            console.log(
                chalk.red(
                    `Metadata of resource ${resource.path} in package ${metadata.name} is invalid.`
                )
            );
            removeTempFile();
            return;
        }
        if (!fileList['include/' + resource.path]) {
            console.log(
                chalk.red(
                    `Resource ${resource.path} in package ${metadata.name} is not found.`
                )
            );
            removeTempFile();
            return;
        }
    }

    console.log(chalk.green(`Package ${metadata.name} is ready to install.\n`));
    console.log('===========================[INFO]===========================');
    console.log(`${chalk.gray('Name:')} ${metadata.name}`);
    console.log(`${chalk.gray('Description:')} ${metadata.description}`);
    console.log(`${chalk.gray('Author:')} ${metadata.author}`);
    console.log(`${chalk.gray('Modified:')} ${metadata.modified}`);
    console.log(
        `${chalk.gray('Size:')} ${Math.round(
            metadata.size / 1000
        )} KB (in Metadata)`
    );
    console.log(`${chalk.gray('Resources:')} ${metadata.include.length}`);
    console.log(
        `${chalk.gray('Scripts:')} ${metadata.scripts.length} (All verified)`
    );
    console.log('==========================[SCRIPT]==========================');
    for (let file of metadata.scripts) {
        const isOverride = overrideList.includes(file.name);
        console.log(
            `${isOverride ? '* ' : '+ '}${chalk[isOverride ? 'yellow' : 'blue'](
                file.filename
            )} (${chalk.gray(file.description)})`
        );
    }
    if (metadata.beforeInstallBanner) {
        console.log(
            '==========================[README]=========================='
        );
        console.log(metadata.beforeInstallBanner);
    }
    console.log('============================================================');
    if (!y) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to continue?',
                default: false,
            },
        ]);
        if (!answers.confirm) {
            console.log(chalk.yellow('Installation cancelled.'));
            removeTempFile();
            return;
        }
    }
    console.log(chalk.yellow(`Installing ${metadata.name}...`));
    try {
        let scriptObjs = [];
        for (let script of metadata.scripts) {
            console.log(chalk.gray(`Adding script ${script.filename}...`));
            const entry = fileList['scripts/' + script.filename];
            const scriptpath = path.join(scripthome(), script.filename);
            const obj = {
                name: script.name,
                description: script.description,
                aliases: [script.filename],
                path: scriptpath,
                reqAdmin: script.reqAdmin ?? false,
                enabled: true,
            };
            scriptObjs.push(obj);
            exceptSync(() => fs.unlinkSync(scriptpath));
            zip.extractEntryTo(entry, scripthome(), false, true, false);
            await except(() => Db.removeScriptByName(script.name));
            await Db.addScript(obj);
        }
        const resourceList = [];
        for (let resource of metadata.include) {
            console.log(chalk.gray(`Extracting resource ${resource.path}...`));
            const entry = fileList['include/' + resource.path];
            const resourcepath = path.join(
                scripthome(),
                'include',
                resource.path
            );
            resourceList.push({ resource, resourcepath, entry });
            zip.extractEntryTo(entry, scripthome(), true, true, false);
        }
        let errorMark = false;
        for (let res of resourceList) {
            console.log(
                chalk.gray(`Verifing resource ${res.resource.path}...`)
            );
            const hash = res.resource.md5;
            const file = res.resourcepath;
            const realhash = await md5File(file);
            if (!hash || hash != realhash) {
                console.log(
                    chalk.red(`Resource ${res.resource.path} is corrupted.`)
                );
                errorMark = true;
                break;
            }
        }
        if (errorMark) {
            console.log(
                chalk.red(`Installation failed: files broken. Cleaning up...`)
            );
            for (let res of resourceList) {
                exceptSync(() => fs.unlinkSync(res.resourcepath));
            }
            for (let script of scriptObjs) {
                exceptSync(() => fs.unlinkSync(script.path));
            }
            removeTempFile();
            return;
        }
        if (metadata.postInstallScript) {
            console.log(chalk.gray('Executing post-install script...'));
            try {
                await new Promise((r, j) => {
                    fs.mkdtemp(
                        path.join(os.tmpdir(), 'cmand-postinstall-run-'),
                        async (err, dir) => {
                            if (err) {
                                console.error(
                                    chalk.red(
                                        'Error creating temp dir to run script:'
                                    ),
                                    err
                                );
                                j(err);
                                return;
                            }
                            const scriptName = path.join(dir, 'script.cmd');
                            fs.writeFileSync(
                                scriptName,
                                '@echo off\n' +
                                    metadata.postInstallScript.toString()
                            );
                            await execute(
                                {
                                    name: 'postinstall',
                                    aliases: [],
                                    description: '',
                                    path: scriptName,
                                    reqAdmin: false,
                                    enabled: true,
                                },
                                []
                            );
                            r(1);
                        }
                    );
                });
            } catch (e) {
                console.error(chalk.red('Error running script:'), e);
                throw new Error();
            }
        }
        console.log(chalk.green('\nInstallation completed.'));
        removeTempFile();
    } catch (e) {
        console.log(chalk.red(`\nFailed to install package ${metadata.name}.`));
        // console.log(chalk.red(e));
        removeTempFile();
        return;
    }
    /*

    const metadata = {
        cmandpkgver: 1,
        name: script.name,
        description: script.description,
        author: process.env.USERNAME,
        modified: new Date(stat.mtime).toLocaleString(),
        size: stat.size,
        type: ext.substring(1),
        include: [],
        scripts: [
            {
                name: script.name,
                description: script.description,
                md5: md5File.sync(script.path),
            }
        ],
    };
    */
}

function _pingTimeIsValid(time: Number | 'unknown'): time is Number {
    // Telling typescript that time is a number
    return !!time || true;
}

async function determineSource(sources, verbose = false, spinner = null) {
    if (verbose) {
        if (!spinner) {
            spinner = new Spinner('Determining fastest source...').start();
        }
    }
    const fastest = {
        source: await Settings.get('source', 'github'),
        time: Infinity,
    };
    const autoCheck = await Settings.get('auto_select_source', true);
    if (!!autoCheck) {
        for (const sourceName in sources) {
            const sourceUrl = getHostname(sources[sourceName]);
            if (verbose) spinner.text(`Testing source ${sourceName}...`);
            const result = await ping.promise.probe(sourceUrl, {
                timeout: 2,
            });
            if (result.alive && _pingTimeIsValid(result.time)) {
                if (verbose) spinner.log(`${sourceName} => ${result.time} ms`);
                if (result.time < fastest.time) {
                    fastest.source = sourceName;
                    fastest.time = result.time;
                }
            } else {
                if (verbose)
                    spinner.log(`Source ${sourceName} is not reachable.`);
            }
        }
        if (verbose)
            spinner.success(
                `Fastest source is ${fastest.source} with ${fastest.time}ms.`
            );
    }
    if (verbose) await new Promise((r) => setTimeout(r, 10));
    return fastest.source;
}

function getHostname(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch (err) {
        return url;
    }
}
