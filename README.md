# geo-baches-app

Monorepo con el frontend (Angular) y el backend (NestJS + PostgreSQL) de la app de reporte de baches.

```
.
├── frontend/   # Angular + Leaflet — ver frontend/README.md
└── backend/    # NestJS + TypeORM + PostgreSQL
```

## Desarrollo local

```bash
# Terminal 1: backend (http://localhost:3000)
cd backend && npm run start:dev

# Terminal 2: frontend (http://localhost:4200)
cd frontend && npm start
```

Requiere una instancia de PostgreSQL corriendo localmente con la base configurada en `backend/.env` (ver `backend/.env.example`).
