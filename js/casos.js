'use strict';

function renderListaCasos(filtro){
  filtro = (filtro || '').trim().toLowerCase();
  const cont = document.getElementById('lista-casos');
  const vacio = document.getElementById('lista-vacia');
  cont.innerHTML = '';

  let casos = ESTADO.casos.slice().sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));

  if(filtro){
    casos = casos.filter(c=>{
      const p = c.paciente;
      const hay = [p.nombre, p.especie, p.especieOtro, p.raza, p.procedimiento].join(' ').toLowerCase();
      return hay.includes(filtro);
    });
  }

  if(ESTADO.casos.length === 0){
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  if(casos.length === 0){
    const p = document.createElement('p');
    p.className = 'empty-inline';
    p.textContent = 'No se encontraron casos con esa búsqueda.';
    cont.appendChild(p);
    return;
  }

  casos.forEach(caso=>{
    const p = caso.paciente;
    const finalizado = casoEstaFinalizado(caso);
    const div = document.createElement('div');
    div.className = 'caso-card' + (finalizado ? ' finalizado' : '');
    const especie = p.especie === 'Otro' ? (p.especieOtro || 'Otro') : p.especie;

    div.innerHTML = `
      <div class="caso-card-main">
        <div class="caso-card-nombre">${escapeHtml(p.nombre || 'Paciente sin nombre')}</div>
        <div class="caso-card-meta">${escapeHtml(especie || '—')}${p.raza ? ' · ' + escapeHtml(p.raza) : ''}${p.procedimiento ? ' · ' + escapeHtml(p.procedimiento) : ''}</div>
        <div class="caso-card-fecha">${formatFechaLegible(p.fechaInicio) || 'Sin fecha'}${p.horaInicio ? ' · ' + p.horaInicio : ''}</div>
      </div>
      <span class="caso-card-badge ${finalizado ? 'finalizado':''}">${finalizado ? 'Finalizado' : 'En curso'}</span>
      <div class="caso-card-actions">
        <button class="btn-icon btn-icon-danger" data-del="${caso.id}" aria-label="Eliminar caso" title="Eliminar caso">
          <svg viewBox="0 0 24 24" class="icon"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>
        </button>
      </div>
    `;
    div.addEventListener('click', ()=> abrirCaso(caso.id));
    div.querySelector('[data-del]').addEventListener('click', (e)=>{
      e.stopPropagation();
      confirmarEliminarCaso(caso.id, p.nombre);
    });
    cont.appendChild(div);
  });
}

function confirmarEliminarCaso(id, nombre){
  const ok = window.confirm(`¿Eliminar el caso de "${nombre || 'este paciente'}"? Esta acción no se puede deshacer.`);
  if(!ok) return;
  eliminarCaso(id);
  mostrarToast('Caso eliminado');
  renderListaCasos(document.getElementById('buscar-caso').value);
}

function abrirCaso(id){
  ESTADO.casoActualId = id;
  const caso = getCasoActual();
  if(!caso) return;

  document.getElementById('view-lista').hidden = true;
  document.getElementById('view-caso').hidden = false;
  document.getElementById('fab-registro').hidden = false;

  cargarFormularioPaciente(caso);
  cargarFormularioFarmacos(caso);
  renderTimeline(caso);
  renderInforme(caso);
  actualizarTituloCaso(caso);
  cambiarSubtab('datos');
  window.scrollTo(0,0);
}

function actualizarTituloCaso(caso){
  const p = caso.paciente;
  document.getElementById('caso-titulo').textContent = p.nombre || 'Paciente sin nombre';
  const especie = p.especie === 'Otro' ? (p.especieOtro || 'Otro') : p.especie;
  const partes = [especie, p.procedimiento].filter(Boolean);
  document.getElementById('caso-subtitulo').textContent = partes.length ? partes.join(' · ') : 'Sin datos adicionales';
}

function volverALista(){
  ESTADO.casoActualId = null;
  document.getElementById('view-caso').hidden = true;
  document.getElementById('view-lista').hidden = false;
  document.getElementById('fab-registro').hidden = true;
  renderListaCasos(document.getElementById('buscar-caso').value);
}

function abrirModalNuevoCaso(){
  document.getElementById('nuevo-caso-nombre').value = '';
  document.getElementById('modal-caso').hidden = false;
  setTimeout(()=> document.getElementById('nuevo-caso-nombre').focus(), 50);
}

function cerrarModalNuevoCaso(){
  document.getElementById('modal-caso').hidden = true;
}

function confirmarCrearCaso(){
  const nombre = document.getElementById('nuevo-caso-nombre').value.trim();
  const caso = crearCaso(nombre);
  cerrarModalNuevoCaso();
  mostrarToast('Caso creado');
  abrirCaso(caso.id);
}
