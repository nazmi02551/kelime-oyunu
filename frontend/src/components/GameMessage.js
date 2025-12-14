import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native'; // StyleSheet eklendi
import { colors } from '../utils/colors'; // colors import edildi

const GameMessage = ({ message, onClose }) => {
    const fadeAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (message) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: -100,
                    duration: 400,
                    useNativeDriver: true,
                }).start(onClose);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, fadeAnim, onClose]);

    if (!message) return null;

    // colors kullanarak renkleri tanımlayalım
    const backgroundColor = message.type === 'success' ? colors.success : 
                           message.type === 'failure' ? colors.error : 
                           colors.primary;
    
    const emoji = message.type === 'success' ? '🎉' : 
                  message.type === 'failure' ? '😔' : '🔔';

    return (
        <Animated.View style={[messageStyles.container, { backgroundColor, transform: [{ translateY: fadeAnim }] }]}>
            <Text style={messageStyles.text}>
                {emoji} {message.text}
            </Text>
        </Animated.View>
    );
};

const messageStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    text: {
        color: colors.textPrimary, // colors kullanıldı
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default GameMessage;