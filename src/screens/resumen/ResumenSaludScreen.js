import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const SEVERIDADES = [
    { key: 'leve', label: 'Leve', color: '#22c55e' },
    { key: 'moderada', label: 'Moderada', color: '#f59e0b' },
    { key: 'severa', label: 'Severa', color: '#f97316' },
    { key: 'critica', label: 'Crítica', color: '#ef4444' },
];

const num = (v) => (v ?? 0);
const pct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

export default function ResumenSaludScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerResumenSaludHook } = useBussinesMicroservicio();

    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const cargar = useCallback(async () => {
        setError('');
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}`;
            const res = await obtenerResumenSaludHook(q);
            if (res?.status === 200) setResumen(res.data);
            else setError('Error al cargar el resumen de salud');
        } catch {
            setError('Error al cargar el resumen de salud');
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { setLoading(true); cargar(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const morbilidad = Number(resumen?.porcentajeMorbilidad ?? 0);
    const mortalidad = Number(resumen?.porcentajeMortalidad ?? 0);
    const morbColor = morbilidad >= 30 ? '#ef4444' : morbilidad >= 15 ? '#f59e0b' : '#22c55e';
    const mortColor = mortalidad >= 10 ? '#ef4444' : mortalidad >= 3 ? '#f59e0b' : '#22c55e';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>❤️ Resumen de Salud</Text>
                <Text style={styles.headerSub}>Estado sanitario del rodeo</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.muerto} style={styles.loader} /> : error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); cargar(); }}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : !resumen ? (
                <Text style={styles.empty}>Sin datos</Text>
            ) : (
                <View style={styles.body}>
                    {/* Indicadores principales */}
                    <View style={styles.indicadores}>
                        <View style={[styles.indicador, { borderColor: morbColor }]}>
                            <Text style={styles.indLabel}>Morbilidad</Text>
                            <Text style={[styles.indValue, { color: morbColor }]}>{pct(morbilidad)}</Text>
                        </View>
                        <View style={[styles.indicador, { borderColor: mortColor }]}>
                            <Text style={styles.indLabel}>Mortalidad</Text>
                            <Text style={[styles.indValue, { color: mortColor }]}>{pct(mortalidad)}</Text>
                        </View>
                    </View>

                    {/* Población */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🐄 Población</Text>
                        <View style={styles.statsGrid}>
                            <Stat label="Total" value={num(resumen.totalTerneros)} color="#1f2937" />
                            <Stat label="Vivos" value={num(resumen.ternerosVivos)} color="#16a34a" />
                            <Stat label="Muertos" value={num(resumen.ternerosMuertos)} color="#dc2626" />
                        </View>
                    </View>

                    {/* Estado de salud */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🩺 Estado de salud</Text>
                        <View style={styles.statsGrid}>
                            <Stat label="Sanos" value={num(resumen.ternerosCompletamenteSanos)} color="#16a34a" />
                            <Stat label="Con diarrea" value={num(resumen.ternerosConDiarreas)} color={colors.campo} />
                            <Stat label="Con tratam." value={num(resumen.ternerosConTratamientos)} color="#f59e0b" />
                            <Stat label="Ambos" value={num(resumen.ternerosConAmbosProblemas)} color="#ef4444" />
                        </View>
                    </View>

                    {/* Diarreas por severidad */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🥼 Episodios de diarrea ({num(resumen.episodiosDiarrea)})</Text>
                        {SEVERIDADES.map(sev => (
                            <View key={sev.key} style={styles.barRow}>
                                <View style={[styles.dot, { backgroundColor: sev.color }]} />
                                <Text style={styles.barLabel}>{sev.label}</Text>
                                <Text style={[styles.barValue, { color: sev.color }]}>{num(resumen.desgloseDiarreas?.[sev.key])}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Tratamientos por enfermedad */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>💉 Tratamientos ({num(resumen.tratamientosTotal)})</Text>
                        {Array.isArray(resumen.desgloseTratamientos) && resumen.desgloseTratamientos.length > 0 ? (
                            resumen.desgloseTratamientos.map((item, i) => (
                                <View key={i} style={styles.barRow}>
                                    <View style={[styles.dot, { backgroundColor: colors.campo }]} />
                                    <Text style={styles.barLabel}>{item.tipo_enfermedad}</Text>
                                    <Text style={[styles.barValue, { color: '#3b82f6' }]}>{num(item.cantidad)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.sinDatos}>Sin tratamientos registrados</Text>
                        )}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

function Stat({ label, value, color }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: colors.campoSoft },
    loader: { marginTop: 60 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 60, fontSize: 15 },
    errorBox: { margin: 20, padding: 20, backgroundColor: '#fef2f2', borderRadius: radius.md, alignItems: 'center' },
    errorText: { color: colors.muerto, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.muerto, borderRadius: radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
    retryText: { color: colors.white, fontWeight: '700' },
    body: { padding: space.md },
    indicadores: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
    indicador: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, alignItems: 'center', borderLeftWidth: 4, ...shadow.card },
    indLabel: { fontSize: 13, color: colors.inkSoft, fontWeight: '600', marginBottom: 6 },
    indValue: { fontSize: 28, fontWeight: '800' },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: space.md, ...shadow.card },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
    stat: { alignItems: 'center', minWidth: '24%', marginBottom: 8 },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    barLabel: { flex: 1, fontSize: 14, color: colors.ink },
    barValue: { fontSize: 16, fontWeight: '800' },
    sinDatos: { textAlign: 'center', color: colors.inkFaint, fontSize: 13, paddingVertical: 8 },
});
