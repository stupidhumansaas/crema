"""Import the roaster master spreadsheet into data/directory.json.

Usage:  python3 tools/import_sheet.py roasters.xlsx

Reads the "Roaster Master List" sheet, where each roaster has a header row
"Name - Location" followed by shop links (or a status note such as "closed").
Under that it may have a coffee table: Coffee | Origin | Process | Flavour notes | Roast designation.
Keeps brewing guides and the example pods/wholesale listing already in directory.json.
Coffees collected by tools/collect_coffees.py (data/collected.json) are merged in when present.
"""
import json, re, sys, pathlib, openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data/directory.json"

REGION = {
 "London": ["london"],
 "Scotland": ["edinburgh","glasgow","aberdeen","aberdeenshire","dundee","highland","argyll","angus","fife","perth","perthshire","stirling","stirlingshire",
              "scottish borders","east lothian","midlothian","moray","orkney","outer hebrides","renfrewshire","south ayrshire","south lanarkshire","clackmannanshire","isle of skye"],
 "Wales": ["cardiff","swansea","caerphilly","bridgend","ceredigion","gwynedd","anglesey","powys","conwy","denbighshire","pembrokeshire","carmarthenshire","wrexham","south wales","monmouthshire"],
 "Northern Ireland": ["belfast","county antrim","county down","northern ireland"],
 "North East": ["tyne and wear","northumberland","county durham","newcastle","teesside"],
 "North West": ["manchester","liverpool","merseyside","lancashire","cheshire","cumbria","stockport","salford","north west england"],
 "Yorkshire": ["yorkshire","leeds","sheffield","york","hull"],
 "East Midlands": ["derbyshire","nottingham","nottinghamshire","leicester","leicestershire","lincoln","lincolnshire","northampton","northamptonshire","rutland"],
 "West Midlands": ["west midlands","birmingham","coventry","warwickshire","staffordshire","shropshire","herefordshire","worcester"],
 "East of England": ["norfolk","suffolk","essex","cambridge","cambridgeshire","hertfordshire","bedfordshire"],
 "South East": ["kent","surrey","sussex","brighton","hampshire","berkshire","buckinghamshire","oxford","oxfordshire","isle of wight","portsmouth","winchester","southampton"],
 "South West": ["bristol","cornwall","devon","dorset","somerset","bath","gloucestershire","wiltshire","cotswolds"],
 "Channel Islands & Isle of Man": ["guernsey","jersey","isle of man"],
}
def region_of(loc):
    l = loc.lower()
    # check most specific part first (last comma part), then whole string
    for part in [l.split(",")[-1].strip(), l]:
        for reg, keys in REGION.items():
            if any(re.search(r"\b"+re.escape(k)+r"\b", part) for k in keys): return reg
    return "Other / unknown"

SKIP = {"closed","website dead","not a roaster"}
FRUIT = "berry|cherry|plum|peach|apricot|mango|lychee|citrus|lemon|lime|orange|mandarin|tangerine|grapefruit|apple|pear|raisin|currant|tropical|tamarind|wine|rum|liqueur|grape|melon|pineapple|passion"
FLORAL = "jasmine|floral|rose|hibiscus|bergamot|tea|lavender|elderflower|honeysuckle"
CHOC = "chocolate|cocoa|caramel|toffee|nut|hazelnut|almond|macadamia|praline|brown sugar|molasses|fudge|biscuit|vanilla|malt|syrup"
def taste_of(notes):
    t = " ".join(notes).lower()
    score = {"Bright & Fruity":len(re.findall(FRUIT,t)), "Florals & Tea":len(re.findall(FLORAL,t))*1.5, "Chocolate Comfort":len(re.findall(CHOC,t))}
    return max(score, key=score.get) if any(score.values()) else "Chocolate Comfort"
def roast_of(label):
    l = (label or "").lower()
    if "espresso" in l: return "Espresso", "Medium-Dark"
    if "filter" in l: return "Filter", "Light"
    if "omni" in l: return "Omni", "Light-Medium"
    for r in ["Medium-Dark","Light-Medium","Light","Medium","Dark"]:
        if r.lower() in l: return r, r
    return (label or "Not stated"), "Medium"
slug = lambda s: re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")
isurl = lambda x: isinstance(x,str) and x.strip().startswith("http")

def main(path):
    rows = list(openpyxl.load_workbook(path, read_only=True)["Roaster Master List"].iter_rows(values_only=True))
    roasters, cur, incoffee = [], None, False
    for r in rows:
        a = r[0]; rest = [x for x in r[1:] if x not in (None,"")]
        if a is None and not rest: continue
        if a == "Coffee" and r[1] == "Origin": incoffee = True; continue
        texts = [x for x in rest if not isurl(x)]
        if isinstance(a,str) and " - " in a and len(texts) <= 1:
            name, loc = [s.strip() for s in a.split(" - ",1)]
            cur = {"name":name,"location":loc,"links":[x.strip() for x in rest if isurl(x)],"status":(texts[0].strip() if texts else ""),"coffees":[]}
            roasters.append(cur); incoffee = False; continue
        if incoffee and cur: cur["coffees"].append(r[:5])
    old = json.loads(DATA.read_text()) if DATA.exists() else {}
    out_r, beans, seen = [], [], set()
    for x in roasters:
        if x["status"].lower() in SKIP or x["name"].lower() in seen: continue
        seen.add(x["name"].lower())
        rid = slug(x["name"]); links = x["links"]
        ws_links = [l for l in links if "wholesale" in l.lower()]
        out_r.append({"id":rid,"name":x["name"],"city":x["location"],"region":region_of(x["location"]),
            "shop":next((l for l in links if "wholesale" not in l.lower()), None),"links":links,"note":x["status"],
            "sellsPods":any(re.search("pod|capsul",l.lower()) for l in links),
            "wholesale":{"offers":bool(ws_links),"page":ws_links[0] if ws_links else None}})
        for c in x["coffees"]:
            name, origin, process, notes, roast = (list(c)+[None]*5)[:5]
            if not name: continue
            nl = [n.strip().capitalize() for n in re.split(r",|;", notes or "") if n.strip()][:5]
            label, brew = roast_of(roast)
            beans.append({"id":f"bean-{len(beans)+1:03d}","name":str(name),"roaster":rid,"origin":origin or "Not stated",
                "process":(process or "Not stated").split(" (")[0],"processFull":process,"roast":label,"brewRoast":brew,"roastNote":roast,
                "notes":nl or ["Not stated"],"taste":taste_of(nl),"price":None,"size":None,"inStock":True,"addedDays":0,"source":"sheet"})
    coll = ROOT / "data/collected.json"
    if coll.exists():
        ids = {r["id"] for r in out_r}
        for c in json.loads(coll.read_text()):
            if c["roaster"] not in ids: continue
            label, brew = roast_of(c.get("roast"))
            nl = c.get("notes") or ["Not stated"]
            beans.append({**c,"id":f"bean-{len(beans)+1:03d}","roast":label,"brewRoast":brew,"taste":taste_of(nl),"notes":nl,"addedDays":c.get("addedDays",0)})
    # keep example listing (fictional, clearly labelled) for pods + wholesale demo
    example = {"id":"example","name":"Example Roastery","city":"Sample listing","region":"Example","sample":True,"shop":None,"links":[],"note":"",
               "sellsPods":True,"wholesale":{"offers":True,"minKg":5,"fromPerKg":22,"services":["Barista training","Espresso machine lease","Office pod supply"],"delivery":"Weekly, UK-wide"}}
    pods = [dict(p, roaster="example") for p in old.get("pods",[]) if p.get("source")!="collected"]
    cpods = ROOT / "data/collected_pods.json"
    if cpods.exists():
        ids = {r["id"] for r in out_r}
        real = [c for c in json.loads(cpods.read_text()) if c["roaster"] in ids]
        for i, c in enumerate(real):
            label, brew = roast_of(c.get("roast")); nl = c.get("notes") or ["Not stated"]
            real[i] = {**c, "id": f"pod-{i+101:03d}", "roast": brew, "taste": taste_of(nl), "notes": nl, "price": c.get("price") or 0, "addedDays": 0}
        if real: pods = real   # real pods replace the examples
        for r in out_r:
            if any(p["roaster"] == r["id"] for p in real): r["sellsPods"] = True
    out = {"_note":"Roasters and 17 Grams coffees come from your spreadsheet. 'Example Roastery' and its pods are fictional placeholders.",
           "roasters":out_r+[example],"beans":beans,"pods":pods,"guides":old.get("guides",[]),"podTips":old.get("podTips",{}),"supermarket":old.get("supermarket",[])}
    DATA.write_text(json.dumps(out, indent=1))
    print(f"{len(out_r)} roasters ({sum(1 for r in out_r if r['shop'])} with shops), {len(beans)} coffees, {len(pods)} example pods")

if __name__ == "__main__": main(sys.argv[1])
