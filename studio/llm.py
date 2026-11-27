"""Cerebro creativo enchufable.

Proveedores:
  - claude_code : el estudio escribe una TAREA compacta en data/tasks/pending/ y espera a que
                  Claude Code (o Codex) la resuelva con `studio task submit`. Coste API extra = 0.
  - anthropic   : llamada directa con el SDK oficial (ANTHROPIC_API_KEY). Pasa por el guard de costes.
  - mock        : salidas deterministas de prueba técnica (solo tests; contenido geométrico TEST).

Todas las respuestas válidas se cachean por hash(proveedor, modelo, system, prompt): nunca se paga
dos veces la misma pregunta, y una reanudación reutiliza resultados.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable

from . import costs
from .core import StudioError, hash_obj, load_config, log, now_iso, paths, read_json, write_json


class TaskPending(StudioError):
    """La tarea creativa espera respuesta del asistente (modo claude_code)."""

    def __init__(self, task_id: str):
        super().__init__(f"Tarea creativa pendiente: {task_id}. Resuélvela con `studio task show {task_id}`.")
        self.task_id = task_id


def extract_json(text: str) -> Any:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", text, re.S)
    if m:
        text = m.group(1)
    else:
        s = min([i for i in (text.find("{"), text.find("[")) if i >= 0], default=-1)
        if s < 0:
            raise StudioError("La respuesta no contiene JSON")
        text = text[s:]
        end = max(text.rfind("}"), text.rfind("]"))
        text = text[: end + 1]
    return json.loads(text)


def _cache_path(key: str):
    return paths().cache / "llm" / f"{key}.json"


def provider_name() -> str:
    return load_config()["llm"]["provider"]


def complete(kind: str, system: str, prompt: str, validate: Callable[[Any], Any], episode: str | None = None,
             provider: str | None = None) -> Any:
    """Ejecuta una tarea creativa y devuelve JSON validado (o lanza TaskPending)."""
    cfg = load_config()["llm"]
    provider = provider or cfg["provider"]
    model = cfg["anthropic"]["model"] if provider == "anthropic" else provider
    key = hash_obj({"p": provider, "m": model, "s": system, "u": prompt, "k": kind})
    cached = read_json(_cache_path(key))
    if cached is not None:
        log("llm.cache_hit", kind=kind, episode=episode)
        return validate(cached["result"])

    if provider == "mock":
        from .mock_brain import answer
        result = validate(answer(kind, prompt))
    elif provider == "claude_code":
        result = _claude_code(kind, system, prompt, validate, episode, key)
    elif provider == "anthropic":
        result = _anthropic(kind, system, prompt, validate, episode, key, cfg)
    else:
        raise StudioError(f"Proveedor LLM desconocido: {provider}")
    write_json(_cache_path(key), {"ts": now_iso(), "kind": kind, "result": result})
    return result


# ------------------------------------------------------------- claude_code

def _claude_code(kind, system, prompt, validate, episode, key):
    P = paths()
    task_id = f"{(episode or 'GLOBAL')}-{kind}-{key[:8]}"
    done = P.tasks / "done" / f"{task_id}.result.json"
    if done.exists():
        raw = read_json(done)
        try:
            result = validate(raw)
        except Exception as e:  # respuesta inválida: se reabre la tarea con el error
            done.rename(done.with_suffix(".invalid.json"))
            pend = read_json(P.tasks / "pending" / f"{task_id}.json", {})
            pend["last_error"] = str(e)
            write_json(P.tasks / "pending" / f"{task_id}.json", pend)
            raise TaskPending(task_id) from e
        costs.record_assistant_tokens(kind, system + prompt, json.dumps(raw, ensure_ascii=False), episode)
        (P.tasks / "pending" / f"{task_id}.json").unlink(missing_ok=True)
        return result
    pend = P.tasks / "pending" / f"{task_id}.json"
    if not pend.exists():
        write_json(pend, {"id": task_id, "kind": kind, "episode": episode, "created": now_iso(),
                          "system": system, "prompt": prompt,
                          "answer_with": f"studio task submit {task_id} <fichero.json>"})
        log("task.created", task=task_id)
    raise TaskPending(task_id)


def submit_task(task_id: str, data: Any) -> None:
    P = paths()
    if not (P.tasks / "pending" / f"{task_id}.json").exists():
        raise StudioError(f"No existe la tarea pendiente {task_id}")
    write_json(P.tasks / "done" / f"{task_id}.result.json", data)
    log("task.submitted", task=task_id)


def pending_tasks() -> list[dict]:
    P = paths()
    return [read_json(p) for p in sorted((P.tasks / "pending").glob("*.json"))]


# ------------------------------------------------------------- anthropic

def _anthropic(kind, system, prompt, validate, episode, key, cfg):
    from .core import secret
    a = cfg["anthropic"]
    if not secret("ANTHROPIC_API_KEY"):
        raise StudioError("Proveedor 'anthropic' sin ANTHROPIC_API_KEY. Defínela como variable de entorno o en .env (no versionado).")
    try:
        import anthropic  # SDK oficial (opcional): pip install -r requirements-anthropic.txt
    except ImportError as e:
        raise StudioError("Falta el SDK: pip install -r requirements-anthropic.txt") from e
    model = a["model"]
    tin = costs.estimate_tokens(system + prompt)
    est = costs.Estimate("llm_external", costs.price_llm(model, tin, min(a["max_tokens"], 6000)), {"model": model, "kind": kind})
    costs.guard(est, episode, idem_key=f"llm:{key}")
    client = anthropic.Anthropic(api_key=secret("ANTHROPIC_API_KEY"))
    last_err = None
    for attempt in range(cfg.get("max_retries", 2) + 1):
        user = prompt if not last_err else f"{prompt}\n\nTu respuesta anterior no era válida: {last_err}. Devuelve SOLO el JSON corregido."
        params: dict[str, Any] = dict(
            model=model, max_tokens=a["max_tokens"],
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            output_config={"effort": a.get("effort", "medium")},
            messages=[{"role": "user", "content": user}],
        )
        if a.get("fallbacks"):
            with client.beta.messages.stream(betas=["server-side-fallback-2026-07-01"], fallbacks=a["fallbacks"], **params) as stream:
                resp = stream.get_final_message()
        else:
            with client.messages.stream(**params) as stream:
                resp = stream.get_final_message()
        u = resp.usage
        usd = costs.price_llm(model, u.input_tokens, u.output_tokens, getattr(u, "cache_read_input_tokens", 0) or 0)
        costs.record("llm_external", usd, episode, f"llm:{key}:{attempt}", detail={
            "model": model, "kind": kind, "tokens_in": u.input_tokens, "tokens_out": u.output_tokens,
            "cache_read": getattr(u, "cache_read_input_tokens", 0) or 0})
        if resp.stop_reason == "refusal":
            raise StudioError(f"El modelo rechazó la tarea {kind}. Reformula la idea.")
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
        try:
            return validate(extract_json(text))
        except Exception as e:
            last_err = str(e)[:300]
    raise StudioError(f"Respuesta inválida tras reintentos en {kind}: {last_err}")
