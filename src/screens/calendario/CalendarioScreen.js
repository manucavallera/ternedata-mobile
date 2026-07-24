import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

// YYYY-MM-DD local, sin corrimiento de timezone
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => toISO(new Date());

export default function CalendarioScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { obtenerSnapshotHook, obtenerDiasConCambiosHook } = useBussinesMicroservicio();

    const [fecha, setFecha] = useState(hoyISO());
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return { anio: d.getFullYear(), mes: d.getMonth() }; // mes 0-11
    });
    const [snapshot, setSnapshot] = useState(null);
    const [diasCambio, setDiasCambio] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Los hooks del microservicio son funciones nuevas en cada render: NO van en
    // deps (dispararía un loop de requests -> 429). Keyed solo en `fecha`.
    useEffect(() => {
        let cancelado = false;
        (async () => {
            setLoading(true);
            setError(null);
            const res = await obtenerSnapshotHook(fecha);
            if (cancelado) return;
            if (res?.error || !res?.data || res?.status >= 400) {
                setError('No se pudo cargar el estado de esa fecha.');
                setSnapshot(null);
            } else {
                setSnapshot(res.data);
            }
            setLoading(false);
        })();
        return () => { cancelado = true; };
    }, [fecha]);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            const desde = toISO(new Date(cursor.anio, cursor.mes, 1));
            const hasta = toISO(new Date(cursor.anio, cursor.mes + 1, 0));
            const res = await obtenerDiasConCambiosHook(desde, hasta);
            if (cancelado) return;
            setDiasCambio(Array.isArray(res?.data) ? res.data : []);
        })();
        return () => { cancelado = true; };
    }, [cursor.anio, cursor.mes]);

    const celdas = useMemo(() => {
        const primerDia = new Date(cursor.anio, cursor.mes, 1).getDay();
        const totalDias = new Date(cursor.anio, cursor.mes + 1, 0).getDate();
        const arr = [];
        for (let i = 0; i < primerDia; i++) arr.push(null);
        for (let d = 1; d <= totalDias; d++) arr.push(d);
        return arr;
    }, [cursor]);

    const mesPrev = () => setCursor(c => (c.mes === 0 ? { anio: c.anio - 1, mes: 11 } : { anio: c.anio, mes: c.mes - 1 }));
    const mesNext = () => setCursor(c => (c.mes === 11 ? { anio: c.anio + 1, mes: 0 } : { anio: c.anio, mes: c.mes + 1 }));

    const hoy = hoyISO();

    const resumen = snapshot ? [
        { label: 'Vacas', n: snapshot.madres?.length || 0, icon: '🐄' },
        { label: 'Terneros', n: snapshot.terneros?.length || 0, icon: '🐮' },
        { label: 'Rodeos', n: snapshot.rodeos?.length || 0, icon: '🌿' },
        { label: 'Dietas', n: snapshot.dietas?.length || 0, icon: '🍽️' },
        { label: 'Tratamientos', n: snapshot.tratamientos?.length || 0, icon: '💉' },
        { label: 'Eventos', n: snapshot.eventos?.length || 0, icon: '📌' },
    ] : [];

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📅 Calendario histórico</Text>
                <Text style={styles.headerSub}>Elegí una fecha y mirá cómo estaba el rodeo ese día</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avisoBox}>
                    <Text style={styles.avisoText}>
                        ⚠️ Los datos anteriores a la puesta en marcha del historial se muestran como estado base aproximado.
                        Desde su activación, cada cambio queda registrado.
                    </Text>
                </View>

                {/* Calendario */}
                <View style={styles.card}>
                    <View style={styles.mesRow}>
                        <TouchableOpacity onPress={mesPrev} style={styles.mesBtn}><Text style={styles.mesBtnText}>‹</Text></TouchableOpacity>
                        <Text style={styles.mesLabel}>{MESES[cursor.mes]} {cursor.anio}</Text>
                        <TouchableOpacity onPress={mesNext} style={styles.mesBtn}><Text style={styles.mesBtnText}>›</Text></TouchableOpacity>
                    </View>

                    <View style={styles.grid}>
                        {DIAS.map(d => (
                            <View key={d} style={styles.celda}><Text style={styles.diaSemana}>{d}</Text></View>
                        ))}
                        {celdas.map((d, i) => {
                            if (d === null) return <View key={`e${i}`} style={styles.celda} />;
                            const iso = toISO(new Date(cursor.anio, cursor.mes, d));
                            const esFuturo = iso > hoy;
                            const seleccionado = iso === fecha;
                            const tieneCambio = diasCambio.includes(iso);
                            return (
                                <TouchableOpacity
                                    key={iso}
                                    style={styles.celda}
                                    disabled={esFuturo}
                                    onPress={() => setFecha(iso)}
                                >
                                    <View style={[styles.dia, seleccionado && styles.diaSel]}>
                                        <Text style={[styles.diaText, esFuturo && styles.diaFuturo, seleccionado && styles.diaTextSel]}>{d}</Text>
                                        {tieneCambio && !seleccionado ? <View style={styles.punto} /> : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.leyenda}>
                        <View style={styles.punto} />
                        <Text style={styles.leyendaText}>día con cambios</Text>
                    </View>
                </View>

                {/* Snapshot */}
                {loading && <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 20 }} />}
                {error && !loading ? <Text style={styles.error}>{error}</Text> : null}

                {!loading && !error && snapshot && (
                    <>
                        <View style={styles.resumenRow}>
                            {resumen.map(r => (
                                <View key={r.label} style={styles.resumenTile}>
                                    <Text style={styles.resumenIcon}>{r.icon}</Text>
                                    <Text style={styles.resumenNum}>{r.n}</Text>
                                    <Text style={styles.resumenLabel}>{r.label}</Text>
                                </View>
                            ))}
                        </View>

                        <Bloque titulo="🐄 Vacas" items={snapshot.madres} vacio="Sin vacas registradas a esa fecha."
                            render={(m) => (
                                <>
                                    <Text style={styles.itemTitulo}>{m.nombre || `RP ${m.rp_madre ?? '—'}`}</Text>
                                    <Etiqueta>{m.estado || '—'}</Etiqueta>
                                    {m.dias_en_leche != null ? <Etiqueta verde>DEL {m.dias_en_leche}</Etiqueta> : null}
                                    {m.id_rodeo != null ? <Text style={styles.itemFaint}>rodeo #{m.id_rodeo}</Text> : null}
                                </>
                            )} />

                        <Bloque titulo="🐮 Terneros" items={snapshot.terneros} vacio="Sin terneros a esa fecha."
                            render={(t) => (
                                <>
                                    <Text style={styles.itemTitulo}>RP {t.rp_ternero ?? '—'}</Text>
                                    <Etiqueta>{t.sexo || '—'}</Etiqueta>
                                    <Etiqueta>{t.estado || '—'}</Etiqueta>
                                    {t.peso_nacer != null ? <Text style={styles.itemFaint}>{t.peso_nacer} kg al nacer</Text> : null}
                                </>
                            )} />

                        <Bloque titulo="🌿 Rodeos" items={snapshot.rodeos} vacio="Sin rodeos a esa fecha."
                            render={(r) => (
                                <>
                                    <Text style={styles.itemTitulo}>{r.nombre}</Text>
                                    {r.tipo ? <Etiqueta>{r.tipo}</Etiqueta> : null}
                                    <Etiqueta>{r.estado || '—'}</Etiqueta>
                                </>
                            )} />

                        <Bloque titulo="🍽️ Dietas por rodeo" items={snapshot.dietas} vacio="Sin dietas asignadas a esa fecha."
                            render={(d) => (
                                <>
                                    <Text style={styles.itemTitulo}>{d.nombre || `Dieta rodeo #${d.id_rodeo}`}</Text>
                                    <Etiqueta>{d.modo === 'formula' ? 'fórmula' : d.modo === 'mezcla' ? 'mezcla' : 'nota'}</Etiqueta>
                                    {d.modo === 'formula' ? (
                                        <Text style={styles.itemDetalle}>
                                            {d.kg_por_animal} kg/animal × {d.cantidad_animales ?? '—'} = {d.total_rodeo ?? '—'} kg
                                        </Text>
                                    ) : null}
                                    {d.modo === 'mezcla' ? (
                                        <Text style={styles.itemDetalle}>
                                            {(d.ingredientes || []).map(i => `${i.nombre} ${i.kg}kg`).join(' + ')} = {d.total_rodeo ?? '—'} kg
                                        </Text>
                                    ) : null}
                                    {d.modo === 'nota' ? <Text style={styles.itemDetalle}>{d.nota}</Text> : null}
                                </>
                            )} />

                        <Bloque titulo="💉 Tratamientos (hasta esa fecha)" items={snapshot.tratamientos} vacio="Sin tratamientos hasta esa fecha."
                            render={(t) => (
                                <>
                                    <Text style={styles.itemTitulo}>{t.nombre}</Text>
                                    {t.tipo_enfermedad ? <Etiqueta>{t.tipo_enfermedad}</Etiqueta> : null}
                                    <Text style={styles.itemFaint}>{t.fecha_tratamiento}</Text>
                                </>
                            )} />

                        <Bloque titulo="📌 Eventos (hasta esa fecha)" items={snapshot.eventos} vacio="Sin eventos hasta esa fecha."
                            render={(e) => (
                                <>
                                    <Text style={styles.itemTitulo}>{e.observacion}</Text>
                                    <Text style={styles.itemFaint}>{e.fecha_evento}</Text>
                                </>
                            )} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const Etiqueta = ({ children, verde }) => (
    <View style={[styles.etiqueta, verde && { backgroundColor: colors.campoSoft }]}>
        <Text style={[styles.etiquetaText, verde && { color: colors.campo }]}>{children}</Text>
    </View>
);

const Bloque = ({ titulo, items, vacio, render }) => {
    const [abierto, setAbierto] = useState(true);
    const lista = Array.isArray(items) ? items : [];
    return (
        <View style={styles.bloque}>
            <TouchableOpacity style={styles.bloqueHeader} onPress={() => setAbierto(a => !a)}>
                <Text style={styles.bloqueTitulo}>{titulo} <Text style={styles.bloqueCount}>({lista.length})</Text></Text>
                <Text style={styles.bloqueChevron}>{abierto ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {abierto && (
                <View style={styles.bloqueBody}>
                    {lista.length === 0 ? (
                        <Text style={styles.empty}>{vacio}</Text>
                    ) : lista.map((it, i) => (
                        <View key={i} style={styles.item}>{render(it)}</View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 12, color: colors.campoSoft, marginTop: 4 },
    content: { padding: space.md, paddingBottom: 96 },
    avisoBox: { backgroundColor: '#FDF6E3', borderWidth: 1, borderColor: '#F0DFA8', borderRadius: radius.sm, padding: 10, marginBottom: 12 },
    avisoText: { fontSize: 11, color: '#8A6D1F', lineHeight: 16 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    mesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    mesBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    mesBtnText: { fontSize: 22, color: colors.ink, lineHeight: 26 },
    mesLabel: { fontSize: 15, fontWeight: '800', color: colors.ink },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    celda: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
    diaSemana: { fontSize: 11, color: colors.inkFaint, fontWeight: '700', marginBottom: 4 },
    dia: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    diaSel: { backgroundColor: colors.campo },
    diaText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
    diaTextSel: { color: colors.white, fontWeight: '800' },
    diaFuturo: { color: colors.line },
    punto: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.vivo, position: 'absolute', bottom: 4 },
    leyenda: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    leyendaText: { fontSize: 11, color: colors.inkSoft, marginLeft: 10 },
    error: { color: colors.muerto, fontSize: 13, textAlign: 'center', marginVertical: 12 },
    resumenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    resumenTile: { flexGrow: 1, minWidth: '30%', backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10, alignItems: 'center', ...shadow.card },
    resumenIcon: { fontSize: 16 },
    resumenNum: { fontSize: 18, fontWeight: '800', color: colors.ink },
    resumenLabel: { fontSize: 10, color: colors.inkSoft },
    bloque: { backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 10, ...shadow.card },
    bloqueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
    bloqueTitulo: { fontSize: 14, fontWeight: '800', color: colors.ink },
    bloqueCount: { color: colors.inkFaint, fontWeight: '600' },
    bloqueChevron: { color: colors.inkFaint, fontSize: 14 },
    bloqueBody: { paddingHorizontal: 14, paddingBottom: 10 },
    item: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line },
    itemTitulo: { fontSize: 13, fontWeight: '700', color: colors.ink },
    itemDetalle: { fontSize: 11, color: colors.inkSoft, flexShrink: 1 },
    itemFaint: { fontSize: 11, color: colors.inkFaint },
    etiqueta: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    etiquetaText: { fontSize: 10, fontWeight: '700', color: colors.inkSoft },
    empty: { fontSize: 12, color: colors.inkFaint, paddingVertical: 8 },
});
