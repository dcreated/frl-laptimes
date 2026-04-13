import Papa from 'papaparse'

export interface LapEntry {
  pos: number
  date: string
  name: string
  timeOfDay: string | null
  ambientTemp: string
  cloud: string
  rain: string
  laptime: string
  car: string
  ballastKg: number
  splitOne: string
  splitTwo: string
  splitThree: string
}

interface RawRow {
  POS: string
  DATE: string
  FIRSTNAME: string
  LASTNAME: string
  TIMEOFDAY: string
  AMBIENTTEMP: string
  CLOUD: string
  RAIN: string
  LAPTIME: string
  CAR: string
  BALLASTKG: string
  SPLITONE: string
  SPLITTWO: string
  SPLITTHREE: string
}

export function parseCsvText(csvText: string): LapEntry[] {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  return result.data
    .map((row): LapEntry => {
      const firstName = (row.FIRSTNAME ?? '').trim()
      const lastName = (row.LASTNAME ?? '').trim()
      const name = firstName ? `${firstName} ${lastName}` : lastName

      const timeOfDay = row.TIMEOFDAY === '--' ? null : row.TIMEOFDAY

      return {
        pos: parseInt(row.POS, 10),
        date: row.DATE,
        name,
        timeOfDay,
        ambientTemp: row.AMBIENTTEMP,
        cloud: row.CLOUD,
        rain: row.RAIN,
        laptime: row.LAPTIME,
        car: row.CAR,
        ballastKg: parseFloat(row.BALLASTKG) || 0,
        splitOne: row.SPLITONE,
        splitTwo: row.SPLITTWO,
        splitThree: row.SPLITTHREE,
      }
    })
    .filter((e) => !isNaN(e.pos))
}

/** Convert "M:SS.mmm" or "SS.mmm" to total milliseconds */
export function laptimeToMs(laptime: string): number {
  const trimmed = laptime.trim()
  const parts = trimmed.split(':')
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseFloat(parts[1])
    return minutes * 60000 + Math.round(seconds * 1000)
  }
  return Math.round(parseFloat(trimmed) * 1000)
}

/** Format gap in milliseconds as "+X.XXX" */
export function formatGap(gapMs: number): string {
  if (gapMs === 0) return '-'
  const seconds = gapMs / 1000
  return `+${seconds.toFixed(3)}`
}
