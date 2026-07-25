import { useMemo, useState } from 'react'
import { geoGraticule, geoInterpolate, geoMercator, geoPath } from 'd3-geo'
import { ArrowDown, ArrowUp, Car, Check, ExternalLink, Pin, Plane, Plus, Route, Trash2 } from 'lucide-react'
import { flightNotes } from '../data.js'
import australiaBoundary from '../map-data/australia-10m.json'

const MAP_WIDTH = 360
const MAP_HEIGHT = 280
const PERTH = [115.8605, -31.9505]
const HOBART = [147.3272, -42.8821]
const projection = geoMercator().fitExtent([[18, 12], [MAP_WIDTH - 18, MAP_HEIGHT - 16]], australiaBoundary)
const pathGenerator = geoPath(projection).digits(2)
const landPath = pathGenerator(australiaBoundary)
const graticulePath = pathGenerator(geoGraticule().extent([[112, -45], [154, -9]]).step([10, 10])())
const perthPoint = projection(PERTH)
const hobartPoint = projection(HOBART)
const australiaLabelPoint = projection([134.2, -25.7])

function linePath(ideas) {
  if (ideas.length < 2) return null
  return pathGenerator({ type: 'LineString', coordinates: ideas.map((idea) => idea.coordinates) })
}

function MapMarker({ idea, selected, onSelect }) {
  const point = projection(idea.coordinates)
  if (!point) return null
  const labelToLeft = idea.coordinates[0] > 146 || idea.id === 'southern-forests'
  return (
    <g className={selected ? 'active-marker' : ''} role="button" tabIndex="0" aria-label={`Open ${idea.name}`} onClick={() => onSelect(idea.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(idea.id) }}>
      <title>{idea.name}</title>
      <circle className={`map-marker ${idea.color}`} cx={point[0]} cy={point[1]} r="3.2" />
      <circle className="map-marker-hit" cx={point[0]} cy={point[1]} r="9" />
      {selected && <text className="selected-map-label" x={labelToLeft ? point[0] - 7 : point[0] + 7} y={point[1] - 7} textAnchor={labelToLeft ? 'end' : 'start'}>{idea.mapLabel || idea.name}</text>}
    </g>
  )
}

function SourcesEditor({ sources, ideas, onAdd, onDelete, onMove, onChecked, onTogglePin }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', href: '', category: 'Research', scope: 'Whole trip', ideaId: '', note: '' })

  function submit(event) {
    event.preventDefault()
    if (!form.label.trim() || !form.href.trim()) return
    onAdd({ ...form, ideaIds: form.ideaId ? [form.ideaId] : [] })
    setForm({ label: '', href: '', category: 'Research', scope: 'Whole trip', ideaId: '', note: '' })
    setAdding(false)
  }

  return (
    <section className="sources-editor">
      <div className="sources-heading"><div><h3>Sources & live checks</h3><p>Shared list; place-specific links also appear in Ideas.</p></div><button type="button" onClick={() => setAdding((value) => !value)}><Plus size={14} /> Add</button></div>
      {adding && (
        <form className="source-form" onSubmit={submit}>
          <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Link title" required />
          <input type="url" value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} placeholder="https://…" required />
          <div><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Research</option><option>Flights</option><option>Accommodation</option><option>Logistics</option><option>Food</option><option>Photo credit</option></select><select value={form.ideaId} onChange={(event) => { const idea = ideas.find((item) => item.id === event.target.value); setForm({ ...form, ideaId: event.target.value, scope: idea?.name || 'Whole trip' }) }}><option value="">Whole trip</option>{ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.name}</option>)}</select></div>
          <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Why it matters / what to re-check" />
          <div className="source-form-actions"><button type="button" onClick={() => setAdding(false)}>Cancel</button><button type="submit">Save source</button></div>
        </form>
      )}
      <div className="source-list">
        {sources.map((source, index) => (
          <article key={source.id} className={source.pinned ? 'pinned' : ''}>
            <div className="source-order">
              <button type="button" onClick={() => onMove(source.id, -1)} disabled={index === 0} aria-label={`Move ${source.label} up`}><ArrowUp size={12} /></button>
              <button type="button" onClick={() => onMove(source.id, 1)} disabled={index === sources.length - 1} aria-label={`Move ${source.label} down`}><ArrowDown size={12} /></button>
            </div>
            <a href={source.href} target="_blank" rel="noreferrer"><strong>{source.label}</strong><span>{source.category} · {source.scope}</span>{source.note && <small>{source.note}</small>}</a>
            <div className="source-tools">
              <button type="button" className={source.pinned ? 'active' : ''} onClick={() => onTogglePin(source.id)} title="Pin source"><Pin size={12} /></button>
              <button type="button" onClick={() => onChecked(source.id)} title="Mark checked today"><Check size={12} /></button>
              <button type="button" onClick={() => onDelete(source.id)} title="Delete source"><Trash2 size={12} /></button>
              <a href={source.href} target="_blank" rel="noreferrer" aria-label={`Open ${source.label}`}><ExternalLink size={12} /></a>
            </div>
            {source.lastChecked && <time>Checked {source.lastChecked}</time>}
          </article>
        ))}
      </div>
    </section>
  )
}

export default function MapPanel({ ideas, selectedIdea, onSelect, sources, onAddSource, onDeleteSource, onMoveSource, onCheckedSource, onTogglePin }) {
  const mapRoutes = useMemo(() => {
    const included = ideas.filter((idea) => idea.status === 'included' && idea.coordinates)
    const westernAustralia = included.filter((idea) => idea.region.includes('Western Australia') || idea.region === 'South West WA')
    const tasmania = included.filter((idea) => idea.region === 'Tasmania')
    const southAustralia = included.filter((idea) => idea.region === 'South Australia')
    let airRoute = null
    let planePoint = null
    if (westernAustralia.length && tasmania.length) {
      airRoute = pathGenerator({ type: 'LineString', coordinates: [PERTH, HOBART] })
      planePoint = projection(geoInterpolate(PERTH, HOBART)(0.55))
    } else if (westernAustralia.length && southAustralia.length) {
      airRoute = pathGenerator({ type: 'LineString', coordinates: [PERTH, southAustralia[0].coordinates] })
      planePoint = projection(geoInterpolate(PERTH, southAustralia[0].coordinates)(0.55))
    }
    return { included, waRoad: linePath(westernAustralia), tasRoad: linePath(tasmania), airRoute, planePoint }
  }, [ideas])

  return (
    <aside className="map-panel">
      <div className="map-heading"><div><h2>Route map</h2><p>Natural Earth 1:10m boundary · true coordinates</p></div><Route size={20} /></div>
      <div className="map-canvas">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Accurate map of Australia with included route markers">
          <path className="map-graticule" d={graticulePath} /><path className="map-land" d={landPath} />
          {mapRoutes.waRoad && <path className="road-line wa-road" d={mapRoutes.waRoad} />}{mapRoutes.tasRoad && <path className="road-line tas-road" d={mapRoutes.tasRoad} />}{mapRoutes.airRoute && <path className="flight-arc" d={mapRoutes.airRoute} />}
          {mapRoutes.planePoint && <Plane className="map-plane" x={mapRoutes.planePoint[0] - 6} y={mapRoutes.planePoint[1] - 6} width="12" height="12" strokeWidth="1.8" />}
          {mapRoutes.included.map((idea) => <MapMarker key={idea.id} idea={idea} selected={selectedIdea?.id === idea.id} onSelect={onSelect} />)}
          <text x={australiaLabelPoint[0]} y={australiaLabelPoint[1]} className="map-label">AUSTRALIA</text>
          {selectedIdea?.id !== 'perth' && <text x={perthPoint[0] + 7} y={perthPoint[1] - 7} className="place-label">Perth</text>}
          {selectedIdea?.id !== 'tas-hobart' && <text x={hobartPoint[0] - 7} y={hobartPoint[1] + 13} textAnchor="end" className="place-label">Hobart</text>}
        </svg>
        <div className="map-legend"><span><i className="legend-line road" /> Road route</span><span><i className="legend-line air" /> Flight</span></div>
        <a className="map-attribution" href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/" target="_blank" rel="noreferrer">Natural Earth · public domain</a>
      </div>
      <section className="flight-panel">
        <div className="subheading"><h3>Flights & transfers</h3><Plane size={17} /></div>
        {flightNotes.map((flight) => <article key={flight.route} className="flight-row"><div className="flight-icon"><Plane size={15} /></div><div><strong>{flight.route}</strong><span>{flight.time}</span><p>{flight.detail}</p></div><a href={flight.href} target="_blank" rel="noreferrer">{flight.label}</a></article>)}
        <div className="car-note"><Car size={15} /> Tasmania works best as a road loop; allow slower-than-map driving.</div>
      </section>
      <SourcesEditor sources={sources} ideas={ideas} onAdd={onAddSource} onDelete={onDeleteSource} onMove={onMoveSource} onChecked={onCheckedSource} onTogglePin={onTogglePin} />
    </aside>
  )
}
