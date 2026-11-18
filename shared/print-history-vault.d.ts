export type PlainHistory = {id:string;recipientName:string;fileName:string;createdAt:number;pdfBlob:Blob};
export type HistoryMetadata = {id:string;recipientName:string;fileName:string;createdAt:number;pdfBytes:number};
export type HistoryCursor = {createdAt:number;id:string};
export type HistoryStats = {count:number;totalBytes:number};
export type VaultConfig = {id:'vault';version:1;rounds:number;salt:number[];checkIv:number[];checkCipher:number[]};
export type SealedHistory = {id:string;createdAt:number;pdfBytes:number;encryptedPdfBlob:Blob;pdfIv:number[];encryptedMeta:Uint8Array;metaIv:number[]};
export type HistorySnapshot = {config:VaultConfig|null;entries:SealedHistory[]};
export function lockHistoryVault():void;
export class HistoryVaultCancelledError extends Error {}
export function isSealed(entry:unknown):entry is SealedHistory;
export function validateVaultConfig(config:unknown):VaultConfig;
export function validateSealedHistoryRecord(entry:unknown):SealedHistory;
export function createHistoryVault(password:string):Promise<void>;
export function unlockHistoryVault(password:string):Promise<void>;
export function ensureHistoryUnlocked(options?:{alreadyLocked?:boolean}):Promise<void>;
export function addSealedHistory(recipientName:string,fileName:string,pdfBlob:Blob):Promise<void>;
export function getSealedHistoryPage(before?:HistoryCursor|null,pageSize?:number):Promise<{entries:HistoryMetadata[];nextCursor:HistoryCursor|null}>;
export function getSealedHistoryStats():Promise<HistoryStats>;
export function getSealedHistoryEntry(id:string):Promise<PlainHistory|null>;
export function deleteSealedHistory(id:string):Promise<void>;
export function readOpaqueHistorySnapshot():Promise<HistorySnapshot>;
export function replaceOpaqueHistorySnapshot(snapshot:HistorySnapshot):Promise<void>;
export function sealLegacyHistorySnapshot(plainEntries:PlainHistory[]):Promise<HistorySnapshot>;

export function changeHistoryVaultPassword(oldPassword:string,newPassword:string):Promise<number>;
export function resetHistoryVaultWithoutPassword():Promise<void>;
export function openHistoryPasswordSettings():Promise<boolean>;
