#!/usr/bin/env python3
"""Build index.html from src.html and ar-data.js.

src.html is the page body (title, styles, markup, script) with a /*AR_DATA*/ placeholder.
ar-data.js holds the runner tracks (window.AR). The artifact host adds its own skeleton,
so this script adds the doctype, charset and viewport for a standalone page.
Run from this folder: python3 build.py
"""
src = open("src.html").read()
page = src.replace("/*AR_DATA*/", open("ar-data.js").read())
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>body{margin:0}</style></head><body>')
open("index.html", "w").write(head + page + "</body></html>")
print("index.html built")
