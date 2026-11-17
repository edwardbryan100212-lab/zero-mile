#!/usr/bin/env python3
"""One-off tuning pass on js/plants3d.js after the first visual check of all 68 plants."""
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'js/plants3d.js'
s = open(p).read()
R = [
    # woody herbs: stems in proportion to the plant
    ("      b.stem([p, end], .004 * (depth + 1), L.wood);", "      b.stem([p, end], .004 * (depth + 1) * Math.min(1, L.h * 1.1), L.wood);"),
    ("rosemary:   { habit: 'shrub', h: .9, leaf: 'lance', leafSize: .03,", "rosemary:   { habit: 'shrub', h: .9, leaf: 'lance', leafSize: .045,"),
    ("thyme:      { habit: 'shrub', h: .25, leaf: 'tiny', leafSize: .012,", "thyme:      { habit: 'shrub', h: .25, leaf: 'tiny', leafSize: .018,"),
    # upright herb rosettes
    ("parsley:    { habit: 'rosette', h: .3, leaf: 'compound', leafSize: .1, leafColor: '#2f8a32', count: 14, petiole: .14 },", "parsley:    { habit: 'rosette', upright: true, h: .3, leaf: 'compound', leafSize: .12, leafColor: '#2f8a32', count: 20, petiole: .12 },"),
    ("coriander:  { habit: 'rosette', h: .3, leaf: 'trifoliate', leafSize: .1, leafColor: '#4a9a3e', count: 16, petiole: .12 },", "coriander:  { habit: 'rosette', upright: true, h: .3, leaf: 'trifoliate', leafSize: .12, leafColor: '#4a9a3e', count: 22, petiole: .12 },"),
    ("      const tilt = L.cup ? lerp(2.4, .5, k) : lerp(.15, 1.2, k);", "      const tilt = L.cup ? lerp(2.4, .5, k) : L.upright ? lerp(3, 1.1, k) : lerp(.15, 1.2, k);"),
    # sunflower: more and bigger leaves
    ("sunflower:  { habit: 'sunflower', h: 2.0, leaf: 'heart', leafSize: .16,", "sunflower:  { habit: 'sunflower', h: 2.0, leaf: 'heart', leafSize: .22,"),
    ("    pts.forEach((p, i) => { if (i === 0 || i > 7) return; const az = i * 2.4; b.leaf(p, V(Math.cos(az), .3, Math.sin(az)), L.leafSize * (1.2 - i / 10)); });",
     "    pts.forEach((p, i) => { if (i === 0 || i > 7) return; for (const o of [0, 3.1]) { const az = i * 2.4 + o; b.leaf(p, V(Math.cos(az), .25, Math.sin(az)), L.leafSize * (1.2 - i / 10) * (o ? .8 : 1)); } });"),
    # citrus bark
    ("bark: '#6a5a46', fruit: F('lemon'", "bark: 'apple', fruit: F('lemon'"),
    ("bark: '#6a5a46', fruit: F('orange'", "bark: 'apple', fruit: F('orange'"),
    # rowan: fewer, smaller bunches (it was the one slow build)
    ("fruit: F('sphere', .05, '#d9341c', { count: 30, bunch: 24 })", "fruit: F('sphere', .05, '#d9341c', { count: 12, bunch: 16 })"),
    # melons tinted, sprawl leafier
    ("fruit: F('melon', .075, '#ffffff', { count: 2 })", "fruit: F('melon', .075, '#e4cf86', { count: 2 })"),
    ("melon:      { habit: 'sprawl', h: .35, leaf: 'heart', leafSize: .13, leafK: 1.3,", "melon:      { habit: 'sprawl', h: .35, leaf: 'heart', leafSize: .13, leafK: 1.9,"),
    ("watermelon: { habit: 'sprawl', h: .35, leaf: 'oak', leafSize: .14, leafK: 1.3,", "watermelon: { habit: 'sprawl', h: .35, leaf: 'oak', leafSize: .14, leafK: 1.9,"),
    ("pumpkin:    { habit: 'sprawl', h: .5, leaf: 'palm', leafSize: .26, leafK: 1.2,", "pumpkin:    { habit: 'sprawl', h: .5, leaf: 'palm', leafSize: .26, leafK: 1.6,"),
    ("'butternut-squash': { habit: 'sprawl', h: .45, leaf: 'palm', leafSize: .24, leafK: 1.2, leafColor: '#3c7431', fruit: F('squash', .07,", "'butternut-squash': { habit: 'sprawl', h: .45, leaf: 'palm', leafSize: .24, leafK: 1.6, leafColor: '#3c7431', fruit: F('squash', .09,"),
    ("    const vines = 4, reach = .9 * b.t ** .8;", "    const vines = 5, reach = .7 * b.t ** .8;"),
    ("        if (i === 0 || i % 2) return;\n        const up = p.clone()", "        if (i === 0) return;\n        const up = p.clone()"),
    # broad bean pods smaller
    ("fruit: F('pod', .016, '#5f9a3d', { len: .17, hang: true })", "fruit: F('pod', .012, '#5f9a3d', { len: .13, hang: true })"),
    # grapes: leaves face out, fuller bunches
    ("fruit: F('grape', .009, '#5b2a5e', { bunch: 26 })", "fruit: F('grape', .011, '#5b2a5e', { bunch: 34 })"),
    ("          for (let k = 0; k < 2; k++) b.leaf(p.clone().add(V(0, .05 + k * .25, 0)), V(s * .3, .4 + k * .2, .8), L.leafSize);",
     "          for (let k = 0; k < 3; k++) b.leaf(p.clone().add(V((r() - .5) * .05, .04 + k * .2, .02)), V(s * .4 + (r() - .5) * .4, 1.2, .35 + r() * .3), L.leafSize * (1 - k * .15));"),
    # brassica heads stand above their leaves
    ("    const hy = L.h * .45 * b.t;", "    const hy = L.h * (L.head.kind === 'cabbage' ? .25 : .5) * b.t;"),
    ("      const base = V(0, hy * (1 - k) * .9, 0);", "      const base = V(0, hy * (1 - k) * (L.head.kind === 'cabbage' ? .9 : .55), 0);"),
    ("head: F('broccoli', .08, '#2f5a33')", "head: F('broccoli', .1, '#2f5a33')"),
    ("head: F('cauliflower', .085, '#f1ead6'), wrap: true", "head: F('cauliflower', .11, '#f1ead6')"),
    # scots pine: fuller crown
    ("'scots-pine': { habit: 'tree', conifer: true, h: 18, leaf: 'needle', leafSize: .9,", "'scots-pine': { habit: 'tree', conifer: true, h: 18, leaf: 'needle', leafSize: 1.5,"),
    ("      const nb = Math.round(lerp(4, 16, b.t));", "      const nb = Math.round(lerp(5, 22, b.t));"),
    ("        for (let k = 0; k < 7; k++) {\n          const q = p.clone().lerp(end, .45 + k * .08)", "        for (let k = 0; k < 12; k++) {\n          const q = p.clone().lerp(end, .35 + k * .055)"),
]
for a, b in R:
    assert a in s, a[:90]
    s = s.replace(a, b)
open(p, 'w').write(s)
print('tuned')
