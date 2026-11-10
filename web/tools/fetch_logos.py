"""Download roaster logos listed in the Roaster Tracker (Logo URL column) into data/logos/.

Run on your own computer (the sites must be reachable):
    python3 tools/import_master.py "data/Master Coffee Data.xlsx"
    python3 tools/fetch_logos.py            # skips logos whose note starts with "Check"
    python3 tools/fetch_logos.py --all      # include the "Check" ones too
    python3 build.py

Each logo is saved as data/logos/<roaster-id>.<ext>. With Pillow installed (pip install pillow),
raster logos are shrunk to fit 480x200 and saved as PNG so the page stays small. SVGs are kept as they are.
A report is written to data/logos/report.csv.
"""
import csv, json, pathlib, sys, time, urllib.request, io

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data/logos"; OUT.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (compatible; CoffeeDirectoryLogoFetcher/1.0)"
try:
    from PIL import Image
except ImportError:
    Image = None

def fetch(url):
    if url.startswith("http://"): url = "https://" + url[7:]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(), r.headers.get("Content-Type", "")

def main():
    take_all = "--all" in sys.argv
    data = json.loads((ROOT / "data/directory.json").read_text())
    rows = []
    for r in data["roasters"]:
        lg = r.get("logo")
        if not lg: continue
        if lg["check"] and not take_all:
            rows.append([r["id"], lg["url"], "skipped (note says check)", ""]); continue
        try:
            body, ctype = fetch(lg["url"])
            for old in OUT.glob(r["id"] + ".*"): old.unlink()
            if "svg" in ctype or lg["url"].split("?")[0].lower().endswith(".svg"):
                path = OUT / f"{r['id']}.svg"; path.write_bytes(body)
            elif Image:
                im = Image.open(io.BytesIO(body)); im.thumbnail((480, 200))
                if im.mode not in ("RGB", "RGBA"): im = im.convert("RGBA")
                path = OUT / f"{r['id']}.png"; im.save(path, optimize=True)
            else:
                ext = {"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp"}.get(ctype.split(";")[0], "png")
                path = OUT / f"{r['id']}.{ext}"; path.write_bytes(body)
            rows.append([r["id"], lg["url"], "ok", f"{path.name} {path.stat().st_size//1024} KB"])
            print("ok  ", r["name"])
        except Exception as e:
            rows.append([r["id"], lg["url"], "failed", str(e)[:120]]); print("FAIL", r["name"], e)
        time.sleep(1)
    with open(OUT / "report.csv", "w", newline="") as f:
        csv.writer(f).writerows([["roaster", "url", "result", "detail"]] + rows)
    print(f"\n{sum(1 for x in rows if x[2]=='ok')} logos saved to {OUT}. Now run: python3 build.py")

if __name__ == "__main__":
    main()
