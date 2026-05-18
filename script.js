(() => {
  const WEDDING_ISO = '2026-06-12T19:00:00+03:00';
  const WEDDING_DATE = new Date(WEDDING_ISO);
  const VENUE_NAME = 'Jewel Panorama Garden';
  const VENUE_URL = 'https://maps.app.goo.gl/UkxZMn3ygWTu4Phg6';
  const SHARE_TEXT = 'يسعدنا دعوتكم لحضور حفل زفاف هشام و ندى — الجمعة ١٢ يونيو ٢٠٢٦ في Jewel Panorama Garden. التفاصيل: ';

  /* ===================== COUNTDOWN ===================== */
  const els = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]'),
    grid: document.getElementById('countdown'),
    passed: document.getElementById('cd-passed'),
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toArabicDigits = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

  function tick() {
    const now = Date.now();
    const diff = WEDDING_DATE.getTime() - now;

    if (diff <= 0) {
      els.grid.hidden = true;
      els.passed.hidden = false;
      clearInterval(timerId);
      return;
    }

    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    els.days.textContent = toArabicDigits(days);
    els.hours.textContent = toArabicDigits(pad(hours));
    els.minutes.textContent = toArabicDigits(pad(minutes));
    els.seconds.textContent = toArabicDigits(pad(seconds));
  }

  tick();
  const timerId = setInterval(tick, 1000);

  /* ===================== BACKGROUND AUDIO ===================== */
  const audio = document.getElementById('bg-audio');
  audio.volume = 0.6;
  audio.loop = true;

  audio.addEventListener('error', () => {
    console.warn('[audio] failed to load', audio.error);
  });

  // Step 1: muted autoplay is allowed by every modern browser. Start it silently.
  audio.muted = true;
  const initialPlay = audio.play().catch(() => {});

  // Step 2: the moment the user touches the page, unmute (and play if step 1 was blocked).
  const events = ['pointerdown', 'touchstart', 'click', 'keydown', 'scroll', 'mousemove'];
  const onFirstGesture = () => {
    audio.muted = false;
    if (audio.paused) audio.play().catch(() => {});
    events.forEach((evt) => window.removeEventListener(evt, onFirstGesture, true));
  };
  events.forEach((evt) =>
    window.addEventListener(evt, onFirstGesture, { once: true, capture: true, passive: true })
  );

  // Also handle the case where a returning visitor's browser already allows unmuted autoplay.
  initialPlay.then(() => {
    // If audio is already playing muted, try once more unmuted in case the policy allows it.
    audio.muted = false;
    audio.play().catch(() => { audio.muted = true; audio.play().catch(() => {}); });
  });

  /* ===================== TOAST ===================== */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => { toastEl.hidden = true; }, 250);
    }, 2000);
  }

  /* ===================== SHARE ===================== */
  const pageUrl = () => location.href;

  document.getElementById('share-whatsapp').addEventListener('click', () => {
    const text = encodeURIComponent(SHARE_TEXT + pageUrl());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  });

  document.getElementById('share-native').addEventListener('click', async () => {
    const shareData = {
      title: 'هشام و ندى — ١٢ يونيو ٢٠٢٦',
      text: SHARE_TEXT,
      url: pageUrl(),
    };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (_) { /* user dismissed */ }
    } else {
      await copyToClipboard(SHARE_TEXT + pageUrl());
      toast('تم نسخ الدعوة');
    }
  });

  document.getElementById('copy-link').addEventListener('click', async () => {
    const ok = await copyToClipboard(pageUrl());
    toast(ok ? 'تم نسخ الرابط' : 'تعذر النسخ');
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* ===================== CALENDAR (.ics) ===================== */
  document.getElementById('add-calendar').addEventListener('click', () => {
    const start = new Date(WEDDING_ISO);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const ics = buildIcs({
      uid: `hesham-nada-${start.getTime()}@invite`,
      title: "حفل زفاف هشام و ندى",
      description: SHARE_TEXT + pageUrl(),
      location: VENUE_NAME,
      url: VENUE_URL,
      start, end,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hesham-nada.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ===================== WISHES FORM ===================== */
  const form = document.getElementById('wishes-form');
  const statusEl = document.getElementById('wishes-status');
  const submitBtn = document.getElementById('wishes-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'wishes__status';
    statusEl.textContent = '';

    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'جاري الإرسال…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success === 'true' || data.success === true || res.status === 200)) {
        statusEl.classList.add('is-success');
        statusEl.textContent = 'شكراً لكم — وصلت رسالتكم.';
        form.reset();
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      statusEl.classList.add('is-error');
      statusEl.textContent = 'عذراً، حدث خطأ. الرجاء المحاولة مرة أخرى.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  function buildIcs({ uid, title, description, location, url, start, end }) {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hesham & Nada//Wedding Invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      `URL:${esc(url)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
})();
