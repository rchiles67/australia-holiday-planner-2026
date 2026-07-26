import { CalendarDays, Plane, Plus } from 'lucide-react'
import { formatShortDate } from '../schedule.js'

function travelGroup(idea) {
  return idea.mapGroup || idea.region || 'Other'
}

function weekFragments(entry, tripLength) {
  const fragments = []
  const lastDay = Math.min(entry.endDay, tripLength - 1)
  for (let week = Math.floor(entry.startDay / 7); week <= Math.floor(lastDay / 7); week += 1) {
    const weekStart = week * 7
    const fragmentStart = Math.max(entry.startDay, weekStart)
    const fragmentEnd = Math.min(lastDay, weekStart + 6)
    fragments.push({
      week,
      column: fragmentStart - weekStart + 1,
      span: fragmentEnd - fragmentStart + 1,
      continuesBefore: fragmentStart > entry.startDay,
      continuesAfter: fragmentEnd < entry.endDay,
    })
  }
  return fragments
}

export default function JourneyCalendar({ schedule, onSelect, onAdd }) {
  const weeks = Array.from({ length: Math.ceil(schedule.tripLength / 7) }, (_, index) => index)
  const fragments = schedule.entries.flatMap((entry) => weekFragments(entry, schedule.tripLength).map((fragment) => ({ entry, ...fragment })))

  return (
    <section className="journey-calendar">
      <header className="journey-calendar-heading">
        <div><CalendarDays size={18} /><span><strong>Dated journey</strong><small>{formatShortDate(schedule.tripStart)} – {formatShortDate(schedule.tripEnd, true)}</small></span></div>
        <span className={`allocation-state ${schedule.remaining < 0 ? 'over' : ''}`}>{schedule.allocated} of {schedule.tripLength} days planned</span>
      </header>
      <div className="journey-weeks">
        {weeks.map((week) => {
          const weekStart = week * 7
          const weekEnd = Math.min(schedule.tripLength - 1, weekStart + 6)
          const weekEntries = fragments.filter((fragment) => fragment.week === week)
          return (
            <section className="journey-week" key={week}>
              <div className="journey-week-label"><strong>Week {week + 1}</strong><span>{formatShortDate(new Date(schedule.tripStart.getTime() + weekStart * 86400000))}–{formatShortDate(new Date(schedule.tripStart.getTime() + weekEnd * 86400000))}</span></div>
              <div className="journey-week-grid">
                {Array.from({ length: 7 }, (_, day) => <span key={day} className={`journey-day ${weekStart + day >= schedule.tripLength ? 'outside' : ''}`}>{weekStart + day < schedule.tripLength ? weekStart + day + 1 : ''}</span>)}
                {weekEntries.map(({ entry, column, span, continuesBefore, continuesAfter }) => (
                  <button
                    key={`${entry.id}-${week}`}
                    type="button"
                    className={`journey-block ${entry.color || 'green'} ${entry.provisional ? 'provisional' : ''} ${continuesBefore ? 'continues-before' : ''} ${continuesAfter ? 'continues-after' : ''}`}
                    style={{ gridColumn: `${column} / span ${span}` }}
                    onClick={() => onSelect(entry.id)}
                    title={`${entry.name}: ${formatShortDate(entry.startDate)}–${formatShortDate(entry.endDate)}`}
                  >
                    <strong>{entry.name}</strong><span>{formatShortDate(entry.startDate)}–{formatShortDate(entry.endDate)}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <div className="journey-sequence" aria-label="Journey sequence">
        {schedule.entries.map((entry, index) => {
          const previous = schedule.entries[index - 1]
          const transfer = previous && travelGroup(previous) !== travelGroup(entry)
          return (
            <div key={entry.id}>
              {transfer && <div className="journey-transfer"><Plane size={13} /> Transfer to {travelGroup(entry)}</div>}
              <button type="button" className={entry.provisional ? 'provisional' : ''} onClick={() => onSelect(entry.id)}>
                <time>{formatShortDate(entry.startDate)}<span>– {formatShortDate(entry.endDate)}</span></time>
                <span><strong>{entry.name}</strong><small>{entry.days} {entry.days === 1 ? 'day' : 'days'}{entry.provisional ? ' · Maybe' : ''}</small></span>
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" className={`journey-balance ${schedule.remaining < 0 ? 'over' : ''}`} onClick={onAdd}><Plus size={14} />{schedule.remaining >= 0 ? `${schedule.remaining} unallocated ${schedule.remaining === 1 ? 'day' : 'days'}` : `${Math.abs(schedule.remaining)} days over plan`}</button>
    </section>
  )
}
