"""Build the site: inlines data/directory.json into src/index.html -> dist/index.html.

Logos: any file in data/logos/ is copied to dist/logos/ and loaded by relative path
(publish dist/index.html together with dist/logos/*). Pass --inline-logos to embed them instead.
Earlier note: any file in data/logos/ named <roaster-id>.png/.jpg/.gif/.webp/.svg is embedded in the page
(the published page can't load images from other websites). Use --hotlink to point at the original
logo URLs instead, for a site hosted somewhere that allows that, once roasters have agreed to it.
"""
import base64, json, os, pathlib, shutil, sys
root = pathlib.Path(__file__).parent
data = json.loads((root / "data/directory.json").read_text())
ov_file = root / "data/roaster_overrides.json"   # hand-checked fixes, e.g. a roaster's own shop URL
if ov_file.exists():
    fixes = json.loads(ov_file.read_text())
    for r in data["roasters"]:
        r.update(fixes.get(r["id"], {}))
logo_dir = pathlib.Path(os.environ.get("LOGO_DIR", root / "data/logos"))
INLINE = "--inline-logos" in sys.argv
SMALL = 3000   # bytes: logos smaller than this are embedded in the page rather than shipped as files
out = root / "dist"; out.mkdir(exist_ok=True)
if not INLINE and (out / "logos").exists(): shutil.rmtree(out / "logos")
MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml"}
overrides = json.loads((logo_dir / "overrides.json").read_text()) if (logo_dir / "overrides.json").exists() else {}
n = 0
for r in data["roasters"]:
    has_file = any((logo_dir / f"{r['id']}.{e}").exists() for e in MIME)
    if not r.get("logo") and has_file:   # logo supplied as a file, not listed in the tracker
        r["logo"] = {"url": None, "note": "Supplied file", "dark": False, "check": False}
    lg = r.get("logo")
    if not lg: continue
    lg.update(overrides.get(r["id"], {}))
    if "--hotlink" in sys.argv and not lg["check"] and lg["url"]:
        lg["src"] = lg["url"]; n += 1; continue
    for ext, mime in MIME.items():
        f = logo_dir / f"{r['id']}.{ext}"
        if f.exists():
            if INLINE or f.stat().st_size < SMALL:   # whole page inline, or tiny logos (keeps the artifact under its 512-file cap)
                lg["src"] = f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode()
            else:        # default: copy to dist/logos/ and load by relative path (lazy-loaded, keeps the page small)
                (out / "logos").mkdir(parents=True, exist_ok=True)
                shutil.copyfile(f, out / "logos" / f.name); lg["src"] = f"logos/{f.name}"
            n += 1; break
import datetime
data["built"] = datetime.date.today().strftime("%-d %B %Y")
html = (root / "src/index.html").read_text()
(out / "index.html").write_text(html.replace("/*DATA*/null", json.dumps(data).replace("</", "<\\/")))
print(f"Built dist/index.html with {len(data['roasters'])} roasters, {len(data['beans'])} beans, {n} logos")
