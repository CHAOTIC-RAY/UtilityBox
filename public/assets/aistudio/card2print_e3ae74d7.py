#!/usr/bin/env python3
"""
card2print.py - business card PDF  ->  print-ready, double-sided sheet.

Takes a card PDF (page 1 = front/details, page 2 = back/cover) and lays out as
many cards as fit on one sheet, with the back page positioned so it registers
exactly behind the front when printed double-sided.

Install once:
    pip install pymupdf numpy

Examples:
    python card2print.py card.pdf                       # no bleed, A4
    python card2print.py card.pdf --bleed               # add 1.5 mm bleed
    python card2print.py card.pdf --bleed --bleed-mm 3  # 3 mm bleed
    python card2print.py front.pdf --back back.pdf      # front/back in two files
    python card2print.py card.pdf --paper letter -o out.pdf
    python card2print.py card.pdf --source-bleed 3 --bleed   # your PDF already
                                                             # contains 3 mm bleed

Printing: Actual size / 100% (never "fit to page"), double-sided,
flip on LONG edge (default). Use --flip short if you flip on the short edge.

Bleed: if your artwork has no bleed, --bleed creates it by extending the edge
pixels of the card outward (works well for solid colours and gradients; for
artwork that really needs bleed, export it with bleed and use --source-bleed).
"""
import argparse
import os
import sys

try:
    import pymupdf as fitz
except ImportError:  # older PyMuPDF
    import fitz
import numpy as np

MM = 72 / 25.4  # points per millimetre
EPS = 0.01 * MM  # tolerance when fitting (0.01 mm)

PAPERS = {  # width x height in mm (portrait)
    "a3": (297, 420), "a4": (210, 297), "a5": (148, 210),
    "letter": (215.9, 279.4), "legal": (215.9, 355.6), "tabloid": (279.4, 431.8),
}


# ----------------------------------------------------------------- helpers --
def parse_size(text):
    try:
        w, h = text.lower().replace("mm", "").split("x")
        return float(w), float(h)
    except Exception:
        raise argparse.ArgumentTypeError(f"'{text}' is not a size like 210x297")


def fit_count(avail, size, gap):
    """How many items of `size` (separated by `gap`) fit into `avail`."""
    return max(0, int((avail + gap + EPS) // (size + gap)))


def norm(angle):
    """Normalise an angle to (-180, 180]."""
    angle = angle % 360
    return angle - 360 if angle > 180 else angle


def bleed_raster(page, trim, bleed_pt, dpi, rot_ccw):
    """Render the card and extend its edge pixels outward by bleed_pt.
    Returns PNG bytes (already rotated by rot_ccw degrees)."""
    s = dpi / 72
    pix = page.get_pixmap(matrix=fitz.Matrix(s, s), clip=trim, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3]
    inset = 3  # ignore anti-aliased outermost pixels when extending
    b = int(round(bleed_pt * s)) + inset
    core = arr[inset:-inset, inset:-inset]
    ext = np.pad(core, ((b, b), (b, b), (0, 0)), mode="edge")
    ext = np.ascontiguousarray(np.rot90(ext, int(rot_ccw // 90) % 4))
    pm = fitz.Pixmap(fitz.csRGB, ext.shape[1], ext.shape[0], ext.tobytes(), False)
    return pm.tobytes("png")


# -------------------------------------------------------------------- main --
def main():
    ap = argparse.ArgumentParser(
        description="Turn a business-card PDF (front + back) into a print-ready duplex sheet.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    ap.add_argument("front", help="card PDF (page 1 = front, page 2 = back)")
    ap.add_argument("--back", help="separate PDF for the back (page 1 is used)")
    ap.add_argument("-o", "--output", help="output PDF (default: <name>_print[_bleed].pdf)")
    ap.add_argument("--bleed", action="store_true", help="include bleed")
    ap.add_argument("--bleed-mm", type=float, default=1.5, help="bleed size when --bleed is on")
    ap.add_argument("--source-bleed", type=float, default=0.0, metavar="MM",
                    help="your PDF already contains this much bleed on every side "
                         "(page = trim + 2 x MM); real artwork is used instead of edge-extending")
    ap.add_argument("--paper", default="a4",
                    help="a3, a4, a5, letter, legal, tabloid or WxH in mm (e.g. 210x297)")
    ap.add_argument("--margin", type=float, default=5.0,
                    help="minimum distance from paper edge to the trimmed card (mm)")
    ap.add_argument("--gap-mm", type=float, default=0.0,
                    help="extra space between cards (never less than 2 x bleed)")
    ap.add_argument("--card-size", type=parse_size, metavar="WxH",
                    help="trim size in mm (default: taken from the PDF page size)")
    ap.add_argument("--rotate", choices=["auto", "yes", "no"], default="auto",
                    help="turn cards 90 degrees if that fits more per sheet")
    ap.add_argument("--flip", choices=["long", "short"], default="long",
                    help="duplex flip edge of your printer")
    ap.add_argument("--no-marks", action="store_true", help="omit crop marks")
    ap.add_argument("--dpi", type=int, default=600, help="resolution of generated bleed")
    a = ap.parse_args()

    # ---- sources -----------------------------------------------------------
    front_doc = fitz.open(a.front)
    if a.back:
        back_doc, back_pno = fitz.open(a.back), 0
    elif front_doc.page_count >= 2:
        back_doc, back_pno = front_doc, 1
    else:
        back_doc, back_pno = None, 0
    if front_doc.page_count > 2 and not a.back:
        print("note: PDF has more than 2 pages - only pages 1 and 2 are used")

    sb = a.source_bleed * MM
    fr = front_doc[0].rect
    trim = fitz.Rect(sb, sb, fr.width - sb, fr.height - sb)  # trim box in source page
    if a.card_size:
        cw, ch = a.card_size[0] * MM, a.card_size[1] * MM
        if abs(cw / ch - trim.width / trim.height) > 0.01:
            print("warning: --card-size has a different aspect ratio than the PDF; "
                  "the artwork will be stretched")
    else:  # snap to 0.01 mm so 85 x 55 mm cards aren't 0.001 mm too big
        cw = round(trim.width / MM, 2) * MM
        ch = round(trim.height / MM, 2) * MM
    if back_doc is not None:
        br = back_doc[back_pno].rect
        if abs(br.width - fr.width) > 1 or abs(br.height - fr.height) > 1:
            print("warning: front and back pages have different sizes")

    # ---- bleed -------------------------------------------------------------
    bleed = a.bleed_mm * MM if a.bleed else 0.0
    if bleed and sb and bleed > sb + EPS:
        print(f"note: source only has {a.source_bleed} mm of bleed - using that")
        bleed = sb
    gap = max(a.gap_mm * MM, 2 * bleed)

    # ---- grid (try both orientations) -------------------------------------
    if a.paper.lower() in PAPERS:
        pw_mm, ph_mm = PAPERS[a.paper.lower()]
    else:
        pw_mm, ph_mm = parse_size(a.paper)
    pw, ph = pw_mm * MM, ph_mm * MM
    m = a.margin * MM
    aw, ah = pw - 2 * m, ph - 2 * m

    def grid(w, h):
        return fit_count(aw, w, gap), fit_count(ah, h, gap)

    c0, r0 = grid(cw, ch)
    c1, r1 = grid(ch, cw)
    rotated = {"yes": True, "no": False, "auto": c1 * r1 > c0 * r0}[a.rotate]
    cols, rows = (c1, r1) if rotated else (c0, r0)
    w, h = (ch, cw) if rotated else (cw, ch)  # cell size on the sheet
    if cols * rows == 0:
        sys.exit("error: card does not fit on the paper with these settings")
    gw, gh = cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap
    x0, y0 = (pw - gw) / 2, (ph - gh) / 2  # centred => both sides register

    # ---- orientation of front and back ------------------------------------
    # "up" direction of the artwork on the sheet, in degrees (90 = up the page)
    up_front = 0 if rotated else 90
    up_back = (180 - up_front) if a.flip == "long" else (-up_front)
    rot_front = norm(up_front - 90)   # counter-clockwise degrees
    rot_back = norm(up_back - 90)

    def cells():
        for r in range(rows):
            for c in range(cols):
                x, y = x0 + c * (w + gap), y0 + r * (h + gap)
                yield fitz.Rect(x, y, x + w, y + h)

    def draw_marks(page):
        off = bleed + 1.0 * MM
        ln_x = min(4 * MM, x0 - off - 0.5 * MM)
        ln_y = min(4 * MM, y0 - off - 0.5 * MM)
        xs = sorted({round(x0 + c * (w + gap) + d, 3) for c in range(cols) for d in (0, w)})
        ys = sorted({round(y0 + r * (h + gap) + d, 3) for r in range(rows) for d in (0, h)})
        line = lambda p, q: page.draw_line(fitz.Point(*p), fitz.Point(*q), color=(0, 0, 0), width=0.25)
        if ln_x > 0.3 * MM:
            for y in ys:
                line((x0 - off - ln_x, y), (x0 - off, y))
                line((x0 + gw + off, y), (x0 + gw + off + ln_x, y))
        if ln_y > 0.3 * MM:
            for x in xs:
                line((x, y0 - off - ln_y), (x, y0 - off))
                line((x, y0 + gh + off), (x, y0 + gh + off + ln_y))

    def build_side(out, doc, pno, rot):
        page = out.new_page(width=pw, height=ph)
        src = doc[pno]
        real = bleed if sb else 0.0           # bleed taken from the artwork
        fake = bleed if not sb else 0.0       # bleed made by edge extension
        if fake:
            png = bleed_raster(src, trim, fake, a.dpi, rot)
            xref = 0
            for rect in cells():
                tgt = rect + (-fake, -fake, fake, fake)
                if xref:
                    page.insert_image(tgt, xref=xref, keep_proportion=False)
                else:
                    xref = page.insert_image(tgt, stream=png, keep_proportion=False)
        for rect in cells():
            tgt = rect + (-real, -real, real, real)
            clip = (trim + (-real, -real, real, real)) if sb else None
            page.show_pdf_page(tgt, doc, pno, clip=clip, rotate=rot, keep_proportion=False)
        if not a.no_marks:
            draw_marks(page)

    # ---- build -------------------------------------------------------------
    out = fitz.open()
    build_side(out, front_doc, 0, rot_front)
    if back_doc is not None:
        build_side(out, back_doc, back_pno, rot_back)
    out.set_metadata({"title": f"{os.path.basename(a.front)} - {cols * rows}-up print sheet"})

    path = a.output or (os.path.splitext(a.front)[0] + "_print" + ("_bleed" if a.bleed else "") + ".pdf")
    out.save(path, deflate=True, garbage=3)

    print(f"saved:   {path}")
    print(f"paper:   {pw_mm:g} x {ph_mm:g} mm   card: {cw / MM:.1f} x {ch / MM:.1f} mm"
          f"{'  (rotated 90)' if rotated else ''}")
    print(f"layout:  {cols} x {rows} = {cols * rows} cards per side"
          f"   margins: {x0 / MM:.1f} mm sides, {y0 / MM:.1f} mm top/bottom")
    print(f"bleed:   {bleed / MM:.1f} mm" + ("" if bleed else " (none)")
          + f"   sides: {'front + back' if back_doc is not None else 'front only'}"
          + f"   flip: {a.flip} edge")
    print("print at: Actual size / 100%, double-sided")


if __name__ == "__main__":
    main()
