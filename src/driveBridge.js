const BRIDGE_STORAGE_KEY = 'drift-google-drive-bridge-url'
const DEFAULT_BRIDGE_URL = import.meta.env.VITE_DRIVE_BRIDGE_URL || 'https://script.google.com/macros/s/AKfycbyciIfqxb73y-jLS673UiLS0JMikfpjIkCRd9CbstrzfsHvgT1_LsI03tq6rfGK67zB/exec'
const JSONP_TIMEOUT_MS = 15000

export function getSavedBridgeUrl() {
  return localStorage.getItem(BRIDGE_STORAGE_KEY) || DEFAULT_BRIDGE_URL
}

export function saveBridgeUrl(value) {
  const url = normaliseBridgeUrl(value)
  if (url) localStorage.setItem(BRIDGE_STORAGE_KEY, url)
  else localStorage.removeItem(BRIDGE_STORAGE_KEY)
  return url
}

export function normaliseBridgeUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error('Use the deployed Apps Script URL ending in /exec.')
  }
  return url
}

function jsonpRequest(bridgeUrl, parameters) {
  return new Promise((resolve, reject) => {
    const callbackRoot = '__driftDriveBridgeCallbacks'
    const callbackName = `request${Date.now()}${Math.random().toString(36).slice(2)}`
    const callbackPath = `${callbackRoot}.${callbackName}`
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => finish(new Error('The Google Drive bridge did not respond.')), JSONP_TIMEOUT_MS)

    window[callbackRoot] ||= {}
    window[callbackRoot][callbackName] = (result) => {
      if (result?.ok) finish(null, result)
      else finish(new Error(result?.error || 'The Google Drive bridge returned an error.'))
    }

    function finish(error, result) {
      window.clearTimeout(timeout)
      script.remove()
      delete window[callbackRoot]?.[callbackName]
      if (error) reject(error)
      else resolve(result)
    }

    const query = new URLSearchParams({ ...parameters, prefix: callbackPath })
    script.src = `${normaliseBridgeUrl(bridgeUrl)}?${query}`
    script.onerror = () => finish(new Error('The Google Drive bridge could not be reached.'))
    document.head.appendChild(script)
  })
}

export async function listDrivePlans(bridgeUrl) {
  const result = await jsonpRequest(bridgeUrl, { action: 'list' })
  return Array.isArray(result.files) ? result.files : []
}

export async function loadDrivePlan(bridgeUrl, fileId) {
  const result = await jsonpRequest(bridgeUrl, { action: 'load', fileId })
  return { file: result.file, plan: result.plan }
}

export async function savePlanToDrive(bridgeUrl, fileName, plan, existingFileId = '') {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  await fetch(normaliseBridgeUrl(bridgeUrl), {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      action: 'save',
      fileName,
      fileId: existingFileId,
      requestId,
      content: JSON.stringify(plan, null, 2),
    }),
  })

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 700 + attempt * 250))
    const files = await listDrivePlans(bridgeUrl)
    const saved = files.find((file) => file.requestId === requestId)
    if (saved) return saved
  }
  throw new Error('The save was sent, but the planner could not confirm it in Drive. Check the shared folder before trying again.')
}
