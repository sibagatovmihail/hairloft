"""Keep the shared blocks of all pages in sync. No build step otherwise: the pages are plain HTML.

1. Builds the inline icon sprite from the shared library (~/Projekte/_icons, Heroicons 24) and writes
   it into index.html between <!-- partial:sprite --> markers.
2. Copies every <!-- partial:NAME --> block (sprite, header, footer, success) from index.html into
   the other pages and marks the current page in the navigation (aria-current="page").

Edit shared blocks in index.html only, then:

    python3 tools/build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERO = Path.home() / "Projekte/_icons/heroicons/24"
PAGES = ["termin.html", "karriere.html", "impressum.html", "datenschutz.html"]
PARTIALS = ["sprite", "header", "footer"]
ICONS = [
    "phone", "arrow-right", "arrow-up-right", "arrow-long-right", "map-pin", "clock", "check", "x-mark",
    "chevron-left", "chevron-right", "calendar-days", "envelope", "sparkles", "heart", "academic-cap",
    "banknotes", "user-group", "arrow-path", "scissors", "sun", "check-badge", "globe-europe-africa",
    "chat-bubble-left-right", "camera",
]
SOLID = ["star"]


def symbol(folder, name, suffix=""):
    svg = (HERO / folder / f"{name}.svg").read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
    inner = re.sub(r'\s*stroke-(linecap|linejoin)="round"', "", inner)
    inner = re.sub(r'\s*fill="#[0-9A-Fa-f]+"', "", inner)
    inner = re.sub(r">\s+<", "><", inner.strip())
    return f'<symbol id="i-{name}{suffix}" viewBox="0 0 24 24">{inner}</symbol>'


def block(name, src):
    m = re.search(rf"<!-- partial:{name} -->.*?<!-- /partial:{name} -->", src, re.S)
    if not m:
        raise SystemExit(f"partial:{name} missing")
    return m.group(0)


def mark_current(html, page):
    """aria-current on links that point at this page (without a #fragment)."""
    html = html.replace(' aria-current="page"', "")
    return re.sub(rf'(<a class="(?:nav__link|menu__row)[^"]*" href="{re.escape(page)}")', r'\1 aria-current="page"', html)


def main():
    index = ROOT / "index.html"
    src = index.read_text()

    symbols = [symbol("outline", n) for n in ICONS] + [symbol("solid", n, "-solid") for n in SOLID]
    sprite = ('<!-- partial:sprite --><svg class="sprite" aria-hidden="true" focusable="false">'
              + "".join(symbols) + "</svg><!-- /partial:sprite -->")
    src = re.sub(r"<!-- partial:sprite -->.*?<!-- /partial:sprite -->", lambda m: sprite, src, flags=re.S)
    index.write_text(src)
    print(f"sprite: {len(symbols)} symbols")

    for page in PAGES:
        path = ROOT / page
        if not path.exists():
            continue
        html = path.read_text()
        for name in PARTIALS:
            part = block(name, src)
            if name == "header":
                part = mark_current(part, page)
            html = re.sub(rf"<!-- partial:{name} -->.*?<!-- /partial:{name} -->", lambda m: part, html, flags=re.S)
        path.write_text(html)
        print(f"synced: {page}")


if __name__ == "__main__":
    main()
