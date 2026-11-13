#!/usr/bin/env python3
"""Build index.html from src.html and ar-data.js.

src.html is the page body (title, styles, markup, script) with a /*AR_DATA*/ placeholder.
ar-data.js holds the runner tracks (window.AR). The artifact host adds its own skeleton,
so this script adds the doctype, charset and viewport for a standalone page.
Run from this folder: python3 build.py
If node is installed, every inline script is syntax-checked first and a broken page is not written.
"""
src = open("src.html").read()
page = src.replace("/*AR_DATA*/", open("ar-data.js").read())
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>body{margin:0}</style></head><body>')
html = head + page + "</body></html>"

# Safety net: refuse to write a page whose scripts do not parse. One stray "//" comment on a
# dense line can switch off the rest of that line and blank the whole page.
import re, shutil, subprocess, sys, tempfile, os
node = shutil.which("node")
if node:
    for n, body in enumerate(re.findall(r"<script>(.*?)</script>", html, flags=re.S)):
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write(body)
        r = subprocess.run([node, "--check", f.name], capture_output=True, text=True)
        os.unlink(f.name)
        if r.returncode:
            sys.exit("script %d does not parse, index.html NOT written:\n%s" % (n, r.stderr[:800]))
else:
    print("warning: node not found, scripts were not syntax-checked")
open("index.html", "w").write(html)
print("index.html built")
