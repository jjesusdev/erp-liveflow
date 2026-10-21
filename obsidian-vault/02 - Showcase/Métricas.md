# Métricas

> Resultados medibles del proyecto

## Fase 1 (técnica)

| Métrica                  | Meta                    | Actual    | Cómo se mide            |
| ------------------------ | ----------------------- | --------- | ----------------------- |
| Tests                    | > 100                   | 63        | `npm test`              |
| Cobertura de rutas API   | > 70%                   | por medir | `npm run test:coverage` |
| Typecheck / lint / build | 0 errores               | OK        | CI                      |
| Rutas API                | todas validadas con Zod | 26+       | `src/app/api`           |

## Negocio

| Métrica                     | Meta           | Actual                                    |
| --------------------------- | -------------- | ----------------------------------------- |
| Tiempo de primera respuesta | < 2 min        | por medir (`Conversation.responseTimeMs`) |
| Conversión de cobro         | por definir    | por medir (`PaymentOrder` PENDING→PAID)   |
| Tasa de entrega             | por definir    | por medir (`Shipment` → DELIVERED)        |
| Cuadre de caja              | sin descuadres | por medir                                 |

## Progreso visual

```
Setup y cerebro          ████████████████████ 100%
Fundamentos              ████████████████████ 100%
Operación en vivo        ████████████████████ 100%
Escala y configuración   ███████████████████░  95%
Conectores               ██████████░░░░░░░░░░  50%
Multi-tenant             ░░░░░░░░░░░░░░░░░░░░   0%
```
