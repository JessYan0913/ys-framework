import { createCanvas, loadImage } from '@napi-rs/canvas';
import { drawPuzzle, getRandomPoints } from 'create-puzzle';

function randomInt(min: number, max: number) {
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export type PuzzleOptions = {
  imgUrl: string;
  bgWidth?: number;
  bgHeight?: number;
  width?: number;
  height?: number;
  x?: number;
};

export type PuzzleResult = {
  bg: Buffer;
  puzzle: Buffer;
  x: number;
  y: number;
};

function computeDrawRect(origW: number, origH: number, targetW: number, targetH: number) {
  const scale = Math.min(targetW / origW, targetH / origH);
  const finalScale = Math.min(1, scale); // No upscale
  const dw = Math.round(origW * finalScale);
  const dh = Math.round(origH * finalScale);
  const dx = Math.round((targetW - dw) / 2);
  const dy = Math.round((targetH - dh) / 2);
  return { dx, dy, dw, dh, sx: 0, sy: 0, sw: origW, sh: origH };
}

export async function createPuzzle(options: PuzzleOptions): Promise<PuzzleResult> {
  const { imgUrl, bgWidth = 360, bgHeight = 200, width = 60, height = 60, x: outX } = options;

  const borderWidth = 1;
  const borderColor = 'rgba(255,255,255,0.7)';
  const fillColor = 'rgba(255,255,255,0.7)';
  const margin = 2;
  const quality = 80;
  const bgOffset = [0, 0];

  const maxOffsetX = bgWidth - width;
  let x = typeof outX === 'undefined' ? randomInt(width, Math.max(width, maxOffsetX)) : outX || 0;
  if (x < 0) x = 0;
  else if (x > maxOffsetX) x = maxOffsetX;

  const maxOffsetY = bgHeight - height;
  let y = randomInt(0, Math.max(0, maxOffsetY));

  const originImg = await loadImage(imgUrl);
  const origW = originImg.width;
  const origH = originImg.height;

  const points = getRandomPoints(undefined);

  const bgCanvas = createCanvas(bgWidth, bgHeight);
  const bgCtx = bgCanvas.getContext('2d');
  bgCtx.clearRect(0, 0, bgWidth, bgHeight);

  const { dx, dy, dw, dh, sx, sy, sw, sh } = computeDrawRect(origW, origH, bgWidth, bgHeight);
  bgCtx.drawImage(originImg, sx + bgOffset[0], sy + bgOffset[1], sw, sh, dx, dy, dw, dh);

  const puzzleCanvas = createCanvas(width, bgHeight);
  const puzzleCtx = puzzleCanvas.getContext('2d');
  puzzleCtx.strokeStyle = borderColor;
  puzzleCtx.lineWidth = borderWidth;
  puzzleCtx.clearRect(0, 0, width, bgHeight);
  drawPuzzle(puzzleCtx as any, { x: 0, y, w: width, h: height, points: points as any, margin });
  puzzleCtx.clip();
  puzzleCtx.drawImage(bgCanvas, x, y, width, height, 0, y, width, height);

  const maskCanvas = createCanvas(width, height);
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.clearRect(0, 0, width, height);
  maskCtx.fillStyle = fillColor;
  maskCtx.fillRect(0, 0, width, height);

  bgCtx.strokeStyle = borderColor;
  bgCtx.lineWidth = borderWidth;
  drawPuzzle(bgCtx as any, { x, y, w: width, h: height, points: points as any, margin });
  bgCtx.clip();
  bgCtx.drawImage(maskCanvas, x, y, width, height);

  const puzzleBuffer = await puzzleCanvas.encode('webp', quality);
  const bgBuffer = await bgCanvas.encode('jpeg');

  return { bg: bgBuffer, puzzle: puzzleBuffer, x, y };
}