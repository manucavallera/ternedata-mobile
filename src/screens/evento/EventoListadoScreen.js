import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS_EVENTO = ['', 'Vacunación', 'Destete', 'Pesaje', 'Sanitación', 'Otro'];

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }); }
    catch { return fecha; }
};

const tipoColor = (tipo) => {
    if (tipo === 'Vacunación') return '#22c55e';
    if (tipo === 'Destete') return '#f59e0b';
    if (tipo === 'Pesaje') return '#3b82f6';
    if (tipo === 'Sanitación') return '#8b5cf6';
    return '#6b7280';
};

export default function EventoListadoScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerEventoHook } = useBussinesMicroservicio();

    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    const cargarEventos = useCallback(async (search = '', tipo = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}&`;
            q += 'page=1&limit=500';
            if (search) q += `&search=${encodeURIComponent(search)}`;
            if (tipo) q += `&tipo_evento=${encodeURIComponent(tipo)}`;
            const res = await obtenerEventoHook(q);
            setEventos(res?.data?.data || []);
            setTotal(res?.data?.total || 0);
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarEventos(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarEventos(searchInput, filtroTipo);
        setRefreshing(false);
    };

    const renderEvento = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>#{item.id_evento}</Text>
                <View style={[styles.badge, { backgroundColor: tipoColor(item.tipo_evento) }]}>
                    <Text style={styles.badgeText}>{item.tipo_evento || 'Sin tipo'}</Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fecha:</Text>
                <Text style={styles.cardValue}>{formatFecha(item.fecha_evento)}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Ternero ID:</Text>
                <Text style={styles.cardValue}>{item.id_ternero || '-'}</Text>
                <Text style={styles.cardLabel}>  Madre ID:</Text>
                <Text style={styles.cardValue}>{item.id_madre || '-'}</Text>
            </View>
            {item.descripcion ? <Text style={styles.observaciones} numberOfLines={2}>{item.descripcion}</Text> : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📋 Eventos</Text>
                <Text style={styles.headerSub}>{total} registros</Text>
            </View>

            <View style={styles.searchRow}>
                <TextInput style={styles.searchInput} placeholder="Buscar..." value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => cargarEventos(searchInput, filtroTipo)} returnKeyType="search" />
                <TouchableOpacity style={styles.searchBtn} onPress={() => cargarEventos(searchInput, filtroTipo)}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
                {TIPOS_EVENTO.map(t => (
                    <TouchableOpacity key={t || 'todos'} style={[styles.filtroBtn, filtroTipo === t && styles.filtroBtnActive]} onPress={() => { setFiltroTipo(t); cargarEventos(searchInput, t); }}>
                        <Text style={[styles.filtroBtnText, filtroTipo === t && styles.filtroBtnTextActive]}>{t || 'Todos'}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EventoForm')}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader} /> : (
                <FlatList
                    data={eventos}
                    keyExtractor={item => String(item.id_evento)}
                    renderItem={renderEvento}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin eventos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#8b5cf6', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#ede9fe' },
    searchRow: { flexDirection: 'row', margin: 12, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    searchBtn: { backgroundColor: '#8b5cf6', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    filtroRow: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
    filtroBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
    filtroBtnActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
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
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#8b5cf6', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
