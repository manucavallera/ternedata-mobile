import { View, Text, StyleSheet } from 'react-native';

export default function TerneroListadoScreen() {
    return (
        <View style={styles.container}>
            <Text>TerneroListadoScreen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
