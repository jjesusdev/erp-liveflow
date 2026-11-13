# Acceso desde el celular (dev)

Flujo para abrir el sistema desde el teléfono **mientras desarrollás**, sin VPS y sin costo:
el dev server local se expone por un **Cloudflare Quick Tunnel** (`https://*.trycloudflare.com`).

> Esto es solo para desarrollo y pruebas. No es el deploy de producción: la compu tiene que
> estar prendida y el túnel cambia de URL cada vez que lo reiniciás.

## Requisitos

- `cloudflared` instalado en el PATH de WSL:

  ```bash
  mkdir -p ~/.local/bin
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o ~/.local/bin/cloudflared
  chmod +x ~/.local/bin/cloudflared
  cloudflared --version
  ```

- PostgreSQL arriba en `127.0.0.1:5432` (si no, el sistema abre pero el login falla).

## Uso

```bash
npm run dev:phone                      # dev completo (WhatsApp + workers)
DEV_SCRIPT=dev:fast npm run dev:phone  # sin WhatsApp ni workers (más liviano)
```

El script:

1. Levanta el dev server en el puerto `3001`.
2. Abre el túnel de Cloudflare.
3. Imprime la URL pública y un QR para escanear desde el celular.
4. Al cortar con `Ctrl+C`, baja el túnel y el server.

Los logs quedan en `/tmp/liveflow-dev-phone/server.log` y `/tmp/liveflow-dev-phone/tunnel.log`.

## Por qué funciona sin tocar nada más

- El cliente de Socket.io (`src/lib/socket.ts`) usa el mismo origen (`io()` con
  `path: /api/socketio`), así que el tiempo real funciona a través del túnel.
- La cookie de sesión es `secure` solo en producción, así que en dev viaja bien por HTTPS.
- `next.config.js` declara `allowedDevOrigins: ['*.trycloudflare.com']`; sin eso Next 15
  bloquea los assets cross-origin en modo dev y la página carga sin hidratar.

## Límites y problemas típicos

| Síntoma                                                 | Causa / solución                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| La URL abre pero la pantalla queda vacía                | Falta `allowedDevOrigins` o el túnel cambió de URL; reiniciá `npm run dev:phone`.                                         |
| "Blocked cross-origin request" en la consola del server | Mismo punto: el origen no está permitido en `next.config.js`.                                                             |
| Login no hace nada                                      | PostgreSQL caído o `DATABASE_URL` apuntando a otro lado.                                                                  |
| La URL dejó de andar                                    | La compu se durmió, WSL se apagó o reiniciaste el túnel (la URL es nueva cada vez).                                       |
| Querés URL fija y privada                               | Alternativa: [Tailscale](https://tailscale.com/) con la app en el celu (IP privada estable, sin exponer nada a internet). |

## Seguridad

La URL del quick tunnel es **pública**: cualquiera que la tenga llega al login. No dejes el
túnel levantado cuando no lo estés usando y no cargues datos reales de clientas en este entorno.

## Camino a producción

Cuando pases a VPS, este script deja de usarse. El repo ya trae `Dockerfile`,
`docker-compose.yml` (app + Postgres) y `ecosystem.config.js` (PM2) para ese despliegue.
