import { Cloud, Download, ExternalLink, FolderOpen, RefreshCw, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { getSavedBridgeUrl, listDrivePlans, loadDrivePlan, saveBridgeUrl, savePlanToDrive } from '../driveBridge.js'

const SHARED_DRIVE_URL = 'https://drive.google.com/drive/folders/1Pb9k399mOkWK0h4z58DwKvBZANy9Wdoi'

function readableDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function PlanTransferModal({ onClose, onExport, onImport, onImportPayload, plan }) {
  const [fileName, setFileName] = useState('2026-Australia-plan.json')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [bridgeUrl, setBridgeUrl] = useState(() => getSavedBridgeUrl())
  const [editingBridge, setEditingBridge] = useState(() => !getSavedBridgeUrl())
  const [driveFiles, setDriveFiles] = useState([])
  const [selectedDriveFileId, setSelectedDriveFileId] = useState('')

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    const result = await onImport(file)
    setMessage(result.message)
    setBusy(false)
  }

  async function refreshDrive(urlValue = bridgeUrl) {
    setBusy(true)
    setMessage('Connecting to Drift-shared…')
    try {
      const url = saveBridgeUrl(urlValue)
      const files = await listDrivePlans(url)
      setBridgeUrl(url)
      setEditingBridge(false)
      setDriveFiles(files)
      setSelectedDriveFileId((current) => files.some((file) => file.id === current) ? current : files[0]?.id || '')
      setMessage(files.length ? `Connected. Found ${files.length} shared plan${files.length === 1 ? '' : 's'}.` : 'Connected. No shared plans have been saved yet.')
      return files
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to Google Drive.')
      setEditingBridge(true)
      return []
    } finally {
      setBusy(false)
    }
  }

  async function saveToDrive() {
    setBusy(true)
    setMessage('Saving and confirming the plan in Drift-shared…')
    try {
      const saved = await savePlanToDrive(bridgeUrl, fileName, plan)
      const files = await listDrivePlans(bridgeUrl)
      setDriveFiles(files)
      setSelectedDriveFileId(saved.id)
      setFileName(saved.name)
      setMessage(`Saved “${saved.name}” to Drift-shared.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The plan could not be saved to Drive.')
    } finally {
      setBusy(false)
    }
  }

  async function openFromDrive() {
    if (!selectedDriveFileId) return
    setBusy(true)
    setMessage('Opening the shared plan…')
    try {
      const loaded = await loadDrivePlan(bridgeUrl, selectedDriveFileId)
      const result = await onImportPayload(loaded.plan, loaded.file.name)
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The shared plan could not be opened.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="idea-modal transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-plan-title">
        <div className="modal-heading">
          <div><span>Plan file</span><h2 id="transfer-plan-title">Save, export or import</h2></div>
          <button type="button" onClick={onClose} aria-label="Close plan transfer"><X size={18} /></button>
        </div>

        <div className="transfer-section transfer-drive-section">
          <div className="transfer-section-heading"><div><strong>Shared Google Drive</strong><p>Save this plan directly, or open the latest plan shared by either traveller.</p></div><Cloud size={18} /></div>
          {editingBridge ? (
            <div className="bridge-connect-row">
              <label>
                Apps Script bridge URL
                <input type="url" value={bridgeUrl} onChange={(event) => setBridgeUrl(event.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
              </label>
              <button type="button" className="transfer-secondary" onClick={() => refreshDrive()} disabled={busy || !bridgeUrl.trim()}>Connect</button>
            </div>
          ) : (
            <div className="bridge-connected-row"><span><i /> Drive bridge connected</span><button type="button" onClick={() => setEditingBridge(true)}>Change</button></div>
          )}
          <label>
            Shared plan name
            <input type="text" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="2026-Australia-Richards plan.json" />
          </label>
          <div className="transfer-actions">
            <button type="button" className="transfer-primary" onClick={saveToDrive} disabled={busy || editingBridge || !bridgeUrl}><Cloud size={15} /> Save to Drive</button>
            <button type="button" className="transfer-secondary" onClick={() => refreshDrive()} disabled={busy || editingBridge || !bridgeUrl}><RefreshCw size={14} /> Refresh list</button>
          </div>
          {driveFiles.length > 0 && (
            <div className="drive-open-row">
              <label>
                Plans in Drift-shared
                <select value={selectedDriveFileId} onChange={(event) => setSelectedDriveFileId(event.target.value)}>
                  {driveFiles.map((file) => <option key={file.id} value={file.id}>{file.name} — {readableDate(file.modifiedTime)}</option>)}
                </select>
              </label>
              <button type="button" className="transfer-secondary" onClick={openFromDrive} disabled={busy || !selectedDriveFileId}><FolderOpen size={14} /> Open</button>
            </div>
          )}
        </div>

        <details className="transfer-local-options">
          <summary>Local JSON backup and import</summary>
          <div className="transfer-section">
            <div><strong>Download this plan</strong><p>Keep a local backup using the shared plan name above.</p></div>
            <button type="button" className="transfer-secondary" onClick={() => { onExport(fileName); setMessage('Plan downloaded to this device.') }}><Download size={15} /> Download JSON</button>
          </div>
          <div className="transfer-section">
            <div><strong>Import from this device</strong><p>This replaces the plan saved in this browser after validation and confirmation.</p></div>
            <label className="transfer-file-button">
              <Upload size={15} /> {busy ? 'Reading plan…' : 'Choose JSON to import'}
              <input type="file" accept="application/json,.json" onChange={importFile} disabled={busy} />
            </label>
          </div>
        </details>

        <div className="transfer-drive-note">
          <p>The bridge is restricted to planner JSON files in <strong>Drift-shared</strong>. Drive also keeps its own file activity and revisions.</p>
          <a href={SHARED_DRIVE_URL} target="_blank" rel="noreferrer">Open shared Google Drive <ExternalLink size={13} /></a>
        </div>

        {message && <p className="transfer-message" role="status">{message}</p>}
      </section>
    </div>
  )
}
