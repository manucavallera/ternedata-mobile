import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const SEXOS = ['Macho', 'Hembra'];
const ESTADOS = ['Vivo', 'Muerto', 'Vendido'];
// Enum real del backend (minúscula), igual que la web
const METODOS_CALOSTRADO = [['mamadera', '🍼 Mamadera'], ['sonda', '🩺 Sonda']];

export default function TerneroFormScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { crearTerneroHook, obtenerMadreHook, obtenerRodeosHook, obtenerEstablecimientosHook } = useBussinesMicroservicio();

    const [formData, setFormData] = useState({
        rp_ternero: '',
        sexo: 'Macho',
        estado: 'Vivo',
        id_establecimiento: userPayload?.id_establecimiento || establecimientoActual || '',
        peso_nacer: '',
        peso_ideal: '',
        observaciones: '',
        fecha_nacimiento: '',
        semen: '',
        id_madre: '',
        id_rodeo: '',
        metodo_calostrado: '',
        litros_calostrado: '',
        grado_brix: '',
        observaciones_calostrado: '',
    });

    const [mostrarCalostrado, setMostrarCalostrado] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const [madres, setMadres] = useState([]);
    const [rodeos, setRodeos] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [modalMadre, setModalMadre] = useState(false);
    const [modalRodeo, setModalRodeo] = useState(false);
    const [searchMadre, setSearchMadre] = useState('');

    const isAdmin = userPayload?.rol === 'admin';

    useEffect(() => {
        if (isAdmin) cargarEstablecimientos();
        cargarMadres();
        const idEst = formData.id_establecimiento;
        if (idEst) cargarRodeos(idEst);
    }, []);

    const cargarEstablecimientos = async () => {
        const res = await obtenerEstablecimientosHook();
        if (res?.status === 200) setEstablecimientos(res.data.filter(e => e.estado === 'activo'));
    };

    const cargarMadres = async () => {
        let q = 'page=1&limit=500&estado=Activa';
        if (formData.id_establecimiento) q += `&id_establecimiento=${formData.id_establecimiento}`;
        const res = await obtenerMadreHook(q);
        setMadres(res?.data?.data || []);
    };

    const cargarRodeos = async (idEst) => {
        const res = await obtenerRodeosHook(`id_establecimiento=${idEst}&limit=500`);
        if (res?.status === 200) setRodeos((res.data || []).filter(r => r.estado === 'activo'));
    };

    const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 5000);
    };

    const handleSubmit = async () => {
        if (!formData.rp_ternero || isNaN(formData.rp_ternero) || Number(formData.rp_ternero) <= 0) {
            showAlert('RP del ternero es requerido (número positivo)', false); return;
        }
        if (!formData.peso_nacer || Number(formData.peso_nacer) <= 0) {
            showAlert('Peso al nacer es requerido', false); return;
        }
        if (!formData.fecha_nacimiento) { showAlert('Fecha de nacimiento es requerida', false); return; }

        setSubmitting(true);
        const pesoNacer = parseFloat(formData.peso_nacer);
        const payload = {
            ...formData,
            rp_ternero: parseInt(formData.rp_ternero),
            peso_nacer: pesoNacer,
            // peso_ideal: el ingresado o el doble del peso al nacer (igual que la web)
            peso_ideal: formData.peso_ideal ? parseFloat(formData.peso_ideal) : pesoNacer * 2,
            // peso_largado lo deriva la web como nacer×15
            peso_largado: pesoNacer * 15,
            litros_calostrado: formData.litros_calostrado ? parseFloat(formData.litros_calostrado) : undefined,
            grado_brix: formData.grado_brix ? parseFloat(formData.grado_brix) : undefined,
            id_madre: formData.id_madre ? parseInt(formData.id_madre) : undefined,
            id_rodeo: formData.id_rodeo ? parseInt(formData.id_rodeo) : undefined,
            id_establecimiento: formData.id_establecimiento ? parseInt(formData.id_establecimiento) : undefined,
        };

        const res = await crearTerneroHook(payload);

        if (res?.status === 201 || res?.status === 200) {
            showAlert('Ternero creado exitosamente', true);
            setTimeout(() => navigation.goBack(), 2000);
        } else {
            showAlert('Error al crear ternero. Verificá los datos.', false);
        }
        setSubmitting(false);
    };

    const madreSeleccionada = madres.find(m => String(m.id_madre) === String(formData.id_madre));
    const rodeoSeleccionado = rodeos.find(r => String(r.id_rodeo) === String(formData.id_rodeo));
    const madresFiltradas = madres.filter(m =>
        !searchMadre || m.nombre?.toLowerCase().includes(searchMadre.toLowerCase()) || String(m.rp_madre)?.includes(searchMadre)
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🐄 Nuevo Ternero</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Datos básicos</Text>

                <Text style={styles.label}>RP Ternero</Text>
                <TextInput style={styles.input} value={formData.rp_ternero} onChangeText={v => set('rp_ternero', v)} placeholder="Código RP del ternero" />

                <Text style={styles.label}>Fecha de nacimiento *</Text>
                <TextInput style={styles.input} value={formData.fecha_nacimiento} onChangeText={v => set('fecha_nacimiento', v)} placeholder="YYYY-MM-DD" />

                <Text style={styles.label}>Sexo</Text>
                <View style={styles.optionRow}>
                    {SEXOS.map(s => (
                        <TouchableOpacity key={s} style={[styles.optionBtn, formData.sexo === s && styles.optionBtnActive]} onPress={() => set('sexo', s)}>
                            <Text style={[styles.optionBtnText, formData.sexo === s && styles.optionBtnTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Estado</Text>
                <View style={styles.optionRow}>
                    {ESTADOS.map(e => (
                        <TouchableOpacity key={e} style={[styles.optionBtn, formData.estado === e && styles.optionBtnActive]} onPress={() => set('estado', e)}>
                            <Text style={[styles.optionBtnText, formData.estado === e && styles.optionBtnTextActive]}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Semen</Text>
                <TextInput style={styles.input} value={formData.semen} onChangeText={v => set('semen', v)} placeholder="Toro / semen utilizado" />

                <Text style={styles.label}>Peso al nacer (kg)</Text>
                <TextInput style={styles.input} value={formData.peso_nacer} onChangeText={v => set('peso_nacer', v)} placeholder="Ej: 38.5" keyboardType="decimal-pad" />

                <Text style={styles.label}>Peso ideal (kg)</Text>
                <TextInput style={styles.input} value={formData.peso_ideal} onChangeText={v => set('peso_ideal', v)} placeholder="Ej: 45" keyboardType="decimal-pad" />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Madre y rodeo</Text>

                <Text style={styles.label}>Madre</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalMadre(true)}>
                    <Text style={styles.selectBtnText}>
                        {madreSeleccionada ? `#${madreSeleccionada.id_madre} — ${madreSeleccionada.nombre || madreSeleccionada.rp_madre}` : 'Seleccionar madre...'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Rodeo</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalRodeo(true)}>
                    <Text style={styles.selectBtnText}>
                        {rodeoSeleccionado ? `#${rodeoSeleccionado.id_rodeo} — ${rodeoSeleccionado.nombre}` : 'Seleccionar rodeo...'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput style={[styles.input, styles.inputMulti]} value={formData.observaciones} onChangeText={v => set('observaciones', v)} placeholder="Observaciones generales" multiline numberOfLines={3} />
            </View>

            {/* Calostrado */}
            <TouchableOpacity style={styles.toggleCalostrado} onPress={() => setMostrarCalostrado(v => !v)}>
                <Text style={styles.toggleCalostradoText}>{mostrarCalostrado ? '▲ Ocultar calostrado' : '▼ Agregar datos de calostrado'}</Text>
            </TouchableOpacity>

            {mostrarCalostrado && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Calostrado</Text>

                    <Text style={styles.label}>Método</Text>
                    <View style={styles.optionRow}>
                        {METODOS_CALOSTRADO.map(([val, lbl]) => (
                            <TouchableOpacity key={val} style={[styles.optionBtn, formData.metodo_calostrado === val && styles.optionBtnActive]} onPress={() => set('metodo_calostrado', val)}>
                                <Text style={[styles.optionBtnText, formData.metodo_calostrado === val && styles.optionBtnTextActive]}>{lbl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Litros calostrado</Text>
                    <TextInput style={styles.input} value={formData.litros_calostrado} onChangeText={v => set('litros_calostrado', v)} placeholder="Ej: 3.5" keyboardType="decimal-pad" />

                    <Text style={styles.label}>Grado Brix</Text>
                    <TextInput style={styles.input} value={formData.grado_brix} onChangeText={v => set('grado_brix', v)} placeholder="Ej: 22" keyboardType="decimal-pad" />

                    <Text style={styles.label}>Observaciones calostrado</Text>
                    <TextInput style={[styles.input, styles.inputMulti]} value={formData.observaciones_calostrado} onChangeText={v => set('observaciones_calostrado', v)} placeholder="Observaciones del calostrado" multiline numberOfLines={2} />
                </View>
            )}

            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Crear ternero</Text>}
            </TouchableOpacity>

            {/* Modal Madre */}
            <Modal visible={modalMadre} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar madre</Text>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Buscar por nombre o RP..." value={searchMadre} onChangeText={setSearchMadre} />
                        <FlatList
                            data={madresFiltradas}
                            keyExtractor={item => String(item.id_madre)}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { set('id_madre', String(item.id_madre)); setModalMadre(false); setSearchMadre(''); }}>
                                    <Text style={styles.modalItemText}>#{item.id_madre} — {item.nombre || item.rp_madre || 'Sin nombre'}</Text>
                                    <Text style={styles.modalItemSub}>RP: {item.rp_madre || '-'}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Sin madres disponibles</Text>}
                            style={{ maxHeight: 350 }}
                        />
                        <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalMadre(false)}>
                            <Text style={styles.modalCerrarText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Rodeo */}
            <Modal visible={modalRodeo} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar rodeo</Text>
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
    toggleCalostrado: { margin: space.md, padding: 12, backgroundColor: colors.campoSoft, borderRadius: radius.sm, alignItems: 'center' },
    toggleCalostradoText: { color: colors.campo, fontWeight: '600', fontSize: 14 },
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
