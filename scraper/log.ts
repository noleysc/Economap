type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as Level;
const minLevel = ORDER[envLevel] ?? ORDER.info;
const useJson = process.env.LOG_FORMAT === 'json';

function shouldLog(level: Level): boolean {
  return ORDER[level] >= minLevel;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  if (useJson) {
    const line = JSON.stringify({ ts, level, msg, ...(fields || {}) });
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
    return;
  }
  const tag = `[${level.toUpperCase()}]`.padEnd(7);
  const extra = fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
  const out = `${ts} ${tag} ${msg}${extra}`;
  (level === 'error' ? console.error : console.log)(out);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info:  (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn:  (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};
