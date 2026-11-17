#!/usr/bin/env python3
"""One-off tuning pass on js/plants3d.js after checking every harvest close-up."""
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'js/plants3d.js'
s = open(p).read()
R = [
    # smooth lathe profiles (no faceted onions or cones)
    ("const lathe = (prof, seg = 24) => new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg);",
     "const lathe = (prof, seg = 24) => { const pts = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(Math.max(24, prof.length * 5)); pts[0].x = 0; pts[pts.length - 1].x = 0; return new THREE.LatheGeometry(pts, Math.max(seg, 28)); };"),
    # indexed spheres so bumpy shapes shade smoothly
    ("case 'raspberry': { const g = new THREE.IcosahedronGeometry(1, 3); g.scale(.95, 1.05, .95); return bumpy(g, 70, .14, .94); }",
     "case 'raspberry': { const g = new THREE.SphereGeometry(1, 56, 42); g.scale(.95, 1.05, .95); return bumpy(g, 80, .12, .93); }"),
    ("case 'blackberry': { const g = new THREE.IcosahedronGeometry(1, 3); g.scale(.85, 1.15, .85); return bumpy(g, 60, .16, .93); }",
     "case 'blackberry': { const g = new THREE.SphereGeometry(1, 56, 42); g.scale(.85, 1.15, .85); return bumpy(g, 70, .14, .92); }"),
    ("case 'potato': case 'sweetpotato': { const g = new THREE.IcosahedronGeometry(1, 2);",
     "case 'potato': case 'sweetpotato': { const g = new THREE.SphereGeometry(1, 28, 20);"),
    # pea and bean pods show the seeds inside
    ("case 'pod': { const g = new THREE.CapsuleGeometry(1, 3, 4, 10); g.scale(1, 1, .55); return g; }",
     "case 'pod': { const g = new THREE.CapsuleGeometry(1, 3, 6, 14, 24); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + .14 * Math.max(0, Math.sin(y * Math.PI * 1.65)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * .6); } g.computeVertexNormals(); return g; }"),
    # grape leaf smaller in the harvest
    ("else leafOn(V(0, .16, 0), V(.7, .5, .3), .14, 'palm'); break; }", "else leafOn(V(0, .16, 0), V(.7, .5, .3), .09, 'palm'); break; }"),
    # blackcurrants lie on the board
    ("case id === 'blackcurrant': { b.look = L; b.t = 1; b.fruitAt(V(0, .06, 0), .006); b.stem([V(0, .07, 0), V(0, .055, 0)], .001, '#5a4a2a'); break; }",
     "case id === 'blackcurrant': { b.look = L; b.t = 1; b.fruitAt(V(0, .1, 0), .006); b.stem([V(0, .108, 0), V(0, .03, 0)], .0008, '#5a4a2a'); b.group.rotation.z = -1.3; break; }"),
    # corn: husk leaves hug the cob and peel back from one end
    ("case id === 'sweetcorn': { one('cob', .025, V(0, .1, 0)); for (let h = 0; h < 4; h++) { const m = new THREE.Mesh(leafGeo('strap'), leafMat('strap')); m.material = m.material.clone(); m.material.color.set('#a9c47a'); m.applyMatrix4(b.frame(V(0, -.02, 0), V(Math.cos(h * 1.6) * .9, 1, Math.sin(h * 1.6) * .9), V(.22, .14, .22))); b.group.add(m); } b.group.rotation.z = -1.3; break; }",
     "case id === 'sweetcorn': { one('cob', .025, V(0, .095, 0)); for (let h = 0; h < 5; h++) { const a = h * 1.26; const m = new THREE.Mesh(leafGeo('strap'), leafMat('strap')); m.material = m.material.clone(); m.material.color.set(h % 2 ? '#b9cf8a' : '#9fbd72'); m.applyMatrix4(b.frame(V(Math.cos(a) * .02, 0, Math.sin(a) * .02), V(Math.cos(a) * (h < 3 ? .12 : 1.4), 1, Math.sin(a) * (h < 3 ? .12 : 1.4)), V(.32, .12, .32), V(Math.cos(a), 0, Math.sin(a)))); b.group.add(m); } b.stem([V(0, .19, 0), V(.01, .23, 0)], .004, '#c8a86a'); b.group.rotation.z = -1.45; break; }"),
    # tree seeds big enough to see next to their leaf
    ("if (id === 'scots-pine') { one('cone', V(.018, .028, .018), V(0, .028, 0), undefined, '#ffffff'); b.group.children[0].material.map = fruitTexture('cone'); for (let k = 0; k < 3; k++) leafOn(V(.03, .01, k * .01), V(1, .3, k - 1), .08, 'needle', '#2f5a44'); break; }",
     "if (id === 'scots-pine') { one('cone', V(.022, .032, .022), V(0, .022, 0), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), 1.45), '#ffffff'); leafOn(V(.03, .004, .01), V(1, .05, .3), .05, 'needle', '#2f5a44'); break; }"),
    ("if (id === 'oak') { one('acorn', .012, V(-.02, .012, .02), undefined, '#8a6a2c'); }",
     "if (id === 'oak') { one('acorn', .016, V(-.035, .016, .03), undefined, '#8a6a2c'); one('cauliflower', V(.011, .01, .011), V(-.035, .026, .03), new THREE.Quaternion(), '#6a5534'); }"),
    ("if (id === 'beech') { for (let i = 0; i < 2; i++) one('beechnut', .008, V(-.02 + i * .014, .008, .02), undefined, '#7a5a34'); }",
     "if (id === 'beech') { for (let i = 0; i < 2; i++) one('beechnut', .012, V(-.03 + i * .02, .012, .03), undefined, '#7a5a34'); }"),
]
for a, b in R:
    assert a in s, a[:90]
    s = s.replace(a, b)

# brassica heads get a bumpy surface texture
s = s.replace("const fruitMat = (kind) => mat(`fruit:${kind}`, () => new THREE.MeshPhysicalMaterial({\n  color: '#ffffff', map: fruitTexture(kind),",
              "const TEXOF = { cauliflower: 'brassica', broccoli: 'brassica', sprout: 'cabbage' };\nconst fruitMat = (kind) => mat(`fruit:${kind}`, () => new THREE.MeshPhysicalMaterial({\n  color: '#ffffff', map: fruitTexture(TEXOF[kind] || kind),")

# a sunflower head on its own, shared by the plant and the harvest
s = s.replace("""    const R = .13 * k, face = V(.25, .45, 1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, face);
    const disc = new THREE.Mesh(""", """    sunHead(b, top, V(.25, .45, 1).normalize(), .13 * k);
  },
};
function sunHead(b, top, face, R) {
  {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, face);
    const disc = new THREE.Mesh(""")
s = s.replace("""      b.part('petal', leafGeo('lance'), leafMat('lance'), b.frame(disc.position.clone().addScaledVector(dir, R * .92), dir, V(R * .55, R * .9, R * .55), face), i % 2 ? '#f2b81a' : '#f6c935');
    }
  },""", """      b.part('petal', leafGeo('lance'), leafMat('lance'), b.frame(disc.position.clone().addScaledVector(dir, R * .92), dir, V(R * .55, R * .9, R * .55), face), i % 2 ? '#f2b81a' : '#f6c935');
    }
  }
}
const BUILD2 = {""")
s = s.replace("const BUILD2 = {\n  root(b) {", "Object.assign(BUILD, {\n  root(b) {")
# close the second object with Object.assign
s = s.replace("""        b.flowerAt(q.clone().add(V(0, .03, 0)), .02 * (H / 2));
      }
    });
  },
};

// Build a plant group""", """        b.flowerAt(q.clone().add(V(0, .03, 0)), .02 * (H / 2));
      }
    });
  },
});

// Build a plant group""")
s = s.replace("    case id === 'sunflower': { BUILD.sunflower(b); break; }", "    case id === 'sunflower': { b.stem([V(0, 0, 0), V(0, .03, -.06)], .008, '#5f8a3a'); sunHead(b, V(0, .03, 0), V(0, 1, .25).normalize(), .12); break; }")

# herb sprigs lie flat on the board, leaves facing up
s = s.replace("""  const sprig = () => { // a cut stem with paired leaves (herbs)
    b.stem([V(0, 0, 0), V(.005, .06, 0), V(0, .12, 0)], .002);
    for (let i = 1; i <= 5; i++) { const y = i * .022, s = L.leafSize * (1.15 - i * .12) * (L.leafK || 1.7) * .6; leafOn(V(0, y, 0), V(1, .5, 0), s); leafOn(V(0, y, 0), V(-1, .5, 0), s); }
    b.group.rotation.z = -1.35;
  };""", """  const sprig = () => { // a cut stem lying on the board, leaves in pairs facing up
    const n = id === 'thyme' || id === 'rosemary' ? 9 : 5, len = .12;
    b.stem([V(0, .004, 0), V(len * .5, .006, .004), V(len, .005, 0)], .0022);
    for (let i = 1; i <= n; i++) {
      const x = i / (n + .5) * len, s = L.leafSize * (1.2 - i / (n * 1.6)) * (L.leafK || 1.7) * (L.leaf === 'feather' || L.leaf === 'compound' || L.leaf === 'trifoliate' ? .45 : .62);
      for (const sg of [1, -1]) leafOn(V(x, .006, 0), V(.45, .08, sg), s, L.leaf, L.leafColor);
    }
    leafOn(V(len, .006, 0), V(1, .08, 0), L.leafSize * (L.leafK || 1.7) * .5, L.leaf, L.leafColor);
  };""")
s = s.replace("const m = new THREE.Mesh(leafGeo(t), leafMat(t, L.glossy)); m.material = m.material.clone(); m.material.color.set(color);\n    m.applyMatrix4(b.frame(pos, dir, size, V(0, 1, .3))); b.group.add(m);",
              "if (type === 'compound' || type === 'pinnate' || type === 'trifoliate' || type === 'feather') { const n0 = b.leaves.length; b.leaf(pos, dir, size / b.leafSizeK, type); return; }\n    const m = new THREE.Mesh(leafGeo(t), leafMat(t, L.glossy)); m.material = m.material.clone(); m.material.color.set(color);\n    m.applyMatrix4(b.frame(pos, dir, size, V(0, 1, .3))); b.group.add(m);")
open(p, 'w').write(s)
print('tuned 2')
