import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, space, radius, shadow, type, estadoColor } from '../../theme';
import Caravana from '../../components/Caravana';

const ESTADOS = ['', 'Activa', 'Seca', 'Vendida', 'Muerta'];

const estadoColorMadre = (estado) => ({
    Activa: colors.vivo,
    Seca: colors.vendido,
    Vendida: '#3B82F6',
    Muerta: colors.muerto,
}[estado] || colors.neutro);

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

export default function MadreListadoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
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
            <View style={styles.cardTop}>
                <Caravana rp={item.rp_madre ?? item.id_madre} />
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.nombre || 'Sin nombre'}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                        {`Nac. ${formatFecha(item.fecha_nacimiento)}`}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: estadoColorMadre(item.estado) }]}>
                    <Text style={styles.badgeText}>{item.estado || '—'}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>HIJOS</Text>
                    <Text style={styles.metaValue}>{item.terneros?.length ?? 0}</Text>
                </View>
                <View style={styles.metaSep} />
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>EVENTOS</Text>
                    <Text style={styles.metaValue}>{item.eventos?.length ?? 0}</Text>
                </View>
            </View>

            {/* Crías */}
            <View style={styles.criasBlock}>
                <Text style={styles.criasTitle}>Crías ({item.terneros?.length ?? 0})</Text>
                {item.terneros?.length > 0 ? (
                    <View style={styles.criasRow}>
                        {item.terneros.map(t => {
                            const sexo = t.sexo === 'Hembra' ? '♀' : t.sexo === 'Macho' ? '♂' : '';
                            return (
                                <View key={t.id_ternero} style={styles.criaChip}>
                                    <Text style={styles.criaRp}>RP {t.rp_ternero ?? t.id_ternero}</Text>
                                    {sexo ? <Text style={styles.criaSexo}>{sexo}</Text> : null}
                                    <View style={[styles.criaDot, { backgroundColor: estadoColor(t.estado) }]} />
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <Text style={styles.criasEmpty}>Sin crías registradas</Text>
                )}
            </View>

            {item.observaciones ? <Text style={styles.observaciones} numberOfLines={2}>“{item.observaciones}”</Text> : null}

            <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                <Text style={styles.btnEditarText}>Editar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View>
                    <Text style={styles.headerEyebrow}>TERNEDATA · HACIENDA</Text>
                    <Text style={styles.headerTitle}>🐄 Madres</Text>
                </View>
                <View style={styles.countChip}>
                    <Text style={styles.countNum}>{total}</Text>
                    <Text style={styles.countLabel}>en el campo</Text>
                </View>
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

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={madres}
                    keyExtractor={item => String(item.id_madre)}
                    renderItem={renderMadre}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin madres</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MadreForm')}>
                <Text style={styles.fabText}>＋ Nueva</Text>
            </TouchableOpacity>

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

    filtroRow: { paddingHorizontal: space.md, paddingVertical: space.md, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 7, marginRight: space.sm, backgroundColor: colors.surface },
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
    badge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

    divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaItem: { flex: 1 },
    metaSep: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: 12 },
    metaLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: colors.inkFaint },
    metaValue: { ...type.title, ...type.num, color: colors.ink, marginTop: 1 },
    observaciones: { fontSize: 12, color: colors.inkSoft, marginTop: 10, fontStyle: 'italic' },

    criasBlock: { marginTop: 12 },
    criasTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.inkFaint, textTransform: 'uppercase', marginBottom: 6 },
    criasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    criaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.campoSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    criaRp: { ...type.num, fontSize: 12, fontWeight: '800', color: colors.campoDark },
    criaSexo: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
    criaDot: { width: 8, height: 8, borderRadius: 4 },
    criasEmpty: { fontSize: 12, color: colors.inkFaint, fontStyle: 'italic' },

    btnEditar: { backgroundColor: colors.campo, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center', marginTop: 14 },
    btnEditarText: { color: colors.white, fontWeight: '800', fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,30,20,0.55)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '85%' },
    modalTitle: { ...type.h2, color: colors.ink, marginBottom: space.lg },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.surface },
    optionBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    optionBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    optionBtnTextActive: { color: colors.white, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnCancelarText: { color: colors.inkSoft, fontWeight: '700' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '800' },

    fab: { position: 'absolute', bottom: 22, right: 18, backgroundColor: colors.campo, borderRadius: radius.pill, paddingHorizontal: 22, paddingVertical: 14, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
