import { civilDate, type CivilDate } from './civil-date';

export type Currency = 'BRL' | 'USD';

export interface Money {
  readonly minorUnits: number;
  readonly currency: Currency;
}

export function money(minorUnits: number, currency: Currency): Money {
  if (!Number.isSafeInteger(minorUnits))
    throw new RangeError('Quantia fora da precisão de centavos inteiros.');
  if (currency !== 'BRL' && currency !== 'USD') throw new RangeError('Moeda não suportada.');
  return Object.freeze({ minorUnits: minorUnits === 0 ? 0 : minorUnits, currency });
}

function checked(value: Money): Money {
  return money(value.minorUnits, value.currency);
}

function fromExact(value: bigint, currency: Currency): Money {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('Operação excede a precisão monetária.');
  }
  return money(Number(value), currency);
}

export function addMoney(left: Money, right: Money): Money {
  checked(left);
  checked(right);
  if (left.currency !== right.currency) throw new RangeError('Não somar moedas diferentes.');
  return fromExact(BigInt(left.minorUnits) + BigInt(right.minorUnits), left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  checked(left);
  checked(right);
  if (left.currency !== right.currency) throw new RangeError('Não subtrair moedas diferentes.');
  return fromExact(BigInt(left.minorUnits) - BigInt(right.minorUnits), left.currency);
}

export function sumMoney(currency: Currency, values: Iterable<Money>): Money {
  let result = money(0, currency);
  for (const value of values) result = addMoney(result, value);
  return result;
}

export type Amount =
  | { readonly status: 'known'; readonly value: Money }
  | { readonly status: 'unknown'; readonly reason: string };

/** Retorna subtotal identificado, nunca um total completo inventado para ausências. */
export function summarizeAmounts(currency: Currency, amounts: readonly Amount[]) {
  let knownSubtotal = money(0, currency);
  let missingCount = 0;
  for (const amount of amounts) {
    if (amount.status === 'known') knownSubtotal = addMoney(knownSubtotal, amount.value);
    else if (amount.status === 'unknown' && amount.reason.trim()) missingCount++;
    else throw new RangeError('Estado de quantia inválido ou ausência sem motivo.');
  }
  return Object.freeze({ knownSubtotal, missingCount, complete: missingCount === 0 });
}

/** Arredondamento exato ao centavo mais próximo; empate afasta de zero. */
function roundRatio(numerator: bigint, denominator: bigint): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const magnitude = numerator * sign;
  const quotient = magnitude / denominator;
  return (quotient + ((magnitude % denominator) * 2n >= denominator ? 1n : 0n)) * sign;
}

export function divideForDisplay(value: Money, divisor: number): Money {
  checked(value);
  if (!Number.isSafeInteger(divisor) || divisor <= 0)
    throw new RangeError('Divisor deve ser inteiro positivo.');
  return fromExact(roundRatio(BigInt(value.minorUnits), BigInt(divisor)), value.currency);
}

export interface ExchangeRate {
  readonly from: Currency;
  readonly to: Currency;
  readonly numerator: number;
  readonly denominator: number;
  readonly on: CivilDate;
  readonly source: string;
  readonly nature: 'fictitious' | 'estimated' | 'observed';
}

/** Conversão para apresentação; não reescreve o fato original nem cria lançamento. */
export function convertForDisplay(value: Money, rate: ExchangeRate) {
  checked(value);
  money(0, rate.to);
  civilDate(rate.on);
  if (
    value.currency !== rate.from ||
    rate.from === rate.to ||
    !rate.source.trim() ||
    !['fictitious', 'estimated', 'observed'].includes(rate.nature) ||
    !Number.isSafeInteger(rate.numerator) ||
    rate.numerator <= 0 ||
    !Number.isSafeInteger(rate.denominator) ||
    rate.denominator <= 0
  ) {
    throw new RangeError('Cotação inválida ou incompatível com a moeda.');
  }
  const converted = fromExact(
    roundRatio(BigInt(value.minorUnits) * BigInt(rate.numerator), BigInt(rate.denominator)),
    rate.to,
  );
  return Object.freeze({ original: checked(value), converted, rate: Object.freeze({ ...rate }) });
}
