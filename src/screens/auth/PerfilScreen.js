import { View, Text, StyleSheet } from 'react-native';

export default function PerfilScreen() {
    return (
        <View style={styles.container}>
            <Text>PerfilScreen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
