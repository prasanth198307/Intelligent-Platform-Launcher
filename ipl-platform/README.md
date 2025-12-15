# IPL Platform (reconstructed)
## Services
- AI Generator: one message -> Canonical Spec (LLM) -> validate -> merge domain packs
- Rule Engine: stores/versions rules (stub ready to extend)
- Workflow Engine: runs workflows (stub ready to extend)
- Connector Service: integration gateway (stub ready to extend)

## Run
npm install
cp apps/ai-generator-service/.env.example apps/ai-generator-service/.env
npm run dev

## AI endpoints
- POST http://localhost:7100/api/generate-from-message-llm
- POST http://localhost:7100/api/generate-from-message (fallback, no LLM)
