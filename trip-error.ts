const MISSING_DRIVER_CPF = "Informe o CPF do motorista para iniciar a viagem.";

export function readTripErrorMessage(body: string, status?: number) {
  const fallback = status
    ? `Não foi possível atualizar a viagem (${status}).`
    : "Não foi possível atualizar a viagem.";
  const trimmed = body.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = parseJson(trimmed);
  if (parsed) {
    const messages = collectTripMessages(parsed).map(friendlyTripMessage);
    return messages.length > 0 ? messages.join("\n") : fallback;
  }

  return friendlyTripMessage(trimmed);
}

export function tripErrorNeedsDriverCpf(message: string) {
  return message === MISSING_DRIVER_CPF || /cpfMotorista|cpf do motorista/i.test(message);
}

function friendlyTripMessage(message: string) {
  if (/cpfMotorista/i.test(message) && /obrigat|preenchid/i.test(message)) {
    return MISSING_DRIVER_CPF;
  }
  return message;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function collectTripMessages(data: unknown) {
  const messages: string[] = [];
  for (const record of messageRecords(data)) {
    const lists = [record.Mensagens, record.mensagens, record.messages];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (typeof item === "string" && item.trim()) {
          messages.push(item.trim());
        } else if (item && typeof item === "object") {
          const message = (item as { mensagem?: unknown; message?: unknown }).mensagem
            ?? (item as { message?: unknown }).message;
          if (typeof message === "string" && message.trim()) {
            messages.push(message.trim());
          }
        }
      }
    }
    for (const key of ["mensagem", "message"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim() && !value.trim().startsWith("{")) {
        messages.push(value.trim());
      }
    }
  }
  return [...new Set(messages)];
}

function messageRecords(data: unknown) {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  return [record, record.err, record.error].filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}
