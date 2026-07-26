import { MapPin, Search, X } from 'lucide-react'
import { useState } from 'react'

export default function AddIdeaModal({ idea, areas = [], initialArea = '', onClose, onSave }) {
  const editing = Boolean(idea)
  const [form, setForm] = useState({
    name: idea?.name || '',
    region: idea?.region || '',
    area: idea?.area || initialArea || areas[0] || 'Other ideas',
    mapGroup: idea?.mapGroup || idea?.region || '',
    latitude: idea?.coordinates?.[1] ?? '',
    longitude: idea?.coordinates?.[0] ?? '',
    wikipediaUrl: idea?.wikipediaUrl || '',
    days: idea?.days || 3,
    summary: idea?.summary || '',
    note: idea?.note || '',
  })
  const [wikiQuery, setWikiQuery] = useState(idea?.wikipediaUrl || idea?.name || '')
  const [lookupState, setLookupState] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function findWikipediaCoordinates() {
    const query = wikiQuery.trim()
    if (!query) return
    setLookupState('Looking up coordinates…')
    try {
      let title = query
      if (/^https?:\/\//i.test(query)) {
        const url = new URL(query)
        const match = url.pathname.match(/\/wiki\/(.+)$/)
        if (!match) throw new Error('Use an English Wikipedia article URL or article title.')
        title = decodeURIComponent(match[1]).replaceAll('_', ' ')
      }
      const endpoint = new URL('https://en.wikipedia.org/w/api.php')
      endpoint.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', redirects: '1', prop: 'coordinates', titles: title })
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Wikipedia did not respond.')
      const payload = await response.json()
      const page = Object.values(payload.query?.pages || {})[0]
      const coordinates = page?.coordinates?.[0]
      if (!coordinates) throw new Error('That article has no coordinates. Enter them manually below.')
      const canonicalTitle = page.title || title
      setForm((current) => ({
        ...current,
        latitude: Number(coordinates.lat.toFixed(6)),
        longitude: Number(coordinates.lon.toFixed(6)),
        wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replaceAll(' ', '_'))}`,
        mapGroup: current.mapGroup || current.region || current.area,
      }))
      setLookupState(`Found ${canonicalTitle}. Check the marker after saving.`)
    } catch (error) {
      setLookupState(error instanceof Error ? error.message : 'Coordinates could not be found.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="idea-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2>{editing ? 'Edit idea' : 'Add an idea'}</h2>
            <p>{editing ? 'Correct the card’s name, region and planning notes.' : 'Capture it now; decide whether it fits later.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <label>
          Place or route
          <input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Bruny Island" required />
        </label>
        <div className="form-row">
          <label>
            Region
            <input value={form.region} onChange={(event) => update('region', event.target.value)} placeholder="e.g. Tasmania" />
          </label>
          <label>
            Days
            <input type="number" min="1" max="14" value={form.days} onChange={(event) => update('days', Number(event.target.value))} />
          </label>
        </div>
        <label>
          Idea group
          <input list="idea-area-options" value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="e.g. East Tasmania" required />
          <datalist id="idea-area-options">{areas.map((area) => <option key={area} value={area} />)}</datalist>
          <small>Change this to move the card to another expandable area.</small>
        </label>
        <fieldset className="map-fields">
          <legend><MapPin size={13} /> Map placement</legend>
          <label>
            Route map group
            <input value={form.mapGroup} onChange={(event) => update('mapGroup', event.target.value)} placeholder="e.g. Tasmania or Singapore" />
            <small>Places in the same group share a zoom map and road leg.</small>
          </label>
          <div className="wiki-lookup">
            <label>Wikipedia article or title<input value={wikiQuery} onChange={(event) => setWikiQuery(event.target.value)} placeholder="e.g. The Nut (Tasmania)" /></label>
            <button type="button" onClick={findWikipediaCoordinates}><Search size={14} /> Find</button>
          </div>
          {lookupState && <p className="lookup-state" aria-live="polite">{lookupState}</p>}
          <div className="coordinate-row">
            <label>Latitude<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(event) => update('latitude', event.target.value)} placeholder="-42.8821" /></label>
            <label>Longitude<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(event) => update('longitude', event.target.value)} placeholder="147.3272" /></label>
          </div>
          <small className="map-fields-note">You can use Wikipedia lookup or type coordinates manually. The saved Wikipedia page is added as a source for this idea.</small>
        </fieldset>
        <label>
          Short description
          <input value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder="Why it might earn a place" />
        </label>
        <label>
          Notes
          <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Route constraints, walks, food, links…" />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">{editing ? 'Save changes' : 'Add as Maybe'}</button>
        </div>
      </form>
    </div>
  )
}
