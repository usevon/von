export const tamperCursorSignature = (cursor: string): string => {
  const parts = cursor.split(".");
  const signature = parts[5];
  if (!signature) {
    return `${cursor}a`;
  }

  const replacement = signature.startsWith("a") ? "b" : "a";
  parts[5] = `${replacement}${signature.slice(1)}`;
  return parts.join(".");
};
