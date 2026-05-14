function formatNaira(amount: number) {
  if (amount >= 1000) return "₦" + (amount / 1000).toFixed(0) + "K";
  return "₦" + amount;
}


export { formatNaira }