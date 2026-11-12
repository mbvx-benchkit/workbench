/**
 * Tiny asynchronous IndexedDB test double for WORKBENCH transaction tests.
 * Exercises upgrade, cursor, atomic replacement and aggregates without a GUI.
 * This is NOT a browser implementation nor a substitute for real-browser testing.
 */
const copy = value => value === undefined ? undefined : structuredClone(value);
const compare = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= a.length) return -1;
      if (i >= b.length) return 1;
      const c = compare(a[i], b[i]);
      if (c) return c;
    }
    return 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
};

class Request {
  result;
  error = null;
  onsuccess = null;
  onerror = null;
  onupgradeneeded = null;
  onblocked = null;
  constructor(transaction = null) { this.transaction = transaction; }
}

class Transaction {
  pending = 0;
  finished = false;
  oncomplete = null;
  onerror = null;
  onabort = null;
  error = null;
  constructor(database, names, mode) {
    this.database = database;
    this.names = names;
    this.mode = mode;
    this.snapshot = new Map(names.map(n => [n, new Map(database.state.stores.get(n)?.records)]));
    this.completeSoon();
  }
  objectStore(name) {
    if (!this.names.includes(name) && this.mode !== 'versionchange') throw Error(`Missing store ${name}`);
    const state = this.database.state.stores.get(name);
    if (!state) throw Error(`Missing store ${name}`);
    return new Store(this, state);
  }
  enqueue(fn, request = new Request(this)) {
    if (this.finished) throw new Error('Transaction already closed');
    this.pending++;
    queueMicrotask(() => {
      if (this.finished) return;
      try {
        request.result = copy(fn());
        this.pending--;
        request.onsuccess?.({ target: request });
      } catch (error) {
        this.pending--;
        request.error = error;
        request.onerror?.({ target: request });
        this.abort(error);
      }
      this.completeSoon();
    });
    return request;
  }
  completeSoon() {
    queueMicrotask(() => {
      if (!this.finished && this.pending === 0) {
        this.finished = true;
        this.oncomplete?.();
      }
    });
  }
  abort(error = new Error('Transaction aborted')) {
    if (this.finished) return;
    this.finished = true;
    this.error = error;
    for (const [name, records] of this.snapshot) {
      const store = this.database.state.stores.get(name);
      if (store) store.records = records;
    }
    queueMicrotask(() => this.onabort?.());
  }
}

class Store {
  constructor(tx, state) { this.transaction = tx; this.state = state; }
  createIndex(name, keyPath, options = {}) {
    this.state.indexes.set(name, { keyPath, unique: options.unique });
  }
  index(name) {
    const info = this.state.indexes.get(name);
    if (!info) throw Error(`Missing index ${name}`);
    return { openCursor: (range, direction) => this.cursor(info.keyPath, range, direction) };
  }
  key(value) { return value[this.state.keyPath]; }
  add(value) {
    const key = this.key(value);
    if (key === undefined) throw new Error('DataError: key missing');
    return this.transaction.enqueue(() => {
      if (this.state.records.has(key)) throw new Error('ConstraintError');
      this.state.records.set(key, copy(value));
      return key;
    });
  }
  put(value) {
    const key = this.key(value);
    if (key === undefined) throw new Error('DataError: key missing');
    return this.transaction.enqueue(() => {
      this.state.records.set(key, copy(value));
      return key;
    });
  }
  get(key) { return this.transaction.enqueue(() => copy(this.state.records.get(key))); }
  getAll() { return this.transaction.enqueue(() => [...this.state.records.values()].map(copy)); }
  delete(key) { return this.transaction.enqueue(() => { this.state.records.delete(key); }); }
  clear() { return this.transaction.enqueue(() => { this.state.records.clear(); }); }
  openCursor(range = null, direction = 'next') { return this.cursor(null, range, direction); }
  cursor(indexKeyPath, range = null, direction = 'next') {
    const keys = [...this.state.records.keys()].filter(primary => {
      const value = this.state.records.get(primary);
      const key = indexKeyPath ? (Array.isArray(indexKeyPath)
        ? indexKeyPath.map(k => value[k]) : value[indexKeyPath]) : primary;
      return !range || compare(key, range.value) < (range.exclusive ? 0 : 1);
    });
    keys.sort((a, b) => {
      const va = this.state.records.get(a);
      const vb = this.state.records.get(b);
      const ka = indexKeyPath ? indexKeyPath.map(k => va[k]) : a;
      const kb = indexKeyPath ? indexKeyPath.map(k => vb[k]) : b;
      return compare(ka, kb);
    });
    if (direction === 'prev') keys.reverse();
    let position = 0;
    const request = new Request(this.transaction);
    const next = () => {
      this.transaction.enqueue(() => {
        if (position >= keys.length) return null;
        const key = keys[position++];
        return { __fakeCursor: true, value: this.state.records.get(key), key };
      }, request);
    };
    // Cursor requires a live continue() that queues the next read on this tx.
    Object.defineProperty(request, 'result', {
      configurable: true,
      get() { return this._result; },
      set(v) { this._result = v && v.__fakeCursor ? {
        key: v.key,
        value: v.value,
        continue: next
      } : null; }
    });
    next();
    return request;
  }
}

class Database {
  constructor(state) { this.state = state; this.onversionchange = null; }
  get objectStoreNames() { return { contains: n => this.state.stores.has(n) }; }
  createObjectStore(name, options) {
    const state = { keyPath: options.keyPath, records: new Map(), indexes: new Map() };
    this.state.stores.set(name, state);
    return new Store(this._upgradeTx, state);
  }
  transaction(names, mode) {
    return new Transaction(this, Array.isArray(names) ? names : [names], mode);
  }
  close() {}
}

export function installFakeIndexedDB() {
  const databases = new Map();
  globalThis.IDBKeyRange = { upperBound: (value, exclusive = false) => ({ value, exclusive }) };
  globalThis.indexedDB = {
    open(name, version) {
      const req = new Request();
      queueMicrotask(() => {
        const state = databases.get(name) ?? { version: 0, stores: new Map() };
        const db = new Database(state);
        req.result = db;
        if (version && state.version > version) {
          req.error = new Error('VersionError');
          req.onerror?.();
          return;
        }
        if (version && state.version < version) {
          const previousVersion = state.version;
          state.version = version;
          databases.set(name, state);
          const tx = new Transaction(db, [...state.stores.keys()], 'versionchange');
          db._upgradeTx = tx;
          req.transaction = tx;
          // transaction's completion is queued before upgrade code has queued its work;
          // run the upgrade synchronously before it gets to the queue.
          req.onupgradeneeded?.({ oldVersion: previousVersion });
          tx.oncomplete = () => { req.transaction = null; req.onsuccess?.(); };
          tx.onabort = () => { req.error = tx.error; req.onerror?.(); };
        } else {
          databases.set(name, state);
          req.onsuccess?.();
        }
      });
      return req;
    },
    reset() { databases.clear(); },
    inspect(name) { return databases.get(name); }
  };
  return databases;
}
