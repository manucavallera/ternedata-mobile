import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';

const TIPOS = [
    { value: 'cria', label: '🍼 Cría', color: '#22c55e' },
    { value: 'destete', label: '🐄 Destete', color: '#3b82f6' },
    { value: 'engorde', label: '🥩 Engorde', color: '#f97316' },
    { value: 'reproduccion', label: '💕 Reproducción', color: '#a855f7' },
    { value: 'otro', label: '📋 Otro', color: '#9ca3af' },
];

const tipoInfo = (t) => TIPOS.find(x => x.value === t) || TIPOS[4];

export default function RodeoListadoScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        obtenerRodeosHook, crearRodeoHook, actualizarRodeoHook, toggleEstadoRodeoHook,
    } = useBussinesMicroservicio();

    const [rodeos, setRodeos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modal, setModal] = useState({ open: false, mode: 'crear', rodeo: null });
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', tipo: 'cria' });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const idEst = userPayload?.id_establecimiento || establecimientoActual;

    const cargarRodeos = useCallback(async () => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}`;
            const res = await obtenerRodeosHook(q);
            let lista = res?.data || [];
            if (!Array.isArray(lista)) lista = lista?.data || [];
            setRodeos(lista);
        } catch {
            showAlert('Error al cargar rodeos', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarRodeos(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargarRodeos(); setRefreshing(false); };

    const abrirCrear = () => {
        setFormData({ nombre: '', descripcion: '', tipo: 'cria' });
        setModal({ open: true, mode: 'crear', rodeo: null });
    };

    const abrirEditar = (rodeo) => {
        setFormData({ nombre: rodeo.nombre || '', descripcion: rodeo.descripcion || '', tipo: rodeo.tipo || 'cria' });
        setModal({ open: true, mode: 'editar', rodeo });
    };

    const guardar = async () => {
        if (!formData.nombre.trim()) { showAlert('Ingresá un nombre', false); return; }
        setSaving(true);
        const payload = { ...formData, estado: 'activo' };
        if (idEst) payload.id_establecimiento = parseInt(idEst);
        let res;
        if (modal.mode === 'crear') res = await crearRodeoHook(payload);
        else res = await actualizarRodeoHook(modal.rodeo.id_rodeo, payload);
        if (res?.status === 200 || res?.status === 201) {
            showAlert(modal.mode === 'crear' ? 'Rodeo creado' : 'Rodeo actualizado');
            setModal({ open: false, mode: 'crear', rodeo: null });
            await cargarRodeos();
        } else {
            showAlert('Error al guardar', false);
        }
        setSaving(false);
    };

    const toggleEstado = async (rodeo) => {
        const res = await toggleEstadoRodeoHook(rodeo.id_rodeo);
        if (res?.status === 200 || res?.status === 201) {
            await cargarRodeos();
        } else {
            showAlert('Error al cambiar estado', false);
        }
    };

    const renderRodeo = ({ item }) => {
        const ti = tipoInfo(item.tipo);
        const activo = item.estado === 'activo';
        return (
            <View style={[styles.card, !activo && styles.cardInactivo]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <View style={[styles.badge, { backgroundColor: ti.color }]}>
                        <Text style={styles.badgeText}>{ti.label}</Text>
                    </View>
                </View>
                {item.descripcion ? <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text> : null}
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Terneros:</Text>
                    <Text style={styles.cardValue}>{item.cantidad_terneros ?? 0}</Text>
                    <Text style={styles.cardLabel}>  Estado:</Text>
                    <Text style={[styles.cardValue, { color: activo ? '#16a34a' : '#dc2626', fontWeight: '700' }]}>{activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => navigation.navigate('RodeoAsignar', { rodeo: item })}>
                        <Text style={styles.btnAccionText}>🐄 Animales</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
                        <Text style={styles.btnAccionText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, activo ? styles.btnDanger : styles.btnSuccess]} onPress={() => toggleEstado(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>{activo ? 'Desactivar' : 'Activar'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🌾 Rodeos</Text>
                <Text style={styles.headerSub}>{rodeos.length} rodeos</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color="#15803d" style={styles.loader} /> : (
                <FlatList
                    data={rodeos}
                    keyExtractor={item => String(item.id_rodeo)}
                    renderItem={renderRodeo}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin rodeos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={abrirCrear}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            <Modal visible={modal.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{modal.mode === 'crear' ? 'Nuevo rodeo' : 'Editar rodeo'}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={formData.nombre} onChangeText={v => setFormData(f => ({ ...f, nombre: v }))} placeholder="Nombre del rodeo" />

                        <Text style={styles.label}>Descripción</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formData.descripcion} onChangeText={v => setFormData(f => ({ ...f, descripcion: v }))} placeholder="Descripción" multiline numberOfLines={2} />

                        <Text style={styles.label}>Tipo</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                            {TIPOS.map(t => (
                                <TouchableOpacity key={t.value} style={[styles.tipoBtn, formData.tipo === t.value && { backgroundColor: t.color, borderColor: t.color }]} onPress={() => setFormData(f => ({ ...f, tipo: t.value }))}>
                                    <Text style={[styles.tipoBtnText, formData.tipo === t.value && { color: '#fff', fontWeight: '700' }]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal({ open: false, mode: 'crear', rodeo: null })}>
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
    header: { backgroundColor: '#15803d', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#bbf7d0' },
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
    descripcion: { fontSize: 12, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' },
    cardRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
    cardLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    cardValue: { fontSize: 12, color: '#111827', marginLeft: 4 },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    btnAccion: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' },
    btnAccionText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    btnDanger: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    btnSuccess: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#15803d', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    inputMulti: { height: 60, textAlignVertical: 'top' },
    tipoBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
    tipoBtnText: { fontSize: 13, color: '#374151' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: '#374151', fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: '#15803d', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: '#fff', fontWeight: '700' },
});
