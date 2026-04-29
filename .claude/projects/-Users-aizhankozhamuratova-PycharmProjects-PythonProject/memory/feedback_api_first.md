---
name: API-first development rule
description: Always implement the backend API endpoint before adding the corresponding frontend page or feature
type: feedback
---

Before adding any frontend feature, first implement the corresponding FastAPI endpoint in the backend following the module architecture (service → controller → main_controller).

**Why:** The user explicitly set this rule to keep backend and frontend in sync and avoid frontend calling non-existent endpoints.

**How to apply:** For every new frontend page or feature, the order is:
1. Backend: service method → controller endpoint → register in main_controller.py
2. Verify the endpoint works (python import check or uvicorn)
3. Frontend: add method to api.ts → build the page/component
