// Seasonal Effect
function initSeasonalEffect() {
  const canvas = elements.seasonalCanvas;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationFrame;

  const getSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  };

  const season = getSeason();

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const createParticle = () => {
    const particle = {
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
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
        particle.vx = (Math.random() - 0.5) * 1.5;
        particle.vy = 0.5 + Math.random() * 0.5;
        particle.size = 8 + Math.random() * 6;
        break;
      case 'summer':
        particle.vx = (Math.random() - 0.5) * 0.8;
        particle.vy = (Math.random() - 0.5) * 0.8;
        particle.size = 3 + Math.random() * 2;
        particle.opacity = 0.5;
        break;
      case 'autumn':
        particle.vx = (Math.random() - 0.5) * 1;
        particle.vy = 0.8 + Math.random() * 0.7;
        particle.size = 10 + Math.random() * 8;
        break;
      case 'winter':
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = 0.3 + Math.random() * 0.4;
        particle.size = 3 + Math.random() * 4;
        particle.rotationSpeed = 0;
        break;
    }

    return particle;
  };

  const drawParticle = (particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);

    switch (season) {
      case 'spring':
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FFB7C5';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * particle.size;
          const y = Math.sin(angle) * particle.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'summer':
        const glow = Math.sin(particle.flicker) * 0.5 + 0.5;
        ctx.globalAlpha = particle.opacity * glow;
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 3);
        gradient.addColorStop(0, 'rgba(255, 255, 150, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 100, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-particle.size * 3, -particle.size * 3, particle.size * 6, particle.size * 6);
        
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FFFF88';
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'autumn':
        ctx.globalAlpha = particle.opacity;
        const colors = ['#D2691E', '#FF8C00', '#CD853F', '#8B4513'];
        ctx.fillStyle = colors[Math.floor(particle.x % colors.length)];
        
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 0.6, particle.size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(0, particle.size);
        ctx.stroke();
        break;

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
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      if (season === 'summer') {
        particle.flicker += 0.1;
      }

      if (season === 'spring' || season === 'autumn') {
        particle.x += Math.sin(particle.y * 0.01) * 0.2;
      }

      if (
        particle.y > canvas.height + 50 ||
        particle.x < -50 ||
        particle.x > canvas.width + 50
      ) {
        particles[index] = createParticle();
      }

      drawParticle(particle);
    });

    animationFrame = requestAnimationFrame(animate);
  };

  const count = season === 'summer' ? 15 : 30;
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }

  animate();
}
