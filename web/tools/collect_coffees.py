"""Collect coffees from roasters' own webshops (run this on your own computer).

Usage:
    python3 tools/collect_coffees.py                 # every roaster with a shop link
    python3 tools/collect_coffees.py --only "Chimney Fire Coffee,Little Fin Coffee Roastery"
    python3 tools/collect_coffees.py --limit 20      # first 20 shops, to test

Then rebuild:  python3 tools/import_sheet.py roasters.xlsx && python3 build.py

How it works
- Reads roasters and shop links from data/directory.json (made by import_sheet.py).
- Shopify shops: reads the public product feed  https://shop/products.json
- WooCommerce shops: reads the public Store API  https://shop/wp-json/wc/store/v1/products
- Other shops (Squarespace, Wix, custom) are skipped and listed in data/collect_report.csv
  for you to add by hand in the spreadsheet.
- Respects robots.txt, waits between requests, and keeps facts only
  (name, price, size, origin, process, tasting notes, roast, link). It does not copy
  descriptions or photos.

Output
- data/collected.json        whole-bean / ground coffees
- data/collected_pods.json   pods and capsules
- data/collect_report.csv    one row per roaster: platform found, products kept, problems
Uses only the Python standard library.
"""
import json, re, sys, time, csv, html, argparse, pathlib, urllib.request, urllib.robotparser, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = "CremaCollector/0.1 (coffee directory; contact via website)"  # put your site/contact here before running
DELAY = 2.0  # seconds between requests to the same shop

SKIP_WORDS = r"grinder|kettle|dripper|filter papers?|mug|cup\b|t-?shirt|hoodie|tote|gift card|voucher|scales|machine|tamper|subscription|course|class|training|tea\b|chocolate bar|hamper|merch|cleaning|descaler|syrup"
POD_WORDS = r"\bpods?\b|capsules?|nespresso|dolce gusto|tassimo|vertuo"
COFFEE_WORDS = r"coffee|espresso|blend|single origin|decaf|beans|roast|filter|omni|washed|natural|honey"
ORIGINS = ["Ethiopia","Kenya","Rwanda","Burundi","Uganda","Tanzania","Congo","DRC","Malawi","Zambia","Yemen","Colombia","Brazil","Peru","Bolivia","Ecuador",
           "Guatemala","Honduras","El Salvador","Nicaragua","Costa Rica","Panama","Mexico","Cuba","Jamaica","Indonesia","Sumatra","Java","Sulawesi","Papua New Guinea",
           "India","Vietnam","China","Yunnan","Myanmar","Thailand","Laos","Timor","Hawaii"]
PROCESSES = ["Anaerobic","Carbonic","Co-ferment","Thermal shock","Washed","Natural","Honey","Pulped natural","Wet-hulled","Semi-washed","Swiss Water","Sugar cane","Sugarcane","CO2","Mountain Water"]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def allowed(base, path):
    rp = urllib.robotparser.RobotFileParser(base + "/robots.txt")
    try: rp.read()
    except Exception: return True
    return rp.can_fetch(UA, base + path)

def text(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def field(body, *labels):
    for lab in labels:
        m = re.search(rf"{lab}\s*[:\-–]\s*([^.|\n]{{2,120}})", body, re.I)
        if m: return m.group(1).strip(" ,;")
    return None

def parse(name, body, tags, price, size, url):
    t = f"{name} {body} {' '.join(tags)}"
    notes = field(body, "tasting notes", "flavour notes", "flavor notes", "notes", "tastes? like", "cup profile")
    notes = [n.strip().capitalize() for n in re.split(r",|/|&|\band\b", notes or "") if 1 < len(n.strip()) < 30][:5]
    origin = field(body, "origin", "country", "region") or next((o for o in ORIGINS if re.search(rf"\b{o}\b", t, re.I)), None)
    process = field(body, "process", "processing") or next((p for p in PROCESSES if re.search(rf"\b{p}\b", t, re.I)), None)
    roast = field(body, "roast level", "roast profile", "roast", "suitable for", "best for")
    if not roast:
        roast = "Espresso" if re.search(r"espresso", t, re.I) else "Filter" if re.search(r"\bfilter\b", t, re.I) else "Omni" if re.search(r"\bomni\b", t, re.I) else None
    return {"name": name, "origin": origin or "Not stated", "process": (process or "Not stated")[:40], "notes": notes,
            "roast": roast, "price": price, "size": size, "url": url, "decaf": bool(re.search(r"decaf", t, re.I))}

def pod_info(item, t):
    system = ("Nespresso Vertuo" if re.search(r"vertuo", t, re.I) else "Dolce Gusto" if re.search(r"dolce", t, re.I)
              else "Tassimo" if re.search(r"tassimo", t, re.I) else "Nespresso Original")
    count = re.search(r"(\d{1,3})\s*(?:x\s*)?(?:pods|capsules|pack)", t, re.I)
    material = ("Home compostable" if re.search(r"compost", t, re.I) else "Aluminium (recyclable)" if re.search(r"alumin", t, re.I) else "Not stated")
    intensity = re.search(r"intensity\s*[:\-]?\s*(\d{1,2})", t, re.I)
    return {**item, "system": system, "count": int(count.group(1)) if count else 10, "material": material,
            "intensity": min(int(intensity.group(1)), 13) if intensity else 7}

def shopify(base):
    out, page = [], 1
    while page <= 10:
        d = get(f"{base}/products.json?limit=250&page={page}")
        ps = d.get("products", [])
        if not ps: break
        for p in ps:
            vs = p.get("variants") or [{}]
            v = min(vs, key=lambda v: float(v.get("price") or 1e9))
            out.append(dict(name=p.get("title",""), body=text(p.get("body_html")), tags=p.get("tags") if isinstance(p.get("tags"), list) else str(p.get("tags","")).split(","),
                            ptype=p.get("product_type",""), price=float(v["price"]) if v.get("price") else None, size=v.get("title") if v.get("title") != "Default Title" else None,
                            url=f"{base}/products/{p.get('handle','')}"))
        page += 1; time.sleep(DELAY)
    return out

def woo(base):
    out, page = [], 1
    while page <= 10:
        ps = get(f"{base}/wp-json/wc/store/v1/products?per_page=100&page={page}")
        if not ps: break
        for p in ps:
            pr = p.get("prices", {}); minor = int(pr.get("currency_minor_unit", 2))
            price = int(pr["price"]) / 10**minor if pr.get("price") else None
            out.append(dict(name=text(p.get("name")), body=text(p.get("description")) + " " + text(p.get("short_description")),
                            tags=[t.get("name","") for t in p.get("tags", [])] + [c.get("name","") for c in p.get("categories", [])],
                            ptype="", price=price, size=None, url=p.get("permalink")))
        page += 1; time.sleep(DELAY)
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--limit", type=int)
    a = ap.parse_args()
    roasters = [r for r in json.loads((ROOT / "data/directory.json").read_text())["roasters"] if r.get("shop") and not r.get("sample")]
    if a.only: roasters = [r for r in roasters if r["name"] in {x.strip() for x in a.only.split(",")}]
    if a.limit: roasters = roasters[:a.limit]
    beans, pods, report = [], [], []
    for i, r in enumerate(roasters, 1):
        u = urllib.parse.urlparse(r["shop"]); base = f"{u.scheme}://{u.netloc}"
        row = {"roaster": r["name"], "shop": base, "platform": "", "kept": 0, "pods": 0, "problem": ""}
        print(f"[{i}/{len(roasters)}] {r['name']}  {base}")
        items = None
        for plat, path, fn in (("Shopify", "/products.json", shopify), ("WooCommerce", "/wp-json/wc/store/v1/products", woo)):
            if not allowed(base, path): row["problem"] = f"robots.txt disallows {plat} feed"; continue
            try: items = fn(base); row["platform"] = plat; break
            except Exception as e: row["problem"] = f"{plat}: {type(e).__name__}"
            time.sleep(DELAY)
        if items is None:
            row["platform"] = row["platform"] or "Other / not readable"; report.append(row); continue
        for it in items:
            t = f"{it['name']} {it['ptype']} {' '.join(it['tags'])}"
            if re.search(SKIP_WORDS, it["name"], re.I) and not re.search(POD_WORDS, it["name"], re.I): continue
            if not re.search(COFFEE_WORDS + "|" + POD_WORDS, t + " " + it["body"][:400], re.I): continue
            item = {"roaster": r["id"], "source": "collected", **parse(it["name"], it["body"], it["tags"], it["price"], it["size"], it["url"])}
            if re.search(POD_WORDS, t, re.I): pods.append(pod_info(item, t + " " + it["body"])); row["pods"] += 1
            else: beans.append(item); row["kept"] += 1
        report.append(row)
    (ROOT / "data/collected.json").write_text(json.dumps(beans, indent=1))
    (ROOT / "data/collected_pods.json").write_text(json.dumps(pods, indent=1))
    with open(ROOT / "data/collect_report.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(report[0].keys()) if report else ["roaster"]); w.writeheader(); w.writerows(report)
    print(f"\nKept {len(beans)} coffees and {len(pods)} pods from {sum(1 for x in report if x['kept'] or x['pods'])} shops. See data/collect_report.csv")

if __name__ == "__main__": main()
