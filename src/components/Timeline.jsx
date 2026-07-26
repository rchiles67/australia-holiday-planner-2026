import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, GripVertical, MapPin, Plane, Plus } from 'lucide-react'

const colorClass = { green: 'green', ochre: 'ochre', violet: 'violet', blue: 'blue', coral: 'coral' }

function travelGroup(idea) {
  if (idea.region === 'Tasmania') return 'tasmania'
  if (idea.region === 'Victoria') return 'victoria'
  if (idea.region === 'New South Wales') return 'nsw'
  if (idea.region.includes('Western Australia') || idea.region === 'South West WA') return 'wa'
  return idea.region
}

const transferLabels = {
  'wa:tasmania': 'Fly Perth → Hobart · compare direct dates and Melbourne connections',
  'wa:victoria': 'Fly Perth → Melbourne · keep the arrival day light',
  'wa:nsw': 'Fly Perth → Sydney · allow for the eastbound time change',
  'tasmania:victoria': 'Fly Hobart → Melbourne · return the Tasmania car before departure',
  'tasmania:nsw': 'Fly Hobart → Sydney · protect the final international connection',
  'victoria:nsw': 'Fly Melbourne → Sydney · keep a final Sydney night before London',
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function SortableRouteBlock({ idea, start, tripLength, startDate, onSelect, onSetDays }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id })
  const segmentStart = new Date(startDate.getTime() + start * 86400000)
  const segmentEnd = new Date(startDate.getTime() + (start + idea.days - 1) * 86400000)
  const style = {
    marginLeft: `${(start / tripLength) * 100}%`,
    width: `${Math.max((idea.days / tripLength) * 100, 15)}%`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
  }

  function beginResize(event) {
    event.preventDefault()
    event.stopPropagation()
    const track = event.currentTarget.closest('.route-track')
    const pixelsPerDay = track.getBoundingClientRect().width / tripLength
    const startX = event.clientX
    const initialDays = idea.days
    let lastDays = initialDays
    document.body.classList.add('resizing-route')
    function move(moveEvent) {
      const nextDays = Math.max(1, Math.min(14, initialDays + Math.round((moveEvent.clientX - startX) / pixelsPerDay)))
      if (nextDays !== lastDays) {
        lastDays = nextDays
        onSetDays(idea.id, nextDays)
      }
    }
    function finish() {
      document.body.classList.remove('resizing-route')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
  }

  return (
    <div ref={setNodeRef} className={`route-block ${colorClass[idea.color] || 'green'} ${idea.status === 'maybe' ? 'tentative' : ''} ${isDragging ? 'dragging' : ''}`} style={style}>
      <button type="button" className="route-drag-handle" aria-label={`Drag ${idea.name} to reorder`} {...attributes} {...listeners}><GripVertical size={15} /></button>
      <button type="button" className="route-block-main" onClick={() => onSelect(idea.id)}>
        <span><strong>{idea.name}</strong><small>{formatDate(segmentStart)}–{formatDate(segmentEnd)} · {idea.days} days{idea.status === 'maybe' ? ' · Maybe' : ''}</small></span><MapPin size={14} />
      </button>
      <button type="button" className="resize-handle" onPointerDown={beginResize} aria-label={`Drag to change length of ${idea.name}`} title="Drag to change days"><span /></button>
    </div>
  )
}

export default function Timeline({ ideas, tripLength, startDate, onReorder, onSelect, onAdd, onSetDays }) {
  const scheduled = ideas.filter((idea) => idea.status !== 'excluded')
  const allocated = scheduled.reduce((sum, idea) => sum + idea.days, 0)
  const unallocated = tripLength - allocated
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }))
  let runningDay = 0

  function dragEnd({ active, over }) {
    if (over && active.id !== over.id) onReorder(active.id, over.id)
  }

  return (
    <section className="timeline-panel">
      <div className="route-heading">
        <div><h2>Route</h2><p>Use the six-dot handle to reorder; drag a block’s right edge to change its days.</p></div>
        <div className="route-summary"><CalendarDays size={16} /><span>{formatDate(startDate)} – {formatDate(new Date(startDate.getTime() + (tripLength - 1) * 86400000))}</span></div>
      </div>
      <div className="week-ruler" aria-label="Trip calendar">
        {Array.from({ length: Math.ceil(tripLength / 7) }, (_, index) => <div key={index} style={{ width: `${(Math.min(7, tripLength - index * 7) / tripLength) * 100}%` }}><span>Week {index + 1}</span><small>Days {index * 7 + 1}–{Math.min((index + 1) * 7, tripLength)}</small></div>)}
      </div>
      <div className="day-ruler" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${tripLength}, minmax(8px, 1fr))` }}>{Array.from({ length: tripLength }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={scheduled.map((idea) => idea.id)} strategy={horizontalListSortingStrategy}>
          <div className="route-track" style={{ backgroundSize: `${100 / tripLength}% 100%` }}>
            {scheduled.map((idea, index) => {
              const start = runningDay
              runningDay += idea.days
              const previous = index > 0 ? scheduled[index - 1] : null
              const transfer = previous ? transferLabels[`${travelGroup(previous)}:${travelGroup(idea)}`] : ''
              return (
                <div key={idea.id} className="route-row">
                  {transfer && <div className="transfer-row"><Plane size={15} /><span>{transfer}</span></div>}
                  <SortableRouteBlock idea={idea} start={start} tripLength={tripLength} startDate={startDate} onSelect={onSelect} onSetDays={onSetDays} />
                </div>
              )
            })}
            <button type="button" className={`unallocated-row ${unallocated < 0 ? 'over' : ''}`} onClick={onAdd}><Plus size={15} />{unallocated >= 0 ? `${unallocated} unallocated ${unallocated === 1 ? 'day' : 'days'}` : `${Math.abs(unallocated)} days over`}</button>
          </div>
        </SortableContext>
      </DndContext>
      <footer className="timeline-tip"><span>Include and Maybe stay scheduled; Exclude removes an idea.</span><span>{allocated} of {tripLength} days allocated</span></footer>
    </section>
  )
}
