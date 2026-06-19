import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';

export default function LoginScreen() {
    const navigation = useNavigation();
    const { loginHooks, aceptarInvitacionesAutomatico } = useAuthSession();
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ status: false, message: '', verify: false });

    const { control, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = handleSubmit(async (data) => {
        setLoading(true);
        setAlert({ status: false, message: '', verify: false });

        const res = await loginHooks({ email: data.email, password: data.password });

        if (res === 403) {
            setAlert({ status: true, verify: true, message: 'Verificá tu email antes de entrar. Revisá tu casilla (y spam).' });
        } else if (res === 401 || !res?.data) {
            setAlert({ status: true, message: 'Credenciales incorrectas', verify: false });
        } else {
            await aceptarInvitacionesAutomatico();
            // RootNavigator cambia automáticamente al status 'authenticated'
        }

        setLoading(false);
    });

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>🐮 Ingresar</Text>

                    <Text style={styles.label}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        rules={{
                            required: 'Email es requerido',
                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, errors.email && styles.inputError]}
                                placeholder="email@gmail.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

                    <Text style={styles.label}>Contraseña</Text>
                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            required: 'Contraseña es requerida',
                            minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, errors.password && styles.inputError]}
                                placeholder="Contraseña"
                                secureTextEntry
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>Ingresar</Text>
                        }
                    </TouchableOpacity>

                    {alert.status && (
                        <View style={styles.alertBox}>
                            <Text style={styles.alertText}>{alert.message}</Text>
                            {alert.verify && (
                                <TouchableOpacity onPress={() => navigation.navigate('VerifyEmail')}>
                                    <Text style={styles.alertLink}>Reenviar verificación</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
                        <Text style={styles.registerText}>¿No tenés cuenta? <Text style={styles.registerTextBold}>Registrate</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#f3f4f6' },
    container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    title: { fontSize: 26, fontWeight: 'bold', color: '#374151', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        marginBottom: 4,
        fontSize: 15,
        color: '#111827',
    },
    inputError: { borderColor: '#ef4444' },
    errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8 },
    forgotText: { fontSize: 12, color: '#6366f1', textAlign: 'right', marginVertical: 8 },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    alertBox: {
        backgroundColor: '#ef4444',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
    },
    alertText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    alertLink: { color: '#fff', textDecorationLine: 'underline', textAlign: 'center', marginTop: 4 },
    registerLink: { marginTop: 16, alignItems: 'center' },
    registerText: { fontSize: 13, color: '#6b7280' },
    registerTextBold: { color: '#6366f1', fontWeight: '700' },
});
