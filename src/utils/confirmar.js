import { Alert, Platform } from 'react-native';

// Misma firma que Alert.alert. Alert.alert no hace nada en react-native-web,
// así que en la PWA se usa window.confirm y se ejecuta el botón que no es "cancel".
export const confirmar = (titulo, mensaje, botones = []) => {
    if (Platform.OS !== 'web') {
        Alert.alert(titulo, mensaje, botones);
        return;
    }
    const accion = botones.find(b => b.style !== 'cancel');
    if (window.confirm(mensaje ? `${titulo}\n\n${mensaje}` : titulo)) accion?.onPress?.();
};
