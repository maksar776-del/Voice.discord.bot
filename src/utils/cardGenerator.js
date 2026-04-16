'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const path = require('path');

const ASSETS = path.join(__dirname, '../../assets');

const LAYOUT = {
  card:       { w: 1456, h: 816 },
  avatar:     { x: 68, y: 60, w: 415, h: 555, r: 35, bg: '#C8B9F8' },
  username:   { x: 565, y: 168, font: 'bold 68px sans-serif', color: '#FFFFFF', maxW: 820 },
  badge:      { x: 565, y: 192, h: 50, r: 25, padX: 28, text: 'DAY-ONE VOICE', font: 'bold 22px sans-serif', colors: ['#FF6BFF', '#8B5CF6'], textColor: '#FFFFFF' },
  qr:         { x: 543, y: 318, size: 215 },
  memberId:   { value: { x: 822, y: 388, font: 'bold 50px sans-serif', color: '#FFFFFF' }, label: { x: 822, y: 414, font: '600 15px sans-serif', color: 'rgba(255,255,255,0.45)' } },
  date:       { value: { x: 822, y: 508, font: 'bold 50px sans-serif', color: '#FFFFFF' }, label: { x: 822, y: 534, font: '600 15px sans-serif', color: 'rgba(255,255,255,0.45)' } },
  logoBox:    { x: 65, y: 648, w: 430, h: 108, r: 22, bg: 'rgba(18,10,30,0.75)', border: 'rgba(255,255,255,0.12)' },
  logo:       { x: 94, y: 662, size: 80 },
  voiceLabel: { x: 194, y: 716, font: 'bold 46px sans-serif', color: '#FFFFFF' },
  finePrint:  { x: 556, y: 666, lh: 26, font: '12px sans-serif', color: 'rgba(255,255,255,0.32)', lines: [
    'THIS DOCUMENT CERTIFIES THAT THE HOLDER IS A VERIFIED MEMBER OF THE VOICE',
    'COMMUNITY. ISSUED BY VOICE.FUN PLATFORM. THIS CARD IS NON-TRANSFERABLE AND',
    'REMAINS THE PROPERTY OF VOICE. UNAUTHORIZED REPRODUCTION IS PROHIBITED.',
  ]},
};

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
  return Buffer.from(res.data);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function tryLoadLocal(file) {
  try { return await loadImage(path.join(ASSETS, file)); } catch { return null; }
}

async function generateMemberCard({ username, avatarUrl, memberId, dateStr }) {
  const { card, avatar, badge, username: un, qr, memberId: mid, date, logoBox, logo, voiceLabel, finePrint } = LAYOUT;
  const canvas = createCanvas(card.w, card.h);
  const ctx = canvas.getContext('2d');

  // 1. Фон
  const frameImg = await tryLoadLocal('frame.jpeg');
  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, card.w, card.h);
  } else {
    const bg = ctx.createRadialGradient(card.w * 0.75, card.h * 0.4, 0, card.w * 0.75, card.h * 0.4, card.w * 0.65);
    bg.addColorStop(0, '#5B0DAC'); bg.addColorStop(0.45, '#2D0060'); bg.addColorStop(1, '#0B0B12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, card.w, card.h);
  }

  // 2. Аватар
  ctx.save();
  roundRect(ctx, avatar.x, avatar.y, avatar.w, avatar.h, avatar.r);
  ctx.fillStyle = avatar.bg; ctx.fill(); ctx.clip();
  try {
    const img = await loadImage(await fetchBuffer(avatarUrl));
    const scale = Math.max(avatar.w / img.width, avatar.h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, avatar.x + (avatar.w - sw) / 2, avatar.y + (avatar.h - sh) / 2, sw, sh);
  } catch {}
  ctx.restore();

  // 3. Username
  ctx.font = un.font; ctx.fillStyle = un.color; ctx.textBaseline = 'alphabetic';
  ctx.fillText('@' + username, un.x, un.y, un.maxW);

  // 4. Бейдж
  ctx.font = badge.font;
  const badgeW = ctx.measureText(badge.text).width + badge.padX * 2;
  const badgeGrad = ctx.createLinearGradient(badge.x, 0, badge.x + badgeW, 0);
  badgeGrad.addColorStop(0, badge.colors[0]); badgeGrad.addColorStop(1, badge.colors[1]);
  ctx.save(); roundRect(ctx, badge.x, badge.y, badgeW, badge.h, badge.r); ctx.fillStyle = badgeGrad; ctx.fill(); ctx.restore();
  ctx.font = badge.font; ctx.fillStyle = badge.textColor; ctx.textBaseline = 'middle';
  ctx.fillText(badge.text, badge.x + badge.padX, badge.y + badge.h / 2);
  ctx.textBaseline = 'alphabetic';

  // 5. QR
  const qrImg = await tryLoadLocal('qrcode.jpeg');
  if (qrImg) { ctx.save(); roundRect(ctx, qr.x, qr.y, qr.size, qr.size, 8); ctx.clip(); ctx.drawImage(qrImg, qr.x, qr.y, qr.size, qr.size); ctx.restore(); }

  // 6. Member ID
  ctx.font = mid.value.font; ctx.fillStyle = mid.value.color; ctx.textBaseline = 'alphabetic';
  ctx.fillText(memberId, mid.value.x, mid.value.y);
  ctx.font = mid.label.font; ctx.fillStyle = mid.label.color;
  ctx.fillText('MEMBER ID', mid.label.x, mid.label.y);

  // 7. Дата
  ctx.font = date.value.font; ctx.fillStyle = date.value.color;
  ctx.fillText(dateStr, date.value.x, date.value.y);
  ctx.font = date.label.font; ctx.fillStyle = date.label.color;
  ctx.fillText('EARLY SINCE', date.label.x, date.label.y);

  // 8. Лого
  ctx.save(); roundRect(ctx, logoBox.x, logoBox.y, logoBox.w, logoBox.h, logoBox.r);
  ctx.fillStyle = logoBox.bg; ctx.fill(); ctx.strokeStyle = logoBox.border; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  const logoImg = await tryLoadLocal('logo.jpeg');
  if (logoImg) ctx.drawImage(logoImg, logo.x, logo.y, logo.size, logo.size);
  ctx.font = voiceLabel.font; ctx.fillStyle = voiceLabel.color; ctx.textBaseline = 'middle';
  ctx.fillText('VOICE', voiceLabel.x, voiceLabel.y); ctx.textBaseline = 'alphabetic';

  // 9. Мелкий текст
  ctx.font = finePrint.font; ctx.fillStyle = finePrint.color; ctx.textBaseline = 'alphabetic';
  finePrint.lines.forEach((line, i) => ctx.fillText(line, finePrint.x, finePrint.y + i * finePrint.lh));

  return canvas.toBuffer('image/png');
}

function generateMemberId() {
  return `VCE-${Math.floor(100000 + Math.random() * 900000)}`;
}

function formatDate(d) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

module.exports = { generateMemberCard, generateMemberId, formatDate };
