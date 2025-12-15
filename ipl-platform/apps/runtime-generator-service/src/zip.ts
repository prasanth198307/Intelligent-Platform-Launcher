import archiver from "archiver";
import fs from "fs";

export function zipFolder(src:string,out:string){
  const a=archiver("zip");
  const s=fs.createWriteStream(out);
  a.pipe(s);
  a.directory(src,false);
  a.finalize();
}
