import React from "react";
import { useRouter } from "expo-router";
import { Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-[#16BB05] px-6 pt-8 pb-10 rounded-b-[32px]">
        {/* Icon + Title */}
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="storefront-outline"
            size={30}
            color="#fff"
          />
          <Text className="text-white text-4xl font-extrabold ml-3">
            Welcome
          </Text>
        </View>

        <Text className="text-white/90 mt-2 text-sm">
          Globo Green Shop Stack
        </Text>
      </View>

      {/* Body */}
      <View className="flex-1 px-6 justify-center items-center">
        <Image
          source={require("../assets/images/Welcome.png")}
          resizeMode="contain"
          style={{ width: "100%", height: 340 }}
        />
      </View>

      {/* CTA */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          onPress={() => router.replace("/Login")}
          activeOpacity={0.9}
          className="w-full rounded-2xl bg-[#0B7A22] py-4 flex-row items-center justify-center"
        >
          <MaterialCommunityIcons
            name="login"
            size={22}
            color="#fff"
          />
          <Text className="ml-2 text-white text-lg font-bold">
            Log In
          </Text>
        </TouchableOpacity>

        <Text className="mt-4 text-center text-[10px] text-gray-400">
          © 2025 Globo Green Tech System Pvt. Ltd
        </Text>
      </View>
    </SafeAreaView>
  );
}
