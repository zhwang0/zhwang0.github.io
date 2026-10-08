"""Regenerate Resume/CV page previews after updating the source PDFs.

Requires Poppler (pdftoppm), Pillow, and pypdf. Run from any directory:
    python3 scripts/render_document_previews.py
If a PDF's page count changes, also update the counts in resume/index.html.
"""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = (
    ("Zhihao_Wang_Resume.pdf", "resume-preview"),
    ("Zhihao_Wang_Academic_CV.pdf", "academic-cv-preview"),
)


def main():
    destination = ROOT / "assets/img/documents"
    destination.mkdir(parents=True, exist_ok=True)
    for filename, prefix in DOCUMENTS:
        source = ROOT / "assets/pdf" / filename
        count = len(PdfReader(source).pages)
        with tempfile.TemporaryDirectory(prefix="resume-previews-") as temporary:
            output_prefix = Path(temporary) / "page"
            subprocess.run(
                ["pdftoppm", "-scale-to", "1600", "-png", str(source), str(output_prefix)],
                check=True,
            )
            pages = sorted(Path(temporary).glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
            if len(pages) != count:
                raise RuntimeError(f"Expected {count} previews for {filename}; got {len(pages)}")
            for page_number, page in enumerate(pages, start=1):
                suffix = "" if page_number == 1 else f"-{page_number}"
                target = destination / f"{prefix}{suffix}.webp"
                with Image.open(page) as image:
                    image.convert("RGB").save(target, "WEBP", quality=90, method=6)
        print(f"{filename}: generated {count} page previews")


if __name__ == "__main__":
    main()
