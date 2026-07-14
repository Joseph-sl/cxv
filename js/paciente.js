'use strict';

const CAMPOS_PACIENTE = [
  ['p-nombre','nombre'], ['p-especie','especie'], ['p-especie-otro','especieOtro'],
  ['p-raza','raza'], ['p-edad-valor','edadValor'], ['p-edad-unidad','edadUnidad'],
  ['p-sexo','sexo'], ['p-estado-repro','estadoReproductivo'], ['p-peso','peso'],
  ['p-cc','condicionCorporal'], ['p-asa','asa'], ['p-procedimiento','procedimiento'],
  ['p-campo-clinico','campoClinico'],
  ['p-fecha-inicio','fechaInicio'], ['p-hora-inicio','horaInicio'],
  ['p-fecha-fin','fechaFin'], ['p-hora-fin','horaFin']
];

function cargarFormularioPaciente(caso){
  const p = caso.paciente;
  CAMPOS_PACIENTE.forEach(([elId, key])=>{
    const el = document.getElementById(elId);
    if(el) el.value = p[key] ?? '';
  });
  document.getElementById('p-asa-e').checked = !!p.asaE;
  document.getElementById('p-especie-otro-wrap').hidden = (p.especie !== 'Otro');
  renderCamposPersonalizados(caso);
}

function onCambioPaciente(){
  const caso = getCasoActual();
  if(!caso) return;
  const p = caso.paciente;

  CAMPOS_PACIENTE.forEach(([elId, key])=>{
    const el = document.getElementById(elId);
    if(el) p[key] = el.value;
  });
  p.asaE = document.getElementById('p-asa-e').checked;
  document.getElementById('p-especie-otro-wrap').hidden = (p.especie !== 'Otro');

  actualizarTituloCaso(caso);
  marcarGuardando();
  guardarCasoActualDebounced();
}

function initPacienteListeners(){
  const form = document.getElementById('form-paciente');
  form.addEventListener('input', onCambioPaciente);
  form.addEventListener('change', onCambioPaciente);
  document.getElementById('p-asa-e').addEventListener('change', onCambioPaciente);

  document.getElementById('btn-add-campo-personalizado').addEventListener('click', ()=> abrirModalCampo(null));
  document.getElementById('btn-guardar-campo').addEventListener('click', guardarCampoModal);
  document.getElementById('btn-cancelar-campo').addEventListener('click', cerrarModalCampo);
  document.getElementById('btn-eliminar-campo').addEventListener('click', eliminarCampoModal);
  document.getElementById('modal-campo').addEventListener('click', (e)=>{
    if(e.target.id === 'modal-campo') cerrarModalCampo();
  });
}

/* ---------- Campos personalizados del paciente ---------- */
let cpEditId = null;

function renderCamposPersonalizados(caso){
  const cont = document.getElementById('lista-campos-personalizados');
  const items = caso.paciente.camposPersonalizados || [];
  cont.innerHTML = '';
  if(items.length === 0){
    cont.innerHTML = `<p class="drug-empty">Aún no has agregado campos adicionales.</p>`;
    return;
  }
  items.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'drug-row';
    row.innerHTML = `
      <div class="drug-row-main">
        <div class="drug-row-nombre">${escapeHtml(item.nombre || 'Sin nombre')}</div>
        <div class="drug-row-detalle">${escapeHtml(item.valor || '—')}</div>
      </div>
    `;
    row.addEventListener('click', ()=> abrirModalCampo(item.id));
    cont.appendChild(row);
  });
}

function abrirModalCampo(editId){
  cpEditId = editId || null;

  document.getElementById('modal-campo-titulo').textContent = editId ? 'Editar campo' : 'Agregar campo';
  document.getElementById('btn-eliminar-campo').hidden = !editId;

  if(editId){
    const caso = getCasoActual();
    const item = (caso.paciente.camposPersonalizados || []).find(c=>c.id===editId);
    document.getElementById('cp-nombre').value = item ? item.nombre : '';
    document.getElementById('cp-valor').value = item ? item.valor : '';
  }else{
    document.getElementById('cp-nombre').value = '';
    document.getElementById('cp-valor').value = '';
  }

  document.getElementById('modal-campo').hidden = false;
  setTimeout(()=> document.getElementById('cp-nombre').focus(), 50);
}

function cerrarModalCampo(){
  document.getElementById('modal-campo').hidden = true;
  cpEditId = null;
}

function guardarCampoModal(){
  const caso = getCasoActual();
  if(!caso) return;

  const nombre = document.getElementById('cp-nombre').value.trim();
  if(!nombre){
    mostrarToast('Ingresa el nombre del parámetro');
    return;
  }
  const valor = document.getElementById('cp-valor').value.trim();

  if(!caso.paciente.camposPersonalizados) caso.paciente.camposPersonalizados = [];
  const lista = caso.paciente.camposPersonalizados;

  if(cpEditId){
    const idx = lista.findIndex(c=>c.id===cpEditId);
    if(idx>-1) lista[idx] = {...lista[idx], nombre, valor};
  }else{
    lista.push({ id: uid(), nombre, valor });
  }

  renderCamposPersonalizados(caso);
  guardarCasoActual();
  cerrarModalCampo();
  mostrarToast('Campo guardado');
}

function eliminarCampoModal(){
  const caso = getCasoActual();
  if(!caso || !cpEditId) return;
  caso.paciente.camposPersonalizados = caso.paciente.camposPersonalizados.filter(c=>c.id!==cpEditId);
  renderCamposPersonalizados(caso);
  guardarCasoActual();
  cerrarModalCampo();
  mostrarToast('Campo eliminado');
}
