import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';

const ROL_COLOR = {
    dueno: '#a855f7',
    veterinario: '#22c55e',
    operario: '#3b82f6',
};

const rolColor = (r) => ROL_COLOR[r] || '#9ca3af';

export default function EquipoScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        obtenerEquipoHook, obtenerInvitacionesPendientesHook,
        crearInvitacionHook, revocarInvitacionHook, eliminarMiembroHook,
    } = useBussinesMicroservicio();

    const idEst = userPayload?.id_establecimiento || establecimientoActual;

    const [tab, setTab] = useState('equipo');
    const [miembros, setMiembros] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const [modalOpen, setModalOpen] = useState(false);
    const [invEmail, setInvEmail] = useState('');
    const [invRol, setInvRol] = useState('operario');
    const [invLoading, setInvLoading] = useState(false);
    const [invResult, setInvResult] = useState(null);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        if (!idEst) { setLoading(false); return; }
        try {
            const [resEq, resPend] = await Promise.all([
                obtenerEquipoHook(idEst),
                obtenerInvitacionesPendientesHook(idEst),
            ]);
            setMiembros(Array.isArray(resEq?.data) ? resEq.data : (resEq?.data?.data || []));
            setPendientes(Array.isArray(resPend?.data) ? resPend.data : (resPend?.data?.data || []));
        } catch {
            showAlert('Error al cargar el equipo', false);
        } finally {
            setLoading(false);
        }
    }, [idEst]);

    useEffect(() => { setLoading(true); cargar(); }, [idEst]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const abrirInvitar = () => {
        setInvEmail(''); setInvRol('operario'); setInvResult(null); setModalOpen(true);
    };

    const generarInvitacion = async () => {
        setInvLoading(true);
        const payload = invEmail.trim() ? { email: invEmail.trim(), rol: invRol } : { rol: invRol };
        const res = await crearInvitacionHook(idEst, payload);
        if (res?.status === 200 || res?.status === 201) {
            setInvResult(res.data || {});
            await cargar();
        } else {
            showAlert('Error al generar la invitación', false);
        }
        setInvLoading(false);
    };

    const revocar = (inv) => {
        Alert.alert('Revocar invitación', `¿Revocar la invitación de ${inv.email || 'este usuario'}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Revocar', style: 'destructive', onPress: async () => {
                    const res = await revocarInvitacionHook(inv.id);
                    if (res?.status === 200 || res?.status === 201) {
                        setPendientes(prev => prev.filter(i => i.id !== inv.id));
                        showAlert('Invitación revocada');
                    } else showAlert('No se pudo revocar', false);
                }
            },
        ]);
    };

    const eliminarMiembro = (m) => {
        Alert.alert('Quitar del equipo', `¿Quitar a ${m.nombre || m.email} del equipo?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Quitar', style: 'destructive', onPress: async () => {
                    const res = await eliminarMiembroHook(idEst, m.userId);
                    if (res?.status === 200 || res?.status === 201) {
                        setMiembros(prev => prev.filter(x => x.userId !== m.userId));
                        showAlert('Miembro quitado');
                    } else showAlert('No se pudo quitar', false);
                }
            },
        ]);
    };

    const renderMiembro = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nombre || 'Sin nombre'}</Text>
                <View style={[styles.badge, { backgroundColor: rolColor(item.rol) }]}>
                    <Text style={styles.badgeText}>{(item.rol || '-').toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.email}>{item.email}</Text>
            {item.rol !== 'dueno' && (
                <TouchableOpacity style={styles.btnQuitar} onPress={() => eliminarMiembro(item)}>
                    <Text style={styles.btnQuitarText}>Quitar del equipo</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderPendiente = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.email || 'Sin email'}</Text>
                <View style={[styles.badge, { backgroundColor: rolColor(item.rol) }]}>
                    <Text style={styles.badgeText}>{(item.rol || '-').toUpperCase()}</Text>
                </View>
            </View>
            {item.expiracion ? <Text style={styles.email}>Expira: {String(item.expiracion).split('T')[0]}</Text> : null}
            <TouchableOpacity style={styles.btnQuitar} onPress={() => revocar(item)}>
                <Text style={styles.btnQuitarText}>Revocar invitación</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>👥 Equipo</Text>
                <Text style={styles.headerSub}>Miembros e invitaciones</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {!idEst ? (
                <Text style={styles.empty}>No hay establecimiento seleccionado</Text>
            ) : (
                <>
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, tab === 'equipo' && styles.tabActive]} onPress={() => setTab('equipo')}>
                            <Text style={[styles.tabText, tab === 'equipo' && styles.tabTextActive]}>Equipo ({miembros.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, tab === 'pendientes' && styles.tabActive]} onPress={() => setTab('pendientes')}>
                            <Text style={[styles.tabText, tab === 'pendientes' && styles.tabTextActive]}>Pendientes ({pendientes.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? <ActivityIndicator size="large" color="#7c3aed" style={styles.loader} /> : (
                        <FlatList
                            data={tab === 'equipo' ? miembros : pendientes}
                            keyExtractor={(item) => String(tab === 'equipo' ? item.userId : item.id)}
                            renderItem={tab === 'equipo' ? renderMiembro : renderPendiente}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            ListEmptyComponent={<Text style={styles.empty}>{tab === 'equipo' ? 'Sin miembros' : 'Sin invitaciones pendientes'}</Text>}
                            contentContainerStyle={styles.list}
                        />
                    )}

                    <TouchableOpacity style={styles.fab} onPress={abrirInvitar}>
                        <Text style={styles.fabText}>+ Invitar</Text>
                    </TouchableOpacity>
                </>
            )}

            <Modal visible={modalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Invitar al equipo</Text>

                        {invResult ? (
                            <View>
                                <Text style={styles.resultLabel}>
                                    {invResult.emailEnviado ? '✅ Email enviado' : '✅ Invitación generada'}
                                </Text>
                                <Text style={styles.label}>Link de invitación (mantené presionado para copiar)</Text>
                                <TextInput
                                    style={[styles.input, styles.linkInput]}
                                    value={invResult.link || invResult.token || ''}
                                    multiline
                                    editable={false}
                                    selectTextOnFocus
                                />
                                <TouchableOpacity style={styles.btnGuardar} onPress={() => setModalOpen(false)}>
                                    <Text style={styles.btnGuardarText}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.label}>Email (opcional — envía email directo)</Text>
                                <TextInput style={styles.input} value={invEmail} onChangeText={setInvEmail} placeholder="email@ejemplo.com" autoCapitalize="none" keyboardType="email-address" />

                                <Text style={styles.label}>Rol</Text>
                                <View style={styles.optionRow}>
                                    {['operario', 'veterinario'].map(r => (
                                        <TouchableOpacity key={r} style={[styles.optionBtn, invRol === r && { backgroundColor: rolColor(r), borderColor: rolColor(r) }]} onPress={() => setInvRol(r)}>
                                            <Text style={[styles.optionBtnText, invRol === r && { color: '#fff', fontWeight: '700' }]}>{r === 'operario' ? '👷 Operario' : '🩺 Veterinario'}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalOpen(false)}>
                                        <Text style={styles.btnCancelarText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnGuardar} onPress={generarInvitacion} disabled={invLoading}>
                                        {invLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Generar</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#7c3aed', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#ddd6fe' },
    alert: { margin: 12, borderRadius: 8, padding: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
    tabs: { flexDirection: 'row', margin: 12, gap: 8 },
    tab: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
    tabActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    tabText: { fontSize: 13, color: '#374151', fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1 },
    badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    email: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
    btnQuitar: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 8 },
    btnQuitarText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#7c3aed', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    linkInput: { height: 80, textAlignVertical: 'top', backgroundColor: '#f9fafb', color: '#7c3aed' },
    resultLabel: { fontSize: 15, fontWeight: '700', color: '#16a34a', marginBottom: 8 },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    optionBtnText: { fontSize: 13, color: '#374151' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: '#374151', fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
    btnGuardarText: { color: '#fff', fontWeight: '700' },
});
