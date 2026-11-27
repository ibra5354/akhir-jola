import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage();
await p.setContent('<canvas id=c></canvas>');
console.log(await p.evaluate(()=>{const g=document.getElementById('c').getContext('webgl2');return g?g.getParameter(g.VERSION)+' | '+g.getParameter(g.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL||g.RENDERER):'no webgl2'}));
await b.close();
