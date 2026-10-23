# Local workspace task coordination

This optional Node helper provides cooperative ownership and revision-checked checkpoints for existing workspace tasks. It does not run agents, start schedules, install connectors or grant permission to publish. Existing manual task owners are not automatically enrolled. All writers of a coordinated task must use the helper for its guarantees to apply.

## Commands and records

| Command | Result |
|---|---|
| `status` / `continue` | Read the selected task, revision, owner, operation lock, verified checkpoint and scoped context paths. No writes. |
| `claim` | Claim an existing, unowned, nonterminal task at an exact revision and return a unique claim ID. |
| `checkpoint` | Record progress, evidence and next action using the current owner, claim ID and revision. |
| `release` | Write the final checkpoint and clear that task's active owner. Does not automatically mark work complete. |
| `recover` | Reconcile one interrupted operation using its exact owner, lock token and current task revision. Never retries the mutation or takes over another task claim. |

The current authority is `businesses/<business>/tasks/<task>/task.json`. Immutable checkpoint records live in `businesses/<business>/sessions/<task>/checkpoints/`. Existing handoff Markdown is preserved.

Each mutation takes a local exclusive operation lock, rereads the task, checks revision and ownership, writes a checkpoint, and atomically replaces the task file. That replacement is the commit point. The task stores its checkpoint reference and hash; a later reader checks identity, revision, ownership and consistency before treating it as current. The helper does not establish that a caller's claimed work succeeded.

## Use with an existing task

Run from the workspace root. Every command requires `--business`, `--task`, `--owner` and `--revision`. Read the exact task's revision first; never guess it. Commands also accept `--root <workspace-folder>`.

These examples use a synthetic `sample` business and `selected-task` that already exist. Substitute the selected records and their actual revisions, not another business's paths.

```text
node system/operations/workspace-operations.mjs continue --business sample --task selected-task --owner session-one --revision 1
node system/operations/workspace-operations.mjs claim --business sample --task selected-task --owner session-one --revision 1
```

A successful claim returns its new revision and claim ID. Use those exact values in the next operation:

```text
node system/operations/workspace-operations.mjs checkpoint --business sample --task selected-task --owner session-one --revision <current-revision> --claim <claim-id> --summary "Reviewed output" --next "Creator review" --state ready-for-review
node system/operations/workspace-operations.mjs release --business sample --task selected-task --owner session-one --revision <current-revision> --claim <claim-id>
```

Optional checkpoint/release fields are `--summary`, `--next`, `--state`, `--outputs` (a JSON array of existing business-relative regular files), and `--verification` (a JSON array of evidence descriptions). No credentials belong in arguments or records. Unknown options, unsupported paths and stale revisions are rejected. A task cannot be adopted merely because a new session uses the same owner name.

## Recover an interrupted operation

1. After a failed command, inspect the exact task and lock before retrying. The operation may have committed even when the command returned an error.
2. Read the lock owner and token from the selected task's operation lock or status output. Use the current task revision.
3. Once the recorded operation process has exited, recover that specific operation:

   ```text
   node system/operations/workspace-operations.mjs recover --business sample --task selected-task --owner session-one --revision <current-revision> --lock <operation-lock-token>
   ```

Recovery reports `not-committed` or `already-committed`. It checks the recorded before/after hashes and preserves orphan checkpoints. A successful claim remains claimed after recovery: its owner and claim ID are still required. A caught and recorded failure may be recoverable within the same process; an active or PID-reused process is not presumed stale.

Corrupt metadata, unexpected lock files, another host, unknown task edits or an interrupted recovery gate require inspection. There is no automatic lock expiry, forced takeover or recursive cleanup. Age alone is not evidence that an owner has stopped.

## Limits and verification

- Cooperative, single-machine coordination only. Unrestricted processes can bypass it; it is not authentication, an OS sandbox or a distributed lock.
- Paths must stay within the selected registered business. Symlinks/junctions and hard-linked records are rejected. Registered business directories cannot overlap.
- Same-volume atomic replacement and flushed checkpoint files do not guarantee recovery from every hardware or cloud-sync failure.
- A checkpoint records the caller's evidence; it does not verify creative quality, authorize publication or mean that a workflow is running.
- Existing owners, memory, schedules and live tasks are not migrated by installing these files.

Run the existing behavior tests:

```text
node --test system/tests/workspace-operations.test.mjs
```

They use unique synthetic temporary businesses and cover ownership, scope, traversal, links, concurrent claims, transaction failures, crashes, recovery and checkpoint tampering. The fixtures are retained for inspection. No live business task is claimed by the suite.
