// Seasonal Effect

// 元は initSeasonalEffect() のクロージャ内に閉じていた状態を、
// 外部（secretSeason.js の隠しコマンド）から季節を切り替えられるよう
// モジュールスコープへ引き上げている。
let seasonalCtx = null;
let seasonalCanvasEl = null;
let seasonalParticles = [];
let seasonalAnimationFrame = null;
let currentSeason = null;

/**
 * カレンダー（現在の月）から季節を判定する。
 * ページ読み込み時のデフォルト値として使用する。
 */
function getSeasonByCalendar() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function createSeasonalParticle(season) {
  const canvas = seasonalCanvasEl;
  const particle = {
    x: Math.random() * canvas.width,
    // ホタルは「上空から降ってくる」ものではなく、その場でふわふわ漂う虫のため、
    // 最初から画面内に出現させる（他の季節は従来通り画面上端の外側から降らせる）。
    y: season === 'summer' ? Math.random() * canvas.height : Math.random() * -canvas.height,
    vx: 0,
    vy: 0,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 2,
    size: 0,
    opacity: 0.3 + Math.random() * 0.3,
    flicker: Math.random() * Math.PI * 2
  };

  switch (season) {
    case 'spring':
      // 雪と比べて明らかに速すぎたため、やや落ち着いた速度に調整
      particle.vx = (Math.random() - 0.5) * 1.1;
      particle.vy = 0.4 + Math.random() * 0.4;
      particle.size = 8 + Math.random() * 6;
      break;
    case 'summer':
      // 出現直後から視認できるよう画面内スポーンにあわせ、動きも少し活発に
      particle.vx = (Math.random() - 0.5) * 1.0;
      particle.vy = (Math.random() - 0.5) * 1.0;
      particle.size = 3 + Math.random() * 2;
      particle.opacity = 0.5;
      break;
    case 'autumn':
      // 目立ちすぎていたため、サイズと不透明度を少し抑える
      particle.vx = (Math.random() - 0.5) * 1;
      particle.vy = 0.8 + Math.random() * 0.7;
      particle.size = 8 + Math.random() * 5;
      particle.opacity = 0.25 + Math.random() * 0.25;
      break;
    case 'winter':
      particle.vx = (Math.random() - 0.5) * 0.5;
      particle.vy = 0.3 + Math.random() * 0.4;
      particle.size = 3 + Math.random() * 4;
      particle.rotationSpeed = 0;
      break;
  }

  return particle;
}

function drawSeasonalParticle(particle, season) {
  const ctx = seasonalCtx;
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate((particle.rotation * Math.PI) / 180);

  switch (season) {
    case 'spring':
      // 桜の花びら（ハート型に近い形状）
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#FFB7C5';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-particle.size/2, -particle.size/2, -particle.size, particle.size/3, 0, particle.size);
      ctx.bezierCurveTo(particle.size, particle.size/3, particle.size/2, -particle.size/2, 0, 0);
      ctx.fill();
      break;

    case 'summer': {
      // 蛍（光の玉）
      const glow = Math.sin(particle.flicker) * 0.5 + 0.5;
      ctx.globalAlpha = particle.opacity * glow;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 4);
      gradient.addColorStop(0, 'rgba(200, 255, 100, 0.8)');
      gradient.addColorStop(0.4, 'rgba(150, 255, 50, 0.2)');
      gradient.addColorStop(1, 'rgba(100, 255, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#DFFF88';
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'autumn': {
      // 楓(もみじ)を模した5裂の葉っぱ型。
      // 上端が主葉先、左右に大小2つずつの葉先を持ち、間に切れ込みが入る輪郭を
      // quadraticCurveToで連続して描き、最後に葉脈を重ねる。
      ctx.globalAlpha = particle.opacity;
      const colors = ['#D2691E', '#FF8C00', '#CD853F', '#8B4513'];
      const color = colors[Math.floor(particle.x % colors.length)];
      ctx.fillStyle = color;

      const s = particle.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.1); // 主葉先（頂点）
      ctx.quadraticCurveTo(s * 0.15, -s * 0.55, s * 0.65, -s * 0.75); // 右上の切れ込み
      ctx.quadraticCurveTo(s * 0.35, -s * 0.35, s * 0.95, -s * 0.15); // 右側の葉先
      ctx.quadraticCurveTo(s * 0.5, -s * 0.05, s * 0.55, s * 0.35);   // 右側の切れ込み
      ctx.quadraticCurveTo(s * 0.3, s * 0.25, s * 0.15, s * 0.75);    // 右下の葉先
      ctx.quadraticCurveTo(s * 0.05, s * 0.5, 0, s * 0.9);            // 葉柄の付け根へ
      ctx.quadraticCurveTo(-s * 0.05, s * 0.5, -s * 0.15, s * 0.75);  // 左側は右側の鏡像
      ctx.quadraticCurveTo(-s * 0.3, s * 0.25, -s * 0.55, s * 0.35);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.05, -s * 0.95, -s * 0.15);
      ctx.quadraticCurveTo(-s * 0.35, -s * 0.35, -s * 0.65, -s * 0.75);
      ctx.quadraticCurveTo(-s * 0.15, -s * 0.55, 0, -s * 1.1);
      ctx.closePath();
      ctx.fill();

      // 葉脈（中心の主脈＋左右の側脈）
      ctx.strokeStyle = 'rgba(90, 45, 10, 0.55)';
      ctx.lineWidth = Math.max(0.5, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.lineTo(0, -s * 0.95);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.55, -s * 0.45);
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.55, -s * 0.45);
      ctx.stroke();
      break;
    }

    case 'winter':
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * particle.size, Math.sin(angle) * particle.size);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

function animateSeasonalEffect() {
  const canvas = seasonalCanvasEl;
  const ctx = seasonalCtx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  seasonalParticles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.rotationSpeed;

    if (currentSeason === 'summer') {
      particle.flicker += 0.1;
    }

    if (currentSeason === 'spring' || currentSeason === 'autumn') {
      particle.x += Math.sin(particle.y * 0.01) * 0.2;
    }

    if (
      particle.y > canvas.height + 50 ||
      particle.x < -50 ||
      particle.x > canvas.width + 50
    ) {
      seasonalParticles[index] = createSeasonalParticle(currentSeason);
    }

    drawSeasonalParticle(particle, currentSeason);
  });

  seasonalAnimationFrame = requestAnimationFrame(animateSeasonalEffect);
}

/**
 * 季節を切り替える（初期化時・隠しコマンドいずれからも呼ばれる共通の入口）。
 * 実行中のアニメーションを一度止め、新しい季節のパーティクルで再構築する。
 */
function setSeason(season) {
  if (!seasonalCanvasEl || !seasonalCtx) return; // 初期化前は何もしない

  currentSeason = season;
  seasonalParticles = [];

  // 季節ごとの出現数。ホタルは少なすぎて寂しかったため増やし、
  // 紅葉は目立ちすぎていたため減らして全体のバランスを取っている。
  const SEASON_PARTICLE_COUNTS = {
    spring: 28,
    summer: 24,
    autumn: 22,
    winter: 30,
  };
  const count = SEASON_PARTICLE_COUNTS[season] ?? 28;
  for (let i = 0; i < count; i++) {
    seasonalParticles.push(createSeasonalParticle(season));
  }

  if (seasonalAnimationFrame) {
    cancelAnimationFrame(seasonalAnimationFrame);
  }
  animateSeasonalEffect();
}

function initSeasonalEffect() {
  seasonalCanvasEl = elements.seasonalCanvas;
  seasonalCtx = seasonalCanvasEl.getContext('2d');

  const resizeCanvas = () => {
    seasonalCanvasEl.width = window.innerWidth;
    seasonalCanvasEl.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  setSeason(getSeasonByCalendar());
}
