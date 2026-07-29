import { CalendarDays, Plane } from 'lucide-react'
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ideaDisplayColor } from '../data.js'
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

function JourneyBlock({ entry, week, column, span, continuesBefore, continuesAfter, onSelect }) {
  const dragId = `calendar-drag-${entry.id}-${week}`
  const dropId = `calendar-drop-${entry.id}-${week}`
  const draggable = useDraggable({ id: dragId, data: { ideaId: entry.id } })
  const droppable = useDroppable({ id: dropId, data: { ideaId: entry.id } })
  const setNodeRef = (node) => {
    draggable.setNodeRef(node)
    droppable.setNodeRef(node)
  }
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`journey-block ${ideaDisplayColor(entry)} ${entry.provisional ? 'provisional' : ''} ${continuesBefore ? 'continues-before' : ''} ${continuesAfter ? 'continues-after' : ''} ${draggable.isDragging ? 'dragging' : ''} ${droppable.isOver ? 'drop-target' : ''}`}
      style={{ gridColumn: `${column} / span ${span}`, transform: CSS.Translate.toString(draggable.transform) }}
      onClick={() => onSelect(entry.id)}
      title={`${entry.name}: ${formatShortDate(entry.startDate)}–${formatShortDate(entry.endDate)} · drag to reorder`}
      {...draggable.attributes}
      {...draggable.listeners}
    >
      <strong>{entry.name}</strong><span>{formatShortDate(entry.startDate)}–{formatShortDate(entry.endDate)}</span>
    </button>
  )
}

export default function JourneyCalendar({ schedule, onSelect, onReorder }) {
  const weeks = Array.from({ length: Math.ceil(schedule.tripLength / 7) }, (_, index) => index)
  const fragments = schedule.entries.flatMap((entry) => weekFragments(entry, schedule.tripLength).map((fragment) => ({ entry, ...fragment })))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }))

  function dragEnd({ active, over }) {
    const sourceId = active.data.current?.ideaId
    const targetId = over?.data.current?.ideaId
    if (sourceId && targetId && sourceId !== targetId) onReorder?.(sourceId, targetId)
  }

  return (
    <section className="journey-calendar">
      <header className="journey-calendar-heading">
        <div><CalendarDays size={18} /><span><strong>Dated journey</strong><small>{formatShortDate(schedule.tripStart)} – {formatShortDate(schedule.tripEnd, true)}</small></span></div>
        <span className={`allocation-state ${schedule.remaining < 0 ? 'over' : ''}`}>{schedule.allocated} of {schedule.tripLength} days planned</span>
      </header>
      <DndContext sensors={sensors} onDragEnd={dragEnd}>
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
                {weekEntries.map((fragment) => <JourneyBlock key={`${fragment.entry.id}-${week}`} {...fragment} onSelect={onSelect} />)}
              </div>
            </section>
          )
        })}
      </div>
      </DndContext>
      <div className="journey-sequence" aria-label="Journey sequence">
        {schedule.entries.map((entry, index) => {
          const previous = schedule.entries[index - 1]
          const transfer = previous && previous.kind !== 'flight' && entry.kind !== 'flight' && travelGroup(previous) !== travelGroup(entry)
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
    </section>
  )
}
