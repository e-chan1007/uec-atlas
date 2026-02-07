#!/usr/bin/env python3
"""Normalize GeoJSON rings in data/spatial.

- Exterior rings: CCW
- Interior rings: CW
- Remove consecutive duplicate coordinates
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable


def ring_area(coords: list[list[float]]) -> float:
    if len(coords) < 3:
        return 0.0
    pts = coords
    if len(coords) > 3 and coords[0] == coords[-1]:
        pts = coords[:-1]
    area = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i][0], pts[i][1]
        x2, y2 = pts[(i + 1) % len(pts)][0], pts[(i + 1) % len(pts)][1]
        area += (x1 * y2 - x2 * y1)
    return area / 2.0


def ring_orientation(coords: list[list[float]]) -> str | None:
    area = ring_area(coords)
    if area > 0:
        return "CCW"
    if area < 0:
        return "CW"
    return None


def dedupe_consecutive(coords: list[list[float]]) -> tuple[list[list[float]], bool]:
    if not coords:
        return coords, False
    new_coords = [coords[0]]
    for pt in coords[1:]:
        if pt != new_coords[-1]:
            new_coords.append(pt)
    return new_coords, new_coords != coords


def normalize_ring(
    ring: list[list[float]],
    want: str | None,
    dedupe: bool,
) -> tuple[list[list[float]], bool]:
    if not ring:
        return ring, False

    was_closed = len(ring) > 1 and ring[0] == ring[-1]
    changed = False

    new_ring = ring
    if dedupe:
        new_ring, ch = dedupe_consecutive(new_ring)
        changed |= ch

    if was_closed and new_ring and new_ring[-1] != new_ring[0]:
        new_ring = new_ring + [new_ring[0]]
        changed = True

    if want:
        orientation = ring_orientation(new_ring)
        if orientation and orientation != want:
            new_ring = list(reversed(new_ring))
            changed = True

    return new_ring, changed


def normalize_geometry(
    geom: dict[str, Any] | None,
    fix_orientation: bool,
    dedupe: bool,
) -> bool:
    if geom is None:
        return False

    gtype = geom.get("type")
    coords = geom.get("coordinates")
    changed = False

    if gtype == "Polygon":
        if coords:
            for i, ring in enumerate(coords):
                want = "CCW" if i == 0 and fix_orientation else "CW" if fix_orientation else None
                new_ring, ch = normalize_ring(ring, want, dedupe)
                coords[i] = new_ring
                changed |= ch
    elif gtype == "MultiPolygon":
        if coords:
            for poly in coords:
                for i, ring in enumerate(poly):
                    want = "CCW" if i == 0 and fix_orientation else "CW" if fix_orientation else None
                    new_ring, ch = normalize_ring(ring, want, dedupe)
                    poly[i] = new_ring
                    changed |= ch
    elif gtype == "GeometryCollection":
        for g in geom.get("geometries", []):
            changed |= normalize_geometry(g, fix_orientation, dedupe)

    return changed


def iter_geojson_files(root: Path) -> Iterable[Path]:
    yield from root.rglob("*.geojson")


def normalize_file(
    path: Path,
    fix_orientation: bool,
    dedupe: bool,
) -> tuple[bool, dict[str, Any] | None]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return False, None

    changed = False
    if data.get("type") == "FeatureCollection":
        for feat in data.get("features", []):
            changed |= normalize_geometry(
                feat.get("geometry"), fix_orientation, dedupe)
    elif data.get("type") == "Feature":
        changed |= normalize_geometry(
            data.get("geometry"), fix_orientation, dedupe)
    else:
        changed |= normalize_geometry(data, fix_orientation, dedupe)

    return changed, data if changed else None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize GeoJSON ring orientation and duplicates.")
    parser.add_argument(
        "--root",
        default="data/spatial",
        help="Root folder to scan (default: data/spatial)",
    )
    parser.add_argument(
        "--no-orientation",
        action="store_true",
        help="Do not normalize ring orientation",
    )
    parser.add_argument(
        "--no-dedupe",
        action="store_true",
        help="Do not remove consecutive duplicate points",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report changes without writing files",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=10,
        help="Show up to N changed files in output (default: 10)",
    )
    args = parser.parse_args()

    root = Path(args.root)
    fix_orientation = not args.no_orientation
    dedupe = not args.no_dedupe

    changed_files: list[Path] = []
    for path in iter_geojson_files(root):
        changed, updated = normalize_file(path, fix_orientation, dedupe)
        if not changed:
            continue
        if not args.dry_run and updated is not None:
            path.write_text(json.dumps(updated, ensure_ascii=False,
                            indent=2) + "\n", encoding="utf-8")
        changed_files.append(path)

    print(f"changed_files: {len(changed_files)}")
    if args.sample:
        for path in changed_files[: args.sample]:
            print(f"- {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
