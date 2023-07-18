import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { exceptSync, proxyedUrl, randstr } from '../lib/utils';
import inquirer from 'inquirer';
import { Info } from '../info';
import os from 'os';
import { execute } from './run';
import got from 'got';
import { Spinner } from '../lib/Spinner';
import { CONSTS, Settings } from '../lib/Db';
import markdownToTxt from 'markdown-to-txt';

import semver from 'semver';
import { ProgressBar } from '../lib/ProgressBar';

export async function update(download = false) {
    if (!('pkg' in process)) {
        console.log(chalk.red('This command is only available in binary.'));
        return;
    }
    console.log(`Current version: v${Info.version}`);
    const stable_only = await Settings.get('stable_only', false);
    let targetUrl;
    if (stable_only) {
        targetUrl = await Settings.get('release_url', CONSTS.RELEASE_URL);
    } else {
        targetUrl = await Settings.get('update_url', CONSTS.UPDATE_URL);
    }
    let cfproxy = await Settings.get('cfproxy', '');
    targetUrl = proxyedUrl(cfproxy, targetUrl);
    let spinner1 = new Spinner("Checking for update...").start();
    got(targetUrl).json().then(
        async (releases: any[]): Promise<any> => {
            let latest;
            if (stable_only) {
                latest = releases;
            } else {
                latest = releases[0];
            }
            const latestVersion = latest.tag_name;
            const isBeta = latest.prerelease??false;
            const url = latest.html_url;
            const asset = latest.assets.find((asset) => asset.name === 'cmand.exe');
            let exe = asset?.browser_download_url;
            const replaceHost = await Settings.get('replace_update_dl_host', ''); // mirror site
            const staticURL = await Settings.get('replace_update_dl_url', ''); // github action auto push
            if (replaceHost&&exe) {
                let exeurl = new URL(exe);
                exeurl.host = replaceHost;
                exe = exeurl.toString();
                console.log(chalk.gray(`Using download host: ${replaceHost}`));
            } else if (staticURL && exe) {
                exe = staticURL;
            }
            const size = asset?.size;
            if(semver.gt(latestVersion, Info.version)) {
            // if ( latestVersion != 'v' + Info.version) {
                spinner1.success(chalk.yellow(`New version ${latestVersion}${isBeta ? " (Beta)" : ""} found.`), "");
                const fullUpdateLog = markdownToTxt(latest.body??'');
                if (fullUpdateLog.split('\n').length <= 15) {
                    console.log("\n"+"=".repeat(24),"\n * Update note:\n");
                    console.log(fullUpdateLog);
                    console.log("\n"+"=".repeat(24),"\n")
                }
                console.log(chalk.yellow(`Check out more information at ${url}`));
                if (!exe) {
                    console.log(chalk.gray('This version does not have a vaild update package. You may need to update manually.'));
                    return Promise.resolve(0);
                }
                console.log(chalk.gray(`Download size: ${Math.round(size/1024/10.24)/100+" MB"}`))
                if (!download) {
                    const { download } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'download',
                            message: 'Download and update now?',
                            default: true,
                        },
                    ]);
                    if (!download) return Promise.resolve(0);
                }
                let spinner2 = new Spinner('Downloading...').start();
                const temp = path.join(os.tmpdir(), "cmand-dl-run-" + randstr());
                try {
                    exceptSync(() => fs.mkdirSync(temp));
                    const filepath = path.join(temp, "cmand.update.exe");

                    await new Promise((r, j) => {
                        exe = proxyedUrl(cfproxy, exe);
                        const stream = got.stream(exe,{https: { rejectUnauthorized: false }});
                        let lastdata = 0;
                        let lastTime = Date.now();
                        let speed = 0;
                        const fixNum = num => {
                            const str = num.toString();
                            const dot = str.indexOf('.');
                            if (dot === -1) return str + '.00';
                            const decimal = str.substr(dot + 1);
                            if (decimal.length === 2) return str;
                            if (decimal.length === 1) return str + '0';
                            return str.substr(0, dot + 3);
                        }
                        stream.on("downloadProgress", ({ transferred, total, percent }) => {
                            const now = Date.now();
                            const diff = transferred - lastdata;
                            if (now - lastTime > 1000) {
                                speed = diff;
                                lastTime = now;
                                lastdata = transferred;
                            }
                            const speedKB = Math.round(speed / 1024);
                            const percentage = isNaN(total)?"?":Math.round(percent * 100);
                            const transferredMB = isNaN(total)?"?":Math.round(transferred / 1024 / 10.24) / 100;
                            const totalMB = isNaN(total) ? "?" : Math.round(total / 1024 / 10.24) / 100;
                            const speedTxt = speed != 0 ? (` - ${speedKB} KB/s`) : '';

                            spinner2.text(`Downloading... ${ProgressBar.render({ max: total, value: transferred })} ${fixNum(transferredMB)} MB / ${totalMB} MB (${percentage}%)${speedTxt}`);
                        })
                        stream.on('error', j);
                        const writer = fs.createWriteStream(filepath);
                        writer.on('error', j);
                        writer.on('finish', r);
                        stream.pipe(writer);
                    });
                    spinner2.success(chalk.green(`Downloaded ${latestVersion}.`));
                    const selfpath = process.execPath;
                    const scriptPath = path.join(temp, "cmand.update.bat");
                    const scriptBootPath = path.join(temp, "cmand.updater.bat");
                    fs.writeFileSync(scriptPath, `
                    @echo off
                    echo Updating cmand from v${Info.version} to ${latestVersion}...
                    taskkill /f /im cmand.exe
                    move /y "${selfpath}" "${selfpath}.old"
                    move /y "${filepath}" "${selfpath}"
                    echo Update complete. Cleaning up...
                    del /f /Q "${selfpath}.old" && del /f /Q "${temp}" && echo Done. && exit /b
                    `.split("\n").map(line=>line.trimStart()).join("\n"));
                    fs.writeFileSync(scriptBootPath, `
                    @cmd /c ${scriptPath.indexOf(" ")!=-1?`"${scriptPath}"`:`${scriptPath}`}
                    `.split("\n").map(line => line.trimStart()).join("\n"));
                    console.log(chalk.gray('Running updater...'));
                    await execute({
                        name: "update cmand",
                        aliases: [],
                        description: '',
                        path: scriptBootPath,
                        reqAdmin: false,
                        enabled: true,
                    }, []);
                } catch (e) {
                    spinner2.fail(chalk.red('Error while updating: ')+e,'');
                    return Promise.resolve(0);
                } finally {
                    console.log("Cleaning up...");
                    exceptSync(()=>fs.unlinkSync(temp));
                    exceptSync(()=>fs.unlinkSync(`${process.execPath}.old`));
                }
                return Promise.resolve(0);
            } else if (semver.lt(latestVersion, Info.version)) {
                spinner1.success(chalk.cyan("You are using a future version of 'cmand'."),"");
                return Promise.resolve(0);
            } else {
                spinner1.success(chalk.green("You are using the latest version of 'cmand'."),"");
                return Promise.resolve(0);
            }
        }
    ).catch(() => {
        spinner1.fail(chalk.red('Errored while fetching release information'),"");
    })
}
