var DRIFT_FOLDER_ID = '1Pb9k399mOkWK0h4z58DwKvBZANy9Wdoi';
var MAX_PLAN_BYTES = 2 * 1024 * 1024;
var DESCRIPTION_PREFIX = 'Drift planner bridge request: ';

function doGet(event) {
  try {
    var parameters = event && event.parameter ? event.parameter : {};
    var action = parameters.action || 'ping';
    var result;
    if (action === 'ping') result = { ok: true, service: 'Drift Google Drive bridge' };
    else if (action === 'list') result = { ok: true, files: listPlans_() };
    else if (action === 'load') result = loadPlan_(parameters.fileId);
    else throw new Error('Unknown action.');
    return output_(result, parameters.prefix);
  } catch (error) {
    return output_({ ok: false, error: error.message || String(error) }, event && event.parameter && event.parameter.prefix);
  }
}

function doPost(event) {
  try {
    var request = JSON.parse(event.postData.contents || '{}');
    if (request.action !== 'save') throw new Error('Unknown action.');
    return output_(savePlan_(request));
  } catch (error) {
    return output_({ ok: false, error: error.message || String(error) });
  }
}

function savePlan_(request) {
  var fileName = safeFileName_(request.fileName);
  var content = String(request.content || '');
  if (!content || content.length > MAX_PLAN_BYTES) throw new Error('The plan is empty or larger than 2 MB.');
  var plan = JSON.parse(content);
  if (!Array.isArray(plan.ideas) || !Array.isArray(plan.directions)) throw new Error('The JSON is not a Drift plan.');

  var folder = DriveApp.getFolderById(DRIFT_FOLDER_ID);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var file = request.fileId ? fileInFolder_(folder, request.fileId) : null;
    if (!file) {
      var matches = folder.getFilesByName(fileName);
      if (matches.hasNext()) file = matches.next();
    }
    if (file) {
      file.setName(fileName);
      file.setContent(content);
    } else {
      file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
    }
    file.setDescription(DESCRIPTION_PREFIX + safeRequestId_(request.requestId));
    return { ok: true, file: fileRecord_(file) };
  } finally {
    lock.releaseLock();
  }
}

function listPlans_() {
  var folder = DriveApp.getFolderById(DRIFT_FOLDER_ID);
  var files = folder.getFiles();
  var plans = [];
  while (files.hasNext()) {
    var file = files.next();
    if (/\.json$/i.test(file.getName()) && !file.isTrashed()) plans.push(fileRecord_(file));
  }
  plans.sort(function (left, right) { return right.modifiedTime.localeCompare(left.modifiedTime); });
  return plans;
}

function loadPlan_(fileId) {
  var folder = DriveApp.getFolderById(DRIFT_FOLDER_ID);
  var file = fileInFolder_(folder, fileId);
  if (!file || file.isTrashed()) throw new Error('That plan is no longer in Drift-shared.');
  var content = file.getBlob().getDataAsString('UTF-8');
  if (content.length > MAX_PLAN_BYTES) throw new Error('The plan is larger than 2 MB.');
  return { ok: true, file: fileRecord_(file), plan: JSON.parse(content) };
}

function fileInFolder_(folder, fileId) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(fileId || ''))) return null;
  var file;
  try { file = DriveApp.getFileById(fileId); } catch (error) { return null; }
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folder.getId()) return file;
  }
  return null;
}

function fileRecord_(file) {
  var description = file.getDescription() || '';
  return {
    id: file.getId(),
    name: file.getName(),
    modifiedTime: file.getLastUpdated().toISOString(),
    size: file.getSize(),
    requestId: description.indexOf(DESCRIPTION_PREFIX) === 0 ? description.substring(DESCRIPTION_PREFIX.length) : ''
  };
}

function safeFileName_(value) {
  var name = String(value || '2026-Australia-plan.json').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim();
  if (!name) name = '2026-Australia-plan.json';
  if (!/\.json$/i.test(name)) name += '.json';
  return name.substring(0, 180);
}

function safeRequestId_(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 100);
}

function output_(result, prefix) {
  var json = JSON.stringify(result).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  if (prefix) {
    var callback = String(prefix);
    if (!/^[A-Za-z_$][0-9A-Za-z_$\.]{0,100}$/.test(callback)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Invalid callback.' })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
