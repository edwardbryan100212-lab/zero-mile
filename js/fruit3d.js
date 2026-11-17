// The harvest: one picked item (a tomato, a carrot, a bunch of grapes, an acorn) at real size,
// shown on a small wooden board in an existing viewer from viewer.js.
import * as THREE from 'three';
import { buildHarvest, harvestInfo, disposeTree } from './plants3d.js';

export { buildHarvest, harvestInfo };

let boardMat;
function board(radius) {
  if (!boardMat) { boardMat = new THREE.MeshStandardMaterial({ color: '#b98f5e', roughness: .75 }); boardMat.userData.shared = true; }
  const g = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .97, radius * .09, 48), boardMat);
  g.position.y = -radius * .045; g.receiveShadow = true; g.userData.harvest = true;
  return g;
}

// Clear the viewer's stage, put the harvest on a board, and frame it.
// The next viewer.setPlant() call clears the harvest again automatically.
export function showHarvest(viewer, id) {
  clearHarvest(viewer);
  [...viewer.stage.children].forEach((o) => { viewer.stage.remove(o); });
  const item = buildHarvest(id);
  item.userData.harvest = true;
  const box = new THREE.Box3().setFromObject(item), size = box.getSize(new THREE.Vector3());
  const plate = board(Math.max(size.x, size.z) * .6 + .008);
  viewer.stage.add(plate, item);
  viewer.stage.rotation.y = .4;
  viewer.frame({ pad: .82 }); // the harvest should fill the view
  viewer.kick();
  if (!viewer._harvestPatched) { // make setPlant tidy the harvest away first
    const orig = viewer.setPlant;
    viewer.setPlant = (...a) => { clearHarvest(viewer); return orig(...a); };
    viewer._harvestPatched = true;
  }
  return harvestInfo(id);
}

export function clearHarvest(viewer) {
  [...viewer.stage.children].filter((o) => o.userData.harvest).forEach((o) => { viewer.stage.remove(o); disposeTree(o); });
}
