# Semilleros UTB — Plataforma de Gestión de Semilleros de Investigación

Plataforma para centralizar la información de semilleros, proyectos, integrantes,
actividades y productos académicos de la Universidad Tecnológica de Bolívar (UTB),
con roles y permisos diferenciados para el Administrador de Sistema, el Profesor
Líder de cada semillero y los estudiantes.

## Estructura del proyecto

```
semilleros-utb/
├── database/
│   └── schema.sql          # DDL + DML + vista + procedimiento + trigger
├── backend/                # API REST (Node.js + Express + MySQL)
│   ├── src/
│   └── package.json
├── frontend/                # HTML5 + TailwindCSS + JavaScript
│   ├── index.html            # Login
│   ├── admin.html            # Dashboard del Admin de Sistema
│   ├── lider.html            # Dashboard del Profesor Líder
│   └── assets/
└── README.md
```

## Requisitos previos

- **MySQL 8.0** (o compatible) instalado y corriendo localmente.
- **Node.js 18 o superior** y npm.
- Un navegador moderno. No se necesita instalar nada para el frontend: son
  archivos HTML estáticos.
- (Opcional) La extensión **Live Server** de VS Code, o cualquier servidor
  estático simple, para servir el frontend.

---

## Paso 1 — Crear la base de datos

1. Abre una terminal en la carpeta `database/`.
2. Ejecuta el script contra tu servidor MySQL:

   ```bash
   mysql -u root -p < schema.sql
   ```

   Esto crea la base de datos `semilleros_utb`, todas las tablas, los datos de
   prueba, la vista `vista_resumen_semilleros`, el procedimiento almacenado
   `sp_aprobar_ingreso_estudiante` y el trigger `trg_actualizar_miembros_activos`.

3. Verifica que todo quedó creado correctamente:

   ```sql
   USE semilleros_utb;
   SHOW TABLES;
   SELECT * FROM vista_resumen_semilleros;
   ```

**Usuarios de prueba** (todos con la misma contraseña `Utb2026*`):

| Rol                  | Correo                          |
|-----------------------|----------------------------------|
| Administrador de Sistema | admin.sistema@utb.edu.co     |
| Profesor Líder (Semillero IA)        | carlos.martinez@utb.edu.co |
| Profesor Líder (Semillero Biotecnología) | ana.perez@utb.edu.co   |
| Estudiante            | juan.gomez@utb.edu.co           |

> La contraseña de todos los usuarios sembrados está guardada como un hash
> bcrypt real, así que puedes iniciar sesión con ellos tal como están, sin
> pasos adicionales.

---

## Paso 2 — Configurar y levantar el backend

1. Entra a la carpeta `backend/` e instala las dependencias:

   ```bash
   cd backend
   npm install
   ```

2. Copia el archivo de variables de entorno de ejemplo y ajústalo con tus
   credenciales de MySQL:

   ```bash
   cp .env.example .env
   ```

   Edita `.env` y completa al menos:

   ```
   DB_USER=root
   DB_PASSWORD=tu_password_de_mysql
   JWT_SECRET=cambia_este_valor_por_uno_largo_y_aleatorio
   ```

3. Levanta el servidor:

   ```bash
   npm start
   ```

   Deberías ver: `API de Semilleros UTB corriendo en http://localhost:4000`

4. Verifica que responde:

   ```bash
   curl http://localhost:4000/api/salud
   ```

### Endpoints principales

| Método | Ruta                                       | Rol requerido       |
|--------|---------------------------------------------|----------------------|
| POST   | `/api/auth/login`                            | Público              |
| POST   | `/api/admin/semilleros`                      | Admin_Sistema        |
| GET    | `/api/admin/usuarios`                        | Admin_Sistema        |
| GET    | `/api/semillero/mis-integrantes`             | Profesor_Lider        |
| PUT    | `/api/semillero/solicitudes/:id/aprobar`     | Profesor_Lider        |
| POST   | `/api/proyectos`                              | Profesor_Lider        |
| GET    | `/api/reportes/globales`                     | Admin_Sistema        |
| GET    | `/api/reportes/mi-semillero`                 | Profesor_Lider        |

---

## Paso 3 — Servir el frontend

El frontend es HTML/JS estático: cualquier servidor local funciona. Dos
opciones sencillas:

**Opción A — VS Code + Live Server**
Abre la carpeta `frontend/` en VS Code, clic derecho sobre `index.html` →
"Open with Live Server". Normalmente arranca en `http://127.0.0.1:5500`.

**Opción B — servidor de Python**
```bash
cd frontend
python3 -m http.server 5500
```
Luego visita `http://localhost:5500`.

> Importante: si el frontend queda en un puerto distinto a `5500`, actualiza
> `CORS_ORIGIN` en el `.env` del backend para que coincida (o reinicia el
> backend después de cambiarlo).

Si tu backend corre en un host o puerto distinto a `http://localhost:4000`,
ajusta la constante `API_BASE` en `frontend/assets/js/api.js`.

---

## Paso 4 — Probar la plataforma

1. Entra a `http://localhost:5500` (o el puerto que uses) e inicia sesión con
   `admin.sistema@utb.edu.co` / `Utb2026*` → verás el dashboard del
   Administrador de Sistema (resumen global, semilleros, usuarios, facultades).
2. Cierra sesión e inicia con `carlos.martinez@utb.edu.co` / `Utb2026*` → verás
   el dashboard del Profesor Líder del Semillero de Inteligencia Artificial,
   con una solicitud de ingreso pendiente para aprobar o rechazar.
3. El botón en la esquina superior alterna entre modo claro y modo oscuro; la
   preferencia queda guardada en el navegador.

---

## Notas de diseño

- **Seguridad de contraseñas:** se almacenan siempre como hash con `bcrypt`
  (10 rondas); nunca en texto plano.
- **RBAC:** cada ruta del backend valida el rol del token JWT; además, las
  rutas del Profesor Líder verifican que el semillero que intenta administrar
  sea efectivamente el que lidera (no puede gestionar otro semillero aunque
  conozca su ID).
- **Regla de negocio de los 2 semilleros:** está implementada dentro del
  procedimiento almacenado `sp_aprobar_ingreso_estudiante`, no en el backend,
  para que se cumpla sin importar desde dónde se llame al procedimiento.
- **Conteo de integrantes activos:** se mantiene automáticamente mediante el
  trigger `trg_actualizar_miembros_activos`, sin que el backend tenga que
  recalcularlo manualmente.
