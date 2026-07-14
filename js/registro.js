'use strict';

let mrCategoria = 'parametros';
let mrEditId = null;

const CAMPOS_PARAMETRO = [
  ['mr-fc','fc'], ['mr-fr','fr'], ['mr-etco2','etco2'], ['mr-spo2','spo2'],
  ['mr-pas','pas'], ['mr-pad','pad'], ['mr-pam','pam'], ['mr-temp','temp'], ['mr-pinh','pinh']
];

function registrosOrdenados(caso){
  return caso.registros.slice().sort((a,b)=> (horaAMinutos(a.hora) ?? 0) - (horaAMinutos(b.hora) ?? 0));
}

function renderTimeline(caso){
  const cont = document.getElementById('timeline');
  const vacio = document.getElementById('timeline-vacio');
  cont.innerHTML = '';

  const ordenados = registrosOrdenados(caso);

  if(ordenados.length === 0){
    vacio.hidden = false;
  }else{
    vacio.hidden = true;
    // mostrar en orden inverso (más reciente primero) pero conservando cronología para gráficos
    ordenados.slice().reverse().forEach(r=>{
      cont.appendChild(crearTimelineItem(r));
    });
  }

  renderVitalsStrip(caso, ordenados);
}

function crearTimelineItem(r){
  const div = document.createElement('div');
  div.className = 'timeline-item' + (r.categoria === 'observacion' ? ' cat-observacion' : '');

  let vitalsHtml = '';
  if(r.categoria === 'parametros'){
    const pares = [
      ['FC', r.fc, 'lpm'], ['FR', r.fr, 'rpm'], ['EtCO₂', r.etco2, 'mmHg'], ['SpO₂', r.spo2, '%'],
      ['PAS', r.pas, ''], ['PAD', r.pad, ''], ['PAM', r.pam, 'mmHg'], ['T°', r.temp, '°C'], ['%inh', r.pinh, '%']
    ].filter(([,v])=> v !== '' && v !== null && v !== undefined);
    vitalsHtml = `<div class="timeline-vitals">${pares.map(([l,v,u])=>`<span class="timeline-vital">${l} <b>${escapeHtml(v)}</b>${u?' '+u:''}</span>`).join('')}</div>`;
  }

  const comentario = r.comentario ? `<div class="timeline-comment">${escapeHtml(r.comentario)}</div>` : '';

  div.innerHTML = `
    <div class="timeline-card">
      <div class="timeline-head">
        <span class="timeline-hora">${escapeHtml(r.hora || '—')}</span>
        <span class="timeline-badge ${r.categoria === 'observacion' ? 'obs':''}">${r.categoria === 'observacion' ? 'Observación' : 'Parámetros'}</span>
      </div>
      ${vitalsHtml}
      ${comentario}
    </div>
  `;
  div.addEventListener('click', ()=> abrirModalRegistro(r.id));
  return div;
}

function renderVitalsStrip(caso, ordenados){
  const strip = document.getElementById('vitals-strip');
  const ultimoParam = ordenados.slice().reverse().find(r=> r.categoria === 'parametros');
  if(!ultimoParam){
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  document.getElementById('vs-fc').textContent = valOr(ultimoParam.fc);
  document.getElementById('vs-spo2').textContent = valOr(ultimoParam.spo2);
  document.getElementById('vs-pam').textContent = valOr(ultimoParam.pam);
  document.getElementById('vs-hora').textContent = valOr(ultimoParam.hora);
}

/* ---------- Modal de registro ---------- */
function setCategoriaModal(cat){
  mrCategoria = cat;
  document.querySelectorAll('.cat-btn').forEach(b=> b.classList.toggle('active', b.dataset.cat === cat));
  document.getElementById('mr-campos-parametros').hidden = (cat !== 'parametros');
  document.getElementById('mr-comentario-label').textContent = (cat === 'observacion') ? 'Comentario / observación' : 'Comentario (opcional)';
  document.getElementById('mr-comentario').placeholder = (cat === 'observacion') ? 'Describe lo observado…' : 'Opcional';
}

function abrirModalRegistro(editId){
  mrEditId = editId || null;
  const caso = getCasoActual();

  document.getElementById('btn-eliminar-registro').hidden = !editId;

  if(editId){
    const r = caso.registros.find(x=>x.id===editId);
    document.getElementById('modal-registro-titulo').textContent = 'Editar marca de tiempo';
    setCategoriaModal(r.categoria);
    document.getElementById('mr-hora').value = r.hora || horaActualHHMM();
    CAMPOS_PARAMETRO.forEach(([elId,key])=>{ document.getElementById(elId).value = r[key] ?? ''; });
    document.getElementById('mr-comentario').value = r.comentario || '';
  }else{
    document.getElementById('modal-registro-titulo').textContent = 'Nueva marca de tiempo';
    setCategoriaModal('parametros');
    document.getElementById('mr-hora').value = horaActualHHMM();
    CAMPOS_PARAMETRO.forEach(([elId])=>{ document.getElementById(elId).value = ''; });
    document.getElementById('mr-comentario').value = '';
  }

  document.getElementById('modal-registro').hidden = false;
}

function cerrarModalRegistro(){
  document.getElementById('modal-registro').hidden = true;
  mrEditId = null;
}

function guardarRegistroModal(){
  const caso = getCasoActual();
  if(!caso) return;

  const hora = document.getElementById('mr-hora').value || horaActualHHMM();
  const comentario = document.getElementById('mr-comentario').value.trim();

  if(mrCategoria === 'observacion' && !comentario){
    mostrarToast('Escribe una observación');
    return;
  }

  const datos = { categoria: mrCategoria, hora, comentario };
  if(mrCategoria === 'parametros'){
    CAMPOS_PARAMETRO.forEach(([elId,key])=>{
      const v = document.getElementById(elId).value;
      datos[key] = v === '' ? '' : Number(v);
    });
  }else{
    CAMPOS_PARAMETRO.forEach(([,key])=> datos[key] = '');
  }

  if(mrEditId){
    const idx = caso.registros.findIndex(r=>r.id===mrEditId);
    if(idx>-1) caso.registros[idx] = {...caso.registros[idx], ...datos};
  }else{
    caso.registros.push({ id: uid(), ...datos });
  }

  renderTimeline(caso);
  renderInforme(caso);
  guardarCasoActual();
  cerrarModalRegistro();
  mostrarToast('Registro guardado');
}

function eliminarRegistroModal(){
  const caso = getCasoActual();
  if(!caso || !mrEditId) return;
  caso.registros = caso.registros.filter(r=>r.id!==mrEditId);
  renderTimeline(caso);
  renderInforme(caso);
  guardarCasoActual();
  cerrarModalRegistro();
  mostrarToast('Registro eliminado');
}

function initRegistroListeners(){
  document.getElementById('fab-registro').addEventListener('click', ()=> abrirModalRegistro(null));
  document.querySelectorAll('.cat-btn').forEach(b=>{
    b.addEventListener('click', ()=> setCategoriaModal(b.dataset.cat));
  });
  document.getElementById('btn-guardar-registro').addEventListener('click', guardarRegistroModal);
  document.getElementById('btn-cancelar-registro').addEventListener('click', cerrarModalRegistro);
  document.getElementById('btn-eliminar-registro').addEventListener('click', eliminarRegistroModal);
  document.getElementById('modal-registro').addEventListener('click', (e)=>{
    if(e.target.id === 'modal-registro') cerrarModalRegistro();
  });
}
