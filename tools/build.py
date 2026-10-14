"""Keep the shared blocks of all pages in sync. No build step otherwise: the pages are plain HTML.

1. Builds the inline icon sprite from the shared library (~/Projekte/_icons, Heroicons 24) and writes
   it into index.html between <!-- partial:sprite --> markers.
2. Copies every <!-- partial:NAME --> block (sprite, header, footer, booking modal) from index.html into
   the other pages and marks the current page in the navigation (aria-current="page").
3. Entwurf B (v2/): copies the sprite, header and footer from v2/index.html into the other v2 pages, and takes
   the parts both drafts share from Entwurf A: the request modal (partial:booking of index.html), the
   application modal (shared:apply of karriere.html) and the legal texts (shared:legal of impressum.html and
   datenschutz.html). The A/B switch in the draft tag of every page points at the same page in the other draft.

Edit shared blocks in index.html (Entwurf A) or v2/index.html (Entwurf B header, footer) only, then:

    python3 tools/build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERO = Path.home() / "Projekte/_icons/heroicons/24"
PAGES = ["termin.html", "karriere.html", "impressum.html", "datenschutz.html"]
PARTIALS = ["sprite", "header", "footer", "booking"]
V2 = ROOT / "v2"
V2_PARTIALS = ["sprite", "header", "footer"]
SHARED = {"apply": "karriere.html", "legal": None}   # None: the page of the same name
ICONS = [
    "phone", "paper-clip", "document-text", "arrow-right", "arrow-left", "arrow-up-right", "arrow-long-right", "map-pin", "clock", "check", "x-mark",
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


def set_version_links(html, page):
    """The draft tag's A/B switch points at the same page in the other draft (data-ver holds the prefix)."""
    return re.sub(r'href="[^"]*" data-ver="([^"]*)"', lambda m: f'href="{m.group(1)}{page}" data-ver="{m.group(1)}"', html)


def put(html, name, part, kind="partial"):
    pat = rf"<!-- {kind}:{name} -->.*?<!-- /{kind}:{name} -->"
    if not re.search(pat, html, re.S):
        return html
    return re.sub(pat, lambda m: part, html, flags=re.S)


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
        html = set_version_links(html, page)
        path.write_text(html)
        print(f"synced: {page}")
    index.write_text(set_version_links(index.read_text(), "index.html"))

    # Entwurf B
    v2_index = V2 / "index.html"
    if not v2_index.exists():
        return
    v2_src = v2_index.read_text()
    v2_src = put(v2_src, "sprite", sprite)
    v2_index.write_text(v2_src)
    booking = block("booking", src)
    for page in ["index.html"] + PAGES:
        path = V2 / page
        if not path.exists():
            continue
        html = path.read_text()
        if page != "index.html":
            for name in V2_PARTIALS:
                part = block(name, v2_src)
                if name == "header":
                    part = mark_current(part, page)
                html = put(html, name, part)
        html = put(html, "booking", booking)
        for name, origin in SHARED.items():
            a = (ROOT / (origin or page))
            if a.exists():
                m = re.search(rf"<!-- shared:{name} -->.*?<!-- /shared:{name} -->", a.read_text(), re.S)
                if m:
                    html = put(html, name, m.group(0), "shared")
        html = set_version_links(html, page)
        path.write_text(html)
        print(f"synced: v2/{page}")


if __name__ == "__main__":
    main()
