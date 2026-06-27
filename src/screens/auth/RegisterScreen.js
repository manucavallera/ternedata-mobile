import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';
import { colors, shadow, radius, space } from '../../theme';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { registroHooks } = useAuthSession();
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ status: false, message: '', success: false });

    const invitationToken = route.params?.token || null;

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            email: route.params?.email || '',
            invitationToken: invitationToken || '',
        },
    });

    const onSubmit = handleSubmit(async (data) => {
        if (data.password !== data.confirmPassword) {
            setAlert({ status: true, message: 'Las contraseñas no coinciden', success: false });
            return;
        }

        setLoading(true);
        setAlert({ status: false, message: '', success: false });

        const newUser = {
            name: data.username,
            email: data.email,
            password: data.password,
            invitationToken: data.invitationToken || invitationToken || undefined,
        };

        const res = await registroHooks(newUser);

        if (typeof res === 'number') {
            const msg = res === 0
                ? 'Error de conexión. Verificá que el servidor esté corriendo.'
                : 'Usuario ya registrado o datos incorrectos.';
            setAlert({ status: true, message: msg, success: false });
        } else {
            const mensaje = invitationToken
                ? '¡Registro y activación exitosa! Iniciá sesión.'
                : '¡Registro exitoso! Te enviamos un email para verificar tu cuenta. Revisá tu casilla (y spam).';
            setAlert({ status: true, message: mensaje, success: true });
            setTimeout(() => navigation.navigate('Login'), invitationToken ? 3000 : 6000);
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
                    <Text style={styles.title}>🐮 Registro</Text>

                    <Text style={styles.label}>Usuario</Text>
                    <Controller
                        control={control}
                        name="username"
                        rules={{
                            required: 'Usuario es requerido',
                            minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                            maxLength: { value: 20, message: 'Máximo 20 caracteres' },
                            pattern: { value: /^[a-zA-Z0-9]+$/i, message: 'Solo letras y números' },
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, errors.username && styles.inputError]}
                                placeholder="nombreusuario"
                                autoCapitalize="none"
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}

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
                            maxLength: { value: 20, message: 'Máximo 20 caracteres' },
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

                    <Text style={styles.label}>Confirmar contraseña</Text>
                    <Controller
                        control={control}
                        name="confirmPassword"
                        rules={{
                            required: 'Confirmá tu contraseña',
                            minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, errors.confirmPassword && styles.inputError]}
                                placeholder="Repetí la contraseña"
                                secureTextEntry
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

                    <Text style={[styles.label, { marginTop: 12 }]}>Token de invitación (opcional)</Text>
                    <Controller
                        control={control}
                        name="invitationToken"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, styles.inputToken]}
                                placeholder="Pegá tu código aquí..."
                                autoCapitalize="none"
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />

                    <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color={colors.white} />
                            : <Text style={styles.buttonText}>Registrarse</Text>
                        }
                    </TouchableOpacity>

                    {alert.status && (
                        <View style={[styles.alertBox, alert.success ? styles.alertSuccess : styles.alertError]}>
                            <Text style={styles.alertText}>{alert.message}</Text>
                        </View>
                    )}

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                        <Text style={styles.loginText}>¿Ya tenés cuenta? <Text style={styles.loginTextBold}>Ingresá</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, ...shadow.card },
    title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.sm,
        padding: 10,
        marginBottom: 4,
        fontSize: 15,
        color: colors.ink,
    },
    inputToken: { backgroundColor: colors.campoSoft, borderColor: colors.campo },
    inputError: { borderColor: colors.muerto },
    errorText: { fontSize: 12, color: colors.muerto, marginBottom: 8 },
    button: {
        backgroundColor: colors.campo,
        borderRadius: radius.sm,
        padding: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    alertBox: { borderRadius: radius.sm, padding: 10, marginTop: 12 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center', fontSize: 13 },
    loginLink: { marginTop: 16, alignItems: 'center' },
    loginText: { fontSize: 13, color: colors.inkSoft },
    loginTextBold: { color: colors.campo, fontWeight: '700' },
});
