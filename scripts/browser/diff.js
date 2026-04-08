#!/usr/bin/env node
/**
 * diff.js — Visual diff between two screenshots
 * Uses pixelmatch for pixel-level comparison + auto-crops changed regions
 *
 * Usage:
 *   node diff.js --before /tmp/before.png --after /tmp/after.png --out /tmp/diff.png
 *
 * Stdout: JSON with diff percentage, changed regions, and element-level deltas
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { before: null, after: null, out: null, threshold: 0.1 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--before': opts.before = args[++i]; break;
      case '--after': opts.after = args[++i]; break;
      case '--out': opts.out = args[++i]; break;
      case '--threshold': opts.threshold = parseFloat(args[++i]); break;
    }
  }
  return opts;
}

function loadPNG(filepath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filepath).pipe(new PNG());
    stream.on('parsed', function () { resolve(this); });
    stream.on('error', reject);
  });
}

function findChangedRegions(diffData, width, height) {
  const regions = [];
  const visited = new Set();
  const CELL = 20; // grid cell size for region detection

  for (let gy = 0; gy < height; gy += CELL) {
    for (let gx = 0; gx < width; gx += CELL) {
      const key = `${gx},${gy}`;
      if (visited.has(key)) continue;

      // Check if this cell has changed pixels
      let hasChange = false;
      for (let y = gy; y < Math.min(gy + CELL, height) && !hasChange; y++) {
        for (let x = gx; x < Math.min(gx + CELL, width) && !hasChange; x++) {
          const idx = (y * width + x) * 4;
          // diffData has red pixels where differences exist
          if (diffData[idx] > 200 && diffData[idx + 1] < 100) {
            hasChange = true;
          }
        }
      }

      if (hasChange) {
        // Flood-fill to find connected changed region
        const region = { x1: gx, y1: gy, x2: gx + CELL, y2: gy + CELL };
        const queue = [[gx, gy]];
        visited.add(key);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift();
          region.x1 = Math.min(region.x1, cx);
          region.y1 = Math.min(region.y1, cy);
          region.x2 = Math.max(region.x2, cx + CELL);
          region.y2 = Math.max(region.y2, cy + CELL);

          // Check neighbors
          for (const [nx, ny] of [[cx - CELL, cy], [cx + CELL, cy], [cx, cy - CELL], [cx, cy + CELL]]) {
            const nkey = `${nx},${ny}`;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited.has(nkey)) continue;
            // Check if neighbor cell has changes
            let neighborChanged = false;
            for (let y = ny; y < Math.min(ny + CELL, height) && !neighborChanged; y++) {
              for (let x = nx; x < Math.min(nx + CELL, width) && !neighborChanged; x++) {
                const idx = (y * width + x) * 4;
                if (diffData[idx] > 200 && diffData[idx + 1] < 100) neighborChanged = true;
              }
            }
            if (neighborChanged) {
              visited.add(nkey);
              queue.push([nx, ny]);
            }
          }
        }

        regions.push({
          x: region.x1,
          y: region.y1,
          width: region.x2 - region.x1,
          height: region.y2 - region.y1,
        });
      }
    }
  }

  return regions;
}

async function main() {
  const opts = parseArgs();

  if (!opts.before || !opts.after) {
    console.log(JSON.stringify({ error: 'Missing --before or --after' }));
    process.exit(1);
  }

  if (!fs.existsSync(opts.before) || !fs.existsSync(opts.after)) {
    console.log(JSON.stringify({ error: 'Before or after file not found', before: opts.before, after: opts.after }));
    process.exit(1);
  }

  try {
    const imgBefore = await loadPNG(opts.before);
    const imgAfter = await loadPNG(opts.after);

    const width = Math.max(imgBefore.width, imgAfter.width);
    const height = Math.max(imgBefore.height, imgAfter.height);

    // Create diff output
    const diff = new PNG({ width, height });

    // Simple pixel comparison (no pixelmatch dependency)
    let diffPixels = 0;
    const totalPixels = width * height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const bIdx = y < imgBefore.height && x < imgBefore.width ? (y * imgBefore.width + x) * 4 : -1;
        const aIdx = y < imgAfter.height && x < imgAfter.width ? (y * imgAfter.width + x) * 4 : -1;

        if (bIdx === -1 || aIdx === -1) {
          // Size difference — mark as changed
          diff.data[idx] = 255; diff.data[idx + 1] = 0; diff.data[idx + 2] = 0; diff.data[idx + 3] = 255;
          diffPixels++;
          continue;
        }

        const dr = Math.abs(imgBefore.data[bIdx] - imgAfter.data[aIdx]);
        const dg = Math.abs(imgBefore.data[bIdx + 1] - imgAfter.data[aIdx + 1]);
        const db = Math.abs(imgBefore.data[bIdx + 2] - imgAfter.data[aIdx + 2]);
        const delta = (dr + dg + db) / 3;

        if (delta > opts.threshold * 255) {
          // Changed pixel — red highlight
          diff.data[idx] = 255;
          diff.data[idx + 1] = 0;
          diff.data[idx + 2] = 0;
          diff.data[idx + 3] = 180;
          diffPixels++;
        } else {
          // Unchanged — dim copy of after image
          diff.data[idx] = imgAfter.data[aIdx] * 0.3;
          diff.data[idx + 1] = imgAfter.data[aIdx + 1] * 0.3;
          diff.data[idx + 2] = imgAfter.data[aIdx + 2] * 0.3;
          diff.data[idx + 3] = 255;
        }
      }
    }

    const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(1);
    const changedRegions = findChangedRegions(diff.data, width, height);

    // Save diff image
    if (opts.out) {
      fs.mkdirSync(path.dirname(opts.out), { recursive: true });
      diff.pack().pipe(fs.createWriteStream(opts.out));
    }

    // Load bounding boxes if available for element-level diff
    const beforeBoxesPath = opts.before.replace('.png', '-boxes.json');
    const afterBoxesPath = opts.after.replace('.png', '-boxes.json');
    let changedElements = [];

    if (fs.existsSync(beforeBoxesPath) && fs.existsSync(afterBoxesPath)) {
      const beforeBoxes = JSON.parse(fs.readFileSync(beforeBoxesPath, 'utf-8'));
      const afterBoxes = JSON.parse(fs.readFileSync(afterBoxesPath, 'utf-8'));

      // Match elements by selector and compare positions
      const beforeMap = new Map(beforeBoxes.map(b => [b.selector, b]));
      const afterMap = new Map(afterBoxes.map(b => [b.selector, b]));

      for (const [sel, after] of afterMap) {
        const before = beforeMap.get(sel);
        if (!before) {
          changedElements.push({ selector: sel, change: 'added', after: after.box });
          continue;
        }
        const dx = after.box.x - before.box.x;
        const dy = after.box.y - before.box.y;
        const dw = after.box.width - before.box.width;
        const dh = after.box.height - before.box.height;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || Math.abs(dw) > 2 || Math.abs(dh) > 2) {
          changedElements.push({
            selector: sel,
            change: 'moved',
            before: before.box,
            after: after.box,
            delta: { x: dx, y: dy, width: dw, height: dh },
            description: describeChange(sel, { dx, dy, dw, dh }),
          });
        }
      }

      for (const [sel] of beforeMap) {
        if (!afterMap.has(sel)) {
          changedElements.push({ selector: sel, change: 'removed', before: beforeMap.get(sel).box });
        }
      }

      // Limit to most significant changes
      changedElements = changedElements
        .sort((a, b) => {
          const aDelta = a.delta ? Math.abs(a.delta.x) + Math.abs(a.delta.y) + Math.abs(a.delta.width) + Math.abs(a.delta.height) : 999;
          const bDelta = b.delta ? Math.abs(b.delta.x) + Math.abs(b.delta.y) + Math.abs(b.delta.width) + Math.abs(b.delta.height) : 999;
          return bDelta - aDelta;
        })
        .slice(0, 20);
    }

    console.log(JSON.stringify({
      diffPercent: parseFloat(diffPercent),
      diffPixels,
      totalPixels,
      changedRegions,
      changedElements,
      diffImagePath: opts.out,
      beforePath: opts.before,
      afterPath: opts.after,
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

function describeChange(selector, { dx, dy, dw, dh }) {
  const parts = [];
  const name = selector.split('.').pop() || selector;
  if (Math.abs(dy) > 2) parts.push(`${dy > 0 ? '아래' : '위'}로 ${Math.abs(dy)}px 이동`);
  if (Math.abs(dx) > 2) parts.push(`${dx > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(dx)}px 이동`);
  if (Math.abs(dh) > 2) parts.push(`높이 ${dh > 0 ? '+' : ''}${dh}px`);
  if (Math.abs(dw) > 2) parts.push(`너비 ${dw > 0 ? '+' : ''}${dw}px`);
  return `${name}: ${parts.join(', ')}`;
}

main();
