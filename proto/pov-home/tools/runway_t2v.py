#!/usr/bin/env python3
"""Generate one text-to-video take with the Runway API and save it as an mp4.

Usage: python3 -I runway_t2v.py <model> <seconds> <out.mp4> <prompt-file> [noaudio]
Reads the key from RUNWAYML_API_SECRET. Never prints the key.
"""
import json, os, sys, time, urllib.request

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
    model, seconds, out, prompt_file = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    prompt = open(prompt_file).read().strip()
    body = {"model": model, "promptText": prompt[:1000], "ratio": "1280:720", "duration": seconds}
    if len(sys.argv) > 5 and sys.argv[5] == "noaudio":  # the page makes its own sound; silent clips cost less
        body["audio"] = False
    task = call("POST", "/text_to_video", body)
    tid = task["id"]
    print("task", tid, flush=True)
    for _ in range(180):
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
