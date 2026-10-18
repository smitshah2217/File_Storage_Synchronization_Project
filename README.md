# Cloud Storage & Synchronization

A self-hostable, multi-user cloud file-storage application. Users can organize files in nested folders, upload and download versioned content, search their own and shared files, manage trash, and share individual files with other registered users.

## Project status

| Area | Status |
| --- | --- |
| Authentication and account settings | Implemented: registration, username/email login, profile editing, password change, 24-hour stateless JWTs, refresh, and client-side logout |
| Files and folders | Implemented: nested folders, paginated browsing, upload/batch upload, preview, download, rename, move, and soft delete |
| Trash and retention | Implemented: restore, permanent deletion, empty trash, and daily cleanup after 30 days |
| Sharing | Implemented: direct user-to-user file sharing with `VIEW` or `EDIT` permissions and revocation |
| Versions and download history | Implemented: upload/restore/download versions, per-version MIME metadata, paginated history, and clear history |
| Search and storage | Implemented: paginated search across owned/shared files and storage-usage dashboard |
| Security and API | Implemented: validation, standardized JSON errors, optimistic locking, quota locks, Swagger UI, and CORS configuration |
| Local deployment | Docker Compose definitions are provided for PostgreSQL, MinIO, the API, and the frontend |

### Deliberate scope limits

The blueprint explicitly excludes folder sharing, public links, account deletion, password reset, and collaborative editing. This implementation does not expose those features; sharing is file-only and requires both users to have accounts. `EDIT` permits authorized file rename/move operations, while destructive file lifecycle operations and version restoration remain owner-only.

## Architecture

- **Frontend:** React, TypeScript, Vite, Redux Toolkit, Tailwind CSS, Axios.
- **API:** Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Bean Validation, springdoc OpenAPI.
- **Metadata:** PostgreSQL. Database transactions and JPA `@Version` columns protect metadata updates; a user-row write lock serializes storage-quota changes.
- **Object storage:** MinIO. Blobs are stored under generated object keys. Uploads register rollback compensation, and deletion is scheduled after the metadata transaction commits. Batch upload is limited to 100 files, uses a bounded executor, and commits each file independently; if one item fails, successful items may still be present after the client refreshes the folder.
- **Retention:** A scheduled server-side cleanup permanently deletes trash older than 30 days.

## Run locally with Docker Compose

Requirements: Docker Engine with the Compose plugin.

```bash
cp .env.example .env
# Replace JWT_SECRET with a private value (at least 32 UTF-8 bytes):
openssl rand -base64 48
# Put the generated value in .env, then start the stack:
docker compose up --build
```

The example database and MinIO credentials are for local development only. Replace them before exposing the stack to a network. `.env` is intentionally ignored by Git; do not commit credentials.

Services:

- Web app: <http://localhost:3000>
- API: <http://localhost:8080/api>
- Swagger UI: <http://localhost:8080/swagger-ui/index.html>
- MinIO console: <http://localhost:9001>
- PostgreSQL: `localhost:5432`

Compose waits for PostgreSQL readiness. The API retries MinIO bucket initialization during startup. PostgreSQL and MinIO data are kept in named volumes (`pgdata`, `miniodata`). To reset local data, remove those volumes explicitly; doing so permanently deletes the local database and stored objects.

## Run the frontend separately

For frontend-only work, first start the API at `localhost:8080` and then:

```bash
cd frontend
npm ci
npm run dev
```

Vite serves the app on port `5173` and proxies `/api` to the backend. The optional `VITE_API_BASE_URL` variable can point the frontend at a different API base URL. The production frontend container uses Nginx to serve the SPA and proxy `/api`, Swagger, and OpenAPI requests to the API service.

To run the API outside Compose, start PostgreSQL and MinIO, export the local settings from the repository root, then run:

```bash
set -a
. ./.env
set +a
cd backend
mvn spring-boot:run
```

Java 21 and Maven are required. The default local settings expect PostgreSQL at `localhost:5432` and MinIO at `localhost:9000`.

## Configuration

| Variable | Purpose | Default / example |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/cloudstorage` (Compose overrides the hostname) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Database credentials | Set in your ignored `.env` |
| `JWT_SECRET` | HS256 signing secret; **minimum 32 UTF-8 bytes** | Generate a private value; no production default is provided |
| `JWT_EXPIRATION_MS` | JWT lifetime in milliseconds | `86400000` (24 hours) |
| `MINIO_ENDPOINT` | MinIO API endpoint | `http://localhost:9000` (Compose uses `http://minio:9000`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO credentials | Set in your ignored `.env` |
| `MINIO_BUCKET_NAME` | Bucket created/used by the API | `cloudstorage` in Compose |
| `MAX_UPLOAD_SIZE_BYTES` | Maximum size per uploaded file | `104857600` (100 MiB) |
| `MAX_REQUEST_SIZE_BYTES` | Multipart request limit | `524288000` (500 MiB) |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated browser origins for direct API access | Local Vite and Compose origins |

## API overview

All endpoints except registration, login, Swagger/OpenAPI, and health checks require `Authorization: Bearer <JWT>`.

| Capability | Routes |
| --- | --- |
| Register / log in / refresh / log out | `POST /api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` |
| Profile / password / storage usage | `GET, PUT /api/users/me`, `PUT /api/users/me/password`, `GET /api/users/me/storage` |
| Browse / create / update folders | `GET /api/folders/root`, `GET /api/folders/{id}`, `GET /api/folders/{id}/breadcrumb`, `POST /api/folders`, `PUT /api/folders/{id}` |
| Upload / batch upload / file metadata | `POST /api/files/upload`, `POST /api/files/upload-batch`, `GET /api/files/{id}` |
| Download / preview / rename / move / trash | `GET /api/files/{id}/download`, `/preview`; `PUT, DELETE /api/files/{id}` |
| Version history | `GET /api/files/{id}/versions`, `POST /api/files/{id}/versions`, `GET /api/files/{id}/versions/{version}`, version download/preview routes, and `POST /api/files/{id}/versions/{version}/restore` |
| Share files | `POST, GET /api/files/{id}/share`, `PUT, DELETE /api/files/{id}/share/{shareId}`, `GET /api/shared/files`, `GET /api/shared/by-me` |
| Trash / restore / permanent delete | `GET, DELETE /api/trash`; `POST /api/files/{id}/restore`, `DELETE /api/files/{id}/permanent`; corresponding folder routes |
| Search / storage dashboard / download history | `GET /api/search?q=...`, `GET /api/storage/dashboard`, `GET, DELETE /api/download-history` |

Collection endpoints accept zero-based `page` and `size` parameters (default `page=0&size=20`; maximum size is 100). Collection responses use `{ "content": [...], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }`; nested folder, file, trash, and search results contain one such page for each item type.

Errors use a consistent JSON body with `timestamp`, `status`, `error`, `message`, `path`, and optional `fieldErrors`. Private file downloads/previews are streamed from MinIO with safe content-disposition and `nosniff` headers.

## Database notes

`database/init.sql` initializes a **new** PostgreSQL volume. Existing databases created before per-version MIME metadata was introduced must be migrated once before deploying this version:

```bash
set -a
. ./.env
set +a
psql -h localhost -p 5432 -U "$SPRING_DATASOURCE_USERNAME" -d cloudstorage -v ON_ERROR_STOP=1 -f database/migrations/V2__file_version_mime_type.sql
```

The migration backfills existing version rows from each file's current MIME type; older versions did not store their own MIME type. Newly uploaded versions record it exactly. The PostgreSQL image only runs `database/init.sql` when its data directory is empty, so it will not apply this migration automatically to an existing named volume.

## Validation and tests

Frontend checks:

```bash
cd frontend
npm ci
npm run build
npm run lint
npm audit --omit=dev --audit-level=high
```

Backend integration tests use an in-memory H2 database and a mocked MinIO client:

```bash
cd backend
mvn test
```

The current environment has Node.js/npm but does not include Java, Maven, or Docker. Frontend production build, lint, and production-dependency audit have been run successfully; backend tests and a full Compose startup therefore still need to be run in an environment with those tools installed.
