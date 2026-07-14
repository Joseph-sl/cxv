'use strict';

const NOMBRES_CATEGORIA = {
  premedicacion: 'Premedicación',
  induccion: 'Inducción',
  mantencion: 'Mantención',
  recuperacion: 'Recuperación'
};

/* Estado transitorio del modal de fármaco */
let mfCategoria = null;
let mfEditId = null;

function cargarFormularioFarmacos(caso){
  renderDrugList('premedicacion', caso);
  renderDrugList('induccion', caso);
  renderDrugList('mantencion', caso);
  renderDrugList('recuperacion', caso);

  const b = caso.bloqueo;
  document.getElementById('bloqueo-realizado').checked = !!b.realizado;
  document.getElementById('bloqueo-campos').hidden = !b.realizado;
  document.getElementById('bloqueo-tecnica').value = b.tecnica || '';
  document.getElementById('bloqueo-farmaco').value = b.farmaco || '';
  document.getElementById('bloqueo-dosis').value = b.dosis || '';
  document.getElementById('bloqueo-ruta').value = b.ruta || 'Epidural';
  document.getElementById('bloqueo-hora').value = b.hora || '';

  document.getElementById('ett-tamano').value = caso.ett.tamano || '';
  document.getElementById('ett-tipo').value = caso.ett.tipo || '';

  document.getElementById('protocolo-observaciones').value = caso.protocoloObservaciones || '';
}

function renderDrugList(categoria, caso){
  const cont = document.getElementById('lista-' + categoria);
  const items = caso.farmacos[categoria] || [];
  cont.innerHTML = '';
  if(items.length === 0){
    cont.innerHTML = `<p class="drug-empty">Sin fármacos registrados.</p>`;
    return;
  }
  items.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'drug-row';
    const detalle = [item.dosis, item.ruta, item.efecto ? 'Efecto: ' + item.efecto : null, item.comentario || null].filter(Boolean).join(' · ');
    row.innerHTML = `
      <div class="drug-row-main">
        <div class="drug-row-nombre">${escapeHtml(item.farmaco || 'Sin nombre')}</div>
        <div class="drug-row-detalle">${escapeHtml(detalle || '—')}</div>
      </div>
      <div class="drug-row-hora">${escapeHtml(item.hora || '—')}</div>
    `;
    row.addEventListener('click', ()=> abrirModalFarmaco(categoria, item.id));
    cont.appendChild(row);
  });
}

function abrirModalFarmaco(categoria, editId){
  mfCategoria = categoria;
  mfEditId = editId || null;

  document.getElementById('modal-farmaco-titulo').textContent =
    (editId ? 'Editar' : 'Añadir') + ' fármaco · ' + NOMBRES_CATEGORIA[categoria];

  document.getElementById('mf-efecto-wrap').hidden = (categoria !== 'premedicacion');
  document.getElementById('btn-eliminar-farmaco').hidden = !editId;

  if(editId){
    const caso = getCasoActual();
    const item = caso.farmacos[categoria].find(f=>f.id===editId);
    document.getElementById('mf-nombre').value = item.farmaco || '';
    document.getElementById('mf-dosis').value = item.dosis || '';
    document.getElementById('mf-ruta').value = item.ruta || 'IV';
    document.getElementById('mf-hora').value = item.hora || horaActualHHMM();
    document.getElementById('mf-efecto').value = item.efecto || '';
    document.getElementById('mf-comentario').value = item.comentario || '';
  }else{
    document.getElementById('mf-nombre').value = '';
    document.getElementById('mf-dosis').value = '';
    document.getElementById('mf-ruta').value = 'IV';
    document.getElementById('mf-hora').value = horaActualHHMM();
    document.getElementById('mf-efecto').value = '';
    document.getElementById('mf-comentario').value = '';
  }

  document.getElementById('modal-farmaco').hidden = false;
  setTimeout(()=> document.getElementById('mf-nombre').focus(), 50);
}

function cerrarModalFarmaco(){
  document.getElementById('modal-farmaco').hidden = true;
  mfCategoria = null; mfEditId = null;
}

function guardarFarmacoModal(){
  const caso = getCasoActual();
  if(!caso || !mfCategoria) return;

  const nombre = document.getElementById('mf-nombre').value.trim();
  if(!nombre){
    mostrarToast('Ingresa el nombre del fármaco');
    return;
  }

  const datos = {
    farmaco: nombre,
    dosis: document.getElementById('mf-dosis').value.trim(),
    ruta: document.getElementById('mf-ruta').value,
    hora: document.getElementById('mf-hora').value || horaActualHHMM(),
    efecto: mfCategoria === 'premedicacion' ? document.getElementById('mf-efecto').value : '',
    comentario: document.getElementById('mf-comentario').value.trim()
  };

  const lista = caso.farmacos[mfCategoria];
  if(mfEditId){
    const idx = lista.findIndex(f=>f.id===mfEditId);
    if(idx>-1) lista[idx] = {...lista[idx], ...datos};
  }else{
    lista.push({ id: uid(), ...datos });
  }

  renderDrugList(mfCategoria, caso);
  guardarCasoActual();
  cerrarModalFarmaco();
  mostrarToast('Fármaco guardado');
}

function eliminarFarmacoModal(){
  const caso = getCasoActual();
  if(!caso || !mfCategoria || !mfEditId) return;
  caso.farmacos[mfCategoria] = caso.farmacos[mfCategoria].filter(f=>f.id!==mfEditId);
  renderDrugList(mfCategoria, caso);
  guardarCasoActual();
  cerrarModalFarmaco();
  mostrarToast('Fármaco eliminado');
}

/* ---------- Bloqueo locorregional ---------- */
function onCambioBloqueo(){
  const caso = getCasoActual();
  if(!caso) return;
  const b = caso.bloqueo;
  b.realizado = document.getElementById('bloqueo-realizado').checked;
  document.getElementById('bloqueo-campos').hidden = !b.realizado;
  b.tecnica = document.getElementById('bloqueo-tecnica').value;
  b.farmaco = document.getElementById('bloqueo-farmaco').value;
  b.dosis = document.getElementById('bloqueo-dosis').value;
  b.ruta = document.getElementById('bloqueo-ruta').value;
  b.hora = document.getElementById('bloqueo-hora').value;
  marcarGuardando();
  guardarCasoActualDebounced();
}

/* ---------- ETT ---------- */
function onCambioETT(){
  const caso = getCasoActual();
  if(!caso) return;
  caso.ett.tamano = document.getElementById('ett-tamano').value;
  caso.ett.tipo = document.getElementById('ett-tipo').value;
  marcarGuardando();
  guardarCasoActualDebounced();
}

/* ---------- Observaciones generales del protocolo ---------- */
function onCambioObservacionesProtocolo(){
  const caso = getCasoActual();
  if(!caso) return;
  caso.protocoloObservaciones = document.getElementById('protocolo-observaciones').value;
  marcarGuardando();
  guardarCasoActualDebounced();
}

function initFarmacosListeners(){
  document.querySelectorAll('[data-add-drug]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirModalFarmaco(btn.dataset.addDrug, null));
  });
  document.getElementById('btn-guardar-farmaco').addEventListener('click', guardarFarmacoModal);
  document.getElementById('btn-cancelar-farmaco').addEventListener('click', cerrarModalFarmaco);
  document.getElementById('btn-eliminar-farmaco').addEventListener('click', eliminarFarmacoModal);
  document.getElementById('modal-farmaco').addEventListener('click', (e)=>{
    if(e.target.id === 'modal-farmaco') cerrarModalFarmaco();
  });

  const bloqueoCard = document.getElementById('bloqueo-realizado').closest('.card');
  bloqueoCard.addEventListener('input', onCambioBloqueo);
  bloqueoCard.addEventListener('change', onCambioBloqueo);

  document.getElementById('ett-tamano').addEventListener('input', onCambioETT);
  document.getElementById('ett-tipo').addEventListener('change', onCambioETT);

  document.getElementById('protocolo-observaciones').addEventListener('input', onCambioObservacionesProtocolo);
}
