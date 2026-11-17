#!/usr/bin/env python3
"""One-off: apply the 2026-11-17 fact-check findings (research/REVIEW.md) to the data build."""
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

def sub(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w').write(s)

sub('tools/build-data.py', [
    # wrong DOI in the circuity citation
    ("'url':'https://doi.org/10.1016/S0965-8564(01)00017-9'", "'url':'https://doi.org/10.1016/S0965-8564(01)00044-1'"),
    # use the cargo RoRo ferry factor for lorries crossing by sea, and drop a quote whose source has a unit error
    ("out = {'version':'2026-11-17'",
     "ef = grow['emission_factors']\n"
     "ef['ferry'] = dict(ef['ferry'], value=ef['ferry']['value_roro_ferry_average'], label='RoRo ferry, average (DESNZ 2025). The passenger RoPax figure is about 7 times higher.')\n"
     "for p in plants:\n"
     "    o = p['origins'].get('HK') if p['id'] == 'apple' else None\n"
     "    if o:\n"
     "        for s in o['sources']:\n"
     "            if 'million tons' in s.get('quote', ''): s['quote'] = ''\n"
     "out = {'version':'2026-11-17'"),
])
sub('js/sources.js', [
    ("Real routes are longer, so for carbon we multiply by ${D.circuity}, a typical road circuity factor.</p>",
     "Real routes are longer, so for carbon we multiply by ${D.circuity}, a commonly used road circuity factor (Ballou and others, 2002, give country factors around this value; it is an approximation).</p>"),
    ("ferry ${fmt(ef.ferry.value, 3)},", "roll-on roll-off ferry ${fmt(ef.ferry.value, 3)},"),
    ("<p><b>Farm carbon</b>", "<p><b>Trees.</b> The 22 kg a year for birch and oak is the European Environment Agency’s figure for a typical mature tree, not a species measurement. The lemon figure comes from the Spanish lemon industry body and is not peer reviewed.</p>\n      <p><b>Fact check.</b> A separate reviewer re-opened the sources for the most-seen numbers (origins, carbon, freight, calories, nutrient loss, trees) and confirmed 51 of 53; the one wrong citation was fixed.</p>\n      <p><b>Farm carbon</b>"),
])
print('applied')
