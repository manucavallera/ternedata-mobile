import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

export default function EventoFormScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { crearEventoHook, obtenerTerneroHook, obtenerMadreHook } = useBussinesMicroservicio();

    // El evento NO tiene tipo: solo fecha + observación + animales relacionados (ver entity)
    const [formData, setFormData] = useState({
        fecha_evento: new Date().toISOString().split('T')[0],
        observacion: '',
    });

    // Un evento agrupa VARIOS animales (id_ternero/id_madre son arrays en el DTO),
    // igual que la web: se marcan de a uno y quedan como chips.
    const [ternerosSel, setTernerosSel] = useState([]);
    const [madresSel, setMadresSel] = useState([]);

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

    const toggleTernero = (id) => setTernerosSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const toggleMadre = (id) => setMadresSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const handleSubmit = async () => {
        if (!formData.observacion?.trim()) { showAlert('La observación es requerida', false); return; }
        if (ternerosSel.length === 0 && madresSel.length === 0) { showAlert('Seleccioná al menos un ternero o una madre', false); return; }

        setSubmitting(true);
        // El backend espera observacion (requerida) e id_ternero/id_madre como ARRAYS de int
        const payload = {
            fecha_evento: formData.fecha_evento,
            observacion: formData.observacion.trim(),
            id_ternero: ternerosSel.length ? ternerosSel : undefined,
            id_madre: madresSel.length ? madresSel : undefined,
        };

        const res = await crearEventoHook(payload);
        if (res?.status === 201 || res?.status === 200) {
            const total = ternerosSel.length + madresSel.length;
            showAlert(`Evento registrado para ${total} animal${total === 1 ? '' : 'es'}`, true);
            setTimeout(() => navigation.goBack(), 2000);
        } else {
            showAlert('Error al registrar evento', false);
        }
        setSubmitting(false);
    };

    const rpTernero = (t) => t.rp_ternero ?? t.id_ternero;
    const rpMadre = (m) => m.rp_madre ?? m.id_madre;
    const ternerosFiltrados = terneros.filter(t => !searchTernero || t.nombre?.toLowerCase().includes(searchTernero.toLowerCase()) || String(rpTernero(t)).includes(searchTernero));
    const madresFiltradas = madres.filter(m => !searchMadre || m.nombre?.toLowerCase().includes(searchMadre.toLowerCase()) || String(rpMadre(m)).includes(searchMadre));

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
                <Text style={styles.sectionTitle}>Datos del evento</Text>

                <Text style={styles.label}>Fecha</Text>
                <TextInput style={styles.input} value={formData.fecha_evento} onChangeText={v => set('fecha_evento', v)} placeholder="YYYY-MM-DD" />

                <Text style={styles.label}>Observación *</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.observacion} onChangeText={v => set('observacion', v)} placeholder="Ej: Vacunación contra fiebre aftosa" multiline numberOfLines={3} />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Animales</Text>
                <Text style={styles.hint}>Un mismo evento puede abarcar varios animales.</Text>

                <Text style={styles.label}>Terneros ({ternerosSel.length})</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalTernero(true)}>
                    <Text style={styles.selectBtnText}>
                        {ternerosSel.length ? `${ternerosSel.length} seleccionado${ternerosSel.length === 1 ? '' : 's'} — tocá para cambiar` : 'Seleccionar terneros...'}
                    </Text>
                </TouchableOpacity>
                {ternerosSel.length > 0 && (
                    <View style={styles.chipsWrap}>
                        {ternerosSel.map(id => {
                            const t = terneros.find(x => x.id_ternero === id);
                            return (
                                <TouchableOpacity key={id} style={styles.chip} onPress={() => toggleTernero(id)}>
                                    <Text style={styles.chipText}>RP {t ? rpTernero(t) : id} ×</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                <Text style={styles.label}>Madres ({madresSel.length})</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalMadre(true)}>
                    <Text style={styles.selectBtnText}>
                        {madresSel.length ? `${madresSel.length} seleccionada${madresSel.length === 1 ? '' : 's'} — tocá para cambiar` : 'Seleccionar madres...'}
                    </Text>
                </TouchableOpacity>
                {madresSel.length > 0 && (
                    <View style={styles.chipsWrap}>
                        {madresSel.map(id => {
                            const m = madres.find(x => x.id_madre === id);
                            return (
                                <TouchableOpacity key={id} style={styles.chip} onPress={() => toggleMadre(id)}>
                                    <Text style={styles.chipText}>RP {m ? rpMadre(m) : id} ×</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Registrar evento</Text>}
            </TouchableOpacity>

            {/* Modal Ternero */}
            <Modal visible={modalTernero} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar terneros ({ternerosSel.length})</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar por RP o nombre..." value={searchTernero} onChangeText={setSearchTernero} />
                        <FlatList
                            data={ternerosFiltrados}
                            keyExtractor={item => String(item.id_ternero)}
                            renderItem={({ item }) => {
                                const marcado = ternerosSel.includes(item.id_ternero);
                                return (
                                    <TouchableOpacity style={styles.modalItem} onPress={() => toggleTernero(item.id_ternero)}>
                                        <Text style={[styles.modalItemText, marcado && styles.modalItemTextSel]}>
                                            {marcado ? '☑' : '☐'}  RP {rpTernero(item)} — {item.nombre || 'Sin nombre'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin terneros</Text>}
                            style={{ maxHeight: 300 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => { setModalTernero(false); setSearchTernero(''); }}>
                            <Text style={styles.modalCerrarText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Madre */}
            <Modal visible={modalMadre} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar madres ({madresSel.length})</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar por RP o nombre..." value={searchMadre} onChangeText={setSearchMadre} />
                        <FlatList
                            data={madresFiltradas}
                            keyExtractor={item => String(item.id_madre)}
                            renderItem={({ item }) => {
                                const marcado = madresSel.includes(item.id_madre);
                                return (
                                    <TouchableOpacity style={styles.modalItem} onPress={() => toggleMadre(item.id_madre)}>
                                        <Text style={[styles.modalItemText, marcado && styles.modalItemTextSel]}>
                                            {marcado ? '☑' : '☐'}  RP {rpMadre(item)} — {item.nombre || 'Sin nombre'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin madres</Text>}
                            style={{ maxHeight: 300 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => { setModalMadre(false); setSearchMadre(''); }}>
                            <Text style={styles.modalCerrarText}>Listo</Text>
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
    modalItemTextSel: { color: colors.campo, fontWeight: '800' },
    hint: { fontSize: 11, color: colors.inkFaint, marginBottom: 4 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: { backgroundColor: colors.campoSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.campoDark },
    modalEmpty: { textAlign: 'center', color: colors.inkFaint, padding: 20 },
    modalCerrar: { marginTop: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
    modalCerrarText: { color: colors.ink, fontWeight: '600' },
});
