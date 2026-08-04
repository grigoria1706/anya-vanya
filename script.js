/* ==========================================================================
   ОБРАТНЫЙ ОТСЧЁТ
   ЗАМЕНИТЕ дату/время на дату вашей свадьбы в формате "ГГГГ-ММ-ДДTЧЧ:ММ:00"
========================================================================== */
const WEDDING_DATE = new Date("2026-09-25T14:00:00");

function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;

  const el = (id) => document.getElementById(id);
  if (!el("cd-days")) return;

  if (diff <= 0) {
    el("cd-days").textContent = "00";
    el("cd-hours").textContent = "00";
    el("cd-mins").textContent = "00";
    el("cd-secs").textContent = "00";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  el("cd-days").textContent = String(days).padStart(2, "0");
  el("cd-hours").textContent = String(hours).padStart(2, "0");
  el("cd-mins").textContent = String(mins).padStart(2, "0");
  el("cd-secs").textContent = String(secs).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ==========================================================================
   ЗАСТАВКА + ФОНОВАЯ МУЗЫКА
   Музыка запускается только по клику (жест пользователя) — это требование
   браузеров для автовоспроизведения со звуком. Дальше играет по всему сайту,
   выключить/включить можно кнопкой-нотой в углу экрана.
========================================================================== */
const cover = document.getElementById("cover");
const coverStart = document.getElementById("cover-start");
const bgm = document.getElementById("bgm");
const musicToggle = document.getElementById("music-toggle");

function updateMusicIcon() {
  if (!musicToggle || !bgm) return;
  musicToggle.textContent = bgm.paused ? "🔇" : "♪";
  musicToggle.setAttribute("aria-label", bgm.paused ? "Включить музыку" : "Выключить музыку");
}

// Плавная прокрутка с собственной длительностью и лёгким ускорением/замедлением —
// нативный scrollIntoView слишком резкий для такого перехода.
function smoothScrollTo(targetY, duration) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    window.scrollTo(0, startY + distance * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

if (coverStart && cover) {
  coverStart.addEventListener(
    "click",
    () => {
      // Заставка (фото) остаётся на странице — просто плавно скрываем кнопку
      // и переходим ниже. Прокрутив назад вверх, можно снова увидеть фото.
      coverStart.classList.add("cover-start--active");

      if (bgm) {
        bgm.volume = 0.6;
        bgm.play().catch(() => {});
      }

      if (musicToggle) {
        musicToggle.hidden = false;
        requestAnimationFrame(() => musicToggle.classList.add("music-toggle--visible"));
        updateMusicIcon();
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setTimeout(
        () => {
          const hero = document.getElementById("top");
          if (!hero) return;
          const targetY = hero.getBoundingClientRect().top + window.scrollY;
          if (prefersReducedMotion) {
            window.scrollTo(0, targetY);
          } else {
            smoothScrollTo(targetY, 1600);
          }
        },
        prefersReducedMotion ? 0 : 500
      );
    },
    { once: true }
  );
}

if (musicToggle && bgm) {
  musicToggle.addEventListener("click", () => {
    if (bgm.paused) {
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
    updateMusicIcon();
  });
}

/* ==========================================================================
   ПАРАЛЛАКС (раздел «Пожелания»): смещение цветов и руки — чистая функция
   текущего положения элемента на экране, а не одноразовая анимация.
   Поэтому при прокрутке вверх движение мгновенно идёт в обратную сторону.
   У каждого элемента свой data-speed — из-за этого одни двигаются быстрее
   других. Цветы дополнительно «парят» через CSS-анимацию на самой картинке
   (см. style.css, @keyframes flowerFloat) — это два независимых transform
   на разных DOM-узлах (обёртка двигается по скроллу, картинка внутри неё
   парит), поэтому они не конфликтуют друг с другом.
========================================================================== */
const parallaxEls = Array.from(document.querySelectorAll(".parallax"));

if (parallaxEls.length) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!prefersReducedMotion) {
    const items = parallaxEls.map((el) => ({
      el,
      speed: parseFloat(el.dataset.speed || "0.15"),
      axis: el.dataset.axis === "x" ? "x" : "y",
    }));

    let ticking = false;

    function updateParallax() {
      const viewportCenter = window.innerHeight / 2;
      items.forEach(({ el, speed, axis }) => {
        // Прогресс всегда считаем по вертикали — именно она меняется при
        // прокрутке страницы. Ось "x" лишь определяет, в какую сторону
        // (translateX вместо translateY) применить это же смещение.
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const offset = (viewportCenter - elCenter) * speed;
        el.style.transform = axis === "x" ? `translateX(${-offset}px)` : `translateY(${offset}px)`;
      });
      ticking = false;
    }

    function requestTick() {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);
    updateParallax();
  }
}

/* ==========================================================================
   ОТПРАВКА ФОРМЫ RSVP (через Google Apps Script, без перезагрузки страницы)
   Веб-приложения Apps Script не отправляют CORS-заголовки, поэтому прочитать
   тело/статус ответа из браузера нельзя — используем режим "no-cors":
   запрос всё равно доходит и выполняется на сервере, просто ответ считается
   непрозрачным (opaque). Поэтому успех показываем оптимистично — если сам
   fetch не упал с ошибкой сети, считаем, что данные отправлены.
========================================================================== */
const form = document.getElementById("rsvp-form");
const status = document.getElementById("form-status");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    try {
      await fetch(form.action, {
        method: "POST",
        mode: "no-cors",
        body: data,
      });

      form.reset();
      status.hidden = false;
      status.textContent = "Спасибо! Мы получили ваш ответ 🌾";
    } catch (err) {
      status.hidden = false;
      status.textContent = "Не удалось отправить. Проверьте интернет-соединение и попробуйте снова.";
    }
  });
}
