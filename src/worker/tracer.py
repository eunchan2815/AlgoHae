# 알고해 범용 추적 엔진 (명세서 1.1 범용 레이어)
# sys.settrace로 사용자 코드를 한 줄씩 추적하며 변수 스냅샷을 기록한다.
# 핵심 원칙: f_locals는 참조이므로 캡처 즉시 직렬화한다 (명세서 1.3).
import sys
import json
import types
import collections
from io import StringIO

MAX_STEPS = 4000      # F-10 무한루프 방어 ①
MAX_LEN = 100         # 직렬화 규칙: 컬렉션 길이 제한 (명세서 4.3)
MAX_DEPTH = 3         # 직렬화 규칙: 중첩 깊이 제한
MAX_REPR = 120        # 직렬화 규칙: repr 축약
MAX_TREE_DEPTH = 6    # F-20 트리 직렬화 깊이 제한
MAX_TREE_NODES = 63   # F-20 트리 노드 수 제한


class _StepLimit(Exception):
    pass


def _is_tree_node(val):
    """F-20: left/right 속성을 가진 사용자 객체 = 이진 트리 노드로 간주"""
    if isinstance(val, type) or not hasattr(val, "__dict__"):
        return False
    has_children = hasattr(val, "left") and hasattr(val, "right")
    has_value = hasattr(val, "val") or hasattr(val, "value") or hasattr(val, "data")
    return has_children and has_value


def _node_value(node):
    for attr in ("val", "value", "data"):
        if hasattr(node, attr):
            v = getattr(node, attr)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return v
            return str(v)[:30]
    return "?"


def _capture_tree(node, depth, seen, count):
    """이진 트리를 {v, l, r} 중첩 구조로 직렬화 (순환·깊이·노드 수 방어)"""
    if node is None:
        return None
    if depth > MAX_TREE_DEPTH or id(node) in seen or count[0] >= MAX_TREE_NODES:
        return {"v": "…", "l": None, "r": None}
    seen.add(id(node))
    count[0] += 1
    left = getattr(node, "left", None)
    right = getattr(node, "right", None)
    return {
        "v": _node_value(node),
        "l": _capture_tree(left, depth + 1, seen, count) if _is_tree_node_or_none(left) else None,
        "r": _capture_tree(right, depth + 1, seen, count) if _is_tree_node_or_none(right) else None,
    }


def _is_tree_node_or_none(val):
    return val is not None and _is_tree_node(val)


def _capture(val, depth=0):
    """값 하나를 CapturedValue로 직렬화 (명세서 4.2)"""
    if val is None or isinstance(val, bool):
        return {"t": "scalar", "v": repr(val)}
    if isinstance(val, (int, float)):
        return {"t": "scalar", "v": val}
    if isinstance(val, str):
        s = val if len(val) <= MAX_REPR else val[:MAX_REPR] + "…"
        return {"t": "scalar", "v": s}
    if depth >= MAX_DEPTH:
        return {"t": "opaque", "v": "…"}
    if isinstance(val, (list, tuple)):
        items = [_capture(x, depth + 1) for x in val[:MAX_LEN]]
        num = len(val) > 0 and all(
            isinstance(x, (int, float)) and not isinstance(x, bool) for x in val
        )
        return {"t": "list", "v": items, "num": num, "len": len(val)}
    if isinstance(val, dict):
        entries = []
        for i, (k, v) in enumerate(val.items()):
            if i >= MAX_LEN:
                break
            key = k if isinstance(k, str) else repr(k)
            entries.append([key, _capture(v, depth + 1)])
        return {"t": "dict", "v": entries, "len": len(val)}
    if isinstance(val, (set, frozenset)):
        items = [_capture(x, depth + 1) for x in list(val)[:MAX_LEN]]
        return {"t": "list", "v": items, "num": False, "len": len(val)}
    # F-19: collections.deque → 큐 렌더러
    if isinstance(val, collections.deque):
        items = [_capture(x, depth + 1) for x in list(val)[:MAX_LEN]]
        return {"t": "deque", "v": items, "len": len(val)}
    # F-20: left/right 가진 객체 → 트리 렌더러
    if _is_tree_node(val):
        return {"t": "tree", "v": _capture_tree(val, 0, set(), [0])}
    try:
        r = repr(val)
    except Exception:
        r = "<표현 불가>"
    return {"t": "opaque", "v": r[:MAX_REPR]}


def _is_noise(val):
    """변수 테이블에 보여줄 가치가 없는 값 (모듈·함수·클래스)"""
    return isinstance(
        val,
        (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type),
    )


def _no_input(*args, **kwargs):
    raise RuntimeError("ALGOHAE_NO_INPUT")  # F-29


def _capture_stack(frame):
    """F-11: 사용자 프레임만 모아 호출 스택 요약 (바깥 → 현재 순)"""
    stack = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == "<algohae>":
            brief = []
            if f.f_code.co_name != "<module>":
                for k, v in list(f.f_locals.items()):
                    if k.startswith("__"):
                        continue
                    if v is None or isinstance(v, (bool, int, float, str)):
                        s = str(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else repr(v)
                        brief.append(k + "=" + s[:12])
                    if len(brief) >= 3:
                        break
            stack.append({
                "f": f.f_code.co_name,
                "l": f.f_lineno,
                "a": ", ".join(brief),
            })
        f = f.f_back
    stack.reverse()
    return stack


def run_traced(code):
    snapshots = []
    out = StringIO()
    old_stdout = sys.stdout
    error = None
    limit_hit = False

    def trace(frame, event, arg):
        nonlocal limit_hit
        # 사용자 코드 프레임만 추적 (라이브러리 내부 제외)
        if frame.f_code.co_filename != "<algohae>":
            return None
        if event not in ("line", "return", "exception"):
            return trace
        if len(snapshots) >= MAX_STEPS:
            limit_hit = True
            raise _StepLimit()

        # 캡처 즉시 직렬화 — 참조를 들고 있으면 모든 스냅샷이 최종 상태가 된다
        captured = {}
        for name, v in frame.f_locals.items():
            if name.startswith("__") or _is_noise(v):
                continue
            captured[name] = _capture(v)

        depth = 0
        f = frame.f_back
        while f is not None:
            if f.f_code.co_filename == "<algohae>":
                depth += 1
            f = f.f_back

        snapshots.append({
            "step": len(snapshots),
            "line": frame.f_lineno,
            "event": event,
            "func": frame.f_code.co_name,
            "depth": depth,
            "vars": captured,
            "stack": _capture_stack(frame),  # F-11 호출 스택
            "out": len(out.getvalue()),
        })
        return trace

    user_globals = {"__name__": "__main__", "input": _no_input}

    sys.stdout = out
    try:
        compiled = compile(code, "<algohae>", "exec")
        sys.settrace(trace)
        exec(compiled, user_globals)
    except _StepLimit:
        pass
    except SyntaxError as e:
        error = {"type": "syntax", "line": e.lineno, "message": f"문법 오류: {e.msg}"}
    except RuntimeError as e:
        if str(e) == "ALGOHAE_NO_INPUT":
            error = {
                "type": "input",
                "line": None,
                "message": "input()은 아직 지원하지 않아요. 변수에 직접 값을 넣어 보세요. 예) n = 10",
            }
        else:
            error = {"type": "runtime", "line": None, "message": f"{type(e).__name__}: {e}"}
    except Exception as e:
        line = None
        tb = e.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == "<algohae>":
                line = tb.tb_lineno
            tb = tb.tb_next
        error = {"type": "runtime", "line": line, "message": f"{type(e).__name__}: {e}"}
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    # 종료 스냅샷 (event: "done" — 매직값 line:-1 대신 event로 구분)
    last_vars = snapshots[-1]["vars"] if snapshots else {}
    snapshots.append({
        "step": len(snapshots),
        "line": -1,
        "event": "done",
        "func": "",
        "depth": 0,
        "vars": last_vars,
        "stack": [],
        "out": len(out.getvalue()),
    })

    return json.dumps({
        "snapshots": snapshots,
        "stdout": out.getvalue(),
        "limitHit": limit_hit,
        "error": error,
    })
