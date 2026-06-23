import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';

export default function VerifyEmailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { verifyEmailHook, resendVerificationHook } = useAuthSession();

    const tokenParam = route.params?.token;
    const [estado, setEstado] = useState(tokenParam ? 'verificando' : 'error');
    const [mensaje, setMensaje] = useState('');
    const [reenviarEmail, setReenviarEmail] = useState('');
    const [reenviado, setReenviado] = useState(false);

    useEffect(() => {
        if (!tokenParam) return;
        let activo = true;
        (async () => {
            const res = await verifyEmailHook(tokenParam);
            if (!activo) return;
            if (res.success) {
                setEstado('ok');
                setMensaje(res.data?.message || 'Email verificado. Ya podés iniciar sesión.');
            } else {
                setEstado('error');
                setMensaje(res.message || 'Link inválido o expirado. Pedí uno nuevo.');
            }
        })();
        return () => { activo = false; };
    }, [tokenParam]);

    const handleReenviar = async () => {
        if (!reenviarEmail.trim()) return;
        await resendVerificationHook(reenviarEmail.trim());
        setReenviado(true);
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>📧 Verificación de email</Text>

                    {estado === 'verificando' && (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#6366f1" />
                            <Text style={styles.subtitle}>Verificando tu cuenta...</Text>
                        </View>
                    )}

                    {estado === 'ok' && (
                        <>
                            <View style={[styles.alertBox, styles.alertSuccess]}>
                                <Text style={styles.alertText}>✅ {mensaje}</Text>
                            </View>
                            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.buttonText}>Ir al login</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {estado === 'error' && (
                        <>
                            <View style={[styles.alertBox, styles.alertError]}>
                                <Text style={styles.alertText}>{mensaje || 'No pudimos verificar tu email.'}</Text>
                            </View>

                            {reenviado ? (
                                <Text style={styles.successMsg}>
                                    Si la cuenta existe y no está verificada, te enviamos un nuevo email. Revisá tu casilla.
                                </Text>
                            ) : (
                                <>
                                    <Text style={styles.label}>Reenviar verificación</Text>
                                    <TextInput style={styles.input} placeholder="tu@email.com" value={reenviarEmail} onChangeText={setReenviarEmail} keyboardType="email-address" autoCapitalize="none" />
                                    <TouchableOpacity style={styles.button} onPress={handleReenviar}>
                                        <Text style={styles.buttonText}>Reenviar email</Text>
                                    </TouchableOpacity>
                                </>
                            )}
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#374151', marginBottom: 16, textAlign: 'center' },
    subtitle: { fontSize: 13, color: '#6b7280', marginTop: 12, textAlign: 'center' },
    center: { alignItems: 'center', paddingVertical: 12 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 14 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 15, color: '#111827' },
    button: { backgroundColor: '#6366f1', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    alertBox: { borderRadius: 8, padding: 12, marginTop: 4 },
    alertSuccess: { backgroundColor: '#22c55e' },
    alertError: { backgroundColor: '#ef4444' },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    successMsg: { fontSize: 13, color: '#15803d', marginTop: 12, textAlign: 'center', lineHeight: 20 },
    backLink: { marginTop: 16, alignItems: 'center' },
    backText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
});
