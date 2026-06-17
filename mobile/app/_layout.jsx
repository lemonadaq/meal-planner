import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { t, applyTheme, useThemeVersion } from '../shared/theme'
import { Appearance, ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../hooks/useAuth'

function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === 'login'
    if (!user && !inAuth) router.replace('/login')
    if (user && inAuth) router.replace('/(tabs)')
  }, [user, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  return children
}

export default function RootLayout() {
  useThemeVersion()

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      applyTheme(colorScheme === 'dark' ? 'dark' : 'light')
    })
    return () => sub?.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <AuthProvider>
        <AuthGuard>
          <StatusBar style={t.bg === '#FAF6F0' ? 'dark' : 'light'} />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
