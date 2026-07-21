import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

type NetworkInterfaces = NodeJS.Dict<NetworkInterfaceInfo[]>;

function isIpv4(info: NetworkInterfaceInfo) {
  return info.family === "IPv4";
}

function isLinkLocal(address: string) {
  return address.startsWith("169.254.");
}

export function findLanIpv4Address(interfaces: NetworkInterfaces = networkInterfaces()) {
  for (const entries of Object.values(interfaces)) {
    for (const info of entries ?? []) {
      if (isIpv4(info) && !info.internal && !isLinkLocal(info.address)) {
        return info.address;
      }
    }
  }

  return null;
}
