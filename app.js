const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const money = n => '₽ ' + Number(n).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt = n => Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const api = {
  enabled: false,
  initData: '',
  async request(path, options = {}) {
    if (!this.enabled) throw new Error('server-disabled');
    const headers = {'Accept':'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), 'X-Telegram-Init-Data': this.initData, ...(options.headers||{})};
    const res = await fetch(path, {...options, headers});
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  }
};
let currentPlayer = null;
function applyPlayer(player){
  currentPlayer = player;
  const name = player?.name || player?.username || 'Гость';
  const meta = player?.username ? '@'+player.username : 'Демо-профиль';
  $('#topUserName').textContent = name;
  $('#topUserMeta').textContent = meta;
  $('#profileName').textContent = name;
  $('#profileMeta').textContent = player?.username ? '@'+player.username+' · Telegram' : 'Участник демо-площадки';
  const letter = (name[0] || 'G').toUpperCase();
  $('#topAvatar').textContent = letter;
  $('#profileAvatar').textContent = letter;
}
async function syncState(){
  if(!api.enabled) return;
  try { await api.request('/api/state',{method:'POST',body:JSON.stringify({state:{cash:state.cash,holdings:state.holdings,history:state.history,owned:state.owned,tradeMarkers:state.tradeMarkers}})}); }
  catch(e){ console.warn('state sync failed',e); }
}
async function bootServer(){
  const tg = window.Telegram?.WebApp;
  if(!tg || !tg.initData){ applyPlayer(null); return; }
  tg.ready(); tg.expand();
  api.enabled = true; api.initData = tg.initData;
  try{
    const data = await api.request('/api/auth',{method:'POST',body:JSON.stringify({initData:tg.initData})});
    applyPlayer(data.player);
    if(data.state){ Object.assign(state,data.state); state.tradeSide ||= 'above'; state.chartType ||= 'candle'; state.interval ||= '5S'; state.page ||= 'home'; }
    await loadFriendsFromServer();
    renderAll(); updateTradeEstimate();
    toast('Telegram-профиль подключён');
  }catch(e){
    api.enabled = false;
    applyPlayer(null);
    toast('Не удалось подключить Telegram-сервер');
  }
}
async function loadFriendsFromServer(){
  if(!api.enabled) return;
  try{
    const data=await api.request('/api/friends');
    const friends=data.friends||[];
    $('#friendsList').innerHTML = friends.length ? friends.map(p=>`<div class="friend-row"><span class="friend-left"><i class="seller-avatar">${(p.name||p.username||'?')[0].toUpperCase()}</i><span><b>${p.name||p.username}</b><small>@${(p.username||'').replace(/^@/,'')}</small></span></span><span class="rating">Игрок</span><button class="mini-btn" data-friend-id="${p.id}" data-friend-name="${(p.name||p.username||'Игрок').replace(/"/g,'&quot;')}">Профиль</button></div>`).join('') : '<div class="empty-state">Пока нет друзей. Найдите игрока выше.</div>';
  }catch(e){ console.warn(e); }
}
const state = {
  cash:100000,
  holdings:{BTC:0.001,ETH:1,USDT:100},
  history:[],
  owned:[],
  page:'home',
  tradeSide:'above',
  chartType:'candle',
  interval:'5S',
  p2pSide:'buy',
  p2pAsset:'USDT',
  storeCategory:'all',
  marketFilter:'all',
  bonusClaimed:false,
  tradeMarkers:[]
};
const assets = [
 {s:'BTC',name:'Bitcoin',price:6341280,change:1.72,icon:'₿',type:'crypto'},
 {s:'ETH',name:'Ethereum',price:314325,change:2.31,icon:'◆',type:'crypto'},
 {s:'TON',name:'Toncoin',price:721.4,change:-.61,icon:'◈',type:'crypto'},
 {s:'SOL',name:'Solana',price:14739,change:3.18,icon:'◎',type:'crypto'},
 {s:'XRP',name:'XRP',price:52.87,change:-1.12,icon:'✕',type:'crypto'},
 {s:'DOGE',name:'Dogecoin',price:11.823,change:4.75,icon:'Ð',type:'crypto'},
 {s:'USDT',name:'Tether',price:92.4,change:.08,icon:'₮',type:'crypto'},
 {s:'USD',name:'Доллар США',price:92.4,change:.12,icon:'$',type:'fiat'},
 {s:'EUR',name:'Евро',price:99.8,change:-.14,icon:'€',type:'fiat'}
];
let prices = Object.fromEntries(assets.map(a=>[a.s,a.price]));
const sellers = [
 ['CryptoExpert','4.98','2.4534','6 350 000','50 000 – 2 000 000','СБП · Банк'],['InvestMaster','4.95','1.7856','6 360 000','30 000 – 1 500 000','СБП · Перевод'],['BitSeller Pro','4.92','3.1250','6 370 000','100 000 – 3 000 000','Банк · СБП'],['FastTrade24','4.91','0.9856','6 375 000','20 000 – 1 000 000','СБП'],['TopTrader','4.90','5.2367','6 380 000','150 000 – 5 000 000','Банк · Перевод'],['NorthCapital','4.89','1.5400','6 390 000','10 000 – 900 000','СБП']
];
const items = [
 ['cars','🏎️','Спортивный автомобиль','Виртуальный гараж · купе',2850000],['cars','🚙','Премиальный внедорожник','Виртуальный гараж · SUV',4200000],['cars','🚗','Городской автомобиль','Виртуальный гараж · седан',980000],['cars','🏍️','Спортивный мотоцикл','Виртуальный гараж · спорт',640000],
 ['realty','🏙️','Апартаменты в центре','Недвижимость · 2 комнаты',7800000],['realty','🏡','Загородный дом','Недвижимость · участок',12500000],['realty','🏢','Офисное помещение','Недвижимость · бизнес',5600000],['realty','🌅','Пентхаус с видом','Недвижимость · премиум',18500000],
 ['style','⌚','Классические часы','Аксессуар · коллекция',185000],['style','💎','Бриллиантовое украшение','Ювелирная коллекция',420000],['style','👜','Дизайнерская сумка','Аксессуар · стиль',95000],['style','👟','Лимитированные кроссовки','Одежда · streetwear',38000],['style','🧥','Премиальное пальто','Одежда · коллекция',72000],['style','🕶️','Солнцезащитные очки','Аксессуар',24000],
 ['tech','💻','Ноутбук Pro','Техника · рабочая станция',210000],['tech','📱','Флагманский смартфон','Техника · мобильные',125000],['tech','🎧','Наушники Studio','Техника · аудио',42000],['tech','📷','Камера беззеркальная','Техника · фото',165000],
 ['cars','🛵','Городской скутер','Виртуальный гараж · компакт',85000],['cars','🚲','Премиальный велосипед','Виртуальный гараж · спорт',45000],['cars','🛴','Электросамокат','Виртуальный гараж · city',28000],
 ['realty','🏠','Студия','Недвижимость · компакт',650000],['realty','🌲','Дачный домик','Недвижимость · загородная',420000],['realty','🅿️','Парковочное место','Недвижимость · гараж',180000],
 ['style','⌚','Спортивные часы','Аксессуар · sport',12500],['style','👓','Оправа премиум','Аксессуар · стиль',9000],['style','🎒','Рюкзак Urban','Аксессуар · streetwear',7500],['style','👕','Футболка лимитированная','Одежда · коллекция',6000],
 ['tech','⌨️','Механическая клавиатура','Техника · периферия',14000],['tech','🖱️','Игровая мышь','Техника · периферия',8500],['tech','🔊','Портативная колонка','Техника · аудио',12000],['tech','📱','Смартфон Lite','Техника · мобильные',32000]
];
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function go(page){state.page=page;$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'});renderAll()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){e.preventDefault();go(b.dataset.page)}});
function sparkline(seed=1){let v=20,pts=[];for(let i=0;i<24;i++){v+=Math.sin(i*.7+seed)*2+(Math.random()-.5)*5;pts.push(Math.max(4,Math.min(38,v)))}return pts}
function drawSpark(canvas,seed){if(!canvas)return;let c=canvas.getContext('2d'),w=canvas.width=canvas.clientWidth*2,h=canvas.height=canvas.clientHeight*2,pts=sparkline(seed),up=seed%3!==0;c.clearRect(0,0,w,h);c.beginPath();pts.forEach((v,i)=>{let x=i/(pts.length-1)*w,y=h-v/45*h*.85;if(!i)c.moveTo(x,y);else c.lineTo(x,y)});c.strokeStyle=up?'#f5a623':'#e94d5b';c.lineWidth=3;c.stroke()}
function renderTickers(){ $('#tickerStrip').innerHTML=assets.slice(0,3).map(a=>`<div class="ticker"><div><b>${a.s}/RUB</b><small>${money(prices[a.s])}</small></div><b class="${a.change>=0?'up':'down'}">${a.change>0?'+':''}${a.change.toFixed(2)}%</b></div>`).join('')}
function renderAssets(){const cards=assets.slice(0,6).map((a,i)=>`<div class="asset-card"><div class="asset-card-top"><span>${a.s}/RUB</span><span class="asset-symbol">${a.name}</span></div><div class="asset-price">${fmt(prices[a.s])} ₽</div><div class="asset-change ${a.change>=0?'up':'down'}">${a.change>0?'+':''}${a.change.toFixed(2)}%</div><canvas class="spark" data-seed="${i+1}"></canvas></div>`).join('');$('#homeAssets').innerHTML=cards;$$('.spark').forEach(c=>drawSpark(c,+c.dataset.seed))}
function renderHomeOffers(){ $('#homeOffers').innerHTML=sellers.slice(0,3).map(s=>`<div class="offer-mini"><span><b>${s[0]}</b><small>★ ${s[1]} · проверенный демо-продавец</small></span><span class="price-orange">${s[3]} ₽</span><span>${s[2]} BTC</span><button class="mini-btn" data-open-p2p="${s[0]}">Купить</button></div>`).join('')}
function renderMarket(){let q=($('#assetSearch')?.value||'').toLowerCase();let list=assets.filter(a=>(state.marketFilter==='all'||a.type===state.marketFilter)&&(`${a.s} ${a.name}`.toLowerCase().includes(q)));$('#marketRows').innerHTML=list.map((a,i)=>`<div class="table-row"><span class="asset-name"><i class="coin-icon">${a.icon}</i><span>${a.name}<small class="asset-symbol">${a.s}</small></span></span><b>${money(prices[a.s])}</b><span class="${a.change>=0?'up':'down'}">${a.change>0?'+':''}${a.change.toFixed(2)}%</span><canvas class="spark" data-seed="${i+4}"></canvas><button class="mini-btn" data-trade="${a.s}">Торговать</button></div>`).join('')||'<div class="empty-state">Ничего не найдено.</div>';$$('#marketRows .spark').forEach(c=>drawSpark(c,+c.dataset.seed))}
function renderP2P(){let asset=$('#p2pAsset').value,sort=$('#p2pSort').value,q=$('#sellerSearch').value.toLowerCase();let list=sellers.filter(s=>s[0].toLowerCase().includes(q));if(sort==='low')list.sort((a,b)=>+a[3].replaceAll(' ','')- +b[3].replaceAll(' ',''));if(sort==='high')list.sort((a,b)=>+b[3].replaceAll(' ','')- +a[3].replaceAll(' ',''));$('#p2pRows').innerHTML=list.map((s,i)=>`<div class="p2p-row"><span class="seller"><i class="seller-avatar">${s[0][0]}</i><span><b>${s[0]} <span class="up">◆</span></b><small>На площадке · ${120+i*37} сделок</small></span></span><b class="price-orange">${asset==='BTC'?s[3]:fmt(prices[asset]*1.006)} ₽</b><span>${s[2]} ${asset}</span><span>${s[4]}</span><span>${s[5]}</span><button class="buy-btn" data-buy-seller="${i}">Купить</button></div>`).join('')}
function renderStore(){let list=items.map((x,i)=>({...{cat:x[0],emoji:x[1],name:x[2],desc:x[3],price:x[4]},id:i})).filter(x=>(state.storeCategory==='all'||x.cat===state.storeCategory));$('#storeGrid').innerHTML=list.map(x=>`<article class="store-card"><div class="store-art">${x.emoji}</div><div class="store-info"><b>${x.name}</b><small>${x.desc}</small><div class="store-buy"><strong>${money(x.price)}</strong><button data-buy-item="${x.id}">${state.owned.includes(x.id)?'Куплено':'Получить'}</button></div></div></article>`).join('')}
function renderFriends(){
  const names=['CryptoExpert','InvestMaster','BitSeller Pro','FastTrade24','TopTrader','NorthCapital'];
  $('#friendsList').innerHTML=names.map((n,i)=>`<div class="friend-row"><span class="friend-left"><i class="seller-avatar">${n[0]}</i><span><b>${n}</b><small>@${n.toLowerCase().replaceAll(' ','_')} · уровень ${i+2}</small></span></span><span class="rating">★ ${(4.8+i*.02).toFixed(2)}</span><button class="mini-btn" data-friend="${n}">Профиль</button></div>`).join('');
}
function renderFriendResults(results=[]){
  const box=$('#friendSearchResults');
  if(!box)return;
  if(!results.length){box.innerHTML='<div class="empty-state">Игрок не найден. В демо-режиме поиск подключается к серверному API Telegram-игроков.</div>';return}
  box.innerHTML=results.map((u,i)=>`<div class="friend-row"><span class="friend-left"><i class="seller-avatar">${(u.name||u.username||'?')[0].toUpperCase()}</i><span><b>${u.name||u.username}</b><small>@${(u.username||'').replace(/^@/,'')} · ${u.online?'Онлайн':'Был недавно'}</small></span></span><button class="mini-btn" data-friend-search="${i}" data-player-id="${u.id}">Профиль</button><button class="mini-btn" data-add-friend="${i}" data-player-id="${u.id}">Добавить</button></div>`).join('');
}
async function searchTelegramPlayers(){
  const q=($('#friendSearch')?.value||'').trim().replace(/^@/,'');
  if(!q){toast('Введите Telegram username');return}
  if(!api.enabled){toast('Откройте приложение внутри Telegram для поиска реальных игроков');return}
  const box=$('#friendSearchResults'); box.innerHTML='<div class="empty-state">Ищем игрока…</div>';
  try{
    const res=await fetch('/api/players/search?username='+encodeURIComponent(q),{headers:{'Accept':'application/json','X-Telegram-Init-Data':api.initData}});
    if(!res.ok)throw new Error('api');
    const data=await res.json(); renderFriendResults(Array.isArray(data.players)?data.players:[]);
  }catch(e){
    renderFriendResults([]);
    toast('Сервер поиска игроков пока не подключён');
  }
}
function totalAssets(){return Object.entries(state.holdings).reduce((s,[k,v])=>s+v*prices[k],0)}
function totalWorth(){return state.cash+totalAssets()}
function renderPortfolio(){let val=totalAssets();$('#topBalance').textContent=money(state.cash);$('#portfolioCash').textContent=money(state.cash);$('#assetValue').textContent=money(val);$('#operationCount').textContent=state.history.length;$('#homePortfolio').textContent=money(totalWorth());$('#profileWorth').textContent=money(totalWorth());$('#profileOps').textContent=state.history.length;$('#profileAssets').textContent=Object.values(state.holdings).filter(v=>v>0).length;$('#profileItems').textContent=state.owned.length;let entries=Object.entries(state.holdings).filter(([k,v])=>v>0);$('#holdings').innerHTML=entries.length?entries.map(([k,v])=>`<div class="holding-row"><span class="holding-left"><i class="coin-icon">${assets.find(a=>a.s===k)?.icon||'◈'}</i><span><b>${k}</b><small>${v.toFixed(6)} ед.</small></span></span><b>${money(v*prices[k])}</b></div>`).join(''):'<div class="empty-state">Пока активов нет. Перейдите в торговый терминал.</div>';$('#ownedItems').innerHTML=state.owned.length?state.owned.map(i=>`<span class="owned-chip">${items[i][1]} ${items[i][2]}</span>`).join(' '):'Коллекция пока пуста.'}
function renderHistory(){let h=$('#tradeHistory');h.innerHTML=state.history.length?state.history.slice().reverse().map(x=>`<div class="history-row"><span>${x.side==='above'?'Выше':'Ниже'} ${x.asset}</span><span>${x.qty.toFixed(6)} ед.</span><b>${money(x.amount)}</b><span class="muted">${x.time}</span></div>`).join(''):'<div class="empty-state">Пока нет операций. Сделайте первую тренировочную сделку.</div>'}
function drawChart(){const canvas=$('#priceChart');if(!canvas)return;let ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);let base=prices[$('#tradeAsset').value],vals=[],v=base*.94;for(let i=0;i<72;i++){v+=((Math.random()-.48)*base*.008);vals.push(v)}vals[71]=base;let min=Math.min(...vals)*.99,max=Math.max(...vals)*1.01;ctx.strokeStyle='#202c39';ctx.lineWidth=1;ctx.font='10px Inter';ctx.fillStyle='#718092';for(let i=0;i<5;i++){let y=15+i*(h-35)/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();ctx.fillText(money(max-(max-min)*i/4).replace('₽ ',''),w-85,y-4)}let xstep=(w-95)/(vals.length-1),plotH=h-35;let yval=p=>10+(max-p)/(max-min)*(plotH-10);if(state.chartType==='line'){ctx.beginPath();vals.forEach((p,i)=>{let x=i*xstep,y=yval(p);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.strokeStyle='#f5a623';ctx.lineWidth=2;ctx.stroke();ctx.lineTo((vals.length-1)*xstep,h-25);ctx.lineTo(0,h-25);ctx.closePath();let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f59e0b33');g.addColorStop(1,'#f59e0b00');ctx.fillStyle=g;ctx.fill()}else{for(let i=0;i<vals.length;i++){let open=vals[i-1]||vals[i],close=vals[i],high=Math.max(open,close)+Math.random()*base*.002,low=Math.min(open,close)-Math.random()*base*.002,x=i*xstep,color=close>=open?'#22c77a':'#ef5966';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,yval(high));ctx.lineTo(x,yval(low));ctx.stroke();let top=Math.min(yval(open),yval(close)),bh=Math.max(2,Math.abs(yval(open)-yval(close)));ctx.fillRect(x-2,top,4,bh)}}ctx.strokeStyle='#f59e0b';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,yval(base));ctx.lineTo(w-90,yval(base));ctx.stroke();ctx.setLineDash([]);
  const markers=state.tradeMarkers.filter(m=>m.asset===$('#tradeAsset').value);
  markers.forEach(m=>{
    const mx=Math.max(8,Math.min(w-100,(m.index/71)*(w-95)));
    const my=yval(m.price);
    ctx.fillStyle=m.side==='above'?'#22c77a':'#ef5966';
    ctx.beginPath();ctx.arc(mx,my,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e8edf4';ctx.font='9px Inter';ctx.fillText(m.side==='above'?'ВЫШЕ':'НИЖЕ',mx+8,my-6);
  });
}
function updateTradeEstimate(){let asset=$('#tradeAsset').value,amount=Math.max(0,+$('#tradeAmount').value||0);$('#estimatedQty').textContent=(amount/prices[asset]).toFixed(6)+' '+asset;$('#tradePrice').textContent=money(prices[asset]);let a=assets.find(x=>x.s===asset);$('#tradeChange').textContent=(a.change>0?'+':'')+a.change.toFixed(2)+'% за период';drawChart()}
function modal(html){$('#modalContent').innerHTML=html;$('#modalBackdrop').classList.add('open')}
function closeModal(){$('#modalBackdrop').classList.remove('open')}
function trade(){
  let asset=$('#tradeAsset').value,amount=+$('#tradeAmount').value,side=state.tradeSide;
  if(!Number.isFinite(amount)||amount<100){toast('Минимальная сумма — 100 ₽');return}
  if(amount>state.cash){toast('Недостаточно виртуальных рублей');return}
  const price=prices[asset], qty=amount/price;
  state.cash-=amount;
  state.tradeMarkers.push({asset,amount,price,side,index:71,time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})});
  state.history.push({asset,amount,qty,side,time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})});
  renderPortfolio();renderHistory();drawChart();syncState();
  toast(`Сделка «${side==='above'?'Выше':'Ниже'}» подтверждена — точка отмечена на графике`);
}
function openP2P(index){let s=sellers[index],asset=$('#p2pAsset').value,price=asset==='BTC'?+s[3].replaceAll(' ',''):prices[asset]*1.006,available=asset==='BTC'?+s[2]:5000,initial=asset==='BTC'?0.001:10;modal(`<h2>Покупка у ${s[0]}</h2><p>Рейтинг ★ ${s[1]} · ${fmt(available)} ${asset} доступно · способы: ${s[5]}</p><label>Цена за единицу</label><input value="${money(price)}" disabled><label>Количество ${asset}</label><input id="p2pQty" type="number" min="0.001" step="0.001" value="${initial}"><label>Сумма в рублях</label><input id="p2pTotal" value="${money(price*initial)}" disabled><p>Лимит объявления: ${s[4]}. Сделка полностью виртуальная, переводов не производится.</p><div class="modal-actions"><button class="outline-btn" id="openChat">Открыть чат</button><button class="btn btn-orange" id="confirmP2P">Подтвердить демо</button></div>`);$('#p2pQty').addEventListener('input',()=>$('#p2pTotal').value=money(Math.max(0,+$('#p2pQty').value)*price));$('#confirmP2P').onclick=()=>{let q=+$('#p2pQty').value,total=q*price;if(q<=0||q>available||total>state.cash){toast('Проверь количество и виртуальный баланс');return}state.cash-=total;state.holdings[asset]=(state.holdings[asset]||0)+q;state.history.push({asset,amount:total,qty:q,side:'buy',time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})});closeModal();renderPortfolio();renderHistory();toast('Демо-P2P сделка завершена')};$('#openChat').onclick=()=>openChat(s[0])}
function openChat(name){modal(`<h2>Чат с ${name}</h2><p>Учебный чат с демо-персонажем — сообщения не отправляются реальным людям.</p><div class="chat-box" id="chatBox"><div class="chat-msg">${name}: Здравствуйте! Готов ответить на вопросы по объявлению.</div><div class="chat-msg">${name}: Укажите желаемое количество, и мы обсудим условия демо-сделки.</div></div><div class="chat-compose"><input id="chatInput" placeholder="Напишите сообщение..."><button class="btn btn-orange" id="sendChat">Отправить</button></div>`);$('#sendChat').onclick=()=>{let input=$('#chatInput'),v=input.value.trim();if(!v)return;$('#chatBox').insertAdjacentHTML('beforeend',`<div class="chat-msg me">${v.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>`);input.value='';$('#chatBox').scrollTop=$('#chatBox').scrollHeight;setTimeout(()=>$('#chatBox').insertAdjacentHTML('beforeend',`<div class="chat-msg">${name}: Спасибо! Это демо-чат, сообщение принято в симуляторе.</div>`),450)}}
function renderAll(){renderTickers();renderAssets();renderHomeOffers();renderMarket();renderP2P();renderStore();renderFriends();renderPortfolio();renderHistory();if(state.page==='trading')updateTradeEstimate()}
$$('#marketTabs .tab').forEach(b=>b.onclick=()=>{$$('#marketTabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.marketFilter=b.dataset.filter;renderMarket()});
$('#assetSearch').oninput=renderMarket;$('#friendSearchBtn')?.addEventListener('click',searchTelegramPlayers);$('#friendSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchTelegramPlayers()});
$$('#storeTabs .tab').forEach(b=>b.onclick=()=>{$$('#storeTabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.storeCategory=b.dataset.category;renderStore()});
$$('#p2pSide .tab').forEach(b=>b.onclick=()=>{$$('#p2pSide .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.p2pSide=b.dataset.side;renderP2P()});
$('#p2pAsset').onchange=renderP2P;$('#p2pSort').onchange=renderP2P;$('#sellerSearch').oninput=renderP2P;
document.addEventListener('click',e=>{let t=e.target.closest('[data-trade]');if(t){go('trading');$('#tradeAsset').value=t.dataset.trade;updateTradeEstimate()}let p=e.target.closest('[data-buy-seller]');if(p)openP2P(+p.dataset.buySeller);let item=e.target.closest('[data-buy-item]');if(item){let id=+item.dataset.buyItem,x=items[id];if(state.owned.includes(id)){toast('Этот предмет уже в коллекции');return}if(state.cash<x[4]){toast('Недостаточно виртуальных рублей');return}state.cash-=x[4];state.owned.push(id);renderPortfolio();renderStore();syncState();toast('Предмет добавлен в виртуальную коллекцию')}let op=e.target.closest('[data-open-p2p]');if(op){go('p2p');let i=sellers.findIndex(s=>s[0]===op.dataset.openP2p);openP2P(Math.max(0,i))}let af=e.target.closest('[data-add-friend]');if(af && af.dataset.playerId){if(!api.enabled){toast('Откройте приложение внутри Telegram');return}api.request('/api/friends/request',{method:'POST',body:JSON.stringify({targetId:af.dataset.playerId})}).then(()=>toast('Заявка отправлена игроку')).catch(err=>toast(err.message));return}let fs=e.target.closest('[data-friend-search]');if(fs){const id=fs.dataset.playerId;api.request('/api/players/'+encodeURIComponent(id)).then(r=>{const p=r.player;modal(`<h2>${p.name||p.username}</h2><p>@${p.username||'без username'}</p><div class="profile-stat"><span>Telegram ID</span><b>${p.id}</b></div><div class="profile-stat"><span>Статус</span><b class="up">Игрок</b></div><div class="modal-actions"><button class="btn btn-orange" data-add-friend="1" data-player-id="${p.id}">Добавить в друзья</button></div>`)}).catch(err=>toast(err.message));return}let fr=e.target.closest('[data-friend]');if(fr)modal(`<h2>${fr.dataset.friend}</h2><p>Профиль участника вашей игровой сети.</p><div class="profile-stat"><span>Статус</span><b class="up">Игрок</b></div>`)});
$('#tradeAsset').onchange=updateTradeEstimate;$('#tradeAmount').oninput=()=>{$('#estimatedQty').textContent=(Math.max(0,+$('#tradeAmount').value||0)/prices[$('#tradeAsset').value]).toFixed(6)+' '+$('#tradeAsset').value};
$$('#chartIntervals .tab').forEach(b=>b.onclick=()=>{$$('#chartIntervals .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.interval=b.dataset.interval;drawChart()});
$('#chartType').onclick=()=>{state.chartType=state.chartType==='candle'?'line':'candle';$('#chartType').textContent=state.chartType==='candle'?'Свечи':'Линия';drawChart()};
$$('.direction').forEach(b=>b.onclick=()=>{$$('.direction').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.tradeSide=b.dataset.side});
$$('.quick-amounts button').forEach(b=>b.onclick=()=>{$('#tradeAmount').value=b.dataset.amount;updateTradeEstimate()});
$('#placeTrade').onclick=trade;$('#clearHistory').onclick=()=>{state.history=[];renderHistory();renderPortfolio();toast('История демо-сессии очищена')};
$('#closeModal').onclick=closeModal;$('#modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal()};
$('#dailyBonus').onclick=()=>{if(state.bonusClaimed){toast('Бонус уже получен в этой сессии');return}state.cash+=10000;state.bonusClaimed=true;$('#dailyBonus').textContent='Получено ✓';renderPortfolio();toast('Виртуальный бонус +10 000 ₽')};
$('#notifications').onclick=()=>toast('Новых уведомлений нет');
window.addEventListener('resize',()=>{if(state.page==='trading')drawChart()});
setInterval(()=>{assets.forEach(a=>{let delta=(Math.random()-.49)*.0018;prices[a.s]*=(1+delta)});renderTickers();if(state.page==='trading')updateTradeEstimate();if(state.page==='market')renderMarket();renderPortfolio()},5000);
renderAll();updateTradeEstimate();bootServer();