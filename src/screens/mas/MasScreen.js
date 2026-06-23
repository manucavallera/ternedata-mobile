import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

const OPCIONES = [
    { screen: 'DiarreaListado', icon: '🥼', label: 'Diarrea', desc: 'Episodios y seguimiento', color: '#06b6d4' },
    { screen: 'ResumenSalud', icon: '❤️', label: 'Resumen de Salud', desc: 'Estado sanitario del rodeo', color: '#be123c' },
    { screen: 'Equipo', icon: '👥', label: 'Equipo', desc: 'Miembros e invitaciones', color: '#7c3aed' },
    { screen: 'Admin', icon: '🛠️', label: 'Administración', desc: 'Gestión de establecimientos', color: '#1d4ed8', soloAdmin: true },
    { screen: 'Perfil', icon: '👤', label: 'Perfil', desc: 'Tu cuenta y establecimiento', color: '#10b981' },
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
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#374151', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    list: { padding: 12 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    icon: { fontSize: 22 },
    itemLabel: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    itemDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    chevron: { fontSize: 26, color: '#d1d5db', fontWeight: '300' },
});
