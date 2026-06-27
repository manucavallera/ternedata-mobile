import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';
import { colors, shadow, radius, space } from '../../theme';

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
        }

        setLoading(false);
    });

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Círculos decorativos de fondo */}
            <View style={styles.blobTop} pointerEvents="none" />
            <View style={styles.blobBottom} pointerEvents="none" />
            <View style={styles.blobChip} pointerEvents="none" />

            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* Hero / marca */}
                <View style={styles.hero}>
                    <Text style={styles.brand}>🐄 TerneData</Text>
                    <Text style={styles.tagline}>Gestión de tu rodeo, en el bolsillo</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Ingresar</Text>

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
                            ? <ActivityIndicator color={colors.white} />
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
    flex: { flex: 1, backgroundColor: colors.campoDark, overflow: 'hidden' },
    container: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
    // Blobs decorativos
    blobTop: { position: 'absolute', top: -90, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.campo, opacity: 0.45 },
    blobBottom: { position: 'absolute', bottom: -110, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: colors.campo, opacity: 0.35 },
    blobChip: { position: 'absolute', top: 80, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.caravana, opacity: 0.18 },
    // Hero
    hero: { alignItems: 'center', marginBottom: 28 },
    brand: { fontSize: 34, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },
    tagline: { fontSize: 14, color: colors.campoSoft, marginTop: 6, fontWeight: '500' },
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
    inputError: { borderColor: colors.muerto },
    errorText: { fontSize: 12, color: colors.muerto, marginBottom: 8 },
    forgotText: { fontSize: 12, color: colors.campo, textAlign: 'right', marginVertical: 8 },
    button: {
        backgroundColor: colors.campo,
        borderRadius: radius.sm,
        padding: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    alertBox: {
        backgroundColor: colors.muerto,
        borderRadius: radius.sm,
        padding: 10,
        marginTop: 12,
    },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center', fontSize: 13 },
    alertLink: { color: colors.white, textDecorationLine: 'underline', textAlign: 'center', marginTop: 4 },
    registerLink: { marginTop: 16, alignItems: 'center' },
    registerText: { fontSize: 13, color: colors.inkSoft },
    registerTextBold: { color: colors.campo, fontWeight: '700' },
});
