/**
 * Geriye dönük uyumluluk: eski `new Database(path, name)` API'si croxydb'ye yönlendirilir.
 * Yeni kod doğrudan `require('croxydb')` kullanmalı.
 */
const db = require("croxydb");
if (!db.fetch) db.fetch = db.get;

class Database {
  constructor() {}
  get(path) { try { return db.fetch(path); } catch { return undefined; } }
  set(path, value) { try { return db.set(path, value); } catch {} }
  add(path, value) { try { return db.add(path, value); } catch {} }
  sub(path, value) { try { return (db.sub || db.subtract).call(db, path, value); } catch {} }
  delete(path) { try { return db.delete(path); } catch {} }
}

module.exports = Database;
