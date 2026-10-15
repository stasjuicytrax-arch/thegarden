// OG-картинка 1200×630 из фото фасада (assets/old-site/01-hero) → public/og.jpg
import sharp from 'sharp';
await sharp('assets/old-site/01-hero/01_Trl5C2PuxsC7njqGkTcN.jpg')
  .resize(1200, 630, { fit: 'cover', position: 'attention' })
  .modulate({ brightness: 1.03 })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/og.jpg');
console.log('public/og.jpg');
