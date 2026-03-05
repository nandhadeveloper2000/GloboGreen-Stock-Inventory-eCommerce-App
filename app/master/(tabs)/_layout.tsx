import React from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MasterTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#16BB05",
      }}
    >
      {/* 1️⃣ Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 2️⃣ Managers */}
      <Tabs.Screen
        name="managers"
        options={{
          title: "Managers",
          tabBarLabel: "Managers",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 3️⃣ Shop Owners */}
      <Tabs.Screen
        name="shopOwners"
        options={{
          title: "Shop Owners",
          tabBarLabel: "Shop Owners",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="store-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 4️⃣ Staffs (✅ must match staffs.tsx) */}
      <Tabs.Screen
        name="staffs"
        options={{
          title: "Staff",
          tabBarLabel: "Staffs",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-tie-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 5️⃣ Master Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}