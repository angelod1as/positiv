import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Both of these workflows dump the production database and scp it to the VPS,
// and both used to reach it with `ssh-keyscan -H "$VPS_HOST" >> known_hosts`.
// That asks the server for its own host key and believes the answer, which on
// a runner with an empty known_hosts is every single run. Anyone sitting on the
// network path could answer in place of the VPS and receive a full copy of
// every profile's name, email, CPF, RG, phone and date of birth.
//
// The guard is here rather than in each workflow's own test file because the
// two hold deliberate copies of the SSH logic instead of sharing a composite
// action: drift is meant to be noticeable, and that only holds if a defect
// found in one is fixed in both. One file, both workflows, fails if either
// regresses.
const workflows = ["database-backup.yml", "production.yml"].map((file) => ({
  file,
  yaml: readFileSync(
    join(import.meta.dirname, "..", ".github", "workflows", file),
    "utf8",
  ),
}))

// Both workflows explain in a comment what they no longer do, and the whole
// point of that comment is to name `ssh-keyscan`. Assert against the code.
function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
}

function setupSshStep(yaml: string): string {
  const start = yaml.indexOf("- name: Setup SSH")

  expect(start, 'step "Setup SSH" not found').toBeGreaterThan(-1)

  const rest = yaml.slice(start + 1)
  const nextStep = rest.search(/\n +- name: /)

  return nextStep === -1 ? rest : rest.slice(0, nextStep)
}

describe.each(workflows)("$file", ({ yaml }) => {
  it("never asks the host for its own key", () => {
    expect(withoutComments(yaml)).not.toContain("ssh-keyscan")
  })

  it("pins the host key from the repository secret instead", () => {
    const step = setupSshStep(yaml)

    expect(step).toContain("VPS_SSH_KNOWN_HOSTS: ${{ secrets.VPS_SSH_KNOWN_HOSTS }}")
    expect(step).toContain('echo "$VPS_SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts')
  })

  it("stops on a missing secret rather than on a puzzle two steps later", () => {
    // An unset secret writes an empty known_hosts, which ssh refuses with
    // "Host key verification failed." -- the right outcome, reported as though
    // the host key had changed. Name the real cause where it happens.
    const step = setupSshStep(yaml)

    expect(step).toContain('if [ -z "$VPS_SSH_KNOWN_HOSTS" ]; then')
    expect(step).toContain("exit 1")
  })

  it("checks the value is a host key rather than something shaped like one", () => {
    // The near miss is pasting the output of `ssh-keygen -lf` -- the
    // fingerprint -- in place of the known_hosts line it was read from. Both
    // mention the host and the key type, and ssh rejects the wrong one with
    // "Host key verification failed.", indistinguishable from interception.
    const step = setupSshStep(yaml)

    expect(step).toContain("ssh-keygen -lf ~/.ssh/known_hosts")
  })
})
