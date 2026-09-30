import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: str, max_ocr_pages: int = 6) -> str:
    """Extract embedded text or perform OCR on a PDF document.
    
    1. First tries direct vector text extraction with PyMuPDF (fitz).
    2. If pages are scanned images without text layer, performs OCR.
    """
    path = Path(pdf_path)
    if not path.is_file():
        return ""

    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF (fitz) is not installed; skipping PDF text extraction.")
        return ""

    extracted_pages = []
    needs_ocr = False

    try:
        doc = fitz.open(pdf_path)
        total_pages = min(len(doc), max_ocr_pages)

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_text = page.get_text().strip()
            if page_text and len(page_text) > 30:
                extracted_pages.append(page_text)
            else:
                needs_ocr = True

        # If direct text extraction provided enough content
        if extracted_pages and len(" ".join(extracted_pages)) > 100:
            doc.close()
            return "\n\n".join(extracted_pages)

        # Fallback to OCR if page has little/no text
        if needs_ocr:
            ocr_pages = []
            for page_idx in range(min(len(doc), max_ocr_pages)):
                page = doc[page_idx]
                try:
                    # PyMuPDF built-in OCR if Tesseract available, or Windows Media OCR
                    pix = page.get_pixmap(dpi=150)
                    # Attempt PyMuPDF get_textpage_ocr if available
                    try:
                        textpage = page.get_textpage_ocr(language='ron', dpi=150)
                        ocr_text = page.get_text(textpage=textpage).strip()
                        if ocr_text:
                            ocr_pages.append(ocr_text)
                            continue
                    except Exception:
                        pass
                except Exception as e:
                    logger.debug(f"OCR error on page {page_idx}: {e}")

            if ocr_pages:
                doc.close()
                return "\n\n".join(ocr_pages)

        doc.close()
        return "\n\n".join(extracted_pages)
    except Exception as exc:
        logger.error(f"Error processing PDF {pdf_path}: {exc}")
        return "\n\n".join(extracted_pages) if extracted_pages else ""

