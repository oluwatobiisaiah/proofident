from __future__ import annotations

import csv
import hashlib
import io
import logging
import math
import re
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from bullmq import Worker

from ..config.settings import settings
from .producers import BettingExtractionResultsProducer
from .queue_config import QUEUE_NAMES, REDIS_CONFIG

logger = logging.getLogger("proofident.worker.betting_extraction")

PROVIDER_KEYWORDS: dict[str, list[str]] = {
    "bet9ja": ["bet placed", "winnings", "transaction history", "bet id"],
    "sportybet": ["my bets", "single", "multiple", "stake", "payout"],
    "1xbet": ["1xbet", "stake", "payout", "bet id", "k "],
}


def _parse_amount(value: str | None) -> int | None:
    if not value:
        return None
    numeric = re.sub(r"[^\d.-]", "", value)
    if not numeric:
        return None
    try:
        return round(float(numeric))
    except ValueError:
        return None


def _parse_odds(value: str | None) -> float | None:
    if not value:
        return None
    numeric = re.sub(r"[^\d.]", "", value)
    if not numeric:
        return None
    try:
        parsed = float(numeric)
    except ValueError:
        return None
    return parsed if parsed > 0 else None


def _normalize_outcome(value: str | None) -> str | None:
    normalized = (value or "").strip().lower()
    if normalized in {"won", "win", "w", "cashout", "cash out"}:
        return "win"
    if normalized in {"lost", "loss", "lose", "l"}:
        return "loss"
    if normalized in {"pending", "void", "cancelled", "canceled"}:
        return "pending"
    return "pending" if normalized else None


def _parse_date(value: str | None, provider_code: str) -> str | None:
    if not value:
        return None

    trimmed = value.strip()
    formats = [
        "%d.%m.%Y %H:%M",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
    ]
    if provider_code == "sportybet":
        formats = ["%d %b %Y %H:%M", "%d %B %Y %H:%M", *formats]

    normalized = re.sub(r"(\d{1,2}\s+[A-Za-z]{3,9}),\s+(\d{2}:\d{2})", r"\1 2026 \2", trimmed)

    for candidate in (trimmed, normalized):
        for fmt in formats:
            try:
                parsed = datetime.strptime(candidate, fmt)
                return parsed.replace(tzinfo=timezone.utc).isoformat()
            except ValueError:
                continue

        try:
            parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc).isoformat()
        except ValueError:
            continue

    return None


def _validate_row(row: dict[str, Any]) -> list[str]:
    issues: list[str] = list(row.get("validation_issues", []))
    if not row.get("transaction_date"):
        issues.append("Missing transaction date")
    if not row.get("bet_amount") or row["bet_amount"] <= 0:
        issues.append("Missing or invalid bet amount")
    if not row.get("odds") or row["odds"] < 1:
        issues.append("Missing or invalid odds")
    if not row.get("outcome"):
        issues.append("Missing outcome")
    if row.get("bet_amount") and row["bet_amount"] > 10_000_000:
        issues.append("Bet amount is implausibly high")
    if row.get("odds") and row["odds"] > 1000:
        issues.append("Odds are implausibly high")
    if row.get("outcome") == "win" and row.get("payout_amount") is not None and row.get("bet_amount") is not None:
        if row["payout_amount"] < row["bet_amount"]:
            issues.append("Winning payout is lower than stake")
    return list(dict.fromkeys(issues))


def _average_hash(image: Image.Image, size: int = 8) -> str:
    grayscale = image.convert("L").resize((size, size))
    pixels = list(grayscale.getdata())
    avg = sum(pixels) / max(len(pixels), 1)
    bits = "".join("1" if pixel >= avg else "0" for pixel in pixels)
    return hex(int(bits, 2))[2:]


def _image_entropy(image: Image.Image) -> float:
    histogram = image.convert("L").histogram()
    total = sum(histogram) or 1
    entropy = 0.0
    for count in histogram:
        if count:
            probability = count / total
            entropy -= probability * math.log2(probability)
    return entropy


def _detect_source_type(image: Image.Image) -> tuple[str, list[str]]:
    width, height = image.size
    reasons: list[str] = []
    exif = image.getexif()
    has_camera_metadata = any(tag in exif for tag in (271, 272, 306, 36867))
    has_alpha = "A" in image.getbands()
    aspect_ratio = height / max(width, 1)

    if has_camera_metadata:
        reasons.append("camera_metadata_present")
        return "photo_of_screen", reasons
    if has_alpha:
        reasons.append("alpha_channel_present")
        return "edited_or_composited", reasons
    if width >= height:
        reasons.append("landscape_layout")
        return "desktop_screenshot", reasons
    if 1.7 <= aspect_ratio <= 2.4:
        reasons.append("portrait_mobile_aspect_ratio")
        return "mobile_screenshot", reasons
    reasons.append("unclassified_dimensions")
    return "unknown", reasons


def _build_variants(image: Image.Image) -> list[tuple[str, Image.Image]]:
    variants: list[tuple[str, Image.Image]] = []
    for rotation in (0, 90, 270):
        rotated = image if rotation == 0 else image.rotate(rotation, expand=True)
        grayscale = rotated.convert("L")
        autocontrast = ImageOps.autocontrast(grayscale)
        sharpened = ImageEnhance.Contrast(autocontrast).enhance(2.0).filter(ImageFilter.SHARPEN)
        width, height = sharpened.size
        resized = sharpened.resize((max(width * 2, width), max(height * 2, height)))
        variants.append((f"rot{rotation}_gray", resized))
        variants.append((f"rot{rotation}_binary", resized.point(lambda p: 255 if p > 128 else 0)))
        variants.append((f"rot{rotation}_median", resized.filter(ImageFilter.MedianFilter(size=3))))
    return variants


def _tesseract_lines_from_image(image: Image.Image) -> list[dict[str, Any]]:
    data = pytesseract.image_to_data(
        image,
        config="--oem 3 --psm 6",
        output_type=pytesseract.Output.DICT,
        lang="eng",
    )
    lines: list[dict[str, Any]] = []
    for idx, text in enumerate(data["text"]):
        content = (text or "").strip()
        raw_conf = str(data["conf"][idx]).strip()
        confidence = float(raw_conf) if raw_conf not in {"-1", ""} else -1
        if not content or confidence < 0:
            continue
        lines.append(
            {
                "text": content,
                "confidence": confidence / 100.0,
                "x": int(data["left"][idx]),
                "y": int(data["top"][idx]),
            }
        )
    return lines


async def _http_ocr(image_bytes: bytes, filename: str) -> list[dict[str, Any]]:
    if not settings.ocr_http_url:
        raise ValueError("OCR HTTP provider is not configured.")
    headers = {}
    if settings.ocr_http_token:
        headers["Authorization"] = f"Bearer {settings.ocr_http_token}"

    files = {"file": (filename, image_bytes)}
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(settings.ocr_http_url, headers=headers, files=files)
        response.raise_for_status()
        payload = response.json()

    if isinstance(payload, dict) and isinstance(payload.get("lines"), list):
        return [
            {
                "text": str(item.get("text", "")).strip(),
                "confidence": float(item.get("confidence", 0.5)),
                "x": int(item.get("x", 0)),
                "y": int(item.get("y", 0)),
            }
            for item in payload["lines"]
            if str(item.get("text", "")).strip()
        ]

    if isinstance(payload, dict) and isinstance(payload.get("text"), str):
        return [{"text": payload["text"], "confidence": 0.5, "x": 0, "y": 0}]

    raise ValueError("Unsupported OCR HTTP response format.")


def _keyword_hits(text: str, provider_code: str) -> int:
    haystack = text.lower()
    return sum(1 for keyword in PROVIDER_KEYWORDS.get(provider_code, []) if keyword in haystack)


def _select_best_ocr_variant(image: Image.Image, provider_code: str) -> tuple[str, list[dict[str, Any]], float]:
    best_name = "unprocessed"
    best_lines: list[dict[str, Any]] = []
    best_score = -1.0

    for variant_name, variant in _build_variants(image):
        lines = _tesseract_lines_from_image(variant)
        if not lines:
            continue
        text = " ".join(item["text"] for item in lines)
        avg_conf = sum(item["confidence"] for item in lines) / len(lines)
        score = avg_conf + (_keyword_hits(text, provider_code) * 0.05)
        if score > best_score:
            best_score = score
            best_name = variant_name
            best_lines = lines

    return best_name, best_lines, max(best_score, 0.0)


async def _extract_lines_from_image(image_bytes: bytes, filename: str, provider_code: str) -> tuple[str, list[dict[str, Any]], float]:
    image = Image.open(io.BytesIO(image_bytes))

    if settings.ocr_provider_primary == "http":
        try:
            lines = await _http_ocr(image_bytes, filename)
            avg_conf = sum(item["confidence"] for item in lines) / len(lines) if lines else 0.0
            return "http", lines, avg_conf
        except Exception:
            if settings.ocr_provider_fallback != "tesseract":
                raise

    variant_name, lines, score = _select_best_ocr_variant(image, provider_code)
    if lines:
        return f"tesseract:{variant_name}", lines, score

    if settings.ocr_provider_fallback == "http":
        lines = await _http_ocr(image_bytes, filename)
        avg_conf = sum(item["confidence"] for item in lines) / len(lines) if lines else 0.0
        return "http", lines, avg_conf

    return f"tesseract:{variant_name}", [], 0.0


def _group_lines(lines: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    rows: dict[int, list[dict[str, Any]]] = {}
    for item in lines:
        key = round(item["y"] / 14) * 14
        rows.setdefault(key, []).append(item)
    return [sorted(row, key=lambda item: item["x"]) for _, row in sorted(rows.items(), key=lambda pair: pair[0])]


def _segment_cards(lines: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    sorted_lines = sorted(lines, key=lambda item: (item["y"], item["x"]))
    cards: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    previous_y: int | None = None
    for item in sorted_lines:
        if previous_y is not None and item["y"] - previous_y > 60 and current:
            cards.append(current)
            current = []
        current.append(item)
        previous_y = item["y"]
    if current:
        cards.append(current)
    return cards


def _parse_1xbet_csv(content: str, upload_file_id: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(content))
    rows: list[dict[str, Any]] = []
    for source in reader:
        row = {
            "upload_file_id": upload_file_id,
            "external_bet_id": source.get("Bet ID") or source.get("bet_id") or source.get("id"),
            "provider_reference": source.get("Reference") or source.get("reference"),
            "transaction_date": _parse_date(source.get("Date") or source.get("Date/Time") or source.get("date"), "1xbet"),
            "settled_at": _parse_date(source.get("Settled At") or source.get("settled_at"), "1xbet"),
            "bet_amount": _parse_amount(source.get("Stake") or source.get("stake") or source.get("Amount")),
            "odds": _parse_odds(source.get("Odds") or source.get("odds") or source.get("Coefficient")),
            "outcome": _normalize_outcome(source.get("Status") or source.get("status") or source.get("Result")),
            "payout_amount": _parse_amount(source.get("Payout") or source.get("payout") or source.get("Return")),
            "bet_type": source.get("Bet Type") or source.get("bet_type") or source.get("Type"),
            "league": source.get("League") or source.get("league"),
            "event_name": source.get("Event") or source.get("event") or source.get("Selection"),
            "extraction_confidence": 0.98,
            "parser_code": "1xbet_csv_v1",
            "validation_issues": [],
            "raw_extraction_payload": source,
            "normalized_payload": {},
        }
        row["validation_issues"] = _validate_row(row)
        row["normalized_payload"] = {
            "transaction_date": row["transaction_date"],
            "bet_amount": row["bet_amount"],
            "odds": row["odds"],
            "outcome": row["outcome"],
            "payout_amount": row["payout_amount"],
            "event_name": row["event_name"],
        }
        rows.append(row)
    return rows


def _parse_bet9ja(lines: list[dict[str, Any]], upload_file_id: str) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in _group_lines(lines):
        text = " ".join(item["text"] for item in row).strip()
        match = re.search(
            r"(\d{2}[/-]\d{2}[/-]\d{4}\s+\d{2}:\d{2}(?::\d{2})?).*?(Bet Placed|Winnings|Withdrawal|Deposit).*?(BET[0-9A-Z]+).*?([NP#]?\s?[\d,]+(?:\.\d{2})?).*?(Won|Lost|Pending|Cancelled)?$",
            text,
            re.IGNORECASE,
        )
        if not match:
            continue
        date_value, row_type, bet_id, amount_value, status_value = match.groups()
        existing = grouped.get(bet_id) or {
            "upload_file_id": upload_file_id,
            "external_bet_id": bet_id,
            "provider_reference": bet_id,
            "transaction_date": _parse_date(date_value, "bet9ja"),
            "bet_type": "single",
            "odds": None,
            "payout_amount": None,
            "bet_amount": None,
            "outcome": _normalize_outcome(status_value),
            "league": None,
            "event_name": None,
            "extraction_confidence": sum(item["confidence"] for item in row) / max(len(row), 1),
            "parser_code": "bet9ja_screenshot_v1",
            "validation_issues": [],
            "raw_extraction_payload": {"text": text},
            "normalized_payload": {},
        }
        if re.search(r"bet placed", row_type, re.IGNORECASE):
            existing["bet_amount"] = _parse_amount(amount_value)
        if re.search(r"winnings", row_type, re.IGNORECASE):
            existing["payout_amount"] = _parse_amount(amount_value)
            existing["outcome"] = "win"
        existing["validation_issues"] = _validate_row(existing)
        existing["normalized_payload"] = {
            "transaction_date": existing["transaction_date"],
            "bet_amount": existing["bet_amount"],
            "payout_amount": existing["payout_amount"],
            "outcome": existing["outcome"],
        }
        grouped[bet_id] = existing
    return list(grouped.values())


def _parse_card_based(lines: list[dict[str, Any]], upload_file_id: str, provider_code: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for card in _segment_cards(lines):
        text = " ".join(item["text"] for item in card).strip()
        date_match = re.search(r"(\d{2}[./]\d{2}[./]\d{4}\s+\d{2}:\d{2})", text) or re.search(r"(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{2}:\d{2})", text)
        row = {
            "upload_file_id": upload_file_id,
            "external_bet_id": None,
            "provider_reference": f"{upload_file_id}:{hashlib.sha1(text.encode('utf-8')).hexdigest()[:16]}",
            "transaction_date": _parse_date(date_match.group(1) if date_match else None, provider_code),
            "settled_at": None,
            "bet_amount": _parse_amount((re.search(r"Stake[:\s]*[NP#]?\s*([\d,]+(?:\.\d{2})?)", text, re.IGNORECASE) or [None, None])[1]),
            "odds": _parse_odds((re.search(r"@\s*([\d.]+)", text) or re.search(r"\bK\s*([\d.]+)", text, re.IGNORECASE) or [None, None])[1]),
            "outcome": _normalize_outcome((re.search(r"\b(Won|Lost|Pending|Cashout)\b", text, re.IGNORECASE) or [None, None])[1]),
            "payout_amount": _parse_amount((re.search(r"Payout[:\s]*[NP#]?\s*([\d,]+(?:\.\d{2})?)", text, re.IGNORECASE) or [None, None])[1]),
            "bet_type": "multiple" if re.search(r"multiple|express", text, re.IGNORECASE) else "single",
            "league": None,
            "event_name": (re.search(r"([A-Za-z0-9 .'-]+\s+vs\s+[A-Za-z0-9 .'-]+)", text, re.IGNORECASE) or re.search(r"([A-Za-z0-9 .'-]+\s+-\s+[A-Za-z0-9 .'-]+)", text, re.IGNORECASE) or [None, None])[1],
            "extraction_confidence": sum(item["confidence"] for item in card) / max(len(card), 1),
            "parser_code": f"{provider_code}_screenshot_v1",
            "validation_issues": [],
            "raw_extraction_payload": {"text": text},
            "normalized_payload": {},
        }
        row["validation_issues"] = _validate_row(row)
        row["normalized_payload"] = {
            "transaction_date": row["transaction_date"],
            "bet_amount": row["bet_amount"],
            "odds": row["odds"],
            "outcome": row["outcome"],
            "payout_amount": row["payout_amount"],
            "event_name": row["event_name"],
        }
        rows.append(row)
    return rows


def _assess_authenticity(
    provider_code: str,
    file_analyses: list[dict[str, Any]],
    all_text: str,
    duplicate_hashes: int,
    average_confidence: float,
) -> dict[str, Any]:
    reasons: list[str] = []
    score = 0.0
    source_types = Counter(analysis["source_type"] for analysis in file_analyses)
    photo_count = source_types.get("photo_of_screen", 0)
    edited_count = source_types.get("edited_or_composited", 0)
    keyword_hits = _keyword_hits(all_text, provider_code)

    if photo_count > 0:
        score += 0.25
        reasons.append("one_or_more_images_look_like_photos_of_a_screen")
    if edited_count > 0:
        score += 0.45
        reasons.append("one_or_more_images_have_editing_or_compositing_signals")
    if duplicate_hashes > 0:
        score += 0.20
        reasons.append("duplicate_or_near_duplicate_images_detected")
    if average_confidence < 0.35:
        score += 0.15
        reasons.append("very_low_ocr_confidence")
    if keyword_hits == 0:
        score += 0.20
        reasons.append("expected_provider_keywords_not_detected")
    if any(analysis["entropy"] > 7.6 for analysis in file_analyses):
        score += 0.10
        reasons.append("high_entropy_visual_pattern_detected")

    suspected_tampering = edited_count > 0 or duplicate_hashes > 0
    suspected_non_screenshot = photo_count > 0
    suspected_ai_generated = edited_count > 0 and average_confidence < 0.30 and keyword_hits == 0

    if score >= 0.85 and (suspected_tampering or suspected_ai_generated):
        decision = "fail"
    elif score >= 0.45:
        decision = "review"
    else:
        decision = "pass"

    return {
        "decision": decision,
        "score": round(min(score, 1.0), 4),
        "reasons": reasons,
        "suspected_ai_generated": suspected_ai_generated,
        "suspected_tampering": suspected_tampering,
        "suspected_non_screenshot": suspected_non_screenshot,
    }


async def _extract_rows(provider_code: str, upload_kind: str, files: list[dict[str, Any]]) -> tuple[str | None, list[dict[str, Any]], dict[str, int], list[dict[str, Any]], dict[str, Any]]:
    if upload_kind == "csv":
        content = (await _download_file(files[0]["public_url"])).decode("utf-8", errors="ignore")
        rows = _parse_1xbet_csv(content, files[0]["upload_file_id"])
        authenticity = {
            "decision": "pass",
            "score": 0.0,
            "reasons": [],
            "suspected_ai_generated": False,
            "suspected_tampering": False,
            "suspected_non_screenshot": False,
        }
        return None, rows, {"csv": 1}, [], authenticity

    ocr_provider: str | None = None
    all_rows: list[dict[str, Any]] = []
    all_text_parts: list[str] = []
    file_analyses: list[dict[str, Any]] = []
    source_counter: Counter[str] = Counter()
    hashes: Counter[str] = Counter()

    for file in files:
        image_bytes = await _download_file(file["public_url"])
        image = Image.open(io.BytesIO(image_bytes))
        source_type, source_reasons = _detect_source_type(image)
        source_counter[source_type] += 1
        image_hash = _average_hash(image)
        hashes[image_hash] += 1
        entropy = _image_entropy(image)

        chosen_provider, lines, confidence_score = await _extract_lines_from_image(
            image_bytes=image_bytes,
            filename=file["original_filename"],
            provider_code=provider_code,
        )
        ocr_provider = ocr_provider or chosen_provider
        text = " ".join(item["text"] for item in lines)
        all_text_parts.append(text)

        file_analyses.append(
            {
                "upload_file_id": file["upload_file_id"],
                "source_type": source_type,
                "source_reasons": source_reasons,
                "average_ocr_confidence": round(confidence_score, 4),
                "line_count": len(lines),
                "entropy": round(entropy, 4),
                "keyword_hits": _keyword_hits(text, provider_code),
                "perceptual_hash": image_hash,
            }
        )

        if provider_code == "bet9ja":
            all_rows.extend(_parse_bet9ja(lines, file["upload_file_id"]))
        else:
            all_rows.extend(_parse_card_based(lines, file["upload_file_id"], provider_code))

    average_confidence = (
        sum(float(row["extraction_confidence"]) for row in all_rows) / len(all_rows)
        if all_rows else 0.0
    )
    duplicate_hashes = sum(1 for count in hashes.values() if count > 1)
    authenticity = _assess_authenticity(
        provider_code=provider_code,
        file_analyses=file_analyses,
        all_text=" ".join(all_text_parts),
        duplicate_hashes=duplicate_hashes,
        average_confidence=average_confidence,
    )
    return ocr_provider, all_rows, dict(source_counter), file_analyses, authenticity


class BettingExtractionWorker:
    def __init__(self) -> None:
        self.results_producer = BettingExtractionResultsProducer()
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_binary_path
        self.worker = Worker(
            QUEUE_NAMES["betting_extraction"],
            self.process_job,
            {"connection": REDIS_CONFIG},
        )

    async def process_job(self, job) -> dict[str, str]:
        data = job.data
        try:
            ocr_provider, rows, source_breakdown, file_analyses, authenticity = await _extract_rows(
                provider_code=str(data["provider_code"]),
                upload_kind=str(data["upload_kind"]),
                files=list(data["files"]),
            )
            review_required_count = sum(1 for row in rows if row["validation_issues"])
            average_confidence = (
                sum(float(row["extraction_confidence"]) for row in rows) / len(rows)
                if rows else 0.0
            )
            payload = {
                "job_id": str(data["job_id"]),
                "extraction_job_id": str(data["extraction_job_id"]),
                "ingestion_session_id": str(data["ingestion_session_id"]),
                "data_source_id": str(data["data_source_id"]),
                "user_id": str(data["user_id"]),
                "provider_code": str(data["provider_code"]),
                "upload_kind": str(data["upload_kind"]),
                "status": "success",
                "parser_code": rows[0]["parser_code"] if rows else f"{data['provider_code']}_{data['upload_kind']}_v1",
                "ocr_provider": ocr_provider,
                "summary": {
                    "upload_count": len(data["files"]),
                    "extracted_record_count": len(rows),
                    "review_required_count": review_required_count,
                    "rejected_record_count": 0,
                    "average_confidence": round(average_confidence, 4),
                    "source_breakdown": source_breakdown,
                    "file_analyses": file_analyses,
                    "authenticity": authenticity,
                },
                "rows": rows,
                "error": None,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
            await self.results_producer.publish(payload)
            return {"status": "success", "extraction_job_id": str(data["extraction_job_id"])}
        except Exception as exc:
            logger.exception("betting_extraction_worker_failed", extra={"job_id": data.get("job_id")})
            await self.results_producer.publish(
                {
                    "job_id": str(data["job_id"]),
                    "extraction_job_id": str(data["extraction_job_id"]),
                    "ingestion_session_id": str(data["ingestion_session_id"]),
                    "data_source_id": str(data["data_source_id"]),
                    "user_id": str(data["user_id"]),
                    "provider_code": str(data["provider_code"]),
                    "upload_kind": str(data["upload_kind"]),
                    "status": "failed",
                    "parser_code": f"{data['provider_code']}_{data['upload_kind']}_v1",
                    "ocr_provider": None,
                    "summary": {
                        "upload_count": len(data["files"]),
                        "extracted_record_count": 0,
                        "review_required_count": 0,
                        "rejected_record_count": 0,
                        "average_confidence": 0.0,
                        "source_breakdown": {},
                        "file_analyses": [],
                        "authenticity": {
                            "decision": "review",
                            "score": 0.5,
                            "reasons": ["worker_exception_during_extraction"],
                            "suspected_ai_generated": False,
                            "suspected_tampering": False,
                            "suspected_non_screenshot": False,
                        },
                    },
                    "rows": [],
                    "error": str(exc),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            raise
