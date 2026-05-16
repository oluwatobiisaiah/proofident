const formatNigerianPhone = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, "");

  const prefix = cleaned.startsWith("+234")
    ? "+234"
    : cleaned.startsWith("234")
      ? "234"
      : "";

  let digits = cleaned.startsWith("+234")
    ? cleaned.slice(4)
    : cleaned.startsWith("234")
      ? cleaned.slice(3)
      : cleaned;

  digits = digits.replace(/\D/g, "").slice(0, prefix ? 10 : 11);

  const [a, b, c] = [
    digits.slice(0, prefix ? 3 : 4),
    digits.slice(prefix ? 3 : 4, prefix ? 6 : 7),
    digits.slice(prefix ? 6 : 7),
  ];

  const local = [a, b, c].filter(Boolean).join(" ");
  return prefix ? `${prefix} ${local}`.trim() : local;
};


export { formatNigerianPhone }