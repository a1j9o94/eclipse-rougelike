import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

function decodePng(bytes, file) {
  try {
    return PNG.sync.read(bytes);
  } catch (error) {
    throw new Error(`Invalid PNG ${file}: ${error.message}`, { cause: error });
  }
}

/** Strict RGBA comparison: no percentage tolerance and no automatic baseline updates. */
export async function compareReviewedScreenshots(baseline, actual, files, options = {}) {
  if (!Array.isArray(files) || !files.length) throw new Error('Screenshot selection is empty');
  if (new Set(files).size !== files.length) throw new Error('Duplicate screenshot selection');
  if (resolve(baseline) === resolve(actual))
    throw new Error('Expected and actual screenshot directories must be distinct');
  const differences = [];
  const artifacts = options.artifacts ?? join(actual, 'differences');
  if (
    resolve(artifacts) === resolve(baseline) ||
    resolve(artifacts).startsWith(resolve(baseline) + '/')
  )
    throw new Error('Artifacts must not overwrite the reviewed baseline');
  for (const file of files) {
    if (
      typeof file !== 'string' ||
      isAbsolute(file) ||
      file.split(/[\\/]/).includes('..') ||
      !file.endsWith('.png')
    )
      throw new Error('Screenshot names must be safe relative PNG paths');
    const expectedBytes = await readFile(join(baseline, file));
    const expected = decodePng(expectedBytes, join(baseline, file));
    let renderedBytes;
    try {
      renderedBytes = await readFile(join(actual, file));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      differences.push({ file, reason: 'missing' });
      continue;
    }
    const rendered = decodePng(renderedBytes, join(actual, file));
    const dimensionsMatch =
      expected.width === rendered.width && expected.height === rendered.height;
    if (dimensionsMatch && expected.data.equals(rendered.data)) continue;
    const width = Math.max(expected.width, rendered.width),
      height = Math.max(expected.height, rendered.height);
    const diff = new PNG({ width, height });
    let changedPixels = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const expectedOffset = (y * expected.width + x) * 4;
        const renderedOffset = (y * rendered.width + x) * 4;
        const changed =
          x >= expected.width ||
          y >= expected.height ||
          x >= rendered.width ||
          y >= rendered.height ||
          [0, 1, 2, 3].some(
            (channel) =>
              expected.data[expectedOffset + channel] !== rendered.data[renderedOffset + channel],
          );
        if (changed) {
          changedPixels++;
          diff.data.set([255, 0, 255, 255], offset);
        } else {
          const gray = Math.round(
            (expected.data[expectedOffset] +
              expected.data[expectedOffset + 1] +
              expected.data[expectedOffset + 2]) /
              3,
          );
          diff.data.set([gray, gray, gray, 100], offset);
        }
      }
    }
    if (changedPixels || !dimensionsMatch) {
      const prefix = join(artifacts, file.slice(0, -4));
      await mkdir(dirname(prefix), { recursive: true });
      await Promise.all([
        writeFile(`${prefix}.expected.png`, expectedBytes),
        writeFile(`${prefix}.actual.png`, renderedBytes),
        writeFile(`${prefix}.diff.png`, PNG.sync.write(diff)),
      ]);
      differences.push({
        file,
        reason: dimensionsMatch ? 'changed' : 'dimensions',
        changedPixels,
        totalPixels: width * height,
        artifacts: {
          expected: `${prefix}.expected.png`,
          actual: `${prefix}.actual.png`,
          diff: `${prefix}.diff.png`,
        },
      });
    }
  }
  return differences;
}
async function main() {
  const exitCode = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, ['tools/second-dawn-gameplay-visual-review.mjs'], {
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => accept(code ?? 1));
  });
  if (exitCode) return exitCode;
  const baseline = 'coding_agents/second_dawn_visual_baseline_v5';
  const manifest = JSON.parse(await readFile(join(baseline, 'review.json'), 'utf8'));
  const differences = await compareReviewedScreenshots(
    baseline,
    'coding_agents/second_dawn_gameplay_screenshots',
    manifest.files,
  );
  if (differences.length) {
    for (const difference of differences)
      process.stderr.write(`${difference.file}: ${difference.reason}\n`);
    process.stderr.write(
      'Review the actual images against coding_agents/second_dawn_visual_baseline_v5 before changing any baseline. Browser/platform rendering differences also require investigation.\n',
    );
    return 1;
  }
  process.stdout.write(
    `All ${manifest.files.length} rendered screens match the reviewed baseline.\n`,
  );
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await main();
