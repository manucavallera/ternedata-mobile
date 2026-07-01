import { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

export default function RodeoAsignarScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const rodeo = route.params?.rodeo;
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        obtenerTerneroHook, obtenerMadreHook,
        asignarTernerosRodeoHook, desasignarTernerosRodeoHook,
        asignarMadresRodeoHook, desasignarMadresRodeoHook,
    } = useBussinesMicroservicio();

    const [tab, setTab] = useState('terneros');
    const [terneros, setTerneros] = useState([]);
    const [madres, setMadres] = useState([]);
    const [seleccion, setSeleccion] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    const idEst = userPayload?.id_establecimiento || establecimientoActual;

    const showAlert = (message, success) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = async () => {
        setLoading(true);
        let q = 'page=1&limit=500';
        if (idEst) q += `&id_establecimiento=${idEst}`;
        const [resT, resM] = await Promise.all([obtenerTerneroHook(q), obtenerMadreHook(q)]);
        setTerneros(resT?.data?.data || []);
        setMadres(resM?.data?.data || []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

    const cambiarTab = (t) => { setTab(t); setSeleccion([]); setSearch(''); };

    const toggleSel = (id) => {
        setSeleccion(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    };

    const accion = async (asignar) => {
        if (seleccion.length === 0) { showAlert('Seleccioná al menos un animal', false); return; }
        setWorking(true);
        let res;
        if (tab === 'terneros') {
            const payload = { ids_terneros: seleccion };
            res = asignar ? await asignarTernerosRodeoHook(rodeo.id_rodeo, payload) : await desasignarTernerosRodeoHook(rodeo.id_rodeo, payload);
        } else {
            const payload = { ids_madres: seleccion };
            res = asignar ? await asignarMadresRodeoHook(rodeo.id_rodeo, payload) : await desasignarMadresRodeoHook(rodeo.id_rodeo, payload);
        }
        if (res?.status === 200 || res?.status === 201) {
            showAlert(asignar ? 'Animales asignados' : 'Animales desasignados', true);
            setSeleccion([]);
            await cargar();
        } else {
            showAlert('Error en la operación', false);
        }
        setWorking(false);
    };

    const lista = tab === 'terneros' ? terneros : madres;
    const idKey = tab === 'terneros' ? 'id_ternero' : 'id_madre';
    const listaFiltrada = lista.filter(x => !search || x.nombre?.toLowerCase().includes(search.toLowerCase()) || String(x[idKey]).includes(search));

    const renderItem = ({ item }) => {
        const id = item[idKey];
        const sel = seleccion.includes(id);
        const enRodeo = item.id_rodeo === rodeo?.id_rodeo;
        return (
            <TouchableOpacity style={[styles.item, sel && styles.itemSel]} onPress={() => toggleSel(id)}>
                <View style={[styles.checkbox, sel && styles.checkboxSel]}>
                    {sel ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>#{id} — {item.nombre || 'Sin nombre'}</Text>
                    {enRodeo ? <Text style={styles.enRodeo}>● En este rodeo</Text> : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🌾 {rodeo?.nombre}</Text>
                <Text style={styles.headerSub}>Asignar animales</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, tab === 'terneros' && styles.tabActive]} onPress={() => cambiarTab('terneros')}>
                    <Text style={[styles.tabText, tab === 'terneros' && styles.tabTextActive]}>Terneros</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'madres' && styles.tabActive]} onPress={() => cambiarTab('madres')}>
                    <Text style={[styles.tabText, tab === 'madres' && styles.tabTextActive]}>Madres</Text>
                </TouchableOpacity>
            </View>

            <TextInput style={styles.search} placeholder="Buscar..." value={search} onChangeText={setSearch} />

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={listaFiltrada}
                    keyExtractor={item => String(item[idKey])}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <View style={styles.footer}>
                <Text style={styles.selCount}>{seleccion.length} seleccionados</Text>
                <View style={styles.footerBtns}>
                    <TouchableOpacity style={[styles.btnDesasignar, working && styles.btnDisabled]} onPress={() => accion(false)} disabled={working}>
                        <Text style={styles.btnDesasignarText}>Desasignar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAsignar, working && styles.btnDisabled]} onPress={() => accion(true)} disabled={working}>
                        {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnAsignarText}>Asignar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, marginBottom: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: colors.campoSoft },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    tabs: { flexDirection: 'row', margin: space.md, gap: space.sm },
    tab: { flex: 1, borderRadius: radius.sm, padding: 10, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    tabActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    tabText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
    tabTextActive: { color: colors.white },
    search: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginHorizontal: space.md, marginBottom: 8 },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 40, fontSize: 15 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.surface },
    itemSel: { borderColor: colors.campo, backgroundColor: colors.campoSoft },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.line, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    checkboxSel: { backgroundColor: colors.campo, borderColor: colors.campo },
    checkmark: { color: colors.white, fontWeight: '800', fontSize: 14 },
    itemTitle: { fontSize: 14, color: colors.ink, fontWeight: '600' },
    enRodeo: { fontSize: 11, color: colors.campo, marginTop: 2, fontWeight: '600' },
    footer: { backgroundColor: colors.surface, padding: space.md, borderTopWidth: 1, borderTopColor: colors.line },
    selCount: { fontSize: 12, color: colors.inkSoft, marginBottom: 8, textAlign: 'center' },
    footerBtns: { flexDirection: 'row', gap: 10 },
    btnDesasignar: { flex: 1, borderWidth: 1, borderColor: colors.muerto, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
    btnDesasignarText: { color: colors.muerto, fontWeight: '700' },
    btnAsignar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
    btnAsignarText: { color: colors.white, fontWeight: '700' },
    btnDisabled: { opacity: 0.6 },
});
