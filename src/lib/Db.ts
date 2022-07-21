import loki from 'lokijs';
import { dbpath } from '../info';

export interface Script{
    name: string;
    aliases: string[];
    description: string;
    path: string;
    reqAdmin: boolean;
    enabled: boolean;
}

// create instance for database only when call, so it will be created after init()
class Db{
    static _db: loki;
    static get db() {
        if (!Db._db) {
            Db._db = new loki(dbpath, {
                autosave: true,
                autoload:true
            });
            Db._db.loadDatabase({});
        }
        return Db._db;
    }
    static _scripts: loki.Collection;
    static get scripts() {
        if (!Db._scripts) {
            if (!Db.db.getCollection('scripts')) {
                Db.db.addCollection('scripts')
            }
            Db._scripts = Db.db.getCollection('scripts');
        }
        return Db._scripts;
    }

    static addScript(script: Script) {
        Db.scripts.insert(script);
        Db._db.saveDatabase();
    }
    static updateScript(name, changes) {
        Db.scripts.findAndUpdate({ name }, ()=>changes);
        Db._db.saveDatabase();
    }
    static removeScriptByName(name) {
        Db.scripts.removeWhere({ name });
        Db._db.saveDatabase();
    }
    static listScripts(enabledOnly = false) {
        if (enabledOnly) {
            return Db.scripts.find({ enabled: true });
        }
        return Db.scripts.find();
    }
    static searchScripts(nameOrDescriptionOrPath: string) {
        return Db.scripts.find({
            $or: [
                { name: { $regex: nameOrDescriptionOrPath } },
                { description: { $regex: nameOrDescriptionOrPath } },
                { path: { $regex: nameOrDescriptionOrPath } }
            ]
        });
    }
    static getScriptByPath(path) {
        return Db.scripts.findOne({ path });
    }
    static getScriptByName(name) {
        return Db.scripts.findOne({ name });
    }
    static getScriptByNameOrAlias(name) {
        //enabled only
        return Db.scripts.findOne({
            $or: [
                { name },
                { aliases: { $in: [name] } }
            ],
            enabled: true
        });
        //return Db.scripts.findOne({ $or: [{ name }, { aliases: { $contains: name } }] });
    }
}

export default Db;