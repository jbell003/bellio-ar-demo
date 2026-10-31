import jsQR from 'jsqr'; import {loadImage,createCanvas} from 'canvas';
for (const s of process.argv.slice(2)){const i=await loadImage(`docs/qr/${s}.png`);const c=createCanvas(i.width,i.height),g=c.getContext('2d');g.drawImage(i,0,0);const d=g.getImageData(0,0,i.width,i.height);console.log(s,jsQR(d.data,i.width,i.height).data);}
