// 원본 사진(저장소 제외)에서 웹용 파생본을 만든다. sharp는 기본으로 EXIF/GPS를 버린다.
// 좌표는 자동 회전 뒤 4032x3024 기준. 실행: node scripts/prepare-images.mjs
import sharp from 'sharp';

const S = 4032 / 1500; // 좌표는 1500px 미리보기 기준으로 잡았다
const jobs = [
  { out: 'back', src: 'IMG_5423.JPG', turn: 180, box: [5, 265, 1455, 730], width: 2000 },
  { out: 'front', src: 'IMG_5421.JPG', turn: 270, box: [270, 5, 740, 1435], width: 1100 },
  { out: 'ports', src: 'IMG_5422.JPG', turn: 90, box: [330, 615, 670, 290], width: 1400 },
  { out: 'switch', src: 'IMG_5424.JPG', box: [250, 400, 1100, 300], width: 1400 },
  { out: 'manual-flash', src: 'IMG_5419.JPG', box: [135, 170, 570, 450], width: 1200 },
];

for (const j of jobs) {
  const upright = await sharp(j.src).rotate().toBuffer();
  const turned = j.turn ? await sharp(upright).rotate(j.turn).toBuffer() : upright;
  const [left, top, width, height] = j.box.map((v) => Math.round(v * S));
  const info = await sharp(turned)
    .extract({ left, top, width, height })
    .resize({ width: j.width, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(`src/assets/device/${j.out}.jpg`);
  const meta = await sharp(`src/assets/device/${j.out}.jpg`).metadata();
  console.log(j.out, info.width, info.height, Math.round(info.size / 1024) + 'KB', 'exif:', Boolean(meta.exif));
}
