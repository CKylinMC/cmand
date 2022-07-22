import Datastore from 'nestdb';
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
    static searchScripts(nameOrDescriptionOrPath: string):Promise<any> {
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

export default Db;