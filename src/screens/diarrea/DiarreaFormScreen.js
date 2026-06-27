import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const SEVERIDADES = [
    { value: 'Leve', label: 'Leve', desc: 'Heces blandas ocasionales' },
    { value: 'Moderada', label: 'Moderada', desc: 'Diarrea frecuente, hidratación normal' },
    { value: 'Severa', label: 'Severa', desc: 'Persistente, signos de deshidratación' },
    { value: 'Crítica', label: 'Crítica', desc: 'Severa, deshidratación grave' },
];

export default function DiarreaFormScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { crearDiarreTerneroHook, obtenerTerneroHook, obtenerDiarreaTerneroHook } = useBussinesMicroservicio();

    const [formData, setFormData] = useState({
        fecha_diarrea_ternero: new Date().toISOString().split('T')[0],
        severidad: 'Leve',
        observaciones: '',
        id_ternero: '',
    });

    const [terneros, setTerneros] = useState([]);
    const [modalTernero, setModalTernero] = useState(false);
    const [searchTernero, setSearchTernero] = useState('');
    const [episodiosAnteriores, setEpisodiosAnteriores] = useState(0);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const idEst = userPayload?.id_establecimiento || establecimientoActual;

    useEffect(() => { cargarTerneros(); }, []);

    const cargarTerneros = async () => {
        let q = 'page=1&limit=500&estado=Vivo';
        if (idEst) q += `&id_establecimiento=${idEst}`;
        const res = await obtenerTerneroHook(q);
        setTerneros(res?.data?.data || []);
    };

    const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 5000);
    };

    const seleccionarTernero = async (item) => {
        set('id_ternero', String(item.id_ternero));
        setModalTernero(false);
        setSearchTernero('');
        setCargandoHistorial(true);
        try {
            let q = 'page=1&limit=500';
            if (idEst) q += `&id_establecimiento=${idEst}`;
            const res = await obtenerDiarreaTerneroHook(q);
            let lista = res?.data?.data || res?.data || [];
            if (!Array.isArray(lista)) lista = [];
            const previos = lista.filter(d => d.ternero?.id_ternero === item.id_ternero);
            setEpisodiosAnteriores(previos.length);
        } catch {
            setEpisodiosAnteriores(0);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.id_ternero) { showAlert('Seleccioná un ternero', false); return; }
        if (!formData.fecha_diarrea_ternero) { showAlert('Ingresá la fecha', false); return; }
        if (!formData.severidad) { showAlert('Seleccioná la severidad', false); return; }

        setSubmitting(true);
        const payload = {
            fecha_diarrea_ternero: formData.fecha_diarrea_ternero,
            severidad: formData.severidad,
            id_ternero: parseInt(formData.id_ternero),
            observaciones: formData.observaciones || undefined,
            id_establecimiento: idEst ? parseInt(idEst) : undefined,
        };

        const res = await crearDiarreTerneroHook(payload);
        if (res?.status === 201 || res?.status === 200) {
            showAlert(`Episodio #${episodiosAnteriores + 1} registrado`, true);
            setTimeout(() => navigation.goBack(), 1800);
        } else {
            showAlert('Error al registrar episodio', false);
        }
        setSubmitting(false);
    };

    const terneroSel = terneros.find(t => String(t.id_ternero) === String(formData.id_ternero));
    const ternerosFiltrados = terneros.filter(t => !searchTernero || t.nombre?.toLowerCase().includes(searchTernero.toLowerCase()) || String(t.id_ternero).includes(searchTernero));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🥼 Nuevo Episodio</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ternero afectado</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalTernero(true)}>
                    <Text style={styles.selectBtnText}>
                        {terneroSel ? `#${terneroSel.id_ternero} — ${terneroSel.nombre || 'Sin nombre'}` : 'Seleccionar ternero...'}
                    </Text>
                </TouchableOpacity>

                {formData.id_ternero ? (
                    <View style={styles.historial}>
                        {cargandoHistorial ? (
                            <Text style={styles.historialText}>Consultando historial...</Text>
                        ) : (
                            <>
                                <View style={styles.historialRow}>
                                    <Text style={styles.historialText}>Episodios previos:</Text>
                                    <Text style={[styles.historialNum, episodiosAnteriores === 0 ? styles.numVerde : episodiosAnteriores <= 2 ? styles.numAmarillo : styles.numRojo]}>{episodiosAnteriores}</Text>
                                </View>
                                <Text style={styles.historialHint}>📝 Este será el episodio #{episodiosAnteriores + 1}</Text>
                            </>
                        )}
                    </View>
                ) : null}
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Datos del episodio</Text>

                <Text style={styles.label}>Fecha</Text>
                <TextInput style={styles.input} value={formData.fecha_diarrea_ternero} onChangeText={v => set('fecha_diarrea_ternero', v)} placeholder="YYYY-MM-DD" />

                <Text style={styles.label}>Severidad</Text>
                {SEVERIDADES.map(s => (
                    <TouchableOpacity key={s.value} style={[styles.sevBtn, formData.severidad === s.value && styles.sevBtnActive]} onPress={() => set('severidad', s.value)}>
                        <Text style={[styles.sevLabel, formData.severidad === s.value && styles.sevLabelActive]}>{s.label}</Text>
                        <Text style={[styles.sevDesc, formData.severidad === s.value && styles.sevDescActive]}>{s.desc}</Text>
                    </TouchableOpacity>
                ))}

                <Text style={styles.label}>Observaciones (opcional)</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.observaciones} onChangeText={v => set('observaciones', v)} placeholder="Síntomas, tratamientos aplicados, estado general..." multiline numberOfLines={4} />
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Registrar episodio</Text>}
            </TouchableOpacity>

            <Modal visible={modalTernero} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar ternero</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar..." value={searchTernero} onChangeText={setSearchTernero} />
                        <FlatList
                            data={ternerosFiltrados}
                            keyExtractor={item => String(item.id_ternero)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => seleccionarTernero(item)}>
                                    <Text style={styles.modalItemText}>#{item.id_ternero} — {item.nombre || 'Sin nombre'}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin terneros</Text>}
                            style={{ maxHeight: 300 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalTernero(false)}>
                            <Text style={styles.modalCerrarText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center', fontSize: 13 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, margin: space.md, marginBottom: 0, ...shadow.card },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink },
    inputMulti: { height: 90, textAlignVertical: 'top' },
    selectBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, marginTop: 4, backgroundColor: colors.bg },
    selectBtnText: { fontSize: 14, color: colors.ink },
    historial: { marginTop: 12, padding: 12, backgroundColor: colors.campoSoft, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.campo },
    historialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historialText: { fontSize: 13, color: colors.ink },
    historialNum: { fontSize: 18, fontWeight: '800' },
    numVerde: { color: colors.vivo },
    numAmarillo: { color: colors.vendido },
    numRojo: { color: colors.muerto },
    historialHint: { fontSize: 12, color: colors.campo, marginTop: 6, fontWeight: '600' },
    sevBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, marginTop: 8 },
    sevBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    sevLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
    sevLabelActive: { color: colors.white },
    sevDesc: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    sevDescActive: { color: colors.campoSoft },
    btnSubmit: { backgroundColor: colors.campo, margin: space.md, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
    btnSubmitText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '75%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg },
    modalItemText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
    modalEmpty: { textAlign: 'center', color: colors.inkFaint, padding: 20 },
    modalCerrar: { marginTop: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
    modalCerrarText: { color: colors.ink, fontWeight: '600' },
});
