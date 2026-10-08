(() => {
  const storage = {
    volume: 'exatas-play-volume',
    voiceGuide: 'genios-voice-guide',
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupAvatarPicker();
    highlightCurrentPage();
    setupControlDock();
    renderUserChip();
  });

  function renderUserChip() {
    const chip = document.getElementById('userChip');
    if (!chip || !window.PerfilSession) return;

    const perfil = window.PerfilSession.getPerfilAtivo();
    if (!perfil) {
      window.location.href = 'index.html';
      return;
    }

    chip.innerHTML = `<span class="user-chip__avatar">${perfil.avatar}</span> ${perfil.nome}`;
    chip.title = 'Trocar perfil';
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => {
      window.PerfilSession.trocarPerfil();
      window.location.href = 'index.html';
    });
  }

  function setupAvatarPicker() {
    document.querySelectorAll('.avatar-picker .avatar-option').forEach((option) => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.avatar-picker .avatar-option').forEach((el) => el.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  }

  function highlightCurrentPage() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach((link) => {
      if (link.getAttribute('href') === current) {
        link.classList.add('active');
      }
    });
  }

  function setupControlDock() {
    const controls = document.createElement('aside');
    controls.className = 'app-controls';
    controls.setAttribute('aria-label', 'Música e acessibilidade');

    controls.innerHTML = `
      <button type="button" class="control-btn control-btn--voice" aria-label="Ativar leitura por voz" aria-pressed="false" title="Ativar leitura por voz">
        <span aria-hidden="true">&#128483;</span>
      </button>
      <div class="sound-control">
        <button type="button" class="control-btn control-btn--sound" aria-label="Ligar música" aria-pressed="false" title="Ligar música">
          <span aria-hidden="true">&#9835;</span>
        </button>
        <label class="volume-control" title="Volume da música">
          <span class="volume-icon" aria-hidden="true">&#128266;</span>
          <input class="volume-slider" type="range" min="0" max="100" step="1" aria-label="Volume da música" />
          <output class="volume-value" aria-hidden="true"></output>
        </label>
      </div>
    `;

    document.body.appendChild(controls);

    const voiceButton = controls.querySelector('.control-btn--voice');
    const soundButton = controls.querySelector('.control-btn--sound');
    const volumeSlider = controls.querySelector('.volume-slider');
    const volumeValue = controls.querySelector('.volume-value');
    const music = createMusicController(soundButton);
    const storedVolume = localStorage.getItem(storage.volume);
    const savedVolume = storedVolume === null ? 36 : Number(storedVolume);
    const initialVolume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(100, savedVolume)) : 36;

    volumeSlider.value = initialVolume;
    volumeSlider.style.setProperty('--volume-progress', `${initialVolume}%`);
    volumeValue.value = `${initialVolume}%`;
    music.setVolume(initialVolume / 100);
    setupVoiceGuide(voiceButton);

    soundButton.addEventListener('click', () => {
      if (music.isPlaying()) {
        music.stop();
      } else {
        if (Number(volumeSlider.value) === 0) {
          volumeSlider.value = '36';
          volumeSlider.style.setProperty('--volume-progress', '36%');
          volumeValue.value = '36%';
          localStorage.setItem(storage.volume, '36');
          music.setVolume(0.36);
        }
        music.start();
      }
    });

    volumeSlider.addEventListener('input', () => {
      const volume = Number(volumeSlider.value);
      localStorage.setItem(storage.volume, String(volume));
      volumeSlider.style.setProperty('--volume-progress', `${volume}%`);
      volumeValue.value = `${volume}%`;
      music.setVolume(volume / 100);

      if (volume === 0) {
        music.stop();
      }
    });
  }

  function setupVoiceGuide(button) {
    const synthesis = window.speechSynthesis;
    const supported = synthesis && typeof window.SpeechSynthesisUtterance === 'function';
    let enabled = localStorage.getItem(storage.voiceGuide) === 'true';
    let previousText = '';
    let previousTime = 0;
    const targetSelector = [
      'button', 'a', 'input', 'select', '[role="button"]',
      '.tile', '.field', '.avatar-option', '.shop-item', '.shop-tab',
      '.option-btn', '.question-card__prompt', '.question-example',
      '.game-companion__avatar', '.game-companion__bubble',
    ].join(',');

    if (!supported) {
      button.disabled = true;
      button.title = 'Leitura por voz indisponível neste navegador';
      button.setAttribute('aria-label', 'Leitura por voz indisponível neste navegador');
      return;
    }

    function updateButton() {
      button.classList.toggle('is-enabled', enabled);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? 'Desativar leitura por voz' : 'Ativar leitura por voz');
      button.title = enabled ? 'Desativar leitura por voz' : 'Ativar leitura por voz';
    }

    function speak(text, force = false) {
      const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
      if (!enabled || !cleanText) return;
      const now = Date.now();
      if (!force && cleanText === previousText && now - previousTime < 1800) return;
      previousText = cleanText;
      previousTime = now;
      synthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.96;
      utterance.pitch = 1.04;
      const portugueseVoice = synthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('pt'));
      if (portugueseVoice) utterance.voice = portugueseVoice;
      synthesis.speak(utterance);
    }

    function describe(target) {
      if (target.matches('.avatar-option')) {
        const emoji = target.querySelector('.avatar-option__emoji')?.textContent.trim();
        const names = { '🦊': 'raposa', '🐱': 'gatinho', '🦉': 'coruja', '🦕': 'dinossauro', '🦄': 'unicórnio', '🤖': 'robô' };
        return `Avatar ${names[emoji] || ''}. Toque para escolher.`;
      }

      const field = target.matches('.field') ? target : target.closest('.field');
      const label = field?.querySelector('label')?.textContent.trim();
      if (target.matches('input[type="password"]')) {
        return `${label || 'Campo secreto'}. Digite sem se preocupar: não vou ler os números que você escreveu.`;
      }
      if (target.matches('input, select')) {
        return label ? `${label}. Campo para preencher.` : target.getAttribute('aria-label');
      }
      if (target.matches('.tile, .shop-item')) {
        const title = target.querySelector('h2, h3, strong')?.textContent.trim();
        const description = target.querySelector('p')?.textContent.trim();
        return [title, description].filter(Boolean).join('. ');
      }
      if (target.matches('.question-card__prompt, .question-example, .game-companion__bubble')) {
        return target.textContent.trim();
      }
      if (target.matches('.field')) return label;

      const accessibleName = target.getAttribute('aria-label') || target.title;
      const visibleText = target.innerText || target.textContent;
      const type = target.matches('button, [role="button"]') ? 'Botão' : target.matches('a') ? 'Link' : '';
      return [type, accessibleName || visibleText].filter(Boolean).join(': ').trim();
    }

    function handleTarget(event) {
      const target = event.target.closest(targetSelector);
      if (!target || target.closest('.app-controls') || target.contains(event.relatedTarget)) return;
      speak(describe(target));
    }

    button.addEventListener('click', () => {
      enabled = !enabled;
      localStorage.setItem(storage.voiceGuide, String(enabled));
      updateButton();
      if (enabled) {
        speak('Leitura por voz ativada. Passe o mouse ou use Tab para ouvir instruções.', true);
      } else {
        synthesis.cancel();
      }
    });

    document.addEventListener('pointerover', handleTarget);
    document.addEventListener('focusin', handleTarget);
    updateButton();
  }

  function createMusicController(button) {
    let audioContext;
    let masterGain;
    let timer;
    let step = 0;
    let playing = false;
    let volume = 0.36;
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    const bass = [261.63, 329.63, 392, 329.63];

    function ensureAudio() {
      if (audioContext) return true;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        button.disabled = true;
        button.title = 'Som indisponivel neste navegador';
        return false;
      }

      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContext.destination);
      return true;
    }

    function playNote(frequency, duration, type, gainValue) {
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.04);
    }

    function tick() {
      if (!playing) return;

      playNote(melody[step % melody.length], 0.32, 'triangle', 0.18);

      if (step % 2 === 0) {
        playNote(bass[(step / 2) % bass.length], 0.46, 'sine', 0.08);
      }

      step += 1;
      timer = window.setTimeout(tick, 380);
    }

    function setButtonState() {
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Pausar música' : 'Ligar música');
      button.title = playing ? 'Pausar música' : 'Ligar música';
    }

    return {
      start() {
        if (volume <= 0 || !ensureAudio()) return;

        audioContext.resume();
        playing = true;
        window.clearTimeout(timer);
        tick();
        setButtonState();
      },
      stop() {
        playing = false;
        window.clearTimeout(timer);
        setButtonState();
      },
      setVolume(nextVolume) {
        volume = Math.max(0, Math.min(1, nextVolume));
        if (masterGain) {
          masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.03);
        }
      },
      isPlaying() {
        return playing;
      },
    };
  }
})();
