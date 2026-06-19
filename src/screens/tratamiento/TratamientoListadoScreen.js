import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS = ['', 'Diarrea', 'Respiratorio', 'Umbilical', 'Otro'];
const TURNOS = ['', 'Mañana', 'Tarde'];

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

const tipoColor = (tipo) => {
    if (tipo === 'Diarrea') return '#f59e0b';
    if (tipo === 'Respiratorio') return '#3b82f6';
    if (tipo === 'Umbilical') return '#8b5cf6';
    return '#6b7280';
};

export default function TratamientoListadoScreen() {
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerTratamientoHook } = useBussinesMicroservicio();

    const [tratamientos, setTratamientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroTurno, setFiltroTurno] = useState('');

    const cargarTratamientos = useCallback(async (search = '', tipo = '', turno = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}&`;
            q += 'page=1&limit=500';
            if (search) q += `&search=${encodeURIComponent(search)}`;
            if (tipo) q += `&tipo_enfermedad=${encodeURIComponent(tipo)}`;
            if (turno) q += `&turno=${encodeURIComponent(turno)}`;
            const res = await obtenerTratamientoHook(q);
            setTratamientos(res?.data?.data || []);
            setTotal(res?.data?.total || 0);
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarTratamientos(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarTratamientos(searchInput, filtroTipo, filtroTurno);
        setRefreshing(false);
    };

    const renderTratamiento = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>#{item.id_tratamiento}</Text>
                <View style={[styles.badge, { backgroundColor: tipoColor(item.tipo_enfermedad) }]}>
                    <Text style={styles.badgeText}>{item.tipo_enfermedad || 'Sin tipo'}</Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Ternero ID:</Text>
                <Text style={styles.cardValue}>{item.id_ternero || '-'}</Text>
                <Text style={styles.cardLabel}>  Turno:</Text>
                <Text style={styles.cardValue}>{item.turno || '-'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fecha:</Text>
                <Text style={styles.cardValue}>{formatFecha(item.fecha_tratamiento)}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Medicamento:</Text>
                <Text style={styles.cardValue}>{item.medicamento || '-'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Dosis:</Text>
                <Text style={styles.cardValue}>{item.dosis || '-'}</Text>
                <Text style={styles.cardLabel}>  Días:</Text>
                <Text style={styles.cardValue}>{item.dias_tratamiento ?? '-'}</Text>
            </View>
            {item.observaciones ? <Text style={styles.observaciones} numberOfLines={2}>{item.observaciones}</Text> : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💊 Tratamientos</Text>
                <Text style={styles.headerSub}>{total} registros</Text>
            </View>

            <View style={styles.searchRow}>
                <TextInput style={styles.searchInput} placeholder="Buscar..." value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => cargarTratamientos(searchInput, filtroTipo, filtroTurno)} returnKeyType="search" />
                <TouchableOpacity style={styles.searchBtn} onPress={() => cargarTratamientos(searchInput, filtroTipo, filtroTurno)}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
                {TIPOS.map(t => (
                    <TouchableOpacity key={t || 'todos'} style={[styles.filtroBtn, filtroTipo === t && styles.filtroBtnActive]} onPress={() => { setFiltroTipo(t); cargarTratamientos(searchInput, t, filtroTurno); }}>
                        <Text style={[styles.filtroBtnText, filtroTipo === t && styles.filtroBtnTextActive]}>{t || 'Todos'}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.filtroDivider} />
                {TURNOS.map(t => (
                    <TouchableOpacity key={t || 'all-turnos'} style={[styles.filtroBtn, filtroTurno === t && styles.filtroBtnActiveAlt]} onPress={() => { setFiltroTurno(t); cargarTratamientos(searchInput, filtroTipo, t); }}>
                        <Text style={[styles.filtroBtnText, filtroTurno === t && styles.filtroBtnTextActive]}>{t || 'Ambos turnos'}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? <ActivityIndicator size="large" color="#f59e0b" style={styles.loader} /> : (
                <FlatList
                    data={tratamientos}
                    keyExtractor={item => String(item.id_tratamiento)}
                    renderItem={renderTratamiento}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin tratamientos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#f59e0b', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#fef3c7' },
    searchRow: { flexDirection: 'row', margin: 12, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    searchBtn: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    filtroRow: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
    filtroBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    filtroBtnActiveAlt: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    filtroDivider: { width: 1, backgroundColor: '#d1d5db', marginHorizontal: 4 },
    filtroBtnText: { fontSize: 13, color: '#374151' },
    filtroBtnTextActive: { color: '#fff', fontWeight: '700' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
    badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    cardRow: { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
    cardLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    cardValue: { fontSize: 12, color: '#111827', marginLeft: 4 },
    observaciones: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
});
