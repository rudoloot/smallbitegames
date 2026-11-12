export const TRAY_GREEN = '#398552';
const flags = new Map();

export function flagCanvas(color) {
  if (flags.has(color)) return flags.get(color);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 112;
  const pen = canvas.getContext('2d');
  pen.lineCap = 'round';
  pen.lineJoin = 'round';
  // The pole ends at the lower-left corner; the arrow is centered on the cloth.
  pen.strokeStyle = '#202824';
  pen.lineWidth = 7;
  pen.beginPath();
  pen.moveTo(7, 106);
  pen.lineTo(7, 8);
  pen.stroke();
  pen.beginPath();
  pen.moveTo(8, 9);
  pen.lineTo(119, 9);
  pen.lineTo(111, 40);
  pen.lineTo(119, 71);
  pen.lineTo(8, 71);
  pen.closePath();
  pen.fillStyle = color;
  pen.fill();
  pen.lineWidth = 3;
  pen.stroke();
  pen.beginPath();
  pen.moveTo(36, 33);
  pen.lineTo(64, 33);
  pen.lineTo(64, 22);
  pen.lineTo(86, 40);
  pen.lineTo(64, 58);
  pen.lineTo(64, 47);
  pen.lineTo(36, 47);
  pen.closePath();
  pen.fillStyle = '#fff';
  pen.fill();
  pen.strokeStyle = '#000';
  pen.lineWidth = 4;
  pen.stroke();
  flags.set(color, canvas);
  return canvas;
}

const images = new Map();
export function markTrayCell(cell, color) {
  if (!images.has(color)) images.set(color, flagCanvas(color).toDataURL());
  cell.style.backgroundImage = 'url(' + images.get(color) + ')';
  cell.style.backgroundPosition = 'right top';
  cell.style.backgroundSize = '48% auto';
  cell.style.backgroundRepeat = 'no-repeat';
}
