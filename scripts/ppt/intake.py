"""
A-Team PPT 터미널 인테이크
화살표키로 선택 → PPTX 자동 생성

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
    ("qmark",     "fg:#a89878 bold"),
    ("question",  "fg:#e8e4dc bold"),
    ("answer",    "fg:#6a9fc8 bold"),
    ("pointer",   "fg:#a89878 bold"),
    ("highlighted","fg:#e8e4dc bold"),
    ("selected",  "fg:#6a9fc8"),
    ("separator", "fg:#2a2a30"),
    ("instruction","fg:#4a4844"),
])

def main():
    print("\n  A-Team  PPT 생성\n  " + "─" * 36 + "\n")

    # Q1 주제
    topic = questionary.text(
        "주제 / 제목",
        style=STYLE,
        instruction="(Enter 확정)"
    ).ask()
    if not topic:
        print("취소됨."); return

    # Q2 발표 유형
    ptype = questionary.select(
        "발표 유형",
        choices=[
            questionary.Choice("보고형  — 실적·현황·결과 보고",   value="보고형"),
            questionary.Choice("기획형  — 제안·계획·전략 수립",   value="기획형"),
            questionary.Choice("교육형  — 내부 교육·온보딩·설명", value="교육형"),
            questionary.Choice("설득형  — 투자 유치·경영진 승인", value="설득형"),
        ],
        style=STYLE,
        instruction="(↑↓ 이동, Enter 선택)"
    ).ask()

    # Q3 청중
    audience_sel = questionary.checkbox(
        "주요 청중  (스페이스 선택, Enter 확정)",
        choices=["임원진", "팀원", "외부 고객", "투자자", "전체"],
        style=STYLE,
    ).ask()
    audience_etc = ""
    if not audience_sel:
        audience_etc = questionary.text("직접 입력", style=STYLE).ask() or ""
    audience = ", ".join(audience_sel) if audience_sel else audience_etc

    # Q4 데이터
    has_data = questionary.confirm(
        "핵심 데이터·수치가 있나요?",
        default=False,
        style=STYLE,
    ).ask()
    data_raw = ""
    if has_data:
        data_raw = questionary.text(
            "데이터 입력  (없으면 Enter 스킵)",
            style=STYLE,
            instruction="(짧게 요약 입력)"
        ).ask() or ""

    # Q5 테마
    theme = questionary.select(
        "테마",
        choices=[
            questionary.Choice("dark_editorial    — 사업보고·전략·데이터",  value="dark_editorial"),
            questionary.Choice("consulting_clean  — 컨설팅·내부 제안서",    value="consulting_clean"),
            questionary.Choice("executive_deep    — 임원보고·투자 제안",     value="executive_deep"),
        ],
        style=STYLE,
    ).ask()

    # Q6 슬라이드 수
    slides_str = questionary.select(
        "슬라이드 수",
        choices=[
            questionary.Choice(" 8장  (간결)",    value="8"),
            questionary.Choice("10장  (기본)",    value="10"),
            questionary.Choice("12장  (표준)",    value="12"),
            questionary.Choice("15장  (상세)",    value="15"),
        ],
        default=questionary.Choice("10장  (기본)", value="10"),
        style=STYLE,
    ).ask()
    n_slides = int(slides_str)

    # ── 스펙 빌드
    print("\n  생성 중...\n")

    # server.py의 build_spec 재사용
    sys.path.insert(0, SCRIPT_DIR)
    from server import build_spec

    req  = dict(topic=topic, ptype=ptype, audience=audience,
                data=data_raw, slides=n_slides, theme=theme)
    spec = build_spec(req)

    slug     = topic[:30].replace(" ", "-").replace("/", "-")
    date_str = datetime.date.today().isoformat()
    out_dir  = os.path.join(CONTENT_DIR, f"{date_str}-{slug}")
    os.makedirs(out_dir, exist_ok=True)

    spec_path = os.path.join(out_dir, "spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)

    out_pptx  = os.path.join(out_dir, f"{slug}.pptx")
    gen_script = os.path.join(SCRIPT_DIR, "generate_v2.py")

    result = subprocess.run(
        [PYEXE, gen_script, spec_path, "--theme", theme, "--output", out_pptx],
        capture_output=True, text=True, timeout=60
    )

    if result.returncode == 0:
        print(f"  완료: {out_pptx}")
        print(f"  슬라이드: {len(spec['slides'])}장  /  테마: {theme}")
        # Windows: 탐색기에서 파일 열기
        try:
            os.startfile(os.path.dirname(out_pptx))
        except Exception:
            pass
    else:
        print("  오류:\n" + (result.stderr or result.stdout))


if __name__ == "__main__":
    main()
