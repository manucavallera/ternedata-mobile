import { View, Text, StyleSheet } from 'react-native';

export default function EventoListadoScreen() {
    return (
        <View style={styles.container}>
            <Text>EventoListadoScreen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
