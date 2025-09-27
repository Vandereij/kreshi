const te = new TextEncoder(); const td = new TextDecoder();
export function randomBytes(len=12){const a=new Uint8Array(len); crypto.getRandomValues(a); return a;}
export async function deriveRootKey(password: string, salt: Uint8Array){
  const km = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'}, km, {name:'AES-GCM',length:256}, false, ['wrapKey','unwrapKey']);
}
export async function generateDEK(){ return crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt','decrypt']); }
export async function encryptJSON(dek: CryptoKey, data: unknown, iv = randomBytes()){
  const cipher = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, dek, te.encode(JSON.stringify(data))));
  return { iv, cipher };
}
export async function decryptJSON(dek: CryptoKey, iv: Uint8Array, cipher: Uint8Array){
  const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, dek, cipher);
  return JSON.parse(td.decode(new Uint8Array(plain)));
}
export async function wrapDEK(rootKey: CryptoKey, dek: CryptoKey, iv = randomBytes()){
  const jwk = await crypto.subtle.exportKey('jwk', dek);
  const enc = te.encode(JSON.stringify(jwk));
  const wrapped = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, rootKey, enc));
  return { iv, wrapped };
}
export async function unwrapDEK(rootKey: CryptoKey, iv: Uint8Array, wrapped: Uint8Array){
  const dec = await crypto.subtle.decrypt({name:'AES-GCM', iv}, rootKey, wrapped);
  const jwk = JSON.parse(td.decode(new Uint8Array(dec)));
  return crypto.subtle.importKey('jwk', jwk, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
}
