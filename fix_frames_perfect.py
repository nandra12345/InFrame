import cv2
import numpy as np
import json
import os

print("=== RE-PROCESSING USER FRAMES WITH 1:1 PIXEL-PERFECT SLOTS ===")

os.makedirs('public/assets/frames/thumbs', exist_ok=True)

frames_list = []

# --- 1. Hollywood Cinema 3-Cut (assets/frame/image.png) ---
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
        { "id": 1, "x": round(185/h_w, 4), "y": round(135/h_h, 4), "w": round(335/h_w, 4), "h": round(340/h_h, 4) },
        { "id": 2, "x": round(185/h_w, 4), "y": round(480/h_h, 4), "w": round(335/h_w, 4), "h": round(340/h_h, 4) },
        { "id": 3, "x": round(185/h_w, 4), "y": round(825/h_h, 4), "w": round(335/h_w, 4), "h": round(340/h_h, 4) }
    ]
})
print("1. Hollywood 3-cut done.")


# --- 2. Cinema Scrapbook 4-Cut (assets/frame/image copy 4.png) ---
sb_raw = cv2.imread('assets/frame/image copy 4.png')
sb_h, sb_w = sb_raw.shape[:2]
sb_rgba = cv2.cvtColor(sb_raw, cv2.COLOR_BGR2BGRA)

sb_slots_def = [
    (82, 305, 51, 354),
    (301, 527, 80, 382),
    (523, 748, 108, 411),
    (806, 1018, 305, 577)
]
for (y1, y2, x1, x2) in sb_slots_def:
    patch = sb_raw[y1:y2, x1:x2]
    is_w = (patch[:,:,0] > 220) & (patch[:,:,1] > 220) & (patch[:,:,2] > 220)
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
        { "id": 1, "x": round(51/sb_w, 4), "y": round(82/sb_h, 4), "w": round(303/sb_w, 4), "h": round(223/sb_h, 4) },
        { "id": 2, "x": round(80/sb_w, 4), "y": round(301/sb_h, 4), "w": round(302/sb_w, 4), "h": round(226/sb_h, 4) },
        { "id": 3, "x": round(108/sb_w, 4), "y": round(523/sb_h, 4), "w": round(303/sb_w, 4), "h": round(225/sb_h, 4) },
        { "id": 4, "x": round(305/sb_w, 4), "y": round(806/sb_h, 4), "w": round(272/sb_w, 4), "h": round(212/sb_h, 4) }
    ]
})
print("2. Scrapbook cinema 4-cut done.")


# --- 3. BASF Cassette Tape 90s Grunge 3-Cut (assets/frame/image copy 7.png) ---
cas_raw = cv2.imread('assets/frame/image copy 7.png')
cas_h, cas_w = cas_raw.shape[:2]
cas_rgba = cv2.cvtColor(cas_raw, cv2.COLOR_BGR2BGRA)

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


# --- 4. Dark Goth Tartan Plaid 4-Cut (assets/frame/image copy 12.png) ---
plaid_raw = cv2.imread('assets/frame/image copy 12.png')
pl_h, pl_w = plaid_raw.shape[:2]
pl_rgba = cv2.cvtColor(plaid_raw, cv2.COLOR_BGR2BGRA)

pl_slots = [
    (68, 514, 576, 1021),
    (511, 1013, 107, 609),
    (733, 1231, 631, 1128),
    (1189, 1784, 146, 740)
]
for (y1, y2, x1, x2) in pl_slots:
    patch = plaid_raw[y1:y2, x1:x2]
    is_w = (patch[:,:,0] > 230) & (patch[:,:,1] > 230) & (patch[:,:,2] > 230)
    pl_rgba[y1:y2, x1:x2, 3][is_w] = 0

cv2.imwrite('public/assets/frames/goth-tartan-4cut.png', pl_rgba)
cv2.imwrite('public/assets/frames/thumbs/goth-tartan-4cut.png', cv2.resize(pl_rgba, (200, int(200*pl_h/pl_w))))

frames_list.append({
    "id": "goth-tartan-4cut",
    "name": "Dark Tartan Plaid 4-Cut",
    "category": "Vintage 90s",
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


# --- 5. FIXED: Tamagotchi & Retro TV 4-Cut (assets/frame/image copy 6.png) ---
ym_raw = cv2.imread('assets/frame/image copy 6.png')
ym_h, ym_w = ym_raw.shape[:2]
ym_rgba = cv2.cvtColor(ym_raw, cv2.COLOR_BGR2BGRA)

# Punch out all 4 distinct slots:
# Slot 1: Top Polaroid (y: 50..550, x: 50..500)
# Slot 2: Mid Polaroid (y: 601..1100, x: 77..500)
# Slot 3: Tamagotchi screen (y: 900..1200, x: 580..880)
# Slot 4: TV screen at bottom (y: 1450..1820, x: 380..700)
ym_rgba[50:550, 50:500, 3] = 0
ym_rgba[601:1100, 77:500, 3] = 0
ym_rgba[900:1200, 580:880, 3] = 0
ym_rgba[1450:1820, 380:700, 3] = 0

cv2.imwrite('public/assets/frames/y2k-media-4cut.png', ym_rgba)
cv2.imwrite('public/assets/frames/thumbs/y2k-media-4cut.png', cv2.resize(ym_rgba, (200, int(200*ym_h/ym_w))))

frames_list.append({
    "id": "y2k-media-4cut",
    "name": "Tamagotchi & Retro TV 4-Cut",
    "category": "Scrapbook",
    "cutCount": 4,
    "aspectRatio": round(ym_w / ym_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * ym_h / ym_w),
    "overlayUrl": "/assets/frames/y2k-media-4cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/y2k-media-4cut.png",
    "backgroundColor": "#141D2B",
    "slots": [
        { "id": 1, "x": round(50/ym_w, 4), "y": round(50/ym_h, 4), "w": round(450/ym_w, 4), "h": round(500/ym_h, 4) },
        { "id": 2, "x": round(77/ym_w, 4), "y": round(601/ym_h, 4), "w": round(423/ym_w, 4), "h": round(499/ym_h, 4) },
        { "id": 3, "x": round(580/ym_w, 4), "y": round(900/ym_h, 4), "w": round(300/ym_w, 4), "h": round(300/ym_h, 4) },
        { "id": 4, "x": round(380/ym_w, 4), "y": round(1450/ym_h, 4), "w": round(320/ym_w, 4), "h": round(370/ym_h, 4) }
    ]
})
print("5. Tamagotchi & TV 4-cut FIXED 1:1.")


# --- 6. Noir Cyber Swag 3-Cut (assets/frame/image copy 8.png) ---
swag_raw = cv2.imread('assets/frame/image copy 8.png')
sw_h, sw_w = swag_raw.shape[:2]
sw_rgba = cv2.cvtColor(swag_raw, cv2.COLOR_BGR2BGRA)

sw_slots = [
    (80, 420, 510, 930),
    (350, 600, 65, 485),
    (520, 810, 515, 945)
]
for (y1, y2, x1, x2) in sw_slots:
    patch = swag_raw[y1:y2, x1:x2]
    is_slot = ((patch[:,:,0] > 230) & (patch[:,:,1] > 230) & (patch[:,:,2] > 230)) | ((patch[:,:,0] < 35) & (patch[:,:,1] < 35) & (patch[:,:,2] < 35))
    sw_rgba[y1:y2, x1:x2, 3][is_slot] = 0

cv2.imwrite('public/assets/frames/noir-swag-3cut.png', sw_rgba)
cv2.imwrite('public/assets/frames/thumbs/noir-swag-3cut.png', cv2.resize(sw_rgba, (200, int(200*sw_h/sw_w))))

frames_list.append({
    "id": "noir-swag-3cut",
    "name": "Noir Cyber Swag 3-Cut",
    "category": "Cinema",
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


# --- 7. FIXED: Spotify Player & Digicam 4-Cut (assets/frame/image copy 9.png) ---
sp_raw = cv2.imread('assets/frame/image copy 9.png')
sp_h, sp_w = sp_raw.shape[:2]
sp_rgba = cv2.cvtColor(sp_raw, cv2.COLOR_BGR2BGRA)

# Punch out exact 4 slots:
# Slot 1: Spotify Player (y: 90..530, x: 20..449)
# Slot 2: Polaroid Top Right (y: 80..740, x: 530..1040)
# Slot 3: Digicam screen (y: 1040..1250, x: 580..860)
# Slot 4: Filmstrip frame (y: 989..1320, x: 52..417)
sp_rgba[90:530, 20:449, 3] = 0
sp_rgba[80:740, 530:1040, 3] = 0
sp_rgba[1040:1250, 580:860, 3] = 0
sp_rgba[989:1320, 52:417, 3] = 0

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
        { "id": 1, "x": round(20/sp_w, 4), "y": round(90/sp_h, 4), "w": round(429/sp_w, 4), "h": round(440/sp_h, 4) },
        { "id": 2, "x": round(530/sp_w, 4), "y": round(80/sp_h, 4), "w": round(510/sp_w, 4), "h": round(660/sp_h, 4) },
        { "id": 3, "x": round(580/sp_w, 4), "y": round(1040/sp_h, 4), "w": round(280/sp_w, 4), "h": round(210/sp_h, 4) },
        { "id": 4, "x": round(52/sp_w, 4), "y": round(989/sp_h, 4), "w": round(365/sp_w, 4), "h": round(331/sp_h, 4) }
    ]
})
print("7. Spotify & Digicam 4-cut FIXED 1:1.")


# --- 8. FIXED: Vinyl & Red Moon 3-Cut (assets/frame/image copy 13.png) ---
y13_raw = cv2.imread('assets/frame/image copy 13.png')
y13_h, y13_w = y13_raw.shape[:2]
y13_rgba = cv2.cvtColor(y13_raw, cv2.COLOR_BGR2BGRA)

# Punch out exact 3 polaroid cutouts:
# Slot 1: y=250..700, x=450..850
# Slot 2: y=730..1180, x=450..850
# Slot 3: y=1300..1750, x=450..850
y13_rgba[250:700, 450:850, 3] = 0
y13_rgba[730:1180, 450:850, 3] = 0
y13_rgba[1300:1750, 450:850, 3] = 0

cv2.imwrite('public/assets/frames/y2k-vinyl-3cut.png', y13_rgba)
cv2.imwrite('public/assets/frames/thumbs/y2k-vinyl-3cut.png', cv2.resize(y13_rgba, (200, int(200*y13_h/y13_w))))

frames_list.append({
    "id": "y2k-vinyl-3cut",
    "name": "Vinyl & Red Moon 3-Cut",
    "category": "Vintage 90s",
    "cutCount": 3,
    "aspectRatio": round(y13_w / y13_h, 4),
    "canvasWidth": 1200,
    "canvasHeight": int(1200 * y13_h / y13_w),
    "overlayUrl": "/assets/frames/y2k-vinyl-3cut.png",
    "thumbnailUrl": "/assets/frames/thumbs/y2k-vinyl-3cut.png",
    "backgroundColor": "#160D0C",
    "slots": [
        { "id": 1, "x": round(450/y13_w, 4), "y": round(250/y13_h, 4), "w": round(400/y13_w, 4), "h": round(450/y13_h, 4) },
        { "id": 2, "x": round(450/y13_w, 4), "y": round(730/y13_h, 4), "w": round(400/y13_w, 4), "h": round(450/y13_h, 4) },
        { "id": 3, "x": round(450/y13_w, 4), "y": round(1300/y13_h, 4), "w": round(400/y13_w, 4), "h": round(450/y13_h, 4) }
    ]
})
print("8. Vinyl & Red Moon 3-cut FIXED 1:1.")


# --- 9. Polaroid OneStep on Velvet (assets/frame/image copy 3.png) ---
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


# --- 10. FIXED: Birthday Teddy 3-Cut (assets/frame/image copy 2.png) ---
b2_raw = cv2.imread('assets/frame/image copy 2.png')
b2_h, b2_w = b2_raw.shape[:2]
b2_rgba = cv2.cvtColor(b2_raw, cv2.COLOR_BGR2BGRA)

# Punch out exact 3 inner ladder rectangles:
# Slot 1: y=543..897, x=369..824
# Slot 2: y=930..1283, x=369..824
# Slot 3: y=1318..1672, x=366..821
b2_rgba[543:897, 369:824, 3] = 0
b2_rgba[930:1283, 369:824, 3] = 0
b2_rgba[1318:1672, 366:821, 3] = 0

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
        { "id": 1, "x": round(369/b2_w, 4), "y": round(543/b2_h, 4), "w": round(455/b2_w, 4), "h": round(354/b2_h, 4) },
        { "id": 2, "x": round(369/b2_w, 4), "y": round(930/b2_h, 4), "w": round(455/b2_w, 4), "h": round(353/b2_h, 4) },
        { "id": 3, "x": round(366/b2_w, 4), "y": round(1318/b2_h, 4), "w": round(455/b2_w, 4), "h": round(354/b2_h, 4) }
    ]
})
print("10. Birthday Teddy 3-cut FIXED 1:1.")

with open('src/data/frames.json', 'w', encoding='utf-8') as f:
    json.dump(frames_list, f, indent=2)

print(f"\n✅ SUCCESS: All {len(frames_list)} frames generated with 1:1 exact pixel precision!")

