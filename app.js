const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const $ = id => document.getElementById(id);
let balance = 15000, deals = 0, closed = 0, wins = 0;
const fmt = n => Math.round(n).toLocaleString('ru-RU');
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function go(page){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go+'Page')));
$('avatarBtn').addEventListener('click',()=>go('profilePage'));
function setProfile(){
  if(tg?.initDataUnsafe?.user){const u=tg.initDataUnsafe.user;const name=[u.first_name,u.last_name].filter(Boolean).join(' ')||'Пользователь';$('profileName').textContent=name;$('profileHandle').textContent=u.username?'@'+u.username:'Telegram-пользователь';$('profileAvatar').textContent=(u.first_name||'U')[0].toUpperCase();$('avatarBtn').textContent=(u.first_name||'U')[0].toUpperCase();}
}
setProfile();
function updateStats(){$('statDeals').textContent=deals;$('statClosed').textContent=closed;$('statWin').textContent=closed?Math.round(wins/closed*100)+'%':'—';}
$('depositBtn').addEventListener('click',()=>$('depositModal').classList.add('show'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('depositModal').classList.remove('show')));
$('depositModal').addEventListener('click',e=>{if(e.target===$('depositModal'))$('depositModal').classList.remove('show');});
$('confirmDeposit').addEventListener('click',()=>{const amount=Number($('depositAmount').value);if(!Number.isInteger(amount)||amount<1){toast('Укажи сумму от 1 ₽');return;}balance+=amount;$('balance').textContent=fmt(balance);$('depositModal').classList.remove('show');$('history').innerHTML=`<div class="market-item"><div class="coin coin-usd">₽</div><div class="market-name"><b>Виртуальное пополнение</b><small>Только внутри симулятора</small></div><strong class="positive">+${fmt(amount)} ₽</strong></div>`;toast('Виртуальный баланс обновлён');});
function openPosition(direction){deals++;updateStats();const wrap=$('positions');wrap.className='market-list';wrap.innerHTML=`<div class="market-item"><div class="coin coin-btc">₿</div><div class="market-name"><b>BTC / RUB · ${direction}</b><small>Учебная позиция · только виртуально</small></div><button class="sell-btn close-position">Закрыть</button></div>`;wrap.querySelector('.close-position').addEventListener('click',()=>{closed++;if(Math.random()>.45)wins++;updateStats();wrap.className='empty-state';wrap.innerHTML='<div class="empty-icon">✓</div><b>Позиция закрыта</b><span>Результат сохранён в учебной статистике.</span>';toast('Учебная позиция закрыта');});toast('Учебная позиция открыта');}
$('longBtn').addEventListener('click',()=>openPosition('LONG'));
$('shortBtn').addEventListener('click',()=>openPosition('SHORT'));
