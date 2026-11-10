const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const tg=window.Telegram?.WebApp; if(tg){tg.ready();tg.expand();}
const tgUser=tg?.initDataUnsafe?.user;
const displayName=tgUser?.first_name || "Гость";
const username=tgUser?.username ? "@"+tgUser.username : "@demo_user";
$("#welcomeName").textContent=displayName;$("#profileName").textContent=displayName;$("#profileHandle").textContent=username;$("#avatar").textContent=(displayName[0]||"Г").toUpperCase();
let balance=25000, deals=0, profit=0, friends=[], transactions=[];
const demoUsers=[
 {name:"Alex Morgan",handle:"@alex_demo",rating:"4.9",deals:38,online:true,initial:"A"},
 {name:"Mila Stone",handle:"@mila_p2p",rating:"4.8",deals:24,online:true,initial:"M"},
 {name:"Daniel Fox",handle:"@daniel_demo",rating:"5.0",deals:51,online:false,initial:"D"},
 {name:"Nora Lane",handle:"@nora_exchange",rating:"4.7",deals:17,online:true,initial:"N"},
 {name:"Leo North",handle:"@leo_market",rating:"4.9",deals:42,online:false,initial:"L"},
 {name:"Eva Green",handle:"@eva_demo",rating:"4.8",deals:29,online:true,initial:"E"}
];
let offers=demoUsers.map((u,i)=>({...u,type:i%2?"sell":"buy",asset:["USDT","BTC","ETH"][i%3],price:[83.2,82.7,68100,67950,3120,3095][i],amount:[150,220,0.015,0.02,0.4,0.6][i]}));
const money=n=>Math.round(n).toLocaleString("ru-RU")+" ₽";
function renderBalance(){ $("#balance").textContent=money(balance);$("#walletBalance").textContent=money(balance);}
function renderStats(){ $("#statDeals").textContent=deals;$("#statProfit").textContent=money(profit);$("#statRate").textContent=deals?"100%":"—";$("#pDeals").textContent=deals;$("#pProfit").textContent=money(profit);}
function toast(s){let t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function showPage(id){$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));}
$$("[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));$$("[data-go]").forEach(b=>b.onclick=()=>showPage(b.dataset.go));
const prices={USD:83,USDT:83.1,BTC:6810000,ETH:312000,TON:425};
function renderQuotes(){ $("#quotes").innerHTML=Object.entries(prices).map(([k,v])=>`<div class="quote"><small>${k} / RUB</small><b>${v.toLocaleString("ru-RU",{maximumFractionDigits:2})} ₽</b><span class="${Math.random()>.5?"up":"down"}">${Math.random()>.5?"▲":"▼"} ${(.02+Math.random()*.4).toFixed(2)}%</span></div>`).join("");}
function renderOffers(filter="all"){let list=offers.filter(o=>filter==="all"||o.type===filter);$("#offerCount").textContent=list.length+" заявок";$("#offers").innerHTML=list.map((o,i)=>`<article class="offer"><div class="offer-top"><div class="userline"><div class="mini-avatar">${o.initial}</div><div><b>${o.name}</b><br><small>${o.handle} · ★ ${o.rating} · ${o.deals} демо-сделок</small></div></div><span class="tag ${o.type}">${o.type==="buy"?"Покупает":"Продаёт"}</span></div><h3>${o.type==="buy"?"Покупка":"Продажа"} ${o.asset}</h3><div class="offer-price">${o.price.toLocaleString("ru-RU")} ₽ <small>/ единица</small></div><small>Объём: ${o.amount} ${o.asset} · Участник: демо-бот</small><div class="offer-actions"><button class="primary" data-deal="${i}">Открыть демо-сделку</button><button class="ghost" data-user="${o.handle}">Профиль</button></div></article>`).join("");$$("[data-deal]").forEach(b=>b.onclick=()=>{deals++;profit+=Math.round((Math.random()-.35)*250);renderStats();$("#activity").innerHTML=`<div class="transaction"><span>Демо-сделка с ${list[+b.dataset.deal].handle}</span><b>Завершена</b></div>`+$("#activity").innerHTML;toast("Демо-сделка завершена");});$$("[data-user]").forEach(b=>b.onclick=()=>toast("Это демонстрационный профиль"));}
$$("[data-filter]").forEach(b=>b.onclick=()=>{$$("[data-filter]").forEach(x=>x.classList.toggle("selected",x===b));renderOffers(b.dataset.filter);});
let method="rub";$$("[data-method]").forEach(b=>b.onclick=()=>{method=b.dataset.method;$$("[data-method]").forEach(x=>x.classList.toggle("selected",x===b));$("#depositLabel").textContent=method==="rub"?"Сумма в виртуальных рублях":"Количество виртуальных Stars";$("#depositAmount").value=method==="rub"?100:1;updateConversion();});
function updateConversion(){let n=Math.max(1,Math.floor(Number($("#depositAmount").value)||1));$("#conversion").textContent="Будет начислено: "+money(method==="rub"?n:n*1000);}
$("#depositAmount").addEventListener("input",updateConversion);
$("#depositBtn").onclick=()=>{let n=Math.max(1,Math.floor(Number($("#depositAmount").value)||1));let amount=method==="rub"?n:n*1000;balance+=amount;transactions.unshift({label:method==="rub"?"Тестовое начисление RUB":"Тестовое начисление Stars",amount});renderBalance();$("#transactions").innerHTML=transactions.map(t=>`<div class="transaction"><span>${t.label}</span><b>+${money(t.amount)}</b></div>`).join("");toast("Добавлены виртуальные средства");};
$$("[data-profiletab]").forEach(b=>b.onclick=()=>{$$("[data-profiletab]").forEach(x=>x.classList.toggle("selected",x===b));$("#profileStats").classList.toggle("hidden",b.dataset.profiletab!=="stats");$("#friendsPanel").classList.toggle("hidden",b.dataset.profiletab!=="friends");});
$("#friendSearchBtn").onclick=()=>{let q=$("#friendSearch").value.trim().replace(/^@/,"").toLowerCase();let u=demoUsers.find(x=>x.handle.slice(1).toLowerCase()===q||x.name.toLowerCase()===q);$("#friendResult").innerHTML=u?`<div class="friend-row"><span><b>${u.name}</b><br><small>${u.handle} · ${u.online?"онлайн в демо":"не в сети"} · ${u.deals} демо-сделок</small></span><button class="primary" id="addFriend">Добавить</button></div>`:`<p class="muted">В демо-каталоге такой профиль не найден.</p>`;if(u)$("#addFriend").onclick=()=>{if(!friends.some(f=>f.handle===u.handle))friends.push(u);$("#friendList").innerHTML=friends.map(f=>`<div class="friend-row"><span><b>${f.name}</b><br><small>${f.handle} · ${f.deals} демо-сделок · ${f.online?"онлайн в демо":"не в сети"}</small></span><span class="pill">ДРУГ</span></div>`).join("");toast("Добавлен демо-профиль");};};
renderBalance();renderStats();renderQuotes();renderOffers();updateConversion();
setInterval(()=>{Object.keys(prices).forEach(k=>prices[k]*=1+(Math.random()-.5)*.0015);renderQuotes();},5000);
setInterval(()=>{$("#onlineCount").textContent=8+Math.floor(Math.random()*12);},7000);
