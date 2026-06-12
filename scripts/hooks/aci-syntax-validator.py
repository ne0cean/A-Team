#!/usr/bin/env python3
# aci-syntax-validator.py — PreToolUse hook: validate syntax before Edit/Write
# Claude Code hook protocol: read JSON from stdin, write decision to stdout
#
# 동작:
#   - Edit/Write 도구 실행 직전에 파일 구문 검증
#   - Write: new_content 전체 검증 (완전한 파일) → 오류 시 block
#   - Edit: new_string만 검증 (부분 코드) → 명백한 오류만 block
#   - 훅 자체 오류: 통과 (에이전트 작업 차단 금지)
#
# 설치: ~/.claude/settings.json PreToolUse 훅으로 등록
# 참조: governance/rules/aci-syntax-validator.md

import sys
import json
import os
import subprocess
import tempfile

# 스킵할 경로 패턴
SKIP_PATH_PATTERNS = [
    "node_modules",
    ".git",
    "/vendor/",
    "/.cache/",
    "/dist/",
    "/build/",
]

TIMEOUT_SECONDS = 3


def should_skip_path(file_path: str) -> bool:
    if not file_path:
        return True
    for pattern in SKIP_PATH_PATTERNS:
        if pattern in file_path:
            return True
    return False


def block(reason: str) -> None:
    print(json.dumps({"decision": "block", "reason": reason}))


def passthrough() -> None:
    # 아무것도 출력하지 않으면 통과
    pass


def validate_python(content: str, is_complete: bool) -> str | None:
    """Python AST 파싱. 오류 시 메시지 반환, 통과 시 None."""
    import ast
    try:
        ast.parse(content)
        return None
    except SyntaxError as e:
        if is_complete:
            return f"Python SyntaxError: line {e.lineno}: {e.msg}"
        # Edit (부분 코드): 명백한 오류만 (IndentationError 등은 false positive 가능)
        # SyntaxError는 부분 코드에서도 발생할 수 있으므로 통과
        return None
    except Exception:
        return None


def validate_json(content: str, is_complete: bool) -> str | None:
    """JSON 파싱. 오류 시 메시지 반환."""
    import json as json_mod
    try:
        json_mod.loads(content)
        return None
    except json_mod.JSONDecodeError as e:
        if is_complete:
            return f"JSON SyntaxError: {e.msg} (line {e.lineno} col {e.colno})"
        return None
    except Exception:
        return None


def validate_shell(content: str, is_complete: bool) -> str | None:
    """bash -n 구문 체크. 오류 시 메시지 반환."""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".sh", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            tmp_path = f.name
        try:
            result = subprocess.run(
                ["bash", "-n", tmp_path],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
            if result.returncode != 0 and is_complete:
                stderr = result.stderr.strip()
                return f"Shell SyntaxError: {stderr}" if stderr else "Shell syntax check failed"
            return None
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return None
    except Exception:
        return None


def validate_js(content: str, is_complete: bool) -> str | None:
    """node --check 구문 체크. 오류 시 메시지 반환."""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".mjs", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            tmp_path = f.name
        try:
            result = subprocess.run(
                ["node", "--check", tmp_path],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
            if result.returncode != 0 and is_complete:
                stderr = result.stderr.strip()
                # 경로 노출 제거
                stderr = stderr.replace(tmp_path, "<file>")
                return f"JS SyntaxError: {stderr}" if stderr else "JS syntax check failed"
            return None
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        # node 없으면 통과
        return None
    except Exception:
        return None


def validate_ts_brackets(content: str, is_complete: bool) -> str | None:
    """TypeScript: bracket 균형 체크 (tsc 없을 수 있음).
    완전한 파일(is_complete=True)에서 명백한 불균형만 차단."""
    if not is_complete:
        return None
    try:
        pairs = {"(": ")", "[": "]", "{": "}"}
        stack = []
        in_string = False
        string_char = None
        in_template = False
        i = 0
        while i < len(content):
            ch = content[i]
            # 문자열 내부는 스킵
            if in_string:
                if ch == "\\" and i + 1 < len(content):
                    i += 2
                    continue
                if ch == string_char:
                    in_string = False
                    string_char = None
                i += 1
                continue
            # 단일/이중 따옴표 시작
            if ch in ('"', "'", "`"):
                in_string = True
                string_char = ch
                i += 1
                continue
            # 한 줄 주석 스킵
            if ch == "/" and i + 1 < len(content) and content[i + 1] == "/":
                while i < len(content) and content[i] != "\n":
                    i += 1
                continue
            # 블록 주석 스킵
            if ch == "/" and i + 1 < len(content) and content[i + 1] == "*":
                i += 2
                while i + 1 < len(content):
                    if content[i] == "*" and content[i + 1] == "/":
                        i += 2
                        break
                    i += 1
                continue
            if ch in pairs:
                stack.append(ch)
            elif ch in pairs.values():
                # 닫는 괄호 확인
                if not stack:
                    return f"TypeScript SyntaxError: unexpected '{ch}' (no matching opener)"
                expected_close = pairs[stack[-1]]
                if ch != expected_close:
                    return (
                        f"TypeScript SyntaxError: mismatched bracket "
                        f"'{stack[-1]}' closed by '{ch}'"
                    )
                stack.pop()
            i += 1

        if stack:
            unclosed = stack[-1]
            return f"TypeScript SyntaxError: unclosed '{unclosed}'"
        return None
    except Exception:
        return None


def get_content_and_mode(tool_name: str, tool_input: dict) -> tuple[str | None, bool]:
    """(content, is_complete) 반환. content=None이면 스킵."""
    if tool_name == "Write":
        content = tool_input.get("content") or tool_input.get("new_content")
        return content, True
    elif tool_name == "Edit":
        content = tool_input.get("new_string")
        return content, False
    return None, False


def validate(file_path: str, content: str, is_complete: bool) -> str | None:
    """확장자에 따라 검증. 오류 메시지 반환 또는 None(통과)."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".py":
        return validate_python(content, is_complete)
    elif ext in (".js", ".mjs", ".cjs"):
        return validate_js(content, is_complete)
    elif ext in (".ts", ".tsx", ".jsx"):
        return validate_ts_brackets(content, is_complete)
    elif ext == ".json":
        return validate_json(content, is_complete)
    elif ext == ".sh":
        return validate_shell(content, is_complete)
    # 기타 확장자: 통과
    return None


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            passthrough()
            return

        data = json.loads(raw)
        tool_name = data.get("tool_name", "")

        if tool_name not in ("Edit", "Write"):
            passthrough()
            return

        tool_input = data.get("tool_input", {})
        file_path = tool_input.get("file_path", "")

        if should_skip_path(file_path):
            passthrough()
            return

        content, is_complete = get_content_and_mode(tool_name, tool_input)

        if not content:
            passthrough()
            return

        error_msg = validate(file_path, content, is_complete)
        if error_msg:
            block(error_msg)
        else:
            passthrough()

    except Exception:
        # 훅 자체 오류: 통과 (에이전트 작업을 절대 막지 않음)
        passthrough()


if __name__ == "__main__":
    main()
