// utils.js
// Funciones utilitarias usadas por storage.js, casos.js, farmacos.js, registro.js y app.js

/**
 * Genera un identificador único simple (no requiere librerías externas).
 * Combina timestamp en base36 + un fragmento aleatorio para evitar colisiones.
 */
function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Devuelve una versión "debounced" de fn: solo se ejecuta después de que
 * pasen `delay` ms sin que se vuelva a llamar. Útil para inputs (buscar-caso)
 * y guardado automático (guardarCasoActualDebounced).
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Devuelve la fecha de hoy en formato ISO corto (YYYY-MM-DD),
 * usando la hora local del dispositivo (no UTC).
 */
function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Devuelve la hora actual en formato HH:MM (24h), hora local.
 */
function horaActualHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Convierte una hora "HH:MM" a minutos totales desde medianoche, para poder
 * ordenar registros cronológicamente. Devuelve null si el formato es inválido.
 */
function horaAMinutos(hora) {
  if (!hora || typeof hora !== 'string') return null;
  const partes = hora.split(':');
  if (partes.length !== 2) return null;
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a formato legible en español, ej: "14 jul 2026".
 */
function formatFechaLegible(fechaISO) {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [y, m, d] = partes;
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const mesIdx = parseInt(m, 10) - 1;
  if (mesIdx < 0 || mesIdx > 11) return fechaISO;
  return `${parseInt(d, 10)} ${meses[mesIdx]} ${y}`;
}

/**
 * Escapa caracteres especiales de HTML para evitar inyección al insertar
 * texto del usuario con innerHTML/template strings.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve el valor si existe (no null/undefined/''), o el valor por defecto
 * en caso contrario. Útil para mostrar '—' en celdas de tabla vacías.
 */
function valOr(valor, porDefecto = '—') {
  if (valor === null || valor === undefined || valor === '') return porDefecto;
  return valor;
}

/**
 * Muestra un mensaje breve tipo "toast" en la parte inferior de la pantalla.
 * Requiere el elemento <div id="toast" class="toast"></div> en index.html
 * (ya presente) y las clases .toast/.toast.show en styles.css (ya presentes).
 */
let _toastTimer = null;
function mostrarToast(mensaje, duracionMs = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, duracionMs);
}
