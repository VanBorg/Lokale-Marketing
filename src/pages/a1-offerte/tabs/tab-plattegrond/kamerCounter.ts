let counter = 0;

/** Monotonic label index for new plattegrond rooms (Kamer1, Kamer2, …). */
export function nextKamerNumber(): number {
  counter += 1;
  return counter;
}
