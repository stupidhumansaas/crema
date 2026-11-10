# Crema: coffee directory prototype

## Running the site (Next.js + Supabase)
The site is now a Next.js app in this folder, with its data in Supabase. It's hosted on Vercel.
- `app/shell.html` is the page markup, `app/globals.css` the styles and `public/crema.js` the page script (moved out of the old `src/index.html`).
- `/api/directory` serves the whole directory from Supabase and is cached for 10 minutes. `/api/profile` saves weekly-picks profiles and `/api/enquiry` saves wholesale enquiries.
- Database schema: `supabase/migrations/0001_init.sql`.

**Updating the data:** edit the spreadsheet, run `python3 tools/import_master.py "data/Master Coffee Data.xlsx"`, then run `npm run seed`. The seed script needs `SUPABASE_SECRET_KEY` in `.env.local` (see `.env.example`). The live site picks up the changes within 10 minutes. Logos still go in `data/logos/`.

**Running it locally:** `npm install`, then `npm run dev` (needs `.env.local`). Deploy with `npx vercel --prod`.

The old single-file build (`build.py`, `src/`, `dist/`) still works but is no longer what's deployed.

A directory of UK speciality roasters and beans (layout inspired by Bean Here), plus:
- **Wholesale**: roasters that supply businesses, with per-kg prices, minimum orders, support services, a shortlist and one enquiry form
- **Pods & Capsules**: filter by machine (Nespresso Original/Vertuo, Dolce Gusto, Tassimo), capsule material, intensity and decaf; pod suggestions only show capsules that fit the same machine, and beans and pods suggest each other
- **Supermarket swap**: visitors pick the supermarket coffee or pods they buy now (6 examples from Taylors, Lavazza, L'OR and Starbucks by Nespresso, with profiles from each brand's own description). The site suggests independent coffees with a similar roast and flavour, and pods for the same machine. It shows price per cup where real prices are known, and never compares against Example listings. Matching uses flavour families (chocolate, nutty, citrus, spice & smoke...), so 'Dark chocolate' and 'Cocoa' count as similar. A 'Not listed?' picker matches by roast and taste. Add more in `supermarket` in directory.json; prices change, so recheck them occasionally
- **Brew**: visitors save their equipment (brewers, pod machine, grinder). Each bean page then picks the best method they own, with a recipe adjusted for the roast (water temperature, ratio, grind). It also flags poor matches and suggests asking for pre-ground if they have no grinder. Six step-by-step guides are included. Pod pages warn when a capsule won't fit the visitor's machine
- **"If you like this, try…"**: suggestions on every bean page, plus a **For you** page built from beans the visitor has ♡-liked

`Crema` is a placeholder name.

## Building from Master Coffee Data (current)
`python3 tools/import_master.py "Master Coffee Data.xlsx" && python3 build.py`
- Roasters come from the Roaster Tracker sheet (regions are worked out from Base). Coffees and pods come from the Coffees sheet.
- Flavour chips and matching use the Mapped taxonomy tags. Each coffee page also shows the roaster's own wording.
- Roast is shown only where the listing states it (normalised to Light / Light-Medium / Medium / Medium-Dark / Dark). Otherwise it reads "Not stated", and brew recipes say they assume a medium roast.
- Rows with Format "Pods" become pods. The machine is taken from the product name, or shown as "Machine not stated".
- Coffees with no recorded notes stay listed but are never suggested.
- Prices aren't in the workbook yet, so cards say "See shop" and link to the product URL.

## Using your roaster spreadsheet (earlier version)
1. `python3 tools/import_sheet.py roasters.xlsx`: loads every roaster (regions worked out from the town or county), shop links, notes, and any coffees typed into the sheet. Rows marked closed, website dead or not a roaster are left out, and duplicates are removed.
2. Optional, on your own computer: `python3 tools/collect_coffees.py --limit 20` reads Shopify and WooCommerce shops' public product feeds (it respects robots.txt and pauses between requests). It saves coffees and pods to `data/`, plus `collect_report.csv` listing shops it couldn't read. Edit `UA` at the top to include your site or email first.
3. Run the importer again, then `python3 build.py`.

"Example Roastery" and its pods are fictional placeholders that show the pods and wholesale features. They're replaced automatically once real pods are collected.

## Files
- `data/directory.json`: roasters, coffees, pods and guides (built from your spreadsheet)
- `tools/import_sheet.py`, `tools/collect_coffees.py`: see above
- `src/index.html`: the site (layout, styles, logic)
- `build.py`: inlines the data, producing `dist/index.html`

## Data fields
Roaster: `id, name, city, region, founded, about, wholesale{offers, minKg, fromPerKg, services[], delivery}`
Bean: `id, name, roaster (roaster id), origin, process, roast (Light | Light-Medium | Medium | Medium-Dark | Dark), notes[], taste (Bright & Fruity | Chocolate Comfort | Florals & Tea), price, size, inStock, addedDays`

Pod: `id, name, roaster, system, material, origin, process, roast, notes[], taste, intensity (1–13), count, price, inStock, addedDays`

Guide: `id, method, kind, difficulty, time, kit[], dose, water, grind, affinity{roast: 0–3}, tasteBonus{taste: n}, why, steps[]`. Edit `affinity` to change which coffees each method recommends.

## How recommendations work
Each bean is scored against the bean you liked, with points for:
- the same taste family (+3)
- each shared tasting note (+2.5)
- a nearby roast level (up to +2)
- the same process (+1)
- a shared origin (+1)

A big price gap costs up to 1 point. At most 2 picks come from any one roaster, so suggestions stay varied.

## Not yet live
The wholesale enquiry form doesn't send yet. Connect it to email or a form service at launch. Likes are saved in the visitor's own browser.

## Planned (not built yet)
- **"Drink it at" cafés per roaster.** Roasters choose which cafés to list (some may not want competitors seeing their customers). Each café must agree or claim its entry. Show a "last confirmed" date and ask roasters to review every few months. Start with a list on each roaster page and a "Served at X cafés" count on wholesale cards. Add a map and café pages later if roasters use it.

## Prices
Prices come from the "Price (£)" and "Price basis" columns of Master Coffee Data. The importer turns the basis text into:
`price`, `priceFrom` (lowest of several sizes), `size` (grams; 250 assumed when the sheet doesn't say), `sizeConfirmed`,
and for pods, sachets and brew bags `perUnit` + `unit`. Rows whose basis says "possibly an error" are shown as "See shop".
Sorting and recommendations compare price per cup (12g of coffee, or one pod/brew bag), so 1kg and 150g bags compare fairly.

## Roaster logos
The Roaster Tracker's "Logo URL" and "Logo note" columns are imported as `roaster.logo` (`url`, `note`, `dark` for white/negative
artwork shown on a dark tile, `check` when the note starts with "Check"). The published page can't load images from other
websites, so logos are downloaded and embedded:

    python3 tools/fetch_logos.py      # on your own computer; saves data/logos/<roaster-id>.png|svg (add --all to include "Check" rows)
    python3 build.py                  # embeds whatever is in data/logos/

Logos appear on roaster cards, roaster pages, the featured roaster and on each coffee's bag. Roasters without a logo keep their initials.
For a site hosted elsewhere, `python3 build.py --hotlink` uses the original URLs instead (get roasters' permission first).

## Roaster "offers" filters
Add these columns to the Roaster Tracker (exact header text, any order, after the existing ones). Values: Yes / No / blank (= not checked).
Subscriptions, One-off purchases, Decaf, Single origin, Light roast, Pods, Wholesale, Cafe, Roastery visits, Training,
Equipment, Direct trade, Organic or certified, B Corp, Award-winning, Female-founded, Offers evidence URL, Offers date checked.
Decaf, Single origin, Light roast and Pods are also worked out from listed coffees when the tracker cell is blank.
The Roasters page shows a filter button for each, with the number of roasters confirmed so far. Methodology page: #about.
