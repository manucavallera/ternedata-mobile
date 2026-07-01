import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, shadow, radius, space } from '../../theme';

const SECCIONES = [
    {
        icon: '🐮',
        titulo: 'Ternero',
        texto: 'Registrá cada cría con su RP (caravana), sexo, fecha de nacimiento y peso al nacer. Desde el listado podés marcarlo como calostrado, agregar pesajes y ver su historial completo.',
    },
    {
        icon: '🐄',
        titulo: 'Madre',
        texto: 'Registrá las vacas madre con su RP y estado (Seca o En Tambo). El listado muestra las crías asociadas a cada una.',
    },
    {
        icon: '💊',
        titulo: 'Tratamiento',
        texto: 'Registrá tratamientos aplicados a un ternero: tipo de enfermedad, turno (mañana/tarde) y descripción. Podés editar o eliminar cualquier registro.',
    },
    {
        icon: '📅',
        titulo: 'Evento',
        texto: 'Un evento agrupa animales en una fecha puntual (ej. una vacunación masiva, un tacto). Elegí terneros y/o madres involucrados y una observación.',
    },
    {
        icon: '🥼',
        titulo: 'Diarrea',
        texto: 'Registrá episodios de diarrea por ternero con severidad (Leve/Moderada/Severa/Crítica). El sistema numera los episodios por animal automáticamente.',
    },
    {
        icon: '🏡',
        titulo: 'Rodeo',
        texto: 'Agrupá terneros y madres en rodeos (lotes) para organizarlos por potrero o manejo. Podés asignar y desasignar animales en cualquier momento.',
    },
    {
        icon: '❤️',
        titulo: 'Resumen de Salud',
        texto: 'Vista rápida del estado sanitario general del establecimiento: cantidad de episodios de diarrea por severidad.',
    },
    {
        icon: '👥',
        titulo: 'Equipo',
        texto: 'Invitá a otras personas (veterinario, operario) a colaborar en tu establecimiento. Generás un link de invitación que les da acceso con el rol que elijas. También podés revocar invitaciones pendientes o sacar a alguien del equipo.',
    },
    {
        icon: '🛠️',
        titulo: 'Administración',
        texto: 'Solo para el dueño del establecimiento: crear, editar, activar/desactivar establecimientos y gestionar usuarios.',
    },
];

export default function AyudaScreen() {
    const [abierta, setAbierta] = useState(null);

    const toggle = (i) => setAbierta(abierta === i ? null : i);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>❓ Ayuda</Text>
                <Text style={styles.headerSub}>Guía rápida de la app</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                <View style={styles.botCard}>
                    <Text style={styles.botTitle}>🤖 ¿Sabías que podés usar el bot?</Text>
                    <Text style={styles.botTexto}>
                        Además de la app, podés registrar terneros, tratamientos, diarrea y más
                        hablando o escribiendo por Telegram. Andá a Perfil → "Vincular Telegram",
                        generá el código de 8 dígitos y pegalo en el chat del bot.
                    </Text>
                    <TouchableOpacity
                        style={styles.botBtn}
                        onPress={() => Linking.openURL('https://t.me/')}
                    >
                        <Text style={styles.botBtnText}>Abrir Telegram</Text>
                    </TouchableOpacity>
                </View>

                {SECCIONES.map((s, i) => (
                    <TouchableOpacity key={s.titulo} style={styles.card} onPress={() => toggle(i)} activeOpacity={0.8}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>{s.icon}</Text>
                            <Text style={styles.cardTitulo}>{s.titulo}</Text>
                            <Text style={styles.chevron}>{abierta === i ? '−' : '+'}</Text>
                        </View>
                        {abierta === i && <Text style={styles.cardTexto}>{s.texto}</Text>}
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
    headerSub: { fontSize: 13, color: colors.campoSoft },
    list: { padding: space.md, paddingBottom: 40 },

    botCard: { backgroundColor: colors.campo, borderRadius: radius.lg, padding: 16, marginBottom: space.md, ...shadow.card },
    botTitle: { fontSize: 15, fontWeight: '800', color: colors.white, marginBottom: 6 },
    botTexto: { fontSize: 13, color: '#EAF5EC', lineHeight: 19, marginBottom: 12 },
    botBtn: { backgroundColor: colors.white, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
    botBtnText: { color: colors.campoDark, fontWeight: '800', fontSize: 13 },

    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: { fontSize: 20 },
    cardTitulo: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
    chevron: { fontSize: 20, color: colors.campo, fontWeight: '900', width: 20, textAlign: 'center' },
    cardTexto: { fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginTop: 10 },
});
