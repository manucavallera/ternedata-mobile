import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAuthSession } from '../../hooks/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => logoutHook() },
        ]);
    };

    if (loading) return <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 80 }} />;

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
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    content: { paddingBottom: 40 },
    header: { backgroundColor: '#6366f1', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2, textTransform: 'capitalize' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 12, marginBottom: 0, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
    alert: { borderRadius: 8, padding: 10, marginBottom: 10 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
    btnPrimary: { backgroundColor: '#6366f1', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 14 },
    btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    infoRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    infoLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600', width: 80 },
    infoValue: { fontSize: 13, color: '#111827', flex: 1 },
    btnLogout: { margin: 12, marginTop: 16, backgroundColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center' },
    btnLogoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
