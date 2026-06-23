import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';

export default function AdminScreen() {
    const { userPayload } = useSelector(state => state.auth);
    const {
        obtenerEstablecimientosHook, crearEstablecimientoHook, actualizarEstablecimientoHook,
        eliminarEstablecimientoHook, toggleEstadoEstablecimientoHook, asignarEstablecimientoUsuarioHook,
    } = useBussinesMicroservicio();

    const [establecimientos, setEstablecimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modal, setModal] = useState({ open: false, mode: 'crear', est: null });
    const [formData, setFormData] = useState({ nombre: '', ubicacion: '', telefono: '', responsable: '', notas: '' });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        try {
            const res = await obtenerEstablecimientosHook();
            setEstablecimientos(Array.isArray(res?.data) ? res.data : (res?.data?.data || []));
        } catch {
            showAlert('Error al cargar establecimientos', false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { setLoading(true); cargar(); }, []);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const abrirCrear = () => {
        setFormData({ nombre: '', ubicacion: '', telefono: '', responsable: '', notas: '' });
        setModal({ open: true, mode: 'crear', est: null });
    };

    const abrirEditar = (est) => {
        setFormData({
            nombre: est.nombre || '', ubicacion: est.ubicacion || '', telefono: est.telefono || '',
            responsable: est.responsable || '', notas: est.notas || '',
        });
        setModal({ open: true, mode: 'editar', est });
    };

    const guardar = async () => {
        if (!formData.nombre.trim()) { showAlert('Ingresá un nombre', false); return; }
        setSaving(true);
        const payload = { ...formData, estado: 'activo' };
        let res;
        if (modal.mode === 'crear') {
            res = await crearEstablecimientoHook(payload);
            const nuevoId = res?.data?.id_establecimiento;
            const uid = userPayload?.id || userPayload?.sub || userPayload?.userId;
            if (nuevoId && userPayload?.rol === 'admin' && uid) {
                await asignarEstablecimientoUsuarioHook(uid, nuevoId);
            }
        } else {
            res = await actualizarEstablecimientoHook(modal.est.id_establecimiento, payload);
        }
        if (res?.status === 200 || res?.status === 201) {
            showAlert(modal.mode === 'crear' ? 'Establecimiento creado' : 'Establecimiento actualizado');
            setModal({ open: false, mode: 'crear', est: null });
            await cargar();
        } else {
            showAlert('Error al guardar', false);
        }
        setSaving(false);
    };

    const toggleEstado = async (est) => {
        const res = await toggleEstadoEstablecimientoHook(est.id_establecimiento);
        if (res?.status === 200 || res?.status === 201) await cargar();
        else showAlert('Error al cambiar estado', false);
    };

    const eliminar = (est) => {
        Alert.alert('Eliminar establecimiento', `¿Eliminar "${est.nombre}"? Esta acción no se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    const res = await eliminarEstablecimientoHook(est.id_establecimiento);
                    if (res?.status === 200 || res?.status === 201) { showAlert('Establecimiento eliminado'); await cargar(); }
                    else showAlert('No se pudo eliminar', false);
                }
            },
        ]);
    };

    const renderEst = ({ item }) => {
        const activo = item.estado === 'activo';
        return (
            <View style={[styles.card, !activo && styles.cardInactivo]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <View style={[styles.badge, { backgroundColor: activo ? '#22c55e' : '#9ca3af' }]}>
                        <Text style={styles.badgeText}>{activo ? 'Activo' : 'Inactivo'}</Text>
                    </View>
                </View>
                {item.ubicacion ? <Text style={styles.row}>📍 {item.ubicacion}</Text> : null}
                {item.responsable ? <Text style={styles.row}>👤 {item.responsable}</Text> : null}
                {item.telefono ? <Text style={styles.row}>📞 {item.telefono}</Text> : null}
                {item.notas ? <Text style={styles.notas} numberOfLines={2}>{item.notas}</Text> : null}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
                        <Text style={styles.btnAccionText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, activo ? styles.btnWarn : styles.btnSuccess]} onPress={() => toggleEstado(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>{activo ? 'Desactivar' : 'Activar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, styles.btnDanger]} onPress={() => eliminar(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (userPayload?.rol !== 'admin') {
        return (
            <View style={styles.container}>
                <View style={styles.header}><Text style={styles.headerTitle}>🛠️ Administración</Text></View>
                <Text style={styles.empty}>Solo disponible para administradores.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🛠️ Establecimientos</Text>
                <Text style={styles.headerSub}>{establecimientos.length} en total</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color="#1d4ed8" style={styles.loader} /> : (
                <FlatList
                    data={establecimientos}
                    keyExtractor={item => String(item.id_establecimiento)}
                    renderItem={renderEst}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin establecimientos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={abrirCrear}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            <Modal visible={modal.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{modal.mode === 'crear' ? 'Nuevo establecimiento' : 'Editar establecimiento'}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={formData.nombre} onChangeText={v => setFormData(f => ({ ...f, nombre: v }))} placeholder="Nombre" />

                        <Text style={styles.label}>Ubicación</Text>
                        <TextInput style={styles.input} value={formData.ubicacion} onChangeText={v => setFormData(f => ({ ...f, ubicacion: v }))} placeholder="Ubicación" />

                        <Text style={styles.label}>Responsable</Text>
                        <TextInput style={styles.input} value={formData.responsable} onChangeText={v => setFormData(f => ({ ...f, responsable: v }))} placeholder="Responsable" />

                        <Text style={styles.label}>Teléfono</Text>
                        <TextInput style={styles.input} value={formData.telefono} onChangeText={v => setFormData(f => ({ ...f, telefono: v }))} placeholder="Teléfono" keyboardType="phone-pad" />

                        <Text style={styles.label}>Notas</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formData.notas} onChangeText={v => setFormData(f => ({ ...f, notas: v }))} placeholder="Notas" multiline numberOfLines={2} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal({ open: false, mode: 'crear', est: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={saving}>
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
    header: { backgroundColor: '#1d4ed8', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#bfdbfe' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardInactivo: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1 },
    badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    row: { fontSize: 13, color: '#374151', marginBottom: 3 },
    notas: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
    btnAccion: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' },
    btnAccionText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    btnWarn: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    btnSuccess: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    btnDanger: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1d4ed8', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '88%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 56, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: '#374151', fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: '#fff', fontWeight: '700' },
});
