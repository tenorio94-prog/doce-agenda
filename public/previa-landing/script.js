const switches = document.querySelectorAll('.ld-switch button');
for (const button of switches) button.addEventListener('click', () => { document.querySelector('.ld-stage').dataset.side = button.dataset.side; for (const item of switches) item.setAttribute('aria-pressed', String(item === button)); });
document.querySelector('.video-open').addEventListener('click', event => { const video = document.createElement('video'); video.controls = true; video.preload = 'none'; video.setAttribute('playsinline', ''); const source = document.createElement('source'); source.src = '/previa-landing/historia.mp4'; source.type = 'video/mp4'; const track = document.createElement('track'); track.kind = 'captions'; track.srclang = 'pt-BR'; track.label = 'Português'; track.src = '/previa-landing/legendas.vtt'; track.default = true; video.append(source, track); document.querySelector('.video-holder').append(video); event.currentTarget.hidden = true; video.play().catch(() => {}); });

// Movimento: a classe .anima só entra no fim, depois que tudo foi preparado. Se algo falhar antes,
// ou se a pessoa pediu menos movimento, a página fica parada e com todo o conteúdo à vista.
try {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 701px)');

  const ticker = document.querySelector('.ticker');
  const tickerTrack = ticker.querySelector('.ticker-track');
  const tickerList = ticker.querySelector('.ticker-list');
  const tickerCopy = tickerList.cloneNode(true);
  tickerCopy.setAttribute('aria-hidden', 'true');
  tickerList.after(tickerCopy);
  const pause = ticker.querySelector('.ticker-pause');
  const togglePause = () => pause.setAttribute('aria-pressed', String(ticker.classList.toggle('is-paused')));
  pause.addEventListener('click', togglePause);
  tickerTrack.addEventListener('click', () => { if (root.classList.contains('anima')) togglePause(); });

  const storyTrack = document.querySelector('.story-track');
  const scenes = [...storyTrack.querySelectorAll('figure')];
  const count = storyTrack.querySelector('.story-count');
  const steps = [...document.querySelectorAll('.how-grid article')];
  const screens = [...document.querySelectorAll('.how-screen img')];
  const stage = document.querySelector('.how-stage');
  let scene = -1, step = -1, queued = false;

  function showScene(index) {
    if (index === scene) return;
    scene = index;
    scenes.forEach((figure, i) => { figure.classList.toggle('is-active', i === index); figure.classList.toggle('is-past', i < index); });
    count.textContent = `0${index + 1}/0${scenes.length}`;
  }
  function showStep(index) {
    if (index === step) return;
    step = index;
    steps.forEach((article, i) => article.classList.toggle('is-active', i === index));
    screens.forEach((img, i) => img.classList.toggle('is-active', i === index));
  }
  function update() {
    queued = false;
    const box = storyTrack.getBoundingClientRect();
    const range = box.height - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, -box.top / range)) : 0;
    showScene(Math.min(scenes.length - 1, Math.floor(progress * scenes.length)));
    // No celular o passo vale quando o topo passa de 70% da tela; no computador, quando o meio passa de 60%.
    let current = 0;
    steps.forEach((article, i) => {
      const r = article.getBoundingClientRect();
      if ((wide.matches ? r.top + r.height / 2 : r.top) < innerHeight * (wide.matches ? 0.6 : 0.7)) current = i;
    });
    showStep(current);
  }
  // No celular, o aparelho solta junto com o último passo, que fica à vista logo abaixo dele.
  const measure = () => stage.style.setProperty('--how-tail', wide.matches ? '0px' : `${steps.at(-1).offsetHeight}px`);
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { measure(); queue(); });

  const apply = () => {
    root.classList.toggle('anima', !reduce.matches);
    tickerTrack.tabIndex = reduce.matches ? 0 : -1;
    measure();
    update();
  };
  reduce.addEventListener('change', apply);
  apply();
} catch (error) {
  document.documentElement.classList.remove('anima');
}
