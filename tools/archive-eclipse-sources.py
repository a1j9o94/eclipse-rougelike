#!/usr/bin/env python3
"""Build and verify an offline, byte-preserving archive of inventoried Drive files.

Download originals separately through the Google Drive connector. This tool never
accepts credentials or authenticated download URLs and does not publish anything.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
from typing import TypedDict
import zipfile

SOURCE_URL = 'https://drive.google.com/drive/folders/1pFDgHXE_gsLb2AT3hPptgiSuuM237KHR'
RELEASE_TAG = 'faction-sources-2026-09-19'


class SourceEntry(TypedDict):
    id: str
    title: str
    relativePath: str
    file_or_folder: str
    size: str
    url: str
    mime_type: str
    created_time: str
    modified_time: str


class ArchivedFile(TypedDict):
    title: str
    id: str
    sourceUrl: str
    relativePath: str
    mimeType: str
    createdTime: str
    modifiedTime: str
    sizeBytes: int
    sha256: str
    archive: str
    archivePath: str


class ArchivedFolder(TypedDict):
    title: str
    id: str
    sourceUrl: str
    relativePath: str
    modifiedTime: str


class SourceManifest(TypedDict):
    schemaVersion: int
    snapshotDate: str
    sourceAuthority: str
    sourceRootUrl: str
    releaseTag: str
    fileCount: int
    folderCount: int
    originalBytes: int
    verification: str
    versionPolicy: str
    archive: str
    folders: list[ArchivedFolder]
    files: list[ArchivedFile]


def source_path(originals: Path, relative_path: str) -> Path:
    relative = PurePosixPath(relative_path)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts:
        raise ValueError(f'Unsafe source path: {relative_path}')
    root = originals.resolve()
    path = (root / relative_path).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f'Source path escapes originals: {relative_path}')
    return path


def build_manifest(entries: list[SourceEntry], originals: Path, archive_name: str) -> SourceManifest:
    files: list[ArchivedFile] = []
    folders: list[ArchivedFolder] = []
    seen: set[str] = set()
    for entry in entries:
        relative = entry['relativePath']
        path = source_path(originals, relative)
        if relative in seen:
            raise ValueError(f'Duplicate archive path: {relative}')
        seen.add(relative)
        if entry['file_or_folder'] == 'folder':
            folders.append({'title': entry['title'], 'id': entry['id'], 'sourceUrl': entry['url'], 'relativePath': relative, 'modifiedTime': entry['modified_time']})
            continue
        size = path.stat().st_size
        if size != int(entry['size']):
            raise ValueError(f'Size mismatch for {relative}: {size} != {entry["size"]}')
        with path.open('rb') as original:
            sha256 = hashlib.file_digest(original, 'sha256').hexdigest()
        files.append({'title': entry['title'], 'id': entry['id'], 'sourceUrl': entry['url'], 'relativePath': relative, 'mimeType': entry['mime_type'], 'createdTime': entry['created_time'], 'modifiedTime': entry['modified_time'], 'sizeBytes': size, 'sha256': sha256, 'archive': archive_name, 'archivePath': 'originals/' + relative})
    return {'schemaVersion': 1, 'snapshotDate': '2026-09-19', 'sourceAuthority': 'Régis Étienne Eclipse Google Drive collection; supplied Drive originals are authoritative for this project.', 'sourceRootUrl': SOURCE_URL, 'releaseTag': RELEASE_TAG, 'fileCount': len(files), 'folderCount': len(folders), 'originalBytes': sum(item['sizeBytes'] for item in files), 'verification': 'Every local original matches the inventoried Drive byte size; SHA-256 records its downloaded bytes. The inventory did not supply provider hashes. Archive members are independently checked against these hashes.', 'versionPolicy': 'Preserve every original, including old versions and conflicting sheets. Prefer explicitly updated current Drive rules over old-labelled versions; modified timestamps are provenance and do not alone settle a rules conflict. Consult the repository research notes for rule interpretation.', 'archive': archive_name, 'folders': folders, 'files': files}


def write_archive(manifest: SourceManifest, originals: Path, output: Path, readme: str, credits: str = '') -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as bundle:
        bundle.writestr('README.md', readme)
        if credits:
            bundle.writestr('credits.md', credits)
        bundle.writestr('manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        for folder in manifest['folders']:
            bundle.writestr('originals/' + folder['relativePath'] + '/', b'')
        for item in manifest['files']:
            bundle.write(source_path(originals, item['relativePath']), item['archivePath'])


def verify_archive(manifest: SourceManifest, output: Path) -> None:
    with zipfile.ZipFile(output) as bundle:
        expected = {item['archivePath'] for item in manifest['files']}
        actual = {info.filename for info in bundle.infolist() if info.filename.startswith('originals/') and not info.is_dir()}
        if actual != expected:
            raise ValueError('Archive original-file membership differs from manifest')
        for item in manifest['files']:
            if bundle.getinfo(item['archivePath']).file_size != item['sizeBytes']:
                raise ValueError(f'Archive size mismatch: {item["relativePath"]}')
            with bundle.open(item['archivePath']) as original:
                digest = hashlib.file_digest(original, 'sha256').hexdigest()
            if digest != item['sha256']:
                raise ValueError(f'Archive SHA-256 mismatch: {item["relativePath"]}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--originals', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--readme', type=Path, required=True)
    parser.add_argument('--credits', type=Path)
    args = parser.parse_args()
    entries: list[SourceEntry] = json.loads(args.inventory.read_text())
    manifest = build_manifest(entries, args.originals, args.archive.name)
    readme = args.readme.read_text().replace('(source-archive-manifest.json)', '(manifest.json)')
    credits = args.credits.read_text() if args.credits else ''
    research_base = 'https://github.com/a1j9o94/eclipse-rougelike/blob/' + RELEASE_TAG + '/coding_agents/faction_research/'
    for name in ('factions.md', 'ai_heuristics.md', '../faction_registry_implementation.md'):
        target = research_base + name
        if name.startswith('../'):
            target = research_base.removesuffix('faction_research/') + name[3:]
        readme = readme.replace('(' + name + ')', '(' + target + ')')
        credits = credits.replace('(' + name + ')', '(' + target + ')')
    write_archive(manifest, args.originals, args.archive, readme, credits)
    verify_archive(manifest, args.archive)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    with args.archive.open('rb') as bundle:
        digest = hashlib.file_digest(bundle, 'sha256').hexdigest()
    checksums = args.archive.with_name(args.archive.name + '.sha256')
    checksums.write_text(f'{digest}  {args.archive.name}\n')
    print(json.dumps({'verifiedFiles': manifest['fileCount'], 'originalBytes': manifest['originalBytes'], 'archiveBytes': args.archive.stat().st_size, 'archiveSha256': digest, 'archive': str(args.archive), 'manifest': str(args.manifest)}))


if __name__ == '__main__':
    main()
