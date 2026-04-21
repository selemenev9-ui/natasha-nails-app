import https from 'node:https';
import { createWriteStream, existsSync, mkdirSync, unlink, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const query = 'auto=format&fit=crop&w=600&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8';
const PLACEHOLDER_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTEhIVFRUVFRUVFRcVFRUVFRUXFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAMgAyAMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAAEBQIDBgABB//EAD8QAAEDAgQDBQYGAgICAgMAAAEAAgMEEQUSIQYiMUEHEyJRYXGBkaEzQlKxwdHwFSOCksLh8TRDU2KCoiT/xAAZAQEAAwEBAAAAAAAAAAAAAAAAAQIDBAX/xAAnEQEAAgEEAgICAgMAAAAAAAAAAQIDESExBBJBEyJRcRQyYf/aAAwDAQACEQMRAD8A9oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//2Q=='
    .replace(/\s+/g, '');

const targets = [
  { filename: 'nails-chrome.jpg', url: `https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?${query}`, fallbackQuery: 'chrome nails' },
  { filename: 'nails-mirror.jpg', url: `https://images.unsplash.com/photo-1522337660859-02fbefca4702?${query}`, fallbackQuery: 'mirror manicure' },
  { filename: 'nails-obsidian.jpg', url: `https://images.unsplash.com/photo-1604654894610-df63bc536371?${query}`, fallbackQuery: 'black nails luxury' },
  { filename: 'solarium-pulse.jpg', url: `https://images.unsplash.com/photo-1555820598-c8008ce11a59?${query}`, fallbackQuery: 'luxury tanning bed' },
  { filename: 'solarium-nordic.jpg', url: `https://images.unsplash.com/photo-1540555700478-4be289fbecef?${query}`, fallbackQuery: 'nordic interior light' },
  { filename: 'solarium-mist.jpg', url: `https://images.unsplash.com/photo-1616394584738-fc6e612e71c9?${query}`, fallbackQuery: 'spa mist' },
  { filename: 'extra-spa.jpg', url: `https://images.unsplash.com/photo-1544161515-4ab6ce6db874?${query}`, fallbackQuery: 'hand spa' },
  { filename: 'extra-detox.jpg', url: `https://images.unsplash.com/photo-1556228578-0d85b1a4d571?${query}`, fallbackQuery: 'luxury scrub' },
  { filename: 'extra-kit.jpg', url: `https://images.unsplash.com/photo-1596462502278-27bf84033054?${query}`, fallbackQuery: 'spa kit flatlay' }
];

const outputDir = path.resolve(__dirname, '..', 'public', 'portfolio');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

function downloadUrlToFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(outputDir, filename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        // ignore
      }
    }
    const fileStream = createWriteStream(filePath);

    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'NatashaNailsAssetFetcher/1.0 (+https://vk.com/natasha_premium_lab)',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Version': 'v1',
            Referer: 'https://unsplash.com/'
          }
        },
        (response) => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
            response.resume();
            return;
          }

          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => resolve(filePath));
          });
        }
      )
      .on('error', (error) => {
        unlink(filePath, () => reject(error));
      });
  });
}

function getFallbackUrl(queryString) {
  return `https://source.unsplash.com/1200x1600/?${encodeURIComponent(queryString)}`;
}

function writePlaceholder(filename) {
  const filePath = path.join(outputDir, filename);
  const buffer = Buffer.from(PLACEHOLDER_JPEG_BASE64, 'base64');
  createWriteStream(filePath).end(buffer);
}

async function run() {
  try {
    for (const target of targets) {
      process.stdout.write(`Downloading ${target.filename}...`);
      try {
        await downloadUrlToFile(target.url, target.filename);
        process.stdout.write('done\n');
      } catch (error) {
        process.stdout.write(`failed (${error.message})`);
        if (target.fallbackQuery) {
          const fallbackUrl = getFallbackUrl(target.fallbackQuery);
          process.stdout.write(` -> retrying fallback...`);
          try {
            await downloadUrlToFile(fallbackUrl, target.filename);
            process.stdout.write('fallback success\n');
          } catch (fallbackError) {
            process.stdout.write(`fallback failed (${fallbackError.message}) -> writing placeholder\n`);
            writePlaceholder(target.filename);
          }
        } else {
          process.stdout.write(' -> writing placeholder\n');
          writePlaceholder(target.filename);
        }
      }
    }
    console.log('All portfolio assets downloaded.');
  } catch (error) {
    console.error('Asset download failed:', error.message);
    process.exitCode = 1;
  }
}

run();
