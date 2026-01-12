import fs from 'fs/promises';
import path from 'path';

import type { ImageLoader } from '../types';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

export class LocalImageLoader implements ImageLoader {
  constructor(private baseDir: string) {}

  async pickRandomImagePath(): Promise<string> {
    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => path.join(this.baseDir, e.name))
      .filter((p) => IMAGE_EXTS.has(path.extname(p).toLowerCase()));
    if (files.length === 0) {
      throw new Error(`No images found in directory: ${this.baseDir}`);
    }
    const idx = Math.floor(Math.random() * files.length);
    return files[idx];
  }
}