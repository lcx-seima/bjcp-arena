import { describe, expect, it } from "vitest";
import { findLanIpv4Address } from "../../src/shared/network/lan-ip.js";

describe("findLanIpv4Address", () => {
  it("returns the first external IPv4 address", () => {
    expect(
      findLanIpv4Address({
        lo0: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
        ],
        en0: [
          {
            address: "192.168.1.23",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "00:00:00:00:00:01",
            internal: false,
            cidr: "192.168.1.23/24",
          },
        ],
      })
    ).toBe("192.168.1.23");
  });

  it("ignores link-local addresses and returns null without a LAN address", () => {
    expect(
      findLanIpv4Address({
        en0: [
          {
            address: "169.254.10.20",
            netmask: "255.255.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:01",
            internal: false,
            cidr: "169.254.10.20/16",
          },
        ],
      })
    ).toBeNull();
  });
});
