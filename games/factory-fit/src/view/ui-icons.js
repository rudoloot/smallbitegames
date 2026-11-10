// Shared local SVG icons: consistent stroke, size and rounded ends.
const paths = {
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
  undo: '<path d="M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12h3"/>',
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 5v14M16 5v14" stroke-width="3"/>',
  previous: '<path d="m14 6-6 6 6 6"/>', next: '<path d="m10 6 6 6-6 6"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>',
  settings: '<path d="m9.4 3-.5 2-2 .9-1.8-.6-2 3.4 1.4 1.5v2.6l-1.4 1.5 2 3.4 1.8-.6 2 .9.5 2h4l.5-2 2-.9 1.8.6 2-3.4-1.4-1.5v-2.6l1.4-1.5-2-3.4-1.8.6-2-.9-.5-2Z"/><circle cx="11.4" cy="11.5" r="3"/>',
  rotate: '<path d="M4 9a8 8 0 1 1 1 8M4 3v6h6"/>',
  timber: '<path d="m3 9 10-5 8 5-10 5Zm0 0v6l8 5 10-5V9m-10 5v6M7 7l8 5"/>',
  parts: '<path d="M5 5h14v4H5zM5 15h14v4H5zM7 9v6m10-6v6"/>',
  crate: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5m-9 5v9M7 5l10 5"/>',
  finished: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5m-9 5v9"/><path d="m15 14 2 2 3-4"/>'
};
export function icon(name) {
  return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths[name] + '</svg>';
}
