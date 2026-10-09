const sharp=require(process.argv[2]||'sharp');
const path=require('node:path');
const root=path.resolve(__dirname,'../public/universe');
async function main(){
 for(const name of ['origin-moon-v1','aurora-paradise-v1','velir-future-v1','nereya-steampunk-v1','solis-cyberpunk-v1']){
  const info=await sharp(path.join(root,name+'.png')).webp({quality:96}).toFile(path.join(root,name+'.webp'));
  console.log(name,info.width,info.height,info.size);
 }
 for(const width of [16384,8192,4096,2048])await sharp(path.join(root,'origin-moon-v1.png')).resize(width,width/2,{kernel:'lanczos3'}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(path.join(root,`origin-moon-v1-${width}.jpg`));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
