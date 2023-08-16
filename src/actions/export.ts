import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Db, { Settings } from '../lib/Db';
import AdmZip from 'adm-zip';
import md5File from 'md5-file';

export async function exportPackage(name) {
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

    let author = Settings.get('export_username',process.env.USERNAME)||process.env.USERNAME;

    const metadata = {
        cmandpkgver: 1,
        name: script.name,
        description: script.description,
        author,
        modified: new Date(stat.mtime).toLocaleString(),
        size: stat.size,
        type: ext.substring(1),
        include: [],
        scripts: [
            {
                name: script.name,
                description: script.description,
                filename: path.basename(script.path),
                md5: md5File.sync(script.path),
                reqAdmin: script.reqAdmin,
            }
        ],
        beforeInstallBanner: '',
        postInstallScript: ''
    };


    const filename = `${script.name}.cmdpkg`;
    const zip = new AdmZip();
    zip.addFile("metadata.json", Buffer.from(JSON.stringify(metadata), "utf8"), "CMAND METADATA");
    zip.addLocalFile(script.path, "scripts", path.basename(script.path));
    zip.writeZip(`./${filename}`);
    console.log(`Package ${filename} created.`);
}
