"""Import Master Coffee Data.xlsx into data/directory.json.

Usage:  python3 tools/import_master.py "Master Coffee Data.xlsx"

Reads:
- "Roaster Tracker": one row per roaster (name, base, status)  -> roasters
- "Coffees": one row per coffee                                   -> beans (and pods, when Format is Pods)
Mapped taxonomy tags are used for matching and flavour chips; the roaster's own wording is kept too.
Keeps brewing guides, pod tips, supermarket swap data and the Example wholesale listing from the existing directory.json.
"""
import json, re, sys, pathlib, urllib.parse, openpyxl
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from import_sheet import region_of, slug

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data/directory.json"
H = ['n','roaster','base','coffee','type','format','origin','region','process','roast','brew','notes','tags','judg','source','url','caveat','checked','price','basis','desc','bagImg','linkType']

FRUIT = r"berr|currant|cherry|plum|peach|apricot|nectarine|stone fruit|mango|lychee|citrus|lemon|lime|orange|mandarin|grapefruit|apple|pear|raisin|tropical|pineapple|papaya|passion|melon|banana|fig|date|pomegranate|grape|winey|rum|fruit"
FLORAL = r"jasmine|floral|rose|hibiscus|bergamot|tea|lavender|chamomile|elderflower"
CHOC = r"chocolate|cocoa|caramel|toffee|nut|hazelnut|almond|pecan|walnut|marzipan|praline|brown sugar|molasses|fudge|biscuit|vanilla|malt|syrup|honey|butterscotch|smok|tobacco|earthy|spice|cinnamon|cedar|liquorice|cola"
def taste_of(tags):
    t = " ".join(tags).lower()
    sc = {"Bright & Fruity": len(re.findall(FRUIT, t)), "Florals & Tea": len(re.findall(FLORAL, t)) * 1.5, "Chocolate Comfort": len(re.findall(CHOC, t))}
    return max(sc, key=sc.get) if any(sc.values()) else "Chocolate Comfort"

def roast_norm(raw):
    s = (raw or "").lower()
    if not s or s.startswith("not") or "not stated" in s or "selector" in s: return None
    m = re.search(r"(\d)\s*of\s*5", s)
    if m: return ["Light","Light","Light-Medium","Medium","Medium-Dark","Dark"][int(m.group(1))]
    if "omni" in s: return "Light-Medium"
    if "filter" in s: return "Light"
    if re.search(r"medium[\s-]*dark", s): return "Medium-Dark"
    if re.search(r"medium[\s-]*light|light[\s-]*medium|light to medium", s): return "Light-Medium"
    if "dark" in s: return "Dark"
    if "light" in s: return "Light"
    if "medium" in s: return "Medium"
    if "espresso" in s: return "Medium-Dark"
    return None

def process_norm(raw):
    s = (raw or "").lower()
    if not s or s.startswith("not"): return "Not stated"
    if "decaf" in s or "swiss water" in s or "mountain water" in s or "sugar cane" in s or "co2" in s: return "Decaf process"
    if "anaerobic" in s: return "Anaerobic"
    if "co-ferment" in s or "infused" in s: return "Co-fermented"
    if ("natural" in s and "wash" in s) or "mixed" in s or " and " in s or "&" in s: return "Mixed"
    if "pulped" in s or "honey" in s: return "Honey"
    if "wet-hulled" in s or "wet hulled" in s or "giling" in s: return "Wet-hulled"
    if "monsoon" in s: return "Monsooned"
    if "semi-washed" in s: return "Semi-washed"
    if "wash" in s: return "Washed"
    if "natural" in s or "dry" in s: return "Natural"
    return "Other"

def clean_tag(t): return re.sub(r"\s*\(general\)", "", t).strip()
def split(s): return [x.strip() for x in re.split(r",|;", s or "") if x.strip() and x.strip().lower() not in ("not shown", "not stated")]

def price_info(price, basis, fmt, name):
    """Turn the sheet's price + 'Price basis' text into structured fields. Never invents a price."""
    b = str(basis or "")
    if not isinstance(price, (int, float)) or "possibly an error" in b.lower():
        return {"price": None}
    bl = b.lower(); nm = str(name).lower()
    per_unit = fmt == "Pods" or bl.startswith("per ")
    out = {"price": round(float(price), 2), "priceBasis": b,
           "priceFrom": bool(re.search(r"\bfrom\b|low end|smallest", bl)),
           "sizeConfirmed": not re.search(r"unconfirmed|likely|not shown|not stated|not confirmed|not checked|size not|imply", bl)}
    if per_unit:
        out["perUnit"] = True
        out["unit"] = "pod" if (fmt == "Pods" or "pod" in bl or "capsule" in bl) else "sachet" if "sachet" in bl else "brew bag"
        m = re.search(r"(\d+)\s*g\b", bl) or re.search(r"x\s*(\d+)\s*g\b", nm)
        out["size"] = int(m.group(1)) if m else None
    else:
        m = re.search(r"imply (\d+)\s*g\b", bl) or re.search(r"(?<!per-)(?<!per )\b(\d{2,4})\s*g\b", bl)
        size = int(m.group(1)) if m else 1000 if re.search(r"\b1\s?kg\b", bl) else 250
        out["size"] = size
    return out

def logo_info(extra):
    """Logo URL + note from the Roaster Tracker. 'dark' = white/negative artwork that needs a dark tile;
    'check' = the note says the image may not be the logo, so it isn't shown until someone confirms it."""
    url = (extra[0] if len(extra) > 0 else None) or None
    if not url: return None
    note = str(extra[1]) if len(extra) > 1 and extra[1] else ""
    nl = note.lower()
    return {"url": str(url).strip(), "note": note,
            "dark": any(w in nl for w in ("white", "negative", "light version")),
            "check": nl.startswith("check")}

# Roaster Tracker "offers" columns. Header names must match exactly; values Yes / No / blank (= not checked).
OFFER_COLS = {
    "Subscriptions": "subscription", "One-off purchases": "oneoff", "Decaf": "decaf", "Single origin": "singleOrigin",
    "Light roast": "lightRoast", "Pods": "pods", "Wholesale": "wholesale", "Cafe": "cafe", "Roastery visits": "visits",
    "Training": "training", "Equipment": "equipment", "Direct trade": "directTrade", "Organic or certified": "organic",
    "B Corp": "bcorp", "Award-winning": "awards", "Female-founded": "femaleFounded",
}
def yes_no(v):
    t = str(v or "").strip().lower()
    return True if t in ("yes", "y", "true", "1") else False if t in ("no", "n", "false", "0") else None

def read_offers(row, idx):
    """{key: True/False} for columns the tracker has filled in; plus evidence URL + date if present."""
    out = {}
    for col, key in OFFER_COLS.items():
        if col in idx:
            v = yes_no(row[idx[col]] if idx[col] < len(row) else None)
            if v is not None: out[key] = v
    meta = {}
    for col, key in (("Offers evidence URL", "evidence"), ("Offers date checked", "checked")):
        if col in idx and idx[col] < len(row) and row[idx[col]]: meta[key] = str(row[idx[col]])
    return out, meta

def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    trows = list(wb["Roaster Tracker"].iter_rows(values_only=True))
    hdr = next((r for r in trows if r and r[0] == "Roaster"), ())
    tidx = {str(h).strip(): i for i, h in enumerate(hdr) if h}
    tracker = [r for r in trows[trows.index(hdr) + 1:] if r and r[0]] if hdr else []
    coffees = [dict(zip(H, r)) for r in wb["Coffees"].iter_rows(min_row=4, values_only=True) if r and isinstance(r[0], (int, float))]
    old = json.loads(DATA.read_text()) if DATA.exists() else {}

    shops = {}
    for c in coffees:
        if c["url"] and c["roaster"] not in shops and "thewaytocoffee" not in c["url"]:
            u = urllib.parse.urlparse(c["url"]); shops[c["roaster"]] = f"{u.scheme}://{u.netloc}"
    roasters, seen = [], set()
    for name, base, status, _prio, _n, _notes, *extra in tracker:
        rid = slug(name)
        if rid in seen: continue
        seen.add(rid)
        roasters.append({"id": rid, "name": name, "city": base or "", "region": region_of(base or ""), "status": status,
                         "shop": None if status == "No online shop" else shops.get(name), "links": [], "note": "",
                         "sellsPods": False, "wholesale": {"offers": False, "page": None},
                         "logo": logo_info(extra),
                         **dict(zip(("offers", "offersMeta"), read_offers((name, base, status, _prio, _n, _notes, *extra), tidx)))})
    # Roasters not yet on the tracker (data/extra_roasters.json), so their listings and logos still show
    extra = DATA.parent / "extra_roasters.json"
    for x in (json.loads(extra.read_text()) if extra.exists() else []):
        rid = slug(x["name"])
        if rid in seen: continue
        seen.add(rid)
        roasters.append({"id": rid, "name": x["name"], "city": x.get("city", ""), "region": region_of(x.get("city", "")),
                         "status": x.get("status", ""), "shop": x.get("shop"), "links": [], "note": x.get("note", ""),
                         "sellsPods": False, "wholesale": {"offers": False, "page": None}, "logo": None})
    ids = {r["id"] for r in roasters}

    beans, pods = [], []
    total = len(coffees)
    for i, c in enumerate(coffees):
        rid = slug(c["roaster"])
        if rid not in ids: continue
        tags = [clean_tag(t) for t in split(c["tags"])]
        listed = split(c["notes"])
        rn = roast_norm(c["roast"])
        typ = (c["type"] or "")
        item = {"name": str(c["coffee"]).strip(), "roaster": rid, "origin": c["origin"] or "Not stated", "producer": c["region"] or "",
                "process": process_norm(c["process"]), "processFull": c["process"] or "Not stated",
                "roast": rn or "Not stated", "brewRoast": rn or "Medium", "roastKnown": bool(rn), "roastNote": c["roast"] or "Not stated",
                "notes": tags or listed[:4] or ["Not stated"], "listedNotes": c["notes"] or "", "taste": taste_of(tags or listed),
                "type": typ, "decaf": "decaf" in typ.lower() or "decaf" in str(c["coffee"]).lower(),
                "brew": c["brew"] or "", "format": c["format"] or "", "url": c["url"], "source": c["source"],
                "inStock": True, "addedDays": total - i, "desc": str(c.get("desc") or "").strip(), "bagImg": (str(c.get("bagImg")).strip() if c.get("bagImg") and str(c.get("bagImg")).startswith("http") else ""), "linkType": {"Product page":"product","Listing page":"listing","No link":"none"}.get(str(c.get("linkType") or "").strip(),"")}
        item.update(price_info(c.get("price"), c.get("basis"), c["format"] or "", c["coffee"]))
        if (c["format"] or "") == "Pods":
            nm = item["name"].lower()
            item.update({"id": f"pod-{len(pods)+1:03d}", "system": "Nespresso Original" if "nespresso" in nm else "Not stated",
                         "material": "Home compostable" if "compostable" in nm else "Recyclable" if "recyclable" in nm else "Not stated",
                         "count": None, "intensity": None})
            pods.append(item)
        else:
            item["id"] = f"bean-{len(beans)+1:03d}"
            beans.append(item)
    for r in roasters:
        r["sellsPods"] = any(p["roaster"] == r["id"] for p in pods)
    example = next((r for r in old.get("roasters", []) if r.get("sample")), None)
    conflicts = []
    # Fill offers the tracker hasn't checked yet from the coffees we list (marked as derived).
    for r in roasters:
        r.setdefault("offers", {}); r.setdefault("offersMeta", {})
        mine = [b for b in beans + pods if b["roaster"] == r["id"]]
        derived = {
            "decaf": any(b.get("decaf") for b in mine),
            "singleOrigin": any(str(b.get("type", "")).startswith("Single origin") for b in mine),
            "lightRoast": any(b.get("roast") in ("Light", "Light-Medium") for b in mine),
            "pods": any(b in pods for b in mine),
        }
        r["offersMeta"]["derived"] = []
        for k, v in derived.items():
            if v and r["offers"].get(k) is False:   # tracker says No, but we list such a coffee: listed coffees win
                conflicts.append((r["name"], k, "; ".join(b["name"] for b in mine if
                    (k == "decaf" and b.get("decaf")) or (k == "singleOrigin" and str(b.get("type", "")).startswith("Single origin"))
                    or (k == "pods" and b in pods) or (k == "lightRoast" and b.get("roast") in ("Light", "Light-Medium")))[:200]))
            if v and r["offers"].get(k) is not True:
                r["offers"][k] = True; r["offersMeta"]["derived"].append(k)
        if r["wholesale"].get("offers") and "wholesale" not in r["offers"]: r["offers"]["wholesale"] = True
    import csv
    with open(DATA.parent / "offers_conflicts.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["Roaster", "Tracker column", "Tracker says", "But we list"])
        names = {"decaf": "Decaf", "singleOrigin": "Single origin", "pods": "Pods", "lightRoast": "Light roast"}
        for n, k, x in conflicts: w.writerow([n, names[k], "No", x])
    if conflicts: print(f"{len(conflicts)} tracker 'No' values contradicted by listed coffees -> data/offers_conflicts.csv")
    out = {"_note": "Built from Master Coffee Data.xlsx. 'Example Roastery' is a fictional wholesale placeholder.",
           "roasters": roasters + ([example] if example else []), "beans": beans, "pods": pods,
           "guides": old.get("guides", []), "podTips": old.get("podTips", {}), "supermarket": old.get("supermarket", [])}
    DATA.write_text(json.dumps(out, indent=1))
    print(f"{len(roasters)} roasters ({len({b['roaster'] for b in beans+pods})} with coffees), {len(beans)} coffees, {len(pods)} pods "
          f"({sum(1 for p in pods if p['system']!='Not stated')} with machine stated)")

if __name__ == "__main__": main(sys.argv[1])
