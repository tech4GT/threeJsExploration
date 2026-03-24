"""
Post-process pencil-to-atom.mp4:
  - Stage-aware brightness/gamma/contrast
  - Bloom glow on bright emissive pixels
  - Saturation boost
Re-encodes to pencil-to-atom-enhanced.mp4
"""

import numpy as np
import imageio.v2 as imageio
from PIL import Image, ImageFilter, ImageEnhance
import sys, os

INPUT  = '/home/user/threeJsExploration/pencil-to-atom.mp4'
OUTPUT = '/home/user/threeJsExploration/pencil-to-atom-enhanced.mp4'
FPS    = 60

# Stage boundaries (cumulative frame index)
STAGE_FRAMES = [300, 300, 300, 300, 360]  # 5s,5s,5s,5s,6s @ 60fps
STAGE_STARTS = [0]
for n in STAGE_FRAMES[:-1]:
    STAGE_STARTS.append(STAGE_STARTS[-1] + n)

# Per-stage processing params: (gamma, contrast, brightness, saturation, bloom_thresh, bloom_strength)
# gamma   < 1 = lift dark areas
# contrast > 1 = more punchy
# bloom_thresh = pixel value [0-255] above which glow is applied
# bloom_strength = blend factor for bloom
STAGE_PARAMS = [
    # pencil macro — mostly fine, light polish
    dict(gamma=0.85, contrast=1.25, brightness=1.1,  saturation=1.3, bloom_thresh=180, bloom_strength=0.4),
    # graphite tip — fine, slight lift
    dict(gamma=0.85, contrast=1.3,  brightness=1.15, saturation=1.2, bloom_thresh=160, bloom_strength=0.4),
    # graphene layers — very dark, heavy lift + strong bloom
    dict(gamma=0.45, contrast=2.2,  brightness=1.8,  saturation=2.5, bloom_thresh=80,  bloom_strength=0.9),
    # graphene sheet (glowing dots) — dark, strong lift + heavy bloom
    dict(gamma=0.40, contrast=2.5,  brightness=2.0,  saturation=3.0, bloom_thresh=60,  bloom_strength=1.2),
    # carbon atom — good, polish bloom on electrons
    dict(gamma=0.80, contrast=1.3,  brightness=1.1,  saturation=1.4, bloom_thresh=140, bloom_strength=0.6),
]


def stage_for_frame(idx):
    for s in range(len(STAGE_STARTS) - 1, -1, -1):
        if idx >= STAGE_STARTS[s]:
            return s
    return 0


def bloom(img_np, thresh, strength, blur_radius=18):
    """Extract bright pixels, blur them, blend back."""
    arr = img_np.astype(np.float32)
    bright = np.clip(arr - thresh, 0, None)
    bright_img = Image.fromarray(bright.astype(np.uint8))
    blurred = bright_img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    blurred_np = np.array(blurred).astype(np.float32)
    result = arr + blurred_np * strength
    return np.clip(result, 0, 255).astype(np.uint8)


def gamma_correct(img_np, gamma):
    lut = np.array([((i / 255.0) ** gamma) * 255 for i in range(256)], dtype=np.uint8)
    return lut[img_np]


def process_frame(frame_np, params):
    # 1. Gamma lift
    out = gamma_correct(frame_np, params['gamma'])

    # 2. PIL contrast + brightness + saturation
    img = Image.fromarray(out)
    img = ImageEnhance.Contrast(img).enhance(params['contrast'])
    img = ImageEnhance.Brightness(img).enhance(params['brightness'])
    img = ImageEnhance.Color(img).enhance(params['saturation'])
    out = np.array(img)

    # 3. Bloom
    out = bloom(out, params['bloom_thresh'], params['bloom_strength'])

    # 4. Clamp
    return np.clip(out, 0, 255).astype(np.uint8)


print(f'Reading {INPUT}...')
reader = imageio.get_reader(INPUT)
meta = reader.get_meta_data()
total = meta.get('nframes', '?')
print(f'  {total} frames at {meta["fps"]}fps')

print(f'Writing to {OUTPUT}...')
writer = imageio.get_writer(OUTPUT, fps=FPS, codec='libx264', output_params=['-crf', '22', '-preset', 'slow'])

for idx, frame in enumerate(reader):
    stage = stage_for_frame(idx)
    params = STAGE_PARAMS[stage]
    enhanced = process_frame(frame, params)
    writer.append_data(enhanced)
    if idx % 150 == 0:
        print(f'  frame {idx}/{total}  (stage {stage})')

writer.close()
reader.close()

size_kb = os.path.getsize(OUTPUT) // 1024
print(f'\nDone: {OUTPUT} — {size_kb}KB')
