"""
A-Team PPT 터미널 Wizard
한 번에 한 질문, 진행 표시기 + 검토 화면

사용:
  python scripts/ppt/intake.py
"""
import os, sys, json, subprocess, datetime
import questionary
from questionary import Style

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(SCRIPT_DIR, "..", "..", "content", "ppt")
PYEXE       = sys.executable

STYLE = Style([
    ("qmark",      "fg:#a89878 bold"),
    ("question",   "fg:#e8e4dc bold"),
    ("answer",     "fg:#6a9fc8 bold"),
    ("pointer",    "fg:#a89878 bold"),
    ("highlighted","fg:#e8e4dc bold"),
    ("selected",   "fg:#6a9fc8"),
    ("separator",  "fg:#2a2a30"),
    ("instruction","fg:#4a4844"),
])

TOTAL_STEPS = 6
W = 52  # 헤더 너비


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def header(step: int, title: str, hint: str = ""):
    """단계 헤더 출력"""
    clear()
    # 타이틀
    print("\n  \033[38;5;244mA-Team  PPT 생성\033[0m")
    print("  " + "─" * W)

    # 진행 표시기 (도트)
    dots = []
    for i in range(1, TOTAL_STEPS + 1):
        if i < step:
            dots.append("\033[32m●\033[0m")   # 완료 — 초록
        elif i == step:
            dots.append("\033[34m●\033[0m")   # 현재 — 파랑
        else:
            dots.append("\033[38;5;238m○\033[0m")  # 미완 — 회색
    bar = "  ".join(dots)
    print(f"\n  {bar}")
    print(f"  \033[38;5;244mStep {step} / {TOTAL_STEPS}\033[0m\n")

    # 질문 제목
    print(f"  \033[1m{title}\033[0m")
    if hint:
        print(f"  \033[38;5;238m{hint}\033[0m")
    print()


def ask_step(step, title, hint, ask_fn):
    """헤더 출력 후 질문. None 반환 시 취소."""
    header(step, title, hint)
    result = ask_fn()
    if result is None:
        print("\n  취소됨.")
        sys.exit(0)
    return result


def review(answers: dict) -> bool:
    """검토 화면 출력 후 확인 여부 반환"""
    clear()
    print("\n  \033[38;5;244mA-Team  PPT 생성\033[0m")
    print("  " + "─" * W)
    print(f"\n  \033[32m{'●  ' * TOTAL_STEPS}\033[0m")
    print(f"  \033[38;5;244m검토\033[0m\n")
    print(f"  \033[1m이대로 생성할까요?\033[0m\n")

    rows = [
        ("주제",     answers["topic"]),
        ("유형",     answers["ptype"]),
        ("청중",     answers["audience"]),
        ("데이터",   answers["data"] or "\033[38;5;238m없음 — [DATA] 플레이스홀더\033[0m"),
        ("테마",     answers["theme"]),
        ("슬라이드", f"{answers['slides']}장"),
    ]
    for label, value in rows:
        print(f"  \033[38;5;136m{label:<8}\033[0m  {value}")

    print("\n  " + "─" * W)
    result = questionary.confirm(
        "  생성 시작",
        default=True,
        style=STYLE,
    ).ask()
    return bool(result)


def main():
    # ── Step 1: 주제 ──────────────────────────────────────────
    topic = ask_step(
        1, "어떤 내용의 PPT인가요?",
        "제목이 구체적일수록 슬라이드 내용이 정교해집니다.",
        lambda: questionary.text(
            "주제 / 제목",
            style=STYLE,
            instruction="(Enter 확정)",
        ).ask()
    )
    if not topic.strip():
        print("  주제를 입력해주세요."); sys.exit(1)
    topic = topic.strip()

    # ── Step 2: 발표 유형 ─────────────────────────────────────
    ptype = ask_step(
        2, "어떤 목적의 발표인가요?", "",
        lambda: questionary.select(
            "발표 유형",
            choices=[
                questionary.Choice("보고형  — 실적·현황·결과 보고",   value="보고형"),
                questionary.Choice("기획형  — 제안·계획·전략 수립",   value="기획형"),
                questionary.Choice("교육형  — 내부 교육·온보딩·설명", value="교육형"),
                questionary.Choice("설득형  — 투자 유치·경영진 승인", value="설득형"),
            ],
            style=STYLE,
            instruction="(↑↓ 이동, Enter 선택)",
        ).ask()
    )

    # ── Step 3: 청중 ──────────────────────────────────────────
    audience_chips = ask_step(
        3, "누가 보는 PPT인가요?",
        "스페이스로 복수 선택 가능. 직접 입력도 됩니다.",
        lambda: questionary.checkbox(
            "주요 청중",
            choices=["임원진", "팀원", "외부 고객", "투자자", "전체"],
            style=STYLE,
            instruction="(스페이스 선택, Enter 확정)",
        ).ask()
    )
    if audience_chips:
        audience = ", ".join(audience_chips)
    else:
        header(3, "누가 보는 PPT인가요?", "직접 입력해주세요.")
        audience = questionary.text(
            "청중 입력",
            style=STYLE,
        ).ask() or "팀원"

    # ── Step 4: 데이터 ────────────────────────────────────────
    data_raw = ask_step(
        4, "핵심 수치가 있나요?",
        "없으면 Enter로 스킵 — [DATA] 플레이스홀더로 자동 처리됩니다.",
        lambda: questionary.text(
            "데이터 입력  (없으면 Enter 스킵)",
            style=STYLE,
            instruction="(예: Q1 매출 23억, +7% / 없으면 Enter)",
        ).ask()
    )
    data_raw = (data_raw or "").strip()

    # ── Step 5: 테마 ──────────────────────────────────────────
    theme = ask_step(
        5, "어떤 분위기의 디자인인가요?", "",
        lambda: questionary.select(
            "테마",
            choices=[
                questionary.Choice("Dark Editorial    — 사업 보고·전략·데이터 대시보드", value="dark_editorial"),
                questionary.Choice("Consulting Clean  — 컨설팅·내부 제안서·교육",       value="consulting_clean"),
                questionary.Choice("Executive Deep    — 임원 보고·투자 제안·공식 발표", value="executive_deep"),
            ],
            style=STYLE,
            instruction="(↑↓ 이동, Enter 선택)",
        ).ask()
    )

    # ── Step 6: 슬라이드 수 ───────────────────────────────────
    slides_str = ask_step(
        6, "슬라이드 몇 장으로 만들까요?",
        "10장이 기본값. 간결하면 8장, 상세하면 12–15장.",
        lambda: questionary.select(
            "슬라이드 수",
            choices=[
                questionary.Choice(" 8장  (간결)", value="8"),
                questionary.Choice("10장  (기본)", value="10"),
                questionary.Choice("12장  (표준)", value="12"),
                questionary.Choice("15장  (상세)", value="15"),
            ],
            default=questionary.Choice("10장  (기본)", value="10"),
            style=STYLE,
        ).ask()
    )
    n_slides = int(slides_str)

    # ── 검토 화면 ─────────────────────────────────────────────
    answers = dict(
        topic=topic, ptype=ptype, audience=audience,
        data=data_raw, theme=theme, slides=n_slides
    )
    if not review(answers):
        print("\n  취소됨.")
        return

    # ── 생성 ──────────────────────────────────────────────────
    clear()
    print("\n  \033[38;5;244mA-Team  PPT 생성\033[0m")
    print("  " + "─" * W)
    print("\n  생성 중...\n")

    sys.path.insert(0, SCRIPT_DIR)
    from server import build_spec

    spec     = build_spec(answers)
    slug     = topic[:30].replace(" ", "-").replace("/", "-")
    date_str = datetime.date.today().isoformat()
    out_dir  = os.path.join(CONTENT_DIR, f"{date_str}-{slug}")
    os.makedirs(out_dir, exist_ok=True)

    spec_path = os.path.join(out_dir, "spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)

    out_pptx   = os.path.join(out_dir, f"{slug}.pptx")
    gen_script = os.path.join(SCRIPT_DIR, "generate_v2.py")

    result = subprocess.run(
        [PYEXE, gen_script, spec_path, "--theme", theme, "--output", out_pptx],
        capture_output=True, text=True, timeout=60
    )

    if result.returncode == 0:
        print(f"  \033[32m완료\033[0m  {out_pptx}")
        print(f"  슬라이드: {len(spec['slides'])}장  /  테마: {theme}\n")
        try:
            os.startfile(os.path.dirname(out_pptx))
        except Exception:
            pass
    else:
        print("  \033[31m오류\033[0m\n" + (result.stderr or result.stdout))


if __name__ == "__main__":
    main()
