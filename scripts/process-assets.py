import os
import cv2
import numpy as np
import json
import shutil

print("=== Starting CineSnap Automated Asset Pipeline ===")

# Create directories
os.makedirs("public/assets/raw", exist_ok=True)
os.makedirs("public/assets/frames/thumbs", exist_ok=True)
os.makedirs("public/assets/stickers/cinema", exist_ok=True)
os.makedirs("src/data", exist_ok=True)

# 1. Copy raw assets for provenance and reproducibility
for f in os.listdir("assets/frame"):
    src = os.path.join("assets/frame", f)
    if os.path.isfile(src):
        shutil.copy2(src, os.path.join("public/assets/raw", f"frame_{f}"))
for f in os.listdir("assets/icon"):
    src = os.path.join("assets/icon", f)
    if os.path.isfile(src):
        shutil.copy2(src, os.path.join("public/assets/raw", f"icon_{f}"))

print("[1/5] Raw reference assets copied to public/assets/raw")

# 2. Pipeline A: Hollywood 3-Cut Frame Transparency Restoration
hollywood_raw_path = "assets/frame/image.png"
if os.path.exists(hollywood_raw_path):
    h_img = cv2.imread(hollywood_raw_path)
    h_h, h_w = h_img.shape[:2]
    h_rgba = cv2.cvtColor(h_img, cv2.COLOR_BGR2BGRA)

    # Detect outer background: connected to borders and dark/checkerboard (max BGR <= 45)
    is_checker = (h_img[:, :, 0] <= 45) & (h_img[:, :, 1] <= 45) & (h_img[:, :, 2] <= 45)
    num_labels, labels = cv2.connectedComponents(is_checker.astype(np.uint8))
    border_labels = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ])))
    border_labels.discard(0)

    outer_mask = np.zeros((h_h, h_w), dtype=bool)
    for lbl in border_labels:
        outer_mask |= (labels == lbl)
    # 2px dilation for crisp border edge
    outer_mask = cv2.dilate(outer_mask.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    h_rgba[outer_mask, 3] = 0

    # Protect clapperboard in foreground so its chalkboard surface remains solid
    clapper_poly = np.array([
        [65, 1130],
        [75, 1115],
        [255, 1034],
        [273, 1100],
        [288, 1135],
        [288, 1275],
        [65, 1275],
    ], np.int32)
    clapper_prot = np.zeros((h_h, h_w), dtype=np.uint8)
    cv2.fillPoly(clapper_prot, [clapper_poly], 255)

    # Inner photo slots punch out
    slots_bounds = [
        (135, 475, 185, 520),  # Slot 1
        (480, 820, 185, 520),  # Slot 2
        (825, 1165, 185, 520), # Slot 3
    ]

    for (y1, y2, x1, x2) in slots_bounds:
        slot_patch = h_img[y1:y2, x1:x2]
        prot_patch = clapper_prot[y1:y2, x1:x2]
        
        is_slot_checker = (
            (slot_patch[:, :, 0] <= 45) &
            (slot_patch[:, :, 1] <= 45) &
            (slot_patch[:, :, 2] <= 45) &
            (np.abs(slot_patch[:, :, 0].astype(int) - slot_patch[:, :, 1].astype(int)) <= 12) &
            (np.abs(slot_patch[:, :, 1].astype(int) - slot_patch[:, :, 2].astype(int)) <= 12) &
            (prot_patch == 0)
        )
        h_rgba[y1:y2, x1:x2, 3][is_slot_checker] = 0

    # Resize to standard high-res specs: canvasWidth=1200, canvasHeight=3120 (ratio 0.3846)
    target_w, target_h = 1200, 3120
    h_rgba_highres = cv2.resize(h_rgba, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    hollywood_out = "public/assets/frames/hollywood-3cut-transparent.png"
    cv2.imwrite(hollywood_out, h_rgba_highres)

    # Generate thumbnail
    thumb_w = 240
    thumb_h = int(target_h * thumb_w / target_w)
    h_thumb = cv2.resize(h_rgba, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
    cv2.imwrite("public/assets/frames/thumbs/hollywood-3cut.png", h_thumb)

    print(f"[2/5] Hollywood 3-cut frame saved: {hollywood_out} ({target_w}x{target_h})")

# 3. Generate additional high-quality cinema frames
# A. Cinema Film Strip Classic Black (3-Cut)
def make_filmstrip_frame(cut_count=3, w=1200, h=3120):
    frame = np.zeros((h, w, 4), dtype=np.uint8)
    # Dark theater strip with slight grain: #141416
    frame[:, :, 0] = 22 # B
    frame[:, :, 1] = 20 # G
    frame[:, :, 2] = 20 # R
    frame[:, :, 3] = 255 # Alpha

    # Film sprockets on left and right
    sprocket_w = 40
    sprocket_h = 60
    sprocket_gap = 40
    sprocket_margin = 45

    # Draw left & right sprockets
    y = sprocket_margin
    while y + sprocket_h < h - sprocket_margin:
        # left sprocket
        cv2.rectangle(frame, (sprocket_margin, y), (sprocket_margin + sprocket_w, y + sprocket_h), (255, 255, 255, 255), -1)
        # right sprocket
        cv2.rectangle(frame, (w - sprocket_margin - sprocket_w, y), (w - sprocket_margin, y + sprocket_h), (255, 255, 255, 255), -1)
        y += sprocket_h + sprocket_gap

    # Slot calculations:
    slots = []
    slot_w = int(w * 0.70)
    slot_x = int((w - slot_w) / 2)
    
    top_margin = int(h * 0.08)
    bot_margin = int(h * 0.10)
    avail_h = h - top_margin - bot_margin
    slot_gap = int(h * 0.03)
    slot_h = int((avail_h - (cut_count - 1) * slot_gap) / cut_count)

    for i in range(cut_count):
        s_y = top_margin + i * (slot_h + slot_gap)
        # Punch out slot
        frame[s_y:s_y + slot_h, slot_x:slot_x + slot_w, :] = 0
        slots.append({
            "id": i + 1,
            "x": round(slot_x / w, 4),
            "y": round(s_y / h, 4),
            "w": round(slot_w / w, 4),
            "h": round(slot_h / h, 4)
        })

    # Header and Footer text on film strip
    # (Optional subtle branding in gold/cream)
    return frame, slots

fs_3cut, fs_3cut_slots = make_filmstrip_frame(3, 1200, 3120)
cv2.imwrite("public/assets/frames/filmstrip-black-3cut.png", fs_3cut)
fs_thumb = cv2.resize(fs_3cut, (240, 624))
cv2.imwrite("public/assets/frames/thumbs/filmstrip-black-3cut.png", fs_thumb)

fs_4cut, fs_4cut_slots = make_filmstrip_frame(4, 1200, 3600)
cv2.imwrite("public/assets/frames/filmstrip-black-4cut.png", fs_4cut)
fs4_thumb = cv2.resize(fs_4cut, (240, 720))
cv2.imwrite("public/assets/frames/thumbs/filmstrip-black-4cut.png", fs4_thumb)

# B. Velvet Maroon Minimalist Frame
def make_velvet_frame(cut_count=3, w=1200, h=3120):
    frame = np.zeros((h, w, 4), dtype=np.uint8)
    # Velvet Maroon: #301416 -> BGR: (22, 20, 48)
    frame[:, :, 0] = 22
    frame[:, :, 1] = 20
    frame[:, :, 2] = 48
    frame[:, :, 3] = 255

    # Gold thin border line
    gold = (105, 184, 229, 255) # #E5B869
    cv2.rectangle(frame, (25, 25), (w - 25, h - 25), gold, 3)

    slots = []
    slot_w = int(w * 0.74)
    slot_x = int((w - slot_w) / 2)
    top_margin = int(h * 0.08)
    bot_margin = int(h * 0.10)
    avail_h = h - top_margin - bot_margin
    slot_gap = int(h * 0.035)
    slot_h = int((avail_h - (cut_count - 1) * slot_gap) / cut_count)

    for i in range(cut_count):
        s_y = top_margin + i * (slot_h + slot_gap)
        # Punch out slot
        frame[s_y:s_y + slot_h, slot_x:slot_x + slot_w, :] = 0
        # Gold inner frame border
        cv2.rectangle(frame, (slot_x - 4, s_y - 4), (slot_x + slot_w + 4, s_y + slot_h + 4), gold, 2)
        slots.append({
            "id": i + 1,
            "x": round(slot_x / w, 4),
            "y": round(s_y / h, 4),
            "w": round(slot_w / w, 4),
            "h": round(slot_h / h, 4)
        })

    return frame, slots

velvet_3cut, velvet_3cut_slots = make_velvet_frame(3, 1200, 3120)
cv2.imwrite("public/assets/frames/velvet-maroon-3cut.png", velvet_3cut)
v_thumb = cv2.resize(velvet_3cut, (240, 624))
cv2.imwrite("public/assets/frames/thumbs/velvet-maroon-3cut.png", v_thumb)

velvet_4cut, velvet_4cut_slots = make_velvet_frame(4, 1200, 3600)
cv2.imwrite("public/assets/frames/velvet-maroon-4cut.png", velvet_4cut)
v4_thumb = cv2.resize(velvet_4cut, (240, 720))
cv2.imwrite("public/assets/frames/thumbs/velvet-maroon-4cut.png", v4_thumb)

# C. Popcorn Cream Scrapbook Frame
def make_scrapbook_frame(cut_count=3, w=1200, h=3120):
    frame = np.zeros((h, w, 4), dtype=np.uint8)
    # Warm Popcorn Cream: #FAF0E4 -> BGR: (228, 240, 250)
    frame[:, :, 0] = 228
    frame[:, :, 1] = 240
    frame[:, :, 2] = 250
    frame[:, :, 3] = 255

    # Dashed/ticket style border: Cinema Red #C92A2A -> BGR: (42, 42, 201)
    red_col = (42, 42, 201, 255)
    cv2.rectangle(frame, (28, 28), (w - 28, h - 28), red_col, 4)

    slots = []
    slot_w = int(w * 0.76)
    slot_x = int((w - slot_w) / 2)
    top_margin = int(h * 0.08)
    bot_margin = int(h * 0.10)
    avail_h = h - top_margin - bot_margin
    slot_gap = int(h * 0.035)
    slot_h = int((avail_h - (cut_count - 1) * slot_gap) / cut_count)

    for i in range(cut_count):
        s_y = top_margin + i * (slot_h + slot_gap)
        frame[s_y:s_y + slot_h, slot_x:slot_x + slot_w, :] = 0
        # Vintage ticket cutout notches on sides
        notch_r = 16
        cv2.circle(frame, (slot_x, s_y + slot_h // 2), notch_r, red_col, -1)
        cv2.circle(frame, (slot_x + slot_w, s_y + slot_h // 2), notch_r, red_col, -1)
        slots.append({
            "id": i + 1,
            "x": round(slot_x / w, 4),
            "y": round(s_y / h, 4),
            "w": round(slot_w / w, 4),
            "h": round(slot_h / h, 4)
        })

    return frame, slots

sb_3cut, sb_3cut_slots = make_scrapbook_frame(3, 1200, 3120)
cv2.imwrite("public/assets/frames/scrapbook-cream-3cut.png", sb_3cut)
sb_thumb = cv2.resize(sb_3cut, (240, 624))
cv2.imwrite("public/assets/frames/thumbs/scrapbook-cream-3cut.png", sb_thumb)

# D. 2x2 Candid Grid Frame
def make_grid_frame(w=1600, h=1600):
    frame = np.zeros((h, w, 4), dtype=np.uint8)
    # Espresso dark: #160D0C -> BGR: (12, 13, 22)
    frame[:, :, 0] = 12
    frame[:, :, 1] = 13
    frame[:, :, 2] = 22
    frame[:, :, 3] = 255

    # Gold marquee border
    gold = (105, 184, 229, 255)
    cv2.rectangle(frame, (30, 30), (w - 30, h - 30), gold, 3)

    margin = 80
    gap = 40
    slot_size = (w - 2 * margin - gap) // 2

    slots = [
        {"id": 1, "x": round(margin / w, 4), "y": round(margin / h, 4), "w": round(slot_size / w, 4), "h": round(slot_size / h, 4)},
        {"id": 2, "x": round((margin + slot_size + gap) / w, 4), "y": round(margin / h, 4), "w": round(slot_size / w, 4), "h": round(slot_size / h, 4)},
        {"id": 3, "x": round(margin / w, 4), "y": round((margin + slot_size + gap) / h, 4), "w": round(slot_size / w, 4), "h": round(slot_size / h, 4)},
        {"id": 4, "x": round((margin + slot_size + gap) / w, 4), "y": round((margin + slot_size + gap) / h, 4), "w": round(slot_size / w, 4), "h": round(slot_size / h, 4)},
    ]

    for s in slots:
        x1 = int(s["x"] * w)
        y1 = int(s["y"] * h)
        x2 = int(x1 + s["w"] * w)
        y2 = int(y1 + s["h"] * h)
        frame[y1:y2, x1:x2, :] = 0
        cv2.rectangle(frame, (x1 - 3, y1 - 3), (x2 + 3, y2 + 3), gold, 2)

    return frame, slots

grid_frame, grid_slots = make_grid_frame(1600, 1600)
cv2.imwrite("public/assets/frames/candid-grid-2x2.png", grid_frame)
grid_thumb = cv2.resize(grid_frame, (300, 300))
cv2.imwrite("public/assets/frames/thumbs/candid-grid-2x2.png", grid_thumb)

print("[3/5] Additional cinema frames created.")

# 4. Pipeline B: Auto-Slice & Background Removal for Stickers
sticker_catalog = []
stk_idx = 0

sheet_files = [
    ("assets/icon/image copy.png", "tickets"),
    ("assets/icon/image copy 2.png", "props"),
    ("assets/icon/image copy 3.png", "signs"),
    ("assets/icon/image.png", "badges"),
]

for sheet_path, default_cat in sheet_files:
    if not os.path.exists(sheet_path):
        continue
    img = cv2.imread(sheet_path)
    if img is None:
        continue
    h, w = img.shape[:2]

    # Non-white mask
    is_not_white = (img[:, :, 0] < 240) | (img[:, :, 1] < 240) | (img[:, :, 2] < 240)
    # Also if gray sheet: check standard deviation
    if img[:20, :20].mean() < 180:
        is_not_white = np.linalg.norm(img.astype(float) - img[:20, :20].mean(axis=(0, 1)), axis=2) > 30

    kernel = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(is_not_white.astype(np.uint8), kernel, iterations=1)
    cnts, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=lambda c: cv2.contourArea(c), reverse=True)

    sheet_count = 0
    for c in cnts:
        area = cv2.contourArea(c)
        if area < 3500:
            continue
        x, y, cw, ch = cv2.boundingRect(c)
        if cw < 40 or ch < 40:
            continue
        # ignore entire sheet contour
        if cw > w * 0.95 and ch > h * 0.95:
            continue

        p = 3
        x1, y1 = max(0, x - p), max(0, y - p)
        x2, y2 = min(w, x + cw + p), min(h, y + ch + p)

        crop = img[y1:y2, x1:x2]
        crop_h, crop_w = crop.shape[:2]
        crop_rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA)

        c_local = c - np.array([x1, y1])
        contour_mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
        cv2.drawContours(contour_mask, [c_local], -1, 255, -1)
        contour_mask = cv2.dilate(contour_mask, np.ones((5, 5), np.uint8), iterations=1)

        # Set outside contour transparent
        crop_rgba[contour_mask == 0, 3] = 0

        # Also remove white background touching border
        is_white_crop = (crop[:, :, 0] >= 240) & (crop[:, :, 1] >= 240) & (crop[:, :, 2] >= 240)
        num_l, labels = cv2.connectedComponents((is_white_crop & (contour_mask > 0)).astype(np.uint8))
        edge_labels = set(np.unique(np.concatenate([
            labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
        ])))
        edge_labels.discard(0)
        for el in edge_labels:
            crop_rgba[labels == el, 3] = 0

        stk_filename = f"stk_{stk_idx:03d}.png"
        stk_filepath = f"public/assets/stickers/cinema/{stk_filename}"
        cv2.imwrite(stk_filepath, crop_rgba)

        # Classify sticker category based on color/aspect
        aspect = cw / ch
        category = default_cat
        if aspect > 1.8:
            category = "tickets"
        elif 0.8 <= aspect <= 1.2 and area < 25000:
            category = "badges"
        elif cw > 250 and ch > 250:
            category = "props"

        sticker_catalog.append({
            "id": f"cinesnap-stk-{stk_idx:03d}",
            "name": f"Cinema Asset {stk_idx + 1}",
            "category": category,
            "src": f"/assets/stickers/cinema/{stk_filename}",
            "width": cw,
            "height": ch,
            "defaultWidth": min(240, max(140, int(cw * 0.6)))
        })

        stk_idx += 1
        sheet_count += 1
        if stk_idx >= 40: # high variety limit
            break
    if stk_idx >= 40:
        break

print(f"[4/5] Extracted and processed {len(sticker_catalog)} individual stickers.")

# 5. Build frames.json and stickers.json manifests
frames_config = [
    {
        "id": "hollywood-red-3cut",
        "name": "Hollywood Star (Official)",
        "category": "Cinema",
        "cutCount": 3,
        "aspectRatio": 0.3846,
        "canvasWidth": 1200,
        "canvasHeight": 3120,
        "overlayUrl": "/assets/frames/hollywood-3cut-transparent.png",
        "thumbnailUrl": "/assets/frames/thumbs/hollywood-3cut.png",
        "backgroundColor": "#160D0C",
        "slots": [
            { "id": 1, "x": 0.251, "y": 0.103, "w": 0.455, "h": 0.260 },
            { "id": 2, "x": 0.251, "y": 0.371, "w": 0.455, "h": 0.256 },
            { "id": 3, "x": 0.251, "y": 0.635, "w": 0.455, "h": 0.256 }
        ]
    },
    {
        "id": "filmstrip-black-3cut",
        "name": "Celluloid Noir Strip",
        "category": "Classic",
        "cutCount": 3,
        "aspectRatio": 0.3846,
        "canvasWidth": 1200,
        "canvasHeight": 3120,
        "overlayUrl": "/assets/frames/filmstrip-black-3cut.png",
        "thumbnailUrl": "/assets/frames/thumbs/filmstrip-black-3cut.png",
        "backgroundColor": "#141416",
        "slots": fs_3cut_slots
    },
    {
        "id": "filmstrip-black-4cut",
        "name": "Cinema 4-Cut Strip",
        "category": "Classic",
        "cutCount": 4,
        "aspectRatio": 0.3333,
        "canvasWidth": 1200,
        "canvasHeight": 3600,
        "overlayUrl": "/assets/frames/filmstrip-black-4cut.png",
        "thumbnailUrl": "/assets/frames/thumbs/filmstrip-black-4cut.png",
        "backgroundColor": "#141416",
        "slots": fs_4cut_slots
    },
    {
        "id": "velvet-maroon-3cut",
        "name": "Velvet Maroon Minimalist",
        "category": "Warm Candid",
        "cutCount": 3,
        "aspectRatio": 0.3846,
        "canvasWidth": 1200,
        "canvasHeight": 3120,
        "overlayUrl": "/assets/frames/velvet-maroon-3cut.png",
        "thumbnailUrl": "/assets/frames/thumbs/velvet-maroon-3cut.png",
        "backgroundColor": "#241413",
        "slots": velvet_3cut_slots
    },
    {
        "id": "velvet-maroon-4cut",
        "name": "Velvet 4-Cut Marquee",
        "category": "Warm Candid",
        "cutCount": 4,
        "aspectRatio": 0.3333,
        "canvasWidth": 1200,
        "canvasHeight": 3600,
        "overlayUrl": "/assets/frames/velvet-maroon-4cut.png",
        "thumbnailUrl": "/assets/frames/thumbs/velvet-maroon-4cut.png",
        "backgroundColor": "#241413",
        "slots": velvet_4cut_slots
    },
    {
        "id": "scrapbook-cream-3cut",
        "name": "Popcorn Cream Scrapbook",
        "category": "Vintage Ticket",
        "cutCount": 3,
        "aspectRatio": 0.3846,
        "canvasWidth": 1200,
        "canvasHeight": 3120,
        "overlayUrl": "/assets/frames/scrapbook-cream-3cut.png",
        "thumbnailUrl": "/assets/frames/thumbs/scrapbook-cream-3cut.png",
        "backgroundColor": "#FAF0E4",
        "slots": sb_3cut_slots
    },
    {
        "id": "candid-grid-2x2",
        "name": "2x2 Candid Instagram Grid",
        "category": "Grid",
        "cutCount": 4,
        "aspectRatio": 1.0,
        "canvasWidth": 1600,
        "canvasHeight": 1600,
        "overlayUrl": "/assets/frames/candid-grid-2x2.png",
        "thumbnailUrl": "/assets/frames/thumbs/candid-grid-2x2.png",
        "backgroundColor": "#160D0C",
        "slots": grid_slots
    }
]

with open("src/data/frames.json", "w", encoding="utf-8") as f:
    json.dump(frames_config, f, indent=2)

with open("src/data/stickers.json", "w", encoding="utf-8") as f:
    json.dump(sticker_catalog, f, indent=2)

print("[5/5] Manifests written to src/data/frames.json and src/data/stickers.json")
print("=== Asset Pipeline Completed Successfully! ===")

