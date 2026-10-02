import { describe, expect, it } from "vitest"

import { withoutIcons } from "./env-types"

const icon =
  "![icon](data:image/svg+xml;utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E) "

const withIcons = `export type CoercedEnvSchema = {
  /**
   * **VPS_HOST**
   * Changing this means regenerating VPS_SSH_KNOWN_HOSTS.
   * ${icon}
   */
  VPS_HOST?: string;

  /**
   * **VPS_USER**
   * ${icon}
   */
  VPS_USER?: string;
};
`

const withoutFetchedIcons = `export type CoercedEnvSchema = {
  /**
   * **VPS_HOST**
   * Changing this means regenerating VPS_SSH_KNOWN_HOSTS.
   */
  VPS_HOST?: string;

  /** **VPS_USER** */
  VPS_USER?: string;
};
`

describe("withoutIcons", () => {
  it("reads the same whether or not varlock could fetch the icons", () => {
    expect(withoutIcons(withIcons)).toBe(withoutIcons(withoutFetchedIcons))
  })

  it("still tells a changed type apart", () => {
    expect(withoutIcons(withIcons)).not.toBe(
      withoutIcons(
        withoutFetchedIcons.replace("VPS_USER?: string", "VPS_USER: string"),
      ),
    )
  })

  it("still tells a changed description apart", () => {
    expect(withoutIcons(withIcons)).not.toBe(
      withoutIcons(withoutFetchedIcons.replace("regenerating", "rotating")),
    )
  })
})
