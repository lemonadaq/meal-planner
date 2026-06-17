import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { t, useThemeVersion } from '../../shared/theme'

export default function TabLayout() {
  useThemeVersion()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.mute,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planer"
        options={{
          title: 'Planer',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="przepisy"
        options={{
          title: 'Przepisy',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="zakupy"
        options={{
          title: 'Zakupy',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ustawienia"
        options={{
          title: 'Więcej',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
