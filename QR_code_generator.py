import pandas as pd
import qrcode
from PIL import Image

# === CONFIG ===
CSV_FILE = "songs_rows.csv"      # your CSV filename
OUTPUT_FOLDER = "qr_codes"         # folder to save PNGs
BASE_URL = "https://present-rens.vercel.app/play/"


# === READ CSV ===
df = pd.read_csv(CSV_FILE)

# Create output folder if needed
import os
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# === GENERATE QR CODES ===
for index, row in df.iterrows():
    song_id = row["id"]
    title = row["title"]

    # Build link
    link = BASE_URL + song_id

    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(link)
    qr.make(fit=True)

    # Convert to image
    img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    # Make background transparent
    datas = img.getdata()
    new_data = []
    for item in datas:
        # white background becomes transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)

    # Clean filename (remove illegal characters)
    safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).rstrip()

    # Save PNG
    output_path = os.path.join(OUTPUT_FOLDER, f"{safe_title}.png")
    img.save(output_path)

    print(f"Saved QR for {title} → {output_path}")

print("All QR codes generated!")
