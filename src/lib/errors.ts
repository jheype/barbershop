export function getErrorMessage(err: unknown, fallback = "Algo deu errado") {
  return err instanceof Error ? err.message : fallback;
}
