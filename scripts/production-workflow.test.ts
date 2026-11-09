import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// POS-520 merged, Coolify finished deploying the app six minutes later, and the
// migration that the app depended on never ran: the gate job sat for fifteen
// minutes and was cancelled, so `deploy` was skipped. For a while production
// served an app that reads integer cents from a column still holding reais, and
// every price on the site was a hundredth of itself.
//
// Two things made a cancelled job into wrong numbers on the site, and these are
// the guards for both.
const workflow = readFileSync(
  join(import.meta.dirname, "..", ".github", "workflows", "production.yml"),
  "utf8",
)

function runCommand(stepName: string): string {
  const step = workflow.match(
    new RegExp(`- name: ${stepName}\\n(?: +[a-z-]+:.*\\n)*? +run: (.+)`),
  )

  if (!step) {
    throw new Error(`no run command found for step "${stepName}"`)
  }

  return step[1]
}

function runScript(stepName: string): string {
  const lines = workflow.split("\n")
  const nameLine = lines.findIndex((line) => line.trim() === `- name: ${stepName}`)

  expect(nameLine, `step "${stepName}" not found`).toBeGreaterThan(-1)

  const runLine = lines.findIndex((line, index) => index > nameLine && /^ +run: \|$/.test(line))

  // Only a literal block (`run: |`) is read; any other form would be misparsed.
  expect(runLine, `step "${stepName}" has no "run: |" block`).toBeGreaterThan(nameLine)
  const indent = lines[runLine + 1].search(/\S/)
  const body: string[] = []

  for (const line of lines.slice(runLine + 1)) {
    if (line.trim() !== "" && line.search(/\S/) < indent) break
    body.push(line.slice(indent))
  }

  return body.join("\n")
}

// Runs a step's script the way GitHub runs it when no shell is given, with
// `git` replaced by a stub that prints `gitOutput` and exits `gitStatus`.
function runHeadCheck(gitOutput: string, gitStatus: number) {
  const dir = mkdtempSync(join(tmpdir(), "production-workflow-"))
  const script = join(dir, "step.sh")
  const output = join(dir, "output")

  writeFileSync(join(dir, "git"), `#!/bin/sh\nprintf '%s' '${gitOutput}'\nexit ${gitStatus}\n`)
  chmodSync(join(dir, "git"), 0o755)
  writeFileSync(script, runScript("Check main still points at this commit"))
  writeFileSync(output, "")

  const result = spawnSync("bash", ["-e", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_REPOSITORY: "angelod1as/positiv",
      GITHUB_SHA: "a".repeat(40),
      GITHUB_OUTPUT: output,
    },
  })

  return { status: result.status, output: readFileSync(output, "utf8") }
}

function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)

  expect(start, `job "${name}" not found`).toBeGreaterThan(-1)

  const rest = workflow.slice(start + 1)
  const nextJob = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/)

  return nextJob === -1 ? rest : rest.slice(0, nextJob + 1)
}

describe("production workflow", () => {
  it("gates the migration on a plain test run, not on one carrying coverage", () => {
    // Coverage instrumentation belongs to the pull request, where
    // deploy-and-test.yml runs it and keeps the artifact. Here it is fifteen
    // minutes of the window between the app deploying and the schema it needs
    // being there.
    const command = runCommand("Run unit tests")

    expect(command).toBe("pnpm test:unit")
  })

  it("gives that gate a timeout, so a hung run fails instead of hanging", () => {
    // The run that caused this was cancelled at fifteen minutes with no
    // timeout set, which reads as an infrastructure mystery rather than as a
    // job that took too long. A stated limit fails on its own terms.
    const unitTest = jobBlock("unit-test")

    expect(unitTest).toMatch(/timeout-minutes: \d+/)
  })

  it("still refuses to touch the production database before the tests pass", () => {
    // The window is the problem, not the gate. Closing it by letting the
    // migration run first would trade wrong prices for a wrong schema.
    const deploy = jobBlock("deploy")

    expect(deploy).toContain("needs: unit-test")
  })

  it("publishes the app only once the migration has run", () => {
    // WEB-39: unit-test failed on main, `db push` never ran, and Coolify
    // published the app from its own push webhook anyway, reading a column that
    // did not exist. The app now ships from here, behind the migration.
    const deployApp = jobBlock("deploy-app")

    expect(deployApp).toContain("needs: deploy")
    expect(deployApp).toContain("/api/v1/deploy?uuid=")
  })

  it("leaves the app alone when main has moved past this run's commit", () => {
    // Coolify builds the branch head, not a given commit. If a newer merge is
    // queued behind this run, the head carries migrations that have not run
    // yet, so publishing it here would repeat WEB-39. The newer run publishes.
    const deployApp = jobBlock("deploy-app")

    expect(deployApp).toContain("git ls-remote")
    expect(deployApp).toContain('"$GITHUB_SHA"')
  })

  it("smoke-tests the deployment of this commit, not whatever answers 200", () => {
    // A failed deploy leaves the previous container serving, healthy and
    // answering 200. Only the deployment record says which commit is live.
    const smoke = jobBlock("smoke")

    expect(smoke).toContain("needs: deploy-app")
    expect(smoke).toContain("/api/v1/deployments/")
    expect(smoke).toContain('"$GITHUB_SHA"')
    expect(smoke).not.toContain("sleep 120")
  })

  it("publishes when main still points at this run's commit", () => {
    const result = runHeadCheck(`${"a".repeat(40)}\trefs/heads/main\n`, 0)

    expect(result.status).toBe(0)
    expect(result.output).toBe("current=true\n")
  })

  it("leaves publishing to the newer run when main has moved", () => {
    const result = runHeadCheck(`${"b".repeat(40)}\trefs/heads/main\n`, 0)

    expect(result.status).toBe(0)
    expect(result.output).toBe("current=false\n")
  })

  it("fails the run when it cannot read main, rather than reading it as moved", () => {
    // Read as moved, a network blip would skip the deploy and leave the run
    // green, with this commit's migration live and its app nowhere.
    const result = runHeadCheck("", 128)

    expect(result.status).not.toBe(0)
    expect(result.output).toBe("")
  })

  it("gives up waiting on a clock, so its error prints before the step timeout", () => {
    // Counting attempts, an API that times out on every call stretched the
    // loop past the step's timeout-minutes, and GitHub killed it without the
    // message saying why. Bash's SECONDS is imported from the environment, so
    // starting it late stands in for an hour of slow calls.
    const dir = mkdtempSync(join(tmpdir(), "production-workflow-"))
    const script = join(dir, "step.sh")

    writeFileSync(join(dir, "curl"), "#!/bin/sh\nexit 28\n")
    writeFileSync(join(dir, "sleep"), "#!/bin/sh\nexit 0\n")
    chmodSync(join(dir, "curl"), 0o755)
    chmodSync(join(dir, "sleep"), 0o755)
    writeFileSync(script, runScript("Wait for the Coolify deployment of this commit"))

    const result = spawnSync("bash", ["-e", script], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        SECONDS: "100000",
        COOLIFY_URL: "https://coolify.invalid",
        COOLIFY_DEPLOY_TOKEN: "not-a-token",
        DEPLOYMENT_UUID: "deployment",
        GITHUB_SHA: "a".repeat(40),
      },
    })

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("::error::Coolify deployment deployment did not finish")
    expect(result.stdout).not.toContain("attempt 2:")
  })

  describe("starting the Coolify deployment", () => {
    // Runs the step's own script with curl replaced by a stub that answers
    // `body`, the way Coolify's deploy endpoint would.
    function startDeployment(body: string) {
      const dir = mkdtempSync(join(tmpdir(), "production-workflow-"))
      const script = join(dir, "step.sh")
      const output = join(dir, "output")

      writeFileSync(join(dir, "body.json"), body)
      writeFileSync(join(dir, "curl"), `#!/bin/sh\ncat > /dev/null\ncat '${join(dir, "body.json")}'\n`)
      chmodSync(join(dir, "curl"), 0o755)
      writeFileSync(script, runScript("Start the Coolify deployment"))
      writeFileSync(output, "")

      const result = spawnSync("bash", ["-e", script], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          COOLIFY_URL: "https://coolify.invalid/",
          COOLIFY_DEPLOY_TOKEN: "not-a-token",
          COOLIFY_APP_UUID: "app",
          GITHUB_SHA: "a".repeat(40),
          GITHUB_OUTPUT: output,
        },
      })

      return { status: result.status, stdout: result.stdout, output: readFileSync(output, "utf8") }
    }

    it("hands the queued deployment to the smoke job", () => {
      const result = startDeployment(
        '{"deployments":[{"message":"queued","resource_uuid":"app","deployment_uuid":"dep-1"}]}',
      )

      expect(result.status).toBe(0)
      expect(result.output).toBe("deployment_uuid=dep-1\n")
    })

    it("fails the run, with Coolify's reason, when nothing was queued", () => {
      // Without a deployment there is nothing for the smoke job to wait on,
      // and a skipped smoke would read as green.
      const result = startDeployment('{"message":"No resources found."}')

      expect(result.status).toBe(1)
      expect(result.stdout).toContain("::error::Coolify queued no deployment: No resources found.")
      expect(result.output).toBe("")
    })

    it("fails the run when the answer is not JSON", () => {
      const result = startDeployment("<html>502 Bad Gateway</html>")

      expect(result.status).not.toBe(0)
      expect(result.output).toBe("")
    })
  })

  it("gives the smoke job room for both its waits, so neither is cut off silently", () => {
    // The job's own timeout kills a step without its error message, so it
    // must outlast the deployment wait's timeout plus the site fetch's worst
    // case: every attempt timing out, then sleeping.
    const smoke = jobBlock("smoke")
    const jobTimeout = Number(smoke.match(/\n {4}timeout-minutes: (\d+)/)?.[1])
    const waitTimeout = Number(
      smoke.match(/- name: Wait for the Coolify deployment of this commit\n +timeout-minutes: (\d+)/)?.[1],
    )
    const fetch = runScript("Fetch the site until it answers")
    const attempts = Number(fetch.match(/seq 1 (\d+)/)?.[1])
    const maxTime = Number(fetch.match(/--max-time (\d+)/)?.[1])
    const pause = Number(fetch.match(/sleep (\d+)/)?.[1])
    const fetchWorstMinutes = (attempts * (maxTime + pause)) / 60

    expect(jobTimeout).toBeGreaterThan(waitTimeout + fetchWorstMinutes)
  })

  it("keeps the Coolify token off every command line", () => {
    // This repository is public. The token reaches curl as a config file on
    // stdin, never as an argument, where it would sit in the process list.
    const commandLines = workflow
      .split("\n")
      .filter((line) => /\bcurl\b/.test(line) && !line.trim().startsWith("#"))

    for (const line of commandLines) {
      expect(line).not.toMatch(/TOKEN|Authorization|Bearer/)
    }

    const coolifyCalls = workflow.match(/\$COOLIFY_URL\/api\//g) ?? []
    const stdinConfigs = workflow.match(/\bcurl\b[^\n]* -K - /g) ?? []

    expect(coolifyCalls.length).toBeGreaterThan(0)
    expect(stdinConfigs).toHaveLength(coolifyCalls.length)

    // A secret is read only as a step's env mapping, never inside a script,
    // where the expression would be expanded into the command itself.
    const secretLines = workflow.split("\n").filter((line) => line.includes("secrets."))

    for (const line of secretLines) {
      expect(line).toMatch(/^ +[A-Z_]+: \$\{\{ secrets\.[A-Z_]+ \}\}$/)
    }
    expect(workflow).toContain("COOLIFY_DEPLOY_TOKEN: ${{ secrets.COOLIFY_DEPLOY_TOKEN }}")
  })

  it("queues a merge behind the run in progress instead of cancelling it", () => {
    // Two merges in a row must not interleave: the second run's migration
    // could land under the first run's app, or the first run's app deploy
    // could publish the second merge's code before its migration ran. And a
    // run in progress must never be cancelled, because it may be mid-`db
    // push`.
    const header = workflow.slice(0, workflow.indexOf("\njobs:\n"))

    expect(header).toMatch(/\nconcurrency:\n {2}group: production\n {2}cancel-in-progress: false\n/)
  })

  it("deploys the Studio once the tests pass, beside the database and not before it", () => {
    const deployStudio = jobBlock("deploy-studio")

    expect(deployStudio).toContain("needs: unit-test")
    expect(jobBlock("smoke")).not.toContain("deploy-studio")
  })

  it("deploys the Studio without a prompt, authenticated by the deploy token", () => {
    const deployStudio = jobBlock("deploy-studio")

    // `deploy` is a pnpm built-in, so without `run` pnpm copies the package to
    // a target directory instead of running the Studio's deploy script.
    expect(runCommand("Deploy the Studio")).toBe("pnpm --filter studio run deploy")
    expect(deployStudio).toContain("SANITY_AUTH_TOKEN: ${{ secrets.SANITY_AUTH_TOKEN }}")
  })

  it("deploys the Studio pointed at production, not at the local default", () => {
    // Without the variable the Studio opens development, which is right on a
    // laptop and wrong for positiv.sanity.studio. The value is inlined at build
    // time, so the job that builds the deployed Studio is where it has to be.
    expect(jobBlock("deploy-studio")).toContain("SANITY_STUDIO_DATASET: production")
  })

  it("points the Studio's preview at the production site, not at localhost", () => {
    // presentation.ts falls back to http://localhost:5173, so the hosted
    // Studio frames a laptop that is not running unless the origin is set. Like
    // the dataset it is a SANITY_STUDIO_* value inlined at build time, so it
    // belongs in the job that builds the deployed Studio, not in Coolify, which
    // never builds it.
    expect(jobBlock("deploy-studio")).toContain(
      "SANITY_STUDIO_PREVIEW_ORIGIN: https://www.positivparty.com",
    )
  })
})
