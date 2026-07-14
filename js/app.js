'use strict';

function cambiarSubtab(nombre){
  document.querySelectorAll('.subtab').forEach(b=>{
    const activo = b.dataset.tab === nombre;
    b.classList.toggle('active', activo);
    b.setAttribute('aria-selected', activo ? 'true':'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active', p.id === 'tab-' + nombre);
  });
  document.getElementById('fab-registro').style.display = (nombre === 'registro') ? 'flex' : 'none';

  // Redibujar el informe (tabla + gráficos) al entrar, para que Chart.js mida
  // correctamente el tamaño del canvas ahora que el panel es visible.
  if(nombre === 'informe'){
    const caso = getCasoActual();
    if(caso) renderInforme(caso);
  }
}

function initNavListeners(){
  document.querySelectorAll('.subtab').forEach(b=>{
    b.addEventListener('click', ()=> cambiarSubtab(b.dataset.tab));
  });
  document.getElementById('btn-volver').addEventListener('click', volverALista);

  document.getElementById('btn-nuevo-caso').addEventListener('click', abrirModalNuevoCaso);
  document.getElementById('btn-nuevo-caso-vacio').addEventListener('click', abrirModalNuevoCaso);
  document.getElementById('btn-cancelar-nuevo-caso').addEventListener('click', cerrarModalNuevoCaso);
  document.getElementById('btn-crear-caso').addEventListener('click', confirmarCrearCaso);
  document.getElementById('nuevo-caso-nombre').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') confirmarCrearCaso();
  });
  document.getElementById('modal-caso').addEventListener('click', (e)=>{
    if(e.target.id === 'modal-caso') cerrarModalNuevoCaso();
  });

  document.getElementById('buscar-caso').addEventListener('input', debounce((e)=>{
    renderListaCasos(e.target.value);
  }, 120));

  document.getElementById('btn-descargar-pdf').addEventListener('click', generarInformePDF);
}

function init(){
  cargarCasos();
  cargarTituloApp();
  initTituloAppListeners();
  initNavListeners();
  initPacienteListeners();
  initFarmacosListeners();
  initRegistroListeners();
  renderListaCasos('');
}

/* ---------- Título editable de la app ("Registro XXXX") ---------- */
function cargarTituloApp(){
  document.getElementById('titulo-app-variable').textContent = getTituloAppVariable();
}

function iniciarEdicionTitulo(){
  const span = document.getElementById('titulo-app-variable');
  const input = document.getElementById('titulo-app-input');
  input.value = span.textContent;
  span.hidden = true;
  input.hidden = false;
  input.focus();
  input.select();
}

function confirmarEdicionTitulo(){
  const span = document.getElementById('titulo-app-variable');
  const input = document.getElementById('titulo-app-input');
  const valor = input.value.trim() || 'Valentina Salazar';
  span.textContent = valor;
  setTituloAppVariable(valor);
  span.hidden = false;
  input.hidden = true;
}

function initTituloAppListeners(){
  const span = document.getElementById('titulo-app-variable');
  const input = document.getElementById('titulo-app-input');
  const btn = document.getElementById('btn-editar-titulo');

  btn.addEventListener('click', iniciarEdicionTitulo);
  span.addEventListener('click', iniciarEdicionTitulo);
  input.addEventListener('blur', confirmarEdicionTitulo);
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') input.blur();
    if(e.key === 'Escape'){ input.value = span.textContent; input.blur(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
