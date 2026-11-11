// Textos y cálculos del rodeo lechero, sin React.
// Copia de ganaderia-web-service/src/app/tambo/tambo.js (parte que usa la app): si cambia una, cambiar la otra.

export const CATEGORIAS = ['En Tambo', 'Seca', 'Preparto', 'Vaquillona'];

export const ESTADOS = {
    parida: { texto: 'Parida', color: '#115E59', bg: '#CCFBF1' },
    ok: { texto: 'OK', color: '#3F6212', bg: '#ECFCCB' },
    inseminada: { texto: 'Inseminada', color: '#075985', bg: '#E0F2FE' },
    preñada: { texto: 'Preñada', color: '#166534', bg: '#DCFCE7' },
    vacia: { texto: 'Vacía', color: '#991B1B', bg: '#FEE2E2' },
    rechazo: { texto: 'Rechazo', color: '#9A3412', bg: '#FFEDD5' },
    sin_dato: { texto: 'Sin dato', color: '#4B5563', bg: '#F3F4F6' },
};

// "OK" si ya está apta para inseminar (lo calcula el backend).
export const estadoDe = (v) => ESTADOS[v?.ok ? 'ok' : v?.estado_reproductivo] || ESTADOS.sin_dato;

export const TIPOS_EVENTO = [
    { valor: 'inseminacion', texto: 'Inseminación' },
    { valor: 'tacto', texto: 'Tacto / ecografía' },
    { valor: 'parche', texto: 'Parche de celo' },
    { valor: 'parto', texto: 'Parto' },
    { valor: 'secado', texto: 'Secado' },
    { valor: 'preparto', texto: 'Pasa a preparto' },
    { valor: 'aborto', texto: 'Aborto' },
    { valor: 'rechazo', texto: 'Rechazo (para vender)' },
];

export const textoTipo = (tipo) => TIPOS_EVENTO.find((t) => t.valor === tipo)?.texto ?? tipo;

// Qué evento se carga desde cada grupo de pendientes.
export const PENDIENTES = [
    { clave: 'reemparche', texto: 'Reemparche', evento: 'parche', detalle: (d) => `parche hace ${d} días` },
    { clave: 'a_tactar', texto: 'A tactar', evento: 'tacto', detalle: (d) => `inseminada hace ${d} días` },
    { clave: 'a_reconfirmar', texto: 'A reconfirmar preñez', evento: 'tacto', detalle: (d) => `${d} días de preñez` },
    { clave: 'sin_inseminar', texto: 'OK para inseminar', evento: 'inseminacion', detalle: (d) => `parió hace ${d} días` },
    { clave: 'a_secar', texto: 'A secar', evento: 'secado', detalle: (d) => faltan(d) },
    { clave: 'a_preparto', texto: 'A pasar a preparto', evento: 'preparto', detalle: (d) => faltan(d) },
    { clave: 'parto_proximo', texto: 'Parto próximo', evento: 'parto', detalle: (d) => faltan(d) },
];

function faltan(d) {
    if (d < 0) return `parto atrasado ${-d} días`;
    if (d === 0) return 'pare hoy';
    return `pare en ${d} días`;
}

// Fecha de hoy en Argentina (UTC-3), como la usa el backend.
export const hoyISO = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

// '2026-09-14' -> '14/09/26'
export const fechaCorta = (iso) => {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a.slice(2)}`;
};

export const fechaValida = (texto) =>
    /^\d{4}-\d{2}-\d{2}$/.test(texto || '') && !isNaN(Date.parse(texto)) && texto <= hoyISO();

// "325, 328 330" -> { ids: [..], noEncontradas: ['330'] } según las caravanas del rodeo.
export const caravanasAIds = (texto, vacas) => {
    const porRp = new Map(vacas.filter((v) => v.rp_madre != null).map((v) => [String(v.rp_madre), v.id_madre]));
    const ids = [];
    const noEncontradas = [];
    for (const rp of String(texto || '').split(/[\s,;]+/).filter(Boolean)) {
        const id = porRp.get(rp);
        if (id == null) noEncontradas.push(rp);
        else if (!ids.includes(id)) ids.push(id);
    }
    return { ids, noEncontradas };
};

export const filtrarVacas = (vacas, { busqueda = '', categoria = '' } = {}) => {
    const q = busqueda.trim().toLowerCase();
    return vacas.filter((v) => {
        if (categoria && v.estado !== categoria) return false;
        if (!q) return true;
        return String(v.rp_madre ?? '').includes(q) || (v.nombre || '').toLowerCase().includes(q);
    });
};

// Línea de detalle de la tarjeta de una vaca.
export const detalleVaca = (v) => {
    const partes = [v.estado];
    if (v.rodeo?.nombre) partes.push(v.rodeo.nombre);
    if (v.fecha_ultimo_parto) {
        partes.push(`Parió ${fechaCorta(v.fecha_ultimo_parto)}${v.dias_en_leche != null ? ` (${v.dias_en_leche} DEL)` : ''}`);
    }
    if (v.estado_reproductivo === 'inseminada' && v.fecha_ultimo_servicio) {
        partes.push(`Servicio ${fechaCorta(v.fecha_ultimo_servicio)}${v.numero_servicios > 1 ? ` (${v.numero_servicios}º)` : ''}`);
    }
    if (v.estado_reproductivo === 'preñada' && v.fecha_parto_probable) {
        partes.push(`Parto probable ${fechaCorta(v.fecha_parto_probable)}`);
    }
    return partes.join(' · ');
};

// Arma el cuerpo de POST /tambo/eventos (sin id_madre) desde el formulario.
export const eventoACuerpo = (form) => {
    const base = { tipo: form.tipo, fecha: form.fecha };
    if (form.tipo === 'tacto') {
        base.resultado = form.resultado;
        const dias = parseInt(form.dias_gestacion, 10);
        if (form.resultado === 'preñada' && dias >= 20 && dias <= 290) base.dias_gestacion = dias;
    }
    if (form.tipo === 'inseminacion' && form.toro?.trim()) base.toro = form.toro.trim();
    if (form.observacion?.trim()) base.observacion = form.observacion.trim();
    return base;
};

// ---------- control lechero ----------

const litrosTexto = (n) => (n == null ? '' : String(n).replace('.', ','));

// Lo que se escribe en la planilla: vacío es null, acepta coma decimal.
export const leerLitros = (texto) => {
    const t = String(texto ?? '').trim().replace(',', '.');
    if (t === '') return { valor: null };
    if (!/^\d+(\.\d)?$/.test(t)) return { error: 'Usá números con un decimal como máximo' };
    const valor = Number(t);
    if (valor > 80) return { error: 'Más de 80 litros en un ordeñe' };
    return { valor };
};

// Filas de la planilla: vacas en tambo más las que ya tienen control ese día.
export const armarPlanilla = (vacas, controles = []) => {
    const porVaca = new Map(controles.map((c) => [c.id_madre, c]));
    return vacas
        .filter((v) => v.estado === 'En Tambo' || porVaca.has(v.id_madre))
        .sort((a, b) => (a.rp_madre ?? Infinity) - (b.rp_madre ?? Infinity))
        .map((v) => {
            const c = porVaca.get(v.id_madre);
            return {
                id_madre: v.id_madre,
                rp_madre: v.rp_madre,
                nombre: v.nombre,
                manana: litrosTexto(c?.litros_manana),
                tarde: litrosTexto(c?.litros_tarde),
                guardada: Boolean(c),
            };
        });
};

// Revisa la planilla y arma el cuerpo del POST. Solo manda las vacas con
// litros o las que ya tenían control (vaciarlas lo borra).
export const planillaACuerpo = (filas) => {
    const errores = [];
    const vacas = [];
    let litros = 0;
    let conDato = 0;
    for (const f of filas) {
        const m = leerLitros(f.manana);
        const t = leerLitros(f.tarde);
        if (m.error || t.error) {
            errores.push(`${f.rp_madre ?? f.nombre}: ${m.error || t.error}`);
            continue;
        }
        if (m.valor == null && t.valor == null) {
            if (f.guardada) vacas.push({ id_madre: f.id_madre, litros_manana: null, litros_tarde: null });
            continue;
        }
        vacas.push({ id_madre: f.id_madre, litros_manana: m.valor, litros_tarde: t.valor });
        litros += (m.valor ?? 0) + (t.valor ?? 0);
        conDato += 1;
    }
    litros = Math.round(litros * 10) / 10;
    return {
        errores,
        vacas,
        resumen: { vacas: conDato, litros, promedio: conDato ? Math.round((litros / conDato) * 10) / 10 : null },
    };
};

// Mensaje de error del backend (a veces viene como lista).
export const mensajeError = (res, porDefecto = 'No se pudo guardar') => {
    const m = res?.data?.message;
    return Array.isArray(m) ? m.join(', ') : m || porDefecto;
};
