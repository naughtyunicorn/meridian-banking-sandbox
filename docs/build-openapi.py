import json
from pathlib import Path
ref=lambda n:{'$ref':f'#/components/schemas/{n}'}
string={'type':'string'}
amount={'type':'integer','minimum':1,'maximum':100000000000,'description':'Integer minor units (cents for USD/EUR/GBP); no floating-point amounts.'}
account={'type':'string','enum':['operating-usd','customer-usd','operating-eur','customer-eur','operating-gbp','customer-gbp']}
commands={
 'transfer':({'from':account,'to':account,'amount':amount},['from','to','amount']),
 'payment':({'from':account,'amount':amount,'rail':{'type':'string','enum':['ACH','FedNow','SWIFT','SEPA']},'beneficiary':{'type':'string','minLength':1,'maxLength':150},'risk':{'type':'string','enum':['blocked'],'description':'Explicit synthetic sanctions-test flag; not real screening.'}},['from','amount','rail','beneficiary']),
 'tokenTransfer':({'from':account,'to':account,'amount':amount},['from','to','amount']),
 'settlePayment':({'paymentId':string},['paymentId']),
 'resolveCase':({'caseId':string,'decision':{'type':'string','enum':['approve','reject']}},['caseId','decision']),
 'mint':({'from':account,'amount':amount},['from','amount']),
 'burn':({'to':account,'amount':amount},['to','amount']),
 'cardFreeze':({'cardId':string,'frozen':{'type':'boolean'}},['cardId','frozen']),
 'cardAuthorize':({'cardId':string,'amount':amount,'merchant':{'type':'string','minLength':1}},['cardId','amount','merchant']),
 'consent':({'name':{'type':'string','minLength':1},'scopes':{'type':'array','minItems':1,'items':{'type':'string','enum':['accounts:read','transactions:read','payments:write']}},'expiresInHours':{'type':'integer','minimum':1,'maximum':720,'default':24}},['name','scopes']),
 'revokeConsent':({'consentId':string},['consentId'])
}
schemas={
 'Error':{'type':'object','required':['error','code'],'properties':{'error':string,'code':string}},
 'Account':{'type':'object','required':['id','name','currency','balance','held','available','type'],'properties':{'id':string,'name':string,'currency':{'type':'string','enum':['USD','EUR','GBP']},'balance':{'type':'integer'},'held':{'type':'integer'},'available':{'type':'integer'},'type':{'type':'string','enum':['operating','customer','asset','clearing','reserve']}}},
 'Snapshot':{'type':'object','required':['mode','accounts','transactions','payments','cases','cards','consents','chain','stablecoin','metrics','rails'],'properties':{'mode':{'const':'sandbox'},'accounts':{'type':'array','items':ref('Account')},**{n:{'type':'array','items':{'type':'object','additionalProperties':True}} for n in ['transactions','payments','cases','cards','consents','chain','rails']},'stablecoin':{'type':'object','properties':{'symbol':string,'supply':{'type':'integer'},'reserves':{'type':'integer'},'coverage':{'type':'number'},'holders':{'type':'object','additionalProperties':{'type':'integer'}},'chainId':string,'network':string}},'metrics':{'type':'object','additionalProperties':True}},'additionalProperties':True},
 'CommandResponse':{'type':'object','required':['result','state'],'properties':{'result':{'type':'object','additionalProperties':True},'state':ref('Snapshot')}}
}
for name,(props,required) in commands.items():
 schemas[name]={'type':'object','required':['type','idempotencyKey',*required],'properties':{'type':{'const':name},'idempotencyKey':{'type':'string','minLength':1,'maxLength':128},**props}}
schemas['Command']={'oneOf':[ref(n) for n in commands],'discriminator':{'propertyName':'type'}}
response=lambda schema,description='Success':{'description':description,'content':{'application/json':{'schema':schema}}}
errors={str(n):response(ref('Error'),d) for n,d in [(400,'Invalid command or malformed JSON'),(401,'Configured sandbox token missing/invalid'),(403,'Consent or same-origin check failed'),(409,'Idempotency key reused with a different payload'),(413,'JSON request exceeds 65536 bytes'),(415,'Content-Type must be application/json'),(422,'Insufficient available funds'),(500,'Internal sandbox error')]}
paths={
 '/api/health':{'get':{'summary':'Sandbox health and real-money flag','responses':{'200':response({'type':'object','properties':{'status':{'const':'ok'},'mode':{'const':'sandbox'},'realMoneyEnabled':{'const':False}}}),'401':errors['401']}}},
 '/api/snapshot':{'get':{'summary':'Read full single-operator synthetic sandbox state','responses':{'200':response(ref('Snapshot')),'401':errors['401']}}},
 '/api/state':{'get':{'summary':'Alias for /api/snapshot','responses':{'200':response(ref('Snapshot')),'401':errors['401']}}},
 '/api/commands':{'post':{'summary':'Execute an idempotent simulator command','description':'Same key plus identical payload returns original result. Reusing a key with a different payload returns 409. Browser Origin, when supplied, must match Host. Simulated settlement does not send or settle money. Mint/burn track synthetic token ownership by account; burn requires the destination account to own enough tokens. The sandbox operator still administers every account without tenant RBAC. Consent payments:write is demonstrative and does not grant command access.','requestBody':{'required':True,'content':{'application/json':{'schema':ref('Command'),'examples':{'transfer':{'value':{'type':'transfer','from':'operating-usd','to':'customer-usd','amount':12500,'idempotencyKey':'transfer-demo-001'}},'mint':{'value':{'type':'mint','from':'operating-usd','amount':10000,'idempotencyKey':'mint-demo-001'}}}}}},'responses':{'200':response(ref('CommandResponse')),**errors}}}
}
for resource,scope in [('accounts','accounts:read'),('transactions','transactions:read')]:
 paths[f'/api/open-banking/{resource}']={'get':{'summary':f'Read {resource} with a simulated consent','description':f'Requires active, unexpired X-Consent-ID containing {scope}. Not OAuth, FAPI, third-party identity or resource-owner isolation. Account endpoint excludes internal asset/clearing/reserve accounts.','parameters':[{'in':'header','name':'X-Consent-ID','required':True,'schema':string}],'responses':{'200':response({'type':'object','properties':{'mode':{'const':'sandbox'},'data':{'type':'array','items':ref('Account') if resource=='accounts' else {'type':'object','additionalProperties':True}}}}),'401':errors['401'],'403':errors['403']}}}
spec={'openapi':'3.1.0','info':{'title':'Meridian sandbox API','version':'0.1.0','description':'Synthetic U.S./international banking simulator. No real funds, live network access, authorized stablecoin issuance, official sanctions screening or regulatory certification. The optional sandbox bearer token applies to all /api paths when configured. Local default has no token; use trusted local execution or owner-private hosting only. Hosted adapter behavior may differ; this contract documents the local Node service.'},'servers':[{'url':'http://127.0.0.1:3000','description':'Local sandbox default'}],'security':[{'SandboxToken':[]},{}],'paths':paths,'components':{'securitySchemes':{'SandboxToken':{'type':'http','scheme':'bearer','description':'Optional SANDBOX_API_TOKEN; when configured, every API request requires this token. This is not OAuth.'}},'schemas':schemas}}
Path(__file__).with_name('openapi.json').write_text(json.dumps(spec,indent=2)+'\n')
