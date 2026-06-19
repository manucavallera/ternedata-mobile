import { View, Text, StyleSheet } from 'react-native';

export default function TratamientoListadoScreen() {
    return (
        <View style={styles.container}>
            <Text>TratamientoListadoScreen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
