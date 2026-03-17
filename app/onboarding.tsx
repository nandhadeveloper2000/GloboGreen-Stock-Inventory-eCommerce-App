import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <View className="rounded-b-[32px] bg-primary px-6 pt-8 pb-10">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="storefront-outline"
            size={30}
            color="#fff"
          />
          <Text className="ml-3 text-4xl font-extrabold text-white">
            Welcome
          </Text>
        </View>

        <Text className="mt-2 text-sm text-white/90">
          Globo Green Shop Stack
        </Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("../assets/images/Welcome.png")}
          resizeMode="contain"
          style={{ width: "100%", height: 340 }}
        />
      </View>

      <View className="px-6 pb-8">
        <TouchableOpacity
          onPress={() => router.replace("/Login")}
          activeOpacity={0.9}
          className="w-full flex-row items-center justify-center rounded-2xl bg-primaryDark py-4"
        >
          <MaterialCommunityIcons name="login" size={22} color="#fff" />
          <Text className="ml-2 text-lg font-bold text-white">Log In</Text>
        </TouchableOpacity>

        <Text className="mt-4 text-center text-[10px] text-gray-400">
          © 2026 Globo Green Tech System Pvt. Ltd.
        </Text>
      </View>
    </SafeAreaView>
  );
}