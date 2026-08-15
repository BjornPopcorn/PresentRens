from pypdf import PdfWriter
from pathlib import Path

# Folder containing your PDFs
folder = Path(r"C:\Users\bjorn\Downloads\JAMSTER (1)")

# Output filename
output = folder / "combined.pdf"

# Get PDFs and sort them by filename
pdf_files = sorted(
    folder.glob("*.pdf"),
    key=lambda x: x.name.lower()
)

writer = PdfWriter()

for pdf in pdf_files:
    print(f"Adding: {pdf.name}")
    writer.append(str(pdf))

# Save the combined PDF
with open(output, "wb") as f:
    writer.write(f)

print(f"\nDone! Created: {output}")
print(f"Pages/files combined: {len(pdf_files)}")