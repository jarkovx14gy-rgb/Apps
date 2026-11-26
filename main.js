import './style.css';

const KEY = 'mycollection_cards_v1';
const PIN_KEY = 'mycollection_pin_v1';
const app = document.querySelector('#app');

let cards = JSON.parse(localStorage.getItem(KEY) || '[]');
let pin = localStorage.getItem(PIN_KEY) || '1234';
let unlocked = false;

const save = () => localStorage.setItem(KEY, JSON.stringify(cards));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderLock(message = '') {
  app.innerHTML = `<main class="lock">
    <div class="lock-icon">🔒</div><h1>My Collection</h1>
    <p>Введи PIN-код для входа</p>
    <form id="pinForm"><input id="pinInput" inputmode="numeric" type="password" maxlength="12" placeholder="PIN-код" autofocus required>
    <button>Войти</button></form><small class="error">${esc(message)}</small>
    <small class="hint">При первом запуске PIN: 1234</small>
  </main>`;
  document.querySelector('#pinForm').addEventListener('submit', e => {
    e.preventDefault();
    if (document.querySelector('#pinInput').value === pin) { unlocked = true; render(); }
    else renderLock('Неверный PIN-код. Попробуй ещё раз.');
  });
}

function render() {
  if (!unlocked) return renderLock();
  app.innerHTML = `<header><div><h1>My Collection</h1><p>Твои ссылки в виде карточек</p></div><button class="secondary" id="settings">⚙</button></header>
    <section class="add">
      <label for="url">Добавить ссылку</label>
      <div class="urlrow"><input id="url" type="url" placeholder="Вставь ссылку на товар или страницу" required><button id="add">Добавить</button></div>
      <p id="status" class="status">Название и изображение попробуем получить автоматически.</p>
    </section>
    <section class="cards" id="cards"></section>
    <dialog id="settingsDialog"><form method="dialog" class="dialog">
      <h2>Настройки</h2><label>Новый PIN-код</label><input id="newPin" inputmode="numeric" type="password" maxlength="12" placeholder="Минимум 4 цифры">
      <button type="button" id="savePin">Сохранить PIN</button>
      <button class="secondary" value="cancel">Закрыть</button>
      <p class="hint">PIN хранится на этом устройстве. Не используй здесь пароль от важных аккаунтов.</p>
    </form></dialog>`;

  const list = document.querySelector('#cards');
  if (!cards.length) list.innerHTML = `<div class="empty">Пока нет карточек.<br>Добавь первую ссылку выше.</div>`;
  cards.forEach((c, i) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `<img class="cover" src="${esc(c.image || '')}" alt="" onerror="this.style.display='none'">
      <div class="cardbody"><h3>${esc(c.title || c.url)}</h3><a href="${esc(c.url)}" target="_blank" rel="noopener">Открыть ссылку ↗</a>
      <div class="price"><span>Цена:</span><input data-price="${i}" value="${esc(c.price || '')}" placeholder="Укажи цену вручную"></div>
      <button class="delete" data-delete="${i}">Удалить карточку</button></div>`;
    list.append(el);
  });

  document.querySelector('#add').onclick = addCard;
  document.querySelector('#url').addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });
  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => { cards.splice(Number(b.dataset.delete),1); save(); render(); });
  document.querySelectorAll('[data-price]').forEach(inp => inp.onchange = () => { cards[Number(inp.dataset.price)].price = inp.value; save(); });
  const dlg = document.querySelector('#settingsDialog');
  document.querySelector('#settings').onclick = () => dlg.showModal();
  document.querySelector('#savePin').onclick = () => {
    const value = document.querySelector('#newPin').value.trim();
    if (!/^\d{4,12}$/.test(value)) { alert('PIN должен содержать от 4 до 12 цифр.'); return; }
    pin = value; localStorage.setItem(PIN_KEY, pin); alert('PIN-код изменён.'); dlg.close();
  };
}

async function addCard() {
  const input = document.querySelector('#url');
  const status = document.querySelector('#status');
  const url = input.value.trim();
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch { status.textContent = 'Введи корректную ссылку, начинающуюся с https://'; return; }

  status.textContent = 'Получаем название и изображение…';
  const button = document.querySelector('#add');
  button.disabled = true;
  let title = new URL(url).hostname;
  let image = '';
  try {
    // Microlink reads page metadata (Open Graph / title / image).
    const endpoint = 'https://api.microlink.io/?url=' + encodeURIComponent(url);
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Metadata service error');
    const result = await response.json();
    if (result.status === 'success' && result.data) {
      title = result.data.title || title;
      image = result.data.image?.url || result.data.logo?.url || '';
    } else throw new Error('No metadata');
  } catch {
    status.textContent = 'Не удалось автоматически получить данные с этого сайта. Карточка всё равно будет создана — название можно изменить позже.';
  }
  cards.unshift({ url, title, image, price: '' });
  save();
  input.value = '';
  button.disabled = false;
  render();
}

renderLock();
