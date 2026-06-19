import { View, Text, StyleSheet } from 'react-native';

export default function MadreListadoScreen() {
    return (
        <View style={styles.container}>
            <Text>MadreListadoScreen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
