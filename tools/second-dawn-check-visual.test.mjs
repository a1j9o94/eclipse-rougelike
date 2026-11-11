import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { compareReviewedScreenshots } from './second-dawn-check-visual.mjs';

function png(color = [0, 0, 0, 255], width = 2) {
  const image = new PNG({ width, height: 2 });
  for (let offset = 0; offset < image.data.length; offset += 4) image.data.set(color, offset);
  return image;
}
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-visual-'));
  const baseline = join(root, 'baseline'),
    actual = join(root, 'actual'),
    artifacts = join(root, 'diff');
  await mkdir(baseline);
  await mkdir(actual);
  try {
    await run({ root, baseline, actual, artifacts });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const save = (dir, name, image, options) =>
  writeFile(join(dir, name), PNG.sync.write(image, options));

test('accepts identical decoded pixels despite different PNG encodings', async () =>
  fixture(async ({ baseline, actual }) => {
    await save(baseline, 'opening.png', png(), { deflateLevel: 0 });
    await save(actual, 'opening.png', png(), { deflateLevel: 9 });
    assert.notDeepEqual(
      await readFile(join(baseline, 'opening.png')),
      await readFile(join(actual, 'opening.png')),
    );
    assert.deepEqual(await compareReviewedScreenshots(baseline, actual, ['opening.png']), []);
  }));

test('detects even one changed pixel and writes expected/actual/difference evidence without changing baseline', async () =>
  fixture(async ({ baseline, actual, artifacts }) => {
    const before = png();
    const after = png();
    after.data[0] = 255;
    await save(baseline, 'opening.png', before);
    await save(actual, 'opening.png', after);
    const original = await readFile(join(baseline, 'opening.png'));
    const differences = await compareReviewedScreenshots(baseline, actual, ['opening.png'], {
      artifacts,
    });
    assert.equal(differences[0].reason, 'changed');
    assert.equal(differences[0].changedPixels, 1);
    assert.equal(differences[0].totalPixels, 4);
    assert.deepEqual(await readFile(join(baseline, 'opening.png')), original);
    for (const suffix of ['expected', 'actual', 'diff']) {
      const image = PNG.sync.read(await readFile(join(artifacts, `opening.${suffix}.png`)));
      assert.equal(image.width, 2);
      assert.equal(image.height, 2);
    }
    assert.deepEqual(
      [...PNG.sync.read(await readFile(join(artifacts, 'opening.diff.png'))).data.slice(0, 4)],
      [255, 0, 255, 255],
    );
  }));

test('reports missing render and dimension changes', async () =>
  fixture(async ({ baseline, actual, artifacts }) => {
    await save(baseline, 'opening.png', png());
    await save(actual, 'opening.png', png(undefined, 3));
    await save(baseline, 'missing.png', png());
    const differences = await compareReviewedScreenshots(
      baseline,
      actual,
      ['opening.png', 'missing.png'],
      { artifacts },
    );
    assert.deepEqual(
      differences.map(({ file, reason }) => ({ file, reason })),
      [
        { file: 'opening.png', reason: 'dimensions' },
        { file: 'missing.png', reason: 'missing' },
      ],
    );
    assert.equal(PNG.sync.read(await readFile(join(artifacts, 'opening.diff.png'))).width, 3);
  }));

test('fails closed for missing baseline, invalid PNG, empty selection, or unsafe file names', async () =>
  fixture(async ({ baseline, actual }) => {
    await assert.rejects(compareReviewedScreenshots(baseline, actual, []), /empty/);
    await assert.rejects(
      compareReviewedScreenshots(baseline, baseline, ['opening.png']),
      /distinct/,
    );
    await assert.rejects(
      compareReviewedScreenshots(baseline, actual, ['opening.png'], { artifacts: baseline }),
      /overwrite/,
    );
    await assert.rejects(
      compareReviewedScreenshots(baseline, actual, ['../opening.png']),
      /relative PNG/,
    );
    await assert.rejects(compareReviewedScreenshots(baseline, actual, ['missing.png']), /ENOENT/);
    await writeFile(join(baseline, 'invalid.png'), 'not an image');
    await assert.rejects(
      compareReviewedScreenshots(baseline, actual, ['invalid.png']),
      /PNG|buffer|signature/i,
    );
  }));
