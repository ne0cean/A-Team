from dataclasses import dataclass, field
from pptx.util import Pt, Inches, Emu
from pptx.dml.color import RGBColor


def rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


@dataclass(frozen=True)
class Palette:
    # McKinsey 2019 rebrand specs (Slideworks/Deckary cross-verified)
    dark_navy: RGBColor = field(default_factory=lambda: rgb("051C2C"))     # official dark bg
    deep_navy: RGBColor = field(default_factory=lambda: rgb("051C2C"))
    bright_blue: RGBColor = field(default_factory=lambda: rgb("2251FF"))   # official primary blue (2019+)
    mid_blue: RGBColor = field(default_factory=lambda: rgb("24477F"))      # legacy logo blue
    light_blue: RGBColor = field(default_factory=lambda: rgb("4FB2E5"))
    royal_blue: RGBColor = field(default_factory=lambda: rgb("005EB8"))    # MBB common corporate blue
    black: RGBColor = field(default_factory=lambda: rgb("000000"))
    white: RGBColor = field(default_factory=lambda: rgb("FFFFFF"))
    text_dark: RGBColor = field(default_factory=lambda: rgb("222222"))     # near-black (MBB common)
    rule_gray: RGBColor = field(default_factory=lambda: rgb("CCCCCC"))     # divider lines
    light_gray: RGBColor = field(default_factory=lambda: rgb("E0E0E0"))
    soft_gray: RGBColor = field(default_factory=lambda: rgb("F5F5F5"))     # light bg
    grid_gray: RGBColor = field(default_factory=lambda: rgb("D0D0D0"))
    footer_gray: RGBColor = field(default_factory=lambda: rgb("666666"))   # captions
    placeholder_gray: RGBColor = field(default_factory=lambda: rgb("999999"))
    status_green: RGBColor = field(default_factory=lambda: rgb("2E7D32"))
    status_amber: RGBColor = field(default_factory=lambda: rgb("F3C13A"))  # MBB common gold
    status_red: RGBColor = field(default_factory=lambda: rgb("C62828"))


@dataclass(frozen=True)
class Typography:
    family: str = "Arial"
    title_size: int = 24
    section_title_size: int = 14
    body_size: int = 12
    small_size: int = 10
    footer_size: int = 9
    chart_label_size: int = 10
    chart_axis_size: int = 10


@dataclass(frozen=True)
class Layout:
    slide_width_in: float = 13.333
    slide_height_in: float = 7.5
    margin_left_in: float = 0.45
    margin_right_in: float = 0.45
    margin_top_in: float = 0.35
    margin_bottom_in: float = 0.3
    title_top_in: float = 0.45
    title_height_in: float = 0.7
    title_underline_top_in: float = 1.15
    body_top_in: float = 1.40
    footer_top_in: float = 7.05
    section_marker_w_in: float = 1.4
    section_marker_h_in: float = 0.3


@dataclass(frozen=True)
class Theme:
    palette: Palette = field(default_factory=Palette)
    typography: Typography = field(default_factory=Typography)
    layout: Layout = field(default_factory=Layout)
    copyright_text: str = ""


# ── McKinsey (default) ────────────────────────────────────────
DEFAULT_THEME = Theme()
MCKINSEY_THEME = DEFAULT_THEME

# ── BCG ───────────────────────────────────────────────────────
BCG_THEME = Theme(
    palette=Palette(
        dark_navy=rgb("003F5C"),       # BCG primary data navy
        deep_navy=rgb("003F5C"),
        bright_blue=rgb("009639"),     # BCG data accent green
        mid_blue=rgb("147B58"),        # BCG brand green (Pantone 341C)
        light_blue=rgb("66BB6A"),
        royal_blue=rgb("005EB8"),
        black=rgb("000000"),
        white=rgb("FFFFFF"),
        text_dark=rgb("222222"),
        rule_gray=rgb("CCCCCC"),
        light_gray=rgb("E0E0E0"),
        soft_gray=rgb("F5F5F5"),
        grid_gray=rgb("D0D0D0"),
        footer_gray=rgb("666666"),
        placeholder_gray=rgb("999999"),
        status_green=rgb("2E7D32"),
        status_amber=rgb("F3C13A"),
        status_red=rgb("C62828"),
    ),
    typography=Typography(family="Arial"),
    copyright_text="",
)

# ── Bain ──────────────────────────────────────────────────────
BAIN_THEME = Theme(
    palette=Palette(
        dark_navy=rgb("1A1A1A"),       # Bain near-black
        deep_navy=rgb("2C2C2C"),
        bright_blue=rgb("CB2026"),     # Bain brand red (Pantone 1795C)
        mid_blue=rgb("8B0000"),        # darker red
        light_blue=rgb("E05555"),
        royal_blue=rgb("CB2026"),
        black=rgb("000000"),
        white=rgb("FFFFFF"),
        text_dark=rgb("222222"),
        rule_gray=rgb("CCCCCC"),
        light_gray=rgb("E0E0E0"),
        soft_gray=rgb("F5F5F5"),
        grid_gray=rgb("D0D0D0"),
        footer_gray=rgb("666666"),
        placeholder_gray=rgb("999999"),
        status_green=rgb("2E7D32"),
        status_amber=rgb("F3C13A"),
        status_red=rgb("C62828"),
    ),
    typography=Typography(family="Arial"),
    copyright_text="",
)

THEMES = {
    "mckinsey": MCKINSEY_THEME,
    "bcg": BCG_THEME,
    "bain": BAIN_THEME,
}
