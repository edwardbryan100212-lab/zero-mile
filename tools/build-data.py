#!/usr/bin/env python3
"""Merge the cited research files into data/data.json, which the app ships with.
The app never fetches the sources at runtime: the numbers were downloaded once, here."""
import json, glob, os
R = os.path.join(os.path.dirname(__file__), '..', 'research')
load = lambda f: json.load(open(os.path.join(R, f)))
nut = load('nutrition-carbon.json')['crops']
grow = load('growing-emissions.json')
origins = []
for f in glob.glob(os.path.join(R, 'origins-*.json')):
    origins += json.load(open(f))

NAMES = {'tomato':'Tomato','lettuce':'Lettuce','potato':'Potato','carrot':'Carrot','strawberry':'Strawberry','basil':'Basil','mint':'Mint','courgette':'Courgette','cucumber':'Cucumber','pepper':'Sweet pepper','chilli':'Chilli','onion':'Onion','garlic':'Garlic','peas':'Peas','green-beans':'Green beans','kale':'Kale','spinach':'Spinach','radish':'Radish','blueberry':'Blueberry','raspberry':'Raspberry','apple':'Apple tree','lemon':'Lemon tree','birch':'Silver birch','oak':'English oak'}
GROUP = {'basil':'herb','mint':'herb','strawberry':'fruit','blueberry':'fruit','raspberry':'fruit','apple':'tree','lemon':'tree','birch':'tree','oak':'tree'}
ALIASES = {'courgette':['zucchini'],'pepper':['capsicum','bell pepper'],'green-beans':['french beans','string beans'],'chilli':['chili','hot pepper'],'birch':['birch','betula'],'oak':['oak','quercus'],'apple':['apple'],'lemon':['lemon']}

REGIONS = {
  'IE': {'name':'Ireland','dest':{'name':'Dublin','lat':53.3498,'lon':-6.2603}},
  'UK': {'name':'United Kingdom','dest':{'name':'London','lat':51.5072,'lon':-0.1276}},
  'US': {'name':'United States','dest':{'name':'the US centre of population (Hartville, Missouri)','lat':37.42,'lon':-92.38}},
  'HK': {'name':'Hong Kong','dest':{'name':'Hong Kong','lat':22.3193,'lon':114.1694}},
  'DE': {'name':'Germany','dest':{'name':'Berlin','lat':52.52,'lon':13.405}},
  'AU': {'name':'Australia','dest':{'name':'Sydney','lat':-33.8688,'lon':151.2093}},
}
# How each transport mode is split between legs (model assumption, stated on the Sources page)
MODES = {
  'road': [{'mode':'hgv','share':1}],
  'road+ferry': [{'mode':'hgv','share':.85},{'mode':'ferry','share':.15}],
  'sea': [{'mode':'ship','share':.9},{'mode':'hgv','share':.1}],
  'sea+road': [{'mode':'ship','share':.8},{'mode':'hgv','share':.2}],
  'air': [{'mode':'air_long','share':.9},{'mode':'hgv','share':.1}],
  'rail+road': [{'mode':'rail','share':.8},{'mode':'hgv','share':.2}],
}
plants = []
for pid, name in NAMES.items():
    g = grow['plants'].get(pid) or {}
    p = {'id':pid,'name':name,'group':GROUP.get(pid,'veg'),'aliases':ALIASES.get(pid,[]),'grow':g}
    if pid in nut: p.update({k:nut[pid][k] for k in ('kcal_per_100g','nutrients','fdc','carbon','home_vs_shop','kid_fact') if k in nut[pid]})
    if pid in grow.get('trees',{}): p['tree'] = grow['trees'][pid]
    p['origins'] = {o['region']:o for o in origins if o['crop']==pid}
    plants.append(p)
ef = grow['emission_factors']
ef['ferry'] = dict(ef['ferry'], value=ef['ferry']['value_roro_ferry_average'], label='RoRo ferry, average (DESNZ 2025). The passenger RoPax figure is about 7 times higher.')
for p in plants:
    o = p['origins'].get('HK') if p['id'] == 'apple' else None
    if o:
        for s in o['sources']:
            if 'million tons' in s.get('quote', ''): s['quote'] = ''
out = {'version':'2026-11-17','regions':REGIONS,'modes':MODES,'circuity':1.2,
  'circuity_source':{'title':'Selected country circuity factors for road travel distance estimation','publisher':'Ballou, Rahardja & Sakai, Transportation Research Part A 36(9), 2002','url':'https://doi.org/10.1016/S0965-8564(01)00044-1','accessed':'2026-11-17','quote':''},
  'emission':grow['emission_factors'],'context_facts':grow['context_facts'],'home_facts':grow['home_facts'],'plants':plants}
os.makedirs(os.path.join(R,'..','data'),exist_ok=True)
json.dump(out, open(os.path.join(R,'..','data','data.json'),'w'), ensure_ascii=False, separators=(',',':'))
print(len(plants),'plants;', sum(len(p['origins']) for p in plants),'origin records')
