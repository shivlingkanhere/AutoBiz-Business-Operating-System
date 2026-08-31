---
name: Workspace package declarations
description: Shared TypeScript package declaration behavior after database schema changes
---

When a shared workspace package uses composite TypeScript declarations, regenerate its declaration output after changing its source schema before typechecking dependent packages.

**Why:** Dependent projects can resolve the package's declaration output through project references and report stale types even when the source schema is already correct.

**How to apply:** Run the shared package's TypeScript emit step before API or frontend checks whenever a database table or exported type changes.