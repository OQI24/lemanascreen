"use strict";

export const ICONS = {
  settings: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.64l-1.92-3.32a.49.49 0 0 0-.61-.22l-2.39.96c-.5-.38-1.05-.7-1.65-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.6.24-1.14.56-1.65.94l-2.39-.96a.49.49 0 0 0-.61.22L2.77 8.84a.49.49 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.89 14.5a.49.49 0 0 0-.12.64l1.92 3.32c.13.24.4.34.64.24l2.39-.96c.5.38 1.05.7 1.65.94l.36 2.54c.05.24.25.41.48.41h3.84c.23 0 .43-.17.48-.41l.36-2.54c.6-.24 1.14-.56 1.65-.94l2.39.96c.24.1.51 0 .64-.24l1.92-3.32a.49.49 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"/></svg>',
  download: '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15H7.382C7.761 15 8.107 15.214 8.276 15.553L8.723 16.447C8.893 16.786 9.239 17 9.618 17H14.382C14.761 17 15.107 16.786 15.276 16.447L15.723 15.553C15.893 15.214 16.239 15 16.618 15H21"/><path d="M17 3H19C20.105 3 21 3.895 21 5V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V5C3 3.895 3.895 3 5 3H7"/><path d="M12.01 3V12"/><path d="M8.409 8.409L12 12l3.591-3.591"/></svg>',
  upload: '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15H7.382C7.761 15 8.107 15.214 8.276 15.553L8.723 16.447C8.893 16.786 9.239 17 9.618 17H14.382C14.761 17 15.107 16.786 15.276 16.447L15.723 15.553C15.893 15.214 16.239 15 16.618 15H21"/><path d="M17 3H19C20.105 3 21 3.895 21 5V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V5C3 3.895 3.895 3 5 3H7"/><path d="M12.01 12V3"/><path d="M8.409 6.591L12 3l3.591 3.591"/></svg>',
  trash: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 0 1 0-2h4V4Zm2 1v1h2V5h-2Zm-2 4a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Zm5 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Z"/></svg>',
  close: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.3 6.3a1 1 0 0 1 1.4 0L12 10.6l4.3-4.3a1 1 0 1 1 1.4 1.4L13.4 12l4.3 4.3a1 1 0 0 1-1.4 1.4L12 13.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L10.6 12 6.3 7.7a1 1 0 0 1 0-1.4Z"/></svg>',
  skip: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4L10.6 12 5.3 6.7a1 1 0 0 1 0-1.4Z"/><path d="M17 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z"/></svg>',
  check: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.7 15.3 18.1 6.9a1 1 0 1 1 1.4 1.4l-9.1 9.1a1 1 0 0 1-1.4 0L4.5 13a1 1 0 1 1 1.4-1.4l3.8 3.7Z"/></svg>',
  arrowBack: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.7 5.3a1 1 0 0 1 0 1.4L7.4 11H19a1 1 0 1 1 0 2H7.4l4.3 4.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z"/></svg>',
  arrowRight: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4l4.3-4.3H5a1 1 0 1 1 0-2h11.6l-4.3-4.3a1 1 0 0 1 0-1.4Z"/></svg>',
  home: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.734 9.764 12.002 3 20.267 9.764C20.731 10.143 21 10.712 21 11.311V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V11.312C3 10.712 3.269 10.143 3.734 9.764Z"/></svg>',
  pencil: '<svg class="btn-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.6 4.4a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L9.1 19a1 1 0 0 1-.5.3l-4 1a1 1 0 0 1-1.2-1.2l1-4a1 1 0 0 1 .3-.5l10.5-10.5Zm1.4 1.4L7.5 15.3l-.4 1.6 1.6-.4 9.5-9.5-1.2-1.2Z"/></svg>',
  database: '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2h-5.6L11.2 6A1.4 1.4 0 0 0 10.1 5.5H6A2 2 0 0 0 4 7.5Z"/></svg>',
  search: '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16.5 16.5 4 4"/></svg>',
};

export function icon(name) {
  return ICONS[name] || '';
}

export function withIcon(name, labelHtml) {
  return icon(name) + '<span>' + labelHtml + '</span>';
}

