---
name: Repository handoffs
description: How source repositories may be preserved when a conversation moves into a Replit project.
---

After a conversation moves into a project, the prior workspace's files may be preserved separately from the new project's generated starter tree. Check both before developing. If the request is to import a repository, make sure its tracked source files and Git history are in the active project root.

**Why:** A prior handoff preserved the source checkout outside the active root, while the new root contained a generated monorepo. Without reconciling them, the project could look started while its source history and files were not active.

**How to apply:** After a repository handoff, verify the root README, source docs, prototype files, and active Git branch/remote. Do not commit or push without the user's request.
