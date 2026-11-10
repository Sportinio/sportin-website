#!/usr/bin/env python3
"""Generate one image-to-video take with the Runway API, starting from a still, and save it as an mp4.

Usage: python3 -I runway_i2v.py <model> <seconds> <first-frame.jpg> <out.mp4> <prompt-file>
Reads the key from RUNWAYML_API_SECRET. Never prints the key.
Used for the second clip of Maria's run: gen4_turbo, 10 s, starting from b/f119.jpg.
"""
import base64, json, os, sys, time, urllib.request

API = "https://api.dev.runwayml.com/v1"
HEAD = {"X-Runway-Version": "2024-11-06", "Content-Type": "application/json"}


def call(method, path, body=None):
    key = os.environ.get("RUNWAYML_API_SECRET", "")
    if not key:
        sys.exit("RUNWAYML_API_SECRET is not set")
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body else None,
                                 headers=dict(HEAD, Authorization="Bearer " + key))
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit("HTTP %s: %s" % (e.code, e.read().decode()[:600]))


def main():
    model, seconds, img, out, prompt_file = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
    prompt = open(prompt_file).read().strip()
    uri = "data:image/jpeg;base64," + base64.b64encode(open(img, "rb").read()).decode()
    task = call("POST", "/image_to_video", {"model": model, "promptImage": uri, "promptText": prompt[:1000],
                                             "ratio": "1280:720", "duration": seconds})
    tid = task["id"]
    print("task", tid, flush=True)
    for _ in range(240):
        time.sleep(5)
        t = call("GET", "/tasks/" + tid)
        st = t.get("status")
        if st == "SUCCEEDED":
            urllib.request.urlretrieve(t["output"][0], out)
            print("saved", out, flush=True)
            return
        if st in ("FAILED", "CANCELLED"):
            sys.exit("task %s: %s" % (st, json.dumps(t)[:600]))
    sys.exit("timed out")


main()
