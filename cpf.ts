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

export function readLoggedInDriverCpf(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const attributes =
    record.attributes && typeof record.attributes === "object"
      ? (record.attributes as Record<string, unknown>)
      : {};
  const candidates = [
    record.cpfMotorista,
    record.cpf,
    attributes.cpfMotorista,
    attributes.cpf,
    attributes.notes
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") continue;
    const cpf = cleanCpf(String(candidate));
    if (isValidCpf(cpf)) return cpf;
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
