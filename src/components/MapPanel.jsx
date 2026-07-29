import { useEffect, useMemo, useState } from 'react'
import { geoGraticule, geoInterpolate, geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { ArrowDown, ArrowUp, Car, Check, ExternalLink, Pin, Plane, Plus, Trash2 } from 'lucide-react'
import { flightNotes, ideaDisplayColor } from '../data.js'
import { formatShortDate } from '../schedule.js'
import australiaBoundary from '../map-data/australia-10m.json'
import worldTopology from 'world-atlas/countries-110m.json'
import JourneyCalendar from './JourneyCalendar.jsx'

const MAP_WIDTH = 360
const MAP_HEIGHT = 280
const PERTH = [115.8605, -31.9505]
const HOBART = [147.3272, -42.8821]
const MELBOURNE = [144.9631, -37.8136]
const SYDNEY = [151.2093, -33.8688]
const overviewProjection = geoMercator().fitExtent([[18, 12], [MAP_WIDTH - 18, MAP_HEIGHT - 16]], australiaBoundary)
const worldCountries = feature(worldTopology, worldTopology.objects.countries)

function isOutsideAustralia(idea) {
  return idea.coordinates[0] < 110 || idea.coordinates[0] > 155 || idea.coordinates[1] < -46 || idea.coordinates[1] > -8
}

function routeGroup(idea) {
  if (idea.mapGroup) {
    const key = idea.mapGroup.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'
    const aliases = {
      'western-australia': { key: 'wa', label: 'Perth & WA' },
      'perth-wa': { key: 'wa', label: 'Perth & WA' },
      'south-west-wa': { key: 'wa', label: 'Perth & WA' },
      'the-kimberley': { key: 'kimberley', label: 'Kimberley' },
      kimberley: { key: 'kimberley', label: 'Kimberley' },
      tasmania: { key: 'tasmania', label: 'Tasmania' },
      victoria: { key: 'victoria', label: 'Victoria' },
      'new-south-wales': { key: 'nsw', label: 'Sydney & surrounds' },
      'sydney-surrounds': { key: 'nsw', label: 'Sydney & surrounds' },
    }
    return aliases[key] || { key, label: idea.mapGroup }
  }
  if (idea.region === 'Tasmania') return { key: 'tasmania', label: 'Tasmania' }
  if (idea.region.includes('Western Australia') || idea.region === 'South West WA') return { key: 'wa', label: 'Perth & WA' }
  if (idea.region === 'Victoria') return { key: 'victoria', label: 'Victoria' }
  if (idea.region === 'New South Wales') return { key: 'nsw', label: 'Sydney & surrounds' }
  return { key: idea.region.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: idea.region }
}

const transitionFlights = {
  'kimberley:wa': ['kununurra-perth'],
  'wa:kimberley': ['perth-kununurra'],
  'wa:tasmania': ['perth-hobart', 'perth-hobart-fallback'],
  'wa:victoria': ['perth-melbourne'],
  'wa:nsw': ['perth-sydney'],
  'tasmania:victoria': ['hobart-melbourne'],
  'tasmania:nsw': ['hobart-sydney'],
  'victoria:nsw': ['melbourne-sydney'],
}

const returnFlights = {
  wa: 'perth-london',
  tasmania: 'hobart-london',
  victoria: 'melbourne-london',
  nsw: 'sydney-london',
  kimberley: 'kununurra-perth',
}

function flightDatesForSchedule(schedule) {
  const dates = new Map()
  if (!schedule?.entries.length) return dates
  const entries = schedule.entries
  const flightCardIds = new Map([
    ['wa-kimberley-transit', 'perth-kununurra'],
    ['kimberley-perth-transit', 'kununurra-perth'],
    ['wa-tas-transit', 'perth-hobart'],
    ['tas-sydney-transit', 'hobart-sydney'],
    ['perth-melbourne-transit', 'perth-melbourne'],
    ['melbourne-sydney-transit', 'melbourne-sydney'],
  ])
  entries.forEach((entry) => {
    const flightId = flightCardIds.get(entry.id)
    if (flightId) dates.set(flightId, entry.startDate)
  })
  const waTasTransit = entries.find((entry) => entry.id === 'wa-tas-transit')
  if (waTasTransit) {
    dates.set('perth-hobart', waTasTransit.startDate)
    dates.set('perth-hobart-fallback', waTasTransit.startDate)
  }
  const locationEntries = entries.filter((entry) => entry.kind !== 'flight')
  if (!locationEntries.length) return dates
  let previousGroup = routeGroup(locationEntries[0]).key
  if (previousGroup === 'wa' || previousGroup === 'kimberley') dates.set('london-perth', schedule.tripStart)
  if (previousGroup === 'kimberley') {
    const firstKimberleyStop = entries.find((entry) => routeGroup(entry).key === 'kimberley' && entry.id !== 'wa-kimberley-transit')
    dates.set('perth-kununurra', firstKimberleyStop?.startDate || schedule.tripStart)
  }
  locationEntries.slice(1).forEach((entry) => {
    const group = routeGroup(entry).key
    if (group === previousGroup) return
    ;(transitionFlights[`${previousGroup}:${group}`] || []).forEach((id) => {
      if (!dates.has(id)) dates.set(id, entry.startDate)
    })
    previousGroup = group
  })
  const returnFlightId = returnFlights[previousGroup]
  if (returnFlightId) dates.set(returnFlightId, schedule.tripEnd)
  return dates
}

function datedFlightHref(flight, date) {
  if (!date || !flight.from || !flight.to) return flight.href
  const dateText = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const viaText = flight.via ? ` via ${flight.via}` : ''
  const query = `One way flights from ${flight.from} to ${flight.to}${viaText} on ${dateText}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`
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
  if (idea.kind === 'flight' || idea.hideMapMarker || idea.id === 'wa-kimberley-transit') return null
  const point = projection(idea.coordinates)
  if (!point) return null
  const labelToLeft = point[0] > MAP_WIDTH * 0.68
  return (
    <g className={`${selected ? 'active-marker' : ''} ${idea.status === 'maybe' ? 'maybe-marker' : ''}`} role="button" tabIndex="0" aria-label={`Open ${idea.name}`} onClick={() => onSelect(idea.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(idea.id) }}>
      <title>{idea.name}</title>
      <circle className={`map-marker ${ideaDisplayColor(idea)}`} cx={point[0]} cy={point[1]} r={idea.status === 'maybe' ? 2.25 : 3.65} />
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

export default function MapPanel({ ideas, selectedIdea, onSelect, onReorder, sources, onAddSource, onDeleteSource, onMoveSource, onCheckedSource, onTogglePin, routeMode = false, schedule }) {
  const [mapTab, setMapTab] = useState('overview')
  const scheduledIdeas = ideas.filter((idea) => idea.status !== 'excluded' && idea.kind !== 'flight')
  const hasTasmania = scheduledIdeas.some((idea) => idea.region === 'Tasmania')
  const travelGroups = scheduledIdeas.reduce((groups, idea) => {
    const key = routeGroup(idea).key
    if (groups[groups.length - 1] !== key) groups.push(key)
    return groups
  }, [])
  const applicableFlightIds = new Set()
  if (travelGroups[0] === 'wa' || travelGroups[0] === 'kimberley') applicableFlightIds.add('london-perth')
  if (travelGroups[0] === 'kimberley') applicableFlightIds.add('perth-kununurra')
  travelGroups.slice(1).forEach((group, index) => {
    ;(transitionFlights[`${travelGroups[index]}:${group}`] || []).forEach((id) => applicableFlightIds.add(id))
  })
  if (returnFlights[travelGroups[travelGroups.length - 1]]) applicableFlightIds.add(returnFlights[travelGroups[travelGroups.length - 1]])
  const flightDates = flightDatesForSchedule(schedule)
  const applicableFlights = flightNotes.filter((flight) => applicableFlightIds.has(flight.id)).map((flight) => {
    const date = flightDates.get(flight.id)
    return { ...flight, date, href: datedFlightHref(flight, date) }
  })
  const mapRoutes = useMemo(() => {
    const scheduled = ideas.filter((idea) => idea.status !== 'excluded' && idea.kind !== 'flight' && idea.coordinates)
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
    const hasInternationalStop = scheduled.some(isOutsideAustralia)
    const activeGroupIsInternational = activeGroup?.ideas.some(isOutsideAustralia)
    const projection = activeGroup ? projectionForIdeas(activeGroup.ideas) : hasInternationalStop ? projectionForIdeas(scheduled) : overviewProjection
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
      hasInternationalStop,
      landPath: pathGenerator(hasInternationalStop && (!activeGroup || activeGroupIsInternational) ? worldCountries : australiaBoundary),
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
  const melbournePoint = mapRoutes.projection(MELBOURNE)
  const sydneyPoint = mapRoutes.projection(SYDNEY)
  const australiaLabelPoint = mapRoutes.projection([134.2, -25.7])

  return (
    <aside className={`map-panel ${routeMode ? 'route-overview' : ''}`}>
      <div className="map-heading"><div><h2>Route map</h2><p>{mapRoutes.activeGroup ? `${mapRoutes.activeGroup.label} · fitted to this road section` : mapRoutes.hasInternationalStop ? 'Natural Earth world boundaries · true coordinates' : 'Natural Earth 1:10m boundary · true coordinates'}</p></div></div>
      <div className="map-tabs" role="tablist" aria-label="Route map views">
        <button type="button" role="tab" aria-selected={mapTab === 'overview'} className={mapTab === 'overview' ? 'active' : ''} onClick={() => setMapTab('overview')}>Overview</button>
        {mapRoutes.groups.map((group) => <button key={group.id} type="button" role="tab" aria-selected={mapTab === group.id} className={mapTab === group.id ? 'active' : ''} onClick={() => setMapTab(group.id)}>{group.label}</button>)}
      </div>
      <div className="map-canvas">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={mapRoutes.activeGroup ? `Accurate zoomed map of ${mapRoutes.activeGroup.label}` : mapRoutes.hasInternationalStop ? 'Accurate overview map of the scheduled journey' : 'Accurate overview map of Australia with scheduled route markers'}>
          <path className="map-graticule" d={mapRoutes.graticulePath} /><path className="map-land" d={mapRoutes.landPath} />
          {mapRoutes.roadGroups.map((group) => {
            const path = linePath(group.ideas, mapRoutes.pathGenerator)
            const airportReturn = returnPath(group.ideas, mapRoutes.pathGenerator)
            const roadClass = group.key === 'tasmania' ? 'tas-road' : group.key === 'victoria' ? 'vic-road' : group.key === 'nsw' ? 'nsw-road' : 'wa-road'
            return path ? <g key={group.id}><path className={`road-line ${roadClass}`} d={path} /><path className="return-line" d={airportReturn} /></g> : null
          })}
          {mapRoutes.flights.map((flight, index) => <g key={`${flight.path}-${index}`}><path className="flight-arc" d={flight.path} /><Plane className="map-plane" x={flight.planePoint[0] - 6} y={flight.planePoint[1] - 6} width="12" height="12" strokeWidth="1.8" /></g>)}
          {!mapRoutes.activeGroup && mapRoutes.groups.map((group) => {
            const center = mapRoutes.projection([
              group.ideas.reduce((sum, idea) => sum + idea.coordinates[0], 0) / group.ideas.length,
              group.ideas.reduce((sum, idea) => sum + idea.coordinates[1], 0) / group.ideas.length,
            ])
            const width = Math.max(45, group.label.length * 4.7 + 14)
            const labelY = center[1] > MAP_HEIGHT - 58 ? center[1] - 29 : center[1] + 10
            return <g key={`label-${group.id}`} className="map-region-label" role="button" tabIndex="0" aria-label={`Zoom to ${group.label}`} onClick={() => setMapTab(group.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setMapTab(group.id) }}><rect x={center[0] - width / 2} y={labelY} width={width} height="17" rx="8.5" /><text x={center[0]} y={labelY + 11.5} textAnchor="middle">{group.label}</text></g>
          })}
          {mapRoutes.displayedIdeas.map((idea) => <MapMarker key={idea.id} idea={idea} projection={mapRoutes.projection} selected={selectedIdea?.id === idea.id} showLabel={Boolean(mapRoutes.activeGroup)} onSelect={onSelect} />)}
          {!mapRoutes.activeGroup && !mapRoutes.hasInternationalStop && <text x={australiaLabelPoint[0]} y={australiaLabelPoint[1]} className="map-label">AUSTRALIA</text>}
          {!mapRoutes.activeGroup && travelGroups.includes('wa') && selectedIdea?.id !== 'perth' && <text x={perthPoint[0] + 7} y={perthPoint[1] - 7} className="place-label">Perth</text>}
          {!mapRoutes.activeGroup && travelGroups.includes('tasmania') && selectedIdea?.id !== 'tas-hobart' && <text x={hobartPoint[0] - 7} y={hobartPoint[1] + 13} textAnchor="end" className="place-label">Hobart</text>}
          {!mapRoutes.activeGroup && travelGroups.includes('victoria') && selectedIdea?.id !== 'vic-melbourne' && <text x={melbournePoint[0] - 7} y={melbournePoint[1] + 13} textAnchor="end" className="place-label">Melbourne</text>}
          {!mapRoutes.activeGroup && travelGroups.includes('nsw') && selectedIdea?.id !== 'nsw-sydney' && <text x={sydneyPoint[0] + 7} y={sydneyPoint[1] - 7} className="place-label">Sydney</text>}
        </svg>
        <div className="map-legend"><span><i className="legend-dot included" /> Include</span><span><i className="legend-dot maybe" /> Maybe</span><span><i className="legend-line road" /> Road route</span><span><i className="legend-line return" /> Last drive</span><span><i className="legend-line air" /> Flight</span></div>
        <a className="map-attribution" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth · public domain</a>
      </div>
      {routeMode && schedule && <JourneyCalendar schedule={schedule} onSelect={onSelect} onReorder={onReorder} />}
      <section className="flight-panel">
        <div className="subheading"><h3>Flights & transfers</h3><Plane size={17} /></div>
        {applicableFlights.map((flight) => <article key={flight.id} className="flight-row"><div className="flight-icon"><Plane size={15} /></div><div><strong>{flight.route}</strong><span>{flight.date ? `${formatShortDate(flight.date, true)} · One-way` : flight.time}</span><p>{flight.detail}</p></div><a href={flight.href} target="_blank" rel="noreferrer" aria-label={`${flight.label} ${flight.route}${flight.date ? ` on ${formatShortDate(flight.date, true)}, one-way` : ''}`}>{flight.label}</a></article>)}
        {hasTasmania && <div className="car-note"><Car size={15} /> Tasmania works best as a road loop; allow slower-than-map driving.</div>}
      </section>
      <SourcesEditor sources={sources} ideas={ideas} onAdd={onAddSource} onDelete={onDeleteSource} onMove={onMoveSource} onChecked={onCheckedSource} onTogglePin={onTogglePin} />
    </aside>
  )
}
