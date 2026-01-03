---
description: Offer to push changes to GitHub at the end of a session
---

At the end of a major task or session, follow these steps:

1.  **Check Status**: Run `git status` to see if there are any uncommitted changes.
2.  **Offer Push**: Ask the user: "Would you like me to commit and push these changes to GitHub now?"
3.  **Authentication**: Ensure `git push` is NEVER run with `SafeToAutoRun: true`. The user must always approve the specific command.
4.  **Summary**: If they agree, write a concise commit message describing the work done.
