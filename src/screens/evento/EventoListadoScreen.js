import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import businessApi from '../../api/bussines-api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, space, radius, shadow, type } from '../../theme';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const fechaParts = (fecha) => {
    if (!fecha) return { dia: '--', mes: '', anio: '' };
    try {
        const s = String(fecha).split('T')[0];
        const [y, m, d] = s.split('-');
        return { dia: String(parseInt(d, 10)), mes: MESES[parseInt(m, 10) - 1] || '', anio: y };
    } catch { return { dia: '--', mes: '', anio: '' }; }
};

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

export default function EventoListadoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerEventoHook, patchEventoHook } = useBussinesMicroservicio();

    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalEditar, setModalEditar] = useState({ isOpen: false, evento: null });
    const [formEditar, setFormEditar] = useState({ fecha_evento: '', observacion: '' });
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarEventos = useCallback(async () => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}`;
            const res = await obtenerEventoHook(q);
            const payload = res?.data;
            setEventos(Array.isArray(payload) ? payload : (payload?.data || []));
        } catch {
            showAlert('Error al cargar eventos', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarEventos(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargarEventos(); setRefreshing(false); };

    const abrirEditar = (evento) => {
        setFormEditar({ fecha_evento: (evento.fecha_evento || '').split('T')[0], observacion: evento.observacion || '' });
        setModalEditar({ isOpen: true, evento });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchEventoHook(modalEditar.evento.id_evento, formEditar);
        if (res?.error || (res?.status && res.status >= 400)) {
            showAlert('Error al editar evento', false);
        } else {
            showAlert('Evento actualizado');
            setModalEditar({ isOpen: false, evento: null });
            await cargarEventos();
        }
        setSaving(false);
    };

    const confirmarEliminar = (evento) => {
        Alert.alert('Eliminar evento', `¿Eliminar el evento del ${formatFecha(evento.fecha_evento)}? No se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => eliminarEvento(evento) },
        ]);
    };

    const eliminarEvento = async (evento) => {
        try {
            const res = await businessApi.delete(`/eventos/delete-evento-by-id/${evento.id_evento}`);
            if (res?.status >= 200 && res?.status < 300) {
                showAlert('Evento eliminado');
                await cargarEventos();
            } else {
                showAlert('No se pudo eliminar', false);
            }
        } catch {
            showAlert('No se pudo eliminar (tiene relaciones o error de red)', false);
        }
    };

    const totalTerneros = eventos.reduce((t, e) => t + (e?.terneros?.length || 0), 0);
    const totalMadres = eventos.reduce((t, e) => t + (e?.madres?.length || 0), 0);

    const renderEvento = ({ item }) => {
        const f = fechaParts(item.fecha_evento);
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={styles.dateTile}>
                        <Text style={styles.dateDia}>{f.dia}</Text>
                        <Text style={styles.dateMes}>{f.mes}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardObs} numberOfLines={3}>{item.observacion || 'Sin descripción'}</Text>
                        <Text style={styles.cardAnio}>{f.anio}</Text>
                    </View>
                    <Text style={styles.cardId}>#{item.id_evento}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                    <View style={[styles.countPill, { backgroundColor: colors.campoSoft }]}>
                        <Text style={[styles.countPillNum, { color: colors.campoDark }]}>🐮 {item.terneros?.length ?? 0}</Text>
                        <Text style={styles.countPillLbl}>terneros</Text>
                    </View>
                    <View style={[styles.countPill, { backgroundColor: '#E7EEF7' }]}>
                        <Text style={[styles.countPillNum, { color: '#2C5282' }]}>🐄 {item.madres?.length ?? 0}</Text>
                        <Text style={styles.countPillLbl}>madres</Text>
                    </View>
                </View>

                {(item.terneros?.length > 0 || item.madres?.length > 0) && (
                    <View style={styles.rpWrap}>
                        {(item.terneros || []).map(t => (
                            <View key={`t-${t.id_ternero}`} style={styles.rpChip}>
                                <Text style={styles.rpChipText}>🐮 RP {t.rp_ternero}</Text>
                            </View>
                        ))}
                        {(item.madres || []).map(m => (
                            <View key={`m-${m.id_madre}`} style={[styles.rpChip, styles.rpChipMadre]}>
                                <Text style={[styles.rpChipText, styles.rpChipTextMadre]}>🐄 RP {m.rp_madre}</Text>
                            </View>
                        ))}
                    </View>
                )}

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
                    <Text style={styles.headerEyebrow}>TERNEDATA · HACIENDA</Text>
                    <Text style={styles.headerTitle}>📅 Eventos</Text>
                </View>
                <View style={styles.countChip}>
                    <Text style={styles.countNum}>{eventos.length}</Text>
                    <Text style={styles.countLabel}>registrados</Text>
                </View>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {!loading && eventos.length > 0 && (
                <View style={styles.resumen}>
                    <Text style={styles.resumenItem}><Text style={styles.resumenNum}>{totalTerneros}</Text> terneros involucrados</Text>
                    <Text style={styles.resumenSep}>·</Text>
                    <Text style={styles.resumenItem}><Text style={styles.resumenNum}>{totalMadres}</Text> madres</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={eventos}
                    keyExtractor={item => String(item.id_evento)}
                    renderItem={renderEvento}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin eventos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EventoForm')}>
                <Text style={styles.fabText}>＋ Nuevo</Text>
            </TouchableOpacity>

            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Editar evento #{modalEditar.evento?.id_evento}</Text>

                        <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
                        <TextInput style={styles.input} value={formEditar.fecha_evento} onChangeText={v => setFormEditar(f => ({ ...f, fecha_evento: v }))} placeholder="2026-06-24" />

                        <Text style={styles.label}>Descripción</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formEditar.observacion} onChangeText={v => setFormEditar(f => ({ ...f, observacion: v }))} placeholder="Descripción del evento" multiline numberOfLines={3} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, evento: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicion} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
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

    resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
    resumenItem: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
    resumenNum: { color: colors.campo, fontWeight: '900' },
    resumenSep: { color: colors.inkFaint },

    loader: { marginTop: 48 },
    list: { paddingHorizontal: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 48, fontSize: 15 },

    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: space.md, ...shadow.card },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    dateTile: { backgroundColor: colors.campo, borderRadius: radius.md, width: 54, paddingVertical: 8, alignItems: 'center' },
    dateDia: { ...type.num, color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 24 },
    dateMes: { color: colors.caravana, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardObs: { ...type.body, color: colors.ink, lineHeight: 19 },
    cardAnio: { fontSize: 11, color: colors.inkFaint, fontWeight: '700', marginTop: 3 },
    cardId: { fontSize: 12, color: colors.inkFaint, fontWeight: '700' },

    divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
    metaRow: { flexDirection: 'row', gap: space.sm },
    countPill: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5, borderRadius: radius.sm, paddingVertical: 8 },
    countPillNum: { fontWeight: '900', fontSize: 15 },
    countPillLbl: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

    rpWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    rpChip: { backgroundColor: colors.campoSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    rpChipMadre: { backgroundColor: '#E7EEF7' },
    rpChipText: { fontSize: 12, fontWeight: '700', color: colors.campoDark },
    rpChipTextMadre: { color: '#2C5282' },

    cardActions: { flexDirection: 'row', gap: space.sm, marginTop: 12 },
    btnEditar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    btnEditarText: { color: colors.white, fontWeight: '800', fontSize: 13 },
    btnEliminar: { flex: 1, backgroundColor: '#FCEBEA', borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    btnEliminarText: { color: colors.muerto, fontWeight: '800', fontSize: 13 },

    fab: { position: 'absolute', bottom: 22, right: 18, backgroundColor: colors.campo, borderRadius: radius.pill, paddingHorizontal: 22, paddingVertical: 14, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,30,20,0.55)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl },
    modalTitle: { ...type.h2, color: colors.ink, marginBottom: space.lg },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnCancelarText: { color: colors.inkSoft, fontWeight: '700' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '800' },
});
