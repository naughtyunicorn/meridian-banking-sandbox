/** SHA-256 portability shim for non-secret sandbox chain checksums only.
 * Production key operations belong in a reviewed HSM/KMS integration.
 * Node server uses node:crypto; equivalence is tested against that implementation.
 */
const rotate=(n,b)=>(n>>>b)|(n<<(32-b));
const primes=[];for(let n=2;primes.length<64;n++)if(!primes.some(p=>n%p===0))primes.push(n);
const constants=primes.map(p=>(Math.cbrt(p)%1*4294967296)>>>0);
const initial=primes.slice(0,8).map(p=>(Math.sqrt(p)%1*4294967296)>>>0);
function sha256(value){
 const input=new TextEncoder().encode(value),size=Math.ceil((input.length+9)/64)*64,bytes=new Uint8Array(size);bytes.set(input);bytes[input.length]=128;
 const view=new DataView(bytes.buffer);view.setUint32(size-8,Math.floor(input.length*8/4294967296));view.setUint32(size-4,(input.length*8)>>>0);
 const h=initial.slice(),words=new Uint32Array(64);
 for(let offset=0;offset<size;offset+=64){
  for(let i=0;i<16;i++)words[i]=view.getUint32(offset+i*4);
  for(let i=16;i<64;i++){const x=words[i-15],y=words[i-2];words[i]=(words[i-16]+(rotate(x,7)^rotate(x,18)^(x>>>3))+words[i-7]+(rotate(y,17)^rotate(y,19)^(y>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,j]=h;
  for(let i=0;i<64;i++){const t1=(j+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+words[i])>>>0;const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  [a,b,c,d,e,f,g,j].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
 }
 return h.map(n=>n.toString(16).padStart(8,'0')).join('');
}
export function createHash(algorithm){if(algorithm!=='sha256')throw new Error('Only SHA-256 supported');let value='';return {update(text){value+=text;return this;},digest(format){if(format!=='hex')throw new Error('Only hex supported');return sha256(value);}};}
export const randomUUID=()=>crypto.randomUUID();
