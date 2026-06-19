import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = ['', 'Activa', 'Seca', 'Vendida', 'Muerta'];

const estadoColor = (estado) => {
    if (estado === 'Activa') return '#22c55e';
    if (estado === 'Seca') return '#f59e0b';
    if (estado === 'Vendida') return '#3b82f6';
    if (estado === 'Muerta') return '#ef4444';
    return '#9ca3af';
};

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

export default function MadreListadoScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerMadreHook, patchMadreHook } = useBussinesMicroservicio();

    const [madres, setMadres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [modalEditar, setModalEditar] = useState({ isOpen: false, madre: null });
    const [formEditar, setFormEditar] = useState({ nombre: '', rp_madre: '', estado: '', observaciones: '' });
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarMadres = useCallback(async (search = '', estado = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}&`;
            q += 'page=1&limit=500';
            if (search) q += `&search=${encodeURIComponent(search)}`;
            if (estado) q += `&estado=${encodeURIComponent(estado)}`;
            const res = await obtenerMadreHook(q);
            setMadres(res?.data?.data || []);
            setTotal(res?.data?.total || 0);
        } catch {
            showAlert('Error al cargar madres', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarMadres(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarMadres(searchInput, filtroEstado);
        setRefreshing(false);
    };

    const abrirEditar = (madre) => {
        setFormEditar({ nombre: madre.nombre || '', rp_madre: madre.rp_madre || '', estado: madre.estado || 'Activa', observaciones: madre.observaciones || '' });
        setModalEditar({ isOpen: true, madre });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchMadreHook(modalEditar.madre.id_madre, formEditar);
        if (res?.status === 200) {
            showAlert('Madre actualizada');
            setModalEditar({ isOpen: false, madre: null });
            await cargarMadres(searchInput, filtroEstado);
        } else {
            showAlert('Error al actualizar', false);
        }
        setSaving(false);
    };

    const renderMadre = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>#{item.id_madre} — {item.nombre || 'Sin nombre'}</Text>
                <View style={[styles.badge, { backgroundColor: estadoColor(item.estado) }]}>
                    <Text style={styles.badgeText}>{item.estado || '-'}</Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>RP:</Text>
                <Text style={styles.cardValue}>{item.rp_madre || '-'}</Text>
                <Text style={styles.cardLabel}>  Raza:</Text>
                <Text style={styles.cardValue}>{item.raza || '-'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Nacimiento:</Text>
                <Text style={styles.cardValue}>{formatFecha(item.fecha_nacimiento)}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Partos:</Text>
                <Text style={styles.cardValue}>{item.cantidad_partos ?? '-'}</Text>
                <Text style={styles.cardLabel}>  Terneros vivos:</Text>
                <Text style={styles.cardValue}>{item.terneros_vivos ?? '-'}</Text>
            </View>
            {item.observaciones ? <Text style={styles.observaciones} numberOfLines={2}>{item.observaciones}</Text> : null}
            <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                <Text style={styles.btnText}>Editar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🐮 Madres</Text>
                <Text style={styles.headerSub}>{total} registros</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.searchRow}>
                <TextInput style={styles.searchInput} placeholder="Buscar por nombre, RP..." value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => cargarMadres(searchInput, filtroEstado)} returnKeyType="search" />
                <TouchableOpacity style={styles.searchBtn} onPress={() => cargarMadres(searchInput, filtroEstado)}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
                {ESTADOS.map(e => (
                    <TouchableOpacity key={e || 'todos'} style={[styles.filtroBtn, filtroEstado === e && styles.filtroBtnActive]} onPress={() => { setFiltroEstado(e); cargarMadres(searchInput, e); }}>
                        <Text style={[styles.filtroBtnText, filtroEstado === e && styles.filtroBtnTextActive]}>{e || 'Todas'}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? <ActivityIndicator size="large" color="#6366f1" style={styles.loader} /> : (
                <FlatList
                    data={madres}
                    keyExtractor={item => String(item.id_madre)}
                    renderItem={renderMadre}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin madres</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Editar madre #{modalEditar.madre?.id_madre}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={formEditar.nombre} onChangeText={v => setFormEditar(f => ({ ...f, nombre: v }))} placeholder="Nombre" />

                        <Text style={styles.label}>RP</Text>
                        <TextInput style={styles.input} value={formEditar.rp_madre} onChangeText={v => setFormEditar(f => ({ ...f, rp_madre: v }))} placeholder="RP Madre" />

                        <Text style={styles.label}>Estado</Text>
                        <View style={styles.optionRow}>
                            {['Activa', 'Seca', 'Vendida', 'Muerta'].map(e => (
                                <TouchableOpacity key={e} style={[styles.optionBtn, formEditar.estado === e && styles.optionBtnActive]} onPress={() => setFormEditar(f => ({ ...f, estado: e }))}>
                                    <Text style={[styles.optionBtnText, formEditar.estado === e && styles.optionBtnTextActive]}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Observaciones</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formEditar.observaciones} onChangeText={v => setFormEditar(f => ({ ...f, observaciones: v }))} placeholder="Observaciones" multiline numberOfLines={3} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, madre: null })}>
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
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#10b981', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#a7f3d0' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
    searchRow: { flexDirection: 'row', margin: 12, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    searchBtn: { backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    filtroRow: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
    filtroBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    filtroBtnText: { fontSize: 13, color: '#374151' },
    filtroBtnTextActive: { color: '#fff', fontWeight: '700' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1 },
    badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    cardRow: { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
    cardLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    cardValue: { fontSize: 12, color: '#111827', marginLeft: 4 },
    observaciones: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
    btnEditar: { backgroundColor: '#10b981', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    optionBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    optionBtnText: { fontSize: 13, color: '#374151' },
    optionBtnTextActive: { color: '#fff', fontWeight: '700' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: '#374151', fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: '#10b981', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: '#fff', fontWeight: '700' },
});
