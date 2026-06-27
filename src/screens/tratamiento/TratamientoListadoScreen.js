import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import businessApi from '../../api/bussines-api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, space, radius, shadow, type } from '../../theme';
import Caravana from '../../components/Caravana';

// turno: enum DB en minúscula con ñ ('mañana'/'tarde'); se muestra capitalizado.
const TURNOS = [
    { val: '', label: 'Ambos turnos' },
    { val: 'mañana', label: 'Mañana' },
    { val: 'tarde', label: 'Tarde' },
];
const TURNOS_EDIT = [['mañana', '🌅 Mañana'], ['tarde', '🌆 Tarde']];
const TIPOS = ['Diarrea', 'Respiratorio', 'Umbilical', 'Oftalmico', 'Otro'];

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

const capitalizar = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function TratamientoListadoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerTratamientoHook, patchTratamientoHook } = useBussinesMicroservicio();

    const [tratamientos, setTratamientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busquedaEnf, setBusquedaEnf] = useState('');
    const [filtroTurno, setFiltroTurno] = useState('');

    const [modalEditar, setModalEditar] = useState({ isOpen: false, tratamiento: null });
    const [formEditar, setFormEditar] = useState({ nombre: '', descripcion: '', tipo_enfermedad: '', turno: '', fecha_tratamiento: '' });
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarTratamientos = useCallback(async (enfermedad = '', turno = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}&`;
            q = q.replace(/&$/, '');
            const params = [];
            if (enfermedad) params.push(`tipo_enfermedad=${encodeURIComponent(enfermedad)}`);
            if (turno) params.push(`turno=${encodeURIComponent(turno)}`);
            const full = [q, ...params].filter(Boolean).join('&');
            const res = await obtenerTratamientoHook(full);
            const payload = res?.data;
            setTratamientos(Array.isArray(payload) ? payload : (payload?.data || []));
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarTratamientos(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarTratamientos(busquedaEnf, filtroTurno);
        setRefreshing(false);
    };

    const abrirEditar = (t) => {
        setFormEditar({
            nombre: t.nombre || '',
            descripcion: t.descripcion || '',
            tipo_enfermedad: t.tipo_enfermedad || 'Diarrea',
            turno: t.turno || 'mañana',
            fecha_tratamiento: (t.fecha_tratamiento || '').split('T')[0],
        });
        setModalEditar({ isOpen: true, tratamiento: t });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchTratamientoHook(modalEditar.tratamiento.id_tratamiento, formEditar);
        if (res?.error || (res?.status && res.status >= 400)) {
            showAlert('Error al editar tratamiento', false);
        } else {
            showAlert('Tratamiento actualizado');
            setModalEditar({ isOpen: false, tratamiento: null });
            await cargarTratamientos(busquedaEnf, filtroTurno);
        }
        setSaving(false);
    };

    const confirmarEliminar = (t) => {
        Alert.alert('Eliminar tratamiento', `¿Eliminar "${t.nombre || 'tratamiento'}"? No se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => eliminarTratamiento(t) },
        ]);
    };

    const eliminarTratamiento = async (t) => {
        try {
            const res = await businessApi.delete(`/tratamientos/delete-tratamiento-by-id/${t.id_tratamiento}`);
            if (res?.status >= 200 && res?.status < 300) {
                showAlert('Tratamiento eliminado');
                await cargarTratamientos(busquedaEnf, filtroTurno);
            } else {
                showAlert('No se pudo eliminar', false);
            }
        } catch {
            showAlert('No se pudo eliminar (error de red)', false);
        }
    };

    const renderTratamiento = ({ item }) => {
        const rp = item.ternero?.rp_ternero;
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    {rp != null ? <Caravana rp={rp} size="sm" /> : null}
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.nombre || 'Tratamiento'}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>
                            {item.ternero?.nombre ? `${item.ternero.nombre}` : (rp != null ? `RP ${rp}` : 'Sin ternero')}
                            {` · ${formatFecha(item.fecha_tratamiento)}`}
                        </Text>
                    </View>
                    {item.tipo_enfermedad ? (
                        <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>{item.tipo_enfermedad}</Text></View>
                    ) : null}
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>TURNO</Text>
                        <Text style={styles.metaValue}>{capitalizar(item.turno) || '—'}</Text>
                    </View>
                    <View style={styles.metaSep} />
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>FECHA</Text>
                        <Text style={styles.metaValue}>{formatFecha(item.fecha_tratamiento)}</Text>
                    </View>
                </View>

                {item.descripcion ? <Text style={styles.observaciones} numberOfLines={3}>“{item.descripcion}”</Text> : null}

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                        <Text style={styles.btnEditarText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnEliminar} onPress={() => confirmarEliminar(item)}>
                        <Text style={styles.btnEliminarText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View>
                    <Text style={styles.headerEyebrow}>TERNEDATA · SANIDAD</Text>
                    <Text style={styles.headerTitle}>💉 Tratamientos</Text>
                </View>
                <View style={styles.countChip}>
                    <Text style={styles.countNum}>{tratamientos.length}</Text>
                    <Text style={styles.countLabel}>registros</Text>
                </View>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por enfermedad..."
                    value={busquedaEnf}
                    onChangeText={setBusquedaEnf}
                    onSubmitEditing={() => cargarTratamientos(busquedaEnf, filtroTurno)}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={() => cargarTratamientos(busquedaEnf, filtroTurno)}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filtroWrap}>
                {TURNOS.map(t => (
                    <TouchableOpacity key={t.val || 'all'} style={[styles.filtroBtn, filtroTurno === t.val && styles.filtroBtnActive]} onPress={() => { setFiltroTurno(t.val); cargarTratamientos(busquedaEnf, t.val); }}>
                        <Text style={[styles.filtroBtnText, filtroTurno === t.val && styles.filtroBtnTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={tratamientos}
                    keyExtractor={item => String(item.id_tratamiento)}
                    renderItem={renderTratamiento}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin tratamientos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('TratamientoForm')}>
                <Text style={styles.fabText}>＋ Nuevo</Text>
            </TouchableOpacity>

            {/* Modal Editar */}
            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Editar tratamiento</Text>

                            <Text style={styles.label}>Nombre</Text>
                            <TextInput style={styles.input} value={formEditar.nombre} onChangeText={v => setFormEditar(f => ({ ...f, nombre: v }))} placeholder="Nombre del tratamiento" />

                            <Text style={styles.label}>Tipo de enfermedad</Text>
                            <View style={styles.optionRow}>
                                {TIPOS.map(t => (
                                    <TouchableOpacity key={t} style={[styles.optionBtn, formEditar.tipo_enfermedad === t && styles.optionBtnActive]} onPress={() => setFormEditar(f => ({ ...f, tipo_enfermedad: t }))}>
                                        <Text style={[styles.optionBtnText, formEditar.tipo_enfermedad === t && styles.optionBtnTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Turno</Text>
                            <View style={styles.optionRow}>
                                {TURNOS_EDIT.map(([val, lbl]) => (
                                    <TouchableOpacity key={val} style={[styles.optionBtn, formEditar.turno === val && styles.optionBtnActive]} onPress={() => setFormEditar(f => ({ ...f, turno: val }))}>
                                        <Text style={[styles.optionBtnText, formEditar.turno === val && styles.optionBtnTextActive]}>{lbl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
                            <TextInput style={styles.input} value={formEditar.fecha_tratamiento} onChangeText={v => setFormEditar(f => ({ ...f, fecha_tratamiento: v }))} placeholder="2026-06-26" />

                            <Text style={styles.label}>Descripción</Text>
                            <TextInput style={[styles.input, styles.inputMulti]} value={formEditar.descripcion} onChangeText={v => setFormEditar(f => ({ ...f, descripcion: v }))} placeholder="Descripción" multiline numberOfLines={3} />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, tratamiento: null })}>
                                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicion} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        backgroundColor: colors.campoDark, paddingBottom: 18, paddingHorizontal: space.lg,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    },
    headerEyebrow: { ...type.eyebrow, color: colors.caravana, marginBottom: 3 },
    headerTitle: { ...type.h1, color: colors.white },
    countChip: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
    countNum: { ...type.h2, ...type.num, color: colors.caravana },
    countLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: '#CFE3D4', textTransform: 'uppercase' },

    alert: { marginHorizontal: space.md, marginTop: space.md, borderRadius: radius.sm, padding: 11 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '700', textAlign: 'center' },

    searchRow: { flexDirection: 'row', marginHorizontal: space.md, marginTop: space.md, gap: space.sm },
    searchInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.ink },
    searchBtn: { backgroundColor: colors.campo, borderRadius: radius.sm, paddingHorizontal: 16, justifyContent: 'center' },
    searchBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },

    filtroWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
    filtroBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.surface },
    filtroBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    filtroBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    filtroBtnTextActive: { color: colors.white, fontWeight: '800' },

    loader: { marginTop: 48 },
    list: { paddingHorizontal: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 48, fontSize: 15 },

    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: space.md, ...shadow.card },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardName: { ...type.title, color: colors.ink },
    cardSub: { fontSize: 12, color: colors.inkSoft, fontWeight: '600', marginTop: 2 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4, backgroundColor: colors.vendido, maxWidth: 110 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

    divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaItem: { flex: 1 },
    metaSep: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: 12 },
    metaLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: colors.inkFaint },
    metaValue: { ...type.title, color: colors.ink, marginTop: 1 },
    observaciones: { fontSize: 12, color: colors.inkSoft, marginTop: 10, fontStyle: 'italic' },

    cardActions: { flexDirection: 'row', gap: space.sm, marginTop: 12 },
    btnEditar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    btnEditarText: { color: colors.white, fontWeight: '800', fontSize: 13 },
    btnEliminar: { flex: 1, backgroundColor: '#FCEBEA', borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    btnEliminarText: { color: colors.muerto, fontWeight: '800', fontSize: 13 },

    fab: { position: 'absolute', bottom: 22, right: 18, backgroundColor: colors.campo, borderRadius: radius.pill, paddingHorizontal: 22, paddingVertical: 14, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,30,20,0.55)', justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '88%' },
    modalTitle: { ...type.h2, color: colors.ink, marginBottom: space.lg },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface },
    optionBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    optionBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    optionBtnTextActive: { color: colors.white, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnCancelarText: { color: colors.inkSoft, fontWeight: '700' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '800' },
});
