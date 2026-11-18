/** Estados de envío que todavía no salen del almacén. */
export const TO_DISPATCH_STATUSES: string[] = ["PENDING", "READY", "LABEL_PRINTED"];

/** Estados de envío que ya están en camino. */
export const IN_TRANSIT_STATUSES: string[] = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

/** Estados de envío con incidencias. */
export const ISSUE_STATUSES: string[] = ["FAILED", "RETURNED", "LOST", "CANCELLED"];

export function canDispatch(status: string): boolean {
  return TO_DISPATCH_STATUSES.includes(status);
}

export function canDeliver(status: string): boolean {
  return IN_TRANSIT_STATUSES.includes(status);
}
