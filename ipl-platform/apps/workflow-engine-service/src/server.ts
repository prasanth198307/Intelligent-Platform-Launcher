import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"workflow-engine-service"}));
app.listen(7300,()=>console.log("Workflow Engine on :7300"));
