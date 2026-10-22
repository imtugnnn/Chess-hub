const fs=require('fs');
const sharp=require('C:/Users/Lamtu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 for(const slug of ['packages','classes','schedule-sequence','database']){
  let svg=fs.readFileSync('agent/design/'+slug+'.svg','utf8');
  svg=svg.replace('</svg>','<style>text {font-family:Calibri,sans-serif !important;}</style></svg>');
  fs.writeFileSync('docs/images/chesshub-'+slug+'.svg',svg);
  await sharp(Buffer.from(svg),{density:192}).png().toFile('docs/images/chesshub-'+slug+'.png');
 }
 await sharp('docs/images/chesshub-software-architecture.svg',{density:192}).png().toFile('docs/images/chesshub-software-architecture.png');
 console.log('Calibri diagram assets exported');
})().catch(e=>{console.error(e);process.exit(1)});
