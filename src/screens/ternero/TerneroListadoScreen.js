import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = ['', 'Vivo', 'Muerto', 'Vendido'];

const estadoColor = (estado) => {
    if (estado === 'Vivo') return '#22c55e';
    if (estado === 'Muerto') return '#ef4444';
    if (estado === 'Vendido') return '#f59e0b';
    return '#9ca3af';
};

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
        return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
        return fecha;
    }
};

export default function TerneroListadoScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerTerneroHook, patchTerneroHook, agregarPesoDiarioHook } = useBussinesMicroservicio();

    const [terneros, setTerneros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const [modalEditar, setModalEditar] = useState({ isOpen: false, ternero: null });
    const [modalPeso, setModalPeso] = useState({ isOpen: false, ternero: null });
    const [formEditar, setFormEditar] = useState({ estado: '', sexo: '', semen: '', observaciones: '' });
    const [pesoDiario, setPesoDiario] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarTerneros = useCallback(async (search = '', estado = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) {
                q = `id_establecimiento=${establecimientoActual}&`;
            }
            q += 'page=1&limit=500';
            if (search) q += `&search=${encodeURIComponent(search)}`;
            if (estado) q += `&estado=${encodeURIComponent(estado)}`;

            const res = await obtenerTerneroHook(q);
            setTerneros(res?.data?.data || []);
            setTotal(res?.data?.total || 0);
        } catch {
            showAlert('Error al cargar terneros', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarTerneros(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarTerneros(searchInput, filtroEstado);
        setRefreshing(false);
    };

    const handleBuscar = () => cargarTerneros(searchInput, filtroEstado);

    const handleEstado = (estado) => {
        setFiltroEstado(estado);
        cargarTerneros(searchInput, estado);
    };

    const abrirEditar = (ternero) => {
        setFormEditar({
            estado: ternero.estado || 'Vivo',
            sexo: ternero.sexo || 'Macho',
            semen: ternero.semen || '',
            observaciones: ternero.observaciones || '',
        });
        setModalEditar({ isOpen: true, ternero });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchTerneroHook(modalEditar.ternero.id_ternero, formEditar);
        if (res?.status === 200) {
            showAlert('Ternero actualizado');
            setModalEditar({ isOpen: false, ternero: null });
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al actualizar', false);
        }
        setSaving(false);
    };

    const guardarPeso = async () => {
        if (!pesoDiario) return;
        setSaving(true);
        const res = await agregarPesoDiarioHook(modalPeso.ternero.id_ternero, { peso_actual: parseFloat(pesoDiario) });
        if (res?.status === 201 || res?.status === 200) {
            showAlert('Peso registrado');
            setModalPeso({ isOpen: false, ternero: null });
            setPesoDiario('');
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al registrar peso', false);
        }
        setSaving(false);
    };

    const renderTernero = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>#{item.id_ternero} — {item.nombre || 'Sin nombre'}</Text>
                <View style={[styles.badge, { backgroundColor: estadoColor(item.estado) }]}>
                    <Text style={styles.badgeText}>{item.estado || '-'}</Text>
                </View>
            </View>

            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Sexo:</Text>
                <Text style={styles.cardValue}>{item.sexo || '-'}</Text>
                <Text style={styles.cardLabel}>  Raza:</Text>
                <Text style={styles.cardValue}>{item.raza || '-'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Nacimiento:</Text>
                <Text style={styles.cardValue}>{formatFecha(item.fecha_nacimiento)}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Peso actual:</Text>
                <Text style={styles.cardValue}>{item.peso_actual ? `${item.peso_actual} kg` : '-'}</Text>
                <Text style={styles.cardLabel}>  Semen:</Text>
                <Text style={styles.cardValue}>{item.semen || 'N/A'}</Text>
            </View>
            {item.observaciones ? (
                <Text style={styles.observaciones} numberOfLines={2}>{item.observaciones}</Text>
            ) : null}

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.btnPeso} onPress={() => { setPesoDiario(''); setModalPeso({ isOpen: true, ternero: item }); }}>
                    <Text style={styles.btnText}>+ Peso</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                    <Text style={styles.btnText}>Editar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🐄 Terneros</Text>
                <Text style={styles.headerSub}>{total} registros</Text>
            </View>

            {/* Alerta */}
            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {/* Búsqueda */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre, ID..."
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={handleBuscar}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleBuscar}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            {/* Filtro estado */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
                {ESTADOS.map(e => (
                    <TouchableOpacity
                        key={e || 'todos'}
                        style={[styles.filtroBtn, filtroEstado === e && styles.filtroBtnActive]}
                        onPress={() => handleEstado(e)}
                    >
                        <Text style={[styles.filtroBtnText, filtroEstado === e && styles.filtroBtnTextActive]}>
                            {e || 'Todos'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Lista */}
            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
            ) : (
                <FlatList
                    data={terneros}
                    keyExtractor={item => String(item.id_ternero)}
                    renderItem={renderTernero}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin terneros</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Modal Editar */}
            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Editar ternero #{modalEditar.ternero?.id_ternero}</Text>

                        <Text style={styles.label}>Estado</Text>
                        <View style={styles.optionRow}>
                            {['Vivo', 'Muerto', 'Vendido'].map(e => (
                                <TouchableOpacity
                                    key={e}
                                    style={[styles.optionBtn, formEditar.estado === e && styles.optionBtnActive]}
                                    onPress={() => setFormEditar(f => ({ ...f, estado: e }))}
                                >
                                    <Text style={[styles.optionBtnText, formEditar.estado === e && styles.optionBtnTextActive]}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Sexo</Text>
                        <View style={styles.optionRow}>
                            {['Macho', 'Hembra'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.optionBtn, formEditar.sexo === s && styles.optionBtnActive]}
                                    onPress={() => setFormEditar(f => ({ ...f, sexo: s }))}
                                >
                                    <Text style={[styles.optionBtnText, formEditar.sexo === s && styles.optionBtnTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Semen</Text>
                        <TextInput
                            style={styles.input}
                            value={formEditar.semen}
                            onChangeText={v => setFormEditar(f => ({ ...f, semen: v }))}
                            placeholder="Semen"
                        />

                        <Text style={styles.label}>Observaciones</Text>
                        <TextInput
                            style={[styles.input, styles.inputMulti]}
                            value={formEditar.observaciones}
                            onChangeText={v => setFormEditar(f => ({ ...f, observaciones: v }))}
                            placeholder="Observaciones"
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, ternero: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicion} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Peso */}
            <Modal visible={modalPeso.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Peso diario — #{modalPeso.ternero?.id_ternero}</Text>
                        <Text style={styles.label}>Peso actual (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={pesoDiario}
                            onChangeText={setPesoDiario}
                            placeholder="Ej: 45.5"
                            keyboardType="decimal-pad"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalPeso({ isOpen: false, ternero: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarPeso} disabled={saving}>
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
    header: { backgroundColor: '#6366f1', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#c7d2fe' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
    searchRow: { flexDirection: 'row', margin: 12, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    searchBtn: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    filtroRow: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
    filtroBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
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
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    btnPeso: { flex: 1, backgroundColor: '#10b981', borderRadius: 8, padding: 8, alignItems: 'center' },
    btnEditar: { flex: 1, backgroundColor: '#6366f1', borderRadius: 8, padding: 8, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    optionBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    optionBtnText: { fontSize: 13, color: '#374151' },
    optionBtnTextActive: { color: '#fff', fontWeight: '700' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: '#374151', fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: '#6366f1', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: '#fff', fontWeight: '700' },
});
