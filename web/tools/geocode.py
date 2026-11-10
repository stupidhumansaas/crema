#!/usr/bin/env python3
"""Rough offline geocoder: adds lat/lng to each roaster in data/directory.json.
Prefers workbook coordinates (r['lat']/r['lng'] already set) when present, then a
town match, then a county match, then the region centroid. Town-level accuracy,
good enough for a directory map; the workbook's coordinate column supersedes it."""
import json, hashlib, sys, os

HERE=os.path.dirname(__file__); ROOT=os.path.dirname(HERE)
PATH=os.path.join(ROOT,'data','directory.json')

TOWNS={
 "London":(51.509,-0.126),"Edinburgh":(55.95,-3.19),"Glasgow":(55.86,-4.25),"Belfast":(54.6,-5.93),
 "Bristol":(51.45,-2.59),"Brighton":(50.82,-0.14),"Liverpool":(53.41,-2.99),"Sheffield":(53.38,-1.47),
 "Oxford":(51.75,-1.26),"Nottingham":(52.95,-1.15),"Manchester":(53.48,-2.24),"Leeds":(53.8,-1.55),
 "Norwich":(52.63,1.3),"Cardiff":(51.48,-3.18),"Bury St Edmunds":(52.24,0.71),"Dundee":(56.46,-2.97),
 "Horsham":(51.06,-0.33),"Bath":(51.38,-2.36),"York":(53.96,-1.08),"Kendal":(54.33,-2.75),
 "Leicester":(52.64,-1.13),"Newcastle":(54.98,-1.61),"Newcastle upon Tyne":(54.98,-1.61),"Croydon":(51.37,-0.1),
 "Milton Keynes":(52.04,-0.76),"Shrewsbury":(52.71,-2.75),"Birmingham":(52.48,-1.9),"Cambridge":(52.2,0.12),
 "Aberdeen":(57.15,-2.1),"Bournemouth":(50.72,-1.88),"Plymouth":(50.38,-4.14),"Exeter":(50.72,-3.53),
 "Southampton":(50.9,-1.4),"Portsmouth":(50.8,-1.09),"Reading":(51.45,-0.97),"Coventry":(52.41,-1.51),
 "Hull":(53.74,-0.34),"Stoke-on-Trent":(53.0,-2.18),"Derby":(52.92,-1.48),"Preston":(53.76,-2.7),
 "Blackpool":(53.82,-3.05),"Bolton":(53.58,-2.43),"Wolverhampton":(52.59,-2.13),"Swindon":(51.56,-1.78),
 "Gloucester":(51.86,-2.24),"Cheltenham":(51.9,-2.07),"Worcester":(52.19,-2.22),"Ipswich":(52.06,1.16),
 "Colchester":(51.89,0.9),"Chelmsford":(51.74,0.47),"Luton":(51.88,-0.42),"Northampton":(52.24,-0.9),
 "Peterborough":(52.57,-0.24),"Lincoln":(53.23,-0.54),"Chester":(53.19,-2.89),"Lancaster":(54.05,-2.8),
 "Carlisle":(54.89,-2.93),"Durham":(54.78,-1.57),"Sunderland":(54.9,-1.38),"Middlesbrough":(54.57,-1.23),
 "Harrogate":(53.99,-1.54),"Scarborough":(54.28,-0.4),"Wakefield":(53.68,-1.5),"Huddersfield":(53.65,-1.78),
 "Bradford":(53.8,-1.75),"Halifax":(53.72,-1.86),"Barnsley":(53.55,-1.48),"Doncaster":(53.52,-1.13),
 "Rotherham":(53.43,-1.36),"Stockport":(53.41,-2.16),"Oldham":(53.54,-2.12),"Warrington":(53.39,-2.6),
 "Wigan":(53.55,-2.63),"St Albans":(51.75,-0.34),"Watford":(51.66,-0.4),"Guildford":(51.24,-0.57),
 "Woking":(51.32,-0.56),"Maidstone":(51.27,0.52),"Canterbury":(51.28,1.08),"Tunbridge Wells":(51.13,0.26),
 "Eastbourne":(50.77,0.28),"Hastings":(50.85,0.57),"Worthing":(50.81,-0.37),"Chichester":(50.84,-0.78),
 "Winchester":(51.06,-1.31),"Basingstoke":(51.26,-1.09),"Salisbury":(51.07,-1.79),"Yeovil":(50.94,-2.63),
 "Taunton":(51.02,-3.1),"Truro":(50.26,-5.05),"Falmouth":(50.15,-5.07),"Penzance":(50.12,-5.54),
 "St Ives":(50.21,-5.48),"Newquay":(50.41,-5.08),"Barnstaple":(51.08,-4.06),"Totnes":(50.43,-3.68),
 "Stroud":(51.74,-2.22),"Frome":(51.23,-2.32),"Bakewell":(53.21,-1.68),"Buxton":(53.26,-1.91),
 "Matlock":(53.14,-1.56),"Macclesfield":(53.26,-2.12),"Crewe":(53.1,-2.44),"Hereford":(52.06,-2.72),
 "Ludlow":(52.37,-2.72),"Stratford-upon-Avon":(52.19,-1.71),"Leamington Spa":(52.29,-1.54),"Rugby":(52.37,-1.26),
 "Banbury":(52.06,-1.34),"Abingdon":(51.67,-1.28),"Henley":(51.54,-0.9),"Newbury":(51.4,-1.32),
 "Windsor":(51.48,-0.61),"Aylesbury":(51.82,-0.81),"High Wycombe":(51.63,-0.75),"Bedford":(52.14,-0.47),
 "Hitchin":(51.95,-0.28),"Hertford":(51.8,-0.08),"Stevenage":(51.9,-0.2),"Ely":(52.4,0.26),
 "Saffron Walden":(52.02,0.24),"King's Lynn":(52.75,0.4),"Great Yarmouth":(52.6,1.73),"Lowestoft":(52.48,1.75),
 "Sudbury":(52.04,0.73),"Woodbridge":(52.09,1.32),"Southwold":(52.33,1.68),"Stirling":(56.12,-3.94),
 "Perth":(56.4,-3.43),"Inverness":(57.48,-4.22),"Fort William":(56.82,-5.11),"Oban":(56.42,-5.47),
 "St Andrews":(56.34,-2.79),"Falkirk":(56.0,-3.78),"Ayr":(55.46,-4.63),"Kilmarnock":(55.61,-4.5),
 "Paisley":(55.85,-4.42),"Dumfries":(55.07,-3.6),"Galashiels":(55.62,-2.81),"Elgin":(57.65,-3.32),
 "Aviemore":(57.19,-3.83),"Wrexham":(53.05,-3.0),"Bangor":(53.23,-4.13),"Aberystwyth":(52.41,-4.08),
 "Haverfordwest":(51.8,-4.97),"Carmarthen":(51.86,-4.31),"Llandudno":(53.32,-3.83),"Monmouth":(51.81,-2.72),
 "Brecon":(51.95,-3.39),"Swansea":(51.62,-3.94),"Newport":(51.59,-2.99),"Londonderry":(54.99,-7.31),
 "Derry":(54.99,-7.31),"Lisburn":(54.51,-6.04),"Douglas":(54.15,-4.48),"Jersey":(49.21,-2.13),
 "Guernsey":(49.46,-2.58),"Keswick":(54.6,-3.13),"Ambleside":(54.43,-2.96),"Windermere":(54.38,-2.91),
 "Whitby":(54.49,-0.61),"Ripon":(54.14,-1.52),"Skipton":(53.96,-2.02),"Sowerby Bridge":(53.71,-1.91),
 "Hebden Bridge":(53.74,-2.0),"Todmorden":(53.71,-2.1),"Otley":(53.9,-1.69),"Ilkley":(53.92,-1.82),
}
COUNTIES={
 "Kent":(51.2,0.7),"Hampshire":(51.05,-1.3),"West Yorkshire":(53.75,-1.6),"West Sussex":(50.95,-0.45),
 "East Sussex":(50.9,0.3),"Dorset":(50.75,-2.25),"Hertfordshire":(51.8,-0.2),"Cornwall":(50.4,-4.8),
 "Suffolk":(52.2,1.0),"North Yorkshire":(54.1,-1.4),"South Yorkshire":(53.45,-1.35),"Cumbria":(54.5,-2.9),
 "Cheshire":(53.2,-2.5),"Gloucestershire":(51.85,-2.1),"Berkshire":(51.45,-1.0),"Derbyshire":(53.1,-1.6),
 "Highland":(57.5,-4.8),"Lancashire":(53.8,-2.6),"Tyne and Wear":(54.95,-1.6),"Surrey":(51.25,-0.45),
 "Wiltshire":(51.3,-1.9),"Essex":(51.8,0.6),"Devon":(50.7,-3.7),"Norfolk":(52.65,1.0),
 "Greater Manchester":(53.48,-2.24),"Nottinghamshire":(53.1,-1.0),"Leicestershire":(52.6,-1.1),
 "Staffordshire":(52.8,-2.0),"Warwickshire":(52.3,-1.6),"Worcestershire":(52.2,-2.2),"Shropshire":(52.6,-2.7),
 "Oxfordshire":(51.8,-1.3),"Buckinghamshire":(51.8,-0.8),"Bedfordshire":(52.1,-0.45),"Cambridgeshire":(52.35,0.05),
 "Northamptonshire":(52.3,-0.9),"Lincolnshire":(53.1,-0.2),"Somerset":(51.1,-3.0),"County Durham":(54.7,-1.9),
 "Durham":(54.7,-1.9),"Northumberland":(55.3,-2.0),"Merseyside":(53.42,-2.9),"Herefordshire":(52.1,-2.7),
 "Rutland":(52.65,-0.6),"Isle of Wight":(50.68,-1.3),"East Riding of Yorkshire":(53.85,-0.5),
 "Fife":(56.2,-3.1),"Aberdeenshire":(57.3,-2.4),"Angus":(56.7,-2.9),"Perth and Kinross":(56.5,-3.7),
 "Perthshire":(56.5,-3.7),"Stirlingshire":(56.1,-4.0),"Ayrshire":(55.5,-4.6),"Lanarkshire":(55.7,-3.9),
 "Dumfries and Galloway":(55.1,-3.8),"Moray":(57.5,-3.3),"Argyll and Bute":(56.2,-5.3),"Argyll":(56.2,-5.3),
 "Scottish Borders":(55.5,-2.8),"Midlothian":(55.87,-3.07),"East Lothian":(55.95,-2.75),
 "West Lothian":(55.9,-3.5),"Renfrewshire":(55.84,-4.53),"Inverclyde":(55.93,-4.75),
 "Gwynedd":(52.9,-4.0),"Ceredigion":(52.2,-4.0),"Pembrokeshire":(51.8,-4.9),"Carmarthenshire":(51.9,-4.2),
 "Powys":(52.3,-3.4),"Monmouthshire":(51.7,-2.9),"Denbighshire":(53.1,-3.3),"Conwy":(53.2,-3.8),
 "Flintshire":(53.17,-3.14),"Wrexham":(53.05,-3.0),"Vale of Glamorgan":(51.42,-3.46),
 "County Antrim":(54.8,-6.3),"County Down":(54.3,-5.9),"County Armagh":(54.35,-6.5),
 "County Londonderry":(54.9,-7.0),"County Tyrone":(54.6,-7.2),"County Fermanagh":(54.4,-7.6),
 "Isle of Man":(54.24,-4.5),"Channel Islands":(49.3,-2.3),
}
REGION={
 "London":(51.509,-0.126),"South East":(51.2,-0.5),"South West":(50.9,-3.5),"East of England":(52.2,0.5),
 "East Midlands":(52.8,-1.1),"West Midlands":(52.5,-2.0),"Yorkshire":(53.8,-1.5),"North West":(53.6,-2.6),
 "North East":(54.9,-1.6),"Scotland":(56.6,-4.0),"Wales":(52.3,-3.8),"Northern Ireland":(54.6,-6.3),
 "Channel Islands & Isle of Man":(54.0,-4.5),"Other / unknown":(53.5,-2.2),
}

def jitter(rid, amt):
    h=hashlib.md5(rid.encode()).digest()
    dx=(h[0]/255-0.5)*2*amt; dy=(h[1]/255-0.5)*2*amt
    return dx,dy

def geocode():
    d=json.load(open(PATH)); n={"workbook":0,"town":0,"county":0,"region":0,"none":0}
    for r in d['roasters']:
        if r.get('region')=='Example': continue
        lat,lng,src=None,None,None
        if isinstance(r.get('lat'),(int,float)) and isinstance(r.get('lng'),(int,float)):
            lat,lng,src=r['lat'],r['lng'],'workbook'
        else:
            parts=[p.strip() for p in (r.get('city') or '').split(',') if p.strip()]
            for p in parts:
                if p in TOWNS: lat,lng=TOWNS[p]; src='town'; break
            if src is None:
                for p in parts:
                    if p in COUNTIES: lat,lng=COUNTIES[p]; src='county'; break
            if src is None:
                c=REGION.get(r.get('region'))
                if c: lat,lng=c; src='region'
            if src and src!='workbook':
                amt=0.03 if src=='town' else (0.12 if src=='county' else 0.22)
                dx,dy=jitter(r['id'],amt); lat+=dy; lng+=dx
        if lat is None: n['none']+=1; continue
        r['lat']=round(lat,4); r['lng']=round(lng,4); r['geo']=src; n[src]+=1
    json.dump(d,open(PATH,'w'))
    print("geocoded:",n)

if __name__=='__main__': geocode()
