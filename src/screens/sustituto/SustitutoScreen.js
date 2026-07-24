import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const money = (n) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n, d = 2) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: d });

const FORM_INICIAL = {
    fecha: hoyISO(),
    numero_terneros: '1',
    litros_por_ternero: '4',
    tomas_manana: '2',
    tomas_tarde: '2',
    concentracion: '0.125',
    precio_sustituto_usd: '',
    precio_leche: '',
    cotizacion_dolar: '',
    observaciones: '',
};

// Mismo cálculo que el backend, para previsualizar en vivo antes de guardar.
const calcular = (f) => {
    const terneros = Number(f.numero_terneros) || 0;
    const litrosTernero = Number(f.litros_por_ternero) || 0;
    const conc = Number(f.concentracion) || 0;
    const usd = Number(f.precio_sustituto_usd) || 0;
    const leche = Number(f.precio_leche) || 0;
    const dolar = Number(f.cotizacion_dolar) || 0;
    const litros_totales = terneros * litrosTernero;
    const kg_sustituto = litros_totales * conc;
    const costo_sustituto_dia = kg_sustituto * usd * dolar;
    const costo_leche_dia = litros_totales * leche;
    return {
        litros_totales,
        kg_sustituto,
        costo_sustituto_dia,
        costo_leche_dia,
        ahorro: costo_leche_dia - costo_sustituto_dia,
        conviene: costo_sustituto_dia < costo_leche_dia ? 'sustituto' : 'leche',
    };
};

export default function SustitutoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { registrarSustitutoHook, obtenerSustitutoHook, eliminarSustitutoHook } = useBussinesMicroservicio();

    const [form, setForm] = useState(FORM_INICIAL);
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        setLoading(true);
        const res = await obtenerSustitutoHook();
        if (res?.status === 200) {
            const payload = res.data;
            setRegistros(Array.isArray(payload) ? payload : payload?.data || []);
        } else {
            showAlert('No se pudo cargar el historial', false);
        }
        setLoading(false);
    }, []);

    useEffect(() => { cargar(); }, []);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const preview = useMemo(() => calcular(form), [form]);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const guardar = async () => {
        if (!form.precio_sustituto_usd || !form.precio_leche || !form.cotizacion_dolar) {
            showAlert('Completá precio sustituto, precio leche y cotización del dólar', false);
            return;
        }
        setGuardando(true);
        const payload = {
            fecha: form.fecha,
            numero_terneros: parseInt(form.numero_terneros, 10) || 0,
            litros_por_ternero: Number(form.litros_por_ternero) || 0,
            tomas_manana: Number(form.tomas_manana) || 0,
            tomas_tarde: Number(form.tomas_tarde) || 0,
            concentracion: Number(form.concentracion) || 0.125,
            precio_sustituto_usd: Number(form.precio_sustituto_usd) || 0,
            precio_leche: Number(form.precio_leche) || 0,
            cotizacion_dolar: Number(form.cotizacion_dolar) || 0,
            observaciones: form.observaciones || undefined,
        };
        const res = await registrarSustitutoHook(payload);
        setGuardando(false);
        if (res?.status === 200 || res?.status === 201) {
            // La cotización del dólar se mantiene: no cambia entre cálculos del mismo día.
            setForm(f => ({ ...FORM_INICIAL, cotizacion_dolar: f.cotizacion_dolar }));
            showAlert('Cálculo guardado');
            await cargar();
        } else {
            showAlert(res?.data?.message || 'No se pudo guardar el cálculo', false);
        }
    };

    const eliminar = (registro) => {
        Alert.alert('Eliminar cálculo', `¿Borrar el cálculo del ${registro.fecha}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    const res = await eliminarSustitutoHook(registro.id_calculo);
                    if (res?.status === 200) { showAlert('Cálculo eliminado'); await cargar(); }
                    else showAlert('No se pudo eliminar', false);
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🍼 Sustituto lácteo</Text>
                <Text style={styles.headerSub}>Cuánto sustituto por día y si conviene contra la leche real</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Resultado en vivo */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Resultado</Text>
                    <View style={styles.tiles}>
                        <Tile label="Litros totales" valor={`${num(preview.litros_totales)} L`} />
                        <Tile label="Kg de sustituto" valor={`${num(preview.kg_sustituto, 3)} kg`} />
                    </View>
                    <Fila label="Costo sustituto / día" valor={money(preview.costo_sustituto_dia)} bg="#FDF1DC" color="#9A3412" />
                    <Fila label="Costo leche real / día" valor={money(preview.costo_leche_dia)} bg="#E7EFFD" color="#1E40AF" />
                    <View style={[styles.veredicto, preview.conviene === 'sustituto' ? styles.veredictoVerde : styles.veredictoAzul]}>
                        <Text style={[styles.veredictoText, { color: preview.conviene === 'sustituto' ? '#14532D' : '#1E3A8A' }]}>
                            {preview.conviene === 'sustituto'
                                ? `Conviene el sustituto — ahorrás ${money(Math.abs(preview.ahorro))} / día`
                                : `Conviene la leche real — el sustituto sale ${money(Math.abs(preview.ahorro))} más / día`}
                        </Text>
                    </View>
                </View>

                {/* Formulario */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos del cálculo</Text>

                    <Text style={styles.label}>Fecha</Text>
                    <TextInput style={styles.input} value={form.fecha} onChangeText={v => set('fecha', v)} placeholder="YYYY-MM-DD" />

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Número de terneros</Text>
                            <TextInput style={styles.input} value={form.numero_terneros} onChangeText={v => set('numero_terneros', v)} keyboardType="numeric" />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Litros por ternero</Text>
                            <TextInput style={styles.input} value={form.litros_por_ternero} onChangeText={v => set('litros_por_ternero', v)} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Toma mañana (L)</Text>
                            <TextInput style={styles.input} value={form.tomas_manana} onChangeText={v => set('tomas_manana', v)} keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Toma tarde (L)</Text>
                            <TextInput style={styles.input} value={form.tomas_tarde} onChangeText={v => set('tomas_tarde', v)} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <Text style={styles.label}>Concentración (kg/L) — 12,5% = 0,125</Text>
                    <TextInput style={styles.input} value={form.concentracion} onChangeText={v => set('concentracion', v)} keyboardType="decimal-pad" />

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Precio sustituto (u$s/kg)</Text>
                            <TextInput style={styles.input} value={form.precio_sustituto_usd} onChangeText={v => set('precio_sustituto_usd', v)} placeholder="3.20" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Cotización dólar ($)</Text>
                            <TextInput style={styles.input} value={form.cotizacion_dolar} onChangeText={v => set('cotizacion_dolar', v)} placeholder="1380" keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <Text style={styles.label}>Precio leche ($/L)</Text>
                    <TextInput style={styles.input} value={form.precio_leche} onChangeText={v => set('precio_leche', v)} placeholder="500" keyboardType="decimal-pad" />

                    <Text style={styles.label}>Observaciones (opcional)</Text>
                    <TextInput style={styles.input} value={form.observaciones} onChangeText={v => set('observaciones', v)} />

                    <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar cálculo</Text>}
                    </TouchableOpacity>
                </View>

                {/* Historial */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Historial</Text>
                    {loading ? (
                        <ActivityIndicator color={colors.campo} style={{ marginVertical: 16 }} />
                    ) : registros.length === 0 ? (
                        <Text style={styles.empty}>Todavía no hay cálculos guardados.</Text>
                    ) : registros.map(r => (
                        <View key={r.id_calculo} style={styles.histRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.histFecha}>{r.fecha}</Text>
                                <Text style={styles.histDetalle}>
                                    {r.numero_terneros} terneros · {num(r.litros_totales)} L · {num(r.kg_sustituto, 3)} kg sust.
                                </Text>
                                <Text style={styles.histDetalle}>
                                    Sust. {money(r.costo_sustituto_dia)} vs leche {money(r.costo_leche_dia)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                <View style={[styles.chip, r.conviene === 'sustituto' ? styles.chipVerde : styles.chipAzul]}>
                                    <Text style={[styles.chipText, { color: r.conviene === 'sustituto' ? '#14532D' : '#1E3A8A' }]}>{r.conviene}</Text>
                                </View>
                                <TouchableOpacity onPress={() => eliminar(r)}>
                                    <Text style={styles.btnBorrarText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const Tile = ({ label, valor }) => (
    <View style={styles.tile}>
        <Text style={styles.tileValue}>{valor}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
    </View>
);

const Fila = ({ label, valor, bg, color }) => (
    <View style={[styles.fila, { backgroundColor: bg }]}>
        <Text style={[styles.filaLabel, { color }]}>{label}</Text>
        <Text style={[styles.filaValor, { color }]}>{valor}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 12, color: colors.campoSoft, marginTop: 4 },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    content: { padding: space.md, paddingBottom: 96 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 10 },
    tiles: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    tile: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
    tileValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
    tileLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    filaLabel: { fontSize: 13, fontWeight: '600' },
    filaValor: { fontSize: 14, fontWeight: '800' },
    veredicto: { borderRadius: radius.sm, padding: 12, marginTop: 6 },
    veredictoVerde: { backgroundColor: colors.campoSoft },
    veredictoAzul: { backgroundColor: '#E7EFFD' },
    veredictoText: { fontSize: 13, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    btnGuardar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnGuardarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    empty: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10 },
    histFecha: { fontSize: 14, fontWeight: '700', color: colors.ink },
    histDetalle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    chipVerde: { backgroundColor: colors.campoSoft },
    chipAzul: { backgroundColor: '#E7EFFD' },
    chipText: { fontSize: 11, fontWeight: '700' },
    btnBorrarText: { fontSize: 16 },
});
