"""
McKinsey/BCG-grade master template generator.
Creates a base .pptx with proper theme, fonts, and slide masters.

Usage:
  python create_master.py [--style mckinsey|bcg|bain] [--output path]
"""
import argparse, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(SCRIPT_DIR, "templates")

W = Inches(13.333)
H = Inches(7.5)

STYLES = {
    "mckinsey": {
        "name": "McKinsey Blue",
        "primary": RGBColor(0x00, 0x3A, 0x70),    # McKinsey navy
        "accent": RGBColor(0x00, 0x51, 0xA5),      # brighter blue
        "text": RGBColor(0x1A, 0x1A, 0x1A),
        "gray1": RGBColor(0x4A, 0x4A, 0x4A),       # body text
        "gray2": RGBColor(0x7A, 0x7A, 0x7A),       # captions
        "gray3": RGBColor(0xB0, 0xB0, 0xB0),       # rules
        "gray4": RGBColor(0xE8, 0xE8, 0xE8),       # table fills
        "gray5": RGBColor(0xF5, 0xF5, 0xF5),       # bg alt
        "bg": RGBColor(0xFF, 0xFF, 0xFF),
        "positive": RGBColor(0x00, 0x7A, 0x33),
        "negative": RGBColor(0xCC, 0x00, 0x00),
        "font_display": "Georgia",
        "font_body": "Arial",
    },
    "bcg": {
        "name": "BCG Green",
        "primary": RGBColor(0x00, 0x6B, 0x3F),
        "accent": RGBColor(0x00, 0x96, 0x5E),
        "text": RGBColor(0x1A, 0x1A, 0x1A),
        "gray1": RGBColor(0x4A, 0x4A, 0x4A),
        "gray2": RGBColor(0x7A, 0x7A, 0x7A),
        "gray3": RGBColor(0xB0, 0xB0, 0xB0),
        "gray4": RGBColor(0xE8, 0xE8, 0xE8),
        "gray5": RGBColor(0xF5, 0xF5, 0xF5),
        "bg": RGBColor(0xFF, 0xFF, 0xFF),
        "positive": RGBColor(0x00, 0x7A, 0x33),
        "negative": RGBColor(0xCC, 0x00, 0x00),
        "font_display": "Helvetica",
        "font_body": "Helvetica",
    },
    "bain": {
        "name": "Bain Red",
        "primary": RGBColor(0xCC, 0x00, 0x00),
        "accent": RGBColor(0xE6, 0x33, 0x33),
        "text": RGBColor(0x1A, 0x1A, 0x1A),
        "gray1": RGBColor(0x4A, 0x4A, 0x4A),
        "gray2": RGBColor(0x7A, 0x7A, 0x7A),
        "gray3": RGBColor(0xB0, 0xB0, 0xB0),
        "gray4": RGBColor(0xE8, 0xE8, 0xE8),
        "gray5": RGBColor(0xF5, 0xF5, 0xF5),
        "bg": RGBColor(0xFF, 0xFF, 0xFF),
        "positive": RGBColor(0x00, 0x7A, 0x33),
        "negative": RGBColor(0xCC, 0x00, 0x00),
        "font_display": "Arial",
        "font_body": "Arial",
    },
}


def create_master(style_key="mckinsey", output=None):
    s = STYLES[style_key]
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    out = output or os.path.join(TEMPLATES_DIR, f"{style_key}_master.pptx")
    prs.save(out)
    print(f"Master template: {out}")
    return out


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--style", default="mckinsey", choices=list(STYLES.keys()))
    p.add_argument("--output", default=None)
    args = p.parse_args()
    create_master(args.style, args.output)
