'use strict';

const STORAGE_KEY = 'vetanest_casos_v1';

/* Estado global en memoria, espejo de localStorage */
let ESTADO = {
  casos: [],
  casoActualId: null
};

function casoVacio(nombreInicial){
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paciente: {
      nombre: nombreInicial || '',
      especie: 'Canino',
      especieOtro: '',
      raza: '',
      edadValor: '',
      edadUnidad: 'años',
      sexo: 'Macho',
      estadoReproductivo: 'Entero',
      peso: '',
      condicionCorporal: '',
      asa: '',
      asaE: false,
      procedimiento: '',
      campoClinico: '',
      camposPersonalizados: [],
      fechaInicio: hoyISO(),
      horaInicio: horaActualHHMM(),
      fechaFin: '',
      horaFin: ''
    },
    farmacos: {
      premedicacion: [],
      induccion: [],
      mantencion: [],
      recuperacion: []
    },
    bloqueo: {
      realizado: false,
      tecnica: '', farmaco: '', dosis: '', ruta: 'Epidural', hora: ''
    },
    ett: { tamano: '', tipo: '' },
    protocoloObservaciones: '',
    registros: []
  };
}

function cargarCasos(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    ESTADO.casos = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Error leyendo localStorage', e);
    ESTADO.casos = [];
  }
  migrarCasos();
}

/* Asegura que los casos guardados con una versión anterior de la app
   tengan todos los campos que las versiones nuevas esperan (ej: la
   categoría de fármacos "recuperacion" agregada más adelante). */
function migrarCasos(){
  ESTADO.casos.forEach(c=>{
    if(!c.farmacos) c.farmacos = { premedicacion: [], induccion: [], mantencion: [], recuperacion: [] };
    if(!c.farmacos.recuperacion) c.farmacos.recuperacion = [];
    if(c.paciente && c.paciente.campoClinico === undefined) c.paciente.campoClinico = '';
    if(c.paciente && !c.paciente.camposPersonalizados) c.paciente.camposPersonalizados = [];
    if(c.protocoloObservaciones === undefined) c.protocoloObservaciones = '';
  });
}

function persistir(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ESTADO.casos));
    return true;
  }catch(e){
    console.error('Error guardando en localStorage', e);
    mostrarToast('No se pudo guardar: almacenamiento lleno o no disponible');
    return false;
  }
}

function getCasoActual(){
  return ESTADO.casos.find(c => c.id === ESTADO.casoActualId) || null;
}

function guardarCasoActual(){
  const caso = getCasoActual();
  if(!caso) return;
  caso.updatedAt = new Date().toISOString();
  persistir();
  const ind = document.getElementById('guardado-indicador');
  if(ind){
    ind.textContent = 'Guardado ✓';
    ind.classList.remove('saving');
  }
}

const guardarCasoActualDebounced = debounce(guardarCasoActual, 400);

function marcarGuardando(){
  const ind = document.getElementById('guardado-indicador');
  if(ind){ ind.textContent = 'Guardando…'; ind.classList.add('saving'); }
}

function crearCaso(nombre){
  const c = casoVacio(nombre);
  ESTADO.casos.unshift(c);
  persistir();
  return c;
}

function eliminarCaso(id){
  ESTADO.casos = ESTADO.casos.filter(c => c.id !== id);
  persistir();
}

function casoEstaFinalizado(caso){
  return !!(caso.paciente.fechaFin && caso.paciente.horaFin);
}

/* ---------- Título editable de la app ("Registro XXXX") ---------- */
const TITULO_APP_KEY = 'vetanest_titulo_app_v1';

function getTituloAppVariable(){
  try{
    return localStorage.getItem(TITULO_APP_KEY) || 'Valentina Salazar';
  }catch(e){
    return 'Valentina Salazar';
  }
}

function setTituloAppVariable(valor){
  try{
    localStorage.setItem(TITULO_APP_KEY, valor);
    return true;
  }catch(e){
    console.error('Error guardando el título', e);
    return false;
  }
}
