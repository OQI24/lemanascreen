"use strict";

import { icon, withIcon } from './icons.js';
import { CITY_TZ_LOOKUP } from './cities.js';
import { questions, PRESET_SITUATION_CITIES } from './questions.js';

document.getElementById("serviceToggle").innerHTML = withIcon("settings", "Сервис");
document.getElementById("exportFromStart").innerHTML = withIcon("download", "Выгрузить в Excel");
document.getElementById("importFromStart").innerHTML = withIcon("upload", "Загрузить Excel");
document.getElementById("loadClientBaseBtn").innerHTML = withIcon("database", "Подключить базу");
document.getElementById("clearClientBaseBtn").innerHTML = icon("trash");
document.getElementById("resetShiftStart").innerHTML = withIcon("trash", "Очистка данных анкет");

localStorage.removeItem("lemana_screener_surveys_v1");
localStorage.removeItem("lemana_screener_surveys_v2");
localStorage.removeItem("lemana_screener_theme");
const STORAGE_KEY = "lemana_screener_surveys_v5";
const LEGACY_STORAGE_KEYS = [
  "lemana_screener_surveys_v6",
  "lemana_screener_surveys_v4",
  "lemana_screener_surveys_v3"
];
const COPY_MODE_KEY = "lemana_screener_copy_mode";
const SCRIPT_SIMPLE_KEY = "lemana_screener_script_simple";
const CLIENT_DB_NAME = "lemana_screener_clients_v1";
const CLIENT_DB_VERSION = 1;
const app = document.getElementById("app");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const stepText = document.getElementById("stepText");
const progressPercent = document.getElementById("progressPercent");
const savedCount = document.getElementById("savedCount");
const brandHome = document.getElementById("brandHome");
const topbarTools = document.getElementById("topbarTools");
const serviceMenu = document.getElementById("serviceMenu");
const serviceToggle = document.getElementById("serviceToggle");
const copyModeToggle = document.getElementById("copyModeToggle");
const quotasToggle = document.getElementById("quotasToggle");
const quotasPanel = document.getElementById("quotasPanel");
const quotasPanelBody = document.getElementById("quotasPanelBody");
const quotasPanelClose = document.getElementById("quotasPanelClose");
const quotasScrim = document.getElementById("quotasScrim");
const clientBaseFileInput = document.getElementById("clientBaseFileInput");

quotasPanelClose.innerHTML = icon("close");

function openClientDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CLIENT_DB_NAME, CLIENT_DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Не удалось открыть IndexedDB."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("clients")) {
        db.createObjectStore("clients", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Ошибка IndexedDB."));
  });
}

async function getClientMeta() {
  const db = await openClientDb();
  try {
    const tx = db.transaction("meta", "readonly");
    const value = await idbRequest(tx.objectStore("meta").get("current"));
    return value || null;
  } finally {
    db.close();
  }
}

async function getClientById(id) {
  const key = normalizeClientId(id);
  if (!key) return null;
  const db = await openClientDb();
  try {
    const tx = db.transaction("clients", "readonly");
    return (await idbRequest(tx.objectStore("clients").get(key))) || null;
  } finally {
    db.close();
  }
}

async function clearClientDatabase() {
  const db = await openClientDb();
  try {
    const tx = db.transaction(["clients", "meta"], "readwrite");
    await Promise.all([
      idbRequest(tx.objectStore("clients").clear()),
      idbRequest(tx.objectStore("meta").clear())
    ]);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Не удалось очистить базу."));
    });
  } finally {
    db.close();
  }
}

function normalizeClientId(value) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}

function normalizeClientPhone(value) {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits;
}

/** Полный номер для поля ввода: +7XXXXXXXXXX (как в референсе, без отдельного префикса). */
function formatPhoneInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw || isTestPhone(raw)) return raw;
  const ten = normalizeClientPhone(raw);
  if (ten.length === 10) return `+7${ten}`;
  if (raw.startsWith("+")) return raw.slice(0, 15);
  return raw.slice(0, 15);
}

function formatPhoneDisplay(phone10) {
  const d = digitsOnly(phone10);
  if (d.length === 10) {
    return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11 && d.startsWith("7")) {
    return formatPhoneDisplay(d.slice(1));
  }
  return d ? `+${d}` : "—";
}

function resolveCityTz(city) {
  const key = String(city || "").trim().toLowerCase();
  return CITY_TZ_LOOKUP[key] || "";
}

function formatCityLocalTime(city, date = new Date()) {
  const timeZone = resolveCityTz(city);
  if (!timeZone) return "неизвестно";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(date);
  } catch (_) {
    return "неизвестно";
  }
}

function quotaCityOptions() {
  const cityQuestion = questions.find(item => item.id === "city");
  return Array.isArray(cityQuestion?.options) ? cityQuestion.options : [];
}

function matchQuotaCity(city) {
  const raw = String(city || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  return quotaCityOptions().find(option => String(option).toLowerCase() === lower) || "";
}

function findHeaderIndex(headers, names) {
  const normalized = headers.map(header => String(header ?? "").trim().toLowerCase());
  for (const name of names) {
    const index = normalized.indexOf(String(name).toLowerCase());
    if (index >= 0) return index;
  }
  return -1;
}

function parseClientRowsFromWorkbook(workbook) {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("В файле нет листов.");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false
  });
  if (!matrix.length) throw new Error("В файле нет строк.");

  const headers = matrix[0].map(cell => String(cell ?? "").trim());
  const idCol = findHeaderIndex(headers, ["ID Клиента", "ID клиента", "Id клиента"]);
  const cityCol = findHeaderIndex(headers, ["Город"]);
  const phoneCol = findHeaderIndex(headers, ["Номер телефона", "Телефон"]);
  const storeCol = findHeaderIndex(headers, ["Магазин"]);

  if (idCol < 0 || cityCol < 0 || phoneCol < 0) {
    throw new Error(
      "В Excel нет нужных колонок. Ожидаются: «ID Клиента», «Город», «Номер телефона»."
    );
  }

  const clients = [];
  const seen = new Set();
  for (let index = 1; index < matrix.length; index++) {
    const row = matrix[index] || [];
    const id = String(row[idCol] ?? "").trim();
    if (!id || seen.has(id)) continue;
    const phone = normalizeClientPhone(row[phoneCol]);
    if (!phone) continue;
    seen.add(id);
    const record = {
      id,
      phone,
      city: String(row[cityCol] ?? "").trim()
    };
    if (storeCol >= 0) {
      const store = String(row[storeCol] ?? "").trim();
      if (store) record.store = store;
    }
    clients.push(record);
  }

  if (!clients.length) {
    throw new Error("В файле не найдено ни одной строки с ID и телефоном.");
  }
  return clients;
}

async function replaceClientDatabase(clients, meta, onProgress) {
  const report = ratio => {
    if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(1, ratio)));
  };
  const db = await openClientDb();
  try {
    report(0.08);
    const clearTx = db.transaction(["clients", "meta"], "readwrite");
    await Promise.all([
      idbRequest(clearTx.objectStore("clients").clear()),
      idbRequest(clearTx.objectStore("meta").clear())
    ]);
    await new Promise((resolve, reject) => {
      clearTx.oncomplete = () => resolve();
      clearTx.onerror = () => reject(clearTx.error || new Error("Не удалось очистить store."));
    });

    const chunkSize = 1000;
    const total = Math.max(clients.length, 1);
    for (let offset = 0; offset < clients.length; offset += chunkSize) {
      const chunk = clients.slice(offset, offset + chunkSize);
      const tx = db.transaction("clients", "readwrite");
      const store = tx.objectStore("clients");
      for (const client of chunk) store.put(client);
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Не удалось записать клиентов."));
      });
      report(0.12 + 0.8 * Math.min(1, (offset + chunk.length) / total));
    }

    const metaTx = db.transaction("meta", "readwrite");
    metaTx.objectStore("meta").put({ key: "current", ...meta });
    await new Promise((resolve, reject) => {
      metaTx.oncomplete = () => resolve();
      metaTx.onerror = () => reject(metaTx.error || new Error("Не удалось сохранить meta."));
    });
    report(1);
  } finally {
    db.close();
  }
}

async function importClientBaseFromFile(file, onProgress) {
  if (typeof XLSX === "undefined") {
    throw new Error("Библиотека чтения Excel не загружена (vendor/xlsx.full.min.js).");
  }
  const report = ratio => {
    if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(1, ratio)));
  };
  report(0.02);
  const buffer = await file.arrayBuffer();
  report(0.08);
  const workbook = XLSX.read(buffer, { type: "array" });
  report(0.16);
  const clients = parseClientRowsFromWorkbook(workbook);
  const meta = {
    fileName: file.name || "база.xlsx",
    rowCount: clients.length,
    builtAt: new Date().toISOString(),
    sourceSize: file.size || 0,
    sourceLastModified: file.lastModified || 0
  };
  await replaceClientDatabase(clients, meta, ratio => report(0.18 + ratio * 0.82));
  return meta;
}

function formatBaseBuiltAt(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

let cachedClientMeta = null;

function isClientBaseReady(meta = cachedClientMeta) {
  return !!(meta && meta.rowCount);
}

function setClientBaseProgress(ratio) {
  const wrap = document.getElementById("clientBaseBtnWrap");
  const progress = document.getElementById("clientBaseProgress");
  const bar = document.getElementById("clientBaseProgressBar");
  if (!wrap || !progress || !bar) return;
  const value = Math.max(0, Math.min(1, Number(ratio) || 0));
  wrap.classList.add("is-loading");
  progress.hidden = false;
  bar.style.width = Math.round(value * 100) + "%";
}

function clearClientBaseProgress() {
  const wrap = document.getElementById("clientBaseBtnWrap");
  const progress = document.getElementById("clientBaseProgress");
  const bar = document.getElementById("clientBaseProgressBar");
  if (wrap) wrap.classList.remove("is-loading");
  if (progress) progress.hidden = true;
  if (bar) bar.style.width = "0%";
}

function syncClientBaseMenu(meta, options = {}) {
  const readyMeta = meta && meta.rowCount ? meta : null;
  if (!options.busy) cachedClientMeta = readyMeta;

  const clearBtn = document.getElementById("clearClientBaseBtn");
  const loadBtn = document.getElementById("loadClientBaseBtn");
  if (!clearBtn || !loadBtn) return;

  if (options.busy) {
    clearBtn.hidden = true;
    loadBtn.classList.remove("is-ready");
    loadBtn.disabled = true;
    loadBtn.innerHTML = withIcon("database", "Подключение…");
    loadBtn.title = "Импорт базы";
    if (typeof options.progress === "number") setClientBaseProgress(options.progress);
    else setClientBaseProgress(0.05);
    return;
  }

  clearClientBaseProgress();
  loadBtn.disabled = false;

  if (isClientBaseReady(cachedClientMeta)) {
    clearBtn.hidden = false;
    loadBtn.classList.add("is-ready");
    const tip =
      `${cachedClientMeta.fileName} · ${cachedClientMeta.rowCount} чел.` +
      (cachedClientMeta.builtAt ? ` · ${formatBaseBuiltAt(cachedClientMeta.builtAt)}` : "");
    loadBtn.title = tip + " — нажмите, чтобы обновить";
    loadBtn.innerHTML =
      '<span class="service-base-badge" title="База подключена" aria-hidden="true"></span>' +
      '<span class="service-base-label">База подключена</span>';
  } else {
    clearBtn.hidden = true;
    loadBtn.classList.remove("is-ready");
    loadBtn.title = "Подключить локальный Excel с базой клиентов";
    loadBtn.innerHTML = withIcon("database", "Подключить базу");
  }
}

async function refreshClientBaseMenu() {
  try {
    syncClientBaseMenu(await getClientMeta());
  } catch (error) {
    console.error(error);
    syncClientBaseMenu(null);
  }
}

function isSimpleMode() {
  return localStorage.getItem(COPY_MODE_KEY) === "simple";
}

function syncCopyModeToggle() {
  const simple = isSimpleMode();
  copyModeToggle.classList.toggle("is-on", simple);
  copyModeToggle.setAttribute("aria-checked", simple ? "true" : "false");
}

function setCopyMode(simple) {
  localStorage.setItem(COPY_MODE_KEY, simple ? "simple" : "original");
  syncCopyModeToggle();
  refreshActiveView();
  if (isQuotasPanelOpen()) renderQuotasPanel();
}

function isQuotasPanelOpen() {
  return !quotasPanel.hidden;
}

function syncQuotasToggle() {
  const open = isQuotasPanelOpen();
  quotasToggle.classList.toggle("is-on", open);
  quotasToggle.setAttribute("aria-checked", open ? "true" : "false");
}

function shortSituationLabel(text) {
  const head = String(text || "").split(".")[0].trim();
  if (!head) return String(text || "");
  return head.length > 72 ? head.slice(0, 69) + "…" : head;
}

function collectQuotaGroups() {
  const groups = [];

  const cityRows = quotaCityOptions().map(city => {
    const situation = cityQuotaSituation(city);
    return {
      label: city,
      used: situation ? 1 : 0,
      limit: 1,
      full: Boolean(situation),
      detail: situation ? shortSituationLabel(situation) : "свободно"
    };
  });
  if (cityRows.length) {
    groups.push({ title: "Город ↔ ситуация (1 на город)", rows: cityRows });
  }

  for (const question of questions) {
    const rows = [];
    if (question.situationQuota && Array.isArray(question.options)) {
      for (const option of question.options) {
        const value = optionLabel(option);
        const city = situationQuotaCity(value);
        rows.push({
          label: shortSituationLabel(value),
          used: city ? 1 : 0,
          limit: 1,
          full: Boolean(city),
          detail: city || "свободно"
        });
      }
    } else if (question.quota && Array.isArray(question.options)) {
      for (const option of question.options) {
        const value = optionLabel(option);
        const used = quotaCount(question.id, value);
        rows.push({
          label: optionDisplay(option),
          used,
          limit: question.quota,
          full: used >= question.quota
        });
      }
    } else if (Array.isArray(question.options)) {
      for (const option of question.options) {
        if (typeof option !== "object" || !option.quota) continue;
        const value = optionLabel(option);
        const used = quotaCount(question.id, value);
        rows.push({
          label: optionDisplay(option),
          used,
          limit: option.quota,
          full: used >= option.quota
        });
      }
    }
    if (!rows.length) continue;
    groups.push({
      title: qText(question, "title") || question.id,
      rows
    });
  }
  return groups;
}

function renderQuotasPanel() {
  const groups = collectQuotaGroups();
  if (!groups.length) {
    quotasPanelBody.innerHTML = `<p class="quotas-empty">Квоты в анкете не заданы.</p>`;
    return;
  }
  quotasPanelBody.innerHTML = groups.map(group => {
    const rows = group.rows.map(row => `
      <li class="quotas-row${row.full ? " is-full" : ""}">
        <span class="quotas-row-label">${escapeHtml(row.label)}${
          row.detail ? `<small class="quotas-row-detail">${escapeHtml(row.detail)}</small>` : ""
        }</span>
        <span class="quotas-row-count">${row.used}/${row.limit}</span>
      </li>
    `).join("");
    return `
      <section class="quotas-group">
        <h3 class="quotas-group-title">${escapeHtml(group.title)}</h3>
        <ul class="quotas-list">${rows}</ul>
      </section>
    `;
  }).join("");
}

function setQuotasPanelOpen(open) {
  quotasPanel.hidden = !open;
  quotasScrim.hidden = !open;
  document.body.classList.toggle("quotas-open", open);
  if (open) renderQuotasPanel();
  syncQuotasToggle();
}

function setAppHtml(html) {
  app.classList.remove("is-step-enter");
  app.innerHTML = html;
  // Restart enter animation on every screen change (card node itself stays mounted).
  void app.offsetWidth;
  app.classList.add("is-step-enter");
}

function refreshActiveView() {
  if (progressWrap.style.display === "block") {
    renderQuestion();
    return;
  }
  if (app.querySelector(".result-actions")) return;
  intro();
}

function qText(question, field) {
  if (isSimpleMode()) {
    const simpleKey = field + "Simple";
    if (question[simpleKey]) return question[simpleKey];
  }
  return question[field] || "";
}

const DEFAULT_SCRIPT_SIMPLE =
  "Здравствуйте, это «Лемана ПРО». Дорабатываем программу лояльности и хотим услышать ваше мнение. Тема - ремонт.\n\n" +
  "Это не продажа: менеджеров не будет, нужна ваша оценка.\n\n" +
  "Встреча онлайн в Zoom. За участие - 5000 баллов на карту лояльности.";

function getSimpleScriptText() {
  const saved = localStorage.getItem(SCRIPT_SIMPLE_KEY);
  if (saved == null) return DEFAULT_SCRIPT_SIMPLE;
  return saved;
}

function saveSimpleScriptText(text) {
  localStorage.setItem(SCRIPT_SIMPLE_KEY, String(text ?? ""));
}

function scriptTextToHtml(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return "<p></p>";
  return normalized.split(/\n\s*\n/).map(block => {
    const lines = escapeHtml(block.trim()).replace(/\n/g, "<br>");
    return `<p>${lines}</p>`;
  }).join("");
}

function fitScriptEditor(editor) {
  editor.style.height = "auto";
  const next = Math.min(
    Math.max(editor.scrollHeight, 168),
    Math.min(window.innerHeight * 0.52, 360)
  );
  editor.style.height = next + "px";
}

function defaultExportFilename() {
  return "Анкеты_Лемана_" + new Date().toISOString().slice(0, 10);
}

function sanitizeExportFilename(value) {
  let name = String(value || "").trim() || defaultExportFilename();
  name = name.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  if (!name) name = defaultExportFilename();
  if (!/\.xlsx$/i.test(name)) name += ".xlsx";
  return name;
}

function askExportFilename() {
  const answer = prompt("Имя файла для выгрузки:", defaultExportFilename());
  if (answer === null) return null;
  return sanitizeExportFilename(answer);
}

function setServiceMenuOpen(open) {
  serviceMenu.classList.toggle("is-open", open);
  serviceToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeServiceMenu() {
  setServiceMenuOpen(false);
}

serviceToggle.onclick = event => {
  event.stopPropagation();
  setServiceMenuOpen(!serviceMenu.classList.contains("is-open"));
};

document.addEventListener("click", event => {
  if (!serviceMenu.contains(event.target)) closeServiceMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeServiceMenu();
});

document.getElementById("exportFromStart").onclick = () => {
  closeServiceMenu();
  exportXlsx();
};
document.getElementById("importFromStart").onclick = () => {
  closeServiceMenu();
  document.getElementById("importFileInput").click();
};
document.getElementById("importFileInput").onchange = importXlsxFromInput;
document.getElementById("resetShiftStart").onclick = () => {
  closeServiceMenu();
  resetShift();
};
document.getElementById("loadClientBaseBtn").onclick = event => {
  event.stopPropagation();
  clientBaseFileInput.click();
};
document.getElementById("clearClientBaseBtn").onclick = async event => {
  event.stopPropagation();
  if (!isClientBaseReady()) {
    alert("База клиентов и так пуста.");
    return;
  }
  const confirmed = confirm(
    "Очистить локальную базу клиентов из браузера?\n\nАнкеты не удалятся. Excel-файл на диске не изменится."
  );
  if (!confirmed) return;
  try {
    await clearClientDatabase();
    pendingClient = null;
    syncClientBaseMenu(null);
    intro();
    setServiceMenuOpen(true);
  } catch (error) {
    console.error(error);
    alert(error?.message || "Не удалось очистить базу.");
  }
};
clientBaseFileInput.onchange = async event => {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  setServiceMenuOpen(true);
  try {
    syncClientBaseMenu(cachedClientMeta, { busy: true, progress: 0.03 });
    const meta = await importClientBaseFromFile(file, ratio => {
      syncClientBaseMenu(cachedClientMeta, { busy: true, progress: ratio });
    });
    syncClientBaseMenu(meta);
    intro();
    setServiceMenuOpen(true);
  } catch (error) {
    console.error(error);
    await refreshClientBaseMenu();
    alert(error?.message || "Не удалось прочитать базу клиентов.");
    intro();
    setServiceMenuOpen(true);
  }
};

copyModeToggle.onclick = event => {
  event.stopPropagation();
  setCopyMode(!isSimpleMode());
};
syncCopyModeToggle();

quotasToggle.onclick = event => {
  event.stopPropagation();
  if (!topbarTools.classList.contains("is-visible")) return;
  setQuotasPanelOpen(!isQuotasPanelOpen());
};
quotasPanelClose.onclick = () => setQuotasPanelOpen(false);
quotasScrim.onclick = () => setQuotasPanelOpen(false);
syncQuotasToggle();

function setShiftToolsVisible(visible) {
  topbarTools.classList.toggle("is-visible", visible);
  if (!visible) {
    closeServiceMenu();
    setQuotasPanelOpen(false);
  }
}

let currentIndex = 0;
let answers = {};
let startedAt = "";
let pendingClient = null;
let clientTimeTimer = 0;

function stopClientTimeTimer() {
  if (clientTimeTimer) {
    window.clearInterval(clientTimeTimer);
    clientTimeTimer = 0;
  }
}

function readSurveysFromKey(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function loadSurveys() {
  let data = readSurveysFromKey(STORAGE_KEY);
  if (data.length) return data;

  for (const key of LEGACY_STORAGE_KEYS) {
    const fallback = readSurveysFromKey(key);
    if (!fallback.length) continue;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
  return [];
}

function saveSurveys(surveys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
  updateSavedCount();
}

function updateSavedCount() {
  const count = loadSurveys().length;
  savedCount.textContent = "Сохранено анкет: " + count;
  if (isQuotasPanelOpen()) renderQuotasPanel();
}

function resetShift() {
  const count = loadSurveys().length;
  if (count === 0) {
    alert("Сохранённых анкет нет — сбрасывать нечего.");
    return;
  }

  const confirmed = confirm(
    `Очистить данные?\n\nБудут удалены все ${count} сохранённых анкет из этого браузера.\nПеред сбросом выгрузите данные в Excel.\n\nЭто действие нельзя отменить.`
  );
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  answers = {};
  startedAt = "";
  currentIndex = 0;
  pendingClient = null;
  stopClientTimeTimer();
  updateSavedCount();
  intro();
  alert("Анкеты сброшены. База клиентов не затронута.");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optionLabel(option) {
  return typeof option === "string" ? option : option.label;
}

function optionDisplay(option) {
  if (!isSimpleMode()) return optionLabel(option);
  if (typeof option === "string") return option;
  return option.labelSimple || option.label;
}

function resolveOptionGate(question, option) {
  const label = optionLabel(option);
  const optionQuota = typeof option === "object" ? option.quota : null;
  const questionQuota = question.quota || null;
  const quotaLimit = optionQuota || questionQuota;

  if (question.type === "radio" && question.terminate) {
    const reason = question.terminate(label);
    if (reason) return { kind: "stop", title: "Отсев", count: "" };
  }

  if (question.type === "checkbox" && question.id === "stores") {
    if (label.includes("Лемана ПРО")) {
      return { kind: "pass", title: "Нужен для прохода", count: "" };
    }
    return { kind: "neutral", title: "", count: "" };
  }

  if (question.situationQuota) {
    const usedCity = situationQuotaCity(label);
    if (usedCity) {
      return { kind: "quota", title: `Квота закрыта — ${usedCity}`, count: "1/1" };
    }
    return { kind: "pass", title: "Проход", count: "0/1" };
  }

  if (question.id === "city") {
    const situation = cityQuotaSituation(label);
    if (situation) {
      return { kind: "quota", title: "Квота закрыта", count: "1/1" };
    }
    return { kind: "pass", title: "Свободно", count: "0/1" };
  }

  if (quotaLimit) {
    const used = quotaCount(question.id, label);
    const count = `${used}/${quotaLimit}`;
    if (used >= quotaLimit) {
      return { kind: "quota", title: "Квота заполнена", count };
    }
    return { kind: "pass", title: "Проход", count };
  }

  if (question.type === "radio" && question.terminate) {
    return { kind: "pass", title: "Проход", count: "" };
  }

  return { kind: "neutral", title: "", count: "" };
}

function gateIconSvg(kind) {
  if (kind === "pass") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  }
  if (kind === "stop") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
  }
  if (kind === "quota") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m10.3 4.3-7.4 12.8A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.9L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>`;
  }
  return "";
}

function gateMetaHtml(gate) {
  if (!gate || gate.kind === "neutral") return "";
  const tip = gate.count ? `${gate.title} · ${gate.count}` : gate.title;
  const countHtml = gate.count
    ? `<span>${escapeHtml(gate.count)}</span>`
    : "";
  return `<span class="option-meta is-${gate.kind}" title="${escapeHtml(tip)}">${gateIconSvg(gate.kind)}${countHtml}</span>`;
}

function isTestPhone(value) {
  return ["тест", "test"].includes(String(value || "").trim().toLowerCase());
}

function normalizePhone(value) {
  return isTestPhone(value) ? "__test__" : String(value || "").trim();
}

function isTestSurvey() {
  return isTestPhone(answers.phoneInitial) || isTestPhone(answers.phone);
}

function validatePhoneValue(value) {
  const v = String(value || "").trim();
  if (isTestPhone(v)) return "";
  if (v.length >= 1 && v.length <= 15) return "";
  return "Введите телефон (до 15 символов) либо «тест» / «test».";
}

const RESPONDENT_NAME_COLUMN = "Как я могу к вам обращаться?";

function questionExportTitle(question) {
  return question.exportTitle || question.title;
}

function quotaCount(questionId, value) {
  return loadSurveys().filter(item =>
    item.status === "Подходит" &&
    !item.isTest &&
    item.answers &&
    item.answers[questionId] === value
  ).length;
}

function completedSituationSurveys() {
  return loadSurveys().filter(item =>
    item.status === "Подходит" &&
    !item.isTest &&
    item.answers?.city &&
    item.answers?.purchaseSituation
  );
}

function situationQuotaCity(situation) {
  if (!situation) return "";
  if (PRESET_SITUATION_CITIES[situation]) return PRESET_SITUATION_CITIES[situation];
  return completedSituationSurveys().find(item =>
    item.answers.purchaseSituation === situation
  )?.answers.city || "";
}

function cityQuotaSituation(city) {
  if (!city) return "";
  const presetEntry = Object.entries(PRESET_SITUATION_CITIES).find(([, presetCity]) =>
    presetCity === city
  );
  if (presetEntry) return presetEntry[0];
  return completedSituationSurveys().find(item =>
    item.answers.city === city
  )?.answers.purchaseSituation || "";
}

function quotaFailureFor(question, value) {
  if (isTestSurvey()) return "";
  if (value == null || value === "") return "";

  if (question.situationQuota) {
    const situationCity = situationQuotaCity(value);
    if (situationCity) {
      return `Выбранная ситуация уже использована в городе «${situationCity}».`;
    }
    return "";
  }

  if (question.id === "city") {
    if (cityQuotaSituation(value)) {
      return `Квота по городу «${value}» уже закрыта.`;
    }
    return "";
  }

  if (question.quota && quotaCount(question.id, value) >= question.quota) {
    return `Квота по городу «${value}» уже заполнена (${question.quota} из ${question.quota}).`;
  }

  const selectedOption = question.options?.find(option =>
    typeof option === "object" && option.label === value
  );
  if (selectedOption?.quota && quotaCount(question.id, value) >= selectedOption.quota) {
    return `Квота по выбранной категории уже заполнена (${selectedOption.quota} из ${selectedOption.quota}).`;
  }
  return "";
}

function finalQuotaFailure() {
  if (isTestSurvey()) return "";

  if (cityQuotaSituation(answers.city)) {
    return `Квота по городу «${answers.city}» уже закрыта.`;
  }
  const situationCity = situationQuotaCity(answers.purchaseSituation);
  if (situationCity) {
    return `Выбранная ситуация уже использована в городе «${situationCity}».`;
  }

  for (const question of questions) {
    if (question.id === "city" || question.situationQuota) continue;
    const reason = quotaFailureFor(question, answers[question.id]);
    if (reason) return reason;
  }
  return "";
}

async function intro() {
  stopClientTimeTimer();
  progressWrap.style.display = "none";
  setShiftToolsVisible(true);

  const scriptFull = `
    <p>Здравствуйте, Вас беспокоит сотрудник компании «Лемана ПРО». Мы работаем над улучшением программы лояльности и проводим встречи с покупателями, чтобы честно обсудить, что нам стоит улучшить. Хотели бы пригласить Вас к обсуждению темы «Проведение ремонта».</p>
    <p>Это не коммерческое предложение. Менеджеры по продажам участвовать не будут — нам важно только ваше независимое мнение.</p>
    <p>Встреча пройдёт онлайн в программе Zoom. За участие предусмотрено вознаграждение — 5000 баллов на вашу карту лояльности.</p>
  `;

  const simple = isSimpleMode();
  const lead = simple
    ? "Зачитайте текст респонденту."
    : "Перед началом зачитайте респонденту информацию об исследовании.";
  const interest = simple
    ? "Интересно поучаствовать?"
    : "Вам было бы интересно поделиться опытом?";

  const scriptText = getSimpleScriptText();
  const scriptBlock = simple
    ? `<div class="script-panel" id="scriptPanel">
        <button type="button" class="script-edit-btn" id="scriptEditToggle" title="Редактировать" aria-label="Редактировать текст" aria-pressed="false">${icon("pencil")}</button>
        <div class="script script-view" id="introScript">${scriptTextToHtml(scriptText)}</div>
        <textarea class="script-editor" id="introScriptEdit" aria-label="Текст приветствия" hidden>${escapeHtml(scriptText)}</textarea>
      </div>`
    : `<div class="script" id="introScript">${scriptFull}</div>`;

  const savedId = pendingClient?.id || "";
  let baseMeta = null;
  try {
    baseMeta = await getClientMeta();
  } catch (error) {
    console.error(error);
    baseMeta = null;
  }
  syncClientBaseMenu(baseMeta);

  const clientLookupBlock = isClientBaseReady(baseMeta)
    ? `<div class="client-base" id="clientBasePanel">
      <label class="field-label" for="clientIdInput">ID клиента <span style="font-weight:600;color:var(--muted)">(необязательно)</span></label>
      <div class="client-lookup-field">
        <input type="text" id="clientIdInput" inputmode="numeric" autocomplete="off" placeholder="Вставьте ID из Excel" value="${escapeHtml(savedId)}">
        <div class="client-lookup-actions">
          <span class="client-lookup-hint" id="clientLookupHint" aria-hidden="true">${icon("search")}</span>
          <button type="button" class="client-lookup-clear" id="clearClientIdBtn" title="Очистить" aria-label="Очистить ID" hidden>${icon("close")}</button>
        </div>
      </div>
      <div id="clientPreview" hidden></div>
    </div>`
    : "";

  setAppHtml(`
    <div class="eyebrow">${simple ? "Отбор участников" : "Анкета для отбора участников"}</div>
    ${clientLookupBlock}
    <p class="lead">${lead}</p>
    ${scriptBlock}
    <h2>${interest}</h2>
    <div class="actions">
      <button class="button secondary" id="declineIntro" title="Пропустить">${withIcon("skip", "Нет")}</button>
      <button class="button primary" id="startButton" title="Проход к анкете">${withIcon("arrowRight", simple ? "Да, начать" : "Да, начать анкету")}</button>
    </div>
  `);

  const previewEl = document.getElementById("clientPreview");
  const idInput = document.getElementById("clientIdInput");

  const renderClientPreview = client => {
    if (!previewEl) return;
    stopClientTimeTimer();
    if (!client) {
      previewEl.hidden = true;
      previewEl.className = "";
      previewEl.innerHTML = "";
      return;
    }

    const updateTime = () => {
      const timeNode = previewEl.querySelector(".local-time");
      if (timeNode) timeNode.textContent = formatCityLocalTime(client.city);
    };

    previewEl.hidden = false;
    previewEl.className = "client-preview";
    previewEl.innerHTML = `
      <dl>
        <dt>Телефон</dt><dd>${escapeHtml(formatPhoneDisplay(client.phone))}</dd>
        <dt>Город</dt><dd>${escapeHtml(client.city || "—")}</dd>
        <dt>Время сейчас</dt><dd class="local-time">${escapeHtml(formatCityLocalTime(client.city))}</dd>
        ${client.store ? `<dt>Магазин</dt><dd>${escapeHtml(client.store)}</dd>` : ""}
      </dl>
    `;
    clientTimeTimer = window.setInterval(updateTime, 30000);
  };

  const renderLookupError = message => {
    if (!previewEl) return;
    stopClientTimeTimer();
    previewEl.hidden = false;
    previewEl.className = "client-preview is-error";
    previewEl.textContent = message;
  };

  const runLookup = async () => {
    if (!idInput) return;
    const id = normalizeClientId(idInput.value);
    if (idInput.value !== id) idInput.value = id;
    if (!id) {
      pendingClient = null;
      renderClientPreview(null);
      return;
    }
    if (!isClientBaseReady(baseMeta)) {
      pendingClient = null;
      renderLookupError("Сначала подключите базу клиентов в меню «Сервис».");
      return;
    }
    try {
      const client = await getClientById(id);
      if (!client) {
        pendingClient = null;
        renderLookupError(`Клиент с ID «${id}» в базе не найден.`);
        return;
      }
      pendingClient = client;
      renderClientPreview(client);
    } catch (error) {
      console.error(error);
      pendingClient = null;
      renderLookupError(error?.message || "Не удалось найти клиента.");
    }
  };

  if (idInput) {
    const clearBtn = document.getElementById("clearClientIdBtn");
    const hintIcon = document.getElementById("clientLookupHint");
    const syncLookupAffordance = () => {
      const hasValue = Boolean(String(idInput.value || "").length);
      if (clearBtn) clearBtn.hidden = !hasValue;
      if (hintIcon) hintIcon.hidden = hasValue;
    };

    const clearField = () => {
      idInput.value = "";
      pendingClient = null;
      renderClientPreview(null);
      syncLookupAffordance();
      idInput.focus();
    };

    if (pendingClient) renderClientPreview(pendingClient);
    syncLookupAffordance();

    if (clearBtn) clearBtn.onclick = () => { clearField(); };

    idInput.addEventListener("input", syncLookupAffordance);
    idInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        runLookup();
      }
      if (event.key === "Escape" && idInput.value) {
        event.preventDefault();
        clearField();
      }
    });
    idInput.addEventListener("paste", () => {
      window.setTimeout(() => {
        syncLookupAffordance();
        runLookup();
      }, 0);
    });
  } else {
    pendingClient = null;
  }

  if (simple) {
    const panel = document.getElementById("scriptPanel");
    const view = document.getElementById("introScript");
    const editor = document.getElementById("introScriptEdit");
    const toggle = document.getElementById("scriptEditToggle");
    let saveTimer = 0;

    const persist = () => saveSimpleScriptText(editor.value);

    const closeEditor = () => {
      window.clearTimeout(saveTimer);
      persist();
      view.innerHTML = scriptTextToHtml(editor.value);
      panel.classList.remove("is-editing");
      editor.hidden = true;
      toggle.innerHTML = icon("pencil");
      toggle.title = "Редактировать";
      toggle.setAttribute("aria-label", "Редактировать текст");
      toggle.setAttribute("aria-pressed", "false");
    };

    const openEditor = () => {
      editor.value = getSimpleScriptText();
      panel.classList.add("is-editing");
      editor.hidden = false;
      toggle.innerHTML = icon("check");
      toggle.title = "Готово";
      toggle.setAttribute("aria-label", "Сохранить и закрыть");
      toggle.setAttribute("aria-pressed", "true");
      fitScriptEditor(editor);
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    };

    toggle.onclick = () => {
      if (panel.classList.contains("is-editing")) closeEditor();
      else openEditor();
    };

    editor.addEventListener("input", () => {
      fitScriptEditor(editor);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persist, 250);
    });

    editor.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditor();
      }
    });
  }

  document.getElementById("startButton").onclick = startNew;
  document.getElementById("declineIntro").onclick = startDecline;
}

function applyPendingClientToAnswers({ clearPending = true } = {}) {
  if (!pendingClient) return;
  answers.clientId = pendingClient.id;
  const phone = formatPhoneInput(pendingClient.phone);
  answers.phoneInitial = phone;
  answers.phone = phone;
  const quotaCity = matchQuotaCity(pendingClient.city);
  if (quotaCity) answers.city = quotaCity;
  if (clearPending) pendingClient = null;
}

function startDecline() {
  stopClientTimeTimer();
  answers = { interest: "Нет" };
  applyPendingClientToAnswers({ clearPending: false });
  startedAt = new Date().toISOString();
  renderDeclinePhone();
}

function renderDeclinePhone() {
  progressWrap.style.display = "none";
  setShiftToolsVisible(false);
  const previous = answers.phoneInitial || answers.phone || "";
  const simple = isSimpleMode();

  setAppHtml(`
    <div class="eyebrow">Отказ от участия</div>
    <h2>${simple ? "Телефон респондента" : "Укажите телефон респондента"}</h2>
    <div class="instruction">${
      simple
        ? "До 15 символов. Нужен для учёта отказа."
        : "В поле телефона можно ввести до 15 символов. Номер нужен, чтобы отказ тоже попал в выгрузку с контактом."
    }</div>
    <label class="field-label" for="answer">Номер телефона</label>
    <input id="answer" type="text" maxlength="15" autocomplete="off"
      value="${escapeHtml(previous)}" placeholder="Введите телефон или test">
    <div class="error" id="error" role="alert"></div>
    <div class="actions">
      <button class="button secondary" id="backButton">${withIcon("home", "К началу")}</button>
      <button class="button primary" id="nextButton">${withIcon("check", "Сохранить отказ")}</button>
    </div>`);

  document.getElementById("backButton").onclick = () => {
    answers = {};
    startedAt = "";
    intro();
  };
  document.getElementById("nextButton").onclick = submitDeclinePhone;

  const textInput = document.getElementById("answer");
  textInput.focus();
  textInput.addEventListener("keydown", event => {
    if (event.key === "Enter") submitDeclinePhone();
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitDeclinePhone() {
  const value = document.getElementById("answer").value.trim();
  const error = document.getElementById("error");
  if (!value) {
    error.textContent = "Введите телефон респондента.";
    return;
  }
  const message = validatePhoneValue(value);
  if (message) {
    error.textContent = message;
    return;
  }
  answers.phoneInitial = value;
  answers.phone = value;
  if (pendingClient) {
    answers.clientId = pendingClient.id;
    pendingClient = null;
  }
  persistCurrentSurvey("Прервано", "Респондент не заинтересован в участии.");
  intro();
}

function startNew() {
  stopClientTimeTimer();
  answers = { interest: "Да" };
  applyPendingClientToAnswers();
  startedAt = new Date().toISOString();
  currentIndex = 0;
  renderQuestion();
}

function renderQuestion() {
  const question = questions[currentIndex];
  progressWrap.style.display = "block";
  setShiftToolsVisible(false);
  const percent = Math.round(((currentIndex + 1) / questions.length) * 100);
  stepText.textContent = `Вопрос ${currentIndex + 1} из ${questions.length}`;
  progressPercent.textContent = percent + "%";
  progressBar.style.width = percent + "%";

  let control = "";
  const previous = answers[question.id] !== undefined
    ? answers[question.id]
    : (question.defaultValue ?? "");

  if (question.type === "radio" || question.type === "checkbox") {
    const inputType = question.type;
    const gates = question.options.map(option => resolveOptionGate(question, option));
    control =
      `<div class="options">` + question.options.map((option, index) => {
      const label = optionLabel(option);
      const gate = gates[index];
      const checked = inputType === "checkbox"
        ? (Array.isArray(previous) && previous.includes(label))
        : previous === label;
      const situationClosed = Boolean(
        question.situationQuota && situationQuotaCity(label)
      );
      const disabled = situationClosed && !isTestSurvey();
      return `
        <label class="option${disabled ? " is-disabled" : ""}">
          <input type="${inputType}" name="answer" value="${escapeHtml(label)}"
            ${checked && !disabled ? "checked" : ""} ${disabled ? "disabled" : ""}>
          <span class="option-body">
            <span class="option-label">${escapeHtml(optionDisplay(option))}</span>
            ${gateMetaHtml(gate)}
          </span>
        </label>`;
    }).join("") + `</div>`;
  } else if (question.type === "phone") {
    control = `
      ${question.askName ? `
        <input id="respondentName" type="text" maxlength="100" autocomplete="off"
          value="${escapeHtml(answers.respondentName || "")}" placeholder="Введите имя или удобное обращение">
        <label class="field-label secondary-question" for="answer">Телефон респондента</label>
      ` : `<label class="field-label" for="answer">Номер телефона</label>`}
      <input id="answer" type="text" maxlength="15" autocomplete="off"
        value="${escapeHtml(previous || "")}" placeholder="Введите телефон или test">`;
  } else if (question.type === "number") {
    control = `<input id="answer" type="number" step="1"
      value="${escapeHtml(previous || "")}" placeholder="Например, 35">`;
  } else if (question.type === "select") {
    control = `
      <div class="search-select${previous ? " has-value" : ""}" id="searchSelect">
        <input type="hidden" id="answer" value="${escapeHtml(previous || "")}">
        <input type="text" id="citySearch" class="search-select-input" autocomplete="off"
          placeholder="Начните вводить город"
          value="${escapeHtml(previous || "")}">
        <button type="button" class="search-select-clear" id="cityClear" title="Сбросить" aria-label="Сбросить выбор">${icon("close")}</button>
        <div class="search-select-list" id="cityList" hidden></div>
      </div>`;
  } else if (question.type === "textarea") {
    control = `<textarea id="answer" placeholder="Введите ответ респондента">${escapeHtml(previous || "")}</textarea>`;
  } else if (question.type === "text") {
    control = `<input id="answer" type="text" maxlength="100" autocomplete="off"
      value="${escapeHtml(previous || "")}" placeholder="Введите имя или удобное обращение">`;
  } else {
    control = `<input id="answer" type="text" value="${escapeHtml(previous || "")}" placeholder="Введите ответ">`;
  }

  setAppHtml(`
    <div class="eyebrow">Вопрос ${currentIndex + 1}</div>
    ${qText(question, "preface") ? `<div class="script"><p>${escapeHtml(qText(question, "preface"))}</p></div>` : ""}
    <h2 class="${question.compactTitle ? "compact-title" : ""}">${escapeHtml(qText(question, "title"))}</h2>
    ${qText(question, "subtitle") ? `<p class="lead">${escapeHtml(qText(question, "subtitle"))}</p>` : ""}
    ${qText(question, "instruction") ? `<div class="instruction${question.italicInstruction ? " italic-instruction" : ""}">${escapeHtml(qText(question, "instruction"))}</div>` : ""}
    ${control}
    <div class="error" id="error" role="alert"></div>
    <div class="actions">
      <button class="button secondary" id="backButton">${
        currentIndex === 0
          ? withIcon("home", "К началу")
          : withIcon("arrowBack", "Назад")
      }</button>
      <button class="button primary" id="nextButton">${
        currentIndex === questions.length - 1
          ? withIcon("check", "Завершить")
          : withIcon("arrowRight", "Далее")
      }</button>
    </div>`);

  document.getElementById("backButton").onclick = goBack;
  document.getElementById("nextButton").onclick = goNext;

  if (question.type === "select") {
    initCitySearchSelect(question);
  } else {
    const answerInput = document.getElementById("answer");
    const nameInput = document.getElementById("respondentName");
    (nameInput || answerInput)?.focus();
    if (answerInput) {
      answerInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && question.type !== "textarea") goNext();
      });
    }
    if (nameInput) {
      nameInput.addEventListener("keydown", event => {
        if (event.key === "Enter") answerInput?.focus();
      });
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initCitySearchSelect(question) {
  const root = document.getElementById("searchSelect");
  const hidden = document.getElementById("answer");
  const search = document.getElementById("citySearch");
  const clear = document.getElementById("cityClear");
  const list = document.getElementById("cityList");
  const cities = question.options.map(optionLabel);
  let activeIndex = -1;

  function optionLabelText(city) {
    return city;
  }

  function cityGate(city) {
    return resolveOptionGate(question, city);
  }

  function syncClearState() {
    const hasValue = Boolean(hidden.value || search.value.trim());
    root.classList.toggle("has-value", hasValue);
  }

  function filteredCities(query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return cities.slice();
    return cities.filter(city => city.toLowerCase().includes(needle));
  }

  function closeList() {
    list.hidden = true;
    list.innerHTML = "";
    activeIndex = -1;
  }

  function selectCity(city) {
    hidden.value = city;
    search.value = city;
    syncClearState();
    closeList();
  }

  function clearCity() {
    hidden.value = "";
    search.value = "";
    syncClearState();
    closeList();
    search.focus();
    renderList("");
  }

  function renderList(query) {
    const items = filteredCities(query);
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<div class="search-select-empty">Ничего не найдено</div>`;
      list.hidden = false;
      activeIndex = -1;
      return;
    }

    items.forEach((city, index) => {
      const gate = cityGate(city);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-select-option";
      if (city === hidden.value) button.classList.add("is-selected");
      button.innerHTML = `<span>${escapeHtml(optionLabelText(city))}</span>${gateMetaHtml(gate)}`;
      button.dataset.value = city;
      button.dataset.index = String(index);
      button.addEventListener("mousedown", event => {
        event.preventDefault();
        selectCity(city);
      });
      list.appendChild(button);
    });
    list.hidden = false;
    activeIndex = items.findIndex(city => city === hidden.value);
    if (activeIndex < 0) activeIndex = 0;
    updateActiveOption();
  }

  function updateActiveOption() {
    [...list.querySelectorAll(".search-select-option")].forEach((button, index) => {
      button.classList.toggle("is-active", index === activeIndex);
    });
  }

  clear.addEventListener("mousedown", event => {
    event.preventDefault();
    event.stopPropagation();
    clearCity();
  });

  search.addEventListener("focus", () => {
    // Уже выбранный город — не открываем список: это «готово», а не «ищем».
    if (hidden.value && search.value.trim() === hidden.value) return;
    renderList(search.value);
  });
  search.addEventListener("input", () => {
    const match = cities.find(city => city.toLowerCase() === search.value.trim().toLowerCase());
    hidden.value = match || "";
    syncClearState();
    renderList(search.value);
  });
  search.addEventListener("keydown", event => {
    const options = [...list.querySelectorAll(".search-select-option")];
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (list.hidden) renderList(search.value);
      const fresh = [...list.querySelectorAll(".search-select-option")];
      activeIndex = Math.min(activeIndex + 1, fresh.length - 1);
      updateActiveOption();
      fresh[activeIndex]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) renderList(search.value);
      const fresh = [...list.querySelectorAll(".search-select-option")];
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveOption();
      fresh[activeIndex]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const visible = [...list.querySelectorAll(".search-select-option")];
      if (!list.hidden && visible[activeIndex]) {
        selectCity(visible[activeIndex].dataset.value);
      } else if (hidden.value) {
        goNext();
      } else {
        const items = filteredCities(search.value);
        if (items.length === 1) selectCity(items[0]);
        else document.getElementById("error").textContent = "Выберите город из списка.";
      }
    } else if (event.key === "Escape") {
      closeList();
    }
  });
  search.addEventListener("blur", () => {
    setTimeout(closeList, 120);
  });

  syncClearState();
  // Если город уже выбран (префилл / возврат) — показываем готовое значение, без фокуса и дропдауна.
  if (!hidden.value) {
    search.focus();
    search.select();
  }
}

function readAnswer(question) {
  if (question.type === "radio") {
    return document.querySelector('input[name="answer"]:checked')?.value || "";
  }
  if (question.type === "checkbox") {
    return [...document.querySelectorAll('input[name="answer"]:checked')].map(input => input.value);
  }
  return document.getElementById("answer").value.trim();
}

function goHome() {
  answers = {};
  startedAt = "";
  currentIndex = 0;
  pendingClient = null;
  stopClientTimeTimer();
  closeServiceMenu();
  intro();
}

brandHome.onclick = () => goHome();

function goBack() {
  const question = questions[currentIndex];
  answers[question.id] = readAnswer(question);
  if (question.askName) {
    const nameInput = document.getElementById("respondentName");
    if (nameInput) answers.respondentName = nameInput.value.trim();
  }
  if (currentIndex === 0) {
    intro();
  } else {
    currentIndex--;
    renderQuestion();
  }
}

function goNext() {
  const question = questions[currentIndex];
  const value = readAnswer(question);
  const empty = Array.isArray(value) ? value.length === 0 : value === "";
  const error = document.getElementById("error");

  if (question.askName) {
    const respondentName = document.getElementById("respondentName")?.value.trim() || "";
    if (!respondentName) {
      error.textContent = "Укажите, как обращаться к респонденту.";
      return;
    }
    answers.respondentName = respondentName;
  }

  if (empty) {
    error.textContent = "Выберите или введите ответ.";
    return;
  }

  if (question.type === "select") {
    const allowed = question.options.map(optionLabel);
    if (!allowed.includes(value)) {
      error.textContent = "Выберите город из списка.";
      return;
    }
  }

  if (question.validate) {
    const message = question.validate(value);
    if (message) {
      error.textContent = message;
      return;
    }
  }

  if (question.matchInitialPhone && normalizePhone(value) !== normalizePhone(answers.phoneInitial)) {
    error.textContent = "Телефон не совпадает с номером, указанным в начале анкеты.";
    return;
  }

  answers[question.id] = value;

  if (question.terminate) {
    const reason = question.terminate(value);
    if (reason) {
      finish("Прервано", reason);
      return;
    }
  }

  const quotaFailureNow = quotaFailureFor(question, value);
  if (quotaFailureNow) {
    finish("Прервано", quotaFailureNow);
    return;
  }

  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    const quotaFailure = finalQuotaFailure();
    if (quotaFailure) {
      finish("Прервано", quotaFailure);
      return;
    }
    finish("Подходит", "Анкета успешно заполнена. Респондент соответствует критериям отбора.");
  }
}

function persistCurrentSurvey(status, reason) {
  const surveys = loadSurveys();
  const isTest = isTestSurvey();
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    startedAt: startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status,
    reason,
    isTest,
    answers: typeof structuredClone === "function"
      ? structuredClone(answers)
      : JSON.parse(JSON.stringify(answers))
  };
  surveys.push(record);
  saveSurveys(surveys);
  return { surveys, isTest };
}

function finish(status, reason) {
  const { surveys, isTest } = persistCurrentSurvey(status, reason);

  progressWrap.style.display = "none";
  setShiftToolsVisible(false);
  const success = status === "Подходит";
  setAppHtml(`
    <div class="eyebrow">${success ? "Анкета завершена" : "Интервью прервано"}</div>
    <h1>${success ? "Респондент подходит" : "Отбор завершён"}</h1>
    <p class="result-reason">${escapeHtml(reason)}</p>
    ${isTest ? `<div class="instruction">Тестовая анкета — она не учитывается в общих квотах.</div>` : ""}
    <p>Ответы сохранены в браузере. Всего сохранено анкет: <strong>${surveys.length}</strong>.</p>
    <div class="result-actions">
      <button class="button primary" id="newSurvey">Начать заново</button>
    </div>`);

  document.getElementById("newSurvey").onclick = intro;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(number) {
  let result = "";
  while (number > 0) {
    number--;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }
  return result;
}

function makeSheetXml(rows) {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = columnName(columnIndex + 1) + (rowIndex + 1);
      const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${sheetRows}</sheetData></worksheet>`;
}

function littleEndian(number, bytes) {
  const output = [];
  for (let index = 0; index < bytes; index++) {
    output.push(number & 255);
    number = Math.floor(number / 256);
  }
  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...littleEndian(0x04034b50, 4),
      ...littleEndian(20, 2),
      ...littleEndian(0x0800, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(crc, 4),
      ...littleEndian(data.length, 4),
      ...littleEndian(data.length, 4),
      ...littleEndian(name.length, 2),
      ...littleEndian(0, 2),
      ...name
    ]);
    chunks.push(local, data);

    central.push(new Uint8Array([
      ...littleEndian(0x02014b50, 4),
      ...littleEndian(20, 2),
      ...littleEndian(20, 2),
      ...littleEndian(0x0800, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(crc, 4),
      ...littleEndian(data.length, 4),
      ...littleEndian(data.length, 4),
      ...littleEndian(name.length, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 2),
      ...littleEndian(0, 4),
      ...littleEndian(offset, 4),
      ...name
    ]));
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array([
    ...littleEndian(0x06054b50, 4),
    ...littleEndian(0, 2),
    ...littleEndian(0, 2),
    ...littleEndian(files.length, 2),
    ...littleEndian(files.length, 2),
    ...littleEndian(centralSize, 4),
    ...littleEndian(offset, 4),
    ...littleEndian(0, 2)
  ]);
  return new Blob([...chunks, ...central, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function exportXlsx() {
  const surveys = loadSurveys();
  if (!surveys.length) {
    alert("Нет сохранённых анкет для выгрузки.");
    return;
  }

  const filename = askExportFilename();
  if (!filename) return;

  const headers = [
    "ID анкеты", "Начало", "Завершение", "Статус", "Причина завершения",
    "Тестовая анкета", "Интерес к участию", RESPONDENT_NAME_COLUMN,
    ...questions.map(questionExportTitle)
  ];
  const rows = [headers];
  for (const survey of surveys) {
    rows.push([
      survey.id,
      new Date(survey.startedAt).toLocaleString("ru-RU"),
      new Date(survey.completedAt).toLocaleString("ru-RU"),
      survey.status,
      survey.reason,
      survey.isTest ? "Да" : "Нет",
      survey.answers?.interest || "",
      survey.answers?.respondentName || "",
      ...questions.map(question => survey.answers?.[question.id] ?? "")
    ]);
  }

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Анкеты" sheetId="1" r:id="rId1"/></sheets></workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `</Relationships>`
    },
    { name: "xl/worksheets/sheet1.xml", content: makeSheetXml(rows) }
  ];

  const blob = createZip(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readU16(view, offset) {
  return view.getUint16(offset, true);
}

function readU32(view, offset) {
  return view.getUint32(offset, true);
}

async function inflateRaw(data) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Браузер не умеет распаковывать сжатый Excel. Откройте файл, сохранённый этой анкетой, или обновите браузер.");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractZip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const files = {};
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature = readU32(view, offset);
    if (signature !== 0x04034b50) break;

    const method = readU16(view, offset + 8);
    const flags = readU16(view, offset + 6);
    const compSize = readU32(view, offset + 18);
    const nameLen = readU16(view, offset + 26);
    const extraLen = readU16(view, offset + 28);
    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const name = new TextDecoder().decode(nameBytes).replaceAll("\\", "/");
    const dataStart = offset + 30 + nameLen + extraLen;

    if (flags & 0x08) {
      throw new Error("Этот Excel сохранён в неподдерживаемом формате ZIP. Выгрузите файл заново из анкеты.");
    }

    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    if (method === 0) {
      files[name] = compressed.slice();
    } else if (method === 8) {
      files[name] = await inflateRaw(compressed);
    } else {
      throw new Error(`Неподдерживаемое сжатие ZIP (${method}) в «${name}».`);
    }

    offset = dataStart + compSize;
  }

  return files;
}

function xmlUnescape(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

function decodeXmlBytes(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const itemRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = itemRegex.exec(xml))) {
    const parts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map(part => xmlUnescape(part[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

function cellRefToIndex(ref) {
  const match = String(ref).match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  let column = 0;
  for (const char of match[1].toUpperCase()) {
    column = column * 26 + (char.charCodeAt(0) - 64);
  }
  return { column: column - 1, row: Number(match[2]) - 1 };
}

function parseSheetMatrix(sheetXml, sharedStrings) {
  const grid = new Map();
  let maxRow = -1;
  let maxCol = -1;
  const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let match;

  while ((match = cellRegex.exec(sheetXml))) {
    const attrs = match[1];
    const inner = match[2] || "";
    const refMatch = attrs.match(/\br="([^"]+)"/);
    if (!refMatch) continue;

    const position = cellRefToIndex(refMatch[1]);
    if (!position) continue;

    const typeMatch = attrs.match(/\bt="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : "";
    let value = "";

    if (type === "inlineStr") {
      const textMatch = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
      value = textMatch ? xmlUnescape(textMatch[1]) : "";
    } else if (type === "s") {
      const indexMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      value = sharedStrings[Number(indexMatch?.[1] ?? -1)] ?? "";
    } else if (type === "b") {
      const boolMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      value = boolMatch?.[1] === "1" ? "Да" : "Нет";
    } else {
      const valueMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      value = valueMatch ? xmlUnescape(valueMatch[1]) : "";
    }

    if (!grid.has(position.row)) grid.set(position.row, new Map());
    grid.get(position.row).set(position.column, value);
    maxRow = Math.max(maxRow, position.row);
    maxCol = Math.max(maxCol, position.column);
  }

  const rows = [];
  for (let row = 0; row <= maxRow; row++) {
    const source = grid.get(row) || new Map();
    const values = [];
    for (let column = 0; column <= maxCol; column++) {
      values.push(source.get(column) ?? "");
    }
    rows.push(values);
  }
  return rows;
}

function parseExportDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return new Date().toISOString();

  const localeMatch = text.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (localeMatch) {
    const [, day, month, year, hours = "0", minutes = "0", seconds = "0"] = localeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    ).toISOString();
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function findZipEntry(files, suffix) {
  const names = Object.keys(files);
  return names.find(name => name === suffix || name.endsWith("/" + suffix) || name.endsWith(suffix));
}

function rowsToSurveys(matrix) {
  if (!matrix.length) {
    throw new Error("В файле нет строк.");
  }

  const headers = matrix[0].map(cell => String(cell ?? "").trim());
  const required = [
    "ID анкеты", "Начало", "Завершение", "Статус", "Причина завершения",
    "Тестовая анкета", "Интерес к участию", RESPONDENT_NAME_COLUMN,
    ...questions.map(questionExportTitle)
  ];
  for (const header of required) {
    if (!headers.includes(header)) {
      throw new Error(`В Excel нет колонки «${header}». Загрузите файл, выгруженный из этой анкеты.`);
    }
  }

  const surveys = [];
  for (let index = 1; index < matrix.length; index++) {
    const row = matrix[index];
    if (!row || row.every(cell => String(cell ?? "").trim() === "")) continue;

    const get = name => {
      const column = headers.indexOf(name);
      return column >= 0 ? String(row[column] ?? "").trim() : "";
    };

    const answers = { interest: get("Интерес к участию") };
    const respondentName = get(RESPONDENT_NAME_COLUMN);
    if (respondentName) answers.respondentName = respondentName;
    for (const question of questions) {
      const column = questionExportTitle(question);
      let raw = get(column);
      if (question.type === "checkbox") {
        answers[question.id] = raw
          ? raw.split(/\s*;\s*/).map(part => part.trim()).filter(Boolean)
          : [];
      } else {
        answers[question.id] = raw;
      }
    }

    const id = get("ID анкеты") || (crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random());

    surveys.push({
      id,
      startedAt: parseExportDate(get("Начало")),
      completedAt: parseExportDate(get("Завершение")),
      status: get("Статус") || "Прервано",
      reason: get("Причина завершения") || "",
      isTest: get("Тестовая анкета") === "Да"
        || isTestPhone(answers.phoneInitial)
        || isTestPhone(answers.phone),
      answers
    });
  }

  return surveys;
}

function mergeImportedSurveys(existing, imported) {
  const byId = new Map(existing.map(survey => [survey.id, survey]));
  let added = 0;
  let skipped = 0;

  for (const survey of imported) {
    if (byId.has(survey.id)) {
      skipped += 1;
      continue;
    }
    byId.set(survey.id, survey);
    added += 1;
  }

  return {
    surveys: [...byId.values()],
    added,
    skipped
  };
}

async function parseSurveysFromXlsx(buffer) {
  const files = await extractZip(buffer);
  const sheetName = findZipEntry(files, "xl/worksheets/sheet1.xml")
    || Object.keys(files).find(name => /xl\/worksheets\/sheet\d+\.xml$/i.test(name));
  if (!sheetName) {
    throw new Error("В файле не найден лист с данными.");
  }

  const sharedName = findZipEntry(files, "xl/sharedStrings.xml");
  const sharedStrings = sharedName
    ? parseSharedStrings(decodeXmlBytes(files[sharedName]))
    : [];
  const matrix = parseSheetMatrix(decodeXmlBytes(files[sheetName]), sharedStrings);
  return rowsToSurveys(matrix);
}

async function importXlsxFromInput(event) {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  try {
    const buffer = await file.arrayBuffer();
    const imported = await parseSurveysFromXlsx(buffer);
    if (!imported.length) {
      alert("В файле нет анкет для загрузки.");
      return;
    }

    const existing = loadSurveys();
    const { surveys, added, skipped } = mergeImportedSurveys(existing, imported);
    saveSurveys(surveys);
    updateSavedCount();

    alert(
      `Загрузка завершена.\n\n` +
      `В файле: ${imported.length}\n` +
      `Добавлено: ${added}\n` +
      `Пропущено (уже были): ${skipped}\n` +
      `Всего в памяти: ${surveys.length}`
    );
  } catch (error) {
    console.error(error);
    alert(error?.message || "Не удалось прочитать Excel-файл.");
  }
}

updateSavedCount();
intro();
