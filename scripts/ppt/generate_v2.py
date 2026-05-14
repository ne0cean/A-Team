"""
A-Team PPT Engine v2 — 실제 편집 가능 .pptx 생성기
PHY041/claude-skill-slide-kit 패턴 기반 + 한국어 최적화

슬라이드 타입:
  구조: cover, section_break, agenda, closing
  콘텐츠: bullets/single, two_column, stats_grid, data_table, quote
  도식화: flow_diagram, timeline, bar_chart

테마: dark_editorial, consulting_clean, executive_deep

규칙:
  - 모든 텍스트 수직 정렬: 중간(MIDDLE)
  - 도형 안에 텍스트 직접 삽입 (textbox 중복 금지)
  - 최소 폰트 사이즈: 12pt
  - 텍스트 겹침 금지 (Y축 좌표 엄격 관리)

사용:
  python generate_v2.py spec.json
  python generate_v2.py spec.json --theme consulting_clean --output out.pptx
"""
import sys, json, argparse
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

RECT   = MSO_SHAPE.RECTANGLE
RRECT  = MSO_SHAPE.ROUNDED_RECTANGLE
OVAL   = MSO_SHAPE.OVAL
RARROW = MSO_SHAPE.RIGHT_ARROW

# ── 슬라이드 규격 (16:9) ─────────────────────────────────────
W  = Inches(13.333)
H  = Inches(7.5)
MX = Inches(0.75)
MY = Inches(0.6)
CW = W - 2 * MX

# ── 테마 ─────────────────────────────────────────────────────
def rgb(h):
    h = h.lstrip('#')
    return RGBColor(int(h[0:2],16), int(h[2:4],16), int(h[4:6],16))

THEMES = {
    "dark_editorial": {
        "bg": rgb("111116"), "surface": rgb("1a1a22"), "surface2": rgb("222228"),
        "text": rgb("e8e4dc"), "dim": rgb("8a8680"), "dim2": rgb("5a5858"),
        "metal": rgb("a89878"), "rule": rgb("2a2a30"),
        "accent": rgb("4a7fa8"), "accent2": rgb("6a9fc8"),
        "positive": rgb("4a8060"), "negative": rgb("8a4040"), "warn": rgb("a89048"),
        "font": "Malgun Gothic", "font_display": "Malgun Gothic",
    },
    "consulting_clean": {
        "bg": rgb("f5f0e6"), "surface": rgb("ffffff"), "surface2": rgb("f0ebe0"),
        "text": rgb("1a1814"), "dim": rgb("5a5248"), "dim2": rgb("9a9088"),
        "metal": rgb("8a7860"), "rule": rgb("d8d0c4"),
        "accent": rgb("1d4e8a"), "accent2": rgb("2d6eaa"),
        "positive": rgb("2a5e30"), "negative": rgb("8a2020"), "warn": rgb("8a6020"),
        "font": "Malgun Gothic", "font_display": "Malgun Gothic",
    },
    "executive_deep": {
        "bg": rgb("0c0a09"), "surface": rgb("18140e"), "surface2": rgb("22180e"),
        "text": rgb("f0ead8"), "dim": rgb("8a7a68"), "dim2": rgb("604838"),
        "metal": rgb("b8986a"), "rule": rgb("2a2018"),
        "accent": rgb("9f1239"), "accent2": rgb("c8304a"),
        "positive": rgb("1a5c3a"), "negative": rgb("8a1818"), "warn": rgb("8a6018"),
        "font": "Malgun Gothic", "font_display": "Malgun Gothic",
    },
}

MIN_FONT = 12  # 최소 폰트 사이즈 (pt)

def fs(size):
    """최소 폰트 보장 헬퍼."""
    return max(size, MIN_FONT)


# ── 프리미티브 ────────────────────────────────────────────────

def paint_bg(slide, color):
    f = slide.background.fill
    f.solid(); f.fore_color.rgb = color


def shape_text(slide, l, t, w, h, text,
               size=14, color=None, bold=False, font="Malgun Gothic",
               h_align=PP_ALIGN.LEFT, v_align=MSO_ANCHOR.MIDDLE,
               fill=None, border=None, bw=0.5,
               shape_type=RECT, italic=False, wrap=True):
    """
    도형을 그리고 그 안에 텍스트를 삽입.
    fill=None → 투명 배경 (선 없음)
    fill=색상 → 채운 도형
    """
    s = slide.shapes.add_shape(shape_type, l, t, w, h)

    if fill is not None:
        s.fill.solid(); s.fill.fore_color.rgb = fill
    else:
        s.fill.background()

    if border is not None:
        s.line.color.rgb = border; s.line.width = Pt(bw)
    else:
        s.line.fill.background()

    s.shadow.inherit = False

    tf = s.text_frame
    tf.word_wrap = wrap
    tf.margin_left   = Emu(114300)
    tf.margin_right  = Emu(114300)
    tf.margin_top    = Emu(45720)
    tf.margin_bottom = Emu(45720)
    tf.vertical_anchor = v_align

    p = tf.paragraphs[0]
    p.alignment = h_align
    r = p.add_run()
    r.text = text
    r.font.size = Pt(fs(size))
    r.font.bold = bold
    r.font.italic = italic
    r.font.name = font
    if color:
        r.font.color.rgb = color

    return s


def shape_multiline(slide, l, t, w, h, lines,
                    size=14, color=None, bold=False, font="Malgun Gothic",
                    h_align=PP_ALIGN.LEFT, v_align=MSO_ANCHOR.MIDDLE,
                    fill=None, border=None, bw=0.5, shape_type=RECT,
                    line_spacing=None, italic=False):
    """여러 줄 텍스트를 도형 안에 삽입."""
    s = slide.shapes.add_shape(shape_type, l, t, w, h)

    if fill is not None:
        s.fill.solid(); s.fill.fore_color.rgb = fill
    else:
        s.fill.background()

    if border is not None:
        s.line.color.rgb = border; s.line.width = Pt(bw)
    else:
        s.line.fill.background()

    s.shadow.inherit = False

    tf = s.text_frame
    tf.word_wrap = True
    tf.margin_left   = Emu(114300)
    tf.margin_right  = Emu(114300)
    tf.margin_top    = Emu(45720)
    tf.margin_bottom = Emu(45720)
    tf.vertical_anchor = v_align

    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = h_align
        if line_spacing:
            p.line_spacing = line_spacing

        if isinstance(line, list):  # [(text, color, bold), ...]
            for seg in line:
                r = p.add_run()
                r.text = seg[0]
                r.font.size = Pt(fs(seg[2] if len(seg) > 2 else size))
                r.font.color.rgb = seg[1] if seg[1] else (color or RGBColor(0,0,0))
                r.font.bold = seg[3] if len(seg) > 3 else bold
                r.font.italic = italic
                r.font.name = font
        else:
            r = p.add_run()
            r.text = str(line)
            r.font.size = Pt(fs(size))
            r.font.bold = bold
            r.font.italic = italic
            r.font.name = font
            if color:
                r.font.color.rgb = color

    return s


def solid_rect(slide, l, t, w, h, fill, border=None, bw=0.5):
    """텍스트 없는 순수 색상 박스."""
    s = slide.shapes.add_shape(RECT, l, t, w, h)
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border; s.line.width = Pt(bw)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def solid_rrect(slide, l, t, w, h, fill, border=None, bw=1.0):
    """텍스트 없는 순수 색상 둥근 박스."""
    s = slide.shapes.add_shape(RRECT, l, t, w, h)
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border; s.line.width = Pt(bw)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
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


def oval_dot(slide, cx, cy, r, fill):
    """중심 좌표, 반지름 r 기준 원 도형."""
    s = slide.shapes.add_shape(OVAL, cx - r, cy - r, r*2, r*2)
    s.fill.solid(); s.fill.fore_color.rgb = fill
    s.line.fill.background(); s.shadow.inherit = False
    return s


# ── 슬라이드 빌더 ─────────────────────────────────────────────

def slide_cover(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    # 좌측 강조 바
    solid_rect(slide, MX, MY, Pt(3), H - 2*MY, th["accent"])
    L = MX + Inches(0.35)

    # 레이블 (kicker)
    kicker = content.get("label", content.get("kicker", "")).upper()
    if kicker:
        shape_text(slide, L, MY + Inches(0.05), CW - Inches(0.5), Inches(0.42),
                   kicker, 12, th["metal"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 타이틀 (멀티라인)
    title = content.get("headline", content.get("title", ""))
    lines = title.split("\n")
    shape_multiline(slide, L, MY + Inches(0.52), CW - Inches(0.8), Inches(2.7),
                    lines, 40, th["text"], True, th["font_display"],
                    PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE, line_spacing=1.15)

    # 부제목
    subtitle = content.get("subtitle", content.get("subheadline", ""))
    if subtitle:
        shape_text(slide, L, MY + Inches(3.1), CW - Inches(0.8), Inches(0.56),
                   subtitle, 17, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 구분선
    hline(slide, L, H - MY - Inches(1.15), CW - Inches(0.4), th["metal"], 0.5)

    # 메타
    meta = content.get("meta", "")
    if meta:
        shape_text(slide, L, H - MY - Inches(1.0), CW - Inches(0.4), Inches(0.42),
                   meta, 12, th["dim2"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 태그
    tags = content.get("tags", [])
    tx = L
    ty = H - MY - Inches(0.48)
    for tag in tags[:4]:
        tw = Inches(max(1.4, len(tag) * 0.15 + 0.5))
        shape_text(slide, tx, ty, tw, Inches(0.38),
                   tag.upper(), 12, th["accent2"], True, F,
                   PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE,
                   th["surface"], th["accent"], 0.5)
        tx += tw + Inches(0.12)


def slide_section_break(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    num = content.get("section_number", "01")

    # 워터마크 번호
    shape_text(slide, MX - Inches(0.15), H/2 - Inches(2.2), Inches(4.5), Inches(3.5),
               num, 140, th["rule"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # Section 레이블
    shape_text(slide, MX + Inches(0.1), H/2 - Inches(0.72), Inches(4), Inches(0.42),
               f"Section {num}", 12, th["metal"], False, F,
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    hline(slide, MX + Inches(0.1), H/2 - Inches(0.22), CW * 0.55, th["metal"], 0.5)

    # 헤드라인
    shape_text(slide, MX + Inches(0.1), H/2 - Inches(0.15), CW * 0.7, Inches(1.0),
               content.get("headline", ""), 30, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 설명
    desc = content.get("description", "")
    if desc:
        shape_text(slide, MX + Inches(0.1), H/2 + Inches(0.78), CW * 0.65, Inches(0.48),
                   desc, 14, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_bullets(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    headline = content.get("headline", "")
    bullets  = content.get("bullets", [])
    source   = content.get("source", "")

    # 헤드라인
    shape_text(slide, MX, MY, CW, Inches(0.65),
               headline, 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.63), CW, th["metal"], 0.4)

    src_h  = Inches(0.4) if source else 0
    avail  = H - (MY + Inches(0.88)) - MY - src_h
    row_h  = min(Inches(0.62), avail / max(len(bullets), 1))
    y      = MY + Inches(0.88)

    for bullet in bullets[:6]:
        # 마커
        oval_dot(slide, MX + Inches(0.1), y + row_h / 2,
                 Inches(0.055), th["metal"])
        shape_text(slide, MX + Inches(0.28), y, CW - Inches(0.32), row_h,
                   bullet, 15, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
        y += row_h

    if source:
        shape_text(slide, MX, H - MY - Inches(0.36), CW, Inches(0.36),
                   f"출처: {source}", 12, th["dim2"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_two_column(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    left  = content.get("left", {})
    right = content.get("right", {})

    # 헤드라인
    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    col_w   = (CW - Inches(0.28)) / 2
    col_r   = MX + col_w + Inches(0.28)
    y_start = MY + Inches(0.82)
    col_h   = H - y_start - MY

    PAD = Inches(0.2)

    for cx, side, accent in [(MX, left, th["accent"]), (col_r, right, th["accent2"])]:
        # 패널 배경 + 상단 컬러 바
        solid_rect(slide, cx, y_start, col_w, col_h, th["surface"], th["rule"], 0.5)
        solid_rect(slide, cx, y_start, col_w, Pt(3), accent)

        # 타이틀
        title_h = Inches(0.42)
        shape_text(slide, cx + PAD, y_start + Inches(0.14),
                   col_w - PAD*2, title_h,
                   side.get("title", "").upper(), 12, th["metal"], True, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
        hline(slide, cx + PAD, y_start + Inches(0.14) + title_h + Inches(0.04),
              col_w - PAD*2, th["rule"], 0.35)

        row_h  = Inches(0.54)
        by     = y_start + Inches(0.14) + title_h + Inches(0.12)
        for b in side.get("bullets", [])[:5]:
            oval_dot(slide, cx + PAD + Inches(0.075), by + row_h / 2,
                     Inches(0.05), accent)
            shape_text(slide, cx + PAD + Inches(0.2), by,
                       col_w - PAD - Inches(0.24), row_h,
                       b, 13, th["dim"], False, F,
                       PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
            by += row_h


def slide_stats_grid(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    stats = content.get("stats", [])
    n = min(len(stats), 4)

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    if not n: return
    card_w = (CW - Inches(0.18) * (n-1)) / n
    y0   = MY + Inches(0.85)
    c_h  = H - y0 - MY - Inches(0.05)
    accents = [th["accent"], th["positive"], th["warn"], th["accent2"]]

    for i, stat in enumerate(stats[:n]):
        cx  = MX + i * (card_w + Inches(0.18))
        col = accents[i % 4]

        # 카드
        solid_rect(slide, cx, y0, card_w, c_h, th["surface"], th["rule"], 0.5)
        solid_rect(slide, cx, y0, card_w, Pt(3), col)

        # 레이블
        lbl_t = y0 + Inches(0.2)
        lbl_h = Inches(0.4)
        shape_text(slide, cx, lbl_t, card_w, lbl_h,
                   stat.get("label", "").upper(), 12, th["metal"], False, F,
                   PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)

        # 주요 수치
        val_lines = stat.get("value", "").split("\n")
        val_t = lbl_t + lbl_h + Inches(0.05)
        val_h = Inches(1.45)
        shape_multiline(slide, cx, val_t, card_w, val_h,
                        val_lines, 36, th["text"], True, th["font_display"],
                        PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE, line_spacing=1.1)

        # 델타
        delta   = stat.get("delta", "")
        delta_t = val_t + val_h + Inches(0.05)
        delta_h = Inches(0.42)
        if delta:
            d_col = th["positive"] if delta.startswith("+") else (
                    th["negative"] if delta.startswith("-") else th["dim"])
            shape_text(slide, cx, delta_t, card_w, delta_h,
                       delta, 13, d_col, True, F,
                       PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)

        # 노트
        note   = stat.get("note", "")
        note_t = max(delta_t + delta_h + Inches(0.05), y0 + c_h - Inches(0.48))
        if note:
            shape_text(slide, cx, note_t, card_w, Inches(0.45),
                       note, 12, th["dim"], False, F,
                       PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)


def slide_data_table(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    tdata   = content.get("table", {})
    headers = tdata.get("headers", [])
    rows    = tdata.get("rows", [])
    hl_col  = tdata.get("highlight_col", -1)
    source  = content.get("source", "")

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    if not headers or not rows: return

    nc    = len(headers)
    nr    = len(rows)
    src_h = Inches(0.38) if source else 0
    avail = H - (MY + Inches(0.85)) - MY - src_h
    row_h = min(Inches(0.54), avail / (nr + 1))
    col_w = CW / nc
    t_top = MY + Inches(0.82)

    # 헤더
    solid_rect(slide, MX, t_top, CW, row_h, th["surface2"], th["rule"], 0.3)
    hline(slide, MX, t_top + row_h - Pt(0.4), CW, th["metal"], 0.6)
    for j, h_text in enumerate(headers):
        is_hl = (j == hl_col)
        shape_text(slide, MX + j*col_w, t_top, col_w, row_h,
                   h_text, 12,
                   th["accent2"] if is_hl else th["metal"],
                   True, F, PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    # 데이터 행
    for i, row in enumerate(rows[:12]):
        ry = t_top + row_h * (i + 1)
        bg = th["surface"] if i % 2 == 0 else th["bg"]
        solid_rect(slide, MX, ry, CW, row_h, bg, th["rule"], 0.2)
        for j, cell in enumerate(row[:nc]):
            is_hl = (j == hl_col)
            shape_text(slide, MX + j*col_w, ry, col_w, row_h,
                       str(cell), 12,
                       th["text"] if is_hl else th["dim"],
                       is_hl, F, PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    if source:
        sy = t_top + row_h * (len(rows[:12]) + 1) + Inches(0.08)
        shape_text(slide, MX, sy, CW, Inches(0.36),
                   f"출처: {source}", 12, th["dim2"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_flow_diagram(prs, content, th):
    """실제 도형 + 화살표 프로세스 플로우 (최대 6단계)
    인간적인 느낌: 둥근 사각형 + RIGHT_ARROW 도형"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    steps = content.get("steps", [])
    n = min(len(steps), 6)

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    if not n: return

    # ── 박스 + 화살표 크기 계산
    arr_w   = Inches(0.32)
    arr_h   = Inches(0.36)
    box_h   = Inches(1.7)
    total_w = n * ((CW - (n-1)*arr_w) / n) + (n-1) * arr_w
    box_w   = (CW - (n-1)*arr_w) / n
    # 박스가 너무 넓으면 적정 크기로 제한
    if box_w > Inches(2.2):
        box_w   = Inches(2.2)
        total_w = n * box_w + (n-1) * arr_w
    start_x = MX + (CW - total_w) / 2
    cy      = MY + Inches(0.82) + (H - MY - Inches(0.82) - MY) / 2

    accents = [th["accent"], th["positive"], th["warn"],
               th["accent2"], th["metal"], th["dim"]]

    for i, step in enumerate(steps[:n]):
        bx  = start_x + i * (box_w + arr_w)
        col = accents[i % len(accents)]
        label = step.get("label", step) if isinstance(step, dict) else str(step)
        sub   = step.get("sub", "") if isinstance(step, dict) else ""

        # ── 박스 (둥근 사각형 배경 + 테두리)
        solid_rrect(slide, bx, cy - box_h/2, box_w, box_h, th["surface"], col, 1.5)
        # 상단 컬러 바
        solid_rect(slide, bx, cy - box_h/2, box_w, Pt(4), col)

        # ── 번호 뱃지 (원형)
        badge_r = Inches(0.16)
        badge_cx = bx + box_w - badge_r - Inches(0.1)
        badge_cy = cy - box_h/2 + badge_r + Inches(0.1)
        oval_dot(slide, badge_cx, badge_cy, badge_r, col)
        shape_text(slide, badge_cx - badge_r, badge_cy - badge_r,
                   badge_r*2, badge_r*2,
                   str(i+1), 12, th["bg"], True, F,
                   PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)

        # ── 레이블 텍스트 영역 (박스 중앙, 겹침 방지)
        label_t = cy - box_h/2 + Inches(0.18)
        label_h = Inches(0.9) if sub else Inches(1.15)
        shape_text(slide, bx + Inches(0.1), label_t, box_w - Inches(0.2), label_h,
                   label, 13, th["text"], True, F,
                   PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE, wrap=True)

        # ── 서브텍스트 (레이블 아래, 겹침 없음)
        if sub:
            sub_t = label_t + label_h + Inches(0.04)
            sub_h = cy + box_h/2 - sub_t - Inches(0.1)
            if sub_h > Inches(0.3):
                shape_text(slide, bx + Inches(0.1), sub_t,
                           box_w - Inches(0.2), sub_h,
                           sub, 12, th["dim"], False, F,
                           PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE, wrap=True)

        # ── 화살표 (RIGHT_ARROW 도형, 마지막 제외)
        if i < n - 1:
            ax = bx + box_w + Inches(0.02)
            aw = arr_w - Inches(0.04)
            s  = slide.shapes.add_shape(RARROW, ax, cy - arr_h/2, aw, arr_h)
            s.fill.solid(); s.fill.fore_color.rgb = th["metal"]
            s.line.fill.background(); s.shadow.inherit = False
            # 화살촉 비율 조정
            try:
                s.adjustments[0] = 0.5   # 화살촉 길이 (0=전체 화살촉, 1=없음)
                s.adjustments[1] = 0.35  # 화살촉 폭
            except Exception:
                pass


def slide_timeline(prs, content, th):
    """수직 타임라인 — 둥근 뱃지 + 실제 도형 기반"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    events = content.get("events", content.get("items", []))
    n      = min(len(events), 5)

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    if not n: return

    # ── 레이아웃 기준점
    date_w  = Inches(1.3)
    line_x  = MX + date_w + Inches(0.25)
    content_x = line_x + Inches(0.38)
    content_w = CW - date_w - Inches(0.65)

    y0     = MY + Inches(0.88)
    y_end  = H - MY - Inches(0.2)
    step_h = (y_end - y0) / n
    accents = [th["accent"], th["positive"], th["accent2"], th["warn"], th["metal"]]

    # 수직 라인
    vline(slide, line_x, y0 + Inches(0.08), y_end - y0 - Inches(0.08),
          th["rule"], 1.5)

    for i, evt in enumerate(events[:n]):
        cy  = y0 + step_h * i + step_h / 2
        col = accents[i % len(accents)]

        # ── 도트 마커 (채운 원)
        dot_r = Inches(0.1)
        oval_dot(slide, line_x, cy, dot_r, col)
        # 도트 외곽 링
        s = slide.shapes.add_shape(OVAL,
                                    line_x - dot_r - Pt(1.5),
                                    cy     - dot_r - Pt(1.5),
                                    dot_r*2 + Pt(3),
                                    dot_r*2 + Pt(3))
        s.fill.background()
        s.line.color.rgb = col; s.line.width = Pt(1.0); s.shadow.inherit = False

        # ── 날짜 레이블 (좌측, 도형 내부)
        date = evt.get("date", evt.get("period", "")) if isinstance(evt, dict) else ""
        date_h = Inches(0.44)
        shape_text(slide, MX, cy - date_h/2, date_w, date_h,
                   date, 12, th["metal"], True, F,
                   PP_ALIGN.RIGHT, MSO_ANCHOR.MIDDLE)

        # ── 제목 + 설명 (우측, 겹침 없음)
        title = evt.get("title", str(evt)) if isinstance(evt, dict) else str(evt)
        desc  = evt.get("desc", evt.get("description", "")) if isinstance(evt, dict) else ""

        max_h = step_h - Inches(0.12)  # 행 높이 내에서
        if desc:
            title_h = Inches(0.38)
            desc_h  = min(Inches(0.38), max_h - title_h - Inches(0.06))
            t_top   = cy - (title_h + Inches(0.04) + desc_h) / 2
            shape_text(slide, content_x, t_top, content_w, title_h,
                       title, 14, th["text"], True, F,
                       PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
            shape_text(slide, content_x, t_top + title_h + Inches(0.04),
                       content_w, desc_h,
                       desc, 12, th["dim"], False, F,
                       PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
        else:
            shape_text(slide, content_x, cy - Inches(0.25), content_w, Inches(0.5),
                       title, 14, th["text"], True, F,
                       PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_bar_chart(prs, content, th):
    """python-pptx 네이티브 차트 (편집 가능)"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    categories = content.get("categories", [])
    series     = content.get("series", [])
    source     = content.get("source", "")

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", ""), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    if not categories or not series: return

    chart_data = CategoryChartData()
    chart_data.categories = categories
    for s in series:
        chart_data.add_series(s.get("name",""), tuple(s.get("values",[])))

    ctype = (XL_CHART_TYPE.BAR_CLUSTERED if content.get("horizontal")
             else XL_CHART_TYPE.COLUMN_CLUSTERED)
    src_h = Inches(0.38) if source else 0
    c_h   = H - (MY + Inches(0.85)) - MY - src_h

    slide.shapes.add_chart(ctype, MX, MY + Inches(0.82), CW, c_h, chart_data)

    if source:
        shape_text(slide, MX, H - MY - Inches(0.36), CW, Inches(0.36),
                   f"출처: {source}", 12, th["dim2"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_quote(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    quote       = content.get("quote", "")
    attribution = content.get("attribution", "")

    # 인용 마크
    shape_text(slide, MX, MY, Inches(1.0), Inches(1.2),
               "\u201c", 72, th["rule"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.TOP)

    # 수직 강조 바
    vline(slide, MX + Inches(0.14), MY + Inches(0.42), Inches(2.5), th["metal"], 2.5)

    # 인용문
    q_lines = quote.split("\n")
    q_top   = H/2 - Inches(1.4)
    q_h     = Inches(2.6)
    shape_multiline(slide, MX + Inches(0.48), q_top, CW * 0.82, q_h,
                    q_lines, 22, th["text"], False, th["font_display"],
                    PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE,
                    line_spacing=1.35, italic=False)

    if attribution:
        attr_t = q_top + q_h + Inches(0.1)
        hline(slide, MX + Inches(0.48), attr_t, Inches(2.5), th["metal"], 0.4)
        shape_text(slide, MX + Inches(0.48), attr_t + Inches(0.1), CW * 0.7, Inches(0.42),
                   f"— {attribution}", 12, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_closing(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    solid_rect(slide, MX, MY, Pt(3), H - 2*MY, th["accent"])
    L = MX + Inches(0.35)

    hl_t = H/2 - Inches(1.15)
    hl_h = Inches(1.1)
    shape_text(slide, L, hl_t, CW * 0.8, hl_h,
               content.get("headline", "감사합니다"), 36, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

    rule_t = hl_t + hl_h + Inches(0.08)
    hline(slide, L, rule_t, CW * 0.55, th["metal"], 0.5)

    y_cur = rule_t + Inches(0.18)
    contact = content.get("contact", "")
    if contact:
        shape_text(slide, L, y_cur, CW * 0.8, Inches(0.44),
                   contact, 13, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
        y_cur += Inches(0.48)

    note = content.get("note", "")
    if note:
        shape_text(slide, L, y_cur, CW * 0.8, Inches(0.44),
                   note, 12, th["dim2"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)


def slide_agenda(prs, content, th):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    paint_bg(slide, th["bg"])
    F = th["font"]

    items = content.get("items", [])
    n     = min(len(items), 8)

    shape_text(slide, MX, MY, CW, Inches(0.62),
               content.get("headline", "목차"), 22, th["text"], True, th["font_display"],
               PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)
    hline(slide, MX, MY + Inches(0.6), CW, th["metal"], 0.4)

    cols    = 2 if n > 4 else 1
    col_w   = (CW - Inches(0.28)) / cols if cols == 2 else CW
    per_col = (n + cols - 1) // cols
    avail_h = H - MY - Inches(1.0) - MY
    item_h  = min(Inches(0.72), avail_h / per_col)
    num_w   = Inches(0.48)

    for i, item in enumerate(items[:n]):
        col = i // per_col
        row = i % per_col
        ix  = MX + col * (col_w + Inches(0.28))
        iy  = MY + Inches(0.9) + row * item_h

        # 번호 박스
        shape_text(slide, ix, iy + Inches(0.05), num_w, item_h - Inches(0.1),
                   f"{i+1:02d}", 13, th["accent2"], True, F,
                   PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE,
                   th["surface"], th["accent"], 0.5)

        # 항목 텍스트
        shape_text(slide, ix + num_w + Inches(0.12), iy + Inches(0.05),
                   col_w - num_w - Inches(0.14), item_h - Inches(0.1),
                   item, 14, th["dim"], False, F,
                   PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

        hline(slide, ix, iy + item_h - Pt(3), col_w, th["rule"], 0.3)


# ── 디스패처 ──────────────────────────────────────────────────
BUILDERS = {
    "cover":         slide_cover,
    "section_break": slide_section_break,
    "agenda":        slide_agenda,
    "bullets":       slide_bullets,
    "single":        slide_bullets,
    "two_column":    slide_two_column,
    "stats_grid":    slide_stats_grid,
    "data_table":    slide_data_table,
    "flow_diagram":  slide_flow_diagram,
    "timeline":      slide_timeline,
    "bar_chart":     slide_bar_chart,
    "quote":         slide_quote,
    "closing":       slide_closing,
}


def build_deck(spec, theme_key=None, output_path=None):
    meta   = spec.get("meta", {})
    slides = spec.get("slides", [])
    t_key  = theme_key or meta.get("theme", "dark_editorial")
    th     = THEMES.get(t_key, THEMES["dark_editorial"])
    out    = output_path or "output.pptx"

    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H

    for s in slides:
        builder = BUILDERS.get(s.get("layout", "bullets"), slide_bullets)
        builder(prs, s, th)

    prs.save(out)
    return out


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="A-Team PPT Generator v2")
    p.add_argument("spec")
    p.add_argument("--theme", default=None,
                   choices=["dark_editorial","consulting_clean","executive_deep"])
    p.add_argument("--output", default=None)
    args = p.parse_args()

    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)

    out = build_deck(spec, args.theme, args.output)
    print(f"생성 완료: {out}")
    print(f"슬라이드: {len(spec.get('slides',[]))}장 / 테마: {args.theme or spec.get('meta',{}).get('theme','dark_editorial')}")
