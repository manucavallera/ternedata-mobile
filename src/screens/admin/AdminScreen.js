import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, Alert, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const ROLES = [['operario', '👷 Operario'], ['veterinario', '🩺 Veterinario'], ['admin', '👑 Administrador']];

const ROL_COLOR = {
    admin: colors.campoDark,
    veterinario: '#2C5282',
    operario: colors.campo,
};

export default function AdminScreen() {
    const { userPayload } = useSelector(state => state.auth);
    const {
        obtenerEstablecimientosHook, crearEstablecimientoHook, actualizarEstablecimientoHook,
        eliminarEstablecimientoHook, toggleEstadoEstablecimientoHook, asignarEstablecimientoUsuarioHook,
        obtenerUsuariosHook, obtenerEstadisticasUsuariosHook, crearUsuarioHook,
        actualizarUsuarioHook, eliminarUsuarioHook, toggleEstadoUsuarioHook,
        obtenerEstablecimientosUsuarioHook, sincronizarEstablecimientosUsuarioHook,
    } = useBussinesMicroservicio();

    const [tab, setTab] = useState('establecimientos'); // 'establecimientos' | 'usuarios'
    const [establecimientos, setEstablecimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modal, setModal] = useState({ open: false, mode: 'crear', est: null });
    const [formData, setFormData] = useState({ nombre: '', ubicacion: '', telefono: '', responsable: '', notas: '' });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    // Usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [statsUsuarios, setStatsUsuarios] = useState(null);
    const [modalUsuario, setModalUsuario] = useState({ open: false, mode: 'crear', user: null });
    const [formUsuario, setFormUsuario] = useState({
        name: '', email: '', password: '', rol: 'operario', telefono: '', estado: 'activo', id_establecimiento: '',
    });
    const [estAsignados, setEstAsignados] = useState([]);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        try {
            const [resEst, resUsers, resStats] = await Promise.all([
                obtenerEstablecimientosHook(),
                obtenerUsuariosHook(),
                obtenerEstadisticasUsuariosHook(),
            ]);
            setEstablecimientos(Array.isArray(resEst?.data) ? resEst.data : (resEst?.data?.data || []));
            setUsuarios(Array.isArray(resUsers?.data) ? resUsers.data : (resUsers?.data?.data || []));
            if (resStats?.status === 200) setStatsUsuarios(resStats.data);
        } catch {
            showAlert('Error al cargar los datos', false);
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

    // ===== USUARIOS =====
    const abrirCrearUsuario = () => {
        setFormUsuario({
            name: '', email: '', password: '', rol: 'operario', telefono: '', estado: 'activo',
            id_establecimiento: userPayload?.id_establecimiento ? String(userPayload.id_establecimiento) : '',
        });
        setEstAsignados([]);
        setModalUsuario({ open: true, mode: 'crear', user: null });
    };

    const abrirEditarUsuario = async (user) => {
        setFormUsuario({
            name: user.name || '', email: user.email || '', password: '',
            rol: user.rol || 'operario', telefono: user.telefono || '',
            estado: user.estado || 'activo',
            id_establecimiento: user.id_establecimiento ? String(user.id_establecimiento) : '',
        });
        // Los establecimientos asignados no vienen en el listado: se piden aparte.
        if (user.rol === 'admin') {
            const res = await obtenerEstablecimientosUsuarioHook(user.id);
            setEstAsignados(Array.isArray(res?.data) ? res.data : []);
        } else {
            setEstAsignados([]);
        }
        setModalUsuario({ open: true, mode: 'editar', user });
    };

    const toggleEstAsignado = (id) => setEstAsignados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const guardarUsuario = async () => {
        if (!formUsuario.name.trim() || !formUsuario.email.trim()) { showAlert('Nombre y email son obligatorios', false); return; }
        if (modalUsuario.mode === 'crear' && !formUsuario.password) { showAlert('La contraseña es obligatoria', false); return; }

        setSaving(true);
        const payload = {
            ...formUsuario,
            id_establecimiento: formUsuario.id_establecimiento ? parseInt(formUsuario.id_establecimiento) : null,
        };

        let res;
        let userId;
        if (modalUsuario.mode === 'crear') {
            res = await crearUsuarioHook(payload);
            userId = res?.data?.id;
        } else {
            // Sin password en el body = no se cambia la contraseña actual.
            if (!payload.password) delete payload.password;
            userId = modalUsuario.user.id;
            res = await actualizarUsuarioHook(userId, payload);
        }

        if (res?.status === 200 || res?.status === 201) {
            if (payload.rol === 'admin' && userId) {
                await sincronizarEstablecimientosUsuarioHook(userId, estAsignados);
            }
            showAlert(modalUsuario.mode === 'crear' ? 'Usuario creado' : 'Usuario actualizado');
            setModalUsuario({ open: false, mode: 'crear', user: null });
            await cargar();
        } else {
            showAlert(res?.data?.message || 'Error al guardar el usuario', false);
        }
        setSaving(false);
    };

    const toggleEstadoUsuario = async (user) => {
        const res = await toggleEstadoUsuarioHook(user.id);
        if (res?.status === 200 || res?.status === 201) await cargar();
        else showAlert('Error al cambiar el estado', false);
    };

    const eliminarUsuario = (user) => {
        Alert.alert('Eliminar usuario', `¿Eliminar a ${user.name || user.email}? No se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    const res = await eliminarUsuarioHook(user.id);
                    if (res?.status === 200 || res?.status === 201) { showAlert('Usuario eliminado'); await cargar(); }
                    else showAlert('No se pudo eliminar', false);
                }
            },
        ]);
    };

    const renderUsuario = ({ item }) => {
        const activo = item.estado === 'activo';
        const est = establecimientos.find(e => e.id_establecimiento === item.id_establecimiento);
        return (
            <View style={[styles.card, !activo && styles.cardInactivo]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name || 'Sin nombre'}</Text>
                    <View style={[styles.badge, { backgroundColor: ROL_COLOR[item.rol] || colors.neutro }]}>
                        <Text style={styles.badgeText}>{item.rol}</Text>
                    </View>
                </View>
                <Text style={styles.row}>✉️ {item.email}</Text>
                {item.telefono ? <Text style={styles.row}>📞 {item.telefono}</Text> : null}
                <Text style={styles.row}>🏠 {est?.nombre || (item.id_establecimiento ? `#${item.id_establecimiento}` : 'Sin asignar')}</Text>
                <Text style={[styles.row, { color: activo ? colors.vivo : colors.muerto, fontWeight: '700' }]}>
                    {activo ? '✅ Activo' : '❌ Inactivo'}
                </Text>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditarUsuario(item)}>
                        <Text style={styles.btnAccionText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, activo ? styles.btnWarn : styles.btnSuccess]} onPress={() => toggleEstadoUsuario(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>{activo ? 'Desactivar' : 'Activar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, styles.btnDanger]} onPress={() => eliminarUsuario(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEst = ({ item }) => {
        const activo = item.estado === 'activo';
        return (
            <View style={[styles.card, !activo && styles.cardInactivo]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <View style={[styles.badge, { backgroundColor: activo ? colors.vivo : colors.neutro }]}>
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
                <View style={styles.header}><Text style={styles.headerTitle}>🛠️ Admin</Text></View>
                <Text style={styles.empty}>Solo disponible para administradores.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🛠️ Administración</Text>
                <Text style={styles.headerSub}>
                    {tab === 'establecimientos' ? `${establecimientos.length} establecimientos` : `${usuarios.length} usuarios`}
                </Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, tab === 'establecimientos' && styles.tabActive]} onPress={() => setTab('establecimientos')}>
                    <Text style={[styles.tabText, tab === 'establecimientos' && styles.tabTextActive]}>🏠 Establecimientos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'usuarios' && styles.tabActive]} onPress={() => setTab('usuarios')}>
                    <Text style={[styles.tabText, tab === 'usuarios' && styles.tabTextActive]}>👥 Usuarios</Text>
                </TouchableOpacity>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : tab === 'establecimientos' ? (
                <FlatList
                    data={establecimientos}
                    keyExtractor={item => String(item.id_establecimiento)}
                    renderItem={renderEst}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin establecimientos</Text>}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <FlatList
                    data={usuarios}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderUsuario}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin usuarios</Text>}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={statsUsuarios ? (
                        <View style={styles.statsRow}>
                            <View style={styles.statTile}>
                                <Text style={styles.statValor}>{statsUsuarios.total ?? 0}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statTile}>
                                <Text style={[styles.statValor, { color: colors.vivo }]}>{statsUsuarios.activos ?? 0}</Text>
                                <Text style={styles.statLabel}>Activos</Text>
                            </View>
                            {(statsUsuarios.por_rol || []).map((r, i) => (
                                <View key={i} style={styles.statTile}>
                                    <Text style={styles.statValor}>{r.cantidad ?? r.count ?? 0}</Text>
                                    <Text style={styles.statLabel}>{r.rol}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={tab === 'establecimientos' ? abrirCrear : abrirCrearUsuario}>
                <Text style={styles.fabText}>{tab === 'establecimientos' ? '+ Nuevo' : '+ Usuario'}</Text>
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

            {/* Modal usuario */}
            <Modal visible={modalUsuario.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.modalTitle}>{modalUsuario.mode === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}</Text>

                            <Text style={styles.label}>Nombre *</Text>
                            <TextInput style={styles.input} value={formUsuario.name} onChangeText={v => setFormUsuario(f => ({ ...f, name: v }))} placeholder="Nombre y apellido" />

                            <Text style={styles.label}>Email *</Text>
                            <TextInput style={styles.input} value={formUsuario.email} onChangeText={v => setFormUsuario(f => ({ ...f, email: v }))} placeholder="mail@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />

                            <Text style={styles.label}>{modalUsuario.mode === 'crear' ? 'Contraseña *' : 'Contraseña (dejar vacío para no cambiarla)'}</Text>
                            <TextInput style={styles.input} value={formUsuario.password} onChangeText={v => setFormUsuario(f => ({ ...f, password: v }))} placeholder="••••••••" secureTextEntry />

                            <Text style={styles.label}>Teléfono</Text>
                            <TextInput style={styles.input} value={formUsuario.telefono} onChangeText={v => setFormUsuario(f => ({ ...f, telefono: v }))} placeholder="Teléfono" keyboardType="phone-pad" />

                            <Text style={styles.label}>Rol</Text>
                            <View style={styles.chipsWrap}>
                                {ROLES.map(([val, lbl]) => (
                                    <TouchableOpacity key={val} style={[styles.chipSel, formUsuario.rol === val && styles.chipSelActive]} onPress={() => setFormUsuario(f => ({ ...f, rol: val }))}>
                                        <Text style={[styles.chipSelText, formUsuario.rol === val && styles.chipSelTextActive]}>{lbl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Estado</Text>
                            <View style={styles.chipsWrap}>
                                {[['activo', '✅ Activo'], ['inactivo', '❌ Inactivo']].map(([val, lbl]) => (
                                    <TouchableOpacity key={val} style={[styles.chipSel, formUsuario.estado === val && styles.chipSelActive]} onPress={() => setFormUsuario(f => ({ ...f, estado: val }))}>
                                        <Text style={[styles.chipSelText, formUsuario.estado === val && styles.chipSelTextActive]}>{lbl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Establecimiento principal</Text>
                            <View style={styles.chipsWrap}>
                                <TouchableOpacity style={[styles.chipSel, !formUsuario.id_establecimiento && styles.chipSelActive]} onPress={() => setFormUsuario(f => ({ ...f, id_establecimiento: '' }))}>
                                    <Text style={[styles.chipSelText, !formUsuario.id_establecimiento && styles.chipSelTextActive]}>Sin asignar</Text>
                                </TouchableOpacity>
                                {establecimientos.map(e => {
                                    const sel = String(formUsuario.id_establecimiento) === String(e.id_establecimiento);
                                    return (
                                        <TouchableOpacity key={e.id_establecimiento} style={[styles.chipSel, sel && styles.chipSelActive]} onPress={() => setFormUsuario(f => ({ ...f, id_establecimiento: String(e.id_establecimiento) }))}>
                                            <Text style={[styles.chipSelText, sel && styles.chipSelTextActive]}>{e.nombre}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {formUsuario.rol === 'admin' && (
                                <>
                                    <Text style={styles.label}>Campos que puede administrar</Text>
                                    <View style={styles.chipsWrap}>
                                        {establecimientos.map(e => {
                                            const sel = estAsignados.includes(e.id_establecimiento);
                                            return (
                                                <TouchableOpacity key={e.id_establecimiento} style={[styles.chipSel, sel && styles.chipSelActive]} onPress={() => toggleEstAsignado(e.id_establecimiento)}>
                                                    <Text style={[styles.chipSelText, sel && styles.chipSelTextActive]}>{sel ? '☑ ' : '☐ '}{e.nombre}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalUsuario({ open: false, mode: 'crear', user: null })}>
                                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnGuardar} onPress={guardarUsuario} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
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
    loader: { marginTop: 40 },
    list: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 40, fontSize: 15 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
    cardInactivo: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    row: { fontSize: 13, color: colors.inkSoft, marginBottom: 3 },
    notas: { fontSize: 12, color: colors.inkFaint, marginTop: 4, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
    btnAccion: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
    btnAccionText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    btnWarn: { backgroundColor: colors.vendido, borderColor: colors.vendido },
    btnSuccess: { backgroundColor: colors.vivo, borderColor: colors.vivo },
    btnDanger: { backgroundColor: colors.muerto, borderColor: colors.muerto },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.campo, borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '88%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4, marginTop: 8 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink },
    inputMulti: { height: 56, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: colors.ink, fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '700' },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: space.md, paddingTop: space.md },
    tab: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.surface },
    tabActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    tabText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
    tabTextActive: { color: colors.white, fontWeight: '800' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    statTile: { flexGrow: 1, minWidth: '30%', backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10, alignItems: 'center', ...shadow.card },
    statValor: { fontSize: 18, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 10, color: colors.inkSoft, marginTop: 2 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    chipSel: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
    chipSelActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    chipSelText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    chipSelTextActive: { color: colors.white, fontWeight: '800' },
});
