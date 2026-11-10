#!/usr/bin/env python3
"""Turn per-frame person boxes (from detect.swift) into one smoothed track per runner.

Usage: python3 track.py <boxes.json> <start-x> <out.json>
boxes.json: per frame, a list of [minX, top, width, height, confidence], normalised (detect.swift output).
start-x: the runner's x centre in the first frame, in 1280x720 pixels.
out.json: {"0": [x_centre, y_top, height], ...} in 1280x720 pixels, gaps interpolated, 5-frame average.
These tracks feed window.AR in ar-data.js (AR.B, AR.C for Maria's run; AR.N.tom, AR.N.lena for the hops).
"""
import json, sys
import numpy as np

boxes = json.load(open(sys.argv[1])); cur = [float(sys.argv[2]), 0, 0]; res = {}
for i, bx in enumerate(boxes):
    cand = [[(b[0] + b[2] / 2) * 1280, b[1] * 720, b[3] * 720] for b in bx if b[4] > 0.3]
    if not cand:
        continue
    best = min(cand, key=lambda b: abs(b[0] - cur[0]) + (0.5 * abs(b[1] - cur[1]) + 0.3 * abs(b[2] - cur[2]) if cur[2] else 0))
    if cur[2] and abs(best[0] - cur[0]) > 0.5 * cur[2] + 80:
        continue
    cur = best; res[i] = best
ks = sorted(res); arr = np.array([res[k] for k in ks]); n = len(boxes)
full = np.array([[np.interp(i, ks, arr[:, c]) for c in range(3)] for i in range(n)])
sm = np.array([full[max(0, j - 2):j + 3].mean(0) for j in range(n)])
json.dump({str(i): [round(float(v), 1) for v in sm[i]] for i in range(n)}, open(sys.argv[3], "w"))
print("tracked", len(ks), "of", n, "frames")
