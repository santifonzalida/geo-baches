# GeoBaches

Mapa colaborativo de baches de la ciudad de Córdoba. Los vecinos reportan los baches que encuentran, los confirman cuando pasan por ahí y avisan cuando ya los arreglaron. Así queda una foto actualizada del estado de las calles, armada por la gente que las recorre todos los días.

> GeoBaches **no es un canal oficial** del municipio: es una herramienta ciudadana para hacer visible el problema.

---

## Parte 1 · Qué hace la app

### El problema

Los baches rompen cubiertas y llantas, y son un peligro real para motos y bicis. Hoy no hay una forma simple de saber dónde están, qué tan graves son y si alguien ya los arregló.

### La propuesta

Hacer un mapa público, sin registro y pensado para el celular, donde cualquiera pueda:

1. **Ver** los baches de su zona y filtrarlos por estado, nivel o dirección.
2. **Reportar** uno nuevo en segundos: se ubica el punto en el mapa, se elige qué tan grave es y, si se puede, se le saca una foto.
3. **Confirmar** los que ya están cargados: "Sigue ahí" o "Ya lo arreglaron".
4. **Compartir** un bache puntual con un link directo (`/bache/:id`).

### Niveles de gravedad

| Nivel | Nombre | Qué significa |
|---|---|---|
| 1 | **Leve** | Bache chico y poco profundo. Se esquiva fácil. |
| 2 | **Rompe autos** | Golpe fuerte: riesgo para cubiertas, llantas y tren delantero. |
| 3 | **Cráter** | Bache muy profundo: rotura segura del auto y peligro de vida para motos y bicis. |

### Ciclo de vida de un reporte

```
Vecino reporta ──► Pendiente de revisión ──► Aprobado (visible en el mapa)
                         │                         │
                         └──► Rechazado (se borra) ├─ Sin reparar
                                                   └─ Arreglado
```

- Cada reporte nuevo pasa por **moderación** antes de aparecer en el mapa, para evitar spam y duplicados.
- El estado lo actualiza un administrador, ayudado por lo que dicen los vecinos ("Sigue ahí" / "Ya lo arreglaron").

### Quién usa la app

| Perfil | Qué puede hacer |
|---|---|
| **Vecino** (sin cuenta) | Ver el mapa, filtrar, reportar con foto, confirmar el estado, compartir, escribir por el formulario de contacto. |
| **Administrador** | Aprobar o rechazar reportes pendientes, cambiar el estado de un bache, eliminarlo, leer los mensajes de los vecinos. |

### Privacidad

- No hace falta crear una cuenta para reportar ni para confirmar.
- Las fotos se procesan en el servidor y se les **borran los metadatos EXIF**, incluida la ubicación GPS del celular.
- Las confirmaciones se cuentan por dispositivo (un identificador anónimo), así nadie puede votar muchas veces.

---

## Parte 2 · Tecnología

### Arquitectura

```
┌──────────────────────┐   HTTPS / JSON   ┌───────────────────────┐      ┌──────────────┐
│  Frontend (Angular)  │ ───────────────► │   Backend (NestJS)    │ ───► │  PostgreSQL  │
│  Leaflet + CARTO     │                  │   TypeORM · JWT       │      └──────────────┘
└──────────────────────┘                  │                       │      ┌──────────────┐
                                          │                       │ ───► │ Bucket S3    │ (fotos)
                                          │                       │      └──────────────┘
                                          │                       │      ┌──────────────┐
                                          │                       │ ───► │  Nominatim   │ (direcciones)
                                          └───────────────────────┘      └──────────────┘
```

Es un monorepo con dos aplicaciones:

```
.
├── frontend/   # SPA en Angular
├── backend/    # API REST en NestJS
└── docs/       # Diseño de las pantallas
```

### Frontend

| Tecnología | Uso |
|---|---|
| **Angular 22** | Componentes standalone, signals y detección de cambios zoneless. Las rutas de detalle, "Acerca de" y el panel de administración se cargan con lazy loading. |
| **Leaflet** | El mapa interactivo y los marcadores. |
| **CARTO Positron** | El estilo base del mapa (con OpenStreetMap como respaldo si no hay API key). |
| **Tailwind CSS v4** | Los estilos y el diseño responsive: paneles inferiores arrastrables en el celular y columna lateral en escritorio. |
| **Vitest** | Tests unitarios. |

Detalles de UX: los paneles se pueden minimizar arrastrando el encabezado, hay una pantalla de carga con reintento si falla la API, se usa un modal de confirmación para las acciones que no se pueden deshacer y se respeta la preferencia de "reducir movimiento" del sistema.

### Backend

| Tecnología | Uso |
|---|---|
| **NestJS 10** | La API REST, organizada en módulos: `baches`, `auth`, `usuarios`, `contacto`, `geocoding`, `storage`. |
| **TypeORM + PostgreSQL** | La persistencia de los datos. |
| **JWT + bcrypt** | El login del panel de administración y la protección de rutas por rol (`admin`). |
| **sharp** | Procesa las fotos: las redimensiona a un máximo de 1280 px, corrige la orientación y les borra el EXIF. |
| **AWS SDK (S3)** | Guarda las fotos en un bucket S3-compatible; en desarrollo se usa el disco local. |
| **Nominatim (OSM)** | Convierte coordenadas en una dirección (geocodificación inversa). La consulta sale del servidor y se cachea, para respetar la política de uso. |
| **class-validator** | Valida los datos que llegan a la API. El formulario de contacto tiene además un campo trampa (honeypot) contra bots. |
| **Jest** | Tests unitarios. |

### API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/baches` | Público | Baches aprobados |
| `POST` | `/baches` | Público | Nuevo reporte (multipart, con foto opcional de hasta 5 MB) |
| `GET` / `POST` | `/baches/:id/confirmaciones` | Público | Leer o enviar "Sigue ahí" / "Ya lo arreglaron" |
| `GET` | `/geocoding/reverse` | Público | Dirección de una coordenada |
| `POST` | `/contacto` | Público | Mensaje del formulario de contacto |
| `POST` | `/auth/login` | Público | Login de administrador |
| `GET` | `/baches/pendientes` | Admin | Reportes que esperan moderación |
| `PATCH` | `/baches/:id/aprobar` | Admin | Aprobar un reporte |
| `PATCH` | `/baches/:id/estado` | Admin | Cambiar el estado |
| `DELETE` | `/baches/:id` | Admin | Eliminar un bache |
| `GET` | `/baches/confirmaciones/resumen` | Admin | Confirmaciones de todos los baches |
| `GET` / `DELETE` | `/contacto`, `/contacto/:id` | Admin | Leer o borrar mensajes |
| `POST` | `/usuarios` | API key | Crear usuarios (header `X-Api-Key`) |

### Despliegue

El frontend y el backend corren como servicios separados en **Railway**, junto con PostgreSQL y un Railway Bucket para las fotos. El frontend se construye con su propio [Dockerfile](frontend/Dockerfile).

---

## Desarrollo local

### Requisitos

- Node.js 22
- PostgreSQL corriendo de forma local

### Configuración

1. Copiar `backend/.env.example` a `backend/.env` y completar los datos de la base, `JWT_SECRET` y el usuario admin inicial. Cada variable está explicada en el mismo archivo.
2. (Opcional) Cargar `cartoApiKey` en `frontend/src/environments/environment.ts` para usar el estilo CARTO. Sin la key, el mapa usa OpenStreetMap.

### Levantar la app

```bash
# Terminal 1: backend (http://localhost:3000)
cd backend && npm install && npm run start:dev

# Terminal 2: frontend (http://localhost:4200)
cd frontend && npm install && npm start
```

En desarrollo, las tablas se crean solas al arrancar el backend (`synchronize` de TypeORM).

### Tests

```bash
cd backend && npm test
cd frontend && npm test
```
