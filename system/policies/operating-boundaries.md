# Operating boundaries

- Scope: operator preferences, business facts and client facts are distinct. A registry routes retrieval; it does not sandbox an unrestricted agent's filesystem access.
- Privacy: never store secrets in tracked files, prompt text, memory, indexes or test fixtures. Use provider-supported local secret storage when connecting services.
- Approval: tie external-action approval to the exact artifact revision, destination and action. Drafting is not publishing authorization.
- Memory: record source, scope, date and status; corrections supersede old records instead of obscuring evidence.
- Concurrency: no uncontrolled same-task parallel writers. The opt-in local helper in system/operations implements serialized cooperative mutations, revision checks and explicit crash recovery. All participating writers must use it; existing manual owners/workflows are not automatically migrated. It is not an OS sandbox or a distributed lock.
- Recovery: retain original IXsubstrate data unchanged. Validate a backup/restore procedure before migration. Copy and verify reviewed batches before any cutover.
- Distribution: public/community templates must exclude live business data, credentials, connection bindings, memory, task history and private media. No automatic export or push.
