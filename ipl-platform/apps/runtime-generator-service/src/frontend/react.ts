import fs from "fs";

export function generateFrontend(spec:any, dir:string) {
  fs.mkdirSync(`${dir}/src`, { recursive: true });

  fs.writeFileSync(
    `${dir}/src/App.tsx`,
`export default ()=>(
  <div>
    <h1>${spec.spec.app.name}</h1>
  </div>
);`
  );

  fs.writeFileSync(
    `${dir}/package.json`,
    JSON.stringify({ scripts:{dev:"vite"} },null,2)
  );
}
