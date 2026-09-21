import { join } from 'path';

/** Carpeta de fotos subidas (backend/uploads), la misma para escribir y para servir. */
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
