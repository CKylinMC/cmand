import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'yaml';
import { includeshome, scripthome } from '../info';
import Db, { Settings } from '../lib/Db';
import got from 'got';
import { Spinner } from '../lib/Spinner';
import { ProgressBar } from '../lib/ProgressBar';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';

export async function create(name = null) {
    const questions = [
        {
            type: 'input',
            name: 'name',
            message: 'What is the name of the script?(with extension)',
            validate: async (value) => {
                if (value.length) {
                    return true;
                }
                if (await Db.getScriptByName(value)) {
                    return 'Script with this name already exists.';
                }
                return 'Please enter a name.';
            },
        },
        {
            type: 'input',
            name: 'description',
            message: 'What is the description of the script?',
        },
        {
            type: 'confirm',
            name: 'reqAdmin',
            message: 'Does the script require admin rights?',
            default: false,
        },
    ];
    if (name) {
        if (name.length > 0 && !await Db.getScriptByName(name)) {
            questions.shift();
        } else {
            console.log(chalk.red('This name is already existed in your scripts.'));
            return;
        }
    }
    inquirer
        .prompt(questions)
        .then(async (answers) => {
            // create a new file with the name  in the home folder
            let filename = answers.name ?? name;
            if (filename.split('.').length === 1) {
                filename += '.cmd';
            }
            const nameWithoutExtension = path.basename(
                filename,
                path.extname(filename)
            );
            const scriptpath = path.join(scripthome(), filename);
            fs.writeFileSync(scriptpath, 'echo This script isn\'t yet implemented.');
            // add to db
            await Db.addScript({
                name: nameWithoutExtension,
                description: answers.description,
                aliases: [filename],
                path: scriptpath,
                reqAdmin: answers.reqAdmin,
                enabled: true,
            });
            inquirer.prompt({
                type: 'confirm',
                name: 'editNow',
                message: 'Do you want to edit the script now?',
                default: true,
            }).then(async (answer) => {
                if (answer.editNow) {
                    await inquirer.prompt([{
                        name: 'scriptcontent',
                        message: 'edit your content!',
                        type: 'editor',
                        default: 'echo Input your script here, then save and close the editor.',
                        postfix: path.extname(filename),
                    }]).then(answers => {
                        //overrite the file with the new content
                        fs.writeFileSync(scriptpath, answers.scriptcontent);
                    })
                }
                //output : your script is done.
                console.log(chalk.green('Your script is done.'));
            });
        });
}

export async function createTask(taskname, contents) {
    if (!fs.existsSync('./cmand.yml')) {
        fs.writeFileSync('./cmand.yml', '');
        console.log(chalk.yellow('cmand.yml not found, creating a new one.'));
    }
    const scripts = yaml.parse(fs.readFileSync('./cmand.yml', 'utf8')) || {};
    scripts[taskname] = contents;
    fs.writeFileSync('./cmand.yml', yaml.stringify(scripts));
    console.log(chalk.green('Task added into cmand.yml, run "cmand task ' + taskname + '" to run it.'));
}

export async function makeShim(executable: string, alias = null) {
    if(!await Settings.get('supress-shim-notice', false)) console.log(chalk.blue('[NOTICE] You are making shim for an executable via "aloneguid/win-shim". CMAND will not manage shims, only provide creation feature via subcommand. (Supress this notice by "cmand cfg set supress-shim-notice true")'));
    const utilshome = path.join(includeshome(), "cmand-utils");
    const shim = path.join(utilshome, "shmake.exe");
    if (!fs.existsSync(shim)) {
        if (!fs.existsSync(utilshome)) {
            fs.mkdirSync(utilshome);
        }
        const shimpack = path.join(utilshome, "shmake.zip");
        console.log(chalk.yellow('It seems this is the first time you run this command. CMAND will download the necessary files automatically. Please wait.'));
        let spinner = new Spinner("Checking latest version of win-shim...").start();
        let result;
        try {
            result = await got("https://api.github.com/repos/aloneguid/win-shim/releases/latest").json();
        } catch (err) {
            spinner.fail(chalk.red("Failed to fetch the latest version of win-shim: ", err.message));
            return;
        }
        let versionTag = result.tag_name;
        let downloadUrl = `https://github.com/aloneguid/win-shim/releases/download/${versionTag}/shmake.zip`;
        let dlok = true;
        await new Promise((resolve, reject) => {
            const stream = got.stream(downloadUrl, { https: { rejectUnauthorized: false } });
            stream.on('downloadProgress', ({ transferred, total, percent }) => {
                spinner.text(`Downloading shmake.zip... ${ProgressBar.render({ max: total, value: transferred })} (${percent}%)`);
            })
            stream.on('error', reject);
            const writer = fs.createWriteStream(shimpack);
            writer.on('error', reject);
            writer.on('finish', resolve);
            stream.pipe(writer);
        }).catch(() => {
            dlok = false;
        });
        if (!dlok) {
            spinner.fail(chalk.red("Failed to download shmake.zip."));
            return;
        }
        spinner.text("Extracting shmake...");
        const zip = new AdmZip(shimpack);
        const zipEntries = zip.getEntries();
        const fileList = {};
        for (const entry of zipEntries) {
            fileList[entry.entryName] = entry;
        }
        if (!fileList['shmake.exe']) {
            spinner.fail(chalk.red("Failed to extract shmake"));
            return;
        }
        try {
            zip.extractEntryTo(fileList['shmake.exe'], utilshome);
        } catch (err) {
            spinner.fail(chalk.red("Failed to extract shmake: ") + err.message);
            return;
        }
        try {
            fs.unlinkSync(shimpack);
        } catch (err) {
            spinner.fail(chalk.red("Failed to remove shmake archive which is useless now: ") + err.message);
            return;
        }
        spinner.success(chalk.green("shmake.exe has been downloaded successfully."));
    }
    let spinner = new Spinner("Creating shim...").start();
    let execname = path.basename(executable, path.extname(executable));
    let targetname = `${alias ?? execname}.exe`;
    let output = path.join(scripthome(), targetname);
    try {
        if (fs.existsSync(output)) {
            spinner.fail(chalk.red(`Failed to create ${targetname}: file already exists.`));
            return;
        }
        let command = [`"${shim}"`, "-a", "%s", "-i", `"${executable}"`, "-o", `"${output}"`];
        await new Promise((r, j) => {
            exec(command.join(" "), (error) => {
                if (error) j(error);
                else r(0);
            })
        })
        spinner.success(chalk.green(`Shim created successfully: ${targetname}`));
    } catch (err) {
        spinner.fail(chalk.red(`Failed to create ${targetname}: `,err));
    }
}

export async function makeProxyScript(filename, alias=null, runner=null) {
    const sourcepath = path.resolve(process.cwd(), filename);

    if (!fs.existsSync(sourcepath)) {
        console.log(chalk.red(`Path ${sourcepath} not found.`));
        return;
    }
    console.log(chalk.blue(`Creating proxy script for ${filename}`));

    let info = {
        name: alias,
        description: '',
        sourcepath,
        batchcontent: '',
    }
    if (alias) {
        info.name = alias.trim().replace(/\s/, '_');
    } else {
        info.name = path.basename(sourcepath);
        console.log(chalk.yellow(`Alias not specified, using filename ${info.name} as alias.`));
    }
    if (fs.statSync(sourcepath).isFile()) {
        info.description = `Proxy script for file ${filename}`;
        if (runner) {
            info.batchcontent = `@${runner} "${sourcepath}" %*`;
        } else {
            info.batchcontent = `@"${sourcepath}" %*`;
        }
    } else {
        info.description = `Proxy script for folder ${filename}`;
        if (runner) {
            info.batchcontent = `@${runner} "${sourcepath}" %*`;
        } else {
            info.batchcontent = `@cmd /k cd /d "${sourcepath}"`;
        }
    }
    const scriptpath = path.join(scripthome(), info.name + ".cmd");
    if (fs.existsSync(scriptpath)) {
        console.log(chalk.red(`Script ${info.name}.cmd already exists.`));
        return;
    }
    fs.writeFileSync(scriptpath, info.batchcontent);
    await Db.addScript({
        name: info.name,
        description: info.description,
        aliases: [filename],
        path: scriptpath,
        reqAdmin: false,
        enabled: true,
    });
    console.log(chalk.green(`Proxy script ${info.name}.cmd created.`));
}
