// app/subadmin/(tabs)/_layout.tsx

import React from "react";
import { Platform, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const BRAND = "#16BB05";
const BRAND_SOFT = "#EAFBE7";
const INACTIVE = "#94A3B8";
const TEXT = "#0F172A";
const BORDER = "#E2E8F0";
const BG = "#FFFFFF";

function TabIcon({
  icon,
  color,
  size,
  focused,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
  label: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        minWidth: 72,
        marginTop: 6,
      }}
    >
      <View
        style={{
          minWidth: 52,
          height: 34,
          paddingHorizontal: focused ? 12 : 0,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          backgroundColor: focused ? BRAND_SOFT : "transparent",
        }}
      >
        <MaterialCommunityIcons name={icon} size={size} color={color} />
      </View>

      <Text
        style={{
          marginTop: 5,
          fontSize: 11,
          fontWeight: focused ? "800" : "700",
          color: focused ? BRAND : INACTIVE,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function SubAdminTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          color: TEXT,
          fontSize: 20,
          fontWeight: "800",
        },

        tabBarShowLabel: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: INACTIVE,

        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: Platform.OS === "ios" ? 78 : 68,
          backgroundColor: BG,
          borderRadius: 24,
          borderTopWidth: 0,
          paddingHorizontal: 10,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 18 : 10,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          elevation: 10,
          borderWidth: 1,
          borderColor: BORDER,
        },

        tabBarItemStyle: {
          paddingVertical: 2,
        },

        sceneStyle: {
          backgroundColor: "#F8FAFC",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              icon="view-dashboard-outline"
              color={color}
              size={size}
              focused={focused}
              label="Home"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="shopOwners"
        options={{
          title: "Shop Owners",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              icon="store-outline"
              color={color}
              size={size}
              focused={focused}
              label="Owners"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="staffs"
        options={{
          title: "Staff",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              icon="account-tie-outline"
              color={color}
              size={size}
              focused={focused}
              label="Staffs"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              icon="account-circle-outline"
              color={color}
              size={size}
              focused={focused}
              label="Profile"
            />
          ),
        }}
      />
    </Tabs>
  );
}