import argparse
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from typing import Iterable

DEFAULT_EXCLUDES = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".next",
    ".nuxt",
    ".cache",
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
    ".DS_Store",
}

DEFAULT_BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".mp3", ".wav", ".ogg", ".mp4", ".mov", ".avi", ".mkv",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".so", ".dll", ".exe", ".bin", ".class", ".pyc",
    ".db", ".sqlite", ".sqlite3",
    ".lock",
}

TEXT_EXT_ALLOWLIST = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md", ".txt",
    ".yml", ".yaml", ".toml", ".ini", ".env", ".dockerfile",
    ".html", ".css", ".scss", ".sass", ".less",
    ".sql", ".sh", ".bash", ".zsh", ".ps1",
    ".java", ".kt", ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".php", ".rb", ".swift", ".vue",
    ".xml", ".svg",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_probably_binary(path: Path) -> bool:
    suffix = path.suffix.lower()

    if suffix in TEXT_EXT_ALLOWLIST:
        return False

    if suffix in DEFAULT_BINARY_EXTENSIONS:
        return True

    mime, _ = mimetypes.guess_type(str(path))
    if mime:
        if mime.startswith("text/"):
            return False
        if any(mime.startswith(prefix) for prefix in ("image/", "audio/", "video/", "font/", "application/pdf")):
            return True

    try:
        with path.open("rb") as f:
            sample = f.read(8192)
    except OSError:
        return True

    if b"\x00" in sample:
        return True

    try:
        sample.decode("utf-8")
        return False
    except UnicodeDecodeError:
        return True


def should_exclude(path: Path, root: Path, exclude_names: set[str]) -> bool:
    rel_parts = path.relative_to(root).parts
    return any(part in exclude_names for part in rel_parts)


def iter_files(root: Path, exclude_names: set[str]) -> Iterable[Path]:
    for current_root, dirs, files in os.walk(root):
        current_path = Path(current_root)

        dirs[:] = [
            d for d in dirs
            if not should_exclude(current_path / d, root, exclude_names)
        ]

        for file_name in files:
            file_path = current_path / file_name
            if should_exclude(file_path, root, exclude_names):
                continue
            yield file_path


def read_text_safe(path: Path) -> tuple[str, str]:
    encodings = ["utf-8", "utf-8-sig", "cp1251", "latin-1"]
    last_error = None

    for enc in encodings:
        try:
            return path.read_text(encoding=enc), enc
        except Exception as exc:
            last_error = exc

    return f"[UNREADABLE TEXT FILE: {last_error}]", "unknown"


def write_tree_section(root: Path, files: list[Path], out) -> None:
    out.write("================================================================================\n")
    out.write("PROJECT TREE\n")
    out.write("================================================================================\n\n")

    tree_map: dict[Path, list[Path]] = {}
    for f in files:
        parent = f.parent
        tree_map.setdefault(parent, []).append(f)

    def walk(dir_path: Path, prefix: str = "") -> None:
        try:
            children_dirs = sorted(
                [p for p in dir_path.iterdir() if p.is_dir() and p.name not in DEFAULT_EXCLUDES],
                key=lambda p: p.name.lower(),
            )
        except Exception:
            children_dirs = []

        child_files = sorted(
            [f for f in files if f.parent == dir_path],
            key=lambda p: p.name.lower(),
        )

        items = children_dirs + child_files
        for index, item in enumerate(items):
            connector = "└── " if index == len(items) - 1 else "├── "
            out.write(f"{prefix}{connector}{item.name}\n")
            if item.is_dir():
                extension = "    " if index == len(items) - 1 else "│   "
                walk(item, prefix + extension)

    out.write(f"{root.name}\n")
    walk(root)
    out.write("\n")


def dump_project(
    root: Path,
    output_txt: Path,
    output_manifest: Path,
    include_binary_hashes: bool = True,
) -> None:
    root = root.resolve()
    files = sorted(iter_files(root, DEFAULT_EXCLUDES), key=lambda p: str(p.relative_to(root)).lower())

    manifest: dict = {
        "project_root": str(root),
        "files": [],
        "stats": {
            "total_files": 0,
            "text_files": 0,
            "binary_files": 0,
            "unreadable_files": 0,
        },
    }

    with output_txt.open("w", encoding="utf-8", newline="\n") as out:
        out.write(f"FULL PROJECT DUMP\n")
        out.write(f"ROOT: {root}\n\n")

        write_tree_section(root, files, out)

        for file_path in files:
            rel_path = file_path.relative_to(root)
            entry = {
                "path": str(rel_path).replace("\\", "/"),
                "size_bytes": file_path.stat().st_size if file_path.exists() else None,
                "sha256": None,
                "type": None,
                "encoding": None,
            }

            out.write("================================================================================\n")
            out.write(f"FILE: {entry['path']}\n")
            out.write("================================================================================\n\n")

            binary = is_probably_binary(file_path)

            if binary:
                entry["type"] = "binary"
                manifest["stats"]["binary_files"] += 1

                if include_binary_hashes:
                    try:
                        entry["sha256"] = sha256_file(file_path)
                    except Exception as exc:
                        entry["sha256"] = f"ERROR: {exc}"

                out.write("[BINARY FILE OMITTED FROM TEXT DUMP]\n")
                if entry["size_bytes"] is not None:
                    out.write(f"size_bytes: {entry['size_bytes']}\n")
                if entry["sha256"]:
                    out.write(f"sha256: {entry['sha256']}\n")
                out.write("\n")
            else:
                entry["type"] = "text"
                manifest["stats"]["text_files"] += 1

                try:
                    entry["sha256"] = sha256_file(file_path)
                except Exception as exc:
                    entry["sha256"] = f"ERROR: {exc}"

                text, encoding = read_text_safe(file_path)
                entry["encoding"] = encoding

                if text.startswith("[UNREADABLE TEXT FILE:"):
                    manifest["stats"]["unreadable_files"] += 1

                out.write(text)
                if not text.endswith("\n"):
                    out.write("\n")
                out.write("\n")

            manifest["files"].append(entry)

        manifest["stats"]["total_files"] = len(files)

    output_manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a full text dump of a project.")
    parser.add_argument(
        "project_root",
        nargs="?",
        default=".",
        help="Path to project root. Default: current directory.",
    )
    parser.add_argument(
        "--out",
        default="project_dump.txt",
        help="Path to output text dump file.",
    )
    parser.add_argument(
        "--manifest",
        default="project_manifest.json",
        help="Path to output JSON manifest file.",
    )
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    output_txt = Path(args.out).resolve()
    output_manifest = Path(args.manifest).resolve()

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Project root does not exist or is not a directory: {root}")

    dump_project(root, output_txt, output_manifest)

    print(f"Done.")
    print(f"Text dump: {output_txt}")
    print(f"Manifest:  {output_manifest}")


if __name__ == "__main__":
    main()