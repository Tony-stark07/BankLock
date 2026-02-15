import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Show signup success message ONCE if coming from signup
  useEffect(() => {
    if (searchParams.signupSuccess === 'true' && !hasShownAlert) {
      setHasShownAlert(true);
      Alert.alert('✅ Signup Successful!', 'Your account has been created. Please login to continue.');
    }
  }, [searchParams.signupSuccess]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', result.user.uid);
      // Navigate to main app
      router.replace('/');
    } catch (error: any) {
      console.log('Login error:', error.code, error.message);
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1D1D1D' : '#fff' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>💰 Smart Bank</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>Login to your account</Text>

      <TextInput
        style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd' }]}
        placeholder="Email"
        placeholderTextColor={isDark ? '#999' : '#999'}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd' }]}
        placeholder="Password"
        placeholderTextColor={isDark ? '#999' : '#999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      <Link href="/auth/signup" asChild>
        <Pressable>
          <Text style={[styles.linkText, { color: '#007AFF' }]}>
            Don't have an account? Sign up
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});
