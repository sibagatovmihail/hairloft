"""Rebuild the HairLoft logo as SVG (text converted to outlines).

Reference: the horizontal lockup on the salon's Instagram posts ("HAIR / LOFT | BY COLLE & ROY",
rose gold on espresso, tagline "MEHR ALS NUR EIN FRISEUR"). Glyph positions are measured from the
post of 30.09.2026; the R's leg runs down to the baseline of LOFT and stands in for the T's bar.

Outline sources (both SIL OFL, only used here, not shipped): Playfair Display, Montserrat.
Put the two variable TTFs into tools/fonts/ (ignored by git), then:

    python3 tools/logo.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(__file__).resolve().parent / "fonts"
OUT = ROOT / "assets"

CAP = 100.0          # cap height of HAIR / LOFT in logo units
ROW2 = 121.0         # top of LOFT (HAIR sits at 0..100)
ROSE_TOP, ROSE_MID, ROSE_LOW = "#F3D9C8", "#E2B8A0", "#C9977B"

serif = TTFont(FONTS / "Playfair.ttf")
sans = instantiateVariableFont(TTFont(FONTS / "Montserrat.ttf"), {"wght": 480})
sans_bold = instantiateVariableFont(TTFont(FONTS / "Montserrat.ttf"), {"wght": 600})


def glyph(font, ch, cap_units, x_left, y_top, width=None):
    """Outline of `ch`, scaled so the font's cap height = cap_units, left bbox edge at x_left.
    `width` stretches the glyph box to the width measured in the original (its face is wider)."""
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(ch)]
    cap = font["OS/2"].sCapHeight
    s = cap_units / cap
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    xmin, _, xmax, _ = bp.bounds
    sx = width / (xmax - xmin) if width else s
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (sx, 0, 0, -s, x_left - xmin * sx, y_top + cap_units)))
    return pen.getCommands(), x_left + (xmax - xmin) * sx


def word(font, text, cap_units, x, y_top, gap):
    """A word set by optical gaps between glyph boxes (logo-style tracking)."""
    paths, right = [], x
    for ch in text:
        if ch == " ":
            x += cap_units * 0.42 + gap
            continue
        d, right = glyph(font, ch, cap_units, x, y_top)
        paths.append(d)
        x = right + gap
    return paths, right


def wordmark():
    """HAIR over LOFT; returns (paths, right edge). (glyph, left edge, width) measured in logo units."""
    p = []
    for ch, x, w in (("H", 0, 79), ("A", 93, 100), ("I", 213, 27)):
        p.append(glyph(serif, ch, CAP, x, 0, w)[0])
    p.append(glyph(serif, "P", CAP, 257, 0, 70)[0])          # R = P + the long leg
    for ch, x, w in (("L", 0, 69), ("O", 85, 105), ("F", 206, 59), ("I", 291, 27)):
        p.append(glyph(serif, ch, CAP, x, ROW2, w)[0])       # the last I is the stem of the T
    # the R's leg: from under the bowl down to the baseline of LOFT
    y0, y1 = 50.5, ROW2 + CAP
    x0, x1, w = 283.0, 374.0, 17.5
    p.append(f"M{x0} {y0}L{x0 + w} {y0}L{x1 + w} {y1}L{x1} {y1}Z")
    return p, x1 + w


def fit(font, text, cap_units, x, y_top, target):
    """Set `text` so that it is exactly `target` wide (tracking solved by bisection)."""
    lo, hi = 0.0, cap_units * 3
    for _ in range(40):
        mid = (lo + hi) / 2
        paths, right = word(font, text, cap_units, x, y_top, mid)
        lo, hi = (mid, hi) if right - x < target else (lo, mid)
    return paths, right, mid


def byline(x, y_tops, cap_units=27.0):
    p, right, gap = fit(sans, "COLLE", cap_units, x, y_tops[1], 146.0)
    for text, y in (("BY", y_tops[0]), ("& ROY", y_tops[2])):
        p += word(sans, text, cap_units, x, y, gap)[0]
    return p, right


def svg(paths, box, extra="", gradient=True, fill=None, bg=None, title="The HairLoft by Colle &amp; Roy"):
    x, y, w, h = box
    fill = fill or "url(#rg)"
    defs = (f'<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{ROSE_TOP}"/><stop offset=".5" stop-color="{ROSE_MID}"/>'
            f'<stop offset="1" stop-color="{ROSE_LOW}"/></linearGradient></defs>') if gradient else ""
    back = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{defs}{back}<g fill="{fill}"><path d="{" ".join(paths)}"/>{extra}</g></svg>\n')


def build():
    OUT.mkdir(exist_ok=True)
    wm, wm_right = wordmark()
    total_h = ROW2 + CAP

    # horizontal lockup: wordmark | divider | BY COLLE & ROY
    div_x = 449.0
    by, by_right = byline(div_x + 53, (41, 91, 142))
    divider = f'<rect x="{div_x}" y="-9" width="2.4" height="{total_h + 9}"/>'
    pad = 4
    box = (-pad, -9 - pad, by_right + 2 * pad, total_h + 9 + 2 * pad)
    (OUT / "logo.svg").write_text(svg(wm + by, box, divider))
    (OUT / "logo-ink.svg").write_text(svg(wm + by, box, divider, gradient=False, fill="#1E1411"))

    # framed lockup with the tagline (footer), as on the salon's posts
    fx0, fy0, fx1, fy1 = -62.0, -72.0, by_right + 62, total_h + 54
    t = 2.4
    frame = (f'<path fill-rule="evenodd" d="M{fx0} {fy0}H{fx1}V{fy1}H{fx0}Z'
             f'M{fx0 + t} {fy0 + t}V{fy1 - t}H{fx1 - t}V{fy0 + t}Z"/>')
    tag, tag_right, _ = fit(sans_bold, "MEHR ALS NUR EIN FRISEUR", 15.0, 0, 0, (fx1 - fx0) * 0.87)
    shift = (fx0 + fx1) / 2 - tag_right / 2
    tagline = f'<path transform="translate({shift:.2f} {fy1 + 26})" d="{" ".join(tag)}"/>'
    box = (fx0 - 2, fy0 - 2, fx1 - fx0 + 4, fy1 - fy0 + 26 + 15 + 6)
    (OUT / "logo-framed.svg").write_text(svg(wm + by, box, divider + frame + tagline))

    # favicon: the wordmark alone on espresso
    side = wm_right + 2 * 58
    box = (-58, (total_h - side) / 2, side, side)
    (OUT / "favicon.svg").write_text(svg(wm, box, bg="#1E1411"))
    print("logo: logo.svg, logo-ink.svg, logo-framed.svg, favicon.svg")


if __name__ == "__main__":
    build()
