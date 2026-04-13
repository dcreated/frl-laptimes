export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
}

const log: LogEntry[] = []

function addEntry(level: LogLevel, message: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }
  log.push(entry)
  if (log.length > 100) {
    log.shift()
  }
  const prefix = `[${level.toUpperCase()}]`
  if (level === 'error') console.error(prefix, message)
  else if (level === 'warn') console.warn(prefix, message)
  else console.log(prefix, message)
}

export const logger = {
  info: (message: string) => addEntry('info', message),
  warn: (message: string) => addEntry('warn', message),
  error: (message: string) => addEntry('error', message),
}

export function getLog(): LogEntry[] {
  return log.slice(-100)
}
