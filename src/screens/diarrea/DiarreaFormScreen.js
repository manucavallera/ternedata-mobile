import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';

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
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    content: { paddingBottom: 40 },
    header: { backgroundColor: '#06b6d4', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: '#cffafe', fontSize: 14, marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 12, marginBottom: 0, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 90, textAlignVertical: 'top' },
    selectBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginTop: 4, backgroundColor: '#f9fafb' },
    selectBtnText: { fontSize: 14, color: '#374151' },
    historial: { marginTop: 12, padding: 12, backgroundColor: '#ecfeff', borderRadius: 8, borderWidth: 1, borderColor: '#a5f3fc' },
    historialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historialText: { fontSize: 13, color: '#374151' },
    historialNum: { fontSize: 18, fontWeight: '800' },
    numVerde: { color: '#16a34a' },
    numAmarillo: { color: '#ca8a04' },
    numRojo: { color: '#dc2626' },
    historialHint: { fontSize: 12, color: '#0891b2', marginTop: 6, fontWeight: '600' },
    sevBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginTop: 8 },
    sevBtnActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
    sevLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
    sevLabelActive: { color: '#fff' },
    sevDesc: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    sevDescActive: { color: '#cffafe' },
    btnSubmit: { backgroundColor: '#06b6d4', margin: 12, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
    btnSubmitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '75%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    modalItemText: { fontSize: 14, color: '#111827', fontWeight: '600' },
    modalEmpty: { textAlign: 'center', color: '#9ca3af', padding: 20 },
    modalCerrar: { marginTop: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10 },
    modalCerrarText: { color: '#374151', fontWeight: '600' },
});
