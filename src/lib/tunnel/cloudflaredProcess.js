export function commandTargetsLocalPort(commandLine, localPort) {
  if (!commandLine || !localPort) return false;
  const escapedPort = String(localPort).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`:${escapedPort}(?=\\D|$)`).test(commandLine);
}

export function extractConfigPath(commandLine) {
  if (!commandLine) return "";
  const match = commandLine.match(/(?:^|\s)--config(?:=|\s+)(?:"([^"]+)"|(\S+))/);
  return match?.[1] || match?.[2] || "";
}

export function isExpectedCloudflaredCommand(commandLine, localPort, pathExists = () => true) {
  if (!commandTargetsLocalPort(commandLine, localPort)) return false;

  const configPath = extractConfigPath(commandLine);
  if (configPath && !pathExists(configPath)) return false;

  return true;
}
