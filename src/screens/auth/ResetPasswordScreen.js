import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';

export default function ResetPasswordScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { resetPasswordHook } = useAuthSession();

    const [token, setToken] = useState(route.params?.token || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        if (!token.trim()) { setError('Pegá el código del email para continuar.'); return; }
        if (newPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
        if (newPassword !== confirm) { setError('Las contraseñas no coinciden.'); return; }

        setLoading(true);
        const res = await resetPasswordHook(token.trim(), newPassword);
        setLoading(false);

        if (res.success) setDone(true);
        else setError(res.message || 'Token inválido o expirado. Solicitá un nuevo link.');
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>🔒 Nueva contraseña</Text>
                    <Text style={styles.subtitle}>Ingresá tu nueva contraseña.</Text>

                    {done ? (
                        <>
                            <View style={[styles.alertBox, styles.alertSuccess]}>
                                <Text style={styles.alertText}>✅ Contraseña actualizada correctamente.</Text>
                            </View>
                            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.buttonText}>Ir al login</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {!route.params?.token && (
                                <>
                                    <Text style={styles.label}>Código del email</Text>
                                    <TextInput style={styles.input} placeholder="Pegá el código/token" value={token} onChangeText={setToken} autoCapitalize="none" />
                                </>
                            )}

                            <Text style={styles.label}>Nueva contraseña</Text>
                            <TextInput style={styles.input} placeholder="Mínimo 8 caracteres" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

                            <Text style={styles.label}>Confirmar contraseña</Text>
                            <TextInput style={styles.input} placeholder="Repetí la contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry />

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backLink}>
                        <Text style={styles.backText}>← Volver al login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#f3f4f6' },
    container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 15, color: '#111827' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 8 },
    button: { backgroundColor: '#6366f1', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    alertBox: { borderRadius: 8, padding: 10, marginTop: 12 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    backLink: { marginTop: 16, alignItems: 'center' },
    backText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
});
