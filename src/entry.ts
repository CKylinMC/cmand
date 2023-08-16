import { Command } from 'commander';
import { add } from './actions/add';
import { alias } from './actions/alias';
import { cat } from './actions/cat';
import {
    getConfig,
    listConfig,
    removeConfig,
    setConfig,
} from './actions/config';
import { create, createTask, makeProxyScript } from './actions/create';
import { edit } from './actions/edit';
import { exportPackage } from './actions/export';
import { info } from './actions/info';
import { importPackage } from './actions/install';
import { listAll, listTasks } from './actions/list';
import { remove } from './actions/remove';
import { run, runLocalScripts } from './actions/run';
import { search } from './actions/search';
import { setprop } from './actions/setprop';
import { update } from './actions/update';
import { Info } from './info';
import { Settings } from './lib/Db';
import { exportEnv } from './actions/env';
import {
    disableRepo,
    enableRepo,
    importRepo,
    listRepos,
    removeRepo,
} from './actions/repo';

export default async function App() {
    await Settings.init();
    const p = new Command();
    p.name(Info.name).version(Info.version).description(Info.description);

    p.command('ls')
        .aliases(['list', 'all', 'l', 'scripts'])
        .description('List all scripts you have added')
        .option('-e,--enabled', 'display enabled scripts only')
        .action((options) => listAll(options.enabled));

    p.command('search')
        .aliases(['find', 'f'])
        .description('Search scripts by name')
        .argument('<text>', 'string to split')
        .action((text) => search(text));

    p.command('register')
        .aliases(['reg', 'add', 'a'])
        .description(
            'Register an existing script. Script will be copied to cmand home folder'
        )
        .argument('<path>', 'path to script')
        .argument('[description]', 'description of script')
        .option('-r, --reqadmin', 'require admin privilege to run')
        .option('-n, --name <name>', 'name of the script')
        .action((path, description, options) =>
            add(
                path,
                options.name ?? null,
                description ?? '',
                !!options.reqadmin
            )
        );

    p.command('create')
        .argument('[name]', 'name of script', null)
        .aliases(['new', 'c'])
        .description(
            'Create a new script. Script will be created in cmand home folder'
        )
        .action((name) => create(name));

    p.command('proxy')
        .aliases(['p', 'expose'])
        .option(
            '-r, --runner <runner>',
            'Specify a runner such as "python" for file type executables.'
        )
        .option(
            '-n, --name <name>',
            'Specify a alias for the command which will be the proxy script name.'
        )
        .argument(
            '<path>',
            'Path to the file or folder you want to make it global usable.'
        )
        .description('Make a file or folder global usable.')
        .action((path, options) =>
            makeProxyScript(
                path,
                options.name?.trim?.() || null,
                options.runner?.trim?.() || null
            )
        );

    p.command('alias')
        .argument(
            '<alias>',
            'alias of your commands, will be the name of the script'
        )
        .option('-h,--runathere', 'always run this script in current directory')
        .description('Create a alias script for your commands.')
        .action((name, { runathere }) => alias(name, runathere, p.args));

    p.command('modify')
        .aliases(['edit', 'open', 'm'])
        .description('Modify an existing script')
        .argument('<name>', 'name of the script')
        .action((name) => edit(name));

    p.command('cat')
        .aliases(['get', 'see', 'raw'])
        .description('Get contents for a script')
        .argument('<name>', 'name of the script')
        .option('-n,--no-color', 'disable color output')
        .action((name, { color }) => cat(name, color));

    p.command('remove')
        .aliases(['del', 'delete', 'd'])
        .description('Remove an existing script')
        .argument('<name>', 'name of the script')
        .option('-y, --yes', 'skip confirmation')
        .action((name, options) => remove(name, !!options.yes));

    p.command('info')
        .aliases(['get', 'i'])
        .description(
            'Get information of an existing script. Use without paramater to get information of cmand.'
        )
        .argument('[name]', 'name of the script')
        .action((name) => info(name));

    p.command('set')
        .aliases(['s'])
        .description('change script settings')
        .argument('<name>', 'name of the script')
        .option('--description <description>', 'set description')
        .option('--name <name>', 'set name')
        .option('--enabled', 'enable script')
        .option('--no-enabled', 'disable script')
        .option('--req-admin', 'require admin privilege to run')
        .option('--no-req-admin', "don't require admin privilege to run")
        .action((name, options) => setprop(name, options));

    p.command('enable')
        .aliases(['on'])
        .description('enable a script')
        .argument('<name>', 'name of the script')
        .action((name) => setprop(name, { enabled: true }));

    p.command('disable')
        .aliases(['off'])
        .description('disable a script')
        .argument('<name>', 'name of the script')
        .action((name) => setprop(name, { enabled: false }));

    p.command('run')
        .aliases(['start', 'execute', 'r'])
        .description('run an existing script')
        .argument('<name>', 'name of the script')
        .action((name) => run(name, p.args));

    p.command('save-env')
        .aliases(['env', 'export-env'])
        .description('export current environment variables to a script')
        .argument('<name>', 'name of the script')
        .option('--no-prefix', 'don\'t prefix the script with "env-"')
        .action((name, options) => exportEnv(name, options.prefix));

    p.command('task')
        .aliases(['runtask', 't'])
        .description('run task from cmand.yml in current directory')
        .argument('[name]', 'name of the task')
        .option('-a, --add', 'add new task')
        .option('-f, --config <config>', 'specify config file path')
        .action((name, options) =>
            name && name != undefined && typeof name == 'string' && name.length
                ? options.add
                    ? createTask(name, p.args.slice(3).join(' '))
                    : runLocalScripts(
                          name,
                          p.args.slice(2),
                          options.config || null
                      )
                : listTasks()
        );

    p.command('run-as-admin')
        .aliases(['adminrun', 'sudo', 'e'])
        .description('run an existing script as admin')
        .argument('<name>', 'name of the script')
        .action((name) => run(name, p.args, true));

    p.command('export')
        .aliases(['makepkg'])
        .description('convert a script into cmdpkg')
        .option('-i, --noui', 'skip all interactive prompts (for cli calling)')
        .argument('[name]', 'name of the script (left blank for selecting)')
        .action((name,options) => exportPackage(name, options.noui));

    p.command('import')
        .aliases(['install'])
        .option('-y, --yes', 'confirm question')
        .description('install a cmdpkg')
        .argument('<path>', 'path to cmdpkg')
        .action((path, options) => importPackage(path, options.yes));

    p.command('update')
        .aliases(['upgrade','up'])
        .option('-y, --yes', 'download update and install without confirmation')
        .description('check for cmand updates')
        .action((options) => update(options.yes));

    const cfgcmd = p
        .command('config')
        .aliases(['cfg', 'settings', 'setting'])
        .description('change cmand config');

    cfgcmd
        .command('set')
        .aliases(['s', 'add', 'a', 'update', 'u'])
        .description('set a config value')
        .argument('<key>', 'key of config')
        .argument('<value>', 'value of config')
        .option('-t, --type <type>', 'type of value', 'string')
        .action((key, value, options) => {
            const type = options.type;
            if (type == 'string') {
                setConfig(key, value);
            } else if (type == 'number') {
                setConfig(key, Number(value));
            } else if (type == 'int') {
                setConfig(key, parseInt(value));
            } else if (type == 'float') {
                setConfig(key, parseFloat(value));
            } else if (type == 'boolean') {
                setConfig(
                    key,
                    value == 'true' ||
                        value == 'yes' ||
                        value == 't' ||
                        value == 'y'
                );
            } else {
                console.error('Unknown type: ' + type);
            }
        });

    cfgcmd
        .command('get')
        .aliases(['g', 'show'])
        .description('get a config value')
        .argument('<key>', 'key of config')
        .action((key) => getConfig(key));

    cfgcmd
        .command('remove')
        .aliases(['del', 'delete', 'd', 'rm'])
        .description('remove a config value')
        .argument('<key>', 'key of config')
        .action((key) => removeConfig(key));

    cfgcmd
        .command('list')
        .aliases(['ls', 'dump'])
        .description('list all config values')
        .action(() => listConfig());

    const repocmd = p
        .command('repo')
        .aliases(['remote', 'repos'])
        .description('manage remote repositories');

    repocmd
        .command('list')
        .aliases(['ls', 'dump'])
        .description('list all repositories')
        .action(() => listRepos());

    repocmd
        .command('remove')
        .aliases(['del', 'delete', 'd', 'rm'])
        .description('remove a repository')
        .argument('<tag>', 'tag of repository')
        .action((tag) => removeRepo(tag));

    repocmd
        .command('enable')
        .aliases(['on'])
        .description('enable a repository')
        .argument('<tag>', 'tag of repository')
        .action((tag) => enableRepo(tag));

    repocmd
        .command('disable')
        .aliases(['off'])
        .description('disable a repository')
        .argument('<tag>', 'tag of repository')
        .action((tag) => disableRepo(tag));

    repocmd
        .command('import')
        .aliases(['download', 'add', 'a'])
        .description('import a repository')
        .argument(
            '<source>',
            'source of repository, maybe a url to intro json or just a baed64-encoded json data.'
        )
        .action((source) => importRepo(source));

    p.parse(process.argv);
}
