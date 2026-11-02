/**
 * Filtro de Prisma para aislar lecturas por organización.
 * Se usa en los `where` de las consultas: `where: { ...whereOrg(orgId) }`.
 */
export function whereOrg(orgId: string): Record<string, string> {
  return { orgId };
}

/**
 * Valida que un recurso pertenezca a la organización indicada.
 * Lanza un Error si los IDs no coinciden, para evitar que un operador
 * acceda a datos de otra organización (detalles de recursos).
 */
export function assertOrgMembership(resourceId: string, orgId: string): void {
  if (resourceId !== orgId) {
    throw new Error(`El recurso "${resourceId}" no pertenece a la organización "${orgId}"`);
  }
}
