import { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

// ── KPI Card ─────────────────────────────────────────────────
function KPICard({ icono, valor, titulo, subtitulo, colorValor, alerta }) {
    return (
        <View style={[styles.kpi, alerta && styles.kpiAlerta]}>
            <View style={styles.kpiTop}>
                <Text style={styles.kpiIcon}>{icono}</Text>
                {alerta && <View style={styles.alertaBadge}><Text style={styles.alertaBadgeText}>Alerta</Text></View>}
            </View>
            <Text style={[styles.kpiValor, { color: colorValor || colors.ink }]}>{valor}</Text>
            <Text style={styles.kpiTitulo}>{titulo}</Text>
            {subtitulo ? <Text style={styles.kpiSub}>{subtitulo}</Text> : null}
        </View>
    );
}

// ── Bar chart simple (sin librería) ──────────────────────────
function BarraSimple({ label, valor, total, color }) {
    const pct = total > 0 ? Math.max(valor / total, 0) : 0;
    return (
        <View style={styles.barraFila}>
            <Text style={styles.barraLabel}>{label}</Text>
            <View style={styles.barraTrack}>
                <View style={[styles.barraFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.barraNum, { color }]}>{valor}</Text>
        </View>
    );
}

// ── Alerta bajo crecimiento ───────────────────────────────────
function FilaAlerta({ item }) {
    return (
        <View style={styles.alertaFila}>
            <View style={{ flex: 1 }}>
                <Text style={styles.alertaRP}>RP {item.rp_ternero}</Text>
                <Text style={styles.alertaSub}>{item.dias_desde_nacimiento ?? '—'} días · {item.ultimo_peso != null ? `${item.ultimo_peso} kg` : '—'}</Text>
            </View>
            <Text style={styles.alertaGan}>
                {item.aumento_diario_promedio != null
                    ? `${item.aumento_diario_promedio.toFixed(2)} kg/día`
                    : '—'}
            </Text>
        </View>
    );
}

// ── Dashboard principal ───────────────────────────────────────
export default function DashboardScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerResumenDashboardHook } = useBussinesMicroservicio();

    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const cargar = useCallback(async () => {
        setError('');
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}`;
            const res = await obtenerResumenDashboardHook(q);
            if (!res?.error && res?.status === 200 && res?.data && typeof res.data.total === 'number') {
                setResumen(res.data);
            } else {
                setResumen(null);
                setError(res?.data?.message || 'No se pudo obtener el resumen.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload?.rol]);

    useEffect(() => { setLoading(true); cargar(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const total = resumen?.total ?? 0;
    const vivos = resumen?.vivos ?? 0;
    const muertos = resumen?.muertos ?? 0;
    const vendidos = resumen?.vendidos ?? 0;
    const ganancia = resumen?.promedio_ganancia_diaria_kg ?? 0;
    const gananciaColor = ganancia >= 0.8 ? colors.vivo : ganancia >= 0.5 ? colors.vendido : colors.muerto;
    const mortalidad30 = resumen?.mortalidad_ultimos_30d ?? 0;
    const alertas = resumen?.alertas_bajo_crecimiento ?? [];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>🐄 TerneData</Text>
                    <Text style={styles.headerSub}>Bienvenido, {userPayload?.name || 'productor'}</Text>
                </View>
                <TouchableOpacity style={styles.btnActualizar} onPress={() => { setLoading(true); cargar(); }} disabled={loading}>
                    <Text style={styles.btnActualizarText}>{loading ? '⏳' : '🔄'}</Text>
                </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>❌ {error}</Text>
                </View>
            ) : null}

            {/* Loading */}
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 60 }} />
            ) : resumen ? (
                <>
                    {/* KPI Grid */}
                    <View style={styles.kpiGrid}>
                        <KPICard icono="🐄" valor={total} titulo="Total terneros" colorValor={colors.ink} />
                        <KPICard icono="💚" valor={vivos} titulo="Vivos" colorValor={colors.vivo} />
                        <KPICard
                            icono="📉"
                            valor={mortalidad30}
                            titulo="Mortalidad 30d"
                            subtitulo={`Total: ${muertos}`}
                            colorValor={mortalidad30 > 0 ? colors.muerto : colors.inkSoft}
                            alerta={mortalidad30 > 0}
                        />
                        <KPICard
                            icono="⚖️"
                            valor={`${ganancia} kg/día`}
                            titulo="Gan. promedio"
                            colorValor={gananciaColor}
                            alerta={ganancia < 0.5 && ganancia > 0}
                        />
                        <KPICard
                            icono="🍼"
                            valor={`${resumen.porcentaje_calostrados ?? 0}%`}
                            titulo="Calostrados"
                            subtitulo={`${resumen.calostrados ?? 0} de ${total}`}
                            colorValor={colors.campo}
                        />
                        <KPICard
                            icono="⚠️"
                            valor={resumen.total_alertas ?? 0}
                            titulo="Bajo crecim."
                            subtitulo="< 0.5 kg/día"
                            colorValor={(resumen.total_alertas ?? 0) > 0 ? colors.muerto : colors.inkSoft}
                            alerta={(resumen.total_alertas ?? 0) > 0}
                        />
                    </View>

                    {/* Gráfico estado rodeo */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Estado del rodeo</Text>
                        <BarraSimple label="Vivos" valor={vivos} total={total} color={colors.vivo} />
                        <BarraSimple label="Muertos" valor={muertos} total={total} color={colors.muerto} />
                        <BarraSimple label="Vendidos" valor={vendidos} total={total} color={colors.vendido} />
                    </View>

                    {/* Alertas bajo crecimiento */}
                    {alertas.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.alertaHeader}>
                                <Text style={styles.cardTitle}>⚠️ Bajo crecimiento</Text>
                                <View style={styles.alertaCount}>
                                    <Text style={styles.alertaCountText}>{alertas.length}</Text>
                                </View>
                            </View>
                            <Text style={styles.alertaDesc}>RP · días · último peso → ganancia/día</Text>
                            {alertas.map(t => <FilaAlerta key={t.id_ternero} item={t} />)}
                        </View>
                    )}
                </>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },

    // Header
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: colors.campoSoft, marginTop: 2 },
    btnActualizar: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
    btnActualizarText: { fontSize: 18 },

    // Error
    errorBox: { margin: space.md, padding: 12, backgroundColor: '#fef2f2', borderRadius: radius.sm },
    errorText: { color: colors.muerto, fontSize: 13 },

    // KPI Grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: space.md, gap: space.sm },
    kpi: { width: '47.5%', backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, ...shadow.card, borderWidth: 1, borderColor: colors.line },
    kpiAlerta: { borderColor: colors.muerto, backgroundColor: '#fff8f8' },
    kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    kpiIcon: { fontSize: 20 },
    alertaBadge: { backgroundColor: colors.muerto, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
    alertaBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
    kpiValor: { fontSize: 22, fontWeight: '800', marginTop: 2 },
    kpiTitulo: { fontSize: 11, color: colors.inkSoft, fontWeight: '600', marginTop: 2 },
    kpiSub: { fontSize: 10, color: colors.inkFaint, marginTop: 1 },

    // Card
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginHorizontal: space.md, marginBottom: space.md, ...shadow.card },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 12 },

    // Barras
    barraFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    barraLabel: { width: 60, fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
    barraTrack: { flex: 1, height: 10, backgroundColor: colors.bg, borderRadius: radius.pill, overflow: 'hidden', marginHorizontal: 8 },
    barraFill: { height: 10, borderRadius: radius.pill },
    barraNum: { width: 32, fontSize: 13, fontWeight: '800', textAlign: 'right' },

    // Alertas
    alertaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    alertaCount: { backgroundColor: colors.muerto, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    alertaCountText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    alertaDesc: { fontSize: 11, color: colors.inkFaint, marginBottom: 10 },
    alertaFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
    alertaRP: { fontSize: 13, fontWeight: '700', color: colors.muerto },
    alertaSub: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    alertaGan: { fontSize: 13, fontWeight: '800', color: colors.muerto },
});
