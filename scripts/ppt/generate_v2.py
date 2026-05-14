"""
A-Team PPT Engine v2 — 실제 편집 가능 .pptx 생성기
PHY041/claude-skill-slide-kit 패턴 기반 + 한국어 최적화

슬라이드 타입:
  구조: cover, section_break, agenda, closing
  콘텐츠: bullets, two_column, stats_grid, data_table, quote
  도식화: flow_diagram, timeline, comparison_matrix, bar_chart

테마: dark_editorial, consulting_clean, executive_deep

사용:
  python generate_v2.py spec.json
  python generate_v2.py spec.json --theme consulting_clean --output out.pptx
"""
import sys, json, argparse
from pptx import Presentation
from pptx.util import Inches, Pt, Emu, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.oxml.ns import qn
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
import copy

try:
    from pptx.util import Pt as _Pt
    from pptx.enum.shapes import MSO_SHAPE
    RECT = MSO_SHAPE.RECTANGLE
    RRECT = MSO_SHAPE.ROUNDED_RECTANGLE
    OVAL = MSO_SHAPE.OVAL
    CHEVRON = MSO_SHAPE.CHEVRON
    PENTAGON = MSO_SHAPE.PENTAGON
except Exception:
    RECT = 1; RRECT = 5; OVAL = 9

# ── 슬라이드 규격 (16:9 와이드스크린) ────────────────────────
W  = Inches(13.333)
H  = Inches(7.5)
MX = Inches(0.75)   # 좌우 여백
MY = Inches(0.6)    # 상하 여백
CW = W - 2 * MX    # 콘텐츠 폭

# ── 테마 정의 ─────────────────────────────────────────────────
def rgb(hex_str):
    h = hex_str.lstrip('#')
    return RGBColor(int(h[0:2],16), int(h[2:4],16), int(h[4:6],16))

THEMES = {
    "dark_editorial": {
        # Phlegonlabs Style I 기반
        "bg":           rgb("111116"),
        "surface":      rgb("1a1a22"),
        "surface2":     rgb("222228"),
        "text":         rgb("e8e4dc"),
        "dim":          rgb("8a8680"),
        "dim2":         rgb("4a4844"),
        "metal":        rgb("a89878"),
        "accent":       rgb("4a7fa8"),
        "accent2":      rgb("6a9fc8"),
        "positive":     rgb("4a8060"),
        "negative":     rgb("8a4040"),
        "warn":         rgb("a89048"),
        "rule":         rgb("2a2a30"),
        "font":         "Malgun Gothic",
        "font_display": "Malgun Gothic",
    },
    "consulting_clean": {
        # Phlegonlabs Style B 기반 (East Asian Minimalism)
        "bg":           rgb("f5f0e6"),
        "surface":      rgb("ffffff"),
        "surface2":     rgb("f0ebe0"),
        "text":         rgb("1a1814"),
        "dim":          rgb("5a5248"),
        "dim2":         rgb("9a9088"),
        "metal":        rgb("8a7860"),
        "accent":       rgb("1d4e8a"),
        "accent2":      rgb("2d6eaa"),
        "positive":     rgb("2a5e30"),
        "negative":     rgb("8a2020"),
        "warn":         rgb("8a6020"),
        "rule":         rgb("d8d0c4"),
        "font":         "Malgun Gothic",
        "font_display": "Malgun Gothic",
    },
    "executive_deep": {
        # Phlegonlabs Style F 기반 (Art Deco Luxury)
        "bg":           rgb("0c0a09"),
        "surface":      rgb("18140e"),
        "surface2":     rgb("22180e"),
        "text":         rgb("f0ead8"),
        "dim":          rgb("8a7a68"),
        "dim2":         rgb("504030"),
        "metal":        rgb("b8986a"),
        "accent":       rgb("9f1239"),
        "accent2":      rgb("c8304a"),
        "positive":     rgb("1a5c3a"),
        "negative":     rgb("8a1818"),
        "warn":         rgb("8a6018"),
        "rule":         rgb("2a2018"),
        "font":         "Malgun Gothic",
        "font_display": "Malgun Gothic",
    },
}


# ── 프리미티브 ──────────────────────────────────────────────────
def paint_bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color

def tbox(slide, l, t, w, h, text, size=14, color=None, bold=False,
         font="Malgun Gothic", align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
         italic=False, wrap=True):
    from pptx.util import Emu
    tb = slide.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.margin_left = Emu(0); tf.margin_right = Emu(0)
    tf.margin_top = Emu(0); tf.margin_bottom = Emu(0)
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = text
    r.font.size = Pt(size)
    if color: r.font.color.rgb = color
    r.font.bold = bold; r.font.italic = italic; r.font.name = font
    return tb

def add_rect(slide, l, t, w, h, fill, border=None, bw=0.5, radius=None):
    shape_type = RRECT if radius else RECT
    s = slide.shapes.add_shape(shape_type, l, t, w, h)
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border; s.line.width = Pt(bw)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    if radius and shape_type == RRECT:
        try: s.adjustments[0] = radius
        except: pass
    return s

def hline(slide, l, t, w, color, weight=0.5):
    s = slide.shapes.add_shape(RECT, l, t, w, Pt(weight))
    s.fill.solid(); s.fill.fore_color.rgb = color
    s.line.fill.background(); s.shadow.inherit = False
    return s

def vline(slide, l, t, h, color, weight=0.5):
    s = slide.shapes.add_shape(RECT, l, t, Pt(weight), h)
    s.fill.solid(); s.fill.fore_color.rgb = color
    s.line.fill.background(); s.shadow.inherit = False
    return s

def label_text(slide, l, t, w, text, th, size=8, color=None, font="Malgun Gothic"):
    """작은 DM-Mono 스타일 레이블"""
    tbox(slide, l, t, w, Pt(size*1.8), text, size, color, False, font, PP_ALIGN.LEFT)

def add_connector(slide, x1, y1, x2, y2, color, weight=1.5):
    """두 점을 잇는 직선 커넥터"""
    from pptx.oxml import parse_xml
    from lxml import etree
    cx = slide.shapes.add_connector(1, x1, y1, x2, y2)
    cx.line.color.rgb = color
    cx.line.width = Pt(weight)
    return cx


# ── 슬라이드 빌더 ───────────────────────────────────────────────

def slide_cover(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    # 좌측 강조 바
    add_rect(slide, MX, MY, Pt(3), H - 2*MY, th["accent"])

    L = MX + Inches(0.35)

    # 레이블
    tbox(slide, L, MY + Inches(0.1), CW, Pt(20),
         content.get("label", "").upper(),
         9, th["metal"], False, th["font"])

    # 메인 타이틀
    kicker = content.get("kicker", "")
    title  = content.get("headline", content.get("title", ""))
    y_title = MY + Inches(0.5)

    tb = slide.shapes.add_textbox(L, y_title, CW - Inches(1), Inches(2.5))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = Emu(0); tf.margin_right = Emu(0)
    tf.margin_top = Emu(0); tf.margin_bottom = Emu(0)

    if kicker:
        p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
        r = p.add_run(); r.text = kicker
        r.font.size = Pt(16); r.font.color.rgb = th["accent2"]
        r.font.bold = False; r.font.name = th["font"]

        p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.LEFT; p2.space_before = Pt(6)
        r2 = p2.add_run(); r2.text = title
        r2.font.size = Pt(44); r2.font.color.rgb = th["text"]
        r2.font.bold = True; r2.font.name = th["font_display"]
    else:
        p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
        r = p.add_run(); r.text = title
        r.font.size = Pt(44); r.font.color.rgb = th["text"]
        r.font.bold = True; r.font.name = th["font_display"]

    # 부제목
    subtitle = content.get("subtitle", content.get("subheadline", ""))
    if subtitle:
        tbox(slide, L, y_title + Inches(2.2), CW - Inches(1), Inches(0.7),
             subtitle, 18, th["dim"], False, th["font"])

    # 구분선
    hline(slide, L, H - MY - Inches(1.1), CW - Inches(0.5), th["metal"], 0.5)

    # 하단 메타정보
    meta = content.get("meta", "")
    if meta:
        tbox(slide, L, H - MY - Inches(0.9), CW - Inches(0.5), Pt(18),
             meta, 11, th["dim2"], False, th["font"])

    # 태그
    tags = content.get("tags", [])
    tx = L
    for tag in tags[:4]:
        tw = Inches(max(1.2, len(tag) * 0.12 + 0.4))
        add_rect(slide, tx, H - MY - Inches(0.45), tw, Inches(0.28),
                 th["surface"], th["accent"], 0.5)
        tbox(slide, tx + Pt(6), H - MY - Inches(0.44), tw - Pt(12), Inches(0.26),
             tag.upper(), 8, th["accent2"], True, th["font"], PP_ALIGN.CENTER)
        tx += tw + Inches(0.12)

def slide_section_break(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    num = content.get("section_number", "01")
    headline = content.get("headline", "")
    desc = content.get("description", "")

    # 큰 섹션 번호 (워터마크)
    tbox(slide, MX - Inches(0.1), H/2 - Inches(1.8), Inches(4), Inches(3),
         num, 140, th["rule"], True, th["font_display"], PP_ALIGN.LEFT)

    # 실제 내용
    tbox(slide, MX + Inches(0.1), H/2 - Inches(0.5), CW * 0.65, Inches(0.4),
         f"Section {num}", 11, th["metal"], False, th["font"])

    hline(slide, MX + Inches(0.1), H/2 - Inches(0.05), CW * 0.65, th["metal"], 0.5)

    tbox(slide, MX + Inches(0.1), H/2 + Inches(0.1), CW * 0.65, Inches(1),
         headline, 32, th["text"], True, th["font_display"])

    if desc:
        tbox(slide, MX + Inches(0.1), H/2 + Inches(0.9), CW * 0.65, Inches(0.5),
             desc, 14, th["dim"], False, th["font"])

def slide_bullets(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    bullets = content.get("bullets", [])
    source = content.get("source", "")

    # 헤드라인
    tbox(slide, MX, MY, CW, Inches(0.7),
         headline, 24, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.65), CW, th["metal"], 0.4)

    # 불릿
    y = MY + Inches(0.9)
    for bullet in bullets[:5]:
        # 대시 마커
        add_rect(slide, MX, y + Pt(8), Inches(0.18), Pt(1.5), th["metal"])
        tbox(slide, MX + Inches(0.28), y, CW - Inches(0.3), Inches(0.55),
             bullet, 16, th["dim"], False, th["font"])
        y += Inches(0.65)

    if source:
        tbox(slide, MX, H - MY - Pt(16), CW, Pt(16),
             f"출처: {source}", 9, th["dim2"], False, th["font"])

def slide_two_column(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    left  = content.get("left", {})
    right = content.get("right", {})

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    col_w = (CW - Inches(0.3)) / 2
    col_r = MX + col_w + Inches(0.3)
    y_start = MY + Inches(0.85)
    col_h = H - y_start - MY

    # 좌측 패널
    add_rect(slide, MX, y_start, col_w, col_h, th["surface"], th["rule"], 0.5)
    tbox(slide, MX + Inches(0.2), y_start + Inches(0.18), col_w - Inches(0.4), Pt(20),
         left.get("title","").upper(), 9, th["metal"], True, th["font"])
    hline(slide, MX + Inches(0.2), y_start + Inches(0.46), col_w - Inches(0.4), th["rule"], 0.4)

    ly = y_start + Inches(0.6)
    for b in left.get("bullets", [])[:5]:
        add_rect(slide, MX + Inches(0.2), ly + Pt(7), Inches(0.1), Pt(1.2), th["accent"])
        tbox(slide, MX + Inches(0.36), ly, col_w - Inches(0.55), Inches(0.5),
             b, 14, th["dim"], False, th["font"])
        ly += Inches(0.55)

    # 우측 패널
    add_rect(slide, col_r, y_start, col_w, col_h, th["surface"], th["rule"], 0.5)
    tbox(slide, col_r + Inches(0.2), y_start + Inches(0.18), col_w - Inches(0.4), Pt(20),
         right.get("title","").upper(), 9, th["metal"], True, th["font"])
    hline(slide, col_r + Inches(0.2), y_start + Inches(0.46), col_w - Inches(0.4), th["rule"], 0.4)

    ry = y_start + Inches(0.6)
    for b in right.get("bullets", [])[:5]:
        add_rect(slide, col_r + Inches(0.2), ry + Pt(7), Inches(0.1), Pt(1.2), th["accent2"])
        tbox(slide, col_r + Inches(0.36), ry, col_w - Inches(0.55), Inches(0.5),
             b, 14, th["dim"], False, th["font"])
        ry += Inches(0.55)

def slide_stats_grid(prs, content, th):
    """핵심 수치 카드 3~4개"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    stats = content.get("stats", [])

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    n = min(len(stats), 4)
    if n == 0: return
    card_w = (CW - Inches(0.2) * (n-1)) / n
    y_start = MY + Inches(0.9)
    card_h = H - y_start - MY - Inches(0.1)

    for i, stat in enumerate(stats[:n]):
        cx = MX + i * (card_w + Inches(0.2))
        # 카드 배경
        add_rect(slide, cx, y_start, card_w, card_h, th["surface"], th["rule"], 0.5)
        # 상단 강조 바 (얇은 accent)
        accent_color = [th["accent"], th["positive"], th["warn"], th["accent2"]][i % 4]
        add_rect(slide, cx, y_start, card_w, Pt(2), accent_color)

        label = stat.get("label", "").upper()
        value = stat.get("value", "")
        delta = stat.get("delta", "")
        note  = stat.get("note", "")

        tbox(slide, cx + Inches(0.2), y_start + Inches(0.2),
             card_w - Inches(0.4), Pt(14),
             label, 8, th["metal"], False, th["font"])

        tbox(slide, cx + Inches(0.15), y_start + Inches(0.55),
             card_w - Inches(0.3), Inches(1.2),
             value, 42, th["text"], True, th["font_display"])

        if delta:
            d_color = th["positive"] if delta.startswith("+") else th["negative"]
            tbox(slide, cx + Inches(0.2), y_start + Inches(1.65),
                 card_w - Inches(0.4), Pt(18),
                 delta, 13, d_color, True, th["font"])
        if note:
            tbox(slide, cx + Inches(0.2), y_start + card_h - Inches(0.55),
                 card_w - Inches(0.4), Inches(0.45),
                 note, 11, th["dim"], False, th["font"])

def slide_data_table(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    table_data = content.get("table", {})
    headers = table_data.get("headers", [])
    rows = table_data.get("rows", [])
    highlight_col = table_data.get("highlight_col", -1)
    source = content.get("source", "")

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    if not headers or not rows: return

    n_cols = len(headers)
    n_rows = len(rows)
    avail_h = H - (MY + Inches(0.9)) - MY - (Inches(0.3) if source else 0)
    row_h = min(Inches(0.55), avail_h / (n_rows + 1))
    col_w = CW / n_cols
    t_top = MY + Inches(0.85)

    # 헤더 행
    add_rect(slide, MX, t_top, CW, row_h, th["surface2"], th["rule"], 0.3)
    hline(slide, MX, t_top + row_h - Pt(0.4), CW, th["metal"], 0.5)
    for j, h_text in enumerate(headers):
        is_hl = (j == highlight_col)
        tbox(slide, MX + j*col_w + Inches(0.1), t_top + Pt(5),
             col_w - Inches(0.15), row_h - Pt(10),
             h_text, 10, th["metal"] if not is_hl else th["accent2"],
             True, th["font"], PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 데이터 행
    for i, row in enumerate(rows[:12]):
        ry = t_top + row_h * (i + 1)
        bg = th["surface"] if i % 2 == 0 else th["bg"]
        add_rect(slide, MX, ry, CW, row_h, bg, th["rule"], 0.2)
        for j, cell in enumerate(row[:n_cols]):
            is_hl = (j == highlight_col)
            tbox(slide, MX + j*col_w + Inches(0.1), ry + Pt(4),
                 col_w - Inches(0.15), row_h - Pt(8),
                 str(cell), 12, th["text"] if is_hl else th["dim"],
                 is_hl, th["font"], PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    if source:
        tbox(slide, MX, H - MY - Pt(14), CW, Pt(14),
             f"출처: {source}", 9, th["dim2"], False, th["font"])

def slide_flow_diagram(prs, content, th):
    """
    실제 도형+화살표 기반 프로세스 플로우 다이어그램
    content = {
      "headline": "...",
      "steps": [{"label": "...", "sub": "...optional"}, ...]
    }
    최대 6단계. 박스 + 화살표 실제 shape 사용.
    """
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    steps = content.get("steps", [])

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    n = min(len(steps), 6)
    if n == 0: return

    box_w = Inches(1.6)
    arrow_w = Inches(0.35)
    total = n * box_w + (n-1) * arrow_w
    start_x = MX + (CW - total) / 2
    box_h = Inches(1.0)
    cy = H / 2 + Inches(0.3)  # 중앙 Y

    accent_colors = [
        th["accent"], th["accent2"], th["positive"],
        th["warn"], th["metal"], th["dim"]
    ]

    for i, step in enumerate(steps[:n]):
        bx = start_x + i * (box_w + arrow_w)
        color = accent_colors[i % len(accent_colors)]

        # 박스
        add_rect(slide, bx, cy - box_h/2, box_w, box_h,
                 th["surface"], color, 1.0)
        # 상단 컬러 바
        add_rect(slide, bx, cy - box_h/2, box_w, Pt(2.5), color)

        # 번호
        tbox(slide, bx + Inches(0.1), cy - box_h/2 + Inches(0.06),
             box_w - Inches(0.2), Pt(14),
             f"{i+1:02d}", 9, color, True, th["font"])

        # 레이블
        label = step.get("label", step if isinstance(step, str) else "")
        tbox(slide, bx + Inches(0.12), cy - box_h/2 + Inches(0.28),
             box_w - Inches(0.24), Inches(0.55),
             label, 12, th["text"], True, th["font"])

        # 서브텍스트
        sub = step.get("sub", "") if isinstance(step, dict) else ""
        if sub:
            tbox(slide, bx + Inches(0.12), cy - box_h/2 + Inches(0.72),
                 box_w - Inches(0.24), Inches(0.22),
                 sub, 9, th["dim"], False, th["font"])

        # 화살표 (마지막 박스 제외)
        if i < n - 1:
            ax = bx + box_w + Pt(4)
            ay = cy
            # 화살표 몸통
            add_rect(slide, ax, ay - Pt(1), arrow_w - Pt(8), Pt(2), th["metal"])
            # 화살표 헤드 (삼각형 근사: 작은 박스들로)
            tip_x = ax + arrow_w - Pt(10)
            for k in range(4):
                sz = Pt(2 + k*2)
                add_rect(slide, tip_x + k*Pt(2), ay - sz/2, Pt(2), sz, th["metal"])

def slide_timeline(prs, content, th):
    """
    수직 타임라인 — 실제 도형 기반
    content = {"headline": "...", "events": [{"date": "...", "title": "...", "desc": "..."}]}
    """
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    events = content.get("events", content.get("items", []))

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    n = min(len(events), 5)
    if n == 0: return

    line_x = MX + Inches(1.5)
    y_start = MY + Inches(1.0)
    y_end   = H - MY - Inches(0.2)
    step_h  = (y_end - y_start) / n

    # 수직 라인
    vline(slide, line_x, y_start, y_end - y_start, th["rule"], 1.0)

    accent_colors = [th["accent"], th["positive"], th["accent2"], th["warn"], th["metal"]]

    for i, evt in enumerate(events[:n]):
        cy = y_start + step_h * i + step_h / 2
        color = accent_colors[i % len(accent_colors)]

        # 도트 (원형 마커)
        dot_r = Inches(0.09)
        add_rect(slide, line_x - dot_r, cy - dot_r, dot_r*2, dot_r*2,
                 color, color, 0, 0.5)

        # 날짜 (왼쪽)
        date = evt.get("date", evt.get("period", "")) if isinstance(evt, dict) else ""
        tbox(slide, MX, cy - Inches(0.2), Inches(1.2), Inches(0.4),
             date, 10, th["metal"], False, th["font"], PP_ALIGN.RIGHT)

        # 이벤트 제목 (오른쪽)
        title = evt.get("title", evt if isinstance(evt, str) else "") if isinstance(evt, dict) else str(evt)
        desc  = evt.get("desc", evt.get("description", "")) if isinstance(evt, dict) else ""

        tbox(slide, line_x + Inches(0.2), cy - Inches(0.22),
             CW - Inches(1.9), Inches(0.32),
             title, 14, th["text"], True, th["font"])
        if desc:
            tbox(slide, line_x + Inches(0.2), cy + Inches(0.1),
                 CW - Inches(1.9), Inches(0.28),
                 desc, 11, th["dim"], False, th["font"])

def slide_bar_chart(prs, content, th):
    """실제 python-pptx 차트 (편집 가능)"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "")
    categories = content.get("categories", [])
    series = content.get("series", [])
    source = content.get("source", "")

    tbox(slide, MX, MY, CW, Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    if not categories or not series: return

    chart_data = CategoryChartData()
    chart_data.categories = categories
    for s in series:
        chart_data.add_series(s.get("name",""), s.get("values",[]))

    chart_type = XL_CHART_TYPE.BAR_CLUSTERED if content.get("horizontal") else XL_CHART_TYPE.COLUMN_CLUSTERED

    chart_h = H - (MY + Inches(0.9)) - MY - (Inches(0.3) if source else 0)
    chart_frame = slide.shapes.add_chart(
        chart_type, MX, MY + Inches(0.85), CW, chart_h, chart_data
    )
    chart = chart_frame.chart
    chart.has_legend = len(series) > 1
    chart.has_title = False

    if source:
        tbox(slide, MX, H - MY - Pt(14), CW, Pt(14),
             f"출처: {source}", 9, th["dim2"], False, th["font"])

def slide_quote(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    quote = content.get("quote", "")
    attribution = content.get("attribution", "")

    # 인용 마크 (대형)
    tbox(slide, MX, MY, Inches(1), Inches(1.5),
         "\u201c", 80, th["rule"], True, th["font_display"])

    # 인용 바
    vline(slide, MX + Inches(0.12), MY + Inches(0.4), Inches(2.5), th["metal"], 2.5)

    # 인용문
    tbox(slide, MX + Inches(0.4), H/2 - Inches(1.2), CW * 0.85, Inches(2.2),
         quote, 22, th["text"], False, th["font_display"], PP_ALIGN.LEFT,
         MSO_ANCHOR.MIDDLE, italic=True)

    if attribution:
        hline(slide, MX + Inches(0.4), H/2 + Inches(0.9), Inches(2.5), th["metal"], 0.4)
        tbox(slide, MX + Inches(0.4), H/2 + Inches(1.0), CW * 0.6, Pt(18),
             f"— {attribution}", 12, th["dim"], False, th["font"])

def slide_closing(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "감사합니다")
    contact  = content.get("contact", "")
    note     = content.get("note", "")

    add_rect(slide, MX, MY, Pt(3), H - 2*MY, th["accent"])

    L = MX + Inches(0.35)
    tbox(slide, L, H/2 - Inches(1.0), CW * 0.8, Inches(1.2),
         headline, 38, th["text"], True, th["font_display"])

    hline(slide, L, H/2 + Inches(0.3), CW * 0.6, th["metal"], 0.5)

    if contact:
        tbox(slide, L, H/2 + Inches(0.5), CW * 0.8, Pt(20),
             contact, 13, th["dim"], False, th["font"])
    if note:
        tbox(slide, L, H/2 + Inches(0.85), CW * 0.8, Pt(16),
             note, 11, th["dim2"], False, th["font"])

def slide_agenda(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])

    headline = content.get("headline", "목차")
    items    = content.get("items", [])

    tbox(slide, MX, MY, Inches(3), Inches(0.6),
         headline, 22, th["text"], True, th["font_display"])
    hline(slide, MX, MY + Inches(0.58), CW, th["metal"], 0.4)

    n = min(len(items), 6)
    col_w = (CW - Inches(0.3)) / 2 if n > 3 else CW
    rows = (n + 1) // 2 if n > 3 else n
    item_h = (H - MY - Inches(1.1)) / rows

    for i, item in enumerate(items[:n]):
        col = i // rows if n > 3 else 0
        row = i % rows
        ix = MX + col * (col_w + Inches(0.3))
        iy = MY + Inches(0.9) + row * item_h

        # 번호 박스
        num_w = Inches(0.45)
        add_rect(slide, ix, iy + Inches(0.1), num_w, Inches(0.38),
                 th["surface"], th["accent"], 0.5)
        tbox(slide, ix, iy + Inches(0.1), num_w, Inches(0.38),
             f"{i+1:02d}", 12, th["accent2"], True, th["font"], PP_ALIGN.CENTER,
             MSO_ANCHOR.MIDDLE)

        tbox(slide, ix + num_w + Inches(0.12), iy + Inches(0.08),
             col_w - num_w - Inches(0.15), Inches(0.42),
             item, 15, th["dim"], False, th["font"])

        hline(slide, ix, iy + item_h - Pt(4), col_w, th["rule"], 0.3)


# ── 슬라이드 디스패처 ─────────────────────────────────────────
BUILDERS = {
    "cover":            slide_cover,
    "section_break":    slide_section_break,
    "agenda":           slide_agenda,
    "bullets":          slide_bullets,
    "single":           slide_bullets,
    "two_column":       slide_two_column,
    "stats_grid":       slide_stats_grid,
    "data_table":       slide_data_table,
    "flow_diagram":     slide_flow_diagram,
    "timeline":         slide_timeline,
    "bar_chart":        slide_bar_chart,
    "quote":            slide_quote,
    "closing":          slide_closing,
}


def build_deck(spec: dict, theme_key: str = None, output_path: str = None) -> str:
    meta    = spec.get("meta", {})
    slides  = spec.get("slides", [])
    t_key   = theme_key or meta.get("theme", "dark_editorial")
    th      = THEMES.get(t_key, THEMES["dark_editorial"])
    out     = output_path or "output.pptx"

    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H

    for s in slides:
        layout = s.get("layout", "bullets")
        builder = BUILDERS.get(layout)
        if builder:
            builder(prs, s, th)
        else:
            slide_bullets(prs, s, th)

    prs.save(out)
    return out


# ── CLI ──────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="A-Team PPT Generator v2")
    p.add_argument("spec", help="JSON spec 파일 경로")
    p.add_argument("--theme", default=None,
                   choices=["dark_editorial","consulting_clean","executive_deep"])
    p.add_argument("--output", default=None, help="출력 .pptx 경로")
    args = p.parse_args()

    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)

    out = build_deck(spec, args.theme, args.output)
    print(f"생성 완료: {out}")
    print(f"슬라이드: {len(spec.get('slides',[]))}장 / 테마: {args.theme or spec.get('meta',{}).get('theme','dark_editorial')}")
