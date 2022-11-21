import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import AdmZip from 'adm-zip';
import { md5, exceptSync, except } from '../lib/utils';
import md5File from 'md5-file';
import inquirer from 'inquirer';
import Db from '../lib/Db';
import { home } from '../info';
import os from 'os';
import { execute } from './run';


export async function importPackage(targetpath,y=false) {
    const allowedPackageVersion = [1];
    let targetPath = targetpath;
    if (!fs.existsSync(targetpath) || !fs.statSync(targetpath).isFile()) {
        if (fs.existsSync(targetpath + '.cmdpkg') || fs.statSync(targetpath + '.cmdpkg').isFile()) {
            targetPath = targetpath + '.cmdpkg';
        } else {
            console.log(chalk.red(`Package ${targetpath} not found.`));
            return;
        }
    }

    console.log(chalk.yellow(`Reading package ${targetPath}...`));

    const zip = new AdmZip(targetPath);
    const zipEntries = zip.getEntries();
    const fileList = {};
    for (const entry of zipEntries) {
        fileList[entry.entryName] = entry;
    }

    if (!fileList['metadata.json']) {
        console.log(chalk.red(`Package ${targetPath} is not a valid package.`));
        return;
    }

    let metadata;
    try {
        metadata = JSON.parse(zip.readAsText(fileList['metadata.json']));
    } catch (e) {
        console.log(chalk.red(`Package ${targetPath} is not a valid package.`));
    }

    if (!metadata.cmandpkgver || !allowedPackageVersion.includes(metadata.cmandpkgver)) {
        console.log(chalk.red(`Package ${targetPath} is not compatiable with current CMAND version.`));
        return;
    }

    if (!metadata.name || !metadata.description || !metadata.author || !metadata.modified || !metadata.size || !metadata.type || !metadata.include || !metadata.scripts) {
        console.log(chalk.red(`Metadata of package ${targetPath} is invalid.`));
        return;
    }

    console.log(chalk.yellow(`Preparing install package ${metadata.name}...`));
    let overrideList = [];
    for (let script of metadata.scripts) {
        if (!script.name || !script.filename || !script.description || !script.md5) {
            console.log(chalk.red(`Metadata of script ${script.filename} in package ${metadata.name} is invalid.`));
            return;
        }
        if (!fileList['scripts/' + script.filename]) {
            console.log(chalk.red(`Script ${script.filename} in package ${metadata.name} is not found.`));
            return;
        }
        const entry = fileList['scripts/' + script.filename];
        if (script.md5 != md5(zip.readAsText(entry))) {
            console.log(chalk.red(`Script ${script.name} in package ${metadata.name} is corrupted.`));
            return;
        }
        if(await Db.getScriptByName(script.name)){
            console.log(chalk.yellow(`Script ${script.name} in package ${metadata.name} already exists.`));
            overrideList.push(script.name);
        }
    }

    for (let resource of metadata.include) {
        if (!resource.path || !resource.md5) {
            console.log(chalk.red(`Metadata of resource ${resource.path} in package ${metadata.name} is invalid.`));
            return;
        }
        if (!fileList['include/' + resource.path]) {
            console.log(chalk.red(`Resource ${resource.path} in package ${metadata.name} is not found.`));
            return;
        }
    }

    console.log(chalk.green(`Package ${metadata.name} is ready to install.\n`));
    console.log("===========================[INFO]===========================");
    console.log(`${chalk.gray("Name:")} ${metadata.name}`);
    console.log(`${chalk.gray("Description:")} ${metadata.description}`);
    console.log(`${chalk.gray("Author:")} ${metadata.author}`);
    console.log(`${chalk.gray("Modified:")} ${metadata.modified}`);
    console.log(`${chalk.gray("Size:")} ${Math.round(metadata.size / 1000)} KB (in Metadata)`);
    console.log(`${chalk.gray("Resources:")} ${metadata.include.length}`);
    console.log(`${chalk.gray("Scripts:")} ${metadata.scripts.length} (All verified)`);
    console.log("==========================[SCRIPT]==========================");
    for (let file of metadata.scripts) {
        const isOverride = overrideList.includes(file.name);
        console.log(`${isOverride?'* ':'+ '}${chalk[isOverride?'yellow':'blue'](file.filename)} (${chalk.gray(file.description)})`);
    }
    if (metadata.beforeInstallBanner) {
        console.log("==========================[README]==========================");
        console.log(metadata.beforeInstallBanner);
    }
    console.log("============================================================");
    if (!y) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to continue?',
                default: false
            }
        ]);
        if (!answers.confirm) {
            console.log(chalk.yellow('Install cancelled.'));
            return;
        }
    }
    console.log(chalk.yellow(`Installing ${metadata.name}...`));
    try{
        for (let script of metadata.scripts) {
            console.log(chalk.gray(`Adding script ${script.filename}...`));
            const entry = fileList['scripts/' + script.filename];
            const scriptpath = path.join(home, 'scripts', script.filename);
            const obj = {
                name: script.name,
                description: script.description,
                aliases: [script.filename],
                path: scriptpath,
                reqAdmin: script.reqAdmin ?? false,
                enabled: true,
            };
            exceptSync(() => fs.unlinkSync(scriptpath));
            zip.extractEntryTo(entry, path.join(home, 'scripts'), false, true, script.filename);
            await except(() => Db.removeScriptByName(script.name));
            await Db.addScript(obj);
        }
        const resourceList = [];
        for (let resource of metadata.include) {
            console.log(chalk.gray(`Extracting resource ${resource.path}...`));
            const entry = fileList['include/' + resource.path];
            const resourcepath = path.join(home, 'scripts', 'include', resource.path);
            resourceList.push({resource,resourcepath,entry});
            zip.extractEntryTo(entry, path.join(home, 'scripts', 'include'), true, true, resource.path);
        }
        for (let res of resourceList) {
            console.log(chalk.gray(`Verifing resource ${res.resource.path}...`));
            const hash = res.resource.md5;
            const file = res.resourcepath;
            const realhash = await md5File(file);
            if(!hash || hash != realhash){
                console.log(chalk.red(`Resource ${res.resource.path} is corrupted.`));
                throw new Error();
            }
        }
        if (metadata.postInstallScript) {
            console.log(chalk.gray("Executing post-install script..."));
            try {
                await new Promise((r, j) => {
                    fs.mkdtemp(path.join(os.tmpdir(), "cmand-postinstall-run-"), async (err, dir) => {
                        if (err) {
                            console.error(chalk.red('Error creating temp dir to run script:'), err);
                            j(err)
                            return;
                        }
                        const scriptName = path.join(dir, 'script.cmd');
                        fs.writeFileSync(scriptName, "@echo off\n" + metadata.postInstallScript.toString());
                        await execute({
                            name: "postinstall",
                            aliases: [],
                            description: '',
                            path: scriptName,
                            reqAdmin: false,
                            enabled: true,
                        }, []);
                        r(1);
                    });
                })
            } catch (e) {
                console.error(chalk.red('Error running script:'), e);
                throw new Error();
            }
        }
        console.log(chalk.green('\nInstall completed.'));
    } catch (e) {
        console.log(chalk.red(`\nFailed to install package ${metadata.name}.`));
        console.log(chalk.red(e));
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
