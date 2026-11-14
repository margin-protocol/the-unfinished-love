// 產生社群分享圖：node design-src/make-og.cjs（需要 sharp）
const sharp = require('sharp'); const p = require('path');
(async () => {
  const chairs = await sharp(p.join(__dirname, '../src/assets/img/two-chairs.svg'), { density: 200 }).resize(580).png().toBuffer();
  await sharp(p.join(__dirname, 'og-image.svg')).composite([{ input: chairs, left: 70, top: 180 }])
    .flatten({ background: '#F7F4EE' }).png().toFile(p.join(__dirname, '../src/assets/img/og-image.png'));
  console.log('ok');
})();
