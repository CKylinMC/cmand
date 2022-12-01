import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { exceptSync, randstr } from '../lib/utils';
import inquirer from 'inquirer';
import { Info } from '../info';
import os from 'os';
import { execute } from './run';
import got from 'got';
import { Spinner } from '../lib/Spinner';

export async function update(download = false) {
    if (!('pkg' in process)) {
        console.log(chalk.red('This command is only available in binary.'));
        return;
    }
    console.log(`Current version: v${Info.version}`);
    let spinner1 = new Spinner("Checking for update...").start();
    got('https://api.github.com/repos/CKylinMC/cmand/releases').json().then(
        async (releases: any[]):Promise<any> => {
            const latest = releases[0];
            const latestVersion = latest.tag_name;
            const isBeta = latest.prerelease;
            const url = latest.html_url;
            const asset = latest.assets.find((asset) => asset.name === 'cmand.exe');
            const exe = asset?.browser_download_url;
            const size = asset?.size;
            if (latestVersion != 'v' + Info.version) {
                spinner1.success(chalk.yellow(`New version ${latestVersion}${isBeta?" (Beta)":""} found.`),"");
                console.log(chalk.yellow(`Check out more information at ${url}`));
                if (!exe) return Promise.resolve(0);
                console.log(chalk.gray(`Download size: ${Math.round(size/1024/10.24)/100+" MB"}`))
                if (!download) {
                    const { download } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'download',
                            message: 'Download now?',
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
                        const stream = got.stream(exe);
                        let lastdata = 0;
                        let lastTime = Date.now();
                        let speed = 0;
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
                            const speedTxt = speed!=0?(` - ${speedKB} KB/s`):'';
                            spinner2.text(`Downloading... ${transferredMB} MB / ${totalMB} MB (${percentage}%)${speedTxt}`);
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
                    del /f /Q "${selfpath}.old"
                    del /f /Q "${temp}"
                    echo Done.
                    exit /b
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
                    spinner2.fail(chalk.red('Error while updating:')+e,'');
                    return Promise.resolve(0);
                } finally {
                    exceptSync(()=>fs.unlinkSync(temp));
                }
                return Promise.resolve(0);
            } else {
                spinner1.success(chalk.green('cmand is up to date.'),"");
                return Promise.resolve(0);
            }
        }
    ).catch(() => {
        spinner1.fail(chalk.red('Errored while fetching release information'),"");
    })
}