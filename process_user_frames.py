import cv2
import numpy as np
import json
import os
import shutil

print("=== PROCESSING 100% USER FRAMES FROM ASSETS/FRAME ===")

os.makedirs('public/assets/frames/thumbs', exist_ok=True)

# 1. Clean up previously generated artificial frames
generated_to_delete = [
    'public/assets/frames/filmstrip-black-3cut.png',
    'public/assets/frames/filmstrip-black-4cut.png',
    'public/assets/frames/velvet-maroon-3cut.png',
    'public/assets/frames/velvet-maroon-4cut.png',
    'public/assets/frames/scrapbook-cream-3cut.png',
    'public/assets/frames/candid-grid-2x2.png',
    'public/assets/frames/thumbs/filmstrip-black-3cut.png',
    'public/assets/frames/thumbs/filmstrip-black-4cut.png',
    'public/assets/frames/thumbs/velvet-maroon-3cut.png',
    'public/assets/frames/thumbs/velvet-maroon-4cut.png',
    'public/assets/frames/thumbs/scrapbook-cream-3cut.png',
    'public/assets/frames/thumbs/candid-grid-2x2.png',
]
for p in generated_to_delete:
    if os.path.exists(p):
        try: os.remove(p)
        except: pass

frames_list = []

# --- FRAME 1: Hollywood Cinema 3-Cut Frame (image.png) ---
h_raw = cv2.imread('assets/frame/image.png')
h_h, h_w = h_raw.shape[:2]
h_rgba = cv2.cvtColor(h_raw, cv2.COLOR_BGR2BGRA)

# Outer checkerboard removal
is_chk = (h_raw[:, :, 0] <= 45) & (h_raw[:, :, 1] <= 45) & (h_raw[:, :, 2] <= 45)
num_l, labels = cv2.connectedComponents(is_chk.astype(np.uint8))
border_l = set(np.unique(np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])))
border_l.discard(0)
outer_m = np.zeros((h_h, h_w), dtype=bool)
for lbl in border_l: outer_m |= (labels == lbl)
outer_m = cv2.dilate(outer_m.astype(np.uint8), np.ones((3,3), np.uint8)).astype(bool)
h_rgba[outer_m, 3] = 0

# Clapperboard protection polygon
clapper_poly = np.array([
    [65, 1130], [75, 1115], [255, 1034], [273, 1100], [288, 1135], [288, 1275], [65, 1275]
], np.int32)
clapper_prot = np.zeros((h_h, h_w), dtype=np.uint8)
cv2.fillPoly(clapper_prot, [clapper_poly], 255)

h_slots = [
    (135, 475, 185, 520),
    (480, 820, 185, 520),
    (825, 1165, 185, 520)
]
for (y1, y2, x1, x2) in h_slots:
    patch = h_raw[y1:y2, x1:x2]
    prot = clapper_prot[y1:y2, x1:x2]
    is_slot_chk = (
        (patch[:,:,0] <= 45) & (patch[:,:,1] <= 45) & (patch[:,:,2] <= 45) &
        (np.abs(patch[:,:,0].astype(int) - patch[:,:,1].astype(int)) <= 12) &
        (np.abs(patch[:,:,1].astype(int) - patch[:,:,2].astype(int)) <= 12) &
        (prot == 0)
    )
    h_rgba[y1:y2, x1:x2, 3][is_slot_chk] = 0

cv2.imwrite('public/assets/frames/hollywood-3cut.png', h_rgba)
cv2.imwrite('public/assets/frames/thumbs/hollywood-3cut.png', cv2.resize(h_rgba, (200, int(200*h_h/h_w))))

frames_list.append({
    "id": "hollywood-3cut",
    "name": "Hollywood Marquee 3-Cut",
    "category": "Cinema",
    "cutCount": 3,
    "aspectRatio": round(h_w / h_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * h_h / h_w),
    "overlayUrl": "/assets/frames/hollywood-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/hollywood-3cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": 0.251, "y": 0.103, "w": 0.455, "h": 0.260 },
        { "id": 2, "x": 0.251, "y": 0.371, "w": 0.455, "h": 0.256 },
        { "id": 3, "x": 0.251, "y": 0.635, "w": 0.455, "h": 0.256 }
    ]
})
print("1. Hollywood 3-cut done.")


# --- FRAME 2: Cinema Scrapbook 4-Cut Frame (image copy 4.png) ---
sb_raw = cv2.imread('assets/frame/image copy 4.png')
sb_h, sb_w = sb_raw.shape[:2]
sb_rgba = cv2.cvtColor(sb_raw, cv2.COLOR_BGR2BGRA)

# Slots: 3 film slots + camera slot
sb_slots_def = [
    (82, 305, 51, 354),   # Slot 1
    (301, 527, 80, 382),  # Slot 2
    (523, 748, 108, 411), # Slot 3
    (806, 1018, 305, 577) # Slot 4 (Camera screen)
]
for (y1, y2, x1, x2) in sb_slots_def:
    patch = sb_raw[y1:y2, x1:x2]
    is_w = (patch[:,:,0] > 230) & (patch[:,:,1] > 230) & (patch[:,:,2] > 230)
    sb_rgba[y1:y2, x1:x2, 3][is_w] = 0

cv2.imwrite('public/assets/frames/scrapbook-cinema-4cut.png', sb_rgba)
cv2.imwrite('public/assets/frames/thumbs/scrapbook-cinema-4cut.png', cv2.resize(sb_rgba, (200, int(200*sb_h/sb_w))))

frames_list.append({
    "id": "scrapbook-cinema-4cut",
    "name": "Cinema Scrapbook 4-Cut",
    "category": "Scrapbook",
    "cutCount": 4,
    "aspectRatio": round(sb_w / sb_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * sb_h / sb_w),
    "overlayUrl": "/assets/frames/scrapbook-cinema-4cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/scrapbook-cinema-4cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": 0.069, "y": 0.063, "w": 0.412, "h": 0.170 },
        { "id": 2, "x": 0.109, "y": 0.230, "w": 0.410, "h": 0.173 },
        { "id": 3, "x": 0.147, "y": 0.400, "w": 0.412, "h": 0.172 },
        { "id": 4, "x": 0.414, "y": 0.616, "w": 0.370, "h": 0.162 }
    ]
})
print("2. Scrapbook cinema 4-cut done.")


# --- FRAME 3: BASF Cassette Tape 90s Grunge 3-Cut (image copy 7.png) ---
cas_raw = cv2.imread('assets/frame/image copy 7.png')
cas_h, cas_w = cas_raw.shape[:2]
cas_rgba = cv2.cvtColor(cas_raw, cv2.COLOR_BGR2BGRA)

# 3 Polaroids with dark centers:
# Slot 1: y=350..871, x=246..706
# Slot 2: y=889..1412, x=439..952
# Slot 3: y=1427..1863, x=215..649
cas_slots = [
    (360, 860, 255, 695),
    (900, 1400, 450, 940),
    (1440, 1850, 225, 640)
]
for (y1, y2, x1, x2) in cas_slots:
    patch = cas_raw[y1:y2, x1:x2]
    is_d = (patch[:,:,0] < 35) & (patch[:,:,1] < 35) & (patch[:,:,2] < 35)
    cas_rgba[y1:y2, x1:x2, 3][is_d] = 0

cv2.imwrite('public/assets/frames/grunge-cassette-3cut.png', cas_rgba)
cv2.imwrite('public/assets/frames/thumbs/grunge-cassette-3cut.png', cv2.resize(cas_rgba, (200, int(200*cas_h/cas_w))))

frames_list.append({
    "id": "grunge-cassette-3cut",
    "name": "90s Tape Grunge 3-Cut",
    "category": "Vintage 90s",
    "cutCount": 3,
    "aspectRatio": round(cas_w / cas_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * cas_h / cas_w),
    "overlayUrl": "/assets/frames/grunge-cassette-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/grunge-cassette-3cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": round(255/cas_w, 4), "y": round(360/cas_h, 4), "w": round(440/cas_w, 4), "h": round(500/cas_h, 4) },
        { "id": 2, "x": round(450/cas_w, 4), "y": round(900/cas_h, 4), "w": round(490/cas_w, 4), "h": round(500/cas_h, 4) },
        { "id": 3, "x": round(225/cas_w, 4), "y": round(1440/cas_h, 4), "w": round(415/cas_w, 4), "h": round(410/cas_h, 4) }
    ]
})
print("3. 90s Tape Grunge 3-cut done.")


# --- FRAME 4: Dark Goth Tartan Plaid 4-Cut (image copy 12.png) ---
plaid_raw = cv2.imread('assets/frame/image copy 12.png')
pl_h, pl_w = plaid_raw.shape[:2]
pl_rgba = cv2.cvtColor(plaid_raw, cv2.COLOR_BGR2BGRA)

# 4 white polaroid centers in image copy 12:
# Slot 1: x=576..1021, y=68..514
# Slot 2: x=107..609, y=511..1013
# Slot 3: x=631..1128, y=733..1231
# Slot 4: x=146..740, y=1189..1784
pl_slots = [
    (68, 514, 576, 1021),
    (511, 1013, 107, 609),
    (733, 1231, 631, 1128),
    (1189, 1784, 146, 740)
]
for (y1, y2, x1, x2) in pl_slots:
    patch = plaid_raw[y1:y2, x1:x2]
    is_w = (patch[:,:,0] > 235) & (patch[:,:,1] > 235) & (patch[:,:,2] > 235)
    pl_rgba[y1:y2, x1:x2, 3][is_w] = 0

cv2.imwrite('public/assets/frames/goth-tartan-4cut.png', pl_rgba)
cv2.imwrite('public/assets/frames/thumbs/goth-tartan-4cut.png', cv2.resize(pl_rgba, (200, int(200*pl_h/pl_w))))

frames_list.append({
    "id": "goth-tartan-4cut",
    "name": "Dark Tartan Plaid 4-Cut",
    "category": "Y2K Grunge",
    "cutCount": 4,
    "aspectRatio": round(pl_w / pl_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * pl_h / pl_w),
    "overlayUrl": "/assets/frames/goth-tartan-4cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/goth-tartan-4cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": round(576/pl_w, 4), "y": round(68/pl_h, 4), "w": round(445/pl_w, 4), "h": round(446/pl_h, 4) },
        { "id": 2, "x": round(107/pl_w, 4), "y": round(511/pl_h, 4), "w": round(502/pl_w, 4), "h": round(502/pl_h, 4) },
        { "id": 3, "x": round(631/pl_w, 4), "y": round(733/pl_h, 4), "w": round(497/pl_w, 4), "h": round(498/pl_h, 4) },
        { "id": 4, "x": round(146/pl_w, 4), "y": round(1189/pl_h, 4), "w": round(594/pl_w, 4), "h": round(595/pl_h, 4) }
    ]
})
print("4. Dark Tartan Plaid 4-cut done.")


# --- FRAME 5: Y2K Retro Media & Tamagotchi 4-Cut (image copy 6.png) ---
ym_raw = cv2.imread('assets/frame/image copy 6.png')
ym_h, ym_w = ym_raw.shape[:2]
ym_rgba = cv2.cvtColor(ym_raw, cv2.COLOR_BGR2BGRA)

# Slots:
# Polaroid 1 (top-left): y=25..577, x=31..543
# Polaroid 2 (mid-left): y=318..620, x=58..410
# Tamagotchi screen: y=500..650, x=600..880
# TV screen: y=750..920, x=290..700
ym_slots = [
    (25, 577, 31, 543),
    (318, 620, 58, 410),
    (495, 655, 605, 875),
    (750, 920, 290, 700)
]
for (y1, y2, x1, x2) in ym_slots:
    patch = ym_raw[y1:y2, x1:x2]
    is_d = (patch[:,:,0] < 45) & (patch[:,:,1] < 45) & (patch[:,:,2] < 45)
    ym_rgba[y1:y2, x1:x2, 3][is_d] = 0

cv2.imwrite('public/assets/frames/y2k-media-4cut.png', ym_rgba)
cv2.imwrite('public/assets/frames/thumbs/y2k-media-4cut.png', cv2.resize(ym_rgba, (200, int(200*ym_h/ym_w))))

frames_list.append({
    "id": "y2k-media-4cut",
    "name": "Tamagotchi & Retro TV 4-Cut",
    "category": "Y2K Grunge",
    "cutCount": 4,
    "aspectRatio": round(ym_w / ym_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * ym_h / ym_w),
    "overlayUrl": "/assets/frames/y2k-media-4cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/y2k-media-4cut.png",
    "backgroundColor": "#141D2B",
    "slots": [
        { "id": 1, "x": round(31/ym_w, 4), "y": round(25/ym_h, 4), "w": round(512/ym_w, 4), "h": round(552/ym_h, 4) },
        { "id": 2, "x": round(58/ym_w, 4), "y": round(318/ym_h, 4), "w": round(352/ym_w, 4), "h": round(302/ym_h, 4) },
        { "id": 3, "x": round(605/ym_w, 4), "y": round(495/ym_h, 4), "w": round(270/ym_w, 4), "h": round(160/ym_h, 4) },
        { "id": 4, "x": round(290/ym_w, 4), "y": round(750/ym_h, 4), "w": round(410/ym_w, 4), "h": round(170/ym_h, 4) }
    ]
})
print("5. Y2K Media 4-cut done.")


# --- FRAME 6: Noir Y2K Digital Swag 3-Cut (image copy 8.png) ---
swag_raw = cv2.imread('assets/frame/image copy 8.png')
sw_h, sw_w = swag_raw.shape[:2]
sw_rgba = cv2.cvtColor(swag_raw, cv2.COLOR_BGR2BGRA)

# Slots:
# Phone screen (top-right): y=80..420, x=510..930
# Gameboy screen (mid-left): y=350..600, x=65..485
# Digicam screen (bot-right): y=520..810, x=515..945
sw_slots = [
    (80, 420, 510, 930),
    (350, 600, 65, 485),
    (520, 810, 515, 945)
]
for (y1, y2, x1, x2) in sw_slots:
    patch = swag_raw[y1:y2, x1:x2]
    is_slot = ((patch[:,:,0] > 240) & (patch[:,:,1] > 240) & (patch[:,:,2] > 240)) | ((patch[:,:,0] < 30) & (patch[:,:,1] < 30) & (patch[:,:,2] < 30))
    sw_rgba[y1:y2, x1:x2, 3][is_slot] = 0

cv2.imwrite('public/assets/frames/noir-swag-3cut.png', sw_rgba)
cv2.imwrite('public/assets/frames/thumbs/noir-swag-3cut.png', cv2.resize(sw_rgba, (200, int(200*sw_h/sw_w))))

frames_list.append({
    "id": "noir-swag-3cut",
    "name": "Noir Cyber Swag 3-Cut",
    "category": "Y2K Grunge",
    "cutCount": 3,
    "aspectRatio": round(sw_w / sw_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * sw_h / sw_w),
    "overlayUrl": "/assets/frames/noir-swag-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/noir-swag-3cut.png",
    "backgroundColor": "#111111",
    "slots": [
        { "id": 1, "x": round(510/sw_w, 4), "y": round(80/sw_h, 4), "w": round(420/sw_w, 4), "h": round(340/sw_h, 4) },
        { "id": 2, "x": round(65/sw_w, 4), "y": round(350/sw_h, 4), "w": round(420/sw_w, 4), "h": round(250/sw_h, 4) },
        { "id": 3, "x": round(515/sw_w, 4), "y": round(520/sw_h, 4), "w": round(430/sw_w, 4), "h": round(290/sw_h, 4) }
    ]
})
print("6. Noir Swag 3-cut done.")


# --- FRAME 7: Spotify & Digicam 4-Cut (image copy 9.png) ---
sp_raw = cv2.imread('assets/frame/image copy 9.png')
sp_h, sp_w = sp_raw.shape[:2]
sp_rgba = cv2.cvtColor(sp_raw, cv2.COLOR_BGR2BGRA)

# Slots:
# 1. Spotify album cover: y=60..250, x=20..380
# 2. Polaroid (top-right): y=60..300, x=510..970
# 3. Digicam screen: y=515..630, x=505..765
# 4. Filmstrip: y=980..1320, x=50..420
sp_slots = [
    (60, 260, 20, 390),
    (60, 310, 510, 970),
    (510, 640, 500, 775),
    (980, 1320, 50, 420)
]
for (y1, y2, x1, x2) in sp_slots:
    patch = sp_raw[y1:y2, x1:x2]
    is_d_or_w = ((patch[:,:,0] < 35) & (patch[:,:,1] < 35) & (patch[:,:,2] < 35)) | ((patch[:,:,0] > 235) & (patch[:,:,1] > 235) & (patch[:,:,2] > 235))
    sp_rgba[y1:y2, x1:x2, 3][is_d_or_w] = 0

cv2.imwrite('public/assets/frames/spotify-digicam-4cut.png', sp_rgba)
cv2.imwrite('public/assets/frames/thumbs/spotify-digicam-4cut.png', cv2.resize(sp_rgba, (200, int(200*sp_h/sp_w))))

frames_list.append({
    "id": "spotify-digicam-4cut",
    "name": "Spotify Player & Digicam 4-Cut",
    "category": "Scrapbook",
    "cutCount": 4,
    "aspectRatio": round(sp_w / sp_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * sp_h / sp_w),
    "overlayUrl": "/assets/frames/spotify-digicam-4cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/spotify-digicam-4cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": round(20/sp_w, 4), "y": round(60/sp_h, 4), "w": round(370/sp_w, 4), "h": round(200/sp_h, 4) },
        { "id": 2, "x": round(510/sp_w, 4), "y": round(60/sp_h, 4), "w": round(460/sp_w, 4), "h": round(250/sp_h, 4) },
        { "id": 3, "x": round(500/sp_w, 4), "y": round(510/sp_h, 4), "w": round(275/sp_w, 4), "h": round(130/sp_h, 4) },
        { "id": 4, "x": round(50/sp_w, 4), "y": round(980/sp_h, 4), "w": round(370/sp_w, 4), "h": round(340/sp_h, 4) }
    ]
})
print("7. Spotify Digicam 4-cut done.")


# --- FRAME 8: Y2K Candid 3-Polaroid Quote (image copy 13.png) ---
y13_raw = cv2.imread('assets/frame/image copy 13.png')
y13_h, y13_w = y13_raw.shape[:2]
y13_rgba = cv2.cvtColor(y13_raw, cv2.COLOR_BGR2BGRA)

y13_slots = [
    (240, 720, 270, 710),
    (720, 1180, 480, 910),
    (1300, 1720, 310, 710)
]
for (y1, y2, x1, x2) in y13_slots:
    patch = y13_raw[y1:y2, x1:x2]
    is_d = (patch[:,:,0] < 35) & (patch[:,:,1] < 35) & (patch[:,:,2] < 35)
    y13_rgba[y1:y2, x1:x2, 3][is_d] = 0

cv2.imwrite('public/assets/frames/y2k-vinyl-3cut.png', y13_rgba)
cv2.imwrite('public/assets/frames/thumbs/y2k-vinyl-3cut.png', cv2.resize(y13_rgba, (200, int(200*y13_h/y13_w))))

frames_list.append({
    "id": "y2k-vinyl-3cut",
    "name": "Vinyl & Red Moon 3-Cut",
    "category": "Polaroid",
    "cutCount": 3,
    "aspectRatio": round(y13_w / y13_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * y13_h / y13_w),
    "overlayUrl": "/assets/frames/y2k-vinyl-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/y2k-vinyl-3cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": round(270/y13_w, 4), "y": round(240/y13_h, 4), "w": round(440/y13_w, 4), "h": round(480/y13_h, 4) },
        { "id": 2, "x": round(480/y13_w, 4), "y": round(720/y13_h, 4), "w": round(430/y13_w, 4), "h": round(460/y13_h, 4) },
        { "id": 3, "x": round(310/y13_w, 4), "y": round(1300/y13_h, 4), "w": round(400/y13_w, 4), "h": round(420/y13_h, 4) }
    ]
})
print("8. Y2K Vinyl 3-cut done.")


# --- FRAME 9: Polaroid OneStep on Velvet (image copy 3.png) ---
p3_raw = cv2.imread('assets/frame/image copy 3.png')
p3_h, p3_w = p3_raw.shape[:2]
p3_rgba = cv2.cvtColor(p3_raw, cv2.COLOR_BGR2BGRA)

p3_slots = [
    (507, 806, 333, 630),
    (836, 1137, 334, 633),
    (1167, 1467, 336, 635)
]
for (y1, y2, x1, x2) in p3_slots:
    patch = p3_raw[y1:y2, x1:x2]
    is_d = (patch[:,:,0] < 35) & (patch[:,:,1] < 35) & (patch[:,:,2] < 35)
    p3_rgba[y1:y2, x1:x2, 3][is_d] = 0

cv2.imwrite('public/assets/frames/polaroid-velvet-3cut.png', p3_rgba)
cv2.imwrite('public/assets/frames/thumbs/polaroid-velvet-3cut.png', cv2.resize(p3_rgba, (200, int(200*p3_h/p3_w))))

frames_list.append({
    "id": "polaroid-velvet-3cut",
    "name": "Polaroid OneStep Velvet 3-Cut",
    "category": "Polaroid",
    "cutCount": 3,
    "aspectRatio": round(p3_w / p3_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * p3_h / p3_w),
    "overlayUrl": "/assets/frames/polaroid-velvet-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/polaroid-velvet-3cut.png",
    "backgroundColor": "#241413",
    "slots": [
        { "id": 1, "x": round(333/p3_w, 4), "y": round(507/p3_h, 4), "w": round(297/p3_w, 4), "h": round(299/p3_h, 4) },
        { "id": 2, "x": round(334/p3_w, 4), "y": round(836/p3_h, 4), "w": round(299/p3_w, 4), "h": round(301/p3_h, 4) },
        { "id": 3, "x": round(336/p3_w, 4), "y": round(1167/p3_h, 4), "w": round(299/p3_w, 4), "h": round(300/p3_h, 4) }
    ]
})
print("9. Polaroid Velvet 3-cut done.")


# --- FRAME 10: Birthday Celebration Polaroid Strip (image copy 2.png) ---
b2_raw = cv2.imread('assets/frame/image copy 2.png')
b2_h, b2_w = b2_raw.shape[:2]
b2_rgba = cv2.cvtColor(b2_raw, cv2.COLOR_BGR2BGRA)

# 4 photo slots along the strip:
# Slot 1: y=500..830, x=330..820
# Slot 2: y=860..1190, x=330..820
# Slot 3: y=1220..1550, x=330..820
# Slot 4: y=1580..1880, x=330..820
b2_slots = [
    (520, 830, 320, 830),
    (880, 1190, 320, 830),
    (1240, 1550, 320, 830)
]
for (y1, y2, x1, x2) in b2_slots:
    patch = b2_raw[y1:y2, x1:x2]
    is_w = (patch[:,:,0] > 240) & (patch[:,:,1] > 240) & (patch[:,:,2] > 240)
    b2_rgba[y1:y2, x1:x2, 3][is_w] = 0

cv2.imwrite('public/assets/frames/birthday-polaroid-3cut.png', b2_rgba)
cv2.imwrite('public/assets/frames/thumbs/birthday-polaroid-3cut.png', cv2.resize(b2_rgba, (200, int(200*b2_h/b2_w))))

frames_list.append({
    "id": "birthday-polaroid-3cut",
    "name": "Birthday Teddy 3-Cut",
    "category": "Polaroid",
    "cutCount": 3,
    "aspectRatio": round(b2_w / b2_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * b2_h / b2_w),
    "overlayUrl": "/assets/frames/birthday-polaroid-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/birthday-polaroid-3cut.png",
    "backgroundColor": "#FAF0E4",
    "slots": [
        { "id": 1, "x": round(320/b2_w, 4), "y": round(520/b2_h, 4), "w": round(510/b2_w, 4), "h": round(310/b2_h, 4) },
        { "id": 2, "x": round(320/b2_w, 4), "y": round(880/b2_h, 4), "w": round(510/b2_w, 4), "h": round(310/b2_h, 4) },
        { "id": 3, "x": round(320/b2_w, 4), "y": round(1240/b2_h, 4), "w": round(510/b2_w, 4), "h": round(310/b2_h, 4) }
    ]
})
print("10. Birthday Teddy 3-cut done.")

with open('src/data/frames.json', 'w', encoding='utf-8') as f:
    json.dump(frames_list, f, indent=2)

print(f"=== Successfully generated {len(frames_list)} authentic user frames in src/data/frames.json! ===")

