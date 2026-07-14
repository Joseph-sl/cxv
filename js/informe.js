'use strict';

const PARAMS_GRAFICO = [
  { key:'fc',    label:'Frecuencia cardíaca (FC)',              unit:'lpm',  color:'#0f6e6e' },
  { key:'fr',    label:'Frecuencia respiratoria (FR)',          unit:'rpm',  color:'#2f8f5b' },
  { key:'etco2', label:'EtCO₂',                                  unit:'mmHg', color:'#8a5cf6' },
  { key:'spo2',  label:'SpO₂',                                   unit:'%',    color:'#0ea5e9' },
  { key:'pas',   label:'Presión arterial sistólica (PAS)',      unit:'mmHg', color:'#e8734a' },
  { key:'pad',   label:'Presión arterial diastólica (PAD)',     unit:'mmHg', color:'#c85a34' },
  { key:'pam',   label:'Presión arterial media (PAM)',          unit:'mmHg', color:'#b91c1c' },
  { key:'temp',  label:'Temperatura corporal (T°)',              unit:'°C',   color:'#f59e0b' },
  { key:'pinh',  label:'Concentración de anestésico inhalatorio (%inh)', unit:'%', color:'#6366f1' }
];

let CHART_INSTANCES = {};

function parametrosOrdenados(caso){
  return caso.registros
    .filter(r=> r.categoria === 'parametros')
    .slice()
    .sort((a,b)=> (horaAMinutos(a.hora) ?? 0) - (horaAMinutos(b.hora) ?? 0));
}

function observacionesOrdenadas(caso){
  return caso.registros
    .filter(r=> r.categoria === 'observacion')
    .slice()
    .sort((a,b)=> (horaAMinutos(a.hora) ?? 0) - (horaAMinutos(b.hora) ?? 0));
}

function renderInforme(caso){
  if(!caso) return;
  renderTablaParametros(caso);
  renderObservacionesInforme(caso);
  renderGraficos(caso);
}

function renderTablaParametros(caso){
  const body = document.getElementById('tabla-parametros-body');
  const vacio = document.getElementById('tabla-parametros-vacia');
  const params = parametrosOrdenados(caso);
  body.innerHTML = '';

  if(params.length === 0){
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  params.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.hora)}</td>
      <td>${escapeHtml(valOr(r.fc))}</td>
      <td>${escapeHtml(valOr(r.fr))}</td>
      <td>${escapeHtml(valOr(r.etco2))}</td>
      <td>${escapeHtml(valOr(r.spo2))}</td>
      <td>${escapeHtml(valOr(r.pas))}</td>
      <td>${escapeHtml(valOr(r.pad))}</td>
      <td>${escapeHtml(valOr(r.pam))}</td>
      <td>${escapeHtml(valOr(r.temp))}</td>
      <td>${escapeHtml(valOr(r.pinh))}</td>
      <td>${escapeHtml(r.comentario || '')}</td>
    `;
    body.appendChild(tr);
  });
}

function renderObservacionesInforme(caso){
  const ul = document.getElementById('lista-observaciones');
  const vacio = document.getElementById('lista-observaciones-vacia');
  const obs = observacionesOrdenadas(caso);
  ul.innerHTML = '';
  if(obs.length === 0){ vacio.hidden = false; return; }
  vacio.hidden = true;
  obs.forEach(o=>{
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(o.hora)}</b>${escapeHtml(o.comentario)}`;
    ul.appendChild(li);
  });
}

function renderGraficos(caso){
  const cont = document.getElementById('informe-graficos');
  cont.innerHTML = '';
  Object.values(CHART_INSTANCES).forEach(ch=> ch.destroy());
  CHART_INSTANCES = {};

  const params = parametrosOrdenados(caso);
  if(params.length === 0 || typeof Chart === 'undefined') return;

  PARAMS_GRAFICO.forEach(def=>{
    const puntos = params
      .map(r=> ({ hora: r.hora, valor: r[def.key] }))
      .filter(p=> p.valor !== '' && p.valor !== null && p.valor !== undefined);

    if(puntos.length === 0) return;

    const card = document.createElement('div');
    card.className = 'chart-card';
    const canvasId = 'chart-' + def.key;
    card.innerHTML = `<h4>${escapeHtml(def.label)} ${def.unit ? '('+def.unit+')' : ''}</h4><canvas id="${canvasId}" height="220"></canvas>`;
    cont.appendChild(card);

    const ctx = document.getElementById(canvasId).getContext('2d');
    CHART_INSTANCES[def.key] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: puntos.map(p=>p.hora),
        datasets: [{
          label: def.label,
          data: puntos.map(p=>p.valor),
          borderColor: def.color,
          backgroundColor: def.color + '22',
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointBackgroundColor: def.color,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display:false } },
        scales: {
          x: { title:{display:true, text:'Hora'}, grid:{color:'#e5eeee'} },
          y: { title:{display:true, text: def.unit || ''}, grid:{color:'#e5eeee'} }
        }
      }
    });
  });

  if(cont.children.length === 0){
    cont.innerHTML = '<p class="empty-inline">No hay suficientes datos numéricos para graficar todavía.</p>';
  }
}

/* =========================================================
   GENERACIÓN DE PDF
   ========================================================= */
function generarInformePDF(){
  const caso = getCasoActual();
  if(!caso) return;
  if(!window.jspdf){
    mostrarToast('No se pudo cargar la librería de PDF (revisa tu conexión)');
    return;
  }

  mostrarToast('Generando informe PDF…');

  // aseguramos que los gráficos estén dibujados con el tamaño correcto
  renderGraficos(caso);

  setTimeout(()=>{
    try{
      construirPDF(caso);
    }catch(err){
      console.error(err);
      mostrarToast('Ocurrió un error generando el PDF');
    }
  }, 120);
}

function construirPDF(caso){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const marginX = 40;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 46;

  function checkPageBreak(need){
    if(y + need > pageH - 36){ doc.addPage(); y = 44; }
  }
  function tituloSeccion(txt){
    checkPageBreak(26);
    doc.setFont('helvetica','bold'); doc.setFontSize(11.5); doc.setTextColor(10,79,79);
    doc.text(txt, marginX, y);
    y += 12;
  }

  // ---- Encabezado ----
  doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(10,79,79);
  doc.text('Informe de Anestesia Veterinaria', marginX, y);
  y += 8;
  doc.setDrawColor(232,115,74); doc.setLineWidth(1.6);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(110,130,130);
  doc.text('www.fichasvale.site - Generado el ' + new Date().toLocaleString('es-CL'), marginX, y+10);
  y += 26;

  // ---- Datos del paciente ----
  const p = caso.paciente;
  const especie = p.especie === 'Otro' ? (p.especieOtro || 'Otro') : p.especie;
  const datosPaciente = [
    ['Nombre', p.nombre || '—'], ['Especie', especie || '—'], ['Raza', p.raza || '—'],
    ['Edad', p.edadValor ? `${p.edadValor} ${p.edadUnidad}` : '—'],
    ['Sexo', p.sexo || '—'], ['Estado reproductivo', p.estadoReproductivo || '—'],
    ['Peso', p.peso ? `${p.peso} kg` : '—'], ['Condición corporal', p.condicionCorporal ? `${p.condicionCorporal}/9` : '—'],
    ['ASA', p.asa ? `${p.asa}${p.asaE ? 'E' : ''}` : '—'], ['Procedimiento', p.procedimiento || '—'],
    ['Campo clínico', p.campoClinico || '—'],
    ['Inicio', [formatFechaLegible(p.fechaInicio), p.horaInicio].filter(Boolean).join('  ') || '—'],
    ['Fin', [formatFechaLegible(p.fechaFin), p.horaFin].filter(Boolean).join('  ') || '—']
  ];
  (p.camposPersonalizados || []).forEach(cf=>{
    datosPaciente.push([cf.nombre || '—', cf.valor || '—']);
  });
  tituloSeccion('Datos del paciente');
  doc.autoTable({
    startY: y, margin:{ left:marginX, right:marginX },
    body: datosPaciente, theme:'grid',
    styles:{ fontSize:9, cellPadding:5, textColor:[20,40,40] },
    columnStyles:{ 0:{ fontStyle:'bold', cellWidth:140, fillColor:[245,249,249] } }
  });
  y = doc.lastAutoTable.finalY + 20;

  // ---- Fármacos ----
  function tablaFarmacos(titulo, items, conEfecto){
    if(!items || items.length === 0) return;
    checkPageBreak(50);
    tituloSeccion(titulo);
    const head = conEfecto
      ? [['Fármaco','Dosis','Ruta','Hora','Efecto','Comentario']]
      : [['Fármaco','Dosis','Ruta','Hora','Comentario']];
    const body = items.map(it=> conEfecto
      ? [it.farmaco||'—', it.dosis||'—', it.ruta||'—', it.hora||'—', it.efecto||'—', it.comentario||'—']
      : [it.farmaco||'—', it.dosis||'—', it.ruta||'—', it.hora||'—', it.comentario||'—']);
    doc.autoTable({
      startY:y, margin:{ left:marginX, right:marginX },
      head, body, theme:'grid',
      styles:{ fontSize:9, cellPadding:5 },
      headStyles:{ fillColor:[15,110,110] }
    });
    y = doc.lastAutoTable.finalY + 18;
  }
  tablaFarmacos('Premedicación', caso.farmacos.premedicacion, true);
  tablaFarmacos('Inducción', caso.farmacos.induccion, false);
  tablaFarmacos('Mantención', caso.farmacos.mantencion, false);
  tablaFarmacos('Recuperación', caso.farmacos.recuperacion, false);

  // ---- Observaciones del protocolo ----
  if(caso.protocoloObservaciones && caso.protocoloObservaciones.trim()){
    checkPageBreak(50);
    tituloSeccion('Observaciones del protocolo');
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(20,40,40);
    const anchoMax = pageW - marginX*2;
    const lineas = doc.splitTextToSize(caso.protocoloObservaciones.trim(), anchoMax);
    lineas.forEach(linea=>{
      checkPageBreak(14);
      doc.text(linea, marginX, y);
      y += 13;
    });
    y += 12;
  }

  // ---- Bloqueo + ETT ----
  checkPageBreak(60);
  tituloSeccion('Bloqueo locorregional y vía aérea');
  const b = caso.bloqueo;
  const bloqueoBody = b.realizado
    ? [['Técnica / sitio', b.tecnica||'—'], ['Fármaco', b.farmaco||'—'], ['Dosis', b.dosis||'—'], ['Ruta', b.ruta||'—'], ['Hora', b.hora||'—']]
    : [['Bloqueo locorregional', 'No se realizó']];
  bloqueoBody.push(['Tubo endotraqueal', caso.ett.tamano ? `${caso.ett.tamano} mm DI${caso.ett.tipo ? ' · ' + caso.ett.tipo : ''}` : '—']);
  doc.autoTable({
    startY:y, margin:{ left:marginX, right:marginX },
    body: bloqueoBody, theme:'grid',
    styles:{ fontSize:9, cellPadding:5 },
    columnStyles:{ 0:{ fontStyle:'bold', cellWidth:140, fillColor:[245,249,249] } }
  });
  y = doc.lastAutoTable.finalY + 20;

  // ---- Tabla de parámetros ----
  const params = parametrosOrdenados(caso);
  checkPageBreak(60);
  tituloSeccion('Tabla de parámetros registrados');
  if(params.length === 0){
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(90,110,110);
    doc.text('No se registraron parámetros durante este caso.', marginX, y);
    y += 20;
  }else{
    doc.autoTable({
      startY:y, margin:{ left:marginX, right:marginX },
      head:[['Hora','FC','FR','EtCO₂','SpO₂','PAS','PAD','PAM','T°','%inh','Comentario']],
      body: params.map(r=>[r.hora, valOr(r.fc,''), valOr(r.fr,''), valOr(r.etco2,''), valOr(r.spo2,''), valOr(r.pas,''), valOr(r.pad,''), valOr(r.pam,''), valOr(r.temp,''), valOr(r.pinh,''), r.comentario||'']),
      theme:'grid', styles:{ fontSize:7.8, cellPadding:4 }, headStyles:{ fillColor:[15,110,110], fontSize:7.8 }
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  // ---- Observaciones ----
  const obs = observacionesOrdenadas(caso);
  checkPageBreak(50);
  tituloSeccion('Observaciones');
  if(obs.length === 0){
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(90,110,110);
    doc.text('No se registraron observaciones.', marginX, y);
    y += 20;
  }else{
    doc.autoTable({
      startY:y, margin:{ left:marginX, right:marginX },
      head:[['Hora','Observación']],
      body: obs.map(o=>[o.hora, o.comentario]),
      theme:'grid', styles:{ fontSize:9, cellPadding:5 }, headStyles:{ fillColor:[232,115,74] },
      columnStyles:{ 0:{ cellWidth:60, fontStyle:'bold' } }
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  // ---- Gráficos ----
  const chartWidth = pageW - marginX*2;
  const chartHeight = chartWidth * 0.42;

  PARAMS_GRAFICO.forEach(def=>{
    const chart = CHART_INSTANCES[def.key];
    if(!chart) return;
    checkPageBreak(chartHeight + 34);
    tituloSeccion(`Gráfico: ${def.label}`);
    try{
      const img = chart.canvas.toDataURL('image/png', 1.0);
      doc.addImage(img, 'PNG', marginX, y, chartWidth, chartHeight);
      y += chartHeight + 20;
    }catch(e){
      console.error('No se pudo capturar gráfico', def.key, e);
    }
  });

  const nombreArchivo = `Informe_${(caso.paciente.nombre||'paciente').replace(/[^a-z0-9]+/gi,'_')}_${caso.paciente.fechaInicio || hoyISO()}.pdf`;
  doc.save(nombreArchivo);
  mostrarToast('Informe PDF descargado');
}
