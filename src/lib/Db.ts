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
            Db._db = new Datastore({ filename: dbpath });
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
            ],
            enabled: true
        }, (err, docs) => err?j(err):r(docs)));
        //return Db.scripts.findOne({ $or: [{ name }, { aliases: { $contains: name } }] });
    }
}

// create instance for database only when call, so it will be created after init()
export class Settings{
    static _db: Datastore;
    static get db() {
        if (!Settings._db) {
            Settings._db = new Datastore({ filename: settingspath });
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
        if (s) {
            if (onlyIfNotExist) return;
            await Settings.db.update({ key: k }, { $set: { value: v } });
        } else {
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
        if (!(await Settings.has('init_v1'))) {
            await Settings.set('ver', 1);
            await Settings.set('repolist', 'https://fastly.jsdelivr.net/gh/ckylinmc/cmdpkg_repo/list.json');
            await Settings.set('allowRemoteInstall', true);
            await Settings.set('init_v1', true);
        }
    }
}

export default Db;