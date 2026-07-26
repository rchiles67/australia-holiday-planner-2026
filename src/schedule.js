const DAY_MS = 86400000

export function plannerDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  return new Date(`${value}T12:00:00`)
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS)
}

export function formatShortDate(date, includeYear = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date)
}

export function buildSchedule(ideas, startDate, tripLength) {
  const tripStart = plannerDate(startDate)
  let cursor = 0
  const entries = []
  const byId = new Map()

  ideas.forEach((idea) => {
    if (idea.status === 'excluded') return
    const startDay = cursor
    const endDay = cursor + idea.days - 1
    const entry = {
      ...idea,
      startDay,
      endDay,
      startDate: addDays(tripStart, startDay),
      endDate: addDays(tripStart, endDay),
      provisional: idea.status === 'maybe',
    }
    entries.push(entry)
    byId.set(idea.id, entry)
    cursor += idea.days
  })

  return {
    entries,
    byId,
    allocated: cursor,
    remaining: tripLength - cursor,
    tripStart,
    tripEnd: addDays(tripStart, tripLength - 1),
    tripLength,
  }
}

export function scheduleLabel(entry) {
  if (!entry) return 'Not scheduled'
  const range = entry.startDate.toDateString() === entry.endDate.toDateString()
    ? formatShortDate(entry.startDate)
    : `${formatShortDate(entry.startDate)}–${formatShortDate(entry.endDate)}`
  return `${entry.provisional ? 'Provisional · ' : ''}${range} · ${entry.days} ${entry.days === 1 ? 'day' : 'days'}`
}
