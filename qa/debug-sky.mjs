import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5195/#/cloud-world', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Debug the sky sphere in the scene
  const skyInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    
    const gl = canvas.__r3f;
    if (!gl) return { error: 'No R3F' };
    
    const scene = gl.getState().scene;
    if (!scene) return { error: 'No scene' };
    
    let skyMeshes = [];
    let allMeshes = [];
    scene.traverse(obj => {
      if (obj.isMesh) {
        allMeshes.push({
          name: obj.name,
          type: obj.geometry?.type,
          position: obj.position.toArray(),
          scale: obj.scale.toArray(),
          renderOrder: obj.renderOrder,
          frustumCulled: obj.frustumCulled,
          material: obj.material ? {
            type: obj.material.type,
            side: obj.material.side,
            depthWrite: obj.material.depthWrite,
            depthTest: obj.material.depthTest,
            transparent: obj.material.transparent,
            fog: obj.material.fog,
            map: obj.material.map ? 'yes' : 'no',
            uniforms: obj.material.uniforms ? Object.keys(obj.material.uniforms) : []
          } : null
        });
        
        if (obj.geometry && obj.geometry.type === 'SphereGeometry') {
          skyMeshes.push({
            name: obj.name,
            position: obj.position.toArray(),
            scale: obj.scale.toArray(),
            renderOrder: obj.renderOrder,
            frustumCulled: obj.frustumCulled,
            material: obj.material ? {
              type: obj.material.type,
              side: obj.material.side,
              depthWrite: obj.material.depthWrite,
              depthTest: obj.material.depthTest,
              transparent: obj.material.transparent,
              fog: obj.material.fog,
              map: obj.material.map ? 'yes' : 'no',
              uniforms: obj.material.uniforms ? Object.keys(obj.material.uniforms) : []
            } : null
          });
        }
      }
    });
    
    return { skyMeshes, allMeshesCount: allMeshes.length };
  });
  
  console.log(JSON.stringify(skyInfo, null, 2));
  await browser.close();
})();
