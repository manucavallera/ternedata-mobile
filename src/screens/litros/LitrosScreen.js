import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const FORM_INICIAL = {
    fecha: hoyISO(),
    litros_vendido: '',
    litros_terneros: '',
    cantidad_vacas: '',
    observaciones: '',
};

const formatFecha = (f) => {
    if (!f) return '—';
    const [a, m, d] = String(f).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

export default function LitrosScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        registrarLitrosHook, obtenerLitrosHook, obtenerStatsLitrosHook,
        eliminarLitrosHook, actualizarLitrosHook,
    } = useBussinesMicroservicio();

    const [stats, setStats] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [ajustando, setAjustando] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    // Solo el admin mirando otro campo manda el id; el usuario normal va con su JWT.
    const idEstab = userPayload?.rol === 'admin' && establecimientoActual ? establecimientoActual : null;

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [resStats, resList] = await Promise.all([
                obtenerStatsLitrosHook(idEstab),
                obtenerLitrosHook(idEstab),
            ]);
            if (resStats?.status === 200) setStats(resStats.data);
            if (resList?.status === 200) {
                const payload = resList.data;
                setRegistros(Array.isArray(payload) ? payload : payload?.data || []);
            }
        } catch {
            showAlert('Error al cargar los datos de litros', false);
        } finally {
            setLoading(false);
        }
    }, [idEstab]);

    useEffect(() => { cargar(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const guardar = async () => {
        if (form.litros_vendido === '' || form.litros_terneros === '') {
            showAlert('Completá litros vendidos y litros de terneros', false);
            return;
        }
        setGuardando(true);
        const payload = {
            fecha: form.fecha,
            litros_vendido: parseFloat(form.litros_vendido) || 0,
            litros_terneros: parseFloat(form.litros_terneros) || 0,
            observaciones: form.observaciones || undefined,
        };
        if (form.cantidad_vacas !== '') payload.cantidad_vacas = parseInt(form.cantidad_vacas, 10);
        if (idEstab) payload.id_establecimiento = parseInt(idEstab);

        const res = await registrarLitrosHook(payload);
        if (res?.status === 200 || res?.status === 201) {
            setForm(FORM_INICIAL);
            showAlert('Litros registrados');
            await cargar();
        } else {
            showAlert(res?.data?.message || 'No se pudo registrar', false);
        }
        setGuardando(false);
    };

    const eliminar = (registro) => {
        Alert.alert(
            'Eliminar registro',
            `¿Borrar los litros del ${formatFecha(registro.fecha)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive', onPress: async () => {
                        const res = await eliminarLitrosHook(registro.id_registro, idEstab);
                        if (res?.status === 200) { showAlert('Registro eliminado'); await cargar(); }
                        else showAlert(res?.data?.message || 'No se pudo eliminar', false);
                    },
                },
            ]
        );
    };

    // +/- sobre las vacas ordeñadas del último registro (algunas se restan por
    // tratamiento). Ajusta ese registro, no toca el rodeo.
    const ajustarVacas = async (delta) => {
        if (!stats?.id_registro) return;
        const nuevo = Math.max(0, (stats.cantidad_vacas || 0) + delta);
        setAjustando(true);
        const res = await actualizarLitrosHook(stats.id_registro, { cantidad_vacas: nuevo }, idEstab);
        if (res?.status === 200) await cargar();
        else showAlert(res?.data?.message || 'No se pudo ajustar las vacas', false);
        setAjustando(false);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🥛 Litros de leche</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {stats && (
                        <View style={styles.card}>
                            <Text style={styles.cardSub}>
                                {stats.fecha ? `Último registro: ${formatFecha(stats.fecha)}` : 'Sin registros aún'}
                            </Text>
                            <View style={styles.tiles}>
                                <Tile label="Vendido" valor={`${stats.litros_vendido ?? 0} lts`} color="#2563EB" bg="#E7EFFD" />
                                <Tile label="Terneros" valor={`${stats.litros_terneros ?? 0} lts`} color="#B45309" bg="#FDF1DC" />
                                <Tile label="Total" valor={`${stats.total ?? 0} lts`} color={colors.campo} bg={colors.campoSoft} />
                                <Tile label="Promedio/vaca" valor={stats.promedio != null ? `${stats.promedio} lts` : '—'} color="#0E7490" bg="#DFF3F6" />
                            </View>

                            <View style={styles.vacasBox}>
                                <Text style={styles.vacasLabel}>Vacas en ordeñe</Text>
                                <View style={styles.vacasRow}>
                                    <TouchableOpacity
                                        style={[styles.vacasBtn, (ajustando || !stats.id_registro) && styles.btnDisabled]}
                                        onPress={() => ajustarVacas(-1)}
                                        disabled={ajustando || !stats.id_registro}
                                    >
                                        <Text style={styles.vacasBtnText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.vacasNum}>{stats.cantidad_vacas ?? 0}</Text>
                                    <TouchableOpacity
                                        style={[styles.vacasBtn, (ajustando || !stats.id_registro) && styles.btnDisabled]}
                                        onPress={() => ajustarVacas(1)}
                                        disabled={ajustando || !stats.id_registro}
                                    >
                                        <Text style={styles.vacasBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Anotar litros</Text>

                        <Text style={styles.label}>Fecha</Text>
                        <TextInput style={styles.input} value={form.fecha} onChangeText={v => set('fecha', v)} placeholder="YYYY-MM-DD" />

                        <Text style={styles.label}>Litros vendidos *</Text>
                        <TextInput style={styles.input} value={form.litros_vendido} onChangeText={v => set('litros_vendido', v)} placeholder="Ej: 1835" keyboardType="decimal-pad" />

                        <Text style={styles.label}>Litros terneros *</Text>
                        <TextInput style={styles.input} value={form.litros_terneros} onChangeText={v => set('litros_terneros', v)} placeholder="Ej: 58" keyboardType="decimal-pad" />

                        <Text style={styles.label}>Vacas en ordeñe (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.cantidad_vacas}
                            onChangeText={v => set('cantidad_vacas', v)}
                            placeholder={stats?.cantidad_vacas != null ? `Rodeo: ${stats.cantidad_vacas}` : 'Ej: 71'}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Observaciones (opcional)</Text>
                        <TextInput style={styles.input} value={form.observaciones} onChangeText={v => set('observaciones', v)} placeholder="Notas del día" />

                        <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Registrar</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Historial</Text>
                        {registros.length === 0 ? (
                            <Text style={styles.empty}>Todavía no cargaste litros.</Text>
                        ) : registros.map(r => (
                            <View key={r.id_registro} style={styles.histRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.histFecha}>{formatFecha(r.fecha)}</Text>
                                    <Text style={styles.histDetalle}>
                                        Vendido {r.litros_vendido} · Terneros {r.litros_terneros}
                                    </Text>
                                    {r.observaciones ? <Text style={styles.histObs} numberOfLines={2}>“{r.observaciones}”</Text> : null}
                                </View>
                                <Text style={styles.histTotal}>{r.total} lts</Text>
                                <TouchableOpacity onPress={() => eliminar(r)} style={styles.btnBorrar}>
                                    <Text style={styles.btnBorrarText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const Tile = ({ label, valor, color, bg }) => (
    <View style={[styles.tile, { backgroundColor: bg }]}>
        <Text style={[styles.tileLabel, { color }]}>{label}</Text>
        <Text style={[styles.tileValue, { color }]}>{valor}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    loader: { marginTop: 40 },
    content: { padding: space.md, paddingBottom: 96 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    cardSub: { fontSize: 12, color: colors.inkSoft, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 8 },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: { flexGrow: 1, minWidth: '46%', borderRadius: radius.sm, padding: 10 },
    tileLabel: { fontSize: 11, fontWeight: '700' },
    tileValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    vacasBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
    vacasLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
    vacasRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
    vacasBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    vacasBtnText: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 26 },
    vacasNum: { fontSize: 24, fontWeight: '800', color: colors.ink, minWidth: 46, textAlign: 'center' },
    btnDisabled: { opacity: 0.4 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    btnGuardar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnGuardarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    empty: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10 },
    histFecha: { fontSize: 14, fontWeight: '700', color: colors.ink },
    histDetalle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    histObs: { fontSize: 11, color: colors.inkFaint, fontStyle: 'italic', marginTop: 2 },
    histTotal: { fontSize: 15, fontWeight: '800', color: colors.campo },
    btnBorrar: { padding: 6 },
    btnBorrarText: { fontSize: 16 },
});
