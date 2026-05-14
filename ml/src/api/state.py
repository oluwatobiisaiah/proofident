"""Shared mutable application state — avoids circular imports between main and routes."""
from __future__ import annotations

models_ready: bool = False
