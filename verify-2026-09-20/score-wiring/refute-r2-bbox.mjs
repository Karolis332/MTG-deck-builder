import sharp from 'sharp';
const O='C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
const [a,b]=await Promise.all([`${O}/refute-r2-home-light-before-28.png`,`${O}/refute-r2-home-light-after-22.png`].map(f=>sharp(f).raw().toBuffer({resolveWithObject:true})));
const {width,height,channels}=a.info; let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*channels;let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(a.data[i+c]-b.data[i+c]));
 if(d>60){n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
console.log(`pixels with max-channel delta>60: ${n}; bbox x ${x0}-${x1}, y ${y0}-${y1} (canvas ${width}x${height})`);
if(n) await sharp(`${O}/refute-r2-home-light-after-22.png`).extract({left:Math.max(0,x0-30),top:Math.max(0,y0-20),width:Math.min(width-x0+30,x1-x0+60),height:Math.min(height-y0+20,y1-y0+40)}).toFile(`${O}/refute-r2-home-biggest-delta-after.png`);
