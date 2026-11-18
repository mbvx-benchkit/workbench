import { promptVaultPassword, confirmVaultReset, promptVaultPasswordChange } from './history-vault-ui.js';
import { withWorkbenchSnapshotLock } from '../dist/workbench-data-lock.js';
/**
 * DOCUMENT BUILDER PDF history vault. Shared by DOCUMENT BUILDER and the WORKBENCH
 * backup service. This module is the only code permitted to persist history PDFs.
 * No plaintext PDF or identifying history metadata is written after migration.
 */
const NAME = 'workbench-document-print-history';
const VERSION = 4;
const HISTORY = 'history';
const META = 'history-meta';
const STATS = 'history-stats';
const CONFIG = 'history-vault';
const TOTAL = 'total';
const VAULT = 'vault';
const ROUNDS = 310_000;
const LIMIT = 64 * 1024 * 1024;
const COUNT_LIMIT = 5000;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
let sessionKey = null;
let sessionIdentity = null;
let migrationCheckedIdentity = null;
let passwordDialogPending = null;
const HAS_BROWSER_LOCKS = typeof window !== 'undefined' && typeof document !== 'undefined';
let START_GENERATION = null;
let initialGenerationError = null;
try { if (HAS_BROWSER_LOCKS) START_GENERATION = window.localStorage.getItem('workbench:data-generation:v1'); }
catch (cause) { initialGenerationError = cause; }
async function migrateUnderGlobalLock(operation, alreadyLocked=false) {
  if (initialGenerationError) throw error('ブラウザの保存領域を確認できないため履歴の移行を開始できません。');
  if (alreadyLocked || !HAS_BROWSER_LOCKS) return operation();
  if (!navigator.locks || typeof navigator.locks.request !== 'function') {
    throw error('このブラウザは複数タブのデータ保護に対応していません。');
  }
  return navigator.locks.request('workbench:data-integrity:v1', {mode:'shared'}, async () => {
    if (window.localStorage.getItem('workbench:data-generation:v1') !== START_GENERATION ||
        window.localStorage.getItem('workbench:restore-in-progress:v1')) {
      throw error('別のタブで復元が行われました。再読み込みしてください。');
    }
    return operation();
  });
}

function error(message) { return new Error(message); }
function randomBytes(length) { const result = new Uint8Array(length); crypto.getRandomValues(result); return result; }
function toNumbers(array) { return Array.from(array); }
function bytes(value, length, name) {
  if (!Array.isArray(value) || value.length !== length || value.some(v => !Number.isInteger(v) || v < 0 || v > 255)) {
    throw error(`${name}が不正です。`);
  }
  return new Uint8Array(value);
}
function bytesAny(value, name) {
  if (!Array.isArray(value) || value.length < 16 || value.length > 65536 || value.some(v => !Number.isInteger(v) || v < 0 || v > 255)) {
    throw error(`${name}が不正です。`);
  }
  return new Uint8Array(value);
}
function identity(config) { return JSON.stringify([config.salt, config.checkIv, config.checkCipher]); }
function requireKey(config) {
  if (!config || !sessionKey || sessionIdentity !== identity(config)) {
    sessionKey = null; sessionIdentity = null;
    throw error('PDF履歴はロックされています。パスワードで解除してください。');
  }
  return sessionKey;
}
export function lockHistoryVault() { sessionKey = null; sessionIdentity = null; migrationCheckedIdentity = null; }
export class HistoryVaultCancelledError extends Error {
  constructor() { super('履歴のパスワード入力をキャンセルしました。'); this.name = 'HistoryVaultCancelledError'; }
}
function waitTx(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || error('履歴のデータベース処理に失敗しました。'));
    tx.onabort = () => reject(tx.error || error('履歴のデータベース処理が中断されました。'));
  });
}
function waitRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || error('履歴を読み取れませんでした。'));
  });
}
function metadataOf(entry) {
  if (isSealed(entry)) {
    return { id: entry.id, createdAt: entry.createdAt, pdfBytes: entry.pdfBytes,
      metaIv: entry.metaIv, encryptedMeta: entry.encryptedMeta };
  }
  return { id: entry.id, recipientName: entry.recipientName, fileName: entry.fileName,
    createdAt: entry.createdAt, pdfBytes: entry.pdfBlob.size };
}
async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result; const tx = req.transaction;
      if (!tx) throw error('PDF履歴の更新トランザクションを開始できません。');
      if (!db.objectStoreNames.contains(HISTORY)) db.createObjectStore(HISTORY, {keyPath:'id'});
      const missingMeta = !db.objectStoreNames.contains(META);
      let meta;
      if (missingMeta) {
        meta = db.createObjectStore(META, {keyPath:'id'});
        meta.createIndex('createdAtId', ['createdAt','id'], {unique:true});
      } else meta = tx.objectStore(META);
      if (!db.objectStoreNames.contains(STATS)) db.createObjectStore(STATS, {keyPath:'id'});
      if (!db.objectStoreNames.contains(CONFIG)) db.createObjectStore(CONFIG, {keyPath:'id'});
      const stats = tx.objectStore(STATS);
      let count=0, totalBytes=0;
      const cursor = missingMeta ? tx.objectStore(HISTORY).openCursor() : meta.openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) { stats.put({id:TOTAL,count,totalBytes}); return; }
        const info = missingMeta ? metadataOf(row.value) : row.value;
        if (missingMeta) meta.put(info);
        count++; totalBytes += info.pdfBytes; row.continue();
      };
    };
    let blocked = false;
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close(); else resolve(db);
    };
    req.onerror = () => reject(req.error || error('PDF履歴のデータベースを開けません。'));
    req.onblocked = () => { blocked = true; reject(error('古いWORKBENCHのタブを閉じ、ページを再読み込みしてください。')); };
  });
}
async function get(db, storeName, id) {
  const tx = db.transaction(storeName, 'readonly');
  const done = waitTx(tx);
  const value = await waitRequest(tx.objectStore(storeName).get(id));
  await done; return value || null;
}
async function getAll(db, storeName) {
  const tx = db.transaction(storeName,'readonly'); const done=waitTx(tx);
  const result = await waitRequest(tx.objectStore(storeName).getAll()); await done; return result;
}
async function configFromDB() { const db=await openDB(); try {return await get(db,CONFIG,VAULT);} finally {db.close();} }
export function isSealed(entry) { return Boolean(entry && entry.encryptedPdfBlob instanceof Blob && Array.isArray(entry.pdfIv) && Array.isArray(entry.metaIv) && entry.encryptedMeta); }
export function validateVaultConfig(config) {
  if (!config || config.id !== VAULT || config.version !== 1 || config.rounds !== ROUNDS) throw error('履歴の暗号化設定が不正です。');
  bytes(config.salt,16,'暗号化ソルト'); bytes(config.checkIv,12,'認証IV'); bytesAny(config.checkCipher,'認証データ');
  return config;
}
export function validateSealedHistoryRecord(entry) {
  if (!isSealed(entry) || typeof entry.id !== 'string' || !entry.id || entry.id.length > 256 ||
      !Number.isSafeInteger(entry.createdAt) || entry.createdAt < 0 ||
      !Number.isSafeInteger(entry.pdfBytes) || entry.pdfBytes < 0 || entry.pdfBytes > LIMIT ||
      entry.encryptedPdfBlob.size !== entry.pdfBytes + 16 ||
      !(entry.encryptedMeta instanceof Uint8Array) || entry.encryptedMeta.length < 16 || entry.encryptedMeta.length > 65536) {
    throw error('暗号化されたPDF履歴の形式が不正です。');
  }
  bytes(entry.pdfIv,12,'PDF暗号化IV'); bytes(entry.metaIv,12,'メタデータIV');
  return entry;
}
async function derive(password,config) {
  const keyMaterial = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(config.salt,16,'暗号化ソルト'),iterations:config.rounds,hash:'SHA-256'},
    keyMaterial,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function cipher(key,id,field,input) {
  const iv = randomBytes(12);
  const payload = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`workbench:history:1:${field}:${id}`)},key,input);
  return {iv:toNumbers(iv), data:new Uint8Array(payload)};
}
async function decipher(key,id,field,iv,data) {
  try {
    return await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv,12,'復号IV'),additionalData:encoder.encode(`workbench:history:1:${field}:${id}`)},key,data);
  } catch { throw error('履歴を復号できません。パスワードまたはファイルの整合性を確認してください。'); }
}
async function checkKey(key,config) {
  try {
    const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(config.checkIv,12,'認証IV'),additionalData:encoder.encode('workbench:history:vault:v1')},key,bytesAny(config.checkCipher,'認証データ'));
    if (decoder.decode(clear) !== 'WORKBENCH HISTORY VAULT v1') throw Error('bad verifier');
  } catch { throw error('パスワードが違うか、履歴の暗号化設定が破損しています。'); }
}
export async function createHistoryVault(password, migrate=true) {
  if (typeof password !== 'string' || password.length < 12) throw error('履歴パスワードは12文字以上で設定してください。');
  const config = {id:VAULT,version:1,rounds:ROUNDS,salt:toNumbers(randomBytes(16))};
  const key=await derive(password,config); const iv=randomBytes(12);
  const check=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('workbench:history:vault:v1')},key,encoder.encode('WORKBENCH HISTORY VAULT v1'));
  config.checkIv=toNumbers(iv); config.checkCipher=toNumbers(new Uint8Array(check));
  const db=await openDB();
  try {
    const tx=db.transaction(CONFIG,'readwrite'); const done=waitTx(tx);
    tx.objectStore(CONFIG).add(config); await done;
  } finally {db.close();}
  sessionKey=key; sessionIdentity=identity(config); migrationCheckedIdentity=null;
  if(migrate)await migratePlainHistory();
}
export async function unlockHistoryVault(password, migrate=true) {
  const config=await configFromDB(); if (!config) throw error('履歴のパスワードはまだ設定されていません。');
  validateVaultConfig(config);
  const key=await derive(password,config); await checkKey(key,config);
  sessionKey=key; sessionIdentity=identity(config); migrationCheckedIdentity=null;
  if(migrate)await migratePlainHistory();
}
async function askPassword(create, previousError = '') {
  if (passwordDialogPending) return passwordDialogPending;
  passwordDialogPending = promptVaultPassword(create, previousError).finally(() => {passwordDialogPending=null;});
  return passwordDialogPending;
}
export async function ensureHistoryUnlocked(options={}) {
  const alreadyLocked=Boolean(options.alreadyLocked);
  const config=await configFromDB();
  if (config && sessionKey && sessionIdentity===identity(config)) { if(migrationCheckedIdentity!==sessionIdentity)await migrateUnderGlobalLock(migratePlainHistory,alreadyLocked); return; }
  if (!config) {
    const pass=await askPassword(true); if (pass===null) throw new HistoryVaultCancelledError();
    try { await migrateUnderGlobalLock(async()=>{await createHistoryVault(pass,false);await migratePlainHistory();},alreadyLocked); return; }
    catch (err) {
      // Another tab may have initialized the vault while the prompt was open.
      if (err && err.name !== 'ConstraintError') throw err;
    }
  }
  let lastError = '';
  for(;;) {
    const pass=await askPassword(false,lastError);
    if(pass===null) throw new HistoryVaultCancelledError();
    if(typeof pass==='object' && pass.reset) {
      // Backups can already hold the global lock; do not request it recursively.
      if(alreadyLocked) throw error('パスワードを忘れた場合は、DOCUMENT BUILDERの履歴画面から初期化してください。');
      const stats=await getSealedHistoryStats();
      if(!await confirmVaultReset(stats.count)) throw new HistoryVaultCancelledError();
      await resetHistoryVaultWithoutPassword();
      const newPassword=await askPassword(true);
      if(newPassword===null) throw new HistoryVaultCancelledError();
      await migrateUnderGlobalLock(async()=>{await createHistoryVault(newPassword,false);await migratePlainHistory();},alreadyLocked);
      return;
    }
    try {await unlockHistoryVault(pass,false);await migrateUnderGlobalLock(migratePlainHistory,alreadyLocked); return;}
    catch(err) {lastError=err instanceof Error?err.message:'パスワードの確認に失敗しました。';}
  }
}
async function sealRecord(plain,key) {
  if (!(plain.pdfBlob instanceof Blob) || plain.pdfBlob.size>LIMIT || plain.pdfBlob.size===0) throw error('PDF履歴のファイルが不正、または64MiBを超えています。');
  if (!plain.id || !Number.isSafeInteger(plain.createdAt)) throw error('履歴のIDまたは日時が不正です。');
  const meta={recipientName:plain.recipientName,fileName:plain.fileName,createdAt:plain.createdAt};
  if (typeof meta.recipientName!=='string' || typeof meta.fileName!=='string' || !/\.pdf$/i.test(meta.fileName)) throw error('履歴のファイル名が不正です。');
  const [pdf,metadata]=await Promise.all([cipher(key,plain.id,'pdf',await plain.pdfBlob.arrayBuffer()),cipher(key,plain.id,'meta',encoder.encode(JSON.stringify(meta)))]);
  const entry={id:plain.id,createdAt:plain.createdAt,pdfBytes:plain.pdfBlob.size,encryptedPdfBlob:new Blob([pdf.data],{type:'application/octet-stream'}),pdfIv:pdf.iv,encryptedMeta:metadata.data,metaIv:metadata.iv};
  return validateSealedHistoryRecord(entry);
}
async function openMeta(entry,key) {
  const decoded=decoder.decode(await decipher(key,entry.id,'meta',entry.metaIv,entry.encryptedMeta));
  const meta=JSON.parse(decoded);
  if(typeof meta.fileName!=='string'||typeof meta.recipientName!=='string'||meta.createdAt!==entry.createdAt) throw error('履歴メタデータが不正です。');
  return {id:entry.id,createdAt:entry.createdAt,pdfBytes:entry.pdfBytes,fileName:meta.fileName,recipientName:meta.recipientName};
}
async function migratePlainHistory() {
  const db=await openDB();
  try {
    const config=await get(db,CONFIG,VAULT);const key=requireKey(config);
    // Read only IDs into memory. Never materialize thousands of large PDFs.
    const tx=db.transaction(HISTORY,'readonly');const done=waitTx(tx);
    const legacyIds=await new Promise((resolve,reject)=>{
      const ids=[];const req=tx.objectStore(HISTORY).openCursor();
      req.onerror=()=>reject(req.error||error('旧履歴を検査できません。'));
      req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve(ids);return;}
        if(!isSealed(cursor.value))ids.push(cursor.key);cursor.continue();};
    });await done;
    for(const id of legacyIds) {
      const item=await get(db,HISTORY,id);if(!item||isSealed(item))continue;
      const sealed=await sealRecord(item,key);
      const update=db.transaction([HISTORY,META],'readwrite');const complete=waitTx(update);
      // One PDF and its metadata are replaced atomically; a crash can resume.
      update.objectStore(HISTORY).put(sealed);update.objectStore(META).put(metadataOf(sealed));
      await complete;
    }
    migrationCheckedIdentity=sessionIdentity;
  } finally {db.close();}
}
export async function addSealedHistory(recipientName,fileName,pdfBlob) {
  if (!(pdfBlob instanceof Blob) || pdfBlob.size > LIMIT) throw error('PDF履歴に保存できるファイルは64MiB以下です。');
  await ensureHistoryUnlocked();
  if ((await getSealedHistoryStats()).count >= COUNT_LIMIT) throw error('PDF履歴が5,000件に達しています。不要な履歴を削除してから保存してください。');
  const db=await openDB();
  try {
    const config=await get(db,CONFIG,VAULT); const key=requireKey(config);
    const plain={id:crypto.randomUUID(),recipientName,fileName,createdAt:Date.now(),pdfBlob};
    const sealed=await sealRecord(plain,key);
    const tx=db.transaction([HISTORY,META,STATS],'readwrite');const done=waitTx(tx);
    tx.objectStore(HISTORY).add(sealed);tx.objectStore(META).add(metadataOf(sealed));
    const store=tx.objectStore(STATS);const req=store.get(TOTAL);
    req.onsuccess=()=>{const current=req.result;if(!current || current.count>=COUNT_LIMIT){tx.abort();return;}
      store.put({id:TOTAL,count:current.count+1,totalBytes:current.totalBytes+sealed.pdfBytes});};
    await done;
  } finally {db.close();}
}
export async function getSealedHistoryPage(before=null,pageSize=50) {
  await ensureHistoryUnlocked();
  if (!Number.isInteger(pageSize)||pageSize<1||pageSize>100) throw error('履歴の表示件数が不正です。');
  const db=await openDB();
  try {
    const config=await get(db,CONFIG,VAULT);const key=requireKey(config);
    const tx=db.transaction(META,'readonly');const done=waitTx(tx);
    const index=tx.objectStore(META).index('createdAtId');
    const range=before? IDBKeyRange.upperBound([before.createdAt,before.id],true):null;
    const entries=await new Promise((resolve,reject)=>{
      const rows=[];const req=index.openCursor(range,'prev');
      req.onerror=()=>reject(req.error||error('履歴一覧を読み込めません。'));
      req.onsuccess=()=>{const cursor=req.result;if(!cursor||rows.length>pageSize){resolve(rows);return;}
        rows.push(cursor.value);if(rows.length>pageSize)resolve(rows);else cursor.continue();};
    });await done;
    const hasMore=entries.length>pageSize;const relevant=entries.slice(0,pageSize);
    const opened=[];
    for(const item of relevant) opened.push(await openMeta(item,key));
    const last=relevant[relevant.length-1];
    return {entries:opened,nextCursor:hasMore&&last?{createdAt:last.createdAt,id:last.id}:null};
  } finally {db.close();}
}
export async function getSealedHistoryStats() {
  const db=await openDB();try {const result=await get(db,STATS,TOTAL);if(!result)throw error('履歴集計が見つかりません。');return {count:result.count,totalBytes:result.totalBytes};} finally {db.close();}
}
export async function getSealedHistoryEntry(id) {
  await ensureHistoryUnlocked();
  const db=await openDB();
  try {
    const config=await get(db,CONFIG,VAULT);const key=requireKey(config);
    const entry=await get(db,HISTORY,id);if(!entry)return null;
    validateSealedHistoryRecord(entry);
    const meta=await openMeta(entry,key);
    const pdfBuffer=await decipher(key,id,'pdf',entry.pdfIv,await entry.encryptedPdfBlob.arrayBuffer());
    if(pdfBuffer.byteLength!==entry.pdfBytes)throw error('復号したPDFのサイズが不正です。');
    return {id,recipientName:meta.recipientName,fileName:meta.fileName,createdAt:entry.createdAt,pdfBlob:new Blob([pdfBuffer],{type:'application/pdf'})};
  } finally {db.close();}
}
export async function deleteSealedHistory(id) {
  await ensureHistoryUnlocked();
  const db=await openDB();try {
    const tx=db.transaction([HISTORY,META,STATS],'readwrite');const done=waitTx(tx);
    const metaStore=tx.objectStore(META);const req=metaStore.get(id);
    req.onsuccess=()=>{const found=req.result;tx.objectStore(HISTORY).delete(id);metaStore.delete(id);
      if(found){const store=tx.objectStore(STATS);const sr=store.get(TOTAL);sr.onsuccess=()=>{
        const old=sr.result;if(!old){tx.abort();return;}
        store.put({id:TOTAL,count:old.count-1,totalBytes:old.totalBytes-found.pdfBytes});
      };}};
    await done;
  } finally {db.close();}
}
/**
 * Change the history password without exposing decrypted records to persistent storage.
 * Staging is encrypted with the new password and stored under separate keys.
 * The original history and vault verifier remain intact until ONE atomic IDB
 * transaction installs every staged record and the new verifier together.
 * Interrupted staging is discarded on the next attempt; the old password works.
 */
const ROTATION_PREFIX = 'rotate:';
function isRotationKey(key) { return typeof key==='string' && key.startsWith(ROTATION_PREFIX); }
async function eraseStagedRecords(db) {
  const tx=db.transaction(CONFIG,'readwrite');const complete=waitTx(tx);
  const store=tx.objectStore(CONFIG);
  const req=store.openCursor();
  req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;if(isRotationKey(cursor.key))store.delete(cursor.key);cursor.continue();};
  await complete;
}
async function historyIDs(db) {
  const tx=db.transaction(HISTORY,'readonly');const complete=waitTx(tx);
  const ids=[];
  const req=tx.objectStore(HISTORY).openCursor();
  req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;ids.push(cursor.key);cursor.continue();};
  await complete;
  return ids;
}
async function createVaultConfig(password) {
  const config={id:VAULT,version:1,rounds:ROUNDS,salt:toNumbers(randomBytes(16))};
  const key=await derive(password,config);const iv=randomBytes(12);
  const check=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('workbench:history:vault:v1')},key,encoder.encode('WORKBENCH HISTORY VAULT v1'));
  config.checkIv=toNumbers(iv);config.checkCipher=toNumbers(new Uint8Array(check));
  return {config,key};
}
export async function changeHistoryVaultPassword(oldPassword,newPassword) {
  if(typeof oldPassword!=='string'||!oldPassword)throw error('現在のパスワードを入力してください。');
  if(typeof newPassword!=='string'||newPassword.length<12)throw error('新しいパスワードは12文字以上で設定してください。');
  if(oldPassword===newPassword)throw error('現在のパスワードと異なるものを指定してください。');
  return withWorkbenchSnapshotLock(async()=>{
    const db=await openDB();
    try {
      const oldConfig=await get(db,CONFIG,VAULT);
      if(!oldConfig)throw error('履歴のパスワードがまだ設定されていません。');
      validateVaultConfig(oldConfig);
      const oldKey=await derive(oldPassword,oldConfig);
      await checkKey(oldKey,oldConfig);
      // Legacy plaintext records are first migrated with the verified old key.
      sessionKey=oldKey;sessionIdentity=identity(oldConfig);migrationCheckedIdentity=null;
      await migratePlainHistory();
      const {config:newConfig,key:newKey}=await createVaultConfig(newPassword);
      await eraseStagedRecords(db);
      const ids=await historyIDs(db);
      try {
        for(let index=0;index<ids.length;index++) {
          const entry=validateSealedHistoryRecord(await get(db,HISTORY,ids[index]));
          const meta=await openMeta(entry,oldKey);
          const pdfBytes=await decipher(oldKey,entry.id,'pdf',entry.pdfIv,await entry.encryptedPdfBlob.arrayBuffer());
          const updated=await sealRecord({id:entry.id,recipientName:meta.recipientName,fileName:meta.fileName,
            createdAt:entry.createdAt,pdfBlob:new Blob([pdfBytes],{type:'application/pdf'})},newKey);
          const tx=db.transaction(CONFIG,'readwrite');const complete=waitTx(tx);
          tx.objectStore(CONFIG).put({id:ROTATION_PREFIX+String(index).padStart(6,'0'),entry:updated});
          await complete;
        }
        // The complete re-key is atomic. Failure or power loss keeps the old password valid.
        const tx=db.transaction([CONFIG,HISTORY,META],'readwrite');const complete=waitTx(tx);
        const configStore=tx.objectStore(CONFIG);
        const history=tx.objectStore(HISTORY),meta=tx.objectStore(META);
        let count=0;
        const req=configStore.openCursor();
        req.onsuccess=()=>{
          const cursor=req.result;
          if(!cursor){
            if(count!==ids.length){tx.abort();return;}
            configStore.put(newConfig);return;
          }
          if(isRotationKey(cursor.key)) {
            const next=cursor.value.entry;
            history.put(next);meta.put(metadataOf(next));configStore.delete(cursor.key);count++;
          }
          cursor.continue();
        };
        await complete;
        sessionKey=newKey;sessionIdentity=identity(newConfig);migrationCheckedIdentity=sessionIdentity;
        return ids.length;
      } catch(err) {
        // Only staging is removed. Old history + key remain untouched.
        try {await eraseStagedRecords(db);}catch(cleanupError){console.warn('履歴の一時再暗号化データを削除できませんでした。',cleanupError);}
        throw err;
      }
    } finally {db.close();}
  });
}
/** Loss of password is NOT recoverable: reset only deletes this browser's history. */
export async function resetHistoryVaultWithoutPassword() {
  return withWorkbenchSnapshotLock(async()=>{
    const db=await openDB();
    try {
      const tx=db.transaction([CONFIG,HISTORY,META,STATS],'readwrite');const complete=waitTx(tx);
      tx.objectStore(HISTORY).clear();tx.objectStore(META).clear();tx.objectStore(CONFIG).clear();
      tx.objectStore(STATS).put({id:TOTAL,count:0,totalBytes:0});
      await complete;
      lockHistoryVault();
    } finally {db.close();}
  });
}
/** UI entrypoint from the unlocked history dialog. */
export async function openHistoryPasswordSettings() {
  await ensureHistoryUnlocked();
  return promptVaultPasswordChange(changeHistoryVaultPassword);
}
/** Opaque snapshot; encrypted PDF and metadata remain encrypted even in restore journals. */
export async function readOpaqueHistorySnapshot() {
  const db=await openDB();
  try {
    let config=await get(db,CONFIG,VAULT);
    let entries=await getAll(db,HISTORY);
    if (entries.some(item=>!isSealed(item))) {
      db.close();await ensureHistoryUnlocked({alreadyLocked:true});return readOpaqueHistorySnapshot();
    }
    if (entries.length && !config) throw error('履歴の暗号化設定がありません。');
    if (config) validateVaultConfig(config);
    entries.forEach(validateSealedHistoryRecord);
    return {config:config||null,entries};
  } finally {try{db.close();}catch{}}
}
/** Restore opaque snapshots without ever writing a plaintext PDF. */
export async function replaceOpaqueHistorySnapshot(snapshot) {
  let config=snapshot.config||null;
  let entries=snapshot.entries||[];
  if (entries.length && !config) throw error('履歴の暗号化設定がありません。');
  if(config)validateVaultConfig(config);
  entries.forEach(validateSealedHistoryRecord);
  const db=await openDB();try {
    const tx=db.transaction([HISTORY,META,STATS,CONFIG],'readwrite');const done=waitTx(tx);
    const history=tx.objectStore(HISTORY), meta=tx.objectStore(META), conf=tx.objectStore(CONFIG);
    history.clear();meta.clear();conf.clear();if(config)conf.put(config);
    for(const entry of entries){history.put(entry);meta.put(metadataOf(entry));}
    tx.objectStore(STATS).put({id:TOTAL,count:entries.length,totalBytes:entries.reduce((n,item)=>n+item.pdfBytes,0)});
    await done;lockHistoryVault();
  } finally {db.close();}
}
/** Backups v2 contained plaintext history. Seal under the existing or newly set history password. */
export async function sealLegacyHistorySnapshot(plainEntries) {
  if(!Array.isArray(plainEntries))throw error('履歴のバックアップ形式が不正です。');
  if(plainEntries.length===0) {
    const config=await configFromDB();return {config,entries:[]};
  }
  await ensureHistoryUnlocked({alreadyLocked:true});
  const config=await configFromDB();const key=requireKey(config);
  const entries=[];for(const entry of plainEntries)entries.push(await sealRecord(entry,key));
  return {config,entries};
}
