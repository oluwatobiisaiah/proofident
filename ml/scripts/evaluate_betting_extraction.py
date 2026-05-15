from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    fixtures_root = Path("tests/fixtures/betting_extraction")
    manifest = fixtures_root / "manifest.example.json"
    if not manifest.exists():
        print("No betting extraction fixture manifest found.")
        return

    data = json.loads(manifest.read_text(encoding="utf-8"))
    print("Betting extraction evaluation harness")
    print(f"Expected fixture groups: {len(data.get('fixture_groups', []))}")
    print("Populate this manifest with real screenshots + expected outputs to benchmark OCR accuracy and review rate.")


if __name__ == "__main__":
    main()
