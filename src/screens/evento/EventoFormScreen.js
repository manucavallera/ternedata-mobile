import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';

const TIPOS_EVENTO = ['Vacunación', 'Destete', 'Pesaje', 'Sanitación', 'Caravana', 'Otro'];

export default function EventoFormScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { crearEventoHook, obtenerTerneroHook, obtenerMadreHook } = useBussinesMicroservicio();

    const [formData, setFormData] = useState({
        tipo_evento: 'Vacunación',
        fecha_evento: new Date().toISOString().split('T')[0],
        descripcion: '',
        id_ternero: '',
        id_madre: '',
    });

    const [terneros, setTerneros] = useState([]);
    const [madres, setMadres] = useState([]);
    const [modalTernero, setModalTernero] = useState(false);
    const [modalMadre, setModalMadre] = useState(false);
    const [searchTernero, setSearchTernero] = useState('');
    const [searchMadre, setSearchMadre] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    useEffect(() => {
        cargarTerneros();
        cargarMadres();
    }, []);

    const cargarTerneros = async () => {
        const idEst = userPayload?.id_establecimiento || establecimientoActual;
        let q = 'page=1&limit=500&estado=Vivo';
        if (idEst) q += `&id_establecimiento=${idEst}`;
        const res = await obtenerTerneroHook(q);
        setTerneros(res?.data?.data || []);
    };

    const cargarMadres = async () => {
        const idEst = userPayload?.id_establecimiento || establecimientoActual;
        let q = 'page=1&limit=500';
        if (idEst) q += `&id_establecimiento=${idEst}`;
        const res = await obtenerMadreHook(q);
        setMadres(res?.data?.data || []);
    };

    const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 5000);
    };

    const handleSubmit = async () => {
        if (!formData.id_ternero && !formData.id_madre) { showAlert('Seleccioná al menos un ternero o madre', false); return; }

        setSubmitting(true);
        const payload = {
            tipo_evento: formData.tipo_evento,
            fecha_evento: formData.fecha_evento,
            descripcion: formData.descripcion || undefined,
            id_ternero: formData.id_ternero ? parseInt(formData.id_ternero) : undefined,
            id_madre: formData.id_madre ? parseInt(formData.id_madre) : undefined,
        };

        const res = await crearEventoHook(payload);
        if (res?.status === 201 || res?.status === 200) {
            showAlert('Evento registrado', true);
            setTimeout(() => navigation.goBack(), 2000);
        } else {
            showAlert('Error al registrar evento', false);
        }
        setSubmitting(false);
    };

    const terneroSel = terneros.find(t => String(t.id_ternero) === String(formData.id_ternero));
    const madreSel = madres.find(m => String(m.id_madre) === String(formData.id_madre));
    const ternerosFiltrados = terneros.filter(t => !searchTernero || t.nombre?.toLowerCase().includes(searchTernero.toLowerCase()) || String(t.id_ternero).includes(searchTernero));
    const madresFiltradas = madres.filter(m => !searchMadre || m.nombre?.toLowerCase().includes(searchMadre.toLowerCase()) || String(m.id_madre).includes(searchMadre));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📋 Nuevo Evento</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Tipo de evento</Text>
                <View style={styles.optionRow}>
                    {TIPOS_EVENTO.map(t => (
                        <TouchableOpacity key={t} style={[styles.optionBtn, formData.tipo_evento === t && styles.optionBtnActive]} onPress={() => set('tipo_evento', t)}>
                            <Text style={[styles.optionBtnText, formData.tipo_evento === t && styles.optionBtnTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Fecha</Text>
                <TextInput style={styles.input} value={formData.fecha_evento} onChangeText={v => set('fecha_evento', v)} placeholder="YYYY-MM-DD" />

                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.descripcion} onChangeText={v => set('descripcion', v)} placeholder="Descripción del evento" multiline numberOfLines={3} />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Animales</Text>

                <Text style={styles.label}>Ternero</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalTernero(true)}>
                    <Text style={styles.selectBtnText}>
                        {terneroSel ? `#${terneroSel.id_ternero} — ${terneroSel.nombre || 'Sin nombre'}` : 'Seleccionar ternero...'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Madre</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalMadre(true)}>
                    <Text style={styles.selectBtnText}>
                        {madreSel ? `#${madreSel.id_madre} — ${madreSel.nombre || 'Sin nombre'}` : 'Seleccionar madre...'}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Registrar evento</Text>}
            </TouchableOpacity>

            {/* Modal Ternero */}
            <Modal visible={modalTernero} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar ternero</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar..." value={searchTernero} onChangeText={setSearchTernero} />
                        <FlatList
                            data={ternerosFiltrados}
                            keyExtractor={item => String(item.id_ternero)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { set('id_ternero', String(item.id_ternero)); setModalTernero(false); setSearchTernero(''); }}>
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

            {/* Modal Madre */}
            <Modal visible={modalMadre} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar madre</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar..." value={searchMadre} onChangeText={setSearchMadre} />
                        <FlatList
                            data={madresFiltradas}
                            keyExtractor={item => String(item.id_madre)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { set('id_madre', String(item.id_madre)); setModalMadre(false); setSearchMadre(''); }}>
                                    <Text style={styles.modalItemText}>#{item.id_madre} — {item.nombre || 'Sin nombre'}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin madres</Text>}
                            style={{ maxHeight: 300 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalMadre(false)}>
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
    header: { backgroundColor: '#8b5cf6', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: '#ede9fe', fontSize: 14, marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 12, marginBottom: 0, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    optionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    optionBtnActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    optionBtnText: { fontSize: 13, color: '#374151' },
    optionBtnTextActive: { color: '#fff', fontWeight: '700' },
    selectBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginTop: 4, backgroundColor: '#f9fafb' },
    selectBtnText: { fontSize: 14, color: '#374151' },
    btnSubmit: { backgroundColor: '#8b5cf6', margin: 12, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
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
