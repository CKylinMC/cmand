import { Command } from 'commander';
import { add } from './actions/add';
import { alias } from './actions/alias';
import { create } from './actions/create';
import { edit } from './actions/edit';
import { info } from './actions/info';
import { listAll } from './actions/list';
import { remove } from './actions/remove';
import { run } from './actions/run';
import { search } from './actions/search';
import { setprop } from './actions/setprop';
import { Info } from './info';

export default function App() {
    const p = new Command();
    p.name(Info.name).version(Info.version).description(Info.description);

    p.command('ls')
        .aliases(['list', 'all', 'l'])
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
        .option('-n, --name', 'require admin privilege to run')
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

    p.command('alias')
        .argument('<alias>', 'alias of your commands, will be the name of the script')
        .description(
            'Create a alias script for your commands.'
        )
        .action((name) => alias(name, p.args));

    p.command('modify')
        .aliases(['edit', 'open', 'm'])
        .description('Modify an existing script')
        .argument('<name>', 'name of the script')
        .action((name) => edit(name));

    p.command('remove')
        .aliases(['del', 'delete', 'd'])
        .description('Remove an existing script')
        .argument('<name>', 'name of the script')
        .option('-y, --yes', 'skip confirmation')
        .action((name, options) => remove(name, !!options.yes));

    p.command('info')
        .aliases(['get', 'i'])
        .description('Get information of an existing script')
        .argument('<name>', 'name of the script')
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

    p.command('run')
        .aliases(['start', 'execute', 'e'])
        .description('run an existing script')
        .argument('<name>', 'name of the script')
        .action((name) => run(name, p.args));

    p.command('run-as-admin')
        .aliases(['adminrun', 'sudo', 'r'])
        .description('run an existing script as admin')
        .argument('<name>', 'name of the script')
        .action((name) => run(name, p.args, true));

    p.parse(process.argv);
    
}
