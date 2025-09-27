export function getOrCreateSalt(): Uint8Array {
  const key='soulog_salt';
  const v=localStorage.getItem(key);
  if (v) return Uint8Array.from(atob(v), c=>c.charCodeAt(0));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(key, btoa(String.fromCharCode(...salt)));
  return salt;
}
