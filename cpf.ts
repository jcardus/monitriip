export function cleanCpf(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidCpf(value: string | null | undefined) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  return [9, 10].every((len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i);
    return (sum * 10) % 11 % 10 === digits[len];
  });
}

function recordFrom(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstValidCpf(candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") continue;
    const cpf = cleanCpf(String(candidate));
    if (isValidCpf(cpf)) return cpf;
  }
  return "";
}

export function readLoggedInDriverCpf(data: unknown, depth = 0): string {
  const record = recordFrom(data);
  if (!record || depth > 2) return "";
  const attributes = recordFrom(record.attributes) ?? {};
  const direct = firstValidCpf([
    record.cpfMotorista,
    record.cpf,
    record.uniqueId,
    record.username,
    record.loginId,
    record.preferred_username,
    record["cognito:username"],
    record["custom:cpf"],
    record["custom:cpfMotorista"],
    attributes.cpfMotorista,
    attributes.cpf,
    attributes.notes,
    attributes.username
  ]);
  if (direct) return direct;
  if (depth >= 1) return "";
  for (const nested of [record.driver, record.user, record.profile, record.data]) {
    const cpf = readLoggedInDriverCpf(nested, depth + 1);
    if (cpf) return cpf;
  }
  return "";
}

export function formatCpf(value: string | null | undefined) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function formatCpfInput(value: string) {
  const cpf = cleanCpf(value).slice(0, 11);
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
