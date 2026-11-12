import {createHash, randomUUID} from 'node:crypto';
const clone = value => structuredClone(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id = prefix => `${prefix}_${randomUUID().slice(0,8)}`;
const now = () => new Date().toISOString();
const requireThat = (condition, message, code='VALIDATION') => { if(!condition) { const error=new Error(message);error.code=code;throw error; } };
const rails = [{name:'ACH',currencies:['USD'],region:'United States',format:'Nacha-style simulation'}, {name:'FedNow',currencies:['USD'],region:'United States',format:'Instant payment simulation'}, {name:'SWIFT',currencies:['USD','EUR','GBP'],region:'International',format:'Correspondent payment simulation'}, {name:'SEPA',currencies:['EUR'],region:'Europe',format:'Euro payment simulation'}];
export function initialState() {
 const accounts=[];
 for(const [currency,operating,customer] of [['USD',12000000,8000000],['EUR',6000000,4000000],['GBP',4000000,2000000]]) {
 const c=currency.toLowerCase();
 accounts.push({id:`operating-${c}`,name:`Meridian operating · ${currency}`,currency,balance:operating,type:'operating'}, {id:`customer-${c}`,name:`Atlas Trading · ${currency}`,currency,balance:customer,type:'customer'}, {id:`bank-${c}`,name:`Simulated custody asset · ${currency}`,currency,balance:-(operating+customer),type:'asset'}, {id:`clearing-${c}`,name:`Payment clearing · ${currency}`,currency,balance:0,type:'clearing'});
 }
 accounts.push({id:'reserve-usd',name:'Restricted stablecoin reserve · USD',currency:'USD',balance:0,type:'reserve'});
 return {version:1,mode:'sandbox',accounts,transactions:[],payments:[],cases:[],cards:[{id:'card_atlas',name:'Atlas operational card',last4:'4242',accountId:'operating-usd',status:'active',limit:500000,spent:0}],consents:[],chain:[],stablecoin:{symbol:'mUSD',supply:0,holders:{},chainId:'meridian-local-1337'},idempotency:{},audit:[]};
}
export function createEngine(saved) {
 let state=clone(saved||initialState());
 if(!state.stablecoin.holders){requireThat(state.stablecoin.supply===0,'Saved token ownership requires migration');state.stablecoin.holders={};}
 function account(s,accountId) { const a=s.accounts.find(x=>x.id===accountId);requireThat(a,'Unknown account');return a; }
 function held(s,accountId) {return s.payments.filter(x=>x.from===accountId&&['queued','review'].includes(x.status)).reduce((sum,x)=>sum+x.amount,0);}
 function amount(n) {requireThat(Number.isSafeInteger(n)&&n>0&&n<=100000000000,'Amount must be a positive integer in minor units');}
 function spendable(s,a,n) {requireThat(['operating','customer'].includes(a.type),'Account is not spendable');requireThat(a.balance-held(s,a.id)>=n,'Insufficient available funds','INSUFFICIENT_FUNDS');}
 function post(s,from,to,n,type,reference) { const f=account(s,from),t=account(s,to);requireThat(f.id!==t.id,'Accounts must differ');requireThat(f.currency===t.currency,'Cross-currency transfers require an FX workflow');requireThat(Number.isSafeInteger(t.balance+n)&&Number.isSafeInteger(f.balance-n),'Balance overflow'); f.balance-=n;t.balance+=n; const tx={id:id('txn'),type,from,to,amount:n,currency:f.currency,timestamp:now(),reference,entries:[{accountId:from,delta:-n},{accountId:to,delta:n}]};s.transactions.unshift(tx);return tx; }
 function block(s,type,n,txId) {const data={index:s.chain.length,previousHash:s.chain.at(-1)?.hash||'0'.repeat(64),type,amount:n,transactionId:txId,timestamp:now()};s.chain.push({...data,hash:hash(data)});}
 function verifyChain() { return state.chain.every((b,i)=>{const {hash:stored,...data}=b;return stored===hash(data)&&b.previousHash===(i?state.chain[i-1].hash:'0'.repeat(64))}); }
 function snapshot() {
 const s=clone(state);delete s.idempotency;
 s.accounts=s.accounts.map(a=>({...a,held:held(state,a.id),available:a.balance-held(state,a.id)}));
 const reserves=account(state,'reserve-usd').balance;
 s.stablecoin={...s.stablecoin,reserves,coverage:s.stablecoin.supply?Math.round(reserves/s.stablecoin.supply*10000)/100:100,network:'Single-node hash-linked simulator; no distributed consensus'};
 s.rails=rails.map(r=>({...r,status:'simulated'}));
 s.metrics={ledgerBalanced:['USD','EUR','GBP'].every(c=>s.accounts.filter(a=>a.currency===c).reduce((sum,a)=>sum+a.balance,0)===0),pendingPayments:s.payments.filter(p=>['queued','review'].includes(p.status)).length,openCases:s.cases.filter(c=>c.status==='open').length,totalTransactions:s.transactions.length,chainValid:verifyChain(),reserveCovered:reserves>=s.stablecoin.supply,tokenOwnershipBalanced:Object.values(s.stablecoin.holders).reduce((sum,n)=>sum+n,0)===s.stablecoin.supply};
 return s;
 }
 function execute(s,c) {
 switch(c.type) {
 case 'transfer': {amount(c.amount);const f=account(s,c.from),t=account(s,c.to);spendable(s,f,c.amount);requireThat(['operating','customer'].includes(t.type),'Recipient account is not spendable');return post(s,c.from,c.to,c.amount,'transfer');}
 case 'payment': {amount(c.amount);const f=account(s,c.from),r=rails.find(x=>x.name===c.rail);requireThat(r&&r.currencies.includes(f.currency),'Rail does not support account currency');requireThat(typeof c.beneficiary==='string'&&c.beneficiary.trim().length>0&&c.beneficiary.length<=150,'Beneficiary is required');spendable(s,f,c.amount);const p={id:id('pay'),from:c.from,amount:c.amount,currency:f.currency,rail:c.rail,beneficiary:c.beneficiary.trim(),status:c.risk==='blocked'?'blocked':c.amount>=1000000?'review':'queued',timestamp:now()};s.payments.unshift(p);if(['review','blocked'].includes(p.status))s.cases.unshift({id:id('case'),paymentId:p.id,reason:p.status==='blocked'?'Explicit sandbox sanctions test flag':'Sandbox high-value threshold',status:p.status==='blocked'?'blocked':'open',timestamp:now()});return p;}
 case 'settlePayment': {const p=s.payments.find(x=>x.id===c.paymentId);requireThat(p&&p.status==='queued','Payment must be queued');p.status='settled';post(s,p.from,`clearing-${p.currency.toLowerCase()}`,p.amount,'payment',p.id);p.settledAt=now();return p;}
 case 'resolveCase': {const item=s.cases.find(x=>x.id===c.caseId);requireThat(item&&item.status==='open','Case must be open; blocked cases cannot be overridden');requireThat(['approve','reject'].includes(c.decision),'Decision must be approve or reject');const p=s.payments.find(x=>x.id===item.paymentId);requireThat(p?.status==='review','Payment must be under review');item.status=c.decision==='approve'?'approved':'rejected';item.resolvedAt=now();p.status=c.decision==='approve'?'queued':'rejected';return item;}
 case 'mint': {amount(c.amount);const a=account(s,c.from);requireThat(a.currency==='USD','Stablecoin mint requires USD');spendable(s,a,c.amount);const tx=post(s,a.id,'reserve-usd',c.amount,'stablecoin_mint');s.stablecoin.supply+=c.amount;s.stablecoin.holders[a.id]=(s.stablecoin.holders[a.id]||0)+c.amount;block(s,'mint',c.amount,tx.id);return {transactionId:tx.id,supply:s.stablecoin.supply};}
 case 'burn': {amount(c.amount);const a=account(s,c.to);requireThat(a.currency==='USD'&&['operating','customer'].includes(a.type),'Redemption requires a spendable USD account');requireThat(c.amount<=s.stablecoin.supply,'Amount exceeds stablecoin supply');requireThat((s.stablecoin.holders[a.id]||0)>=c.amount,'Amount exceeds owned token balance');requireThat(account(s,'reserve-usd').balance>=c.amount,'Insufficient reserve');s.stablecoin.supply-=c.amount;s.stablecoin.holders[a.id]-=c.amount;const tx=post(s,'reserve-usd',a.id,c.amount,'stablecoin_burn');block(s,'burn',c.amount,tx.id);return {transactionId:tx.id,supply:s.stablecoin.supply};}
 case 'tokenTransfer': {amount(c.amount);const f=account(s,c.from),t=account(s,c.to);requireThat(f.currency==='USD'&&t.currency==='USD'&&['operating','customer'].includes(f.type)&&['operating','customer'].includes(t.type),'Token transfers require spendable USD account holders');requireThat(f.id!==t.id,'Token holders must differ');requireThat((s.stablecoin.holders[f.id]||0)>=c.amount,'Amount exceeds owned token balance');s.stablecoin.holders[f.id]-=c.amount;s.stablecoin.holders[t.id]=(s.stablecoin.holders[t.id]||0)+c.amount;const reference=id('token');block(s,'transfer',c.amount,reference);return {id:reference,from:f.id,to:t.id,amount:c.amount,symbol:s.stablecoin.symbol};}
 case 'cardFreeze': {const card=s.cards.find(x=>x.id===c.cardId);requireThat(card,'Unknown card');requireThat(typeof c.frozen==='boolean','Frozen must be boolean');card.status=c.frozen?'frozen':'active';return card;}
 case 'cardAuthorize': {const card=s.cards.find(x=>x.id===c.cardId);requireThat(card,'Unknown card');requireThat(card.status==='active','Card is frozen');amount(c.amount);requireThat(card.spent+c.amount<=card.limit,'Card spending limit exceeded');requireThat(typeof c.merchant==='string'&&c.merchant.trim().length>0,'Merchant is required');spendable(s,account(s,card.accountId),c.amount);const p={id:id('pay'),from:card.accountId,amount:c.amount,currency:account(s,card.accountId).currency,rail:'Card',beneficiary:c.merchant.trim().slice(0,150),status:'queued',timestamp:now(),cardId:card.id};s.payments.unshift(p);card.spent+=c.amount;return p;}
 case 'consent': {const allowed=['accounts:read','transactions:read','payments:write'];requireThat(Array.isArray(c.scopes)&&c.scopes.length>0&&c.scopes.every(x=>allowed.includes(x)),'Invalid consent scope');requireThat(typeof c.name==='string'&&c.name.trim(),'Consent name required');const hours=c.expiresInHours??24;requireThat(Number.isInteger(hours)&&hours>0&&hours<=720,'Expiry must be 1–720 hours');const item={id:id('consent'),name:c.name.trim().slice(0,100),scopes:[...new Set(c.scopes)],status:'active',expiresAt:new Date(Date.now()+hours*3600000).toISOString()};s.consents.unshift(item);return item;}
 case 'revokeConsent': {const item=s.consents.find(x=>x.id===c.consentId);requireThat(item,'Unknown consent');item.status='revoked';return item;}
 default: requireThat(false,'Unknown command type');
 }
 }
 function validateIntegrity(s) {
 const currencies=['USD','EUR','GBP'];const owners=Object.values(s.stablecoin.holders);const supply=s.stablecoin.supply;
 requireThat(s.accounts.every(a=>Number.isSafeInteger(a.balance))&&currencies.every(currency=>s.accounts.filter(a=>a.currency===currency).reduce((sum,a)=>sum+a.balance,0)===0),'Ledger integrity check failed');
 requireThat(Number.isSafeInteger(supply)&&supply>=0&&owners.every(n=>Number.isSafeInteger(n)&&n>=0)&&owners.reduce((sum,n)=>sum+n,0)===supply&&account(s,'reserve-usd').balance===supply,'Token reserve integrity check failed');
 requireThat(s.chain.every((b,i)=>{const {hash:stored,...data}=b;return stored===hash(data)&&b.previousHash===(i?s.chain[i-1].hash:'0'.repeat(64))}),'Chain integrity check failed');
 }
 validateIntegrity(state);
 function command(c) {
 requireThat(c&&typeof c==='object'&&!Array.isArray(c),'Command object required');requireThat(typeof c.idempotencyKey==='string'&&c.idempotencyKey.length>=1&&c.idempotencyKey.length<=128,'Idempotency key required');
 const fingerprint=hash(c),old=state.idempotency[c.idempotencyKey];if(old){requireThat(old.fingerprint===fingerprint,'Idempotency key was used with a different payload','IDEMPOTENCY_CONFLICT');return clone(old.result);}
 const draft=clone(state),result=execute(draft,c);draft.audit.unshift({id:id('audit'),action:c.type,timestamp:now(),actor:'sandbox-operator',result:'success'});draft.idempotency[c.idempotencyKey]={fingerprint,result:clone(result)};validateIntegrity(draft);state=draft;return clone(result);
 }
 function authorizeConsent(consentId,scope) {const c=state.consents.find(x=>x.id===consentId);return !!(c&&c.status==='active'&&Date.parse(c.expiresAt)>Date.now()&&c.scopes.includes(scope));}
 return {snapshot,command,verifyChain,authorizeConsent,exportState:()=>clone(state)};
}
