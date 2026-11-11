import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, radius, space, shadow } from '../../theme';
import { TIPOS_EVENTO, caravanasAIds, eventoACuerpo, fechaValida, hoyISO, mensajeError } from '../../utils/tambo';

// Carga un evento para una o varias vacas (día de tacto, de parches, de inseminación).
export default function TamboEventoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { params = {} } = useRoute();
    const vacas = params.vacas || [];
    const { crearEventoTamboHook } = useBussinesMicroservicio();

    const [form, setForm] = useState({
        caravanas: params.caravanas ?? '',
        tipo: params.tipo ?? 'inseminacion',
        fecha: hoyISO(),
        resultado: 'preñada',
        dias_gestacion: '',
        toro: '',
        observacion: '',
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

    const { ids, noEncontradas } = caravanasAIds(form.caravanas, vacas);

    const guardar = async () => {
        setError('');
        if (ids.length === 0 && noEncontradas.length === 0) return setError('Escribí al menos una caravana.');
        if (noEncontradas.length) return setError(`No están en el rodeo: ${noEncontradas.join(', ')}`);
        if (!fechaValida(form.fecha)) return setError('La fecha va como AAAA-MM-DD y no puede ser futura.');

        const base = eventoACuerpo(form);
        setGuardando(true);
        const fallas = [];
        for (const id of ids) {
            const res = await crearEventoTamboHook({ ...base, id_madre: id });
            if (res.error) {
                const rp = vacas.find((v) => v.id_madre === id)?.rp_madre;
                fallas.push(`${rp}: ${mensajeError(res, 'error')}`);
            }
        }
        setGuardando(false);
        if (fallas.length) return setError(`No se guardó para ${fallas.join(' · ')}`);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cargar evento</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.label}>Caravanas</Text>
                    <TextInput
                        style={styles.input}
                        value={form.caravanas}
                        onChangeText={(v) => set('caravanas', v)}
                        placeholder="Ej: 325, 328, 331"
                        keyboardType="numbers-and-punctuation"
                    />
                    <Text style={styles.hint}>
                        Una o varias, separadas por coma.{ids.length > 0 ? ` ${ids.length} vaca${ids.length > 1 ? 's' : ''}.` : ''}
                    </Text>

                    <Text style={styles.label}>Evento</Text>
                    <View style={styles.opciones}>
                        {TIPOS_EVENTO.map((t) => (
                            <TouchableOpacity
                                key={t.valor}
                                style={[styles.opcion, form.tipo === t.valor && styles.opcionActiva]}
                                onPress={() => set('tipo', t.valor)}
                            >
                                <Text style={[styles.opcionText, form.tipo === t.valor && styles.opcionTextActiva]}>{t.texto}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Fecha</Text>
                    <TextInput style={styles.input} value={form.fecha} onChangeText={(v) => set('fecha', v)} placeholder="AAAA-MM-DD" />

                    {form.tipo === 'tacto' && (
                        <>
                            <Text style={styles.label}>Resultado</Text>
                            <View style={styles.opciones}>
                                {[['preñada', 'Preñada'], ['vacia', 'Vacía']].map(([valor, texto]) => (
                                    <TouchableOpacity
                                        key={valor}
                                        style={[styles.opcion, styles.opcionAncha, form.resultado === valor && styles.opcionActiva]}
                                        onPress={() => set('resultado', valor)}
                                    >
                                        <Text style={[styles.opcionText, form.resultado === valor && styles.opcionTextActiva]}>{texto}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {form.resultado === 'preñada' && (
                                <>
                                    <Text style={styles.label}>Días de gestación (opcional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.dias_gestacion}
                                        onChangeText={(v) => set('dias_gestacion', v)}
                                        keyboardType="numeric"
                                        placeholder="Si la ecografía los da"
                                    />
                                </>
                            )}
                        </>
                    )}

                    {form.tipo === 'inseminacion' && (
                        <>
                            <Text style={styles.label}>Pajuela (opcional)</Text>
                            <TextInput style={styles.input} value={form.toro} onChangeText={(v) => set('toro', v)} maxLength={100} placeholder="Pajuela usada" />
                        </>
                    )}

                    <Text style={styles.label}>Observación (opcional)</Text>
                    <TextInput style={styles.input} value={form.observacion} onChangeText={(v) => set('observacion', v)} maxLength={500} />

                    {form.tipo === 'parto' && (
                        <Text style={styles.hint}>Para cargar el ternero usá Terneros. Si lo cargás con su madre, el parto se registra solo.</Text>
                    )}

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                        {guardando ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.btnGuardarText}>{ids.length > 1 ? `Guardar para ${ids.length} vacas` : 'Guardar'}</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, ...shadow.card },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 12 },
    hint: { fontSize: 12, color: colors.inkSoft, marginTop: 4 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 15, color: colors.ink, backgroundColor: colors.surface },
    opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    opcion: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
    opcionAncha: { flex: 1, alignItems: 'center' },
    opcionActiva: { backgroundColor: colors.campo, borderColor: colors.campo },
    opcionText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
    opcionTextActiva: { color: colors.white },
    error: { backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: radius.sm, padding: 10, marginTop: 12, fontWeight: '600' },
    btnGuardar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnGuardarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
