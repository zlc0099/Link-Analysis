/** 一般密钥：前 4 位 + **** + 后 2 位；短值只展示前 2 位 + **** */
export function maskSecret(value: string): string {
  const v = (value ?? '').trim()
  if (v.length <= 4) return `${v.slice(0, 2)}****`
  return `${v.slice(0, 4)}****${v.slice(-2)}`
}
