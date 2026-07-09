/**
 * TV-style EAS presentation:
 * 1) SAME-style digital burst
 * 2) Attention signal: 853 Hz + 960 Hz (FCC EAS)
 * 3) Real NWS text + speech
 *
 * Dismiss: allowed after 30 seconds OR when speech finishes (whichever first).
 * Then Esc / Space / click Dismiss closes immediately.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  let alert = null;
  let audioCtx = null;
  let canDismiss = false;
  let playing = false;
  let speechDone = false;
  let timerDone = false;
  let unlockTimer = null;
  let speechUtterance = null;

  const UNLOCK_AFTER_MS = 30_000; // 30 seconds

  function setText() {
    if (!alert) return;
    const origin = (alert.senderName || 'THE NATIONAL WEATHER SERVICE').toUpperCase();
    const event = (alert.event || 'WEATHER ALERT').toUpperCase();
    const area = (alert.areaDesc || 'YOUR AREA').toUpperCase();

    $('originLine').textContent = origin;
    $('eventLine').textContent = `HAS ISSUED A ${event}`;
    $('areaLine').textContent = `FOR ${area}`;

    const headline = (alert.headline || '').trim();
    const desc = (alert.description || '').trim();
    const msg = [headline, desc].filter(Boolean).join('\n\n');
    $('message').textContent = msg || 'A weather emergency alert has been issued for your area.';

    const instr = (alert.instruction || '').trim();
    $('instruction').textContent = instr
      ? `INSTRUCTIONS:\n${instr}`
      : 'TAKE SHELTER IF ADVISED. STAY TUNED FOR FURTHER INFORMATION.';

    const bits = [
      alert.severity && `SEVERITY: ${alert.severity.toUpperCase()}`,
      alert.urgency && `URGENCY: ${alert.urgency.toUpperCase()}`,
      alert.certainty && `CERTAINTY: ${alert.certainty.toUpperCase()}`,
      alert.effective && `EFFECTIVE: ${new Date(alert.effective).toLocaleString()}`,
      (alert.ends || alert.expires) &&
        `EXPIRES: ${new Date(alert.ends || alert.expires).toLocaleString()}`,
    ].filter(Boolean);
    $('meta').textContent = bits.join('   ·   ');

    const screen = $('screen');
    screen.classList.remove('severe', 'extreme');
    if (alert.severity === 'Extreme') screen.classList.add('extreme', 'alerting');
    else if (alert.severity === 'Severe') screen.classList.add('severe', 'alerting');
    else screen.classList.add('alerting');

    canDismiss = false;
    speechDone = false;
    timerDone = false;
    $('footerRight').textContent = 'ALERT ACTIVE — STAND BY (CLOSABLE AFTER 30s OR WHEN SPEECH ENDS)';
    $('btnDismiss').classList.add('hidden');
    $('holdFill').style.width = '0%';
    window.eas.setLocked(true);

    // 30-second unlock path
    if (unlockTimer) clearTimeout(unlockTimer);
    const started = Date.now();
    unlockTimer = setTimeout(() => {
      timerDone = true;
      tryUnlock('30 seconds elapsed');
    }, UNLOCK_AFTER_MS);

    // Progress bar toward 30s
    const tick = setInterval(() => {
      if (canDismiss) {
        clearInterval(tick);
        return;
      }
      const pct = Math.min(100, ((Date.now() - started) / UNLOCK_AFTER_MS) * 100);
      $('holdFill').style.width = `${pct}%`;
    }, 100);
  }

  function tryUnlock(reason) {
    if (canDismiss) return;
    // Unlock when EITHER speech finished OR 30s passed
    if (!speechDone && !timerDone) return;
    canDismiss = true;
    window.eas.setLocked(false);
    $('footerRight').textContent = 'PRESS ESC OR SPACE · OR CLICK DISMISS';
    $('btnDismiss').classList.remove('hidden');
    $('holdFill').style.width = '100%';
    if (reason) console.log('[EAS] unlock:', reason);
  }

  function dismissNow() {
    if (!canDismiss) {
      $('footerRight').textContent = 'WAIT — UNLOCKS AFTER 30s OR WHEN VOICE FINISHES';
      return;
    }
    try {
      speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    if (unlockTimer) clearTimeout(unlockTimer);
    window.eas.dismiss(true);
  }

  async function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return audioCtx;
  }

  async function playSameStyleBurst(ctx) {
    const duration = 1.15;
    const sampleRate = ctx.sampleRate;
    const frames = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      const bit = Math.floor(t * 520) % 2;
      const f = bit ? 2083.3 : 1562.5;
      const env = Math.min(1, t * 30) * Math.min(1, (duration - t) * 30);
      data[i] = Math.sin(2 * Math.PI * f * t) * 0.35 * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    await wait(duration * 1000 + 40);
  }

  async function playAttentionSignal(ctx, seconds) {
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.45, now + 0.05);
    g.gain.setValueAtTime(0.45, now + Math.max(0.2, seconds - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    g.connect(ctx.destination);

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.value = 853;
    o2.frequency.value = 960;
    o1.connect(g);
    o2.connect(g);
    o1.start(now);
    o2.start(now);
    o1.stop(now + seconds);
    o2.stop(now + seconds);
    await wait(seconds * 1000 + 50);
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function speakAlert() {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !alert) {
        speechDone = true;
        tryUnlock('no speech engine');
        resolve();
        return;
      }
      const text =
        `${alert.event || 'Weather alert'}. ${alert.headline || ''}. ${alert.description || ''}. ${alert.instruction || ''}`.slice(
          0,
          1200
        );
      const u = new SpeechSynthesisUtterance(text);
      speechUtterance = u;
      u.rate = 0.92;
      u.pitch = 0.95;
      u.volume = 1;
      u.onend = () => {
        speechDone = true;
        tryUnlock('speech finished');
        resolve();
      };
      u.onerror = () => {
        speechDone = true;
        tryUnlock('speech error');
        resolve();
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }

  async function runAudioSequence() {
    if (playing) return;
    playing = true;
    try {
      const ctx = await ensureAudio();
      await playSameStyleBurst(ctx);
      await wait(200);
      const sev = alert?.severity || 'Unknown';
      const secs = sev === 'Extreme' ? 12 : sev === 'Severe' ? 10 : 8;
      await playAttentionSignal(ctx, secs);
      await speakAlert();
    } catch (e) {
      console.error(e);
      speechDone = true;
      tryUnlock('audio failed');
    } finally {
      playing = false;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      dismissNow();
    }
  });

  // Auto-dismiss when NWS end time passes
  setInterval(() => {
    if (!alert || !canDismiss) return;
    const end = alert.ends || alert.expires;
    if (!end) return;
    if (Date.now() > new Date(end).getTime() + 2000) {
      dismissNow();
    }
  }, 2000);

  window.eas.onShow(({ alert: a }) => {
    alert = a;
    setText();
    runAudioSequence();
    document.body.addEventListener(
      'click',
      (ev) => {
        if (ev.target && ev.target.id === 'btnDismiss') return;
        if (!playing && !speechDone) runAudioSequence();
      },
      { once: true }
    );
  });

  window.eas.onDenyClose(() => {
    if (!canDismiss) {
      $('footerRight').textContent = 'WAIT — UNLOCKS AFTER 30s OR WHEN VOICE FINISHES';
    }
  });

  // Wire dismiss button once DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('btnDismiss');
    if (btn) btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissNow();
    });
  });
  // In case script runs after DOMContentLoaded
  setTimeout(() => {
    const btn = $('btnDismiss');
    if (btn && !btn.__wired) {
      btn.__wired = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissNow();
      });
    }
  }, 0);
})();
