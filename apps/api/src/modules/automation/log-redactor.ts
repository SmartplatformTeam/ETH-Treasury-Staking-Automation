const valuePatterns = [
  /\b(seed phrase|mnemonic|private[-_ ]?key|secret|token|password|api[-_ ]?key)\b\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  /\b(jwt\.hex|authorization)\b\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  /\b(web3signer client key|keystore password)\b\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b[0-9a-fA-F]{64}\b/g,
];

export type RedactionResult = {
  message: string;
  redacted: boolean;
};

export function redactLogMessage(message: string): RedactionResult {
  let redactedMessage = message;

  for (const pattern of valuePatterns) {
    redactedMessage = redactedMessage.replace(pattern, (match) => {
      if (match.startsWith("Bearer ")) {
        return "Bearer [REDACTED]";
      }

      const separatorIndex = Math.max(match.indexOf("="), match.indexOf(":"));

      if (separatorIndex > -1) {
        return `${match.slice(0, separatorIndex + 1)}[REDACTED]`;
      }

      return "[REDACTED]";
    });
  }

  return {
    message: redactedMessage,
    redacted: redactedMessage !== message,
  };
}
