# DRT

## Rotating Secrets

To rotate, prepend the new secret to `.env` (`SESSION_SECRET="new,old"`) and drop the old one after a MAX_AGE window. (`./src/server/session.ts#10`)
Dropping every old secret logs every outstanding session out.
