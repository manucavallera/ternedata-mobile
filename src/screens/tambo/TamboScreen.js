import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { useRecargarAlEnfocar } from '../../hooks/useRecargarAlEnfocar';
import { colors, shadow, radius, space } from '../../theme';
import { CATEGORIAS, PENDIENTES, detalleVaca, estadoDe, filtrarVacas, mensajeError } from '../../utils/tambo';

// Rodeo lechero: pendientes del día (tactar, inseminar, secar...) y la lista de vacas.
// Tocar un pendiente o una vaca abre la carga del evento ya completa.
export default function TamboScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { establecimientoActual } = useSelector((state) => state.auth);
    const { obtenerRodeoTamboHook, obtenerPendientesTamboHook, obtenerResumenTamboHook } = useBussinesMicroservicio();

    const [vacas, setVacas] = useState([]);
    const [pendientes, setPendientes] = useState(null);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('');
    const [abierto, setAbierto] = useState(null); // grupo de pendientes desplegado

    const cargar = async () => {
        const [rRodeo, rPend, rRes] = await Promise.all([
            obtenerRodeoTamboHook(), obtenerPendientesTamboHook(), obtenerResumenTamboHook(),
        ]);
        if (rRodeo.error || rPend.error || rRes.error) {
            setError(mensajeError(rRodeo.error ? rRodeo : rPend.error ? rPend : rRes, 'No se pudo cargar el tambo'));
        } else {
            setError('');
            setVacas(rRodeo.data || []);
            setPendientes(rPend.data?.pendientes || null);
            setResumen(rRes.data || null);
        }
        setLoading(false);
    };

    useRecargarAlEnfocar(() => { cargar(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const cargarEvento = (params) => navigation.navigate('TamboEvento', { vacas, ...params });
    const lista = filtrarVacas(vacas, { busqueda, categoria });

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🐄 Rodeo lechero</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 40 }} /> : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.acciones}>
                        <TouchableOpacity style={styles.btnPrimario} onPress={() => cargarEvento({})}>
                            <Text style={styles.btnPrimarioText}>+ Cargar evento</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnSecundario} onPress={() => navigation.navigate('TamboControl')}>
                            <Text style={styles.btnSecundarioText}>🥛 Control lechero</Text>
                        </TouchableOpacity>
                    </View>

                    {resumen && (
                        <View style={styles.card}>
                            <View style={styles.tiles}>
                                {CATEGORIAS.map((c) => (
                                    <View key={c} style={styles.tile}>
                                        <Text style={styles.tileValor}>{resumen.por_categoria?.[c] ?? 0}</Text>
                                        <Text style={styles.tileLabel}>{c}</Text>
                                    </View>
                                ))}
                            </View>
                            {resumen.promedio_dias_en_leche != null && (
                                <Text style={styles.sub}>Promedio de días en leche: {resumen.promedio_dias_en_leche}</Text>
                            )}
                        </View>
                    )}

                    {pendientes && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Pendientes</Text>
                            {PENDIENTES.map((p) => {
                                const items = pendientes[p.clave] || [];
                                const desplegado = abierto === p.clave;
                                return (
                                    <View key={p.clave} style={styles.pendGrupo}>
                                        <TouchableOpacity
                                            style={styles.pendFila}
                                            disabled={items.length === 0}
                                            onPress={() => setAbierto(desplegado ? null : p.clave)}
                                        >
                                            <Text style={[styles.pendTexto, items.length === 0 && styles.apagado]}>{p.texto}</Text>
                                            <Text style={[styles.pendNum, items.length === 0 && styles.apagado]}>{items.length}</Text>
                                        </TouchableOpacity>
                                        {desplegado && (
                                            <View>
                                                {items.map((i) => (
                                                    <Text key={i.id_madre} style={styles.pendItem}>
                                                        RP {i.rp_madre ?? '—'} · {p.detalle(i.dias)}
                                                    </Text>
                                                ))}
                                                <TouchableOpacity
                                                    style={styles.pendBtn}
                                                    onPress={() => cargarEvento({
                                                        tipo: p.evento,
                                                        caravanas: items.map((i) => i.rp_madre).filter((rp) => rp != null).join(', '),
                                                    })}
                                                >
                                                    <Text style={styles.pendBtnText}>Cargar {p.evento === 'tacto' ? 'tacto' : 'evento'} para estas vacas</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Vacas ({lista.length})</Text>
                        <TextInput
                            style={styles.input}
                            value={busqueda}
                            onChangeText={setBusqueda}
                            placeholder="Buscar por caravana o nombre"
                            keyboardType="default"
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                            {['', ...CATEGORIAS].map((c) => (
                                <TouchableOpacity
                                    key={c || 'todas'}
                                    style={[styles.chip, categoria === c && styles.chipActivo]}
                                    onPress={() => setCategoria(c)}
                                >
                                    <Text style={[styles.chipText, categoria === c && styles.chipTextActivo]}>{c || 'Todas'}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {lista.length === 0 ? (
                            <Text style={styles.empty}>
                                {vacas.length === 0 ? 'Todavía no hay vacas cargadas. Cargalas en Madres.' : 'Ninguna vaca coincide.'}
                            </Text>
                        ) : lista.map((v) => {
                            const est = estadoDe(v);
                            return (
                                <TouchableOpacity
                                    key={v.id_madre}
                                    style={styles.vaca}
                                    onPress={() => cargarEvento({ caravanas: v.rp_madre != null ? String(v.rp_madre) : '' })}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.vacaRp}>RP {v.rp_madre ?? '—'} {v.nombre ? `· ${v.nombre}` : ''}</Text>
                                        <Text style={styles.vacaDetalle}>{detalleVaca(v)}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: est.bg }]}>
                                        <Text style={[styles.badgeText, { color: est.color }]}>{est.texto}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    content: { padding: space.md, paddingBottom: 96 },
    error: { backgroundColor: colors.muerto, color: colors.white, borderRadius: radius.sm, padding: 10, marginBottom: 12, fontWeight: '600', textAlign: 'center' },
    acciones: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    btnPrimario: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
    btnPrimarioText: { color: colors.white, fontWeight: '800', fontSize: 15 },
    btnSecundario: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
    btnSecundarioText: { color: colors.campoDark, fontWeight: '800', fontSize: 15 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 8 },
    sub: { fontSize: 12, color: colors.inkSoft, marginTop: 10 },
    tiles: { flexDirection: 'row', gap: 8 },
    tile: { flex: 1, backgroundColor: colors.campoSoft, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
    tileValor: { fontSize: 20, fontWeight: '800', color: colors.campoDark },
    tileLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, marginTop: 2 },
    pendGrupo: { borderTopWidth: 1, borderTopColor: colors.line },
    pendFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
    pendTexto: { fontSize: 15, fontWeight: '700', color: colors.ink },
    pendNum: { fontSize: 15, fontWeight: '800', color: colors.campo },
    apagado: { color: colors.inkFaint, fontWeight: '500' },
    pendItem: { fontSize: 13, color: colors.inkSoft, paddingVertical: 3, paddingLeft: 8 },
    pendBtn: { backgroundColor: colors.campoSoft, borderRadius: radius.sm, padding: 10, alignItems: 'center', marginVertical: 8 },
    pendBtnText: { color: colors.campoDark, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    chips: { marginVertical: 10 },
    chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
    chipActivo: { backgroundColor: colors.campo, borderColor: colors.campo },
    chipText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
    chipTextActivo: { color: colors.white },
    empty: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    vaca: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10 },
    vacaRp: { fontSize: 15, fontWeight: '800', color: colors.ink },
    vacaDetalle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '800' },
});
