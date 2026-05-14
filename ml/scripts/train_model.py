"""
Train both the GBM credit scorer and the IsolationForest anomaly detector.

Usage:
    python scripts/train_model.py [--samples N]

Add this to your Dockerfile RUN step to bake models into the image and avoid
first-request training latency.
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level="INFO", format="%(asctime)s %(message)s")
logger = logging.getLogger("train")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=4_000)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    from src.config.settings import settings
    from src.models.ml_scorer import MLScorer, _generate_training_data
    from sklearn.ensemble import HistGradientBoostingRegressor, IsolationForest
    from sklearn.model_selection import train_test_split
    import joblib

    gbm_path = Path(args.output or str(settings.model_path))
    iso_path = gbm_path.with_name("anomaly_model.joblib")

    logger.info("Generating %d synthetic training profiles...", args.samples)
    t0 = time.perf_counter()
    X, y = _generate_training_data(n=args.samples)
    logger.info("  Done in %.1fs.", time.perf_counter() - t0)

    # --- GBM ---
    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.15, random_state=42)
    logger.info("Fitting GBM on %d samples (val=%d)...", len(X_tr), len(X_val))
    t1 = time.perf_counter()
    gbm = HistGradientBoostingRegressor(
        max_iter=300, max_depth=5, learning_rate=0.05,
        min_samples_leaf=20, l2_regularization=0.1, random_state=42,
    )
    gbm.fit(X_tr, y_tr)
    val_mae = float(abs(gbm.predict(X_val) - y_val).mean())
    logger.info("  GBM done in %.1fs | val MAE: %.1f score points", time.perf_counter() - t1, val_mae)

    # --- IsolationForest ---
    logger.info("Fitting IsolationForest on %d samples...", len(X))
    t2 = time.perf_counter()
    iso = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
    iso.fit(X)
    logger.info("  IsolationForest done in %.1fs.", time.perf_counter() - t2)

    gbm_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(gbm, gbm_path)
    joblib.dump(iso, iso_path)
    logger.info("Saved: %s + %s | total %.1fs", gbm_path.name, iso_path.name, time.perf_counter() - t0)


if __name__ == "__main__":
    main()
