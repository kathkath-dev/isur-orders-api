# ISUR Orders API

Servicio de pedidos contenerizado con PostgreSQL, migraciones versionadas,
pruebas de integración y pipeline CI/CD con publicación en GHCR.

## Requisitos

Git, Node.js 22, npm, Docker y Docker Compose.

## Levantar en local

```bash
npm install
cp .env.example .env          # PowerShell: copy .env.example .env
docker compose up --build -d  # db -> migrate -> api
docker compose ps
curl http://localhost:3000/health/ready
```

Datos de demostración (solo local): `docker compose run --rm api node scripts/seed.js`

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | /health/live | Proceso activo |
| GET | /health/ready | Listo para tráfico (valida PostgreSQL) |
| GET | /version | Versión y commit desplegados |
| GET/POST | /api/v1/customers | Clientes (409 si el documento se repite) |
| GET/POST | /api/v1/orders | Pedidos (422 si el cliente no existe) |

## Migraciones

Archivos `db/migrations/VNNN__descripcion.sql`, aplicados en orden por
`scripts/migrate.js`, registrados en `schema_migrations` con checksum SHA-256.
**Nunca edite una migración aplicada:** cree una nueva.

```bash
docker compose run --rm migrate
```

## Pruebas (PostgreSQL real)

```bash
docker compose -f compose.test.yaml up -d
# variables: NODE_ENV=test DB_HOST=127.0.0.1 DB_PORT=54329 DB_NAME=isur_test DB_USER=isur_test DB_PASSWORD=test_password DB_SSL=false
npm run migrate
npm test
```

## CI/CD

- `ci.yml`: en cada push/PR crea PostgreSQL temporal → `npm ci` → migraciones → pruebas → `docker build`.
- `release.yml`: al publicar una etiqueta `vX.Y.Z` repite la verificación y publica la imagen en `ghcr.io` con etiquetas de versión y SHA.
- `deploy.yml`: despliegue manual (`workflow_dispatch`) en el orden pull → migrate → api → smoke test.

## Despliegue

Ver `deploy/compose.prod.yaml` y `deploy/.env.prod.example`. El archivo real
`.env.prod` vive solo en el servidor (`chmod 600`).
