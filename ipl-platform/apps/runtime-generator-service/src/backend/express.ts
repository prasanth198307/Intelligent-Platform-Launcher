import fs from "fs";

export function generateBackend(spec: any, dir: string) {
  fs.mkdirSync(`${dir}/src`, { recursive: true });

  const entities = spec.spec.dataModel.entities;

  fs.writeFileSync(
    `${dir}/src/server.ts`,
`import express from "express";
const app = express();
app.use(express.json());
${entities.map((e:any)=>`app.post("/api/${e.toLowerCase()}",(req,res)=>res.json(req.body));`).join("\n")}
app.listen(3000);`
  );

  fs.writeFileSync(
    `${dir}/package.json`,
    JSON.stringify({ scripts:{start:"node src/server.ts"},dependencies:{express:"^4"}},null,2)
  );
}
