import { createMedia, mimeForFilename } from './db';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB before conversion

const RASTER_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);

/**
 * Validates, optimizes and stores an uploaded image as a BLOB in SQLite.
 * Raster images are converted to WebP (max width 1600px); SVG/GIF are stored as-is.
 */
export async function uploadImage(
	file: File,
	alt = ''
): Promise<{ id: number; width: number | null; height: number | null }> {
	if (!file || !file.size) throw new Error('EMPTY_FILE');
	if (file.size > MAX_UPLOAD_BYTES) throw new Error('FILE_TOO_LARGE');

	let mime = (file.type || mimeForFilename(file.name || '')).split(';')[0].trim().toLowerCase();
	if (!mime.startsWith('image/') || mime.includes('script')) throw new Error('NOT_AN_IMAGE');

	const raw = Buffer.from(await file.arrayBuffer());
	let data: Uint8Array = raw;
	let mimeOut = mime;
	let width: number | null = null;
	let height: number | null = null;

	if (RASTER_MIMES.has(mime)) {
		try {
			const { default: sharp } = await import('sharp');
			const converted = await sharp(raw)
				.rotate()
				.resize({ width: 1600, withoutEnlargement: true })
				.webp({ quality: 82 })
				.toBuffer();
			const metadata = await sharp(converted).metadata();
			data = new Uint8Array(converted);
			mimeOut = 'image/webp';
			width = metadata.width ?? null;
			height = metadata.height ?? null;
		} catch (err) {
			// Conversion is best-effort; keep the original bytes as a fallback.
			console.error('Image conversion failed, storing original bytes:', err);
		}
	}

	const media = createMedia({
		filename: sanitizeFilename(file.name || 'upload'),
		mime: mimeOut,
		data,
		alt,
		width,
		height
	});

	return { id: media.id, width: media.width, height: media.height };
}

export function isUploadImageError(err: unknown): string {
	const code = err instanceof Error ? err.message : '';
	switch (code) {
		case 'EMPTY_FILE':
			return 'No file was provided.';
		case 'FILE_TOO_LARGE':
			return 'File too large (max 8 MB).';
		case 'NOT_AN_IMAGE':
			return 'Please upload an image file.';
		default:
			console.error('Image processing failed:', err);
			return 'Could not process the uploaded image.';
	}
}

function sanitizeFilename(name: string): string {
	const base = name.split(/[/\\]/).pop() || 'upload';
	return (
		base
			.normalize('NFKD')
			.toLowerCase()
			.replace(/\.[a-z0-9]+$/, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80)
			.trim() || 'upload'
	);
}
