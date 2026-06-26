import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, type } from '../theme';

// Firma visual: el RP del animal mostrado como una caravana (chapita de oreja).
// El "agujero" arriba imita la perforación por donde se engancha a la oreja.
export default function Caravana({ rp, size = 'md' }) {
    const s = size === 'sm' ? small : medium;
    return (
        <View style={styles.wrap}>
            <View style={[styles.hole, s.hole]} />
            <View style={[styles.tag, s.tag]}>
                <Text style={styles.rpLabel}>RP</Text>
                <Text style={[styles.rpNum, s.num, type.num]} numberOfLines={1}>{rp}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center' },
    hole: {
        backgroundColor: colors.campoDark,
        borderRadius: radius.pill,
        marginBottom: -3,
        zIndex: 1,
    },
    tag: {
        backgroundColor: colors.caravana,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#D89B00',
    },
    rpLabel: {
        color: colors.caravanaInk,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        opacity: 0.7,
    },
    rpNum: { color: colors.caravanaInk, fontWeight: '900', lineHeight: undefined },
});

const medium = StyleSheet.create({
    hole: { width: 10, height: 10 },
    tag: { width: 58, paddingVertical: 6 },
    num: { fontSize: 20 },
});

const small = StyleSheet.create({
    hole: { width: 8, height: 8 },
    tag: { width: 46, paddingVertical: 4 },
    num: { fontSize: 15 },
});
