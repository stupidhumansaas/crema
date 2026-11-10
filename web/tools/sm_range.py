"""Supermarket swap range (checked Nov 2026). Profiles are from each brand's own pack description.
Own-label lines are described by style only. Run: python3 tools/sm_range.py  (merges into data/directory.json)"""
import json, re, pathlib
C, F, FL = "Chocolate Comfort", "Bright & Fruity", "Florals & Tea"
NO = "Nespresso Original"
# brand, name, format, kind, system, roast, brandScale, notes, taste, price, size_g, count
R = [
 ("Own-label","House Blend Original","Ground & beans","bag",None,"Medium","Strength 3 of 6",["Smooth","Nutty"],C,3.75,227,None),
 ("Own-label","Italian Style","Ground & beans","bag",None,"Medium-Dark","Strength 4 of 6",["Rich","Chocolate"],C,3.75,227,None),
 ("Own-label","French Style","Ground","bag",None,"Medium-Dark","Strength 4 of 6",["Earthy","Intense"],C,3.75,227,None),
 ("Own-label","Italian Espresso","Ground & beans","bag",None,"Dark","Strength 5 of 6",["Robust","Powerful"],C,3.75,227,None),
 ("Own-label","Intense Roast","Ground","bag",None,"Dark","Extra strong",["Full-bodied","Spice"],C,3.75,227,None),
 ("Own-label","Decaf House Blend","Ground","bag",None,"Medium","Strength 3 of 6",["Smooth","Malty"],C,3.75,227,None),
 ("Own-label","Organic Latin American","Ground","bag",None,"Medium","Strength 3 of 6",["Rich","Chocolate"],C,4.50,227,None),
 ("Own-label premium","Kenyan","Ground & beans","bag",None,"Medium","Strength 3 of 6",["Citrus"],F,4.50,227,None),
 ("Own-label premium","Winter Edition","Ground & beans","bag",None,"Medium-Dark","Medium-dark roast",["Cinnamon","Dried fruit","Dark chocolate"],C,4.50,227,None),
 ("Own-label premium","Half Caff","Ground","bag",None,"Medium","Strength 3 of 6",["Baked apple","Rhubarb","Cacao"],F,4.50,227,None),
 ("Own-label premium","Fire Up Your Morning","Ground","bag",None,"Dark","Strength 6 of 6",["Dark chocolate","Cardamom"],C,4.50,227,None),
 ("Own-label premium","Revitalise Your Day","Ground","bag",None,"Medium-Dark","Strength 4 of 6",["Apricot","Jam","Butterscotch"],F,4.50,227,None),
 ("Own-label premium","Colombian La Celia","Ground","bag",None,"Medium","Medium roast",["Apple","Citrus","Brown sugar"],F,4.50,227,None),
 ("Own-label premium","Colombian Wholebean","Beans","bag",None,"Medium","100% Arabica",["Muscovado sugar","Toasted nuts"],C,16.50,1000,None),
 ("Own-label premium","Espresso Pods","Pods","pod",NO,"Dark","Strength 8",["Rich","Intense"],C,3.35,None,10),
 ("Own-label premium","Ristretto Pods","Pods","pod",NO,"Dark","Strength 9",["Dark","Rich"],C,3.35,None,10),
 ("Own-label premium","Lungo Pods","Pods","pod",NO,"Medium","Strength 5",["Sweet","Nutty"],C,3.35,None,10),
 ("Own-label premium","Colombian Lungo Pods","Pods","pod",NO,"Light-Medium","Strength 7",["Smooth","Sweet","Nutty"],C,3.35,None,10),
 ("Own-label premium","Espresso Decaf Pods","Pods","pod",NO,"Dark","Strength 8",["Rich","Intense"],C,3.35,None,10),
 ("Own-label premium","Lungo Decaf Pods","Pods","pod",NO,"Light-Medium","Strength 5",["Sweet","Nutty"],C,3.35,None,10),
 ("Taylors of Harrogate","Lazy Sunday","Ground & beans","bag",None,"Light-Medium","Roast 3 of 6",["Milk chocolate","Citrus"],F,5.75,200,None),
 ("Taylors of Harrogate","Decaffé","Ground & beans","bag",None,"Medium","Roast 4 of 6",["Caramel","Malt"],C,5.75,200,None),
 ("Taylors of Harrogate","After Dark","Ground","bag",None,"Dark","Roast 5 of 6",["Cocoa","Brown sugar"],C,5.75,200,None),
 ("Taylors of Harrogate","Brasilia","Ground","bag",None,"Medium","Roast 4 of 6",["Walnut","Chocolate"],C,5.75,200,None),
 ("Taylors of Harrogate","Flying Start","Ground & beans","bag",None,"Dark","Roast 5 of 6",["Hazelnut","Caramel"],C,5.75,200,None),
 ("Taylors of Harrogate","Half Caff","Ground","bag",None,"Medium","Roast 4 of 6",["Nutty"],C,5.75,200,None),
 ("Lavazza","Qualità Oro","Ground & beans","bag",None,"Medium","Intensity 5 of 10",["Floral","Fruity"],FL,4.95,250,None),
 ("Lavazza","Espresso Italiano Classico","Ground & beans","bag",None,"Medium","Intensity 5 of 10",["Fruit","Sweet"],F,6.50,250,None),
 ("Lavazza","Decaf Classico","Ground","bag",None,"Medium","Intensity 3 of 10",["Dried fruit"],C,6.60,250,None),
 ("Lavazza","Espresso Barista Intenso","Ground & beans","bag",None,"Medium","Intensity 9 of 10",["Chocolate"],C,8.00,250,None),
 ("Lavazza","Tales of Roma","Ground","bag",None,"Medium","Intensity 8 of 10",["Chocolate"],C,6.50,200,None),
 ("Lavazza","Decaf Intenso","Beans","bag",None,"Medium-Dark","Intensity 6",["Tobacco","Woody"],C,15.00,500,None),
 ("Lavazza","Qualità Oro Capsules","Pods","pod",NO,"Medium","Medium roast",["Fruity","Floral"],FL,4.25,None,10),
 ("Lavazza","Qualità Rossa Capsules","Pods","pod",NO,"Medium","Intensity 10 of 13",["Dried fruit"],C,4.25,None,10),
 ("Lavazza","Espresso Maestro Intenso","Pods","pod",NO,"Medium","Intensity 11 of 13",["Wood","Spice","Cocoa","Dried fruit"],C,2.85,None,10),
 ("Lavazza","Espresso Maestro Lungo","Pods","pod",NO,"Light","Intensity 5 of 13",["Floral","Fruity"],FL,2.85,None,10),
 ("Lavazza","A Modo Mio Passionale","Pods","pod","Lavazza A Modo Mio","Medium-Dark","Intense espresso",["Chocolate"],C,4.95,None,16),
 ("Lavazza","A Modo Mio Lungo Dolce","Pods","pod","Lavazza A Modo Mio","Medium","100% Arabica",["Fruity"],F,4.95,None,16),
 ("illy","Classico Medium Roast","Ground & beans","bag",None,"Medium","Intensity 5",["Caramel","Orange blossom","Jasmine"],FL,6.40,250,None),
 ("illy","Intenso Dark Roast","Ground","bag",None,"Dark","Intensity 7",["Cocoa","Dried fruit"],C,6.40,250,None),
 ("Carte Noire","Classic","Ground","bag",None,"Medium","100% Arabica",["Caramel"],C,6.00,250,None),
 ("Costa Coffee","Mocha Italia","Ground & beans","bag",None,"Medium","Intensity 3 of 6",["Nutty","Caramel"],C,3.50,200,None),
 ("Costa Coffee","Intense Amazonian","Ground & beans","bag",None,"Dark","Intensity 5 of 6",["Caramel"],C,3.50,200,None),
 ("Cafédirect","Machu Picchu Peru","Ground & beans","bag",None,"Medium-Dark","Strength 4",["Dark chocolate"],C,5.95,200,None),
 ("Cafédirect","Mayan Gold Mexico","Ground","bag",None,"Dark","Strength 5",["Caramel","Chocolate"],C,5.95,200,None),
 ("Union","House Roast","Ground & beans","bag",None,"Medium","Strength 4",["Chocolate","Caramel"],C,6.95,200,None),
 ("Union","Bobolink Brazil","Ground","bag",None,"Medium","Strength 3",["Macadamia","Milk chocolate"],C,5.50,200,None),
 ("Union","Timana Colombia","Ground","bag",None,"Medium","Strength 4",["Plum","Orange blossom","Maple syrup"],F,5.50,200,None),
 ("Union","Revelation Espresso","Beans","bag",None,"Dark","Strength 5",["Treacle","Dark chocolate","Cinnamon"],C,7.50,200,None),
 ("Union","Yayu Forest Ethiopia","Beans","bag",None,"Medium","Strength 3",["Citrus","Biscuit"],F,7.50,200,None),
 ("Union","Gajah Mountain","Beans","bag",None,"Dark","Strength 5",["Chocolate truffle","Molasses"],C,7.50,200,None),
 ("Union","Rich Decaf","Ground","bag",None,"Dark","Strength 5",["Ginger","Dark chocolate","Dark caramel"],C,5.50,200,None),
 ("Union","Half Caff","Ground","bag",None,"Medium","Strength 4",["Chocolate","Toffee","Tangerine"],C,7.50,200,None),
 ("Grind","House Blend","Ground & beans","bag",None,"Medium","Mellow 4",["Milk chocolate","Almond"],C,4.95,200,None),
 ("Grind","Colombia","Ground & beans","bag",None,"Medium","100% Arabica",["Blackcurrant","Hazelnut"],F,4.95,200,None),
 ("Grind","House Blend Pods","Pods","pod",NO,"Medium","Medium roast",["Chocolate","Nutty"],C,3.25,None,10),
 ("Ueshima","House Blend","Ground & beans","bag",None,"Medium-Dark","Roast 4 of 5",["Caramel"],C,4.25,200,None),
 ("Ueshima","Fuji Mountain","Ground & beans","bag",None,"Dark","Roast 5 of 5",["Bold","Intense"],C,4.25,200,None),
 ("Ueshima","Decaf","Ground","bag",None,"Medium","Roast 3 of 5",["Smooth","Balanced"],C,4.25,200,None),
 ("Raw Bean","Definitely Decaf","Ground","bag",None,"Medium","Strength 4",["Dark cocoa","Walnut"],C,5.40,200,None),
 ("Löfbergs","Brazil","Ground & beans","bag",None,"Medium-Dark","Roast 4 of 5",["Milk chocolate","Nutty"],C,5.50,250,None),
 ("Löfbergs","Colombia","Ground","bag",None,"Medium","Roast 3 of 5",["Berries","Caramel"],F,5.50,250,None),
 ("Löfbergs","Organic","Ground","bag",None,"Dark","Roast 5 of 5",["Cocoa","Forest fruits"],C,5.50,250,None),
 ("Löfbergs","Espresso","Beans","bag",None,"Dark","Roast 5 of 5",["Dark chocolate","Spice"],C,16.50,1000,None),
 ("Starbucks by Nespresso","House Blend","Pods","pod",NO,"Medium","Intensity 8",["Toffee","Nutty","Cocoa"],C,3.00,None,10),
 ("Starbucks by Nespresso","Blonde Espresso Roast","Pods","pod",NO,"Light","Intensity 6",["Sweet","Smooth"],F,3.00,None,10),
 ("Starbucks by Nespresso","Pike Place","Pods","pod",NO,"Medium","Intensity 7",["Chocolate"],C,3.00,None,10),
 ("Starbucks by Nespresso","Colombia","Pods","pod",NO,"Medium","100% Arabica",["Toasted"],C,3.00,None,10),
 ("Starbucks by Nespresso","Breakfast Blend","Pods","pod",NO,"Light-Medium","Intensity 7",["Citrus"],F,3.00,None,10),
 ("Starbucks by Nespresso","Guatemala","Pods","pod",NO,"Medium","100% Arabica",["Candied lemon","Caramel"],F,3.00,None,10),
 ("Starbucks by Nespresso","Italian Style Roast","Pods","pod",NO,"Dark","Dark roast",["Caramelised sugar"],C,3.00,None,10),
 ("Starbucks by Nespresso","Ristretto","Pods","pod",NO,"Dark","Intensity 11",["Caramel","Red fruit"],C,3.00,None,10),
 ("Starbucks by Nespresso","Decaf Espresso Roast","Pods","pod",NO,"Dark","Intensity 11",["Caramel"],C,3.00,None,10),
 ("Starbucks by Nespresso","Blonde Espresso Decaf","Pods","pod",NO,"Light","Intensity 6",["Sweet","Smooth"],F,3.00,None,10),
 ("L'OR","Lungo Profondo","Pods","pod",NO,"Medium-Dark","Intensity 8",["Dark chocolate","Almond","Liquorice","Raisin"],C,2.90,None,10),
 ("L'OR","Ristretto","Pods","pod",NO,"Dark","Intensity 11",["Spice","Ginger","Cardamom"],C,2.90,None,10),
 ("L'OR","Supremo","Pods","pod",NO,"Dark","Intensity 10",["Dark chocolate","Oak","Nutty"],C,2.90,None,10),
 ("L'OR","Colombia","Pods","pod",NO,"Medium","Intensity 8",["Citrus"],F,2.90,None,10),
 ("L'OR","Ristretto Decaf","Pods","pod",NO,"Dark","Intensity 9",["Toasted almond","Woody"],C,2.90,None,10),
 ("L'OR","Destinations Capri","Pods","pod",NO,"Dark","Intensity 12",["Fig"],C,4.70,None,10),
 ("L'OR","Destinations Santorini","Pods","pod",NO,"Medium","Intensity 7",["Citrus"],F,4.70,None,10),
 ("Kenco","100% Colombian","Pods","pod","Tassimo","Medium","100% Arabica",["Fruity","Balanced"],F,5.30,None,16),
 ("Kenco","Americano Smooth","Pods","pod","Tassimo","Medium","Medium roast",["Smooth","Velvety"],C,5.30,None,16),
 ("Kenco","Americano Decaff","Pods","pod","Tassimo","Medium","Well balanced",["Full-flavoured"],C,5.30,None,16),
 ("L'OR","Americano Classique","Pods","pod","Tassimo","Medium-Dark","100% Brazilian",["Bold","Smooth"],C,5.70,None,14),
 ("Nescafé Dolce Gusto","Americano","Pods","pod","Dolce Gusto","Light","100% Arabica",["Fruity","Floral"],FL,5.10,None,16),
 ("Nescafé Dolce Gusto","Americano Intenso","Pods","pod","Dolce Gusto","Dark","Intensity 8",["Roasted","Rich"],C,5.10,None,16),
 ("Nescafé Dolce Gusto","Espresso Milano Delicato","Pods","pod","Dolce Gusto","Medium","Intensity 7",["Red fruits","Dark chocolate"],C,5.10,None,16),
 ("Nescafé Dolce Gusto","Americano Decaffeinato","Pods","pod","Dolce Gusto","Medium","Intensity 4",["Cereal","Red grape"],F,5.10,None,16),
 ("Starbucks by Dolce Gusto","House Blend Americano","Pods","pod","Dolce Gusto","Medium","Intensity 8",["Toffee"],C,3.50,None,12),
 ("Starbucks by Dolce Gusto","Colombia Espresso","Pods","pod","Dolce Gusto","Medium","Intensity 7",["Nutty"],C,3.50,None,12),
]
# Brands that are also roasters in the directory: swap pages tell people to buy direct
DIRECT = {"Union":"union-hand-roasted","Grind":"grind","Cafédirect":"cafedirect"}
def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower().replace("é","e").replace("à","a").replace("ö","o")).strip("-")
P = pathlib.Path(__file__).resolve().parent.parent / "data/directory.json"
d = json.loads(P.read_text())
existing = {x["id"] for x in d["supermarket"]}
added = 0
for brand,name,fmt,kind,system,roast,scale,notes,taste,price,size,count in R:
    sid = "sm-" + slug(f"{brand} {name}")
    if sid in existing: continue
    unit = f"{count} pods" if count else (f"{size//1000}kg" if size and size>=1000 else f"{size}g")
    d["supermarket"].append({"id":sid,"brand":brand,"name":name,"format":fmt,"kind":kind,"system":system,"roast":roast,
        "brandScale":scale,"notes":notes,"taste":taste,"price":price,"size":size,"count":count,
        "priceNote":f"£{price:.2f} for {unit}","source":None, **({"roasterId":DIRECT[brand]} if brand in DIRECT else {})})
    added += 1
P.write_text(json.dumps(d, indent=1, ensure_ascii=False))
print("added", added, "total", len(d["supermarket"]))
