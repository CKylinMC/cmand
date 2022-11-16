import chalk from 'chalk';
import fs from 'fs';

export async function initLocalScript(force = false) {
    if (fs.existsSync('./cmand.yml')) {
        if (!force) {
            console.log(chalk.red('cmand.yml already exists.'));
            return;
        } else {
            fs.unlinkSync('./cmand.yml');
        }
    }
    fs.writeFileSync('./cmand.yml', `start:|\n  echo Start!\nbuild:|\n  echo Build!\n`);
}