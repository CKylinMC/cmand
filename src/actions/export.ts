import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Db, { Settings } from '../lib/Db';
import AdmZip from 'adm-zip';
import md5File from 'md5-file';
import inquirer from 'inquirer';
import SearchList from 'inquirer-search-list';
import { includeshome } from '../info';

export async function exportPackage(name, noui=false) {
    inquirer.registerPrompt('search-list', SearchList);
    if (!name) {
        if (noui) {
            console.log(chalk.red('Missing script name.'));
            process.exit(1);
        }
        let allscripts = (await Db.listScripts()).map((script) => script.name);
        let answers = await inquirer.prompt({
            //@ts-ignore
            type: 'search-list',
            name: 'name',
            message: 'Which script do you want to export?',
            choices: allscripts,
        });
        name = answers.name;
    }
    //check if existed
    const script = await Db.getScriptByName(name);
    if (!script) {
        console.log(chalk.red(`Script ${name} not found.`));
        return;
    }
    // check file of the script path is still valid
    if (!fs.existsSync(script.path)) {
        console.log(chalk.red(`Script ${name} path not found.`));
        return;
    }
    if (!fs.statSync(script.path).isFile()) {
        console.log(chalk.red(`${script.path} is not a file.`));
        return;
    }

    script.fullname = script.name;
    let author =
        (await Settings.get('export_username', process.env.USERNAME)) ||
        process.env.USERNAME;
    let includes = [];
    let banner = '';
    let postinstall = '';
    let loop = true;
    let includesPath = includeshome();
    if(!noui) while (loop) {
        const answers = await inquirer.prompt({
            type: 'list',
            name: 'opt',
            message: 'Select operation:',
            loop: false,
            default: 'continue',
            choices: [
                {
                    name: `Change name: ${script.name}`,
                    value: 'change-name',
                },
                {
                    name: `Change full name: ${script.fullname}`,
                    value: 'change-fullname',
                },
                {
                    name: `Change description: ${script.description}`,
                    value: 'change-desc',
                },
                {
                    name: `Change author: ${author}`,
                    value: 'change-author',
                },
                {
                    name: `Select included resources: ${includes.length} selected`,
                    value: 'select-includes',
                    // disabled: 'Not available yet (will support this feature in future version)',
                },
                {
                    name: `Set before install banner: ${
                        banner.length ? 'Setted' : 'Empty'
                    }`,
                    value: 'set-banner',
                },
                {
                    name: `Set postinstall script: ${
                        postinstall.length ? 'Setted' : 'Empty'
                    }`,
                    value: 'set-postinstall',
                },
                new inquirer.Separator(),
                {
                    name: 'Cancel export',
                    value: 'cancel',
                },
                {
                    name: 'Continue export',
                    value: 'continue',
                },
            ],
        });
        switch (answers.opt) {
            case 'cancel':
                console.log(chalk.redBright('Exports aborted'));
                process.exit(0);
            case 'continue':
                loop = false;
                break;
            case 'change-name':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'name',
                        message: `Change script name from "${script.name}" to`,
                    });
                    if (results.name && results.name.trim()) {
                        script.name = results.name.trim();
                    }
                }
                break;
            case 'change-author':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'author',
                        message: `Change script author from "${author}" to`,
                    });
                    if (results.author && results.author.trim()) {
                        author = results.author.trim();
                    }
                }
                break;
            case 'change-desc':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'desc',
                        message: `Change script description to`,
                    });
                    if (results.desc && results.desc.trim()) {
                        script.description = results.desc.trim();
                    }
                }
                break;
            case 'change-fullname':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'fullname',
                        message: `Change script fullname from "${script.fullname}" to`,
                    });
                    if (results.fullname && results.fullname.trim()) {
                        script.fullname = results.fullname.trim();
                    }
                }
                break;
            case 'set-banner':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'banner',
                        message: `Set script install banner to`,
                    });
                    if (results.banner && results.banner.trim()) {
                        banner = results.banner.trim();
                    }
                }
                break;
            case 'set-postinstall':
                {
                    let results = await inquirer.prompt({
                        type: 'input',
                        name: 'postinstall',
                        message: `Set script postinstall script to`,
                    });
                    if (results.postinstall) {
                        postinstall = results.postinstall;
                    }
                }
                break;
            case 'select-includes':
                {
                    if (!fs.existsSync(includesPath)) {
                        console.log(chalk.redBright("Directory 'include' under scripts home is not existed yet. Create it first and put all resources you need into it."));
                        console.log(chalk.redBright("Note: Scripts home should be setted as environment variable '%CMAND_SCRIPTS%', or '%CMAND_HOME%\scripts'."));
                        console.log(chalk.redBright("      If none of them setted, use '%USERPROFILE%\.cmand\scripts' instead. And include folder just under scripts folder."));
                        break;
                    }
                    let dirlist = fs.readdirSync(includesPath, { encoding: 'utf8', withFileTypes: true });
                    // console.log(dirlist);
                    console.log(chalk.blueBright('Only file is acceptable. If you want to include folder, Make it a zip file and use "postinstall" script to unzip it.'));
                    let results = await inquirer.prompt({
                        type: 'checkbox',
                        name: 'selectfiles',
                        message: 'Select file(s) you want to include.',
                        choices: dirlist.filter(file => file.isFile()).map(file => ({ name: file.name, value: file }))
                    });
                    // console.log(results);
                    includes = results.selectfiles;
                }
                break;
            default:
                console.log(chalk.red('Unknown or unsupported operation'));
        }
    }

    // list all info from db and from file meta
    console.log(`Script: ${script.name}`);
    console.log(`Description: ${script.description}`);
    console.log(`Path: ${script.path}`);
    console.log(`Enabled: ${script.enabled}`);
    console.log(`Require Admin: ${script.reqAdmin}`);
    // created date and modified date
    const stat = fs.statSync(script.path);
    console.log(`Created: ${new Date(stat.birthtime).toLocaleString()}`);
    console.log(`Modified: ${new Date(stat.mtime).toLocaleString()}`);
    // filesize from stat in KB
    console.log(`Size: ${Math.round(stat.size / 1024)} KB`);
    // is shell or cmd or batch or python or executable or (extension)
    const ext = path.extname(script.path);
    console.log(`Type: ${ext.substring(1)}`);

    if (!noui && !(await inquirer.prompt({
        type: 'confirm',
        name: 'confirmed',
        message: 'Export this script as cmand importable package (.cmdpkg) to current directory?',
        default: true
    })).confirmed) {
        console.log(chalk.redBright('Canceled'));
        process.exit(0);
    }

    console.log(chalk.gray('Generating metadata...'));
    const metadata = {
        cmandpkgver: 1,
        name: script.name,
        fullname: script.fullname,
        description: script.description,
        author,
        modified: new Date(stat.mtime).toLocaleString(),
        size: stat.size,
        type: ext.substring(1),
        include: includes.map(i => ({
            path: i.name,
            md5: md5File.sync(path.join(includesPath, i.name)),
        })),
        scripts: [
            {
                name: script.name,
                description: script.description,
                filename: path.basename(script.path),
                md5: md5File.sync(script.path),
                reqAdmin: script.reqAdmin,
            },
        ],
        beforeInstallBanner: banner,
        postInstallScript: postinstall,
    };

    console.log(chalk.gray('Creating package...'));
    const filename = `${script.name}.cmdpkg`;
    const zip = new AdmZip();
    console.log(chalk.gray('Adding metadata into package...'));
    zip.addFile(
        'metadata.json',
        Buffer.from(JSON.stringify(metadata), 'utf8'),
        'CMAND METADATA'
    );
    console.log(chalk.gray(`Adding script "${script.name}" into package...`));
    zip.addLocalFile(script.path, 'scripts', path.basename(script.path), 'CMAND SCRIPTS FOLDER');
    for (const include of includes) {
        console.log(chalk.gray(`Adding resource file "${include.name}" into package...`));
        zip.addLocalFile(path.join(includesPath, include.name), 'include', include.name, 'CMAND RESOURCES FOLDER');
    }
    console.log(chalk.gray(`Writing package into disk...`));
    zip.writeZip(`./${filename}`);
    console.log(`Package ${filename} created.`);
}
