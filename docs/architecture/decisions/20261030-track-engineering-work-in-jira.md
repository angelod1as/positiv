# Track engineering work in Jira

- Status: accepted, on trial until 2026-11-27
- Date: 2026-10-30
- Tags: process, tooling

## Context

Engineering lived in Linear and business work in Jira, and Angelo will not manage two tools. Both stay on Free; if we ever pay, we pay only Jira.

Linear Free caps the workspace at 250 issues. We hit the cap twice with about 97 visible issues, and only deleting freed room, so archived issues count in practice. At about 100 new issues a month the cap returns every 2 to 3 months, and every cleanup deletes history that commits point at: two of the three TODOs in the code named tickets that no longer existed. Jira Free has no issue cap, up to 10 users.

## Decision

Track engineering work in the team-managed Jira project `WEB`, as a trial. On 2026-11-27 Angelo decides to keep Jira or go back to Linear.

1. Jira is the single source of truth. Linear stays intact during the trial, with its GitHub integration connected, as the archive for old `POS-` keys. It is frozen only if the trial is kept.
2. Statuses are in Portuguese, like the `TASK` project: `Esclarecer`, `A fazer`, `Fazendo`, `Em Revisão`, `Feito`, `Cancelado`.
3. Types: Epic for a project, Task and Bug for the work under it. Priorities are `Highest`, `High` and `Low`, set explicitly because new issues default to `Medium`.
4. Zero Jira Automation steps. Claude moves a ticket to `Fazendo` and `Em Revisão` through the Atlassian MCP. On merge, the `Jira close on merge` Action reads every `WEB-n` in the PR title and moves it to `Feito`, with a scoped API token through `api.atlassian.com`.
5. Conventions: PR title `[WEB-12] ...`, body `Fixes WEB-12`, branch `web-12-<slug>`. A PR that only advances a ticket keeps the key out of its title.
6. GitHub for Atlassian shows branches and PRs on the card. It installs only from the GitHub side on a personal account.
7. Language: Jira tickets and comments in Portuguese, code and PRs in English, the interface in Portuguese.
8. A question about a ticket is an @Julia mention on its card. A standalone business question stays a Pergunta in `TASK`.

The trial ends early if Rovo rate limits block agents, if merged PRs keep missing from cards, or if the Action keeps failing to close tickets.

## Consequences

### Positive

- No issue cap, so no more deleting history.
- One tool for Angelo and Julia, who sees engineering without logging into Linear.
- Going back is cheap: this change reverts as one pull request, and open tickets move back by hand.

### Negative

- Old `POS-` references point to another tool, and Linear links and history do not carry over.
- The Rovo MCP limit is unconfirmed: 500 calls an hour appears only in a forum reply, and the spike measured no ceiling.
- The API token lasts one year at most and expires around 2027-10-30, with no warning in the documentation. A failed Action run is the only signal.

### Neutral

- GitHub remains the merge gate.

## Alternatives considered

- Stay on Linear Free: keeps hitting the cap and deleting history.
- Keep both, linked by Linear's Jira Sync: synced issues still count toward 250, and it means managing two tools.
- Pay Linear Basic: breaks "pay only one, and that is Jira".
- Jira Automation for close-on-merge: Free gives 150 steps a month, below our merge pace.
