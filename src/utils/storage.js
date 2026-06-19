import AsyncStorage from '@react-native-async-storage/async-storage';

export const getToken = async () => {
    try {
        const tokenString = await AsyncStorage.getItem('token');
        if (!tokenString) return null;
        const parsed = JSON.parse(tokenString);
        if (parsed && typeof parsed === 'object' && parsed.token) return parsed.token;
        return tokenString;
    } catch {
        return null;
    }
};

export const setToken = async (token) => {
    await AsyncStorage.setItem('token', JSON.stringify({ token }));
};

export const removeToken = async () => {
    await AsyncStorage.removeItem('token');
};
