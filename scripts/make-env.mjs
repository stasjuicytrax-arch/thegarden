// Готовит equirect 2048×1024 из фото студии: размытая растяжка + заливка peony по полюсам (TZ §6.1).
import sharp from 'sharp';
const jobs = [
  ['assets/old-site/04-studio-pushkin/02__DSF6680.jpeg', 'public/env/pushkin.jpg'],
  ['assets/old-site/05-studio-frunzenskaya/03__DSF3816.jpeg', 'public/env/frunzenskaya.jpg'],
];
const W = 2048, H = 1024;
const poles = Buffer.from(
  `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#D9BCE3"/><stop offset="0.28" stop-color="#D9BCE3" stop-opacity="0"/>
  <stop offset="0.72" stop-color="#D9BCE3" stop-opacity="0"/><stop offset="1" stop-color="#D9BCE3"/>
  </linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
for (const [src, out] of jobs) {
  await sharp(src).resize(W, H, { fit: 'cover' }).blur(6).modulate({ brightness: 1.05 })
    .composite([{ input: poles }]).jpeg({ quality: 82 }).toFile(out);
  console.log(out);
}
