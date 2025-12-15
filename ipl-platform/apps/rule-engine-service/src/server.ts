import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"rule-engine-service"}));
app.listen(7200,()=>console.log("Rule Engine on :7200"));
