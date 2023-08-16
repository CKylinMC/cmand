import Datastore from 'nestdb';
import { dbpath, settingspath } from '../info';

export interface Script{
    name: string;
    aliases: string[];
    description: string;
    path: string;
    reqAdmin: boolean;
    enabled: boolean;
}

export interface Setting{
    key: string;
    value: any;
}

// create instance for database only when call, so it will be created after init()
class Db{
    static _db: Datastore;
    static get db() {
        if (!Db._db) {
            Db._db = new Datastore({ filename: dbpath() });
            Db._db.loadDatabase();
        }
        return Db._db;
    }

    static async addScript(script: Script) {
        await Db.db.insert(script);
    }
    static async updateScript(name, changes) {
        await Db.db.update({ name }, {$set: changes});
    }
    static async removeScriptByName(name) {
        await Db.db.remove({ name });
    }
    static listScripts(enabledOnly = false):Promise<any[]> {
        if (enabledOnly) {
            return new Promise((r,j)=>Db.db.find({ enabled: true }, (err, docs) => err?j(err):r(docs)));
        }
        return new Promise((r,j)=>Db.db.find({}, (err, docs) => err?j(err):r(docs)));
    }
    static searchScripts(nameOrDescriptionOrPath: string|RegExp):Promise<any> {
        return new Promise((r,j)=>Db.db.find({
            $or: [
                { name: { $regex: nameOrDescriptionOrPath } },
                { description: { $regex: nameOrDescriptionOrPath } },
                { path: { $regex: nameOrDescriptionOrPath } }
            ]
        }, (err, docs) => err?j(err):r(docs)));
    }
    static getScriptByPath(path):Promise<any> {
        return new Promise((r,j)=>Db.db.findOne({ path }, (err, docs) => err?j(err):r(docs)));
    }
    static getScriptByName(name):Promise<any> {
        return new Promise((r,j)=>Db.db.findOne({ name }, (err, docs) => err?j(err):r(docs)));
    }
    static getScriptByNameOrAlias(name):Promise<any> {
        //enabled only
        return new Promise((r,j)=>Db.db.findOne({
            $or: [
                { name },
                { aliases: { $in: [name] } }
            ]
        }, (err, docs) => err?j(err):r(docs)));
        //return Db.scripts.findOne({ $or: [{ name }, { aliases: { $contains: name } }] });
    }
}

export const CONSTS = {
    UPDATE_URL: 'https://api.github.com/repos/CKylinMC/cmand/releases',
    RELEASE_URL: 'https://api.github.com/repos/CKylinMC/cmand/releases/latest',
    REPO_LIST: [
        {
            tag: 'cmdpkg',
            name: 'ckylinmc/cmdpkg_repo',
            json: 'https://cdn.staticaly.com/gh/ckylinmc/cmdpkg_repo/main/list.json',
            desc: 'CKylinMC\'s repo',
            load: true
        }
    ],
}

// create instance for database only when call, so it will be created after init()
export class Settings{
    static _db: Datastore;
    static get db() {
        if (!Settings._db) {
            Settings._db = new Datastore({ filename: settingspath() });
            Settings._db.loadDatabase();
        }
        return Settings._db;
    }
    static async get(k, def = null) {
        const s = await new Promise((r,j)=>Settings.db.findOne({ key: k }, (err, docs) => err?j(err):r(docs)));
        return s ? (s as any).value : def;
    }
    static async set(k, v, onlyIfNotExist = false) {
        const s = await Settings.get(k);
        if (s !== null) {
            if (onlyIfNotExist) return;
            await Settings.db.update({ key: k }, { $set: { value: v } });
        } else {
            await Settings.db.remove({ key: k });
            await Settings.db.insert({ key: k, value: v });
        }
    }
    static async has(k) {
        return await Settings.get(k) != null;
    }
    static async remove(k) {
        await Settings.db.remove({ key: k });
    }
    static async list() {
        return new Promise((r,j)=>Settings.db.find({}, (err, docs) => err?j(err):r(docs)));
    }
    static async init() {
        await Settings.set('ver', 3);
        await Settings.set('repos', CONSTS.REPO_LIST, true);
        await Settings.set('update_url', CONSTS.UPDATE_URL, true);
        await Settings.set('release_url', CONSTS.RELEASE_URL, true);
        await Settings.set('cfproxy', '', true);
        await Settings.set('proxy', '', true);
        await Settings.set('auto_select_source', true, true);
        await Settings.set('disable_banner', false, true);
        await Settings.set('allow_remote_install', true, true);
        await Settings.set('stable_only', false, true);
        await Settings.set('replace_update_dl_host', '', true);
        await Settings.set('static_update_dl_url', '', true);
        await Settings.set('export_username', process.env['USERNAME']??'', true);
    }
}

export default Db;
