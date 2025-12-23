/**
 * OBS Overlay Timer Client
 */

(function() {
  const timerElement = document.getElementById('timer');
  const errorElement = document.getElementById('error');

  const room = getRoom();

  if (!room) {
    errorElement.textContent = 'Missing room parameter';
    errorElement.classList.add('show');
    timerElement.style.display = 'none';
    return;
  }

  let currentEndBehavior = 'stop';
  let timerHidden = false;
  let confettiFired = false;

  // Explode characters into particles
  function explodeCharacters() {
    const text = timerElement.textContent;
    const rect = timerElement.getBoundingClientRect();
    const style = window.getComputedStyle(timerElement);

    // Get center point for implosion effect
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create a temporary span to measure each character
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText = `
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      visibility: hidden;
      position: absolute;
    `;
    document.body.appendChild(measureSpan);

    // Calculate character positions
    let currentX = rect.left;
    const chars = text.split('');
    const particles = [];

    chars.forEach((char, index) => {
      measureSpan.textContent = char;
      const charWidth = measureSpan.getBoundingClientRect().width;

      // Create particle for this character
      const particle = document.createElement('span');
      particle.className = 'char-particle';
      particle.textContent = char;
      particle.style.cssText = `
        left: ${currentX}px;
        top: ${rect.top}px;
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        color: ${style.color};
        text-shadow: ${style.textShadow};
        -webkit-text-stroke: ${style.webkitTextStroke || 'none'};
      `;

      document.body.appendChild(particle);

      // Calculate direction from center (implosion then explosion)
      const charCenterX = currentX + charWidth / 2;
      const charCenterY = rect.top + rect.height / 2;
      const angle = Math.atan2(charCenterY - centerY, charCenterX - centerX);

      // Random variations
      const distance = 200 + Math.random() * 300;
      const rotation = (Math.random() - 0.5) * 720;
      const delay = index * 30;

      particles.push({
        element: particle,
        targetX: Math.cos(angle) * distance,
        targetY: Math.sin(angle) * distance - 100, // Bias upward
        rotation,
        delay
      });

      currentX += charWidth;
    });

    measureSpan.remove();

    // Hide original timer
    timerElement.style.visibility = 'hidden';

    // Animate particles
    particles.forEach(({ element, targetX, targetY, rotation, delay }) => {
      // First: quick pull toward center (implosion)
      setTimeout(() => {
        element.style.transition = 'transform 0.15s ease-in';
        element.style.transform = `translate(${-targetX * 0.1}px, ${-targetY * 0.1}px) scale(1.1)`;

        // Then: explode outward
        setTimeout(() => {
          element.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease-out';
          element.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rotation}deg) scale(0.3)`;
          element.style.opacity = '0';

          // Remove after animation
          setTimeout(() => {
            element.remove();
          }, 600);
        }, 150);
      }, delay);
    });
  }

  // Confetti celebration function
  function fireConfetti() {
    if (typeof confetti === 'undefined') return;

    const rect = timerElement.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Explode the characters into particles
    explodeCharacters();

    // Modern color palette
    const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4'];

    // Delay confetti slightly to sync with character explosion
    setTimeout(() => {
      // Initial big burst from where the timer was
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x, y },
        colors: colors,
        ticks: 300,
        gravity: 0.8,
        scalar: 1.2,
        shapes: ['circle', 'square'],
        drift: 0
      });

      // Delayed secondary burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 120,
          origin: { x, y: y - 0.1 },
          colors: colors,
          ticks: 250,
          gravity: 1,
          scalar: 0.9,
          shapes: ['circle']
        });
      }, 150);

      // Side cannons
      setTimeout(() => {
        // Left cannon
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
          ticks: 300,
          gravity: 0.7,
          scalar: 1.1,
          drift: 1,
          shapes: ['circle', 'square']
        });
        // Right cannon
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
          ticks: 300,
          gravity: 0.7,
          scalar: 1.1,
          drift: -1,
          shapes: ['circle', 'square']
        });
      }, 300);

      // Second wave of cannons
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 55,
          spread: 40,
          origin: { x: 0, y: 0.8 },
          colors: colors,
          ticks: 280,
          gravity: 0.8,
          scalar: 0.9,
          drift: 0.8,
          shapes: ['circle']
        });
        confetti({
          particleCount: 60,
          angle: 125,
          spread: 40,
          origin: { x: 1, y: 0.8 },
          colors: colors,
          ticks: 280,
          gravity: 0.8,
          scalar: 0.9,
          drift: -0.8,
          shapes: ['circle']
        });
      }, 500);

      // Floating particles for 2 seconds
      const duration = 2000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 40,
          origin: { x: 0, y: 0.8 },
          colors: colors,
          ticks: 200,
          gravity: 0.6,
          scalar: 0.8,
          drift: 0.5,
          shapes: ['circle']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 40,
          origin: { x: 1, y: 0.8 },
          colors: colors,
          ticks: 200,
          gravity: 0.6,
          scalar: 0.8,
          drift: -0.5,
          shapes: ['circle']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }, 200); // Delay to sync with implosion
  }

  const connection = createTimerConnection(room, {
    onConnect: () => {
      console.log('Connected to server');
      errorElement.classList.remove('show');
      timerElement.style.display = 'block';
    },

    onState: (state) => {
      applyTimerStyles(timerElement, state);
      currentEndBehavior = state.end_behavior;

      // Check if timer should be hidden
      if (state.end_behavior === 'hide' &&
          state.mode === 'countdown' &&
          !state.is_running &&
          state.remaining_ms <= 0) {
        timerElement.classList.add('hidden');
        timerHidden = true;
      } else {
        timerElement.classList.remove('hidden');
        timerHidden = false;
      }
    },

    onSync: (state) => {
      currentEndBehavior = state.end_behavior;

      // Show timer again if it was reset
      if (state.remaining_ms > 0 || state.mode === 'countup') {
        timerElement.classList.remove('hidden');
        timerElement.style.visibility = 'visible';
        timerHidden = false;
        confettiFired = false; // Reset confetti flag when timer is reset
      }
    },

    onConfigUpdate: (state) => {
      applyTimerStyles(timerElement, state);
      currentEndBehavior = state.end_behavior;
      console.log('Config updated, end_behavior:', currentEndBehavior);
    },

    onTimerEnd: (data) => {
      if (data.behavior === 'hide') {
        timerElement.classList.add('hidden');
        timerHidden = true;
      }
      // Note: confetti is handled in the render loop to ensure proper timing
    },

    onDisconnect: () => {
      console.log('Disconnected from server');
    },

    onError: (error) => {
      console.error('Error:', error);
      errorElement.textContent = error.message || 'Connection error';
      errorElement.classList.add('show');
    }
  });

  // Start the render loop
  let lastTime = null;

  connection.startRenderLoop((currentTime, state) => {
    if (!state || timerHidden) return;

    // For countdown at zero with 'stop' or 'confetti' behavior, clamp to 0
    let displayTime = currentTime;
    if (state.mode === 'countdown' && (currentEndBehavior === 'stop' || currentEndBehavior === 'confetti') && currentTime <= 0) {
      displayTime = 0;

      // Fire confetti when timer crosses zero (only once)
      if (currentEndBehavior === 'confetti' && !confettiFired) {
        confettiFired = true;
        fireConfetti();
      }
    }

    // Reset confetti flag when timer goes back above zero
    if (currentTime > 1000 && confettiFired) {
      confettiFired = false;
    }

    const formatted = formatTime(displayTime, state.format);
    timerElement.textContent = formatted;
    lastTime = currentTime;
  });
})();
