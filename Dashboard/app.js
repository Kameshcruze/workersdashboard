const LEGACY_STORAGE_KEY = "veliksha-workers-dashboard";
const DEFAULT_BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzdfNJkEZXFQWtnODz4bsMBrIXDcZCxS8xgYzMtugvi_cNJrNomLp-g7zDyk7ofyuXi/exec";
const ENTRY_SAVE_SUCCESS_MESSAGE = "Successfully added the record.";

let state = { workers: [] };
let activeWorkerId = null;
let backendUrl = DEFAULT_BACKEND_URL;
let isSaving = false;
let isReady = false;
let pendingSaveState = null;
let saveTimer = null;
let saveInFlight = false;
let saveMessage = "Saved to Database.";

const elements = {
  workerForm: document.querySelector("#workerForm"),
  workerName: document.querySelector("#workerName"),
  workerPhone: document.querySelector("#workerPhone"),
  workerNotes: document.querySelector("#workerNotes"),
  shiftForm: document.querySelector("#shiftForm"),
  shiftWorker: document.querySelector("#shiftWorker"),
  shiftDate: document.querySelector("#shiftDate"),
  shiftCount: document.querySelector("#shiftCount"),
  shiftPay: document.querySelector("#shiftPay"),
  paymentStatus: document.querySelector("#paymentStatus"),
  entryFeedback: document.querySelector("#entryFeedback"),
  datewiseInput: document.querySelector("#datewiseInput"),
  datewiseSummary: document.querySelector("#datewiseSummary"),
  datewiseTable: document.querySelector("#datewiseTable"),
  datewiseEmpty: document.querySelector("#datewiseEmpty"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  workersTable: document.querySelector("#workersTable"),
  emptyState: document.querySelector("#emptyState"),
  totalWorkers: document.querySelector("#totalWorkers"),
  totalShifts: document.querySelector("#totalShifts"),
  amountDue: document.querySelector("#amountDue"),
  amountPaid: document.querySelector("#amountPaid"),
  appStatus: document.querySelector("#appStatus"),
  exportBtn: document.querySelector("#exportBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  workerDialog: document.querySelector("#workerDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogSummary: document.querySelector("#dialogSummary"),
  entriesTable: document.querySelector("#entriesTable"),
  closeDialog: document.querySelector("#closeDialog"),
  deleteWorkerBtn: document.querySelector("#deleteWorkerBtn"),
};

elements.shiftDate.value = todayString();
elements.datewiseInput.value = elements.shiftDate.value;

elements.workerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ensureBackend()) return;

  const name = elements.workerName.value.trim();
  if (!name) return;
  const submitButton = event.submitter;
  const newWorker = {
    id: crypto.randomUUID(),
    name,
    phone: elements.workerPhone.value.trim(),
    notes: elements.workerNotes.value.trim(),
    entries: [],
  };

  state.workers.push(newWorker);
  render();
  await withButtonLoading(submitButton, () => queueStateSave("Worker saved to Database."));
  elements.workerForm.reset();
});

elements.shiftForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ensureBackend()) return;

  const workerId = elements.shiftWorker.value;
  const date = elements.shiftDate.value;
  const shifts = Number(elements.shiftCount.value);
  const pay = Number(elements.shiftPay.value);
  const existingWorker = state.workers.find((item) => item.id === workerId);
  if (!existingWorker) return;
  const existingEntry = existingWorker?.entries.find((entry) => entry.date === date);
  const entryPayload = {
    id: existingEntry?.id || crypto.randomUUID(),
    workerId,
    date,
    shifts,
    pay,
    status: elements.paymentStatus.value,
  };

  if (existingEntry) {
    existingEntry.shifts = shifts;
    existingEntry.pay = pay;
    existingEntry.status = elements.paymentStatus.value;
  } else {
    existingWorker.entries.push({
      id: entryPayload.id,
      date,
      shifts,
      pay,
      status: entryPayload.status,
    });
  }
  elements.datewiseInput.value = date;
  render();
  await withButtonLoading(event.submitter, () => queueStateSave(ENTRY_SAVE_SUCCESS_MESSAGE));
});

elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.datewiseInput.addEventListener("change", render);
elements.refreshBtn.addEventListener("click", (event) => withButtonLoading(event.currentTarget, loadFromSheets));
elements.closeDialog.addEventListener("click", () => elements.workerDialog.close());

elements.deleteWorkerBtn.addEventListener("click", async () => {
  if (!activeWorkerId || !ensureBackend()) return;
  const worker = state.workers.find((item) => item.id === activeWorkerId);
  if (!worker) return;
  const confirmed = confirm(`Delete ${worker.name} and all daily entries from Database?`);
  if (!confirmed) return;

  const workerId = activeWorkerId;
  activeWorkerId = null;
  elements.workerDialog.close();
  state.workers = state.workers.filter((item) => item.id !== workerId);
  render();
  await withButtonLoading(elements.deleteWorkerBtn, () => queueStateSave("Worker deleted from Database.", { allowEmpty: true }));
});

elements.resetBtn.addEventListener("click", async () => {
  if (!ensureBackend()) return;
  const confirmed = confirm("Clear all workers and entries from Database?");
  if (!confirmed) return;
  await withButtonLoading(elements.resetBtn, clearSheetsData);
});

elements.exportBtn.addEventListener("click", exportCsv);
setControlsDisabled(true);
setBusy(true, "Loading records from Database...");
init();

async function init() {
  render();

  if (backendUrl) {
    await connectBackend();
    return;
  }

  const legacyState = readLegacyState();
  if (legacyState.workers.length) {
    state = legacyState;
    setBackendStatus("Existing browser data found. Connect a Database backend to migrate it.", "warn");
    render();
    return;
  }

  setBackendStatus("Database backend is not configured.", "warn");
}

async function loadFromSheets() {
  if (!ensureBackend()) return;

  setBusy(true, "Loading records from Database...");
  try {
    state = await readSheetsState();
    isReady = true;
    setBackendStatus("Connected. Data is loading and saving from Database.", "good");
  } catch (error) {
    setBackendStatus(`Could not load Database data. ${error.message}`, "bad");
  } finally {
    setBusy(false);
    setControlsDisabled(false);
    render();
  }
}

async function connectBackend() {
  if (!ensureBackend()) return;

  const browserState = normalizeState(state);
  setBusy(true, "Connecting to Database...");
  try {
    const sheetState = await readSheetsState();

    if (browserState.workers.length && !sheetState.workers.length) {
      state = browserState;
      await requestBackend({ action: "save", state });
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      isReady = true;
      render();
      setBackendStatus("Connected. Existing browser data was uploaded to Database.", "good");
      return;
    }

    state = sheetState;
    isReady = true;
    render();
    setBackendStatus("Connected. Data is loading and saving from Database.", "good");
  } catch (error) {
    setBackendStatus(`Could not connect to Database. ${error.message}`, "bad");
  } finally {
    setBusy(false);
    setControlsDisabled(false);
    render();
  }
}

async function saveAndRender(successMessage) {
  if (!ensureBackend()) return;
  await persistState(normalizeState(state), successMessage);
}

async function addWorkerToSheets(newWorker) {
  return queueStateSave("Worker saved to Database.");
}

async function runBackendMutation(payload, successMessage) {
  if (!ensureBackend()) return;
  return queueStateSave(successMessage, { allowEmpty: true });
}

function queueStateSave(message, options = {}) {
  if (!ensureBackend()) return Promise.resolve(false);

  pendingSaveState = normalizeState(state);
  saveMessage = message;

  if (!options.allowEmpty && !pendingSaveState.workers.length) {
    setBackendStatus("Save blocked because the worker list is empty. Use Reset if you want to clear everything.", "bad");
    return Promise.resolve(false);
  }

  if (message === ENTRY_SAVE_SUCCESS_MESSAGE) {
    setEntryFeedback("Saving record...", "warn");
  }

  setBackendStatus("Saving to Database...", "warn");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushQueuedSave, 120);
  return Promise.resolve(true);
}

async function flushQueuedSave() {
  if (saveInFlight || !pendingSaveState) return;

  const stateToSave = pendingSaveState;
  const message = saveMessage;
  pendingSaveState = null;
  saveInFlight = true;

  try {
    if (!stateToSave.workers.length) {
      await requestBackend({ action: "clear" });
    } else {
      await requestBackend({ action: "save", state: stateToSave });
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setBackendStatus(message, "good");
    if (message === ENTRY_SAVE_SUCCESS_MESSAGE) {
      setEntryFeedback(message, "good");
    }
  } catch (error) {
    setBackendStatus(`Save failed. ${error.message}`, "bad");
    if (message === ENTRY_SAVE_SUCCESS_MESSAGE) {
      setEntryFeedback("Could not add the record. Please try again.", "bad");
    }
  } finally {
    saveInFlight = false;
    if (pendingSaveState) {
      window.setTimeout(flushQueuedSave, 80);
    }
  }
}

async function updateSheetsState(mutator, successMessage, options = {}) {
  if (!ensureBackend()) return;

  setBusy(true, "Loading latest Database data...");
  try {
    const latestState = await readSheetsState();
    mutator(latestState);
    await persistState(latestState, successMessage, options);
  } catch (error) {
    setBackendStatus(`Save failed. ${error.message}`, "bad");
    await loadFromSheets();
  } finally {
    setBusy(false);
    render();
  }
}

async function persistState(nextState, successMessage, options = {}) {
  const allowEmpty = Boolean(options.allowEmpty);

  if (allowEmpty && !nextState.workers.length) {
    await clearSheetsData();
    return;
  }

  if (!allowEmpty && !nextState.workers.length) {
    setBackendStatus("Save blocked because the worker list is empty. Use Reset if you want to clear everything.", "bad");
    await loadFromSheets();
    return;
  }

  render();
  setBusy(true, "Saving to Database...");
  try {
    await requestBackend({ action: "save", state: nextState });
    state = await readSheetsState();
    isReady = true;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setBackendStatus(successMessage, "good");
  } catch (error) {
    setBackendStatus(`Save failed. ${error.message}`, "bad");
  } finally {
    setBusy(false);
    render();
  }
}

async function readSheetsState() {
  const result = await requestBackend({ action: "read" });
  return normalizeState(result.state || { workers: result.workers || [] });
}

async function clearSheetsData() {
  setBusy(true, "Clearing Database data...");
  try {
    await requestBackend({ action: "clear" });
    state = { workers: [] };
    isReady = true;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setBackendStatus("Database data cleared.", "good");
  } catch (error) {
    setBackendStatus(`Clear failed. ${error.message}`, "bad");
    await loadFromSheets();
  } finally {
    setBusy(false);
    render();
  }
}

async function requestBackend(payload) {
  const result = payload.action === "save" || payload.action === "clear"
    ? await formPostRequest(payload)
    : await jsonpRequest(payload);

  if (!result.ok) {
    throw new Error(result.error || "The Apps Script backend returned an error.");
  }

  return result;
}

function jsonpRequest(payload) {
  return new Promise((resolve, reject) => {
    const callbackName = `velikshaCallback_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(backendUrl);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    url.searchParams.set("action", payload.action || "read");
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("cache", Date.now().toString());

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Database request timed out."));
    }, 20000);

    window[callbackName] = (result) => {
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not reach the Apps Script URL."));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    script.src = url.toString();
    document.body.append(script);
  });
}

function formPostRequest(payload) {
  return new Promise((resolve, reject) => {
    const iframeName = `velikshaPost_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const iframe = document.createElement("iframe");
    const form = document.createElement("form");
    const input = document.createElement("input");
    let completed = false;

    iframe.name = iframeName;
    iframe.hidden = true;
    form.hidden = true;
    form.method = "POST";
    form.action = backendUrl;
    form.target = iframeName;
    input.name = "payload";
    input.value = JSON.stringify(payload);

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Database save timed out."));
    }, 20000);

    iframe.addEventListener("load", () => {
      if (completed) return;
      completed = true;
      window.setTimeout(() => {
        cleanup();
        resolve({ ok: true });
      }, 150);
    });

    function cleanup() {
      window.clearTimeout(timeout);
      iframe.remove();
      form.remove();
    }

    form.append(input);
    document.body.append(iframe, form);
    form.submit();
  });
}

function ensureBackend() {
  if (backendUrl) return true;
  setBackendStatus("Database backend is not configured.", "warn");
  return false;
}

function setBusy(isBusyNow, message = "") {
  isSaving = isBusyNow;

  if (message) {
    setBackendStatus(message, "warn");
  }
}

function setControlsDisabled(isDisabled) {
  document.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = isDisabled;
  });
}

async function withButtonLoading(button, task) {
  if (!button) return task();

  button.classList.add("is-loading");
  button.disabled = true;
  try {
    return await task();
  } finally {
    button.classList.remove("is-loading");
    button.disabled = false;
  }
}

function setBackendStatus(message, tone) {
  const method = tone === "bad" ? "error" : "info";
  if (elements.appStatus) {
    elements.appStatus.textContent = message;
    elements.appStatus.className = `app-status${tone ? ` app-status--${tone}` : ""}`;
  }
  console[method](`[Database] ${message}`);
}

function setEntryFeedback(message, tone = "") {
  if (!elements.entryFeedback) return;
  elements.entryFeedback.textContent = message;
  elements.entryFeedback.className = `entry-feedback${tone ? ` entry-feedback--${tone}` : ""}`;
}

function readLegacyState() {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return { workers: [] };

  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return { workers: [] };
  }
}

function normalizeState(input) {
  return {
    workers: Array.isArray(input.workers)
      ? input.workers.map((worker) => ({
          id: worker.id || crypto.randomUUID(),
          name: worker.name || "",
          phone: worker.phone || "",
          notes: worker.notes || "",
          entries: Array.isArray(worker.entries)
            ? worker.entries.map((entry) => ({
                id: entry.id || crypto.randomUUID(),
                date: entry.date || "",
                shifts: Number(entry.shifts) || 0,
                pay: Number(entry.pay) || 0,
                status: entry.status === "paid" ? "paid" : "pending",
              }))
            : [],
        }))
      : [],
  };
}

function render() {
  renderWorkerOptions();
  renderMetrics();
  renderDatewiseRows();
  renderWorkerRows();

  if (activeWorkerId && elements.workerDialog.open) {
    openWorker(activeWorkerId);
  }
}

function renderDatewiseRows() {
  const selectedDate = elements.datewiseInput.value;
  const rows = [];

  state.workers.forEach((worker) => {
    worker.entries
      .filter((entry) => entry.date === selectedDate)
      .forEach((entry) => rows.push({ worker, entry }));
  });

  const summary = rows.reduce(
    (totals, row) => {
      const amount = row.entry.shifts * row.entry.pay;
      totals.shifts += row.entry.shifts;
      totals.total += amount;
      if (row.entry.status === "paid") totals.paid += amount;
      else totals.pending += amount;
      return totals;
    },
    { shifts: 0, total: 0, paid: 0, pending: 0 },
  );

  elements.datewiseSummary.innerHTML = `
    <div class="summary-chip"><span>Workers</span><strong>${rows.length}</strong></div>
    <div class="summary-chip"><span>Shifts</span><strong>${formatNumber(summary.shifts)}</strong></div>
    <div class="summary-chip"><span>Pending</span><strong>${formatCurrency(summary.pending)}</strong></div>
    <div class="summary-chip"><span>Paid</span><strong>${formatCurrency(summary.paid)}</strong></div>
  `;

  elements.datewiseTable.innerHTML = "";
  elements.datewiseEmpty.style.display = rows.length ? "none" : "block";

  rows
    .sort((a, b) => a.worker.name.localeCompare(b.worker.name))
    .forEach(({ worker, entry }) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="worker-name">${escapeHtml(worker.name)}</div>
          ${worker.notes ? `<div class="notes">${escapeHtml(worker.notes)}</div>` : ""}
        </td>
        <td>${escapeHtml(worker.phone || "-")}</td>
        <td>${formatNumber(entry.shifts)}</td>
        <td>${formatCurrency(entry.pay)}</td>
        <td>${formatCurrency(entry.shifts * entry.pay)}</td>
        <td>${createBadge(entry.status)}</td>
        <td class="row-actions">
          <button class="text-button" type="button" data-date-toggle="${worker.id}:${entry.id}">
            Mark ${entry.status === "paid" ? "Pending" : "Paid"}
          </button>
          <button class="text-button" type="button" data-date-worker="${worker.id}">Open</button>
        </td>
      `;
      elements.datewiseTable.append(row);
    });

  elements.datewiseTable.querySelectorAll("[data-date-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [workerId, entryId] = button.dataset.dateToggle.split(":");
      toggleLocalEntryStatus(workerId, entryId);
      render();
      await withButtonLoading(button, () => runBackendMutation(
        {
          action: "toggleEntryStatus",
          workerId,
          entryId,
        },
        "Payment status updated in Database.",
      ));
    });
  });

  elements.datewiseTable.querySelectorAll("[data-date-worker]").forEach((button) => {
    button.addEventListener("click", () => openWorker(button.dataset.dateWorker));
  });
}

function renderWorkerOptions() {
  elements.shiftWorker.innerHTML = "";

  if (!state.workers.length) {
    elements.shiftWorker.append(new Option("Add a worker first", ""));
    elements.shiftWorker.disabled = true;
    elements.shiftForm.querySelector("button").disabled = true;
    return;
  }

  elements.shiftWorker.disabled = false;
  elements.shiftForm.querySelector("button").disabled = isSaving;
  state.workers
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((worker) => elements.shiftWorker.append(new Option(worker.name, worker.id)));
}

function renderMetrics() {
  const totals = state.workers.reduce(
    (summary, worker) => {
      worker.entries.forEach((entry) => {
        const amount = entry.shifts * entry.pay;
        summary.shifts += entry.shifts;
        if (entry.status === "paid") summary.paid += amount;
        else summary.pending += amount;
      });
      return summary;
    },
    { shifts: 0, paid: 0, pending: 0 },
  );

  elements.totalWorkers.textContent = state.workers.length;
  elements.totalShifts.textContent = formatNumber(totals.shifts);
  elements.amountDue.textContent = formatCurrency(totals.pending);
  elements.amountPaid.textContent = formatCurrency(totals.paid);
}

function renderWorkerRows() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const statusFilter = elements.statusFilter.value;

  const filteredWorkers = state.workers.filter((worker) => {
    const summary = summarizeWorker(worker);
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm) ||
      worker.phone.toLowerCase().includes(searchTerm) ||
      worker.notes.toLowerCase().includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && summary.pending === 0 && summary.total > 0) ||
      (statusFilter === "pending" && summary.pending > 0);

    return matchesSearch && matchesStatus;
  });

  elements.workersTable.innerHTML = "";
  elements.emptyState.style.display = filteredWorkers.length ? "none" : "block";

  filteredWorkers.forEach((worker) => {
    const summary = summarizeWorker(worker);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="worker-name">${escapeHtml(worker.name)}</div>
        ${worker.notes ? `<div class="notes">${escapeHtml(worker.notes)}</div>` : ""}
      </td>
      <td>${escapeHtml(worker.phone || "-")}</td>
      <td>${summary.days}</td>
      <td>${formatNumber(summary.shifts)}</td>
      <td>${formatCurrency(summary.total)}</td>
      <td>${formatCurrency(summary.pending)}</td>
      <td>${formatCurrency(summary.paid)}</td>
      <td>${createBadge(summary.pending > 0 ? "pending" : "paid")}</td>
      <td><button class="text-button" type="button" data-worker="${worker.id}">Open</button></td>
    `;
    elements.workersTable.append(row);
  });

  elements.workersTable.querySelectorAll("[data-worker]").forEach((button) => {
    button.addEventListener("click", () => openWorker(button.dataset.worker));
  });
}

function openWorker(workerId) {
  const worker = state.workers.find((item) => item.id === workerId);
  if (!worker) return;
  activeWorkerId = workerId;
  const summary = summarizeWorker(worker);

  elements.dialogTitle.textContent = worker.name;
  elements.dialogSummary.innerHTML = `
    <div class="summary-chip"><span>Days</span><strong>${summary.days}</strong></div>
    <div class="summary-chip"><span>Shifts</span><strong>${formatNumber(summary.shifts)}</strong></div>
    <div class="summary-chip"><span>Pending</span><strong>${formatCurrency(summary.pending)}</strong></div>
    <div class="summary-chip"><span>Paid</span><strong>${formatCurrency(summary.paid)}</strong></div>
  `;

  elements.entriesTable.innerHTML = "";
  worker.entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDate(entry.date)}</td>
        <td>${formatNumber(entry.shifts)}</td>
        <td>${formatCurrency(entry.pay)}</td>
        <td>${formatCurrency(entry.shifts * entry.pay)}</td>
        <td>${createBadge(entry.status)}</td>
        <td class="row-actions">
          <button class="text-button" type="button" data-toggle="${entry.id}">
            Mark ${entry.status === "paid" ? "Pending" : "Paid"}
          </button>
          <button class="text-button" type="button" data-delete="${entry.id}">Delete</button>
        </td>
      `;
      elements.entriesTable.append(row);
    });

  if (!worker.entries.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">No daily entries added yet.</td>`;
    elements.entriesTable.append(row);
  }

  elements.entriesTable.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const workerId = worker.id;
      const entryId = button.dataset.toggle;
      toggleLocalEntryStatus(workerId, entryId);
      render();
      await withButtonLoading(button, () => runBackendMutation(
        {
          action: "toggleEntryStatus",
          workerId,
          entryId,
        },
        "Payment status updated in Database.",
      ));
    });
  });

  elements.entriesTable.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const entryId = button.dataset.delete;
      deleteLocalEntry(entryId);
      render();
      await withButtonLoading(button, () => runBackendMutation(
        {
          action: "deleteEntry",
          entryId,
        },
        "Daily entry deleted from Database.",
      ));
    });
  });

  if (!elements.workerDialog.open) {
    elements.workerDialog.showModal();
  }
}

function summarizeWorker(worker) {
  const uniqueDays = new Set(worker.entries.map((entry) => entry.date));
  return worker.entries.reduce(
    (summary, entry) => {
      const amount = entry.shifts * entry.pay;
      summary.days = uniqueDays.size;
      summary.shifts += entry.shifts;
      summary.total += amount;
      if (entry.status === "paid") summary.paid += amount;
      else summary.pending += amount;
      return summary;
    },
    { days: uniqueDays.size, shifts: 0, total: 0, pending: 0, paid: 0 },
  );
}

function toggleLocalEntryStatus(workerId, entryId) {
  const worker = state.workers.find((item) => item.id === workerId);
  const entry = worker?.entries.find((item) => item.id === entryId);
  if (!entry) return;
  entry.status = entry.status === "paid" ? "pending" : "paid";
}

function deleteLocalEntry(entryId) {
  state.workers.forEach((worker) => {
    worker.entries = worker.entries.filter((entry) => entry.id !== entryId);
  });
}

function createBadge(status) {
  const label = status === "paid" ? "Paid" : "Pending";
  return `<span class="badge badge--${status}">${label}</span>`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function exportCsv() {
  const rows = [["Worker", "Phone", "Notes", "Date", "Shifts", "Pay Per Shift", "Total", "Status"]];

  state.workers.forEach((worker) => {
    if (!worker.entries.length) {
      rows.push([worker.name, worker.phone, worker.notes, "", "", "", "", ""]);
      return;
    }

    worker.entries.forEach((entry) => {
      rows.push([
        worker.name,
        worker.phone,
        worker.notes,
        entry.date,
        entry.shifts,
        entry.pay,
        entry.shifts * entry.pay,
        entry.status,
      ]);
    });
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `virukshaa-workers-${todayString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
