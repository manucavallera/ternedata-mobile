import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { setEstablecimientoActual } from '../../store/auth/authSlice';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const OPCIONES = [
    { screen: 'DiarreaListado', icon: '🥼', label: 'Diarrea', desc: 'Episodios y seguimiento', color: colors.muerto },
    { screen: 'ResumenSalud', icon: '❤️', label: 'Resumen de Salud', desc: 'Estado sanitario del rodeo', color: colors.vendido },
    { screen: 'Litros', icon: '🥛', label: 'Litros de leche', desc: 'Producción diaria y vacas en ordeñe', color: '#0E7490' },
    { screen: 'Sustituto', icon: '🍼', label: 'Sustituto lácteo', desc: 'Cuánto necesitás y si conviene', color: '#B45309' },
    { screen: 'Calendario', icon: '📅', label: 'Calendario histórico', desc: 'Cómo estaba el rodeo cualquier día', color: colors.campo },
    { screen: 'Equipo', icon: '👥', label: 'Equipo', desc: 'Miembros e invitaciones', color: colors.campo },
    { screen: 'Admin', icon: '🛠️', label: 'Administración', desc: 'Gestión de establecimientos', color: colors.campoDark, soloAdmin: true },
    { screen: 'Ayuda', icon: '❓', label: 'Ayuda', desc: 'Guía rápida y cómo usar el bot', color: '#2C5282' },
    { screen: 'Perfil', icon: '👤', label: 'Perfil', desc: 'Tu cuenta y establecimiento', color: colors.caravana },
];

export default function MasScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const { obtenerEstablecimientosHook } = useBussinesMicroservicio();
    const [establecimientos, setEstablecimientos] = useState([]);
    const [loadingEst, setLoadingEst] = useState(true);

    useEffect(() => {
        let activo = true;
        obtenerEstablecimientosHook().then(res => {
            if (!activo) return;
            const lista = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
            setEstablecimientos(lista.filter(e => e.estado === 'activo'));
        }).finally(() => activo && setLoadingEst(false));
        return () => { activo = false; };
    }, []);

    const opciones = OPCIONES.filter(op => !op.soloAdmin || userPayload?.rol === 'admin');
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>☰ Más</Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
                <View style={styles.estCard}>
                    <Text style={styles.estTitle}>🏡 Establecimiento activo</Text>
                    {loadingEst ? <ActivityIndicator color={colors.campo} /> : establecimientos.length === 0 ? (
                        <Text style={styles.estEmpty}>No se pudieron cargar tus establecimientos</Text>
                    ) : establecimientos.map(est => {
                        const id = est.id_establecimiento;
                        const seleccionado = Number(establecimientoActual) === Number(id);
                        return (
                            <TouchableOpacity key={id} style={[styles.estOption, seleccionado && styles.estSelected]}
                                onPress={() => dispatch(setEstablecimientoActual(id))}>
                                <Text style={[styles.estName, seleccionado && styles.estNameSelected]}>{est.nombre}</Text>
                                <Text style={styles.estMark}>{seleccionado ? '✓' : ''}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {opciones.map(op => (
                    <TouchableOpacity key={op.screen} style={styles.item} onPress={() => navigation.navigate(op.screen)}>
                        <View style={[styles.iconBox, { backgroundColor: op.color }]}>
                            <Text style={styles.icon}>{op.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemLabel}>{op.label}</Text>
                            <Text style={styles.itemDesc}>{op.desc}</Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    list: { padding: space.md },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
    iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    icon: { fontSize: 22 },
    itemLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
    itemDesc: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    chevron: { fontSize: 26, color: colors.line, fontWeight: '300' },
    estCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 14, ...shadow.card },
    estTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 8 },
    estEmpty: { color: colors.inkSoft, fontSize: 13 },
    estOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, marginTop: 7 },
    estSelected: { borderColor: colors.campo, backgroundColor: '#E8F5EC' },
    estName: { color: colors.ink, fontWeight: '600' },
    estNameSelected: { color: colors.campoDark, fontWeight: '800' },
    estMark: { color: colors.campoDark, fontWeight: '900' },
});
