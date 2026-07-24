import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
    const { userPayload } = useSelector(state => state.auth);
    const opciones = OPCIONES.filter(op => !op.soloAdmin || userPayload?.rol === 'admin');
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>☰ Más</Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
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
});
