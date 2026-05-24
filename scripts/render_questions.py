from pathlib import Path
from collections import deque

import pypdfium2 as pdfium
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PDF = Path(
    r"C:\Users\cmoli\OneDrive - VIRTUAL PLANET\Escritorio\S.A.T\SIMULACROS\Preguntas SIMULACRO 2 inglés RW_MAY 2026.pdf"
)
OUT = ROOT / "assets" / "questions"

SCALE = 2.0


def render_page(doc, page_index):
    return doc[page_index].render(scale=SCALE).to_pil().convert("RGB")


def find_question_headers(img):
    width, height = img.size
    px = img.load()
    visited = set()
    headers = []

    def is_dark(x, y):
        r, g, b = px[x, y]
        return r < 55 and g < 55 and b < 55

    for y in range(80, height - 120):
        for x in range(40, width - 40):
            if (x, y) in visited or not is_dark(x, y):
                continue

            queue = deque([(x, y)])
            visited.add((x, y))
            xs = []
            ys = []

            while queue:
                cx, cy = queue.popleft()
                xs.append(cx)
                ys.append(cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 40 or nx >= width - 40 or ny < 80 or ny >= height - 120:
                        continue
                    if (nx, ny) in visited:
                        continue
                    if is_dark(nx, ny):
                        visited.add((nx, ny))
                        queue.append((nx, ny))

            x0, x1 = min(xs), max(xs)
            y0, y1 = min(ys), max(ys)
            bw = x1 - x0 + 1
            bh = y1 - y0 + 1
            area = bw * bh
            fill = len(xs) / area

            if 28 <= bw <= 70 and 24 <= bh <= 46 and fill > 0.42 and y0 < 1150:
                if 45 <= x0 <= 140 or 600 <= x0 <= 705:
                    headers.append({"x0": x0, "x1": x1, "y0": y0, "y1": y1})

    # Merge accidental duplicate components close to the same header.
    headers.sort(key=lambda h: (h["y0"], h["x0"]))
    merged = []
    for h in headers:
        if merged and abs(h["x0"] - merged[-1]["x0"]) < 8 and abs(h["y0"] - merged[-1]["y0"]) < 8:
            continue
        merged.append(h)
    return merged


def trim_question(img):
    px = img.convert("RGB")
    width, height = px.size
    pix = px.load()

    def non_white_row(y):
        count = 0
        for x in range(14, max(14, width - 14)):
            r, g, b = pix[x, y]
            if r < 245 or g < 245 or b < 245:
                count += 1
        return count

    top = 0
    while top < height - 1 and non_white_row(top) < 3:
        top += 1

    bottom = height - 1
    while bottom > top and non_white_row(bottom) < 3:
        bottom -= 1

    left = 0
    while left < width - 1:
        count = 0
        for y in range(top, bottom + 1):
            r, g, b = pix[left, y]
            if r < 245 or g < 245 or b < 245:
                count += 1
        if count >= 3:
            break
        left += 1

    right = width - 1
    while right > left:
        count = 0
        for y in range(top, bottom + 1):
            r, g, b = pix[right, y]
            if r < 245 or g < 245 or b < 245:
                count += 1
        if count >= 3:
            break
        right -= 1

    pad = 8
    return px.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(width, right + pad + 1),
            min(height, bottom + pad + 1),
        )
    )


def crop_questions():
    doc = pdfium.PdfDocument(str(QUESTIONS_PDF))
    all_items = []

    for page_index in range(len(doc)):
        img = render_page(doc, page_index)
        headers = find_question_headers(img)
        for h in headers:
            col = "left" if h["x0"] < 500 else "right"
            all_items.append({"page": page_index, "col": col, **h, "img": img})

    all_items.sort(key=lambda h: (h["page"], 0 if h["col"] == "left" else 1, h["y0"]))
    module_items = {"module1": [], "module2": []}

    for item in all_items:
        module = "module1" if item["page"] <= 11 else "module2"
        module_items[module].append(item)

    for module, items in module_items.items():
        if len(items) != 27:
            raise RuntimeError(f"{module} expected 27 question headers, found {len(items)}")

        for index, item in enumerate(items, start=1):
            same_col_next = [
                other
                for other in items
                if other["page"] == item["page"] and other["col"] == item["col"] and other["y0"] > item["y0"] + 20
            ]
            if item["col"] == "left":
                x0, x1 = max(0, item["x0"] - 8), 605
            else:
                x0, x1 = max(0, item["x0"] - 8), 1155
            y0 = max(0, item["y0"] - 8)
            if same_col_next:
                y1 = min(other["y0"] for other in same_col_next) - 16
            else:
                y1 = 1230 if module == "module1" and index == 27 else 1360

            crop = item["img"].crop((x0, y0, x1, min(y1, item["img"].height - 110)))
            crop = trim_question(crop)
            crop.save(OUT / module / f"q{index:02d}.png", optimize=True)
            print(module, index, item["page"] + 1, item["col"], crop.size)


if __name__ == "__main__":
    crop_questions()
