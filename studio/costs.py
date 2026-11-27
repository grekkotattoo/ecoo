"""Gestor de costes y recursos.

Regla: ninguna operación de pago se ejecuta sin pasar por `guard()`:
  1) estima coste (con margen de seguridad), 2) comprueba autorización explícita,
  3) comprueba presupuestos (episodio, mes, categoría), 4) evita duplicados (clave idempotente),
  5) registra el gasto real en un ledger append-only.
Nunca inventa saldos: solo conoce lo que registra. Los tokens de Claude Code/Codex se ESTIMAN (chars/4).
"""
from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass

from .core import StudioError, append_jsonl, load_config, log, now_iso, paths, read_jsonl

CATEGORIES = ("assistant_tokens", "llm_external", "images", "voice", "render", "storage")


class BudgetExceeded(StudioError):
    pass


class PaidNotAuthorized(StudioError):
    pass


@dataclass
class Estimate:
    category: str
    usd: float
    detail: dict


def ledger_path():
    return paths().state / "cost_ledger.jsonl"


def entries() -> list[dict]:
    return read_jsonl(ledger_path())


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def price_llm(model: str, tokens_in: int, tokens_out: int, cache_read: int = 0) -> float:
    pr = load_config()["costs"]["prices"]["anthropic"].get(model)
    if not pr:
        raise StudioError(f"Sin precio configurado para el modelo {model}; añádelo en config/studio.json")
    return (tokens_in * pr["in"] + tokens_out * pr["out"] + cache_read * pr.get("cache_read", 0)) / 1e6


def spent(category: str | None = None, episode: str | None = None, month: str | None = None, kind: str = "actual") -> float:
    tot = 0.0
    for e in entries():
        if e.get("kind") != kind:
            continue
        if category and e.get("category") != category:
            continue
        if episode and e.get("episode") != episode:
            continue
        if month and not str(e.get("ts", "")).startswith(month):
            continue
        tot += float(e.get("usd", 0))
    return round(tot, 6)


def _already(idem_key: str) -> dict | None:
    for e in entries():
        if e.get("idem") == idem_key and e.get("kind") == "actual":
            return e
    return None


def guard(est: Estimate, episode: str | None, idem_key: str) -> dict | None:
    """Lanza excepción si no se puede gastar. Devuelve el registro previo si ya se pagó (dedupe)."""
    cfg = load_config()["costs"]
    prev = _already(idem_key)
    if prev:
        log("cost.dedupe", idem=idem_key)
        return prev
    usd = est.usd * float(cfg.get("safety_margin", 1.0))
    if usd <= 0:
        return None
    if not cfg.get("authorize_paid"):
        raise PaidNotAuthorized(
            f"Operación de pago bloqueada ({est.category}, ~${usd:.4f}). Autoriza con "
            "`studio config set costs.authorize_paid true` o desde el panel. Nada se ha cobrado.")
    b = cfg["budgets"]
    month = _dt.date.today().strftime("%Y-%m")
    if spent(month=month) + usd > b["monthly"]:
        raise BudgetExceeded(f"Presupuesto mensual excedido (${spent(month=month):.2f} + ${usd:.2f} > ${b['monthly']})")
    if episode and spent(episode=episode) + usd > b["per_episode"]:
        raise BudgetExceeded(f"Presupuesto por episodio excedido para {episode}")
    cat_cap = b["categories"].get(est.category)
    if cat_cap is not None and spent(category=est.category, month=month) + usd > cat_cap:
        raise BudgetExceeded(f"Presupuesto de categoría '{est.category}' excedido (tope ${cat_cap}/mes)")
    record(est.category, usd, episode, idem_key, kind="reserved", detail=est.detail)
    return None


def record(category: str, usd: float, episode: str | None, idem_key: str | None, kind: str = "actual", detail: dict | None = None) -> None:
    if category not in CATEGORIES:
        raise StudioError(f"Categoría de coste desconocida: {category}")
    append_jsonl(ledger_path(), {"ts": now_iso(), "kind": kind, "category": category, "usd": round(usd, 6),
                                 "episode": episode, "idem": idem_key, "detail": detail or {}})


def record_assistant_tokens(task_kind: str, prompt: str, response: str, episode: str | None) -> None:
    """Tokens consumidos por el asistente (Claude Code/Codex). Estimados, coste $0 marginal (suscripción)."""
    tin, tout = estimate_tokens(prompt), estimate_tokens(response)
    record("assistant_tokens", 0.0, episode, None, detail={"task": task_kind, "tokens_in_est": tin, "tokens_out_est": tout, "estimated": True})


def summary() -> dict:
    cfg = load_config()["costs"]
    month = _dt.date.today().strftime("%Y-%m")
    by_cat = {c: spent(category=c, month=month) for c in CATEGORIES}
    tok = {"in": 0, "out": 0}
    for e in entries():
        d = e.get("detail") or {}
        if e.get("category") == "assistant_tokens":
            tok["in"] += d.get("tokens_in_est", 0)
            tok["out"] += d.get("tokens_out_est", 0)
    ext = {"in": 0, "out": 0, "cache_read": 0}
    for e in entries():
        d = e.get("detail") or {}
        if e.get("category") == "llm_external" and e.get("kind") == "actual":
            ext["in"] += d.get("tokens_in", 0)
            ext["out"] += d.get("tokens_out", 0)
            ext["cache_read"] += d.get("cache_read", 0)
    return {"month": month, "spent_month_usd": spent(month=month), "by_category_usd": by_cat,
            "budgets": cfg["budgets"], "authorize_paid": cfg.get("authorize_paid", False),
            "assistant_tokens_estimated": tok, "external_llm_tokens": ext}
