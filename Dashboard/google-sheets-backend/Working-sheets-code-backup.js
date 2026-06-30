const WORKERS_SHEET = "Workers";
const ENTRIES_SHEET = "Entries";

const WORKER_HEADERS = ["workerId", "name", "phone", "notes", "createdAt", "updatedAt"];
const ENTRY_HEADERS = ["entryId", "workerId", "date", "shifts", "pay", "status", "updatedAt"];

function doGet(event) {
  const action = event && event.parameter && event.parameter.action;
  const callback = event && event.parameter && event.parameter.callback;
  const result = action === "read" || !action
    ? readState_()
    : { ok: false, error: "Unknown action." };

  return output_(result, callback);
}

function doPost(event) {
  try {
    const rawPayload =
      (event && event.parameter && event.parameter.payload) ||
      (event && event.postData && event.postData.contents) ||
      "{}";
    const payload = JSON.parse(rawPayload);
    const action = payload.action || "read";

    if (action === "read") {
      return output_(readState_());
    }

    if (action === "save") {
      const lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        writeState_(payload.state || { workers: [] });
      } finally {
        lock.releaseLock();
      }
      return output_({ ok: true });
    }

    return output_({ ok: false, error: "Unknown action." });
  } catch (error) {
    return output_({ ok: false, error: error.message || String(error) });
  }
}

function readState_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const workersSheet = ensureSheet_(spreadsheet, WORKERS_SHEET, WORKER_HEADERS);
  const entriesSheet = ensureSheet_(spreadsheet, ENTRIES_SHEET, ENTRY_HEADERS);

  const workers = rowsToObjects_(workersSheet, WORKER_HEADERS).map(function (row) {
    return {
      id: row.workerId,
      name: row.name,
      phone: row.phone,
      notes: row.notes,
      entries: [],
    };
  });

  const workersById = {};
  workers.forEach(function (worker) {
    workersById[worker.id] = worker;
  });

  rowsToObjects_(entriesSheet, ENTRY_HEADERS).forEach(function (row) {
    if (!workersById[row.workerId]) return;
    workersById[row.workerId].entries.push({
      id: row.entryId,
      date: normalizeDate_(row.date),
      shifts: Number(row.shifts) || 0,
      pay: Number(row.pay) || 0,
      status: row.status === "paid" ? "paid" : "pending",
    });
  });

  return { ok: true, state: { workers: workers } };
}

function writeState_(state) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const workersSheet = ensureSheet_(spreadsheet, WORKERS_SHEET, WORKER_HEADERS);
  const entriesSheet = ensureSheet_(spreadsheet, ENTRIES_SHEET, ENTRY_HEADERS);
  const now = new Date().toISOString();
  const workers = Array.isArray(state.workers) ? state.workers : [];

  const workerRows = workers.map(function (worker) {
    return [
      worker.id || Utilities.getUuid(),
      worker.name || "",
      worker.phone || "",
      worker.notes || "",
      now,
      now,
    ];
  });

  const entryRows = [];
  workers.forEach(function (worker) {
    const workerId = worker.id || Utilities.getUuid();
    const entries = Array.isArray(worker.entries) ? worker.entries : [];
    entries.forEach(function (entry) {
      entryRows.push([
        entry.id || Utilities.getUuid(),
        workerId,
        normalizeDate_(entry.date),
        Number(entry.shifts) || 0,
        Number(entry.pay) || 0,
        entry.status === "paid" ? "paid" : "pending",
        now,
      ]);
    });
  });

  replaceRows_(workersSheet, WORKER_HEADERS, workerRows);
  replaceRows_(entriesSheet, ENTRY_HEADERS, entryRows);
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function rowsToObjects_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "";
      });
    })
    .map(function (row) {
      const object = {};
      headers.forEach(function (header, index) {
        object[header] = row[index];
      });
      return object;
    });
}

function replaceRows_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
}

function normalizeDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).slice(0, 10);
}

function output_(data, callback) {
  if (callback) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Invalid callback." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(data) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
