import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"connector-service"}));
app.listen(7400,()=>console.log("Connector Service on :7400"));
