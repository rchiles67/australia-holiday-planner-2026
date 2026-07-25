import { useEffect, useMemo, useState } from 'react'
import { geoGraticule, geoInterpolate, geoMercator, geoPath } from 'd3-geo'
import { ArrowDown, ArrowUp, Car, Check, ExternalLink, Pin, Plane, Plus, Route, Trash2 } from 'lucide-react'
import { flightNotes } from '../data.js'
import australiaBoundary from '../map-data/australia-10m.json'

const MAP_WIDTH = 360
const MAP_HEIGHT = 280
const PERTH = [115.8605, -31.9505]
const HOBART = [147.3272, -42.8821]
const overviewProjection = geoMercator().fitExtent([[18, 12], [MAP_WIDTH - 18, MAP_HEIGHT - 16]], australiaBoundary)

function routeGroup(idea) {
  if (idea.region === 'Tasmania') return { key: 'tasmania', label: 'Tasmania' }
  if (idea.region.includes('Western Australia') || idea.region === 'South West WA') return { key: 'wa', label: 'WA road' }
  if (idea.region === 'South Australia') return { key: 'sa', label: 'South Australia' }
  return { key: idea.region.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: idea.region }
}

function projectionForIdeas(ideas) {
  const coordinates = ideas.map((idea) => idea.coordinates)
  const longitudes = coordinates.map(([longitude]) => longitude)
  const latitudes = coordinates.map(([, latitude]) => latitude)
  const minimumLongitude = Math.min(...longitudes)
  const maximumLongitude = Math.max(...longitudes)
  const minimumLatitude = Math.min(...latitudes)
  const maximumLatitude = Math.max(...latitudes)
  const longitudePadding = Math.max(1.1, (maximumLongitude - minimumLongitude) * 0.24)
  const latitudePadding = Math.max(0.9, (maximumLatitude - minimumLatitude) * 0.28)
  const bounds = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minimumLongitude - longitudePadding, minimumLatitude - latitudePadding],
        [minimumLongitude - longitudePadding, maximumLatitude + latitudePadding],
        [maximumLongitude + longitudePadding, maximumLatitude + latitudePadding],
        [maximumLongitude + longitudePadding, minimumLatitude - latitudePadding],
        [minimumLongitude - longitudePadding, minimumLatitude - latitudePadding],
      ]],
    },
  }
  return geoMercator().fitExtent([[20, 14], [MAP_WIDTH - 20, MAP_HEIGHT - 16]], bounds)
}

function linePath(ideas, pathGenerator) {
  if (ideas.length < 2) return null
  return pathGenerator({ type: 'LineString', coordinates: ideas.map((idea) => idea.coordinates) })
}

function returnPath(ideas, pathGenerator) {
  if (ideas.length < 2) return null
  return pathGenerator({ type: 'LineString', coordinates: [ideas[ideas.length - 1].coordinates, ideas[0].coordinates] })
}

function MapMarker({ idea, projection, selected, showLabel, onSelect }) {
  const point = projection(idea.coordinates)
  if (!point) return null
  const labelToLeft = point[0] > MAP_WIDTH * 0.68
  return (
    <g className={`${selected ? 'active-marker' : ''} ${idea.status === 'maybe' ? 'maybe-marker' : ''}`} role="button" tabIndex="0" aria-label={`Open ${idea.name}`} onClick={() => onSelect(idea.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(idea.id) }}>
      <title>{idea.name}</title>
      <circle className={`map-marker ${idea.color}`} cx={point[0]} cy={point[1]} r={idea.status === 'maybe' ? 2.25 : 3.65} />
      <circle className="map-marker-hit" cx={point[0]} cy={point[1]} r="9" />
      {(selected || showLabel) && <text className="selected-map-label" x={labelToLeft ? point[0] - 7 : point[0] + 7} y={point[1] - 7} textAnchor={labelToLeft ? 'end' : 'start'}>{idea.mapLabel || idea.name}</text>}
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
  const [mapTab, setMapTab] = useState('overview')
  const scheduledIdeas = ideas.filter((idea) => idea.status !== 'excluded')
  const hasTasmania = scheduledIdeas.some((idea) => idea.region === 'Tasmania')
  const hasSouthAustralia = scheduledIdeas.some((idea) => idea.region === 'South Australia')
  const applicableFlightIds = new Set([
    'london-perth',
    hasTasmania ? 'perth-hobart' : null,
    hasTasmania ? 'perth-hobart-fallback' : null,
    hasSouthAustralia && !hasTasmania ? 'perth-adelaide' : null,
    hasTasmania && hasSouthAustralia ? 'hobart-adelaide' : null,
    hasTasmania && !hasSouthAustralia ? 'hobart-london' : null,
    hasSouthAustralia ? 'adelaide-london' : null,
    !hasTasmania && !hasSouthAustralia ? 'perth-london' : null,
  ].filter(Boolean))
  const applicableFlights = flightNotes.filter((flight) => applicableFlightIds.has(flight.id))
  const mapRoutes = useMemo(() => {
    const scheduled = ideas.filter((idea) => idea.status !== 'excluded' && idea.coordinates)
    const groups = []
    scheduled.forEach((idea) => {
      const category = routeGroup(idea)
      const previous = groups[groups.length - 1]
      if (previous?.key === category.key) {
        previous.ideas.push(idea)
      } else {
        groups.push({ ...category, id: `${category.key}-${groups.length}`, ideas: [idea] })
      }
    })
    const repeated = new Map()
    groups.forEach((group) => repeated.set(group.key, (repeated.get(group.key) || 0) + 1))
    groups.forEach((group, index) => {
      if (repeated.get(group.key) > 1) group.label = `${group.label} ${index + 1}`
    })
    const activeGroup = groups.find((group) => group.id === mapTab)
    const projection = activeGroup ? projectionForIdeas(activeGroup.ideas) : overviewProjection
    const pathGenerator = geoPath(projection).digits(2)
    const displayedIdeas = activeGroup?.ideas || scheduled
    const roadGroups = activeGroup ? [activeGroup] : groups
    const flights = activeGroup ? [] : groups.slice(1).map((group, index) => {
      const from = groups[index].ideas[0].coordinates
      const to = group.ideas[0].coordinates
      return {
        path: pathGenerator({ type: 'LineString', coordinates: [from, to] }),
        planePoint: projection(geoInterpolate(from, to)(0.52)),
      }
    })
    let graticuleExtent = [[112, -45], [154, -9]]
    if (activeGroup) {
      const longitudes = activeGroup.ideas.map((idea) => idea.coordinates[0])
      const latitudes = activeGroup.ideas.map((idea) => idea.coordinates[1])
      graticuleExtent = [[Math.min(...longitudes) - 3, Math.min(...latitudes) - 3], [Math.max(...longitudes) + 3, Math.max(...latitudes) + 3]]
    }
    return {
      activeGroup,
      displayedIdeas,
      flights,
      groups,
      graticulePath: pathGenerator(geoGraticule().extent(graticuleExtent).step(activeGroup ? [5, 5] : [10, 10])()),
      landPath: pathGenerator(australiaBoundary),
      pathGenerator,
      projection,
      roadGroups,
    }
  }, [ideas, mapTab])

  useEffect(() => {
    if (mapTab !== 'overview' && !mapRoutes.groups.some((group) => group.id === mapTab)) setMapTab('overview')
  }, [mapRoutes.groups, mapTab])

  const perthPoint = mapRoutes.projection(PERTH)
  const hobartPoint = mapRoutes.projection(HOBART)
  const australiaLabelPoint = mapRoutes.projection([134.2, -25.7])

  return (
    <aside className="map-panel">
      <div className="map-heading"><div><h2>Route map</h2><p>{mapRoutes.activeGroup ? `${mapRoutes.activeGroup.label} · fitted to this road section` : 'Natural Earth 1:10m boundary · true coordinates'}</p></div><Route size={20} /></div>
      <div className="map-tabs" role="tablist" aria-label="Route map views">
        <button type="button" role="tab" aria-selected={mapTab === 'overview'} className={mapTab === 'overview' ? 'active' : ''} onClick={() => setMapTab('overview')}>Overview</button>
        {mapRoutes.groups.map((group) => <button key={group.id} type="button" role="tab" aria-selected={mapTab === group.id} className={mapTab === group.id ? 'active' : ''} onClick={() => setMapTab(group.id)}>{group.label}</button>)}
      </div>
      <div className="map-canvas">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={mapRoutes.activeGroup ? `Accurate zoomed map of ${mapRoutes.activeGroup.label}` : 'Accurate overview map of Australia with scheduled route markers'}>
          <path className="map-graticule" d={mapRoutes.graticulePath} /><path className="map-land" d={mapRoutes.landPath} />
          {mapRoutes.roadGroups.map((group) => {
            const path = linePath(group.ideas, mapRoutes.pathGenerator)
            const airportReturn = returnPath(group.ideas, mapRoutes.pathGenerator)
            const roadClass = group.key === 'tasmania' ? 'tas-road' : group.key === 'sa' ? 'sa-road' : 'wa-road'
            return path ? <g key={group.id}><path className={`road-line ${roadClass}`} d={path} /><path className="return-line" d={airportReturn} /></g> : null
          })}
          {mapRoutes.flights.map((flight, index) => <g key={`${flight.path}-${index}`}><path className="flight-arc" d={flight.path} /><Plane className="map-plane" x={flight.planePoint[0] - 6} y={flight.planePoint[1] - 6} width="12" height="12" strokeWidth="1.8" /></g>)}
          {mapRoutes.displayedIdeas.map((idea) => <MapMarker key={idea.id} idea={idea} projection={mapRoutes.projection} selected={selectedIdea?.id === idea.id} showLabel={Boolean(mapRoutes.activeGroup)} onSelect={onSelect} />)}
          {!mapRoutes.activeGroup && <text x={australiaLabelPoint[0]} y={australiaLabelPoint[1]} className="map-label">AUSTRALIA</text>}
          {!mapRoutes.activeGroup && selectedIdea?.id !== 'perth' && <text x={perthPoint[0] + 7} y={perthPoint[1] - 7} className="place-label">Perth</text>}
          {!mapRoutes.activeGroup && selectedIdea?.id !== 'tas-hobart' && <text x={hobartPoint[0] - 7} y={hobartPoint[1] + 13} textAnchor="end" className="place-label">Hobart</text>}
        </svg>
        <div className="map-legend"><span><i className="legend-dot included" /> Include</span><span><i className="legend-dot maybe" /> Maybe</span><span><i className="legend-line road" /> Road route</span><span><i className="legend-line return" /> Last drive</span><span><i className="legend-line air" /> Flight</span></div>
        <a className="map-attribution" href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/" target="_blank" rel="noreferrer">Natural Earth · public domain</a>
      </div>
      <section className="flight-panel">
        <div className="subheading"><h3>Flights & transfers</h3><Plane size={17} /></div>
        {applicableFlights.map((flight) => <article key={flight.id} className="flight-row"><div className="flight-icon"><Plane size={15} /></div><div><strong>{flight.route}</strong><span>{flight.time}</span><p>{flight.detail}</p></div><a href={flight.href} target="_blank" rel="noreferrer">{flight.label}</a></article>)}
        {hasTasmania && <div className="car-note"><Car size={15} /> Tasmania works best as a road loop; allow slower-than-map driving.</div>}
      </section>
      <SourcesEditor sources={sources} ideas={ideas} onAdd={onAddSource} onDelete={onDeleteSource} onMove={onMoveSource} onChecked={onCheckedSource} onTogglePin={onTogglePin} />
    </aside>
  )
}
