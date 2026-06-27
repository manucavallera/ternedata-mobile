import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const TIPOS = ['Diarrea', 'Respiratorio', 'Umbilical', 'Oftalmico', 'Otro'];
// Enum real del backend (minúscula con ñ)
const TURNOS = [['mañana', '🌅 Mañana'], ['tarde', '🌆 Tarde']];

export default function TratamientoFormScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { crearTratamientoHook, obtenerTerneroHook } = useBussinesMicroservicio();

    const [formData, setFormData] = useState({
        tipo_enfermedad: 'Diarrea',
        turno: 'mañana',
        nombre: '',           // campo real (era "medicamento" — fantasma)
        descripcion: '',      // campo real (era "observaciones")
        fecha_tratamiento: new Date().toISOString().split('T')[0],
        id_ternero: '',
    });

    const [terneros, setTerneros] = useState([]);
    const [modalTernero, setModalTernero] = useState(false);
    const [searchTernero, setSearchTernero] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    useEffect(() => { cargarTerneros(); }, []);

    const cargarTerneros = async () => {
        let q = 'page=1&limit=500&estado=Vivo';
        const idEst = userPayload?.id_establecimiento || establecimientoActual;
        if (idEst) q += `&id_establecimiento=${idEst}`;
        const res = await obtenerTerneroHook(q);
        setTerneros(res?.data?.data || []);
    };

    const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 5000);
    };

    const handleSubmit = async () => {
        if (!formData.id_ternero) { showAlert('Seleccioná un ternero', false); return; }
        if (!formData.nombre.trim()) { showAlert('Nombre del tratamiento es requerido', false); return; }

        setSubmitting(true);
        const payload = {
            tipo_enfermedad: formData.tipo_enfermedad,
            turno: formData.turno,
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion || undefined,
            fecha_tratamiento: formData.fecha_tratamiento,
            id_ternero: parseInt(formData.id_ternero),
        };

        const res = await crearTratamientoHook(payload);
        if (res?.status === 201 || res?.status === 200) {
            showAlert('Tratamiento registrado', true);
            setTimeout(() => navigation.goBack(), 2000);
        } else {
            showAlert('Error al registrar tratamiento', false);
        }
        setSubmitting(false);
    };

    const terneroSeleccionado = terneros.find(t => String(t.id_ternero) === String(formData.id_ternero));
    const ternerosFiltrados = terneros.filter(t =>
        !searchTernero || t.nombre?.toLowerCase().includes(searchTernero.toLowerCase()) || String(t.id_ternero).includes(searchTernero)
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>💊 Nuevo Tratamiento</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ternero</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalTernero(true)}>
                    <Text style={styles.selectBtnText}>
                        {terneroSeleccionado ? `#${terneroSeleccionado.id_ternero} — ${terneroSeleccionado.nombre || 'Sin nombre'}` : 'Seleccionar ternero...'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Tipo y turno</Text>

                <Text style={styles.label}>Tipo de enfermedad</Text>
                <View style={styles.optionRow}>
                    {TIPOS.map(t => (
                        <TouchableOpacity key={t} style={[styles.optionBtn, formData.tipo_enfermedad === t && styles.optionBtnActive]} onPress={() => set('tipo_enfermedad', t)}>
                            <Text style={[styles.optionBtnText, formData.tipo_enfermedad === t && styles.optionBtnTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Turno</Text>
                <View style={styles.turnoRow}>
                    {TURNOS.map(([val, lbl]) => (
                        <TouchableOpacity key={val} style={[styles.turnoBtn, formData.turno === val && styles.optionBtnActive]} onPress={() => set('turno', val)}>
                            <Text style={[styles.optionBtnText, formData.turno === val && styles.optionBtnTextActive]}>{lbl}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Fecha</Text>
                <TextInput style={styles.input} value={formData.fecha_tratamiento} onChangeText={v => set('fecha_tratamiento', v)} placeholder="YYYY-MM-DD" />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Tratamiento</Text>

                <Text style={styles.label}>Nombre *</Text>
                <TextInput style={styles.input} value={formData.nombre} onChangeText={v => set('nombre', v)} placeholder="Ej: Ivermectina, Oxitetraciclina" />

                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.descripcion} onChangeText={v => set('descripcion', v)} placeholder="Dosis, observaciones, etc." multiline numberOfLines={3} />
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnSubmitText}>Registrar tratamiento</Text>}
            </TouchableOpacity>

            <Modal visible={modalTernero} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar ternero</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar por nombre o ID..." value={searchTernero} onChangeText={setSearchTernero} />
                        <FlatList
                            data={ternerosFiltrados}
                            keyExtractor={item => String(item.id_ternero)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { set('id_ternero', String(item.id_ternero)); setModalTernero(false); setSearchTernero(''); }}>
                                    <Text style={styles.modalItemText}>#{item.id_ternero} — {item.nombre || 'Sin nombre'}</Text>
                                    <Text style={styles.modalItemSub}>{item.sexo || ''} · {item.estado || ''}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin terneros disponibles</Text>}
                            style={{ maxHeight: 350 }}
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
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    optionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
    turnoRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    turnoBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
    optionBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    optionBtnText: { fontSize: 13, color: colors.ink },
    optionBtnTextActive: { color: colors.white, fontWeight: '700' },
    selectBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, marginTop: 4, backgroundColor: colors.bg },
    selectBtnText: { fontSize: 14, color: colors.ink },
    btnSubmit: { backgroundColor: colors.campo, margin: space.md, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
    btnSubmitText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '75%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg },
    modalItemText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
    modalItemSub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
    modalEmpty: { textAlign: 'center', color: colors.inkFaint, padding: 20 },
    modalCerrar: { marginTop: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
    modalCerrarText: { color: colors.ink, fontWeight: '600' },
});
