import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { useRecargarAlEnfocar } from '../../hooks/useRecargarAlEnfocar';
import { colors, radius, space, shadow } from '../../theme';
import { armarPlanilla, fechaValida, hoyISO, mensajeError, planillaACuerpo } from '../../utils/tambo';

// Control lechero: litros de mañana y tarde por vaca, un día a la vez.
export default function TamboControlScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { establecimientoActual } = useSelector((state) => state.auth);
    const { obtenerRodeoTamboHook, obtenerControlTamboHook, guardarControlTamboHook } = useBussinesMicroservicio();

    const [fecha, setFecha] = useState(hoyISO());
    const [vacas, setVacas] = useState([]);
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState(null); // { texto, ok }

    const cargar = async (dia = fecha) => {
        if (!fechaValida(dia)) return;
        setLoading(true);
        const [rRodeo, rControl] = await Promise.all([obtenerRodeoTamboHook(), obtenerControlTamboHook(dia)]);
        if (rRodeo.error || rControl.error) {
            setAviso({ texto: mensajeError(rRodeo.error ? rRodeo : rControl, 'No se pudo cargar el control'), ok: false });
        } else {
            setVacas(rRodeo.data || []);
            setFilas(armarPlanilla(rRodeo.data || [], rControl.data?.controles || []));
        }
        setLoading(false);
    };

    useRecargarAlEnfocar(() => { cargar(); }, [establecimientoActual]);

    const cambiarFecha = (v) => {
        setFecha(v);
        setAviso(null);
        if (fechaValida(v)) cargar(v);
    };

    const setLitros = (idMadre, campo, valor) =>
        setFilas((fs) => fs.map((f) => (f.id_madre === idMadre ? { ...f, [campo]: valor } : f)));

    const { errores, vacas: cuerpo, resumen } = planillaACuerpo(filas);

    const guardar = async () => {
        setAviso(null);
        if (!fechaValida(fecha)) return setAviso({ texto: 'La fecha va como AAAA-MM-DD y no puede ser futura.', ok: false });
        if (errores.length) return setAviso({ texto: errores.join('\n'), ok: false });
        if (cuerpo.length === 0) return setAviso({ texto: 'Cargá los litros de al menos una vaca.', ok: false });
        setGuardando(true);
        const res = await guardarControlTamboHook({ fecha, vacas: cuerpo });
        setGuardando(false);
        if (res.error) return setAviso({ texto: mensajeError(res), ok: false });
        setFilas(armarPlanilla(vacas, res.data?.controles || []));
        setAviso({ texto: `Control guardado: ${res.data?.vacas ?? resumen.vacas} vacas, ${res.data?.litros ?? resumen.litros} L`, ok: true });
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🥛 Control lechero</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.label}>Fecha del control</Text>
                    <TextInput style={styles.input} value={fecha} onChangeText={cambiarFecha} placeholder="AAAA-MM-DD" />
                    <Text style={styles.resumen}>
                        {resumen.vacas} vacas · {String(resumen.litros).replace('.', ',')} L
                        {resumen.promedio != null ? ` · ${String(resumen.promedio).replace('.', ',')} L/vaca` : ''}
                    </Text>
                </View>

                {aviso && <Text style={[styles.aviso, aviso.ok ? styles.avisoOk : styles.avisoError]}>{aviso.texto}</Text>}

                {loading ? <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 30 }} /> : (
                    <View style={styles.card}>
                        <View style={styles.filaTitulo}>
                            <Text style={[styles.colRp, styles.titulo]}>Vaca</Text>
                            <Text style={[styles.colLitros, styles.titulo]}>Mañana</Text>
                            <Text style={[styles.colLitros, styles.titulo]}>Tarde</Text>
                        </View>
                        {filas.length === 0 ? (
                            <Text style={styles.empty}>No hay vacas En Tambo.</Text>
                        ) : filas.map((f) => (
                            <View key={f.id_madre} style={styles.fila}>
                                <Text style={styles.colRp} numberOfLines={1}>RP {f.rp_madre ?? f.nombre}</Text>
                                <TextInput
                                    style={[styles.input, styles.colLitros]}
                                    value={f.manana}
                                    onChangeText={(v) => setLitros(f.id_madre, 'manana', v)}
                                    keyboardType="decimal-pad"
                                    placeholder="—"
                                    accessibilityLabel={`Mañana RP ${f.rp_madre}`}
                                />
                                <TextInput
                                    style={[styles.input, styles.colLitros]}
                                    value={f.tarde}
                                    onChangeText={(v) => setLitros(f.id_madre, 'tarde', v)}
                                    keyboardType="decimal-pad"
                                    placeholder="—"
                                    accessibilityLabel={`Tarde RP ${f.rp_madre}`}
                                />
                            </View>
                        ))}
                        <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar control</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    content: { padding: space.md, paddingBottom: 96 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 15, color: colors.ink, backgroundColor: colors.surface },
    resumen: { fontSize: 14, fontWeight: '700', color: colors.campoDark, marginTop: 10 },
    aviso: { borderRadius: radius.sm, padding: 10, marginBottom: 12, fontWeight: '600', color: colors.white, textAlign: 'center' },
    avisoOk: { backgroundColor: colors.vivo },
    avisoError: { backgroundColor: colors.muerto },
    filaTitulo: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
    titulo: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    colRp: { flex: 1.2, fontSize: 14, fontWeight: '700', color: colors.ink },
    colLitros: { flex: 1, textAlign: 'center' },
    empty: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    btnGuardar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnGuardarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
