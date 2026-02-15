import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Link, useRouter } from 'expo-router';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting signup with:', email);
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signup successful, navigating to app...');
      // Navigate to main app
      router.replace('/');
    } catch (error: any) {
      console.log('Full error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      Alert.alert('Signup Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1D1D1D' : '#fff' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>💰 BankLock</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>Create your account</Text>

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

      <TextInput
        style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd' }]}
        placeholder="Confirm Password"
        placeholderTextColor={isDark ? '#999' : '#999'}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </Pressable>

      <Link href="/auth/login" asChild>
        <Pressable>
          <Text style={[styles.linkText, { color: '#007AFF' }]}>
            Already have an account? Login
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
