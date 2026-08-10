const DB_NAME='dalzzal-album-pwa'; const DB_VERSION=1; const STORE='state';
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
let state={folders:[],entries:[],theme:'light',generatorBlocks:['boy, solo, male focus','1.25::toned male::','black hair, short hair','school uniform','classroom background']};
let view={folderId:null,filter:'all',tag:null,query:''}; let workingImages=[]; let workingMetadata=null;
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function loadState(){const db=await openDB();const val=await new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly');const r=t.objectStore(STORE).get('app');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});if(val)state=val;applyTheme();renderAll()}
async function saveState(){const db=await openDB();await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(state,'app');t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark');$('#themeBtn').textContent=state.theme==='dark'?'☀':'☾'}
function folderMap(){return new Map(state.folders.map(f=>[f.id,f]))}
function folderPath(id){if(!id)return '전체 프롬프트';const map=folderMap();const parts=[];let cur=map.get(id),guard=0;while(cur&&guard++<20){parts.unshift(cur.name);cur=cur.parentId?map.get(cur.parentId):null}return parts.join(' / ')||'전체 프롬프트'}
function descendantIds(id){const out=new Set([id]);let changed=true;while(changed){changed=false;state.folders.forEach(f=>{if(f.parentId&&out.has(f.parentId)&&!out.has(f.id)){out.add(f.id);changed=true}})}return out}
function renderAll(){renderFolders();renderFolderSelects();renderTags();renderEntries();renderGenerator()}
function renderFolders(){const tree=$('#folderTree');const children=parent=>state.folders.filter(f=>(f.parentId||null)===(parent||null)).sort((a,b)=>a.name.localeCompare(b.name,'ko'));function branch(parent,depth=0){return children(parent).map(f=>`<div class="${depth?'folder-indent':''}"><div class="folder-item ${view.folderId===f.id?'active':''}" data-id="${f.id}"><button class="folder-main" data-folder="${f.id}">📁 ${esc(f.name)}</button><span class="folder-actions"><button data-fedit="${f.id}">✎</button><button data-fdel="${f.id}">×</button></span></div>${branch(f.id,depth+1)}</div>`).join('')}tree.innerHTML=`<div class="folder-item ${view.folderId===null?'active':''}"><button class="folder-main" data-folder="">◉ 전체</button></div>`+branch(null);$$('[data-folder]').forEach(b=>b.onclick=()=>{view.folderId=b.dataset.folder||null;view.tag=null;renderAll()});$$('[data-fedit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openFolderDialog(b.dataset.fedit)});$$('[data-fdel]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteFolder(b.dataset.fdel)})}
function renderFolderSelects(){for(const sel of [$('#entryFolder'),$('#folderParent')]){if(!sel)continue;const current=sel.value;sel.innerHTML='<option value="">없음 / 전체</option>'+state.folders.map(f=>`<option value="${f.id}">${'— '.repeat(depthOf(f.id))}${esc(f.name)}</option>`).join('');if([...sel.options].some(o=>o.value===current))sel.value=current}}
function depthOf(id){const map=folderMap();let n=0,cur=map.get(id),guard=0;while(cur?.parentId&&guard++<20){n++;cur=map.get(cur.parentId)}return n}
function currentEntries(){let entries=state.entries.filter(e=>view.filter==='trash'?e.trashed:!e.trashed);if(view.filter==='favorite')entries=entries.filter(e=>e.favorite);if(view.folderId){const ids=descendantIds(view.folderId);entries=entries.filter(e=>ids.has(e.folderId))}if(view.tag)entries=entries.filter(e=>(e.tags||[]).includes(view.tag));const q=view.query.trim().toLowerCase();if(q)entries=entries.filter(e=>[e.title,e.artistTags,e.prompt,e.characterPrompt,e.negative,e.memo,(e.tags||[]).join(' ')].join(' ').toLowerCase().includes(q));return entries.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))}
function renderTags(){const base=state.entries.filter(e=>!e.trashed && (!view.folderId||descendantIds(view.folderId).has(e.folderId)));const counts={};base.forEach(e=>(e.tags||[]).forEach(t=>counts[t]=(counts[t]||0)+1));const tags=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,20);$('#tagCloud').innerHTML=tags.map(([t,c])=>`<button class="tag-pill ${view.tag===t?'active':''}" data-tag="${esc(t)}">#${esc(t)} ${c}</button>`).join('');$$('[data-tag]').forEach(b=>b.onclick=()=>{view.tag=view.tag===b.dataset.tag?null:b.dataset.tag;renderTags();renderEntries()})}
function renderEntries(){const entries=currentEntries();$('#entryCount').textContent=`${entries.length}개`;$('#currentFolderLabel').textContent=view.filter==='trash'?'휴지통':folderPath(view.folderId);$('#emptyState').classList.toggle('hidden',entries.length>0);$('#entryGrid').innerHTML=entries.map(e=>{const img=e.images?.[0];return `<article class="entry-card"><button class="card-open" data-open="${e.id}"><div class="thumb">${img?`<img src="${img}" alt="">`:'✦'}${e.images?.length>1?`<span class="image-count">+${e.images.length-1}</span>`:''}${e.favorite?'<span class="fav-star">★</span>':''}</div><div class="card-body"><div class="entry-title-row"><div class="entry-title">${esc(e.title||'제목 없음')}</div><span class="type-badge">${esc(e.type||'기타')}</span></div><div class="prompt-preview">${esc(e.prompt||e.negative||'프롬프트 없음')}</div><div class="card-tags">${(e.tags||[]).slice(0,4).map(t=>`<span class="card-tag">#${esc(t)}</span>`).join('')}</div><div class="card-footer"><span>${new Date(e.updatedAt).toLocaleDateString('ko-KR')}</span><span>${esc(folderPath(e.folderId).split(' / ').pop())}</span></div></div></button><div class="card-actions">${view.filter==='trash'?`<button data-restore="${e.id}">복원</button><button data-harddel="${e.id}">영구삭제</button>`:`<button data-edit="${e.id}">수정</button><button data-trash="${e.id}">삭제</button>`}</div></article>`}).join('');$$('[data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open));$$('[data-edit]').forEach(b=>b.onclick=()=>openEntryDialog(b.dataset.edit));$$('[data-trash]').forEach(b=>b.onclick=()=>trashEntry(b.dataset.trash));$$('[data-restore]').forEach(b=>b.onclick=()=>restoreEntry(b.dataset.restore));$$('[data-harddel]').forEach(b=>b.onclick=()=>hardDeleteEntry(b.dataset.harddel))}
function setVal(id,value=''){const el=$('#'+id);if(el)el.value=value??'';return el}
function openEntryDialog(id=null,prefill=null){const e=id?state.entries.find(x=>x.id===id):null;const dlg=$('#entryDialog');if(!dlg){alert('화면 파일이 이전 버전으로 남아 있어요. 페이지를 새로고침해 주세요.');return}$('#entryDialogTitle').textContent=e?'프롬프트 수정':'새 프롬프트';setVal('entryId',e?.id||'');setVal('entryTitle',prefill?.title||e?.title||'');setVal('entryType',e?.type||'NovelAI');renderFolderSelects();setVal('entryFolder',e?.folderId||view.folderId||'');setVal('entryArtistTags',prefill?.artistTags||e?.artistTags||'');setVal('entryPrompt',prefill?.prompt||e?.prompt||'');setVal('entryCharacterPrompt',prefill?.characterPrompt||e?.characterPrompt||'');setVal('entryNegative',e?.negative||'');setVal('entryMemo',e?.memo||'');setVal('entryTags',(e?.tags||[]).join(', '));const fav=$('#entryFavorite');if(fav)fav.checked=!!e?.favorite;workingImages=[...(e?.images||[])];workingMetadata=e?.metadata||null;renderImagePreview();renderNovelAIMeta(workingMetadata);setVal('entryImages','');dlg.showModal()}
function renderImagePreview(){$('#imagePreview').innerHTML=workingImages.map((src,i)=>`<div class="preview-item"><img src="${src}" alt=""><button type="button" data-rmimg="${i}">×</button></div>`).join('');$$('[data-rmimg]').forEach(b=>b.onclick=()=>{workingImages.splice(+b.dataset.rmimg,1);renderImagePreview()})}
async function filesToDataUrls(files){const out=[];for(const f of files){out.push(await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)}))}return out}
function bytesToLatin1(bytes){let s='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return s}
function bytesToUtf8(bytes){try{return new TextDecoder('utf-8').decode(bytes)}catch{return bytesToLatin1(bytes)}}
async function inflateBytes(bytes){if(typeof DecompressionStream==='undefined')return null;try{const ds=new DecompressionStream('deflate');const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();return new Uint8Array(ab)}catch{return null}}
async function readPngTextChunks(file){if(!file||file.type!=='image/png'&&!file.name?.toLowerCase().endsWith('.png'))return {};const b=new Uint8Array(await file.arrayBuffer());if(b.length<8||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)return {};const out={};let pos=8;while(pos+12<=b.length){const len=((b[pos]<<24)|(b[pos+1]<<16)|(b[pos+2]<<8)|b[pos+3])>>>0;const type=String.fromCharCode(...b.subarray(pos+4,pos+8));const data=b.subarray(pos+8,pos+8+len);pos+=12+len;if(type==='IEND')break;try{if(type==='tEXt'){const z=data.indexOf(0);if(z>0)out[bytesToLatin1(data.subarray(0,z))]=bytesToLatin1(data.subarray(z+1))}else if(type==='zTXt'){const z=data.indexOf(0);if(z>0){const dec=await inflateBytes(data.subarray(z+2));if(dec)out[bytesToLatin1(data.subarray(0,z))]=bytesToLatin1(dec)}}else if(type==='iTXt'){let i=0;while(i<data.length&&data[i]!==0)i++;const key=bytesToLatin1(data.subarray(0,i));i++;const compressed=data[i++]===1;i++;while(i<data.length&&data[i]!==0)i++;i++;while(i<data.length&&data[i]!==0)i++;i++;let val=data.subarray(i);if(compressed){const dec=await inflateBytes(val);if(dec)val=dec}out[key]=bytesToUtf8(val)}}catch(e){console.warn('PNG metadata chunk parse failed',type,e)}}return out}

/* JPEG EXIF parser for NovelAI metadata */
function trimNulls(s=''){return String(s).replace(/\0+$/g,'').trim()}
function decodeUserComment(bytes){
  if(!bytes||!bytes.length)return '';
  const head=bytesToLatin1(bytes.subarray(0,Math.min(8,bytes.length)));
  let body=bytes;
  if(/^ASCII/.test(head))body=bytes.subarray(8);
  else if(/^UNICODE/.test(head)){
    body=bytes.subarray(8);
    try{
      if(body.length>=2){
        const be=body[0]===0&&body[1]!==0;
        const dv=new DataView(body.buffer,body.byteOffset,body.byteLength);
        let s=''; for(let i=0;i+1<body.length;i+=2)s+=String.fromCharCode(dv.getUint16(i,!be));
        return trimNulls(s);
      }
    }catch{}
  }
  const u8=bytesToUtf8(body);
  if(u8 && !u8.includes('\uFFFD'))return trimNulls(u8);
  return trimNulls(bytesToLatin1(body));
}
function readTiffValue(dv,tiffStart,entryOff,little){
  const type=dv.getUint16(entryOff+2,little), count=dv.getUint32(entryOff+4,little);
  const sizes={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};
  const size=(sizes[type]||1)*count;
  let dataOff=size<=4?entryOff+8:tiffStart+dv.getUint32(entryOff+8,little);
  if(dataOff<0||dataOff+size>dv.byteLength)return null;
  const bytes=new Uint8Array(dv.buffer,dv.byteOffset+dataOff,size);
  if(type===2)return trimNulls(bytesToLatin1(bytes));
  if(type===7)return bytes;
  if(type===3&&count===1)return dv.getUint16(dataOff,little);
  if(type===4&&count===1)return dv.getUint32(dataOff,little);
  return bytes;
}
function parseExifIFD(dv,tiffStart,ifdRel,little,out,depth=0){
  if(depth>3)return;
  const ifd=tiffStart+ifdRel;
  if(ifd<0||ifd+2>dv.byteLength)return;
  const n=dv.getUint16(ifd,little);
  for(let i=0;i<n;i++){
    const off=ifd+2+i*12; if(off+12>dv.byteLength)break;
    const tag=dv.getUint16(off,little);
    const val=readTiffValue(dv,tiffStart,off,little);
    if(tag===0x010E && typeof val==='string')out.ImageDescription=val;
    else if(tag===0x0131 && typeof val==='string')out.Software=val;
    else if(tag===0x9286 && val instanceof Uint8Array)out.UserComment=decodeUserComment(val);
    else if(tag===0x8769 && typeof val==='number')parseExifIFD(dv,tiffStart,val,little,out,depth+1);
  }
}
async function readJpegExif(file){
  const isJpeg=file&&(file.type==='image/jpeg'||/\.(jpe?g)$/i.test(file.name||''));
  if(!isJpeg)return {};
  const buf=await file.arrayBuffer(), b=new Uint8Array(buf), dv=new DataView(buf);
  const out={};
  if(b.length<4||b[0]!==0xFF||b[1]!==0xD8)return out;
  let pos=2;
  while(pos+4<=b.length){
    if(b[pos]!==0xFF){pos++;continue}
    const marker=b[pos+1];
    if(marker===0xDA||marker===0xD9)break;
    const len=dv.getUint16(pos+2,false);
    if(len<2||pos+2+len>b.length)break;
    if(marker===0xE1&&len>=8&&bytesToLatin1(b.subarray(pos+4,pos+10))==='Exif\0\0'){
      const tiffStart=pos+10;
      if(tiffStart+8<=b.length){
        const endian=bytesToLatin1(b.subarray(tiffStart,tiffStart+2));
        const little=endian==='II';
        if(little||endian==='MM'){
          try{
            if(dv.getUint16(tiffStart+2,little)===42){
              const ifd0=dv.getUint32(tiffStart+4,little);
              parseExifIFD(dv,tiffStart,ifd0,little,out);
            }
          }catch(e){console.warn('EXIF parse failed',e)}
        }
      }
    }
    pos+=2+len;
  }
  /* fallback: some exported JPEGs contain readable NovelAI text outside parsed EXIF */
  try{
    const raw=bytesToLatin1(b);
    if(!out.Software){
      const m=raw.match(/NovelAI Diffusion[^\0\r\n]{0,120}/i);
      if(m)out.Software=trimNulls(m[0]);
    }
  }catch{}
  return out;
}
function tryJson(s){if(!s||typeof s!=='string')return null;try{return JSON.parse(s)}catch{return null}}
function pick(obj,keys){for(const k of keys){if(obj&&obj[k]!=null&&obj[k]!=='' )return obj[k]}return ''}
function parseNovelAIText(text){
  if(!text||typeof text!=='string')return {};
  const direct=tryJson(text);
  if(direct&&typeof direct==='object')return direct;
  /* find a JSON object embedded after "NovelAI generated image" or similar */
  const first=text.indexOf('{'), last=text.lastIndexOf('}');
  if(first>=0&&last>first){
    const embedded=tryJson(text.slice(first,last+1));
    if(embedded&&typeof embedded==='object')return embedded;
  }
  return {prompt:text};
}
function normalizeNovelAIMetadata(chunks){
  const commentText=chunks.Comment||chunks.comment||chunks.UserComment||'';
  const descText=chunks.Description||chunks.description||chunks.ImageDescription||'';
  const comment=parseNovelAIText(commentText);
  const descObj=parseNovelAIText(descText);
  const software=chunks.Software||chunks.software||'';
  const source=chunks.Source||chunks.source||'';
  let prompt=pick(comment,['prompt','description','input'])||pick(descObj,['prompt','description','input']);
  let negative=pick(comment,['uc','negative_prompt','negativePrompt','undesired_content'])||pick(descObj,['uc','negative_prompt','negativePrompt','undesired_content']);
  /* If ImageDescription is plain NovelAI text, don't use the generic marker itself as the prompt. */
  if(!prompt && descText && !/^NovelAI generated image$/i.test(descText.trim()))prompt=descText;
  const merged={...descObj,...comment};
  const meta={prompt:String(prompt||''),negative:String(negative||''),seed:pick(merged,['seed']),steps:pick(merged,['steps']),scale:pick(merged,['scale','cfg_scale','prompt_guidance']),sampler:pick(merged,['sampler']),model:pick(merged,['model','model_name'])||source,software,source,raw:merged};
  const looksNovel=/novelai/i.test(software+' '+source+' '+descText)||Object.keys(merged).some(k=>['uc','sampler','noise_schedule','sm','sm_dyn','dynamic_thresholding'].includes(k));
  return (looksNovel||meta.prompt||meta.seed)?meta:null
}

async function loadImageForStealth(file){
  return await new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};
    img.src=url;
  });
}
function bitsToBytes(bits){
  const n=Math.floor(bits.length/8), out=new Uint8Array(n);
  for(let i=0;i<n;i++)out[i]=parseInt(bits.slice(i*8,i*8+8),2);
  return out;
}
async function inflateStealth(bytes){
  for(const format of ['deflate','deflate-raw']){
    try{
      const ds=new DecompressionStream(format);
      const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      return new Uint8Array(ab);
    }catch{}
  }
  return null;
}
async function readStealthMetadata(file){
  if(!file)return null;
  const img=await loadImageForStealth(file);
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth||img.width; canvas.height=img.naturalHeight||img.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const width=canvas.width,height=canvas.height,data=ctx.getImageData(0,0,width,height).data;

  let hasAlpha=false;
  for(let i=3;i<data.length;i+=4){if(data[i]<255){hasAlpha=true;break}}

  let mode=null,compressed=false,bufferA='',bufferRGB='',indexA=0,indexRGB=0;
  let confirming=true,readingLen=false,readingParam=false,paramLen=0,binaryData='';

  outer: for(let x=0;x<width;x++){
    for(let y=0;y<height;y++){
      const i=(y*width+x)*4, r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(hasAlpha){bufferA+=(a&1);indexA++}
      bufferRGB+=(r&1);bufferRGB+=(g&1);bufferRGB+=(b&1);indexRGB+=3;

      if(confirming){
        if(hasAlpha && indexA===15*8){
          const sig=new TextDecoder().decode(bitsToBytes(bufferA));
          if(sig==='stealth_pnginfo'||sig==='stealth_pngcomp'){
            confirming=false;readingLen=true;mode='alpha';compressed=sig==='stealth_pngcomp';
            bufferA='';indexA=0;
          }else{
            /* Alpha signature failed; RGB may still contain metadata. */
            bufferA='';indexA=-1000000000;
          }
        }
        if(confirming && indexRGB>=15*8){
          const sig=new TextDecoder().decode(bitsToBytes(bufferRGB.slice(0,15*8)));
          if(sig==='stealth_rgbinfo'||sig==='stealth_rgbcomp'){
            confirming=false;readingLen=true;mode='rgb';compressed=sig==='stealth_rgbcomp';
            bufferRGB=bufferRGB.slice(15*8);indexRGB=bufferRGB.length;
          }else if(indexRGB>=15*8+2){break outer}
        }
      }else if(readingLen){
        if(mode==='alpha'&&indexA===32){
          paramLen=parseInt(bufferA,2);readingLen=false;readingParam=true;bufferA='';indexA=0;
        }else if(mode==='rgb'&&indexRGB>=32){
          paramLen=parseInt(bufferRGB.slice(0,32),2);
          bufferRGB=bufferRGB.slice(32);indexRGB=bufferRGB.length;readingLen=false;readingParam=true;
        }
      }else if(readingParam){
        if(mode==='alpha'&&indexA>=paramLen){binaryData=bufferA.slice(0,paramLen);break outer}
        if(mode==='rgb'&&indexRGB>=paramLen){binaryData=bufferRGB.slice(0,paramLen);break outer}
      }
    }
  }
  if(!binaryData)return null;
  let bytes=bitsToBytes(binaryData);
  if(compressed){const dec=await inflateStealth(bytes);if(!dec)return null;bytes=dec}
  const text=new TextDecoder('utf-8').decode(bytes);
  return text||null;
}
function normalizeStealthNovelAI(text){
  if(!text)return null;
  let outer=tryJson(text);
  if(!outer)return normalizeNovelAIMetadata({Comment:text});
  /* Common NovelAI stealth wrapper stores the normal Comment JSON as a string. */
  if(typeof outer.Comment==='string'){
    const meta=normalizeNovelAIMetadata({
      Comment:outer.Comment,
      Description:outer.Description||'',
      Software:outer.Software||'NovelAI',
      Source:outer.Source||''
    });
    if(meta){meta.stealth=true;return meta}
  }
  const meta=normalizeNovelAIMetadata({
    Comment:JSON.stringify(outer),
    Description:outer.Description||outer.description||'',
    Software:outer.Software||outer.software||'NovelAI',
    Source:outer.Source||outer.source||''
  });
  if(meta){meta.stealth=true;return meta}
  return null;
}


function findBytes(haystack, needle, from=0){
  outer: for(let i=from;i<=haystack.length-needle.length;i++){
    for(let j=0;j<needle.length;j++)if(haystack[i+j]!==needle[j])continue outer;
    return i;
  }
  return -1;
}
function firstBalancedJsonObject(text){
  const start=text.indexOf('{');
  if(start<0)return '';
  let depth=0,inString=false,escapeNext=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(inString){
      if(escapeNext){escapeNext=false;continue}
      if(c==='\\'){escapeNext=true;continue}
      if(c==='"')inString=false;
      continue;
    }
    if(c==='"'){inString=true;continue}
    if(c==='{')depth++;
    else if(c==='}'){
      depth--;
      if(depth===0)return text.slice(start,i+1);
    }
  }
  return '';
}
async function readJpegNovelAIRaw(file){
  const isJpeg=file&&(file.type==='image/jpeg'||/\.(jpe?g)$/i.test(file.name||''));
  if(!isJpeg)return null;
  const b=new Uint8Array(await file.arrayBuffer());
  const enc=new TextEncoder();
  const markers=[
    enc.encode('{"Comment":"'),
    enc.encode('{"Description":"'),
    enc.encode('"Software":"NovelAI"')
  ];
  let start=-1;
  for(const m of markers){
    const p=findBytes(b,m);
    if(p>=0){start=p;break}
  }
  if(start<0)return null;

  // The full NovelAI payload can be fairly large; decode up to 4 MB from the marker.
  const end=Math.min(b.length,start+4*1024*1024);
  let text=new TextDecoder('utf-8',{fatal:false}).decode(b.subarray(start,end));

  // If we found Software inside the object instead of its opening brace, rewind in decoded text is impossible.
  // In that rare case use a wider byte window before the marker.
  if(!text.startsWith('{')){
    const back=Math.max(0,start-1024*1024);
    text=new TextDecoder('utf-8',{fatal:false}).decode(b.subarray(back,end));
    const c=text.lastIndexOf('{"Comment":"', start-back);
    if(c>=0)text=text.slice(c);
  }

  const rawJson=firstBalancedJsonObject(text);
  if(!rawJson)return null;
  try{return JSON.parse(rawJson)}catch(e){
    console.warn('NovelAI JPEG embedded JSON parse failed',e);
    return null;
  }
}
function normalizeNovelAIEnvelope(env){
  if(!env||typeof env!=='object')return null;
  let comment={};
  if(typeof env.Comment==='string')comment=tryJson(env.Comment)||{};
  else if(env.Comment&&typeof env.Comment==='object')comment=env.Comment;

  const prompt =
    pick(comment,['prompt','description','input']) ||
    env.Description || env.description || '';

  const negative =
    pick(comment,['uc','negative_prompt','negativePrompt','undesired_content']) ||
    env.NegativePrompt || '';

  const meta={
    prompt:String(prompt||''),
    negative:String(negative||''),
    seed:pick(comment,['seed']),
    steps:pick(comment,['steps']),
    scale:pick(comment,['scale','cfg_scale','prompt_guidance']),
    sampler:pick(comment,['sampler']),
    model:pick(comment,['model','model_name']) || env.Source || env.source || '',
    software:env.Software||env.software||'',
    source:env.Source||env.source||'',
    raw:comment,
    envelope:env
  };

  const looksNovel=/novelai/i.test(
    `${meta.software} ${meta.source} ${env.Title||''} ${JSON.stringify(comment).slice(0,5000)}`
  );

  return (looksNovel||meta.prompt||meta.negative||meta.seed)?meta:null;
}


async function readJpegWithExifr(file){
  if(typeof exifr==='undefined')return null;
  try{
    const data=await exifr.parse(file,{
      tiff:true,exif:true,xmp:true,iptc:true,jfif:true,
      icc:false,ihdr:false,translateKeys:true,
      translateValues:false,reviveValues:false
    });
    if(!data)return null;

    const candidates=[
      data.Comment,data.comment,data.UserComment,
      data.ImageDescription,data.Description,data.description,
      data.parameters,data.Parameters
    ].filter(v=>v!=null);

    let comment={};
    for(const value of candidates){
      if(value&&typeof value==='object'){comment=value;break}
      if(typeof value==='string'){
        const parsed=tryJson(value);
        if(parsed&&typeof parsed==='object'){comment=parsed;break}
        const first=value.indexOf('{'),last=value.lastIndexOf('}');
        if(first>=0&&last>first){
          const embedded=tryJson(value.slice(first,last+1));
          if(embedded&&typeof embedded==='object'){comment=embedded;break}
        }
      }
    }

    if(!Object.keys(comment).length)comment=data;

    const software=data.Software||data.software||comment.Software||'';
    const source=data.Source||data.source||comment.Source||'';
    const description=
      data.ImageDescription||data.Description||data.description||
      comment.Description||comment.description||'';

    let prompt=pick(comment,['prompt','description','input']);
    if(!prompt && typeof description==='string' &&
       !/^NovelAI generated image$/i.test(description.trim())){
      prompt=description;
    }

    const negative=pick(comment,[
      'uc','negative_prompt','negativePrompt','undesired_content'
    ]);

    const meta={
      prompt:String(prompt||''),
      negative:String(negative||''),
      seed:pick(comment,['seed']),
      steps:pick(comment,['steps']),
      scale:pick(comment,['scale','cfg_scale','prompt_guidance']),
      sampler:pick(comment,['sampler']),
      model:pick(comment,['model','model_name'])||source,
      software,source,raw:comment,exifr:data
    };

    const rawText=JSON.stringify(data);
    const looksNovel=/novelai/i.test(`${software} ${source} ${rawText}`) ||
      Object.keys(comment).some(k=>[
        'uc','sampler','noise_schedule','sm','sm_dyn',
        'dynamic_thresholding','char_captions'
      ].includes(k));

    return (looksNovel||meta.prompt||meta.negative||meta.seed)?meta:null;
  }catch(e){
    console.warn('exifr JPEG metadata parse failed',e);
    return null;
  }
}

async function extractNovelAIMetadata(file){
  try{
    const name=(file?.name||'').toLowerCase();

    if(file?.type==='image/png'||name.endsWith('.png')){
      const normal=normalizeNovelAIMetadata(await readPngTextChunks(file));
      if(normal)return normal;
      const stealth=await readStealthMetadata(file);
      return normalizeStealthNovelAI(stealth);
    }

    if(file?.type==='image/jpeg'||/\.(jpe?g)$/i.test(name)){
      // 1) Complete NovelAI JSON preserved inside JPEG bytes.
      const embedded=normalizeNovelAIEnvelope(await readJpegNovelAIRaw(file));
      if(embedded)return embedded;

      // 2) EXIF/XMP/IPTC parser (ImageDescription, UserComment, XMP etc.).
      const rich=await readJpegWithExifr(file);
      if(rich)return rich;

      // 3) Lightweight built-in EXIF parser.
      const exif=normalizeNovelAIMetadata(await readJpegExif(file));
      if(exif)return exif;

      // 4) Last fallback for lossless/oddly-labelled image files.
      try{return normalizeStealthNovelAI(await readStealthMetadata(file))}catch{return null}
    }

    return null;
  }catch(e){
    console.warn('NovelAI metadata extract failed',e);
    return null;
  }
}

function splitPromptParts(prompt=''){
  const parts=String(prompt).split(',').map(x=>x.trim()).filter(Boolean);
  const artist=[],main=[];
  for(const part of parts){
    const plain=part.replace(/^\s*-?\d+(?:\.\d+)?::/,'').trim();
    if(/(^|::)\s*artist\s*:/i.test(part) || /^artist\s*:/i.test(plain)) artist.push(part);
    else main.push(part);
  }
  return {artist:artist.join(', '),prompt:main.join(', ')};
}
function formatCharacterCaptions(value){
  if(!value)return '';
  if(typeof value==='string'){
    const parsed=tryJson(value);
    if(parsed)value=parsed;
    else return value;
  }
  const lines=[];
  const walk=(v,label='')=>{
    if(v==null)return;
    if(typeof v==='string'){
      const t=v.trim();
      if(t)lines.push(label?`${label}: ${t}`:t);
      return;
    }
    if(Array.isArray(v)){
      v.forEach((item,i)=>walk(item,label?`${label} ${i+1}`:`캐릭터 ${i+1}`));
      return;
    }
    if(typeof v==='object'){
      const prompt=v.prompt||v.caption||v.text||v.char_caption||v.description;
      if(prompt && typeof prompt==='string'){
        lines.push(label?`${label}: ${prompt}`:prompt);
      }else{
        Object.entries(v).forEach(([k,val])=>walk(val,k));
      }
    }
  };
  walk(value);
  return [...new Set(lines)].join('\n\n');
}
function extractCharacterPrompt(raw){
  if(!raw||typeof raw!=='object')return '';
  return formatCharacterCaptions(
    raw.char_captions ??
    raw.character_captions ??
    raw.characters ??
    raw.v4_prompt?.caption?.char_captions ??
    raw.v4_negative_prompt?.caption?.char_captions ??
    ''
  );
}

function renderNovelAIMeta(meta){workingMetadata=meta||null;const box=$('#naiMetaBox');if(!box)return;if(!meta){box.classList.add('hidden');['entrySeed','entrySteps','entryScale','entrySampler','entryModel'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});return}box.classList.remove('hidden');$('#entrySeed').value=meta.seed??'';$('#entrySteps').value=meta.steps??'';$('#entryScale').value=meta.scale??'';$('#entrySampler').value=meta.sampler??'';$('#entryModel').value=meta.model??'';$('#naiMetaStatus').textContent=/novelai/i.test((meta.software||'')+' '+(meta.source||'')+' '+JSON.stringify(meta.raw||{}))?'NovelAI 메타데이터 감지됨':'이미지 메타데이터 감지됨'}

async function submitEntry(ev){ev.preventDefault();const id=$('#entryId').value;const now=new Date().toISOString();const item={id:id||uid(),title:$('#entryTitle').value.trim(),type:$('#entryType').value,folderId:$('#entryFolder').value||null,artistTags:$('#entryArtistTags')?.value||'',prompt:$('#entryPrompt')?.value||'',characterPrompt:$('#entryCharacterPrompt')?.value||'',negative:$('#entryNegative')?.value||'',memo:$('#entryMemo')?.value||'',tags:$('#entryTags').value.split(',').map(x=>x.trim()).filter(Boolean),images:workingImages,metadata:workingMetadata,favorite:$('#entryFavorite').checked,trashed:false,createdAt:now,updatedAt:now};if(id){const old=state.entries.find(x=>x.id===id);Object.assign(item,{createdAt:old.createdAt,trashed:old.trashed});state.entries[state.entries.findIndex(x=>x.id===id)]=item}else state.entries.push(item);await saveState();$('#entryDialog').close();renderAll()}
function openFolderDialog(id=null){const f=id?state.folders.find(x=>x.id===id):null;$('#folderDialogTitle').textContent=f?'폴더 수정':'폴더 추가';$('#folderId').value=f?.id||'';$('#folderName').value=f?.name||'';renderFolderSelects();$('#folderParent').value=f?.parentId||'';if(id){[...$('#folderParent').options].forEach(o=>{if(o.value===id||descendantIds(id).has(o.value))o.disabled=true})}$('#folderDialog').showModal()}
async function submitFolder(ev){ev.preventDefault();const id=$('#folderId').value;const obj={id:id||uid(),name:$('#folderName').value.trim(),parentId:$('#folderParent').value||null};if(id)state.folders[state.folders.findIndex(f=>f.id===id)]=obj;else state.folders.push(obj);await saveState();$('#folderDialog').close();renderAll()}
async function deleteFolder(id){if(!confirm('폴더를 삭제할까요? 안의 프롬프트는 전체로 이동합니다.'))return;const ids=descendantIds(id);state.entries.forEach(e=>{if(ids.has(e.folderId))e.folderId=null});state.folders=state.folders.filter(f=>!ids.has(f.id));if(view.folderId&&ids.has(view.folderId))view.folderId=null;await saveState();renderAll()}
async function trashEntry(id){const e=state.entries.find(x=>x.id===id);if(!e)return;e.trashed=true;e.updatedAt=new Date().toISOString();await saveState();renderAll()}
async function restoreEntry(id){const e=state.entries.find(x=>x.id===id);if(!e)return;e.trashed=false;e.updatedAt=new Date().toISOString();await saveState();renderAll()}
async function hardDeleteEntry(id){if(!confirm('영구 삭제하면 복구할 수 없어요. 계속할까요?'))return;state.entries=state.entries.filter(x=>x.id!==id);await saveState();renderAll()}
function openDetail(id){const e=state.entries.find(x=>x.id===id);if(!e)return;$('#detailBody').innerHTML=`<div class="muted">${esc(e.type)} · ${esc(folderPath(e.folderId))}</div><h2 class="detail-title">${esc(e.title)}</h2><div class="card-tags">${(e.tags||[]).map(t=>`<span class="card-tag">#${esc(t)}</span>`).join('')}</div>${e.images?.length?`<div class="detail-gallery">${e.images.map(x=>`<img src="${x}" alt="">`).join('')}</div>`:''}${e.metadata?`<div class="detail-meta">${[['Seed',e.metadata.seed],['Steps',e.metadata.steps],['Scale',e.metadata.scale],['Sampler',e.metadata.sampler],['Model',e.metadata.model]].filter(x=>x[1]!==''&&x[1]!=null).map(x=>`<div><b>${esc(x[0])}</b><span>${esc(String(x[1]))}</span></div>`).join('')}</div>`:''}${e.artistTags?`<h3>작가 태그</h3><div class="detail-prompt">${esc(e.artistTags)}</div>`:''}<h3>프롬프트</h3><div class="detail-prompt">${esc(e.prompt||'')}</div>${e.characterPrompt?`<h3>캐릭터 프롬프트</h3><div class="detail-prompt">${esc(e.characterPrompt)}</div>`:''}${e.negative?`<h3>네거티브 프롬프트</h3><div class="detail-prompt">${esc(e.negative)}</div>`:''}${e.memo?`<h3>메모</h3><div class="detail-prompt">${esc(e.memo)}</div>`:''}<div class="detail-actions"><button data-copy-prompt="${e.id}">프롬프트 복사</button><button data-togglefav="${e.id}">${e.favorite?'★ 즐겨찾기 해제':'☆ 즐겨찾기'}</button><button data-detail-edit="${e.id}">수정</button><button class="danger" data-detail-trash="${e.id}">휴지통</button></div>`;$('#detailDialog').showModal();$('[data-copy-prompt]').onclick=()=>copyText(e.prompt);$('[data-togglefav]').onclick=async()=>{e.favorite=!e.favorite;await saveState();$('#detailDialog').close();renderAll()};$('[data-detail-edit]').onclick=()=>{$('#detailDialog').close();openEntryDialog(e.id)};$('[data-detail-trash]').onclick=async()=>{$('#detailDialog').close();await trashEntry(e.id)}}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('복사했어요')}catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('복사했어요')}}
function toast(msg){const d=document.createElement('div');d.textContent=msg;d.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:999px;z-index:9999;font-size:13px';document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function renderGenerator(){const wrap=$('#generatorBlocks');if(!wrap)return;wrap.innerHTML='';(state.generatorBlocks||[]).forEach(v=>addGeneratorBlock(v));updateGeneratorResult()}
function addGeneratorBlock(value=''){const tpl=$('#generatorBlockTpl').content.cloneNode(true);const row=tpl.querySelector('.generator-block');const input=row.querySelector('input[type=text]');input.value=value;row.querySelector('input[type=checkbox]').onchange=updateGeneratorResult;input.oninput=()=>{syncGeneratorState();updateGeneratorResult()};row.querySelector('.remove-block').onclick=()=>{row.remove();syncGeneratorState();updateGeneratorResult()};$('#generatorBlocks').appendChild(row)}
function syncGeneratorState(){state.generatorBlocks=$$('.generator-block input[type=text]').map(x=>x.value);saveState()}
function updateGeneratorResult(){const rows=$$('.generator-block');$('#generatorResult').value=rows.filter(r=>r.querySelector('input[type=checkbox]').checked).map(r=>r.querySelector('input[type=text]').value.trim()).filter(Boolean).join(',\n')}
async function exportBackup(){const blob=new Blob([JSON.stringify({...state,_ganggyeramBackup:true,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`강계람_백업_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
async function importBackup(file){try{const data=JSON.parse(await file.text());if(!data._ganggyeramBackup&&!data._dalzzalBackup&&!Array.isArray(data.entries))throw new Error('강계람 백업 파일이 아닙니다.');if(!confirm('현재 데이터를 백업 파일로 덮어쓸까요?'))return;state={folders:data.folders||[],entries:data.entries||[],theme:data.theme||'light',generatorBlocks:data.generatorBlocks||[]};await saveState();applyTheme();renderAll();$('#settingsDialog').close();toast('백업을 불러왔어요')}catch(e){alert('불러오기 실패: '+e.message)}}
async function seed(){const f1={id:uid(),name:'캐릭터',parentId:null},f2={id:uid(),name:'학교',parentId:f1.id};state.folders.push(f1,f2);state.entries.push({id:uid(),title:'봄 교실 미소',type:'NovelAI',folderId:f2.id,prompt:'boy, solo, male focus, black hair, short hair, school uniform, classroom, spring, gentle smile',negative:'low quality, bad hands',tags:['남캐','교복','봄'],images:[],favorite:true,trashed:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});await saveState();renderAll();toast('예시 데이터를 추가했어요')}
function closeDialogs(){/* no-op */}
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#entryForm').addEventListener('submit',submitEntry);$('#folderForm').addEventListener('submit',submitFolder);$('#entryImages').addEventListener('change',async e=>{const files=[...e.target.files];workingImages.push(...await filesToDataUrls(files));renderImagePreview();for(const f of files){const meta=await extractNovelAIMetadata(f);if(!meta)continue;renderNovelAIMeta(meta);const split=splitPromptParts(meta.prompt||'');if(split.artist&&$('#entryArtistTags')&&!$('#entryArtistTags').value.trim())$('#entryArtistTags').value=split.artist;if(split.prompt&&!$('#entryPrompt').value.trim())$('#entryPrompt').value=split.prompt;const charPrompt=extractCharacterPrompt(meta.raw||meta.envelope||meta.exifr||{});if(charPrompt&&$('#entryCharacterPrompt')&&!$('#entryCharacterPrompt').value.trim())$('#entryCharacterPrompt').value=charPrompt;if(meta.negative&&!$('#entryNegative').value.trim())$('#entryNegative').value=meta.negative;if(!$('#entryTitle').value.trim())$('#entryTitle').value=(f.name||'NovelAI 이미지').replace(/\.[^.]+$/,'');$('#entryType').value='NovelAI';toast(meta.stealth?'NovelAI Stealth 메타데이터를 불러왔어요':'NovelAI 메타데이터를 자동 분류했어요');break}});
if($('#addEntryBtn'))$('#addEntryBtn').onclick=()=>openEntryDialog();if($('#fab'))$('#fab').onclick=()=>openEntryDialog();if($('#addFolderBtn'))$('#addFolderBtn').onclick=()=>openFolderDialog();
$('#searchInput').oninput=e=>{view.query=e.target.value;renderEntries()};$('#clearSearchBtn').onclick=()=>{$('#searchInput').value='';view.query='';renderEntries()};
$$('#filterTabs .chip').forEach(b=>b.onclick=()=>{$$('#filterTabs .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');view.filter=b.dataset.filter;renderTags();renderEntries()});
$('#themeBtn').onclick=async()=>{state.theme=state.theme==='dark'?'light':'dark';applyTheme();await saveState()};
$('#settingsBtn').onclick=()=>$('#settingsDialog').showModal();$('#exportBtn').onclick=exportBackup;$('#importInput').onchange=e=>{const f=e.target.files[0];if(f)importBackup(f);e.target.value=''};$('#seedBtn').onclick=seed;$('#clearAllBtn').onclick=async()=>{if(!confirm('모든 데이터를 정말 삭제할까요?'))return;state={folders:[],entries:[],theme:state.theme,generatorBlocks:[]};await saveState();renderAll();toast('모든 데이터를 삭제했어요')};
$('#generatorBtn').onclick=()=>{$('#generatorDialog').showModal();renderGenerator()};$('#addGeneratorBlock').onclick=()=>{addGeneratorBlock('');syncGeneratorState()};$('#copyGeneratorBtn').onclick=()=>copyText($('#generatorResult').value);$('#saveGeneratedBtn').onclick=()=>{const p=$('#generatorResult').value;$('#generatorDialog').close();openEntryDialog(null,{title:'생성된 프롬프트',prompt:p})};
['input','change'].forEach(ev=>$('#generatorBlocks').addEventListener(ev,updateGeneratorResult));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
loadState();
