"""
A-Team Consulting PPT Engine — McKinsey/BCG/Bain 급 프레젠테이션 생성

mckinsey_pptx 라이브러리를 활용한 컨설팅 펌 수준 .pptx 생성기.
기존 generate_v2.py (크리에이티브 모드)와 별도로 작동.

사용:
  python generate_consulting.py spec.json
  python generate_consulting.py spec.json --output deck.pptx
  python generate_consulting.py spec.json --font "Malgun Gothic"
"""
import sys, os, json, argparse
from pathlib import Path
from dataclasses import replace

# mckinsey_pptx 패키지 로드
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from mckinsey_pptx import PresentationBuilder, DEFAULT_THEME
from mckinsey_pptx.theme import Typography, Palette, Theme, THEMES


def build_theme(style="mckinsey", font_family="Malgun Gothic", copyright_text=""):
    """스타일별 테마 생성. mckinsey/bcg/bain 선택.
    한국어 환경: Malgun Gothic. 영문: Arial (기본값 유지).
    """
    base = THEMES.get(style, DEFAULT_THEME)
    if font_family == "auto":
        # 시스템 폰트 자동 감지
        import platform
        if platform.system() == "Darwin":
            font_family = "Apple SD Gothic Neo"
        else:
            font_family = "Malgun Gothic"
    return replace(
        base,
        typography=replace(base.typography, family=font_family),
        copyright_text=copyright_text,
    )


def convert_spec(spec):
    """A-Team 스펙 포맷 → mckinsey_pptx 스펙 포맷 변환.

    A-Team 포맷 (generate_v2.py 호환):
      {"layout": "cover", "headline": "...", ...}

    mckinsey_pptx 포맷:
      {"type": "cover", "title": "...", ...}

    변환 규칙:
      - layout → type
      - headline → title
      - 나머지 필드는 슬라이드 타입별 매핑
    """
    slides = spec.get("slides", [])
    meta = spec.get("meta", {})
    converted = []

    for s in slides:
        layout = s.get("layout", "bullets")
        out = dict(s)  # 원본 복사
        out.pop("layout", None)

        # headline → title 공통 매핑
        if "headline" in out and "title" not in out:
            out["title"] = out.pop("headline")

        # 레이아웃별 변환
        if layout == "cover":
            out["type"] = "cover"
            if "subtitle" not in out:
                out["subtitle"] = out.pop("subheadline", None)
            out.setdefault("client", meta.get("company", meta.get("author", "")))
            out.setdefault("date", meta.get("date", ""))

        elif layout == "section_break":
            out["type"] = "section_divider"
            out["section_number"] = out.pop("section_number", "01")
            out["section_title"] = out.pop("title", "")
            desc = out.pop("description", None)
            if desc:
                out["subtitle"] = desc

        elif layout == "agenda":
            out["type"] = "agenda"

        elif layout in ("bullets", "single"):
            out["type"] = "executive_summary_paragraph"
            bullets = out.pop("bullets", [])
            out["paragraphs"] = bullets

        elif layout == "two_column":
            out["type"] = "two_column_compare"
            left = out.pop("left", {})
            right = out.pop("right", {})
            out["left_label"] = left.get("title", "")
            out["left_items"] = left.get("bullets", [])
            out["right_label"] = right.get("title", "")
            out["right_items"] = right.get("bullets", [])

        elif layout == "stats_grid":
            # stats_grid → KPI dashboard
            stats = out.pop("stats", [])
            kpis = []
            for st in stats:
                kpis.append({
                    "label": st.get("label", ""),
                    "value": st.get("value", ""),
                    "delta": st.get("delta", ""),
                    "status": "green" if st.get("delta", "").startswith("+") else "amber",
                })
            out["type"] = "kpi_dashboard"
            out["kpis"] = kpis

        elif layout == "data_table":
            # data_table → assessment_table
            table = out.pop("table", {})
            headers = table.get("headers", [])
            rows = table.get("rows", [])
            out["type"] = "assessment_table"
            cat_rows = []
            for row in rows:
                if len(row) >= 2:
                    cat_rows.append({
                        "kpi": str(row[0]),
                        "target": str(row[2]) if len(row) > 2 else "",
                        "actual": str(row[1]),
                        "status_label": str(row[-1]) if len(row) > 3 else "",
                        "status": "green",
                    })
            cat_name = headers[0] if headers else out.get("title", "Data")
            out["categories"] = [{"name": cat_name, "rows": cat_rows}]
            if headers:
                out["column_headers"] = headers

        elif layout == "flow_diagram":
            out["type"] = "process_flow"
            raw_steps = out.pop("steps", [])
            steps_out = []
            for st in raw_steps:
                if isinstance(st, dict):
                    steps_out.append({
                        "name": st.get("label", ""),
                        "subtitle": st.get("sub", ""),
                        "activities": [],
                    })
                else:
                    steps_out.append({"name": str(st), "subtitle": "", "activities": []})
            out["steps"] = steps_out

        elif layout == "timeline":
            out["type"] = "phases_chevron_3"
            events = out.pop("events", out.pop("items", []))
            phases = []
            for ev in events:
                if isinstance(ev, dict):
                    phases.append({
                        "label": ev.get("title", ""),
                        "timeframe": ev.get("date", ev.get("period", "")),
                        "deliverables": [ev.get("desc", ev.get("description", ""))],
                    })
                else:
                    phases.append({"label": str(ev), "timeframe": "", "deliverables": []})
            out["phases"] = phases

        elif layout == "bar_chart":
            out["type"] = "column_comparison"
            out.setdefault("categories", [])
            series_list = out.pop("series", [])
            if series_list:
                out["values"] = series_list[0].get("values", [])
                if len(series_list) > 1:
                    out["series"] = [{"name": s.get("name", ""), "values": s.get("values", [])} for s in series_list]
            else:
                out["values"] = []

        elif layout == "quote":
            out["type"] = "quote"
            out["author"] = out.pop("attribution", "")

        elif layout == "closing":
            out["type"] = "dark_navy_summary"
            title_text = out.pop("title", "Thank You")
            contact_text = out.pop("contact", "")
            note_text = out.pop("note", "")
            out["body"] = f"{title_text}\n{contact_text}".strip()
            if note_text:
                out["eyebrow"] = note_text

        elif layout == "big_number":
            out["type"] = "stat_hero"
            out["stat"] = str(out.pop("number", out.pop("value", "")))
            out["stat_label"] = out.pop("label", "")
            detail = out.pop("detail", "")
            delta = out.pop("delta", "")
            out["context"] = f"{delta}\n{detail}".strip() if delta else detail

        elif layout == "comparison":
            out["type"] = "two_column_compare"
            before = out.pop("before", out.pop("option_a", out.pop("left", {})))
            after = out.pop("after", out.pop("option_b", out.pop("right", {})))
            out["left_label"] = before.get("title", before.get("label", "Before"))
            out["left_items"] = before.get("bullets", before.get("items", []))
            out["right_label"] = after.get("title", after.get("label", "After"))
            out["right_items"] = after.get("bullets", after.get("items", []))

        elif layout == "icon_grid":
            # icon_grid → five_key_areas (or three_trends_icons)
            items = out.pop("items", [])
            areas = []
            for it in items:
                if isinstance(it, dict):
                    areas.append({
                        "name": it.get("title", ""),
                        "description": it.get("description", it.get("desc", "")),
                    })
                else:
                    areas.append({"name": str(it), "description": ""})
            out["type"] = "five_key_areas"
            out["areas"] = areas

        elif layout == "bento_grid":
            # bento_grid → executive_summary_takeaways
            items = out.pop("items", [])
            sections = []
            for it in items:
                if isinstance(it, dict):
                    sections.append({
                        "takeaway": it.get("title", ""),
                        "bullets": [it.get("description", "")] if it.get("description") else [],
                    })
                else:
                    sections.append({"takeaway": str(it), "bullets": []})
            out["type"] = "executive_summary_takeaways"
            out["sections"] = sections

        elif layout == "image_text":
            # image_text → executive_summary_paragraph
            out["type"] = "executive_summary_paragraph"
            out["paragraphs"] = out.pop("bullets", [out.pop("body", out.pop("text", ""))])

        else:
            # 알 수 없는 레이아웃 → 자동 추론에 맡김
            out.pop("type", None)
            try:
                from mckinsey_pptx.builder import infer_slide_type
                inferred = infer_slide_type(out)
                out["type"] = inferred
            except (ValueError, ImportError):
                out["type"] = "executive_summary_paragraph"
                out["paragraphs"] = [str(out.get("title", ""))]

        # notes → footnote 매핑 (mckinsey_pptx는 스피커 노트 미지원, footnote로 대체)
        notes = out.pop("notes", None)
        if notes and "footnote" not in out:
            out["footnote"] = notes

        # 불필요 필드 정리
        for k in ["label", "kicker", "meta", "tags", "image", "image_path",
                   "image_position", "text", "note", "contact"]:
            out.pop(k, None)

        converted.append(out)

    return converted


def build_consulting_deck(spec, output_path=None, style="mckinsey",
                          font="Malgun Gothic", copyright_text=""):
    """A-Team 스펙 → 컨설팅 펌급 .pptx 생성. style: mckinsey/bcg/bain."""
    meta = spec.get("meta", {})
    out = output_path or "output_consulting.pptx"

    theme = build_theme(style, font, copyright_text or meta.get("company", ""))
    section_marker = meta.get("section_marker", meta.get("title", ""))

    b = PresentationBuilder(
        theme=theme,
        default_section_marker=section_marker,
    )

    converted = convert_spec(spec)

    for cs in converted:
        try:
            b.add_spec(cs)
        except Exception as e:
            print(f"[WARN] Slide skipped ({cs.get('type', '?')}): {e}", file=sys.stderr)
            continue

    Path(out).parent.mkdir(parents=True, exist_ok=True)
    b.save(out)
    return out


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="A-Team Consulting PPT Generator (McKinsey-grade)")
    p.add_argument("spec", help="JSON spec file")
    p.add_argument("--output", "-o", default=None, help="Output .pptx path")
    p.add_argument("--style", "-s", default="mckinsey",
                   choices=["mckinsey", "bcg", "bain"],
                   help="Consulting firm style")
    p.add_argument("--font", default="Malgun Gothic", help="Font family")
    p.add_argument("--copyright", default="", help="Copyright text for footer")
    args = p.parse_args()

    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)

    out = build_consulting_deck(spec, args.output, args.style, args.font, args.copyright)
    n = len(spec.get("slides", []))

    # QA Gate
    qa_script = os.path.join(SCRIPT_DIR, "qa-pptx.py")
    import subprocess
    qa = subprocess.run(
        [sys.executable, qa_script, out, "--spec", args.spec, "--json"],
        capture_output=True, text=True, timeout=30
    )
    qa_score, qa_grade = 0, "?"
    try:
        qa_report = json.loads(qa.stdout)
        qa_score = qa_report.get("score", 0)
        qa_grade = qa_report.get("grade", "?")
    except Exception:
        pass

    if qa.returncode != 0:
        print(f"QA FAILED: {qa_score}/100 ({qa_grade})", file=sys.stderr)
        for d in qa_report.get("details", [])[:5]:
            print(f"  Slide {d['slide']}: {d['type']} — {d['detail']}", file=sys.stderr)
        os.remove(out)
        print("Output deleted. Quality gate (B+) not met.", file=sys.stderr)
        sys.exit(1)

    print(f"Generated ({args.style}): {out}")
    print(f"Slides: {n} / Style: {args.style} / Font: {args.font} / QA: {qa_score}/100 ({qa_grade})")
