import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAuthSession } from '../../hooks/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import businessApi from '../../api/bussines-api';
import { colors, space, radius, shadow, type } from '../../theme';

export default function PerfilScreen() {
    const { userPayload } = useSelector(state => state.auth);
    const { getProfileHook, updateProfileHook, logoutHook } = useAuthSession();

    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formDatos, setFormDatos] = useState({ name: '', email: '', telefono: '' });
    const [formPassword, setFormPassword] = useState({ password: '', confirmar: '' });
    const [savingDatos, setSavingDatos] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [alertDatos, setAlertDatos] = useState(null);
    const [alertPass, setAlertPass] = useState(null);

    // Vinculación Telegram
    const [tokenBot, setTokenBot] = useState(null);
    const [tokenExpires, setTokenExpires] = useState(null);
    const [generandoToken, setGenerandoToken] = useState(false);

    useEffect(() => { cargarPerfil(); }, []);

    const cargarPerfil = async () => {
        setLoading(true);
        const res = await getProfileHook();
        if (res.success) {
            setPerfil(res.data);
            setFormDatos({ name: res.data.name || '', email: res.data.email || '', telefono: res.data.telefono || '' });
        }
        setLoading(false);
    };

    const showAlert = (setter, message, success) => {
        setter({ message, success });
        setTimeout(() => setter(null), 4000);
    };

    const handleGuardarDatos = async () => {
        setSavingDatos(true);
        const res = await updateProfileHook(perfil.id, {
            name: formDatos.name,
            email: formDatos.email,
            telefono: formDatos.telefono || undefined,
        });
        if (res.success) {
            setPerfil(res.data);
            const stored = JSON.parse(await AsyncStorage.getItem('userSelected') || '{}');
            await AsyncStorage.setItem('userSelected', JSON.stringify({ ...stored, name: res.data.name, email: res.data.email }));
            showAlert(setAlertDatos, 'Datos actualizados', true);
        } else {
            showAlert(setAlertDatos, res.message || 'Error al actualizar', false);
        }
        setSavingDatos(false);
    };

    const handleCambiarPassword = async () => {
        if (formPassword.password.length < 8) {
            showAlert(setAlertPass, 'Mínimo 8 caracteres', false);
            return;
        }
        if (formPassword.password !== formPassword.confirmar) {
            showAlert(setAlertPass, 'Las contraseñas no coinciden', false);
            return;
        }
        setSavingPass(true);
        const res = await updateProfileHook(perfil.id, { password: formPassword.password });
        if (res.success) {
            setFormPassword({ password: '', confirmar: '' });
            showAlert(setAlertPass, 'Contraseña actualizada', true);
        } else {
            showAlert(setAlertPass, 'Error al cambiar contraseña', false);
        }
        setSavingPass(false);
    };

    const handleGenerarTokenBot = async () => {
        setGenerandoToken(true);
        try {
            const res = await businessApi.post('/users/me/generar-token-bot');
            setTokenBot(res.data.token);
            setTokenExpires(new Date(res.data.expires));
        } catch {
            // noop
        } finally {
            setGenerandoToken(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => logoutHook() },
        ]);
    };

    if (loading) return <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 80 }} />;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>👤 Mi Perfil</Text>
                <Text style={styles.headerSub}>{perfil?.rol || userPayload?.rol || '-'}</Text>
            </View>

            {/* Datos personales */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Datos personales</Text>

                {alertDatos && (
                    <View style={[styles.alert, alertDatos.success ? styles.alertSuccess : styles.alertError]}>
                        <Text style={styles.alertText}>{alertDatos.message}</Text>
                    </View>
                )}

                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={formDatos.name} onChangeText={v => setFormDatos(f => ({ ...f, name: v }))} placeholder="Nombre" />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={formDatos.email} onChangeText={v => setFormDatos(f => ({ ...f, email: v }))} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.label}>Teléfono</Text>
                <TextInput style={styles.input} value={formDatos.telefono} onChangeText={v => setFormDatos(f => ({ ...f, telefono: v }))} placeholder="Teléfono (opcional)" keyboardType="phone-pad" />

                <TouchableOpacity style={styles.btnPrimary} onPress={handleGuardarDatos} disabled={savingDatos}>
                    {savingDatos ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Guardar datos</Text>}
                </TouchableOpacity>
            </View>

            {/* Vincular Telegram */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📲 Vincular Telegram al bot</Text>
                <Text style={styles.cardHint}>Generá un código y mandáselo al bot de Telegram. Expira en 10 minutos.</Text>

                {tokenBot ? (
                    <>
                        <View style={styles.tokenBox}>
                            <Text style={styles.tokenCode} selectable>{tokenBot}</Text>
                        </View>
                        {tokenExpires && (
                            <Text style={styles.tokenExpira}>
                                Expira a las {tokenExpires.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        )}
                        <TouchableOpacity style={styles.btnSecondary} onPress={handleGenerarTokenBot} disabled={generandoToken}>
                            {generandoToken ? <ActivityIndicator color={colors.campo} /> : <Text style={styles.btnSecondaryText}>Generar nuevo código</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleGenerarTokenBot} disabled={generandoToken}>
                        {generandoToken ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Generar código</Text>}
                    </TouchableOpacity>
                )}
            </View>

            {/* Cambiar contraseña */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Cambiar contraseña</Text>

                {alertPass && (
                    <View style={[styles.alert, alertPass.success ? styles.alertSuccess : styles.alertError]}>
                        <Text style={styles.alertText}>{alertPass.message}</Text>
                    </View>
                )}

                <Text style={styles.label}>Nueva contraseña</Text>
                <TextInput style={styles.input} value={formPassword.password} onChangeText={v => setFormPassword(f => ({ ...f, password: v }))} placeholder="Mínimo 8 caracteres" secureTextEntry />

                <Text style={styles.label}>Confirmar contraseña</Text>
                <TextInput style={styles.input} value={formPassword.confirmar} onChangeText={v => setFormPassword(f => ({ ...f, confirmar: v }))} placeholder="Repetí la contraseña" secureTextEntry />

                <TouchableOpacity style={styles.btnPrimary} onPress={handleCambiarPassword} disabled={savingPass}>
                    {savingPass ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Cambiar contraseña</Text>}
                </TouchableOpacity>
            </View>

            {/* Info establecimiento */}
            {perfil?.id_establecimiento && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Establecimiento</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{perfil.id_establecimiento}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Rol:</Text>
                        <Text style={styles.infoValue}>{perfil.rol}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Estado:</Text>
                        <Text style={styles.infoValue}>{perfil.estado}</Text>
                    </View>
                </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
                <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    header: { backgroundColor: colors.campoDark, paddingTop: 52, paddingBottom: 22, paddingHorizontal: space.xl, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
    headerTitle: { ...type.h1, color: colors.white },
    headerSub: { fontSize: 12, color: colors.caravana, marginTop: 3, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 1 },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginHorizontal: space.md, marginTop: space.md, ...shadow.card },
    cardTitle: { ...type.h2, color: colors.ink, marginBottom: 6 },
    cardHint: { fontSize: 12, color: colors.inkSoft, marginBottom: 12, lineHeight: 17 },
    alert: { borderRadius: radius.sm, padding: 10, marginBottom: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '700', textAlign: 'center', fontSize: 13 },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    btnPrimary: { backgroundColor: colors.campo, borderRadius: radius.md, padding: 13, alignItems: 'center', marginTop: 14 },
    btnPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 15 },
    btnSecondary: { borderWidth: 1.5, borderColor: colors.campo, borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 12 },
    btnSecondaryText: { color: colors.campo, fontWeight: '800', fontSize: 14 },
    tokenBox: { backgroundColor: colors.campoSoft, borderWidth: 1, borderColor: colors.campo, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center' },
    tokenCode: { fontSize: 40, fontWeight: '900', letterSpacing: 10, color: colors.campoDark, ...type.num },
    tokenExpira: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 8, fontWeight: '600' },
    infoRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
    infoLabel: { ...type.label, color: colors.inkSoft, width: 90 },
    infoValue: { fontSize: 13, color: colors.ink, flex: 1, fontWeight: '600' },
    btnLogout: { marginHorizontal: space.md, marginTop: space.lg, backgroundColor: colors.muerto, borderRadius: radius.md, padding: 14, alignItems: 'center' },
    btnLogoutText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
