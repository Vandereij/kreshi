// Minimal typed env access
export function reqEnv(name: keyof NodeJS.ProcessEnv): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
