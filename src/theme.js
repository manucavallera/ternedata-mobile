// TerneData — sistema de diseño "Caravana"
// Identidad de campo argentino: verde pasto + amarillo caravana (la chapita del RP).
// Un único origen de color/espaciado/tipografía para toda la app.

export const colors = {
    // Marca
    campo: '#176B43',       // verde pasto — primario
    campoDark: '#0F4E30',   // verde profundo — headers / presión
    campoSoft: '#E4EFE6',   // verde lavado — chips / fondos suaves

    // Acento: caravana (chapita de oreja, donde va el RP)
    caravana: '#F4B400',    // amarillo caravana
    caravanaInk: '#3A2A00',  // texto sobre amarillo

    // Superficies / texto
    bg: '#EDF1EC',          // fondo con tinte pasto (no el cream genérico)
    surface: '#FFFFFF',
    line: '#E1E5DD',
    ink: '#1F1B16',         // casi-negro cálido
    inkSoft: '#6B6256',     // texto secundario
    inkFaint: '#9A9388',    // placeholders / hints

    // Estado del animal (semántico)
    vivo: '#2E9E5B',
    muerto: '#D14343',
    vendido: '#E0962F',
    neutro: '#9A9388',

    white: '#FFFFFF',
};

export const estadoColor = (estado) => ({
    Vivo: colors.vivo,
    Muerto: colors.muerto,
    Vendido: colors.vendido,
}[estado] || colors.neutro);

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

// Sombra suave reutilizable (iOS + Android)
export const shadow = {
    card: {
        shadowColor: '#1F1B16',
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    float: {
        shadowColor: '#0F4E30',
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
};

// Tipografía: sin fuentes custom (limitación Expo/WSL) → personalidad por escala+peso.
export const type = {
    eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    h2: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    title: { fontSize: 16, fontWeight: '700' },
    body: { fontSize: 14, fontWeight: '500' },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
    caption: { fontSize: 11, fontWeight: '600' },
    num: { fontVariant: ['tabular-nums'] }, // números alineados (RP, pesos)
};
