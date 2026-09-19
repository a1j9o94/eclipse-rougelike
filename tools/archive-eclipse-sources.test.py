"""Integrity checks for the offline Drive source archive builder."""
import importlib.util
import json
from pathlib import Path
import tempfile
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True

SPEC = importlib.util.spec_from_file_location('archive_eclipse_sources', Path(__file__).with_name('archive-eclipse-sources.py'))
archive = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(archive)


class SourceArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.originals = self.root / 'originals'
        (self.originals / 'old versions').mkdir(parents=True)
        (self.originals / 'old versions' / 'sheet.txt').write_bytes(b'original')
        self.entries = [{'id': 'source-id', 'title': 'sheet.txt', 'relativePath': 'old versions/sheet.txt', 'file_or_folder': 'file', 'size': '8', 'url': 'https://drive.google.com/file/d/source-id/view', 'mime_type': 'text/plain', 'created_time': '2025-01-01T00:00:00Z', 'modified_time': '2026-01-01T00:00:00Z'}]

    def test_manifest_and_archive_preserve_original_bytes_and_provenance(self):
        manifest = archive.build_manifest(self.entries, self.originals, 'sources.zip')
        item = manifest['files'][0]
        self.assertEqual(item['modifiedTime'], '2026-01-01T00:00:00Z')
        self.assertEqual(item['sourceUrl'], self.entries[0]['url'])
        self.assertEqual(item['sha256'], '0682c5f2076f099c34cfdd15a9e063849ed437a49677e6fcc5b4198c76575be5')
        output = self.root / 'sources.zip'
        archive.write_archive(manifest, self.originals, output, 'Credit the original authors.')
        with zipfile.ZipFile(output) as bundle:
            self.assertEqual(bundle.read(item['archivePath']), b'original')
            self.assertEqual(bundle.read('README.md'), b'Credit the original authors.')
            self.assertEqual(json.loads(bundle.read('manifest.json'))['fileCount'], 1)
        archive.verify_archive(manifest, output)

    def test_rejects_missing_or_size_mismatched_original(self):
        self.entries[0]['size'] = '9'
        with self.assertRaises(ValueError):
            archive.build_manifest(self.entries, self.originals, 'sources.zip')
        self.entries[0]['relativePath'] = 'missing'
        with self.assertRaises(FileNotFoundError):
            archive.build_manifest(self.entries, self.originals, 'sources.zip')

    def test_rejects_path_traversal_and_duplicate_archive_paths(self):
        self.entries[0]['relativePath'] = '../outside.txt'
        with self.assertRaises(ValueError):
            archive.build_manifest(self.entries, self.originals, 'sources.zip')
        self.entries[0]['relativePath'] = 'old versions/sheet.txt'
        with self.assertRaises(ValueError):
            archive.build_manifest(self.entries * 2, self.originals, 'sources.zip')

    def test_detects_corrupted_archive_original(self):
        manifest = archive.build_manifest(self.entries, self.originals, 'sources.zip')
        output = self.root / 'sources.zip'
        with zipfile.ZipFile(output, 'w') as bundle:
            bundle.writestr(manifest['files'][0]['archivePath'], b'modified')
        with self.assertRaises(ValueError):
            archive.verify_archive(manifest, output)


if __name__ == '__main__':
    unittest.main()
