(() => {
  const root = document.documentElement;
  const storage = {
    theme: 'exatas-play-theme',
    volume: 'exatas-play-volume',
  };
  const themes = ['dark', 'light'];
  const themeLabels = {
    dark: 'Escuro',
    light: 'Claro',
  };

  const savedTheme = localStorage.getItem(storage.theme);
  const initialTheme = themes.includes(savedTheme) ? savedTheme : 'dark';
  root.dataset.theme = initialTheme;

  document.addEventListener('DOMContentLoaded', () => {
    setupAvatarPicker();
    highlightCurrentPage();
    setupControlDock();
  });

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
    controls.setAttribute('aria-label', 'Controles de tema e som');

    controls.innerHTML = `
      <button type="button" class="control-btn control-btn--theme" aria-label="Trocar tema" title="Trocar tema">
        <span aria-hidden="true">&#9728;</span>
      </button>
      <div class="sound-control">
        <button type="button" class="control-btn control-btn--sound" aria-label="Ligar musica" aria-pressed="false" title="Ligar musica">
          <span aria-hidden="true">&#9835;</span>
        </button>
        <label class="volume-control" title="Volume da musica">
          <span aria-hidden="true">&#128266;</span>
          <input class="volume-slider" type="range" min="0" max="100" step="1" aria-label="Volume da musica" />
        </label>
      </div>
    `;

    document.body.appendChild(controls);

    const themeButton = controls.querySelector('.control-btn--theme');
    const soundButton = controls.querySelector('.control-btn--sound');
    const volumeSlider = controls.querySelector('.volume-slider');
    const music = createMusicController(soundButton);
    const savedVolume = Number(localStorage.getItem(storage.volume));
    const initialVolume = Number.isFinite(savedVolume) ? savedVolume : 36;

    volumeSlider.value = initialVolume;
    music.setVolume(initialVolume / 100);
    updateThemeButton(themeButton);

    themeButton.addEventListener('click', () => {
      const currentTheme = root.dataset.theme || initialTheme;
      const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
      root.dataset.theme = nextTheme;
      localStorage.setItem(storage.theme, nextTheme);
      updateThemeButton(themeButton);
    });

    soundButton.addEventListener('click', () => {
      if (music.isPlaying()) {
        music.stop();
      } else {
        music.start();
      }
    });

    volumeSlider.addEventListener('input', () => {
      const volume = Number(volumeSlider.value);
      localStorage.setItem(storage.volume, String(volume));
      music.setVolume(volume / 100);

      if (volume === 0) {
        music.stop();
      } else if (!music.isPlaying()) {
        music.start();
      }
    });
  }

  function updateThemeButton(button) {
    const currentTheme = root.dataset.theme || 'dark';
    const isDark = currentTheme === 'dark';
    const label = themeLabels[currentTheme] || themeLabels.dark;
    const nextLabel = isDark ? themeLabels.light : themeLabels.dark;
    const icon = button.querySelector('span');

    if (icon) {
      icon.innerHTML = isDark ? '&#9728;' : '&#9790;';
    }

    button.classList.toggle('is-dark-theme', isDark);
    button.title = `Mudar para tema ${nextLabel.toLowerCase()}`;
    button.setAttribute('aria-label', `Tema atual: ${label}. Mudar para tema ${nextLabel.toLowerCase()}`);
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
      button.setAttribute('aria-label', playing ? 'Pausar musica' : 'Ligar musica');
      button.title = playing ? 'Pausar musica' : 'Ligar musica';
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
