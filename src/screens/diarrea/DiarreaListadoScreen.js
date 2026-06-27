import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, shadow, radius, space } from '../../theme';

const SEVERIDADES = ['', 'Leve', 'Moderada', 'Severa', 'Crítica'];

const severidadColor = (s) => {
    if (s === 'Leve') return '#22c55e';
    if (s === 'Moderada') return '#f59e0b';
    if (s === 'Severa') return '#f97316';
    if (s === 'Crítica') return '#ef4444';
    return '#9ca3af';
};

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

export default function DiarreaListadoScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerDiarreaTerneroHook, patchDiarreaHook } = useBussinesMicroservicio();

    const [diarreas, setDiarreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [filtroSeveridad, setFiltroSeveridad] = useState('');
    const [modalEditar, setModalEditar] = useState({ isOpen: false, diarrea: null });
    const [formEditar, setFormEditar] = useState({ severidad: '', fecha_diarrea_ternero: '', observaciones: '' });
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarDiarreas = useCallback(async (search = '', severidad = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}&`;
            q += 'page=1&limit=500';
            if (severidad) q += `&severidad=${encodeURIComponent(severidad)}`;
            const res = await obtenerDiarreaTerneroHook(q);
            let lista = res?.data?.data || res?.data || [];
            if (!Array.isArray(lista)) lista = [];
            if (search) {
                const s = search.toLowerCase();
                lista = lista.filter(d =>
                    d.ternero?.nombre?.toLowerCase().includes(s) ||
                    String(d.ternero?.id_ternero || '').includes(s) ||
                    String(d.ternero?.rp_ternero || '').toLowerCase().includes(s)
                );
            }
            setDiarreas(lista);
            setTotal(res?.data?.total ?? lista.length);
        } catch {
            showAlert('Error al cargar episodios', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarDiarreas(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarDiarreas(searchInput, filtroSeveridad);
        setRefreshing(false);
    };

    const abrirEditar = (diarrea) => {
        setFormEditar({
            severidad: diarrea.severidad || 'Leve',
            fecha_diarrea_ternero: diarrea.fecha_diarrea_ternero ? String(diarrea.fecha_diarrea_ternero).split('T')[0] : '',
            observaciones: diarrea.observaciones || '',
        });
        setModalEditar({ isOpen: true, diarrea });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchDiarreaHook(modalEditar.diarrea.id_diarrea_ternero, formEditar);
        if (res?.status === 200) {
            showAlert('Episodio actualizado');
            setModalEditar({ isOpen: false, diarrea: null });
            await cargarDiarreas(searchInput, filtroSeveridad);
        } else {
            showAlert('Error al actualizar', false);
        }
        setSaving(false);
    };

    const renderDiarrea = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🐄 {item.ternero?.nombre || `Ternero #${item.ternero?.id_ternero || '-'}`}</Text>
                <View style={[styles.badge, { backgroundColor: severidadColor(item.severidad) }]}>
                    <Text style={styles.badgeText}>{item.severidad || '-'}</Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>RP:</Text>
                <Text style={styles.cardValue}>{item.ternero?.rp_ternero || '-'}</Text>
                <Text style={styles.cardLabel}>  Episodio:</Text>
                <Text style={styles.cardValue}>#{item.numero_episodio ?? '-'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fecha:</Text>
                <Text style={styles.cardValue}>{formatFecha(item.fecha_diarrea_ternero)}</Text>
            </View>
            {item.observaciones ? <Text style={styles.observaciones} numberOfLines={3}>{item.observaciones}</Text> : null}
            <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                <Text style={styles.btnText}>Editar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🥼 Diarrea</Text>
                <Text style={styles.headerSub}>{total} episodios</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.searchRow}>
                <TextInput style={styles.searchInput} placeholder="Buscar por ternero, RP..." value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => cargarDiarreas(searchInput, filtroSeveridad)} returnKeyType="search" />
                <TouchableOpacity style={styles.searchBtn} onPress={() => cargarDiarreas(searchInput, filtroSeveridad)}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
                {SEVERIDADES.map(s => (
                    <TouchableOpacity key={s || 'todas'} style={[styles.filtroBtn, filtroSeveridad === s && styles.filtroBtnActive]} onPress={() => { setFiltroSeveridad(s); cargarDiarreas(searchInput, s); }}>
                        <Text style={[styles.filtroBtnText, filtroSeveridad === s && styles.filtroBtnTextActive]}>{s || 'Todas'}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={diarreas}
                    keyExtractor={item => String(item.id_diarrea_ternero)}
                    renderItem={renderDiarrea}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin episodios de diarrea</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DiarreaForm')}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Editar episodio</Text>

                        <Text style={styles.label}>Severidad</Text>
                        <View style={styles.optionRow}>
                            {['Leve', 'Moderada', 'Severa', 'Crítica'].map(s => (
                                <TouchableOpacity key={s} style={[styles.optionBtn, formEditar.severidad === s && styles.optionBtnActive]} onPress={() => setFormEditar(f => ({ ...f, severidad: s }))}>
                                    <Text style={[styles.optionBtnText, formEditar.severidad === s && styles.optionBtnTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Fecha</Text>
                        <TextInput style={styles.input} value={formEditar.fecha_diarrea_ternero} onChangeText={v => setFormEditar(f => ({ ...f, fecha_diarrea_ternero: v }))} placeholder="YYYY-MM-DD" />

                        <Text style={styles.label}>Observaciones</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formEditar.observaciones} onChangeText={v => setFormEditar(f => ({ ...f, observaciones: v }))} placeholder="Observaciones" multiline numberOfLines={3} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, diarrea: null })}>
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
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: colors.campoSoft },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    searchRow: { flexDirection: 'row', margin: space.md, gap: space.sm },
    searchInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    searchBtn: { backgroundColor: colors.campo, borderRadius: radius.sm, paddingHorizontal: 14, justifyContent: 'center' },
    searchBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
    filtroRow: { paddingHorizontal: space.md, marginBottom: 8, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: colors.surface },
    filtroBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    filtroBtnText: { fontSize: 13, color: colors.ink },
    filtroBtnTextActive: { color: colors.white, fontWeight: '700' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: space.md, paddingBottom: 20 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 40, fontSize: 15 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    cardRow: { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
    cardLabel: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
    cardValue: { fontSize: 12, color: colors.ink, marginLeft: 4 },
    observaciones: { fontSize: 11, color: colors.inkFaint, marginTop: 4, fontStyle: 'italic' },
    btnEditar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 8, alignItems: 'center', marginTop: 10 },
    btnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
    optionBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    optionBtnText: { fontSize: 13, color: colors.ink },
    optionBtnTextActive: { color: colors.white, fontWeight: '700' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: colors.ink, fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '700' },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.campo, borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
