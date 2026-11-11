const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MAX_INIT_AGE = Number(process.env.TELEGRAM_INITDATA_MAX_AGE || 86400);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ players: {}, friendRequests: [] }, null, 2));

function readDb(){ try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return {players:{},friendRequests:[]};} }
function writeDb(db){ const tmp=DB_FILE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2)); fs.renameSync(tmp,DB_FILE); }
function now(){return new Date().toISOString();}
function defaultState(){return {cash:100000,holdings:{BTC:0.001,ETH:1,USDT:100},history:[],owned:[],tradeMarkers:[]};}
function normalizeUser(u){return {id:String(u.id),username:u.username||'',firstName:u.first_name||'',lastName:u.last_name||'',name:[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||'Игрок',photoUrl:u.photo_url||'',updatedAt:now()};}
function ensurePlayer(db,u){const id=String(u.id);if(!db.players[id]) db.players[id]={...normalizeUser(u),state:defaultState(),createdAt:now()};else {db.players[id]={...db.players[id],...normalizeUser(u)};db.players[id].state ||= defaultState();}return db.players[id];}
function publicPlayer(p){return {id:p.id,username:p.username,name:p.name,firstName:p.firstName,lastName:p.lastName,photoUrl:p.photoUrl};}
function telegramCheck(initData){
  if(!BOT_TOKEN)return {ok:false,error:'TELEGRAM_BOT_TOKEN не настроен на сервере'};
  if(!initData)return {ok:false,error:'Нет Telegram initData'};
  const params=new URLSearchParams(initData);const received=params.get('hash');if(!received)return {ok:false,error:'В initData отсутствует hash'};params.delete('hash');
  const authDate=Number(params.get('auth_date')||0);if(!authDate||Math.floor(Date.now()/1000)-authDate>MAX_INIT_AGE)return {ok:false,error:'Telegram initData устарел'};
  const check=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(BOT_TOKEN).digest();const expected=crypto.createHmac('sha256',secret).update(check).digest('hex');
  const a=Buffer.from(received,'hex'),b=Buffer.from(expected,'hex');if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return {ok:false,error:'Неверная подпись Telegram'};
  try{const user=JSON.parse(params.get('user')||'{}');if(!user.id)return {ok:false,error:'Telegram user.id отсутствует'};return {ok:true,user};}catch{return {ok:false,error:'Некорректные данные пользователя Telegram'};}
}
function parseBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>200000)reject(new Error('body too large'));});req.on('end',()=>{if(!s)return resolve({});try{resolve(JSON.parse(s));}catch{reject(new Error('invalid json'));}});});}
function sendJson(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
function auth(req,db){const init=req.headers['x-telegram-init-data'];const check=telegramCheck(init);if(!check.ok)return {error:check.error};const player=ensurePlayer(db,check.user);return {player};}
async function api(req,res,url){
  const db=readDb();
  if(req.method==='GET'&&url.pathname==='/api/health')return sendJson(res,200,{ok:true,telegramConfigured:Boolean(BOT_TOKEN)});
  let body={}; if(req.method==='POST')try{body=await parseBody(req);}catch(e){return sendJson(res,400,{error:e.message});}
  const a=auth(req,db); if(a.error)return sendJson(res,401,{error:a.error,code:'TELEGRAM_AUTH_REQUIRED'}); const player=a.player;
  if(req.method==='POST'&&url.pathname==='/api/auth')return sendJson(res,200,{player:publicPlayer(player),state:player.state});
  if(req.method==='GET'&&url.pathname==='/api/me')return sendJson(res,200,{player:publicPlayer(player),state:player.state});
  if(req.method==='GET'&&url.pathname==='/api/players/search'){
    const q=String(url.searchParams.get('username')||'').trim().replace(/^@/,'').toLowerCase();
    const players=Object.values(db.players).filter(p=>p.id!==player.id&&q&&[p.username,p.name,p.firstName,p.lastName].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,20).map(p=>({...publicPlayer(p),online:false}));
    return sendJson(res,200,{players});
  }
  const pm=url.pathname.match(/^\/api\/players\/([^/]+)$/); if(req.method==='GET'&&pm){const p=db.players[pm[1]];if(!p)return sendJson(res,404,{error:'Игрок не найден'});return sendJson(res,200,{player:publicPlayer(p)});}
  if(req.method==='POST'&&url.pathname==='/api/friends/request'){
    const target=String(body.targetId||'');if(!target||!db.players[target])return sendJson(res,404,{error:'Игрок не найден'});if(target===player.id)return sendJson(res,400,{error:'Нельзя добавить себя'});
    const exists=db.friendRequests.find(r=>r.from===player.id&&r.to===target&&r.status==='pending');if(exists)return sendJson(res,200,{ok:true,status:'pending'});
    db.friendRequests.push({id:crypto.randomUUID(),from:player.id,to:target,status:'pending',createdAt:now()});writeDb(db);return sendJson(res,200,{ok:true,status:'pending'});
  }
  if(req.method==='GET'&&url.pathname==='/api/friends'){
    const ids=new Set();for(const r of db.friendRequests){if(r.status!=='accepted')continue;if(r.from===player.id)ids.add(r.to);if(r.to===player.id)ids.add(r.from);}
    const friends=[...ids].map(id=>db.players[id]).filter(Boolean).map(publicPlayer);const incoming=db.friendRequests.filter(r=>r.to===player.id&&r.status==='pending').map(r=>({...r,player:publicPlayer(db.players[r.from])}));const outgoing=db.friendRequests.filter(r=>r.from===player.id&&r.status==='pending').map(r=>({...r,player:publicPlayer(db.players[r.to])}));return sendJson(res,200,{friends,incoming,outgoing});
  }
  const accept=url.pathname.match(/^\/api\/friends\/([^/]+)\/accept$/);if(req.method==='POST'&&accept){const r=db.friendRequests.find(x=>x.id===accept[1]&&x.to===player.id&&x.status==='pending');if(!r)return sendJson(res,404,{error:'Заявка не найдена'});r.status='accepted';r.updatedAt=now();writeDb(db);return sendJson(res,200,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/api/state'){
    const st=body.state;if(!st||typeof st!=='object')return sendJson(res,400,{error:'Некорректное состояние'});player.state={cash:Math.max(0,Number(st.cash)||0),holdings:st.holdings||defaultState().holdings,history:Array.isArray(st.history)?st.history.slice(-200):[],owned:Array.isArray(st.owned)?st.owned.slice(0,500):[],tradeMarkers:Array.isArray(st.tradeMarkers)?st.tradeMarkers.slice(-200):[]};writeDb(db);return sendJson(res,200,{ok:true,state:player.state});
  }
  if(req.method==='POST'&&url.pathname==='/api/trades'){
    const prices={BTC:6341280,ETH:314325,TON:721.4,SOL:14739,USDT:92.4};const asset=String(body.asset||'');const amount=Number(body.amount||0);const side=body.side==='below'?'below':'above';
    if(!prices[asset])return sendJson(res,400,{error:'Неизвестный актив'});if(!Number.isFinite(amount)||amount<100)return sendJson(res,400,{error:'Минимальная сумма — 100 ₽'});if(amount>Number(player.state.cash))return sendJson(res,400,{error:'Недостаточно виртуальных рублей'});
    const qty=amount/prices[asset];player.state.cash-=amount;const time=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});const trade={asset,amount,price:prices[asset],side,index:71,time};player.state.tradeMarkers.push(trade);player.state.history.push({asset,amount,qty,side,time});writeDb(db);return sendJson(res,200,{ok:true,state:player.state,trade:{...trade,qty}});
  }
  return sendJson(res,404,{error:'API route not found'});
}

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(url.pathname.startsWith('/api/'))return api(req,res,url);
  let file=url.pathname==='/'?path.join(ROOT,'index.html'):path.join(ROOT,url.pathname.replace(/^\//,''));
  if(!file.startsWith(ROOT)||file.includes('..'))return sendJson(res,403,{error:'Forbidden'});
  try{const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{const data=fs.readFileSync(path.join(ROOT,'index.html'));res.writeHead(200,{'Content-Type':mime['.html']});res.end(data);}
});
server.listen(PORT,()=>console.log(`BYBIT simulator server: http://localhost:${PORT}`));
