import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';

const ESTADOS = ['Seca', 'En Tambo', 'Activa', 'Vendida', 'Muerta'];

export default function MadreFormScreen() {
    const navigation = useNavigation();
    const { userPayload } = useSelector(state => state.auth);
    const { crearMadreHook, obtenerRodeosHook, obtenerEstablecimientosHook } = useBussinesMicroservicio();

    const [formData, setFormData] = useState({
        nombre: '',
        rp_madre: '',
        estado: 'Seca',
        fecha_nacimiento: '',
        observaciones: '',
        id_establecimiento: userPayload?.id_establecimiento || '',
        id_rodeo: '',
    });

    const [rodeos, setRodeos] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [modalRodeo, setModalRodeo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const isAdmin = userPayload?.rol === 'admin';

    useEffect(() => {
        if (isAdmin) cargarEstablecimientos();
        cargarRodeos();
    }, []);

    const cargarEstablecimientos = async () => {
        const res = await obtenerEstablecimientosHook();
        if (res?.status === 200) setEstablecimientos(res.data.filter(e => e.estado === 'activo'));
    };

    const cargarRodeos = async () => {
        const idEst = formData.id_establecimiento || userPayload?.id_establecimiento;
        const q = idEst ? `id_establecimiento=${idEst}&limit=500` : 'limit=500';
        const res = await obtenerRodeosHook(q);
        if (res?.status === 200) setRodeos((res.data || []).filter(r => r.estado === 'activo'));
    };

    const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 5000);
    };

    const handleSubmit = async () => {
        if (!formData.nombre) { showAlert('Nombre o RP es requerido', false); return; }

        setSubmitting(true);
        const payload = {
            nombre: formData.nombre,
            rp_madre: formData.rp_madre || undefined,
            estado: formData.estado,
            observaciones: formData.observaciones || undefined,
            fecha_nacimiento: formData.fecha_nacimiento || undefined,
            id_rodeo: formData.id_rodeo ? parseInt(formData.id_rodeo) : undefined,
            id_establecimiento: isAdmin
                ? parseInt(formData.id_establecimiento)
                : userPayload?.id_establecimiento,
        };

        const res = await crearMadreHook(payload);
        if (res?.status === 201 || res?.status === 200) {
            showAlert('Madre registrada exitosamente', true);
            setTimeout(() => navigation.goBack(), 2000);
        } else {
            showAlert(res?.data?.message || 'Error al registrar madre', false);
        }
        setSubmitting(false);
    };

    const rodeoSeleccionado = rodeos.find(r => String(r.id_rodeo) === String(formData.id_rodeo));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🐮 Nueva Madre</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Datos básicos</Text>

                <Text style={styles.label}>Nombre / RP Madre *</Text>
                <TextInput style={styles.input} value={formData.nombre} onChangeText={v => set('nombre', v)} placeholder="Ej: Vaca María o RP 1023" />

                <Text style={styles.label}>RP Madre</Text>
                <TextInput style={styles.input} value={formData.rp_madre} onChangeText={v => set('rp_madre', v)} placeholder="Número de RP" keyboardType="numeric" />

                <Text style={styles.label}>Estado</Text>
                <View style={styles.optionRow}>
                    {ESTADOS.map(e => (
                        <TouchableOpacity key={e} style={[styles.optionBtn, formData.estado === e && styles.optionBtnActive]} onPress={() => set('estado', e)}>
                            <Text style={[styles.optionBtnText, formData.estado === e && styles.optionBtnTextActive]}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Fecha de nacimiento</Text>
                <TextInput style={styles.input} value={formData.fecha_nacimiento} onChangeText={v => set('fecha_nacimiento', v)} placeholder="YYYY-MM-DD" />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Rodeo</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalRodeo(true)}>
                    <Text style={styles.selectBtnText}>
                        {rodeoSeleccionado ? `#${rodeoSeleccionado.id_rodeo} — ${rodeoSeleccionado.nombre}` : 'Sin rodeo asignado'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.observaciones} onChangeText={v => set('observaciones', v)} placeholder="Observaciones (salud, comportamiento...)" multiline numberOfLines={3} />
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Guardar madre</Text>}
            </TouchableOpacity>

            <Modal visible={modalRodeo} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar rodeo</Text>
                        <TouchableOpacity style={[styles.modalItem, { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]} onPress={() => { set('id_rodeo', ''); setModalRodeo(false); }}>
                            <Text style={styles.modalItemText}>Sin rodeo</Text>
                        </TouchableOpacity>
                        <FlatList
                            data={rodeos}
                            keyExtractor={item => String(item.id_rodeo)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { set('id_rodeo', String(item.id_rodeo)); setModalRodeo(false); }}>
                                    <Text style={styles.modalItemText}>#{item.id_rodeo} — {item.nombre}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin rodeos activos</Text>}
                            style={{ maxHeight: 350 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalRodeo(false)}>
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
    header: { backgroundColor: '#10b981', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: '#a7f3d0', fontSize: 14, marginBottom: 4 },
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
    optionBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    optionBtnText: { fontSize: 13, color: '#374151' },
    optionBtnTextActive: { color: '#fff', fontWeight: '700' },
    selectBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginTop: 4, backgroundColor: '#f9fafb' },
    selectBtnText: { fontSize: 14, color: '#374151' },
    btnSubmit: { backgroundColor: '#10b981', margin: 12, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
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
