This directory is the placeholder for real betting extraction fixtures.

Expected structure:
- one folder per provider/source combination
- original screenshots or CSV files
- one JSON file describing expected extracted rows

Recommended fixture groups:
- `bet9ja_desktop_clean`
- `bet9ja_mobile_scroll`
- `sportybet_desktop_cards`
- `sportybet_mobile_cards`
- `1xbet_csv_exports`
- `1xbet_mobile_cards`
- `fraud_photo_of_screen`
- `fraud_composited_edit`
- `duplicates_same_screen`

Use these fixtures for:
- OCR regression tests
- parser accuracy benchmarking
- authenticity false-positive review
- review-rate tracking
